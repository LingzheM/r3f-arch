import { describe, expect, it } from 'vitest'
import type { AnyNodeId } from '../schema/types'
import { areSceneSnapshotsEqual, type SceneSnapshot } from '../store/history-control'
import { M1_FLAT_SCENE, M6_FLAT_SCENE, M7_FLAT_SCENE } from './__fixtures__/legacy-scenes'
import { loadSceneDocument, parseSceneDocument } from './load-scene-document'
import { runSceneMigrations, SCENE_MIGRATIONS, type SceneMigration } from './migrations'
import { v0ToV1 } from './migrations/v0-to-v1'
import { CURRENT_SCENE_VERSION, SCENE_FORMAT, toSceneDocument } from './scene-document'

const load = (value: unknown) => {
  const r = loadSceneDocument(structuredClone(value))
  if (!r.ok) throw new Error(`load failed: ${JSON.stringify(r.error)}`)
  return r
}
const id = (s: string) => s as AnyNodeId
const ofType = (s: SceneSnapshot, t: string) => Object.values(s.nodes).filter((n) => n.type === t)
const docOf = (s: SceneSnapshot) => JSON.parse(JSON.stringify(toSceneDocument(s))) as {
  format: string
  version: number
  nodes: Record<string, unknown>[]
  rootNodeIds: string[]
}
const roundTrip = (s: SceneSnapshot) => load(docOf(s))
const v1 = () => docOf(load(M7_FLAT_SCENE).snapshot)
const m1Nodes = () => Object.values(structuredClone(M1_FLAT_SCENE).nodes) as Record<string, unknown>[]
const base = { object: 'node', parentId: null, visible: true, metadata: {} }

function expectIndexConsistent(s: SceneSnapshot) {
  for (const node of Object.values(s.nodes)) {
    for (const c of node.children) expect(s.nodes[id(c)]?.parentId).toBe(node.id)
    if (node.parentId === null) expect(s.rootNodeIds).toContain(node.id)
    else expect(s.nodes[id(node.parentId)]?.children).toContain(node.id)
  }
  for (const r of s.rootNodeIds) expect(s.nodes[r]?.parentId).toBeNull()
}

const deepFreeze = <T>(v: T): T => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(deepFreeze)
    Object.freeze(v)
  }
  return v
}

describe('M1 时代的存档（ROADMAP 验收）', () => {
  it('能加载：墙被收进 Site → Building → Level 0，根只剩 site，没有丢任何东西', () => {
    const r = load(M1_FLAT_SCENE)
    const [site] = ofType(r.snapshot, 'site')
    const [level] = ofType(r.snapshot, 'level')

    expect(r.fromVersion).toBe(0)
    expect(r.snapshot.rootNodeIds).toEqual([site!.id])
    expect(level).toMatchObject({ level: 0, baseElevation: 0, height: 2.5 })
    for (const wall of ofType(r.snapshot, 'wall')) expect(wall.parentId).toBe(level!.id)
    expect(r.report.dropped).toEqual([])
    expectIndexConsistent(r.snapshot)
  })

  it('height 的缺席性：没设过的仍然没有这个 key，设过的 3 原样留着', () => {
    const { nodes } = load(M1_FLAT_SCENE).snapshot
    expect('height' in nodes[id('wall_0a1b2c3d4e5a6b7c')]!).toBe(false)
    const tall = nodes[id('wall_2c3d4e5a6b7c8d9e')]!
    expect(tall.type === 'wall' && tall.height).toBe(3)
  })

  it('能再存回新格式：存出来是 v1；再读一次和第一次完全一样，而且不再迁移、不再修', () => {
    const first = load(M1_FLAT_SCENE)
    const doc = docOf(first.snapshot)
    expect(doc.format).toBe(SCENE_FORMAT)
    expect(doc.version).toBe(CURRENT_SCENE_VERSION)

    const second = roundTrip(first.snapshot)
    expect(second.fromVersion).toBe(CURRENT_SCENE_VERSION)
    expect(areSceneSnapshotsEqual(second.snapshot, first.snapshot)).toBe(true)
    expect(second.report).toEqual({ dropped: [], repairedParents: [] })
  })
})

describe('M6 时代：默认值变过一次', () => {
  it('v0 楼板存着的 0.05 → 0（批 F 把 DEFAULT_SLAB_ELEVATION 从 0.05 改成了 0）', () => {
    const [slab] = ofType(load(M6_FLAT_SCENE).snapshot, 'slab')
    expect(slab!.type === 'slab' && slab!.elevation).toBe(0)
  })

  it('v1 楼板上的 0.05 不动——同一个数，版本不同，意义不同', () => {
    const first = load(M6_FLAT_SCENE).snapshot
    const slab = ofType(first, 'slab')[0]!
    const edited: SceneSnapshot = { ...first, nodes: { ...first.nodes, [slab.id]: { ...slab, elevation: 0.05 } } }

    const [again] = ofType(roundTrip(edited).snapshot, 'slab')
    expect(again!.type === 'slab' && again!.elevation).toBe(0.05)
  })

  it('天花 height 缺席保持缺席（现在的意思是跟层高）；柱被收进层', () => {
    const s = load(M6_FLAT_SCENE).snapshot
    const [level] = ofType(s, 'level')
    expect('height' in ofType(s, 'ceiling')[0]!).toBe(false)
    expect(ofType(s, 'column')[0]!.parentId).toBe(level!.id)
  })
})

describe('M8 时代的无版本 dump（有容器、没有 format）', () => {
  it('仍按 v0 读，但不再包一层、楼板上的 0.05 也不改——「平」才是 M8 之前的标志', () => {
    const first = load(M6_FLAT_SCENE).snapshot
    const slab = ofType(first, 'slab')[0]!
    const dump = { nodes: { ...first.nodes, [slab.id]: { ...slab, elevation: 0.05 } }, rootNodeIds: first.rootNodeIds }

    const r = load(dump)
    expect(r.fromVersion).toBe(0)
    expect(ofType(r.snapshot, 'site')).toHaveLength(1)
    const [again] = ofType(r.snapshot, 'slab')
    expect(again!.type === 'slab' && again!.elevation).toBe(0.05)
  })
})

describe('M7 时代：门窗', () => {
  it('门窗仍挂在墙上、墙在层里；children 两侧互逆', () => {
    const s = load(M7_FLAT_SCENE).snapshot
    const wall = s.nodes[id('wall_7c8d9e0a1b2c3d4e')]!
    expect(wall.parentId).toBe(ofType(s, 'level')[0]!.id)
    expect(wall.children).toEqual(['door_8d9e0a1b2c3d4e5a', 'window_9e0a1b2c3d4e5a6b'])
    expectIndexConsistent(s)
  })
})

describe('children 是索引，parentId 是真相', () => {
  it('墙的 children 漏了门 → 补回来（否则门不渲染且不报错），并报告是哪个父被修了', () => {
    const raw = structuredClone(M7_FLAT_SCENE)
    raw.nodes.wall_7c8d9e0a1b2c3d4e.children = ['window_9e0a1b2c3d4e5a6b']
    const r = load(raw)

    expect(r.snapshot.nodes[id('wall_7c8d9e0a1b2c3d4e')]!.children).toContain('door_8d9e0a1b2c3d4e5a')
    expect(r.report.repairedParents).toContain('wall_7c8d9e0a1b2c3d4e')
  })

  it('children 里有不存在的 id → 删掉', () => {
    const raw = structuredClone(M7_FLAT_SCENE)
    raw.nodes.wall_7c8d9e0a1b2c3d4e.children.push('door_ghost')
    const { snapshot } = load(raw)
    expect(snapshot.nodes[id('wall_7c8d9e0a1b2c3d4e')]!.children).not.toContain('door_ghost')
  })

  it('rootNodeIds 不可信：列了非根、漏了根，都以 parentId 为准', () => {
    const doc = docOf(load(M1_FLAT_SCENE).snapshot)
    doc.rootNodeIds = ['wall_0a1b2c3d4e5a6b7c']
    const s = load(doc).snapshot
    expect(s.rootNodeIds).toEqual([ofType(s, 'site')[0]!.id])
  })
})

describe('坏数据：丢掉，但必须报出来', () => {
  it('单个节点坏了只丢它，记 invalid；其余照常', () => {
    const raw = structuredClone(M1_FLAT_SCENE) as { nodes: Record<string, unknown>; rootNodeIds: string[] }
    raw.nodes.wall_bad = { ...base, id: 'wall_bad', type: 'wall', start: [0, 0] }
    raw.rootNodeIds.push('wall_bad')
    const r = load(raw)

    expect(r.report.dropped).toEqual([{ id: 'wall_bad', reason: 'invalid' }])
    expect(ofType(r.snapshot, 'wall')).toHaveLength(3)
    expectIndexConsistent(r.snapshot)
  })

  it('v1 里缺 id 的节点 → invalid，id 记 null（不许 parse 替它发明一个 id）', () => {
    const doc = v1()
    doc.nodes.push({ ...base, type: 'wall', children: [], start: [0, 0], end: [1, 0] })
    const r = load(doc)

    expect(r.report.dropped).toEqual([{ id: null, reason: 'invalid' }])
    expect(ofType(r.snapshot, 'wall')).toHaveLength(1)
    expect(r.snapshot.rootNodeIds).toHaveLength(1)
  })

  it('v0 里缺 id、重复 id 的节点也要报告：迁移不许悄悄吞掉', () => {
    const nodes = m1Nodes()
    const first = nodes[0]!
    nodes.push({ ...first, id: undefined }, { ...first, start: [9, 9] })
    const r = load({ nodes, rootNodeIds: [] })

    expect(r.report.dropped).toEqual([
      { id: null, reason: 'invalid' },
      { id: 'wall_0a1b2c3d4e5a6b7c', reason: 'duplicate-id' },
    ])
    expect(ofType(r.snapshot, 'wall')).toHaveLength(3)
    expect(r.snapshot.nodes[id('wall_0a1b2c3d4e5a6b7c')]).toMatchObject({ start: [0, 0] })
  })

  it('id 恰好叫 constructor 的坏节点照样被报告（不被原型链骗过去）', () => {
    const nodes = m1Nodes()
    nodes.push({ ...base, id: 'constructor', type: 'wall', start: [0, 0], end: [1, 0] })
    const r = load({ nodes, rootNodeIds: [] })

    expect(r.report.dropped).toEqual([{ id: 'constructor', reason: 'invalid' }])
    expect(ofType(r.snapshot, 'wall')).toHaveLength(3)
    expectIndexConsistent(r.snapshot)
  })

  it('父不存在 → missing-parent；挂在它下面的 → ancestor-dropped', () => {
    const doc = v1()
    doc.nodes = doc.nodes.filter((n) => n.type !== 'level')
    const r = load(doc)

    const reasons = Object.fromEntries(r.report.dropped.map((d) => [d.id, d.reason]))
    expect(reasons['wall_7c8d9e0a1b2c3d4e']).toBe('missing-parent')
    expect(reasons['slab_0a1b2c3d4e5a6b7d']).toBe('missing-parent')
    expect(reasons['door_8d9e0a1b2c3d4e5a']).toBe('ancestor-dropped')
    expect(ofType(r.snapshot, 'door')).toHaveLength(0)
    expectIndexConsistent(r.snapshot)
  })

  it('层高 0（值不合法）→ 层记 invalid，墙和楼板 missing-parent，墙上的门窗 ancestor-dropped', () => {
    const doc = v1()
    for (const n of doc.nodes) if (n.type === 'level') n.height = 0
    const r = load(doc)

    const byType = Object.fromEntries(r.report.dropped.map((d) => [d.id?.split('_')[0], d.reason]))
    expect(byType).toEqual({
      level: 'invalid',
      wall: 'missing-parent',
      slab: 'missing-parent',
      door: 'ancestor-dropped',
      window: 'ancestor-dropped',
    })
    expect(ofType(r.snapshot, 'site')).toHaveLength(1)
    expect(ofType(r.snapshot, 'building')).toHaveLength(1)
    expectIndexConsistent(r.snapshot)
  })

  it('parentId 成环 → 环上的记 cycle，挂在环上的记 ancestor-dropped', () => {
    const doc = docOf(load(M1_FLAT_SCENE).snapshot)
    const find = (wid: string) => doc.nodes.find((n) => n.id === wid)!
    find('wall_0a1b2c3d4e5a6b7c').parentId = 'wall_1b2c3d4e5a6b7c8d'
    find('wall_1b2c3d4e5a6b7c8d').parentId = 'wall_0a1b2c3d4e5a6b7c'
    find('wall_2c3d4e5a6b7c8d9e').parentId = 'wall_0a1b2c3d4e5a6b7c'
    const r = load(doc)

    const reasons = Object.fromEntries(r.report.dropped.map((d) => [d.id, d.reason]))
    expect(reasons).toEqual({
      wall_0a1b2c3d4e5a6b7c: 'cycle',
      wall_1b2c3d4e5a6b7c8d: 'cycle',
      wall_2c3d4e5a6b7c8d9e: 'ancestor-dropped',
    })
    expectIndexConsistent(r.snapshot)
  })

  it('重复 id → 留第一个', () => {
    const doc = v1()
    doc.nodes.push({ ...doc.nodes.find((n) => n.type === 'slab')!, elevation: 9 })
    const r = load(doc)
    expect(r.report.dropped).toEqual([{ id: 'slab_0a1b2c3d4e5a6b7d', reason: 'duplicate-id' }])
    const [slab] = ofType(r.snapshot, 'slab')
    expect(slab!.type === 'slab' && slab!.elevation).toBe(0)
  })

  it('节点条目不是对象 → invalid，id 记 null', () => {
    const doc = v1() as unknown as { nodes: unknown[] }
    doc.nodes.push(42)
    expect(load(doc).report.dropped).toEqual([{ id: null, reason: 'invalid' }])
  })
})

describe('信封', () => {
  it('不是 JSON → not-json；数组 / 数字 / 没有 nodes → not-a-scene', () => {
    expect(parseSceneDocument('{{{')).toEqual({ ok: false, error: { kind: 'not-json' } })
    expect(parseSceneDocument('[]')).toEqual({ ok: false, error: { kind: 'not-a-scene' } })
    expect(parseSceneDocument('3')).toEqual({ ok: false, error: { kind: 'not-a-scene' } })
    expect(parseSceneDocument('{"hello":1}')).toEqual({ ok: false, error: { kind: 'not-a-scene' } })
  })

  it('版本比当前新 → too-new，不给快照（不许把新存档当旧的读）', () => {
    const r = loadSceneDocument({ format: SCENE_FORMAT, version: CURRENT_SCENE_VERSION + 1, nodes: [], rootNodeIds: [] })
    expect(r).toEqual({ ok: false, error: { kind: 'too-new', version: CURRENT_SCENE_VERSION + 1 } })
  })

  it('有 format 但 version 不合法、或者有 version 没 format → not-a-scene（不猜）', () => {
    expect(loadSceneDocument({ format: SCENE_FORMAT, nodes: [] })).toEqual({ ok: false, error: { kind: 'not-a-scene' } })
    expect(loadSceneDocument({ format: SCENE_FORMAT, version: 0, nodes: [] })).toMatchObject({ ok: false })
    expect(loadSceneDocument({ format: SCENE_FORMAT, version: '1', nodes: [] })).toMatchObject({ ok: false })
    expect(loadSceneDocument({ version: 1, nodes: {} })).toEqual({ ok: false, error: { kind: 'not-a-scene' } })
  })

  it('不改动入参：冻结之后照样能读', () => {
    for (const fixture of [M1_FLAT_SCENE, M6_FLAT_SCENE, M7_FLAT_SCENE]) {
      const frozen = deepFreeze(structuredClone(fixture))
      expect(loadSceneDocument(frozen).ok).toBe(true)
    }
  })
})

describe('迁移链', () => {
  it('SCENE_MIGRATIONS 首尾相接：from 依次是 0 … CURRENT − 1', () => {
    expect(SCENE_MIGRATIONS.map((m) => m.from)).toEqual(
      Array.from({ length: CURRENT_SCENE_VERSION }, (_, i) => i),
    )
  })

  it('按 from 顺序跑（与数组顺序无关），version 由 runner 写', () => {
    const tag = (t: string): SceneMigration['migrate'] => (d) => ({ ...d, nodes: [...d.nodes, { tag: t }] })
    const steps: SceneMigration[] = [
      { from: 1, note: 'b', migrate: tag('b') },
      { from: 0, note: 'a', migrate: tag('a') },
    ]
    const out = runSceneMigrations({ version: 0, nodes: [], rootNodeIds: [] }, steps, 2)
    expect(out.version).toBe(2)
    expect(out.nodes.map((n) => n.tag)).toEqual(['a', 'b'])
  })

  it('缺一环 → 抛错，指出断在哪个版本', () => {
    const steps: SceneMigration[] = [{ from: 0, note: 'a', migrate: (d) => d }]
    expect(() => runSceneMigrations({ version: 0, nodes: [], rootNodeIds: [] }, steps, 2)).toThrow(/v1/)
  })

  it('v0 → v1 造出来的容器是冻结的 v1 形状：键一个不多、一个不少，层高显式写着 2.5', () => {
    const out = v0ToV1.migrate({ version: 0, nodes: [], rootNodeIds: [] })
    const byType = (t: string) => out.nodes.find((n) => n.type === t)
    const baseKeys = ['children', 'id', 'metadata', 'object', 'parentId', 'type', 'visible']

    expect(Object.keys(byType('site')!).sort()).toEqual(baseKeys)
    expect(Object.keys(byType('building')!).sort()).toEqual(baseKeys)
    expect(Object.keys(byType('level')!).sort()).toEqual([...baseKeys, 'baseElevation', 'height', 'level'].sort())
    expect(byType('level')).toMatchObject({ level: 0, baseElevation: 0, height: 2.5 })
    expect(out.rootNodeIds).toEqual([byType('site')!.id])
  })
})