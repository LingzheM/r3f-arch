import { describe, expect, it } from 'vitest'
import { areSceneSnapshotsEqual } from '../store/history-control'
import { M1_FLAT_SCENE } from './__fixtures__/legacy-scenes'
import { loadSceneDocument } from './load-scene-document'
import { CURRENT_SCENE_VERSION, SCENE_FORMAT } from './scene-document'
import { createSceneStorage, SceneTooNewError, type KeyValueStore } from './scene-storage'

function memoryKV(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    keys: () => [...map.keys()],
  }
}

const make = (kv = memoryKV(), maxCheckpointsPerScene = 10) => {
  let tick = 0
  let n = 0
  const storage = createSceneStorage(kv, {
    now: () => new Date(Date.UTC(2026, 8, 15) + tick++ * 1000).toISOString(),
    newId: (kind) => `${kind}_${n++}`,
    maxCheckpointsPerScene,
  })
  return { kv, storage }
}

const m1 = () => {
  const r = loadSceneDocument(structuredClone(M1_FLAT_SCENE))
  if (!r.ok) throw new Error('fixture')
  return r.snapshot
}

const INDEX = 'r3f-arch:index'
const sceneKey = (id: string) => `r3f-arch:scene:${id}`
const cpKey = (sceneId: string, id: string) => `r3f-arch:checkpoint:${sceneId}:${id}`
const checkpointKeys = (kv: KeyValueStore) => kv.keys().filter((k) => k.startsWith('r3f-arch:checkpoint:'))

describe('往返', () => {
  it('M1 老存档 → 读进来 → 存成新场景 → 再读：一模一样，且已是当前版本', () => {
    const { storage } = make()
    const snap = m1()
    const meta = storage.create('老房子', snap)

    const back = storage.load(meta.id)
    expect(back?.ok).toBe(true)
    if (!back?.ok) return
    expect(back.fromVersion).toBe(CURRENT_SCENE_VERSION)
    expect(areSceneSnapshotsEqual(back.snapshot, snap)).toBe(true)
    expect(storage.list()).toEqual([meta])
    expect(meta).toMatchObject({ name: '老房子', nodeCount: Object.keys(snap.nodes).length, docVersion: CURRENT_SCENE_VERSION })
  })

  it('直接躺在存储里的 v0 文档（没有 format / version）也走迁移，并且出现在列表里', () => {
    const { kv, storage } = make()
    kv.setItem(sceneKey('legacy'), JSON.stringify(M1_FLAT_SCENE))

    expect(storage.load('legacy')).toMatchObject({ ok: true, fromVersion: 0 })
    expect(storage.list()).toEqual([{ id: 'legacy', name: 'legacy', createdAt: '', updatedAt: '', nodeCount: 3, docVersion: 0 }])
  })

  it('没有这个场景 → load 返回 null', () => {
    const { storage } = make()
    expect(storage.load('nope')).toBeNull()
  })

  it('存档点：打一个再读回来，和打的时候一样', () => {
    const { storage } = make()
    const snap = m1()
    const a = storage.create('a', snap)
    const cp = storage.checkpoint(a.id, '第一版', snap)

    const back = storage.loadCheckpoint(a.id, cp.id)
    expect(back?.ok && areSceneSnapshotsEqual(back.snapshot, snap)).toBe(true)
    expect(storage.listCheckpoints(a.id)).toEqual([cp])
  })
})

describe('删除与修剪', () => {
  it('删除：文档、它的存档点、索引条目一起清掉；当前场景是它 → 置空；别的场景不受影响', () => {
    const { kv, storage } = make()
    const snap = m1()
    const a = storage.create('a', snap)
    const b = storage.create('b', snap)
    storage.setCurrentSceneId(a.id)
    const cpA = storage.checkpoint(a.id, 'x', snap)
    const cpB = storage.checkpoint(b.id, 'y', snap)

    storage.remove(a.id)

    expect(kv.getItem(sceneKey(a.id))).toBeNull()
    expect(kv.getItem(cpKey(a.id, cpA.id))).toBeNull()
    expect(kv.getItem(cpKey(b.id, cpB.id))).not.toBeNull()
    expect(storage.list().map((s) => s.id)).toEqual([b.id])
    expect(storage.listCheckpoints(b.id)).toEqual([cpB])
    expect(storage.currentSceneId()).toBeNull()
  })

  it('删除时连索引里没登记的存档点文档（孤儿）也清掉', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    kv.setItem(cpKey(a.id, 'checkpoint_stray'), '{}')

    storage.remove(a.id)
    expect(checkpointKeys(kv)).toEqual([])
  })

  it('存档点只留最近 N 个，旧的连文档一起删', () => {
    const { kv, storage } = make(memoryKV(), 3)
    const snap = m1()
    const a = storage.create('a', snap)
    for (const label of ['1', '2', '3', '4', '5']) storage.checkpoint(a.id, label, snap)

    expect(storage.listCheckpoints(a.id).map((c) => c.label)).toEqual(['3', '4', '5'])
    expect(checkpointKeys(kv)).toHaveLength(3)
  })
})

describe('降级保护与写入顺序', () => {
  it('索引记着文档是更新的版本存的 → save 抛 SceneTooNewError，文档原样不动', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const index = JSON.parse(kv.getItem(INDEX)!)
    index.scenes[0].docVersion = CURRENT_SCENE_VERSION + 1
    kv.setItem(INDEX, JSON.stringify(index))
    kv.setItem(sceneKey(a.id), 'NEWER')

    expect(() => storage.save(a.id, m1())).toThrow(SceneTooNewError)
    expect(kv.getItem(sceneKey(a.id))).toBe('NEWER')
  })

  it('索引没来得及更新、但文档本身是更新的版本存的 → 同样拒绝', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const newer = JSON.stringify({ format: SCENE_FORMAT, version: CURRENT_SCENE_VERSION + 1, nodes: [], rootNodeIds: [] })
    kv.setItem(sceneKey(a.id), newer)

    expect(() => storage.save(a.id, m1())).toThrow(SceneTooNewError)
    expect(kv.getItem(sceneKey(a.id))).toBe(newer)
  })

  it('读到比当前新的文档 → too-new（调用方据此不许对它启动自动保存）', () => {
    const { kv, storage } = make()
    kv.setItem(sceneKey('x'), JSON.stringify({ format: SCENE_FORMAT, version: 99, nodes: [], rootNodeIds: [] }))
    expect(storage.load('x')).toEqual({ ok: false, error: { kind: 'too-new', version: 99 } })
  })

  it('写文档失败（配额满，大的是文档不是索引）→ 抛出，索引不变——所以必须先写文档再写索引', () => {
    const kv = memoryKV()
    const { storage } = make(kv)
    const a = storage.create('a', m1())
    const indexBefore = kv.getItem(INDEX)

    const setItem = kv.setItem
    kv.setItem = (k, v) => {
      if (k.startsWith('r3f-arch:scene:')) throw new Error('QuotaExceededError')
      setItem(k, v)
    }
    expect(() => storage.save(a.id, m1())).toThrow(/Quota/)
    expect(kv.map.get(INDEX)).toBe(indexBefore)
  })

  it('对不存在的场景 save / rename / checkpoint / setCurrentSceneId → 抛错；setCurrentSceneId(null) 可以', () => {
    const { storage } = make()
    expect(() => storage.save('nope', m1())).toThrow(/nope/)
    expect(() => storage.rename('nope', 'x')).toThrow(/nope/)
    expect(() => storage.checkpoint('nope', 'x', m1())).toThrow(/nope/)
    expect(() => storage.setCurrentSceneId('nope')).toThrow(/nope/)
    expect(() => storage.setCurrentSceneId(null)).not.toThrow()
  })
})

describe('索引是缓存，文档才是真相', () => {
  it('索引坏了 / 丢了 → 从 scene:* 键重建，一个场景都不丢', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const b = storage.create('b', m1())

    kv.setItem(INDEX, '{坏了')
    expect(storage.list().map((s) => s.id).sort()).toEqual([a.id, b.id].sort())

    kv.removeItem(INDEX)
    const rebuilt = storage.list()
    expect(rebuilt).toHaveLength(2)
    expect(rebuilt[0]!.nodeCount).toBe(Object.keys(m1().nodes).length)
  })

  it('索引完好，但有一份它没登记的文档（上次写完文档、没写成索引）→ 也列出来', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    kv.setItem(sceneKey('orphan'), JSON.stringify(M1_FLAT_SCENE))

    expect(storage.list().map((s) => s.id).sort()).toEqual([a.id, 'orphan'].sort())
  })

  it('索引登记了、但文档已经不在 → 不列出来，指向它的当前场景也清掉', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    storage.setCurrentSceneId(a.id)
    kv.removeItem(sceneKey(a.id))

    expect(storage.list()).toEqual([])
    expect(storage.currentSceneId()).toBeNull()
  })

  it('索引里有一条缺字段的记录 → list 不崩，那个场景从文档重建', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const index = JSON.parse(kv.getItem(INDEX)!)
    delete index.scenes[0].updatedAt
    kv.setItem(INDEX, JSON.stringify(index))

    expect(() => storage.list()).not.toThrow()
    expect(storage.list()).toMatchObject([{ id: a.id, name: a.id }])
  })
})