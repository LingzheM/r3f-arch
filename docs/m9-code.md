# M9 §07 全码

**验证**：`tsc` ✅ · `eslint` ✅ · `vitest` ✅ **20 文件 / 252 用例** · 变异测试 **19 / 19 被抓**——在 2026-09-17 你的 `src/` 的完整拷贝上跑的，含你的 `gate-core.test.ts`。本文件的代码块由脚本从那份拷贝里原样导出，不是手抄。

**未验证**：浏览器里的渲染与交互。本批是纯 core，但第 08 步改了 `updateNode`，拖墙 / 拖端点球会走到它（见末尾「肉眼」）；真实 `localStorage`（存储层只用内存 KV 测过）。

> 设计在 `m9-persistence.html`（§02 机制 · §04 建造顺序）。本文件按 **core → viewer → app** 三批放出，每批先过 `/gate`（D29）。
> 每批敲完：`pnpm verify` → `/review`。

---

## core 批 · 2026-09-17（`/gate core` 通过）

### 和设计文档不一样的地方（约定 6）

| 设计写的 | 这里改成 | 为什么 |
|---|---|---|
| 目录 `src/core/persistence/` | **`src/core/store/persistence/`** | 你在闸门第 2 步选的位置，命名跟你走 |
| `readSceneDocument` | **`loadSceneDocument`** | 你的命名 |
| 你的桩：返回 `{ snapshot, report }`，失败时抛 | **联合类型** `{ ok: true, … } \| { ok: false, error }`；`report` 带每个节点被丢的**原因** | 闸门第 2 步 A 版本实测：抛异常时 `not-a-scene` 在调用方只剩一句说不清的错；Q1 那棵树你标的正是原因 |
| 你的桩 `gate-core.ts` | **删掉**，由 `load-scene-document.ts` 等取代 | —— |
| `replaceScene` 拿暂停租约 | **不拿** | 变异测试：去掉租约全绿，紧跟着的 `clear()` 已经清掉那条历史 |
| v0 → v1 给 raw 节点补 `children` | **不补** | 变异测试：死代码，最后那次 `parse` 会填 |
| §02 I 的例子「跨类型字段读档会丢墙」 | 跨类型字段被 zod **静默剥掉**；丢数据的是**非法值**（层高 0） | 沙箱探针；HTML 里已加更正框 |
| `use-scene.test.ts` 追加 5 条 / 加载测试 23 条 | **6 条 / 24 条** | 各多一条「层高 0」——你在闸门 Q1 答的那个场景 |

### 前置 B 用的是推荐值

本批按推荐实现了 **B1**（文档级整数版本号）、**B4**（只还写入边界）、**B5**（同步存储）。B2（导入语义）、B3（误删护栏）到 app 批才生效。**要改任何一条，在 `/gate app` 之前告诉我。**

### 敲的顺序，以及每一步之后 `pnpm test` 应该是多少

| 步 | 做什么 | 敲完之后 |
|---|---|---|
| 01 | 新建 `persistence/scene-document.ts` | 不变：17 文件，你的 gate 测试仍红 |
| 02 | 新建 `persistence/fixtures.ts` | 不变 |
| 03 | 新建 `persistence/migrations.ts` + `persistence/migrations/v0-to-v1.ts` | 不变 |
| 04 | 新建 `persistence/normalize-snapshot.ts` | 不变 |
| 05 | 新建 `persistence/load-scene-document.ts`；**删 `gate-core.ts`**；改 `gate-core.test.ts`；新建 `load-scene-document.test.ts` | **18 文件 / 235，全绿**（你的 gate 测试转绿） |
| 06 | 新建 `replace-scene.ts` + `replace-scene.test.ts` | 19 / 238 |
| 07 | 新建 `persistence/scene-storage.ts` + `scene-storage.test.ts` | 20 / 246 |
| 08 | 改 `use-scene.ts` 两处；`use-scene.test.ts` 末尾追加 | **20 / 252** |

> 中间几步的数字是按各文件实测条数推出来的（加载 24 · `replaceScene` 3 · 存储 8 · `use-scene` +6）；只有最终的 20 / 252 是整体跑出来的。

---

### 01 · `src/core/store/persistence/scene-document.ts` · 新建 · 51 行

信封的样子、当前版本号，以及「根由 `parentId` 决定，存档里的顺序只用来排序」（§02 A）。

```ts
import type { AnyNode, AnyNodeId } from '../../schema/types'
import type { SceneSnapshot } from '../history-control'

export const SCENE_FORMAT = 'r3f-arch/scene'
export const CURRENT_SCENE_VERSION = 1

/** 迁移链上流动的是没 parse 过的节点：parse 会剥掉老字段、填上新默认值，两件事都得等迁移做完。 */
export type RawNode = Record<string, unknown>

export type RawSceneDocument = {
  version: number
  nodes: RawNode[]
  rootNodeIds: string[]
}

export type SceneDocument = {
  format: typeof SCENE_FORMAT
  version: number
  nodes: AnyNode[]
  rootNodeIds: AnyNodeId[]
}

export function toSceneDocument(snapshot: SceneSnapshot): SceneDocument {
  return {
    format: SCENE_FORMAT,
    version: CURRENT_SCENE_VERSION,
    nodes: Object.values(snapshot.nodes),
    rootNodeIds: [...snapshot.rootNodeIds],
  }
}

/** 根 = parentId 为空的节点。保存的顺序只用来排序，不用来决定谁是根。 */
export function deriveRootIds(
  nodes: readonly { id?: unknown; parentId?: unknown }[],
  saved: readonly unknown[],
): string[] {
  const roots = new Set<string>()
  for (const n of nodes) {
    if (typeof n.id === 'string' && (n.parentId === null || n.parentId === undefined)) roots.add(n.id)
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of saved) {
    if (typeof id === 'string' && roots.has(id) && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  for (const id of roots) if (!seen.has(id)) out.push(id)
  return out
}
```

### 02 · `src/core/store/persistence/fixtures.ts` · 新建 · 61 行

三代语料，按 git 历史里当时的 zod 定义手写。**被 `.default()` 物化进数据的字段一个都不能漏**——那才是当年 `addNode` 真正写进去的东西。它只被测试 import，不会进打包。

```ts
/**
 * 存档语料。M9 之前项目从没持久化过，所以这些不是捡来的老存档，
 * 而是**按 git 历史里当时的 zod 定义手写的「那时如果有存档，它会长这样」**。
 * 被 .default() 物化进数据的字段（object / visible / metadata / slab.elevation）一个不少。
 * 形状就是 useScene 的 { nodes: Record<id, node>, rootNodeIds }——没有 format、没有 version。
 */

const base = { object: 'node', parentId: null, visible: true, metadata: {} }

/** 8281cd2（2026-08-16「M1 core」）：BaseNode 没有 children；WallNode = start / end / thickness? / height? */
export const M1_FLAT_SCENE = {
  nodes: {
    wall_0a1b2c3d4e5a6b7c: { ...base, id: 'wall_0a1b2c3d4e5a6b7c', type: 'wall', start: [0, 0], end: [4, 0] },
    wall_1b2c3d4e5a6b7c8d: { ...base, id: 'wall_1b2c3d4e5a6b7c8d', type: 'wall', start: [4, 0], end: [4, 3] },
    // 控制台里设过高度的一堵
    wall_2c3d4e5a6b7c8d9e: { ...base, id: 'wall_2c3d4e5a6b7c8d9e', type: 'wall', start: [4, 3], end: [0, 3], height: 3 },
  },
  rootNodeIds: ['wall_0a1b2c3d4e5a6b7c', 'wall_1b2c3d4e5a6b7c8d', 'wall_2c3d4e5a6b7c8d9e'],
}

/** a5e4ee6（2026-09-04 M6 验收）：楼板 elevation 默认 0.05 被物化；天花 height 缺席 = 当时的常量 2.5；仍无 children */
export const M6_FLAT_SCENE = {
  nodes: {
    wall_3d4e5a6b7c8d9e0a: { ...base, id: 'wall_3d4e5a6b7c8d9e0a', type: 'wall', start: [0, 0], end: [4, 0] },
    slab_4e5a6b7c8d9e0a1b: {
      ...base, id: 'slab_4e5a6b7c8d9e0a1b', type: 'slab',
      polygon: [[0, 0], [4, 0], [4, 3], [0, 3]], elevation: 0.05,
    },
    ceiling_5a6b7c8d9e0a1b2c: {
      ...base, id: 'ceiling_5a6b7c8d9e0a1b2c', type: 'ceiling',
      polygon: [[0, 0], [4, 0], [4, 3], [0, 3]],
    },
    column_6b7c8d9e0a1b2c3d: {
      ...base, id: 'column_6b7c8d9e0a1b2c3d', type: 'column', position: [2, 0, 1.5], crossSection: 'round',
    },
  },
  rootNodeIds: ['wall_3d4e5a6b7c8d9e0a', 'slab_4e5a6b7c8d9e0a1b', 'ceiling_5a6b7c8d9e0a1b2c', 'column_6b7c8d9e0a1b2c3d'],
}

/** 224db5e（2026-09-10 M7）：BaseNode 有 children；门窗挂在墙上、不在根里 */
export const M7_FLAT_SCENE = {
  nodes: {
    wall_7c8d9e0a1b2c3d4e: {
      ...base, id: 'wall_7c8d9e0a1b2c3d4e', type: 'wall', start: [0, 0], end: [5, 0],
      children: ['door_8d9e0a1b2c3d4e5a', 'window_9e0a1b2c3d4e5a6b'],
    },
    door_8d9e0a1b2c3d4e5a: {
      ...base, id: 'door_8d9e0a1b2c3d4e5a', type: 'door', parentId: 'wall_7c8d9e0a1b2c3d4e', children: [],
      position: [1.5, 1.05, 0], width: 0.9, height: 2.1, side: 'left',
    },
    window_9e0a1b2c3d4e5a6b: {
      ...base, id: 'window_9e0a1b2c3d4e5a6b', type: 'window', parentId: 'wall_7c8d9e0a1b2c3d4e', children: [],
      position: [3.5, 1.5, 0], width: 1.2, height: 1.2, side: 'right',
    },
    slab_0a1b2c3d4e5a6b7d: {
      ...base, id: 'slab_0a1b2c3d4e5a6b7d', type: 'slab', children: [],
      polygon: [[0, 0], [5, 0], [5, 4], [0, 4]], elevation: 0.05,
    },
  },
  rootNodeIds: ['wall_7c8d9e0a1b2c3d4e', 'slab_0a1b2c3d4e5a6b7d'],
}
```

### 03a · `src/core/store/persistence/migrations.ts` · 新建 · 35 行

链按 `from` 查找，不按数组下标；`version` 由 runner 写，迁移函数碰不到（§02 B）。

```ts
import { v0ToV1 } from './migrations/v0-to-v1'
import { CURRENT_SCENE_VERSION, type RawSceneDocument } from './scene-document'

export type SceneMigration = {
  /** 从哪个版本出发；终点恒为 from + 1，由 runner 写，迁移函数自己不碰 version。 */
  from: number
  note: string
  migrate: (doc: RawSceneDocument) => Omit<RawSceneDocument, 'version'>
}

export const SCENE_MIGRATIONS: readonly SceneMigration[] = [v0ToV1]

export class SceneMigrationError extends Error {
  readonly from: number
  constructor(from: number, message: string) {
    super(message)
    this.name = 'SceneMigrationError'
    this.from = from
  }
}

export function runSceneMigrations(
  doc: RawSceneDocument,
  migrations: readonly SceneMigration[] = SCENE_MIGRATIONS,
  target: number = CURRENT_SCENE_VERSION,
): RawSceneDocument {
  let current = doc
  while (current.version < target) {
    const from = current.version
    const step = migrations.find((m) => m.from === from)
    if (!step) throw new SceneMigrationError(from, `没有从 v${from} 出发的迁移`)
    current = { ...step.migrate(current), version: from + 1 }
  }
  return current
}
```

### 03b · `src/core/store/persistence/migrations/v0-to-v1.ts` · 新建 · 39 行

全链唯一「看形状」的地方。**只在「平」（一个容器都没有）时**才改 0.05、才收进容器（§02 C，Q2）。

```ts
import type { AnyNode, AnyNodeId } from '../../../schema/types'
import { migrateToLevels } from '../../migrate-to-levels'
import type { SceneMigration } from '../migrations'
import { deriveRootIds, type RawNode } from '../scene-document'

const CONTAINER_TYPES = new Set(['site', 'building', 'level'])

/** M6–M8 批 F 之前的 DEFAULT_SLAB_ELEVATION。zod 的 .default() 在 addNode 时把它写进了每一块楼板。 */
const LEGACY_SLAB_ELEVATION = 0.05

export const v0ToV1: SceneMigration = {
  from: 0,
  note: 'M8 之前的平场景：楼板 0.05 → 0；收进 Site → Building → Level 0',
  migrate: (doc) => {
    // v0 没有版本号，这里是全链唯一允许「看形状」的地方。
    const flat = !doc.nodes.some((n) => CONTAINER_TYPES.has(String(n.type)))
    if (!flat) return { nodes: doc.nodes, rootNodeIds: doc.rootNodeIds }

    const record: Record<string, RawNode> = {}
    for (const raw of doc.nodes) {
      if (typeof raw.id !== 'string' || raw.id in record) continue
      const slabFixed =
        raw.type === 'slab' && raw.elevation === LEGACY_SLAB_ELEVATION ? { ...raw, elevation: 0 } : raw
      // 不用在这里补 children：normalize 最后那次 parse 会填成 []（变异测试验证过，去掉它全绿）。
      record[raw.id] = slabFixed
    }

    const wrapped = migrateToLevels({
      // migrateToLevels 只读 type、按 id 查存在、展开复制——不读别的字段，raw 节点过得去。
      nodes: record as unknown as Record<AnyNodeId, AnyNode>,
      rootNodeIds: deriveRootIds(Object.values(record), doc.rootNodeIds) as AnyNodeId[],
    })

    return {
      nodes: Object.values(wrapped.nodes) as unknown as RawNode[],
      rootNodeIds: wrapped.rootNodeIds,
    }
  },
}
```

### 04 · `src/core/store/persistence/normalize-snapshot.ts` · 新建 · 111 行

进 store 前的最后一道：逐个 `parse` → 沿 `parentId` 下判决（缺父 / 成环 / 祖先被丢）→ **按 `parentId` 重建 `children`** → 推根（§02 D，Q3）。判决缓存让它是线性的；「本次路径」集合让环不会把它挂住。

```ts
import { AnyNode, type AnyNodeId } from '../../schema/types'
import type { SceneSnapshot } from '../history-control'
import { deriveRootIds, type RawNode } from './scene-document'

export type DropReason = 'invalid' | 'duplicate-id' | 'missing-parent' | 'cycle' | 'ancestor-dropped'
export type DroppedNode = { id: string | null; reason: DropReason }
export type LoadReport = { dropped: DroppedNode[]; repairedParents: string[] }

/**
 * 迁移之后、进 store 之前的最后一道：逐个 parse、丢坏的、按 parentId 重建 children、推出根。
 * parentId 是真相，children 是索引（D19）——存档里的 children 只用来保顺序。
 */
export function normalizeSceneNodes(
  rawNodes: readonly RawNode[],
  savedRootIds: readonly unknown[],
): { snapshot: SceneSnapshot; report: LoadReport } {
  const dropped: DroppedNode[] = []
  const parsed = new Map<string, AnyNode>()

  for (const raw of rawNodes) {
    const result = AnyNode.safeParse(raw)
    if (!result.success) {
      dropped.push({ id: typeof raw.id === 'string' ? raw.id : null, reason: 'invalid' })
      continue
    }
    if (parsed.has(result.data.id)) {
      dropped.push({ id: result.data.id, reason: 'duplicate-id' })
      continue
    }
    parsed.set(result.data.id, result.data)
  }

  const verdict = new Map<string, DropReason | 'ok'>()
  const settle = (id: string): DropReason | 'ok' => {
    const path: string[] = []
    const onPath = new Set<string>()
    let cursor: string | null = id
    let outcome: DropReason | 'ok' = 'ok'
    let cycleAt = -1

    while (cursor !== null) {
      const known = verdict.get(cursor)
      if (known !== undefined) {
        outcome = known === 'ok' ? 'ok' : 'ancestor-dropped'
        break
      }
      if (onPath.has(cursor)) {
        outcome = 'cycle'
        cycleAt = path.indexOf(cursor)
        break
      }
      const node = parsed.get(cursor)
      if (!node) {
        outcome = 'missing-parent'
        break
      }
      path.push(cursor)
      onPath.add(cursor)
      cursor = node.parentId
    }

    path.forEach((p, i) => {
      if (outcome === 'ok') verdict.set(p, 'ok')
      else if (outcome === 'missing-parent') verdict.set(p, i === path.length - 1 ? 'missing-parent' : 'ancestor-dropped')
      else if (outcome === 'cycle') verdict.set(p, i >= cycleAt ? 'cycle' : 'ancestor-dropped')
      else verdict.set(p, 'ancestor-dropped')
    })
    return verdict.get(id) ?? outcome
  }

  const nodes: Record<AnyNodeId, AnyNode> = {}
  for (const [id, node] of parsed) {
    const v = settle(id)
    if (v === 'ok') nodes[id as AnyNodeId] = node
    else dropped.push({ id, reason: v })
  }

  const actualChildren = new Map<string, string[]>()
  for (const node of Object.values(nodes)) {
    if (node.parentId === null) continue
    const list = actualChildren.get(node.parentId) ?? []
    list.push(node.id)
    actualChildren.set(node.parentId, list)
  }

  const repairedParents: string[] = []
  for (const node of Object.values(nodes)) {
    const actual = actualChildren.get(node.id) ?? []
    const actualSet = new Set(actual)
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const c of node.children) {
      if (actualSet.has(c) && !seen.has(c)) {
        ordered.push(c)
        seen.add(c)
      }
    }
    for (const c of actual) if (!seen.has(c)) ordered.push(c)

    const same = ordered.length === node.children.length && ordered.every((c, i) => c === node.children[i])
    if (!same) {
      nodes[node.id as AnyNodeId] = { ...node, children: ordered } as AnyNode
      repairedParents.push(node.id)
    }
  }

  return {
    snapshot: { nodes, rootNodeIds: deriveRootIds(Object.values(nodes), savedRootIds) as AnyNodeId[] },
    report: { dropped, repairedParents },
  }
}
```

### 05 · 加载入口，以及你的 gate 测试

**05a · `src/core/store/persistence/load-scene-document.ts` · 新建 · 73 行**

C → E → D → B 四步都在这里串起来，**一步都不碰 store**（Q3 小问 9：读取失败 = 什么都没发生）。比当前版本新的文件在信封这一步就拒绝，一环迁移都不跑。

```ts
import type { SceneSnapshot } from '../history-control'
import { runSceneMigrations, SceneMigrationError } from './migrations'
import { normalizeSceneNodes, type LoadReport } from './normalize-snapshot'
import { CURRENT_SCENE_VERSION, SCENE_FORMAT, type RawNode, type RawSceneDocument } from './scene-document'

export type SceneLoadError =
  | { kind: 'not-json' }
  | { kind: 'not-a-scene' }
  | { kind: 'too-new'; version: number }
  | { kind: 'migration-failed'; from: number; message: string }

export type SceneLoadResult =
  | { ok: true; snapshot: SceneSnapshot; report: LoadReport; fromVersion: number }
  | { ok: false; error: SceneLoadError }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asRawNodes = (list: readonly unknown[]): RawNode[] => list.map((n) => (isObject(n) ? n : {}))
const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function toRawDocument(value: unknown): RawSceneDocument | SceneLoadError {
  if (!isObject(value)) return { kind: 'not-a-scene' }

  if (value.format === SCENE_FORMAT) {
    const { version, nodes } = value
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || !Array.isArray(nodes)) {
      return { kind: 'not-a-scene' }
    }
    if (version > CURRENT_SCENE_VERSION) return { kind: 'too-new', version }
    return { version, nodes: asRawNodes(nodes), rootNodeIds: asIds(value.rootNodeIds) }
  }

  if ('format' in value || 'version' in value) return { kind: 'not-a-scene' }

  // v0：版本号出现之前的样子，就是 useScene 的 { nodes: Record<id, node>, rootNodeIds }
  const { nodes } = value
  const list = Array.isArray(nodes) ? nodes : isObject(nodes) ? Object.values(nodes) : null
  if (list === null) return { kind: 'not-a-scene' }
  return { version: 0, nodes: asRawNodes(list), rootNodeIds: asIds(value.rootNodeIds) }
}

export function loadSceneDocument(value: unknown): SceneLoadResult {
  const raw = toRawDocument(value)
  if ('kind' in raw) return { ok: false, error: raw }

  let migrated: RawSceneDocument
  try {
    migrated = runSceneMigrations(raw)
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: 'migration-failed',
        from: e instanceof SceneMigrationError ? e.from : raw.version,
        message: e instanceof Error ? e.message : String(e),
      },
    }
  }

  const { snapshot, report } = normalizeSceneNodes(migrated.nodes, migrated.rootNodeIds)
  return { ok: true, snapshot, report, fromVersion: raw.version }
}

export function parseSceneDocument(text: string): SceneLoadResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'not-json' } }
  }
  return loadSceneDocument(value)
}
```

**05b · 删掉 `src/core/store/persistence/gate-core.ts`**（你的桩）。

**05c · `src/core/store/persistence/gate-core.test.ts` · 改两处**：import 指向新文件；读完先检查 `ok`。改完是这样：

```ts
import { describe, expect, it } from "vitest";
import { asNodeId } from "../../schema/types";
import type { SlabNode } from "../../schema/slab";
import { loadSceneDocument } from "./load-scene-document";

describe('loadSceneDocument', () => {
  it('v0 文档： 楼板 elevation 0.05 迁移成 0', () => {
    const v0FlatDoc = {
      nodes: [
        {
          object: 'node', id: 'wall_1', type: 'wall', parentId: null, children: [],
          visible: true, metadata: {}, start: [0, 0], end: [4, 0],
        },
        {
          object: 'node', id: 'slab_1', type: 'slab', parentId: null, children: [],
          visible: true, metadata: {}, polygon: [[0, 0], [4, 0], [4, 4], [0, 4]],
          elevation: 0.05,
        },
      ],
      rootNodeIds: ['wall_1', 'slab_1'],
    }

    const result = loadSceneDocument(v0FlatDoc)
    if (!result.ok) throw new Error(`读档失败：${JSON.stringify(result.error)}`)
    const slab = result.snapshot.nodes[asNodeId('slab_1')] as SlabNode
    expect(slab.elevation).toBe(0)
  })
})
```

<details><summary>你改之前的版本（对照用）</summary>

```ts
import { describe, expect, it } from "vitest";
import { asNodeId } from "../../schema/types";
import type { SlabNode } from "../../schema/slab";
import { loadSceneDocument } from "./gate-core";

describe('loadSceneDocument', () => {
  it('v0 文档： 楼板 elevation 0.05 迁移成 0', () => {
    const v0FlatDoc = {
      nodes: [
        {
          object: 'node', id: 'wall_1', type: 'wall', parentId: null, children: [],
          visible: true, metadata: {}, start: [0, 0], end: [4, 0],
        },
        {
          object: 'node', id: 'slab_1', type: 'slab', parentId: null, children: [],
          visible: true, metadata: {}, polygon: [[0, 0], [4, 0], [4, 4], [0, 4]],
          elevation: 0.05,
        },
      ],
      rootNodeIds: ['wall_1', 'slab_1'],
    }

    const { snapshot } = loadSceneDocument(v0FlatDoc)
    const slab = snapshot.nodes[asNodeId('slab_1')] as SlabNode
    expect(slab.elevation).toBe(0)
  })
})
```

</details>

**05d · `src/core/store/persistence/load-scene-document.test.ts` · 新建 · 24 条**

```ts
import { describe, expect, it } from 'vitest'
import type { AnyNodeId } from '../../schema/types'
import { areSceneSnapshotsEqual, type SceneSnapshot } from '../history-control'
import { M1_FLAT_SCENE, M6_FLAT_SCENE, M7_FLAT_SCENE } from './fixtures'
import { parseSceneDocument, loadSceneDocument } from './load-scene-document'
import { runSceneMigrations, SCENE_MIGRATIONS, type SceneMigration } from './migrations'
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
    const first = load(M1_FLAT_SCENE).snapshot
    const doc = docOf(first)
    doc.rootNodeIds = ['wall_0a1b2c3d4e5a6b7c']
    const s = load(doc).snapshot
    expect(s.rootNodeIds).toEqual([ofType(s, 'site')[0]!.id])
  })
})

describe('坏数据：丢掉，但必须报出来', () => {
  const v1 = () => docOf(load(M7_FLAT_SCENE).snapshot)

  it('单个节点坏了只丢它，记 invalid；其余照常', () => {
    const raw = structuredClone(M1_FLAT_SCENE) as { nodes: Record<string, unknown>; rootNodeIds: string[] }
    raw.nodes.wall_bad = { object: 'node', id: 'wall_bad', type: 'wall', parentId: null, start: [0, 0] }
    raw.rootNodeIds.push('wall_bad')
    const r = load(raw)

    expect(r.report.dropped).toEqual([{ id: 'wall_bad', reason: 'invalid' }])
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
})
```

### 06 · `src/core/store/replace-scene.ts` · 新建 · 19 行

读档、切场景、导入共用。一次 `setState`、脏集换成新的 `Set`（不是 `markAllDirty()`——那只往旧集合里加，旧 id 会留下）、清历史（§02 E）。

```ts
import type { AnyNodeId } from '../schema/types'
import type { SceneSnapshot } from './history-control'
import { useScene } from './use-scene'

/**
 * 整场景替换：读档、切场景、导入都走这里。
 * 三件事缺一不可——一次 setState 写完、历史清空、脏集恰好是新节点（旧 id 不留在脏集里）。
 *
 * 不拿 acquireSceneHistoryPause：紧跟着的 clear() 已经把那条记录清掉了，
 * 变异测试验证过（去掉租约 268 条全绿）。少一个依赖，少一条要靠自觉记住的规矩。
 */
export function replaceScene(snapshot: SceneSnapshot): void {
  useScene.setState({
    nodes: snapshot.nodes,
    rootNodeIds: snapshot.rootNodeIds,
    dirtyNodes: new Set(Object.keys(snapshot.nodes) as AnyNodeId[]),
  })
  useScene.temporal.getState().clear()
}
```

**`src/core/store/replace-scene.test.ts` · 新建 · 3 条**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { M1_FLAT_SCENE } from './persistence/fixtures'
import { loadSceneDocument } from './persistence/load-scene-document'
import type { AnyNodeId } from '../schema/types'
import { resetSceneHistoryPause } from './history-control'
import { replaceScene } from './replace-scene'
import { useScene } from './use-scene'

const reset = () => {
  resetSceneHistoryPause(useScene)
  useScene.setState({ nodes: {}, rootNodeIds: [], dirtyNodes: new Set() })
  useScene.temporal.getState().clear()
}

const snapshot = () => {
  const r = loadSceneDocument(structuredClone(M1_FLAT_SCENE))
  if (!r.ok) throw new Error('fixture')
  return r.snapshot
}

describe('replaceScene', () => {
  beforeEach(reset)

  it('不进历史：替换完撤销栈为空，Ctrl+Z 撤不回替换之前的场景', () => {
    const stale = useScene.getState().addNode({ type: 'wall', start: [0, 0], end: [1, 0] })
    const next = snapshot()

    replaceScene(next)
    expect(useScene.temporal.getState().pastStates).toHaveLength(0)

    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes).toBe(next.nodes)
    expect(useScene.getState().nodes[stale]).toBeUndefined()
  })

  it('脏集恰好是新场景的全部节点——旧 id 不留在脏集里', () => {
    const stale = useScene.getState().addNode({ type: 'wall', start: [0, 0], end: [1, 0] })
    const next = snapshot()

    replaceScene(next)
    const dirty = useScene.getState().dirtyNodes
    expect([...dirty].sort()).toEqual(Object.keys(next.nodes).sort())
    expect(dirty.has(stale)).toBe(false)
  })

  it('替换之后的下一次编辑照常进历史、能撤（暂停租约被释放了）', () => {
    replaceScene(snapshot())
    const wallId = 'wall_0a1b2c3d4e5a6b7c' as AnyNodeId

    useScene.getState().updateNode(wallId, { end: [9, 0] })
    expect(useScene.temporal.getState().pastStates).toHaveLength(1)

    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[wallId]).toMatchObject({ end: [4, 0] })
  })
})
```

### 07 · `src/core/store/persistence/scene-storage.ts` · 新建 · 179 行

索引是缓存、文档是真相；**先写文档再写索引**；`docVersion` 比当前新就拒绝写（§02 G）。

```ts
import { generateId } from '../../schema/base'
import type { SceneSnapshot } from '../history-control'
import { loadSceneDocument, type SceneLoadResult } from './load-scene-document'
import { CURRENT_SCENE_VERSION, toSceneDocument } from './scene-document'

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export type SceneMeta = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
  docVersion: number
}

export type CheckpointMeta = { id: string; sceneId: string; label: string; createdAt: string }

type SceneIndex = { scenes: SceneMeta[]; checkpoints: CheckpointMeta[]; currentSceneId: string | null }

const PREFIX = 'r3f-arch:'
const INDEX_KEY = `${PREFIX}index`
const SCENE_PREFIX = `${PREFIX}scene:`
const sceneKey = (id: string) => `${SCENE_PREFIX}${id}`
const checkpointKey = (id: string) => `${PREFIX}checkpoint:${id}`

export class SceneTooNewError extends Error {
  constructor(id: string, version: number) {
    super(`场景 ${id} 是 v${version} 存的，比当前 v${CURRENT_SCENE_VERSION} 新，拒绝覆盖`)
    this.name = 'SceneTooNewError'
  }
}

export function createSceneStorage(
  kv: KeyValueStore,
  options: { now?: () => string; newId?: () => string; maxCheckpointsPerScene?: number } = {},
) {
  const now = options.now ?? (() => new Date().toISOString())
  const newId = options.newId ?? (() => generateId('scene'))
  const maxCheckpoints = options.maxCheckpointsPerScene ?? 10

  /** 索引是缓存，文档才是真相：索引丢了或坏了，从 scene:* 键重建。 */
  const readIndex = (): SceneIndex => {
    const raw = kv.getItem(INDEX_KEY)
    if (raw !== null) {
      try {
        const v = JSON.parse(raw) as Partial<SceneIndex>
        if (Array.isArray(v.scenes) && Array.isArray(v.checkpoints)) {
          return { scenes: v.scenes, checkpoints: v.checkpoints, currentSceneId: v.currentSceneId ?? null }
        }
      } catch {
        // 落到下面重建
      }
    }
    const scenes: SceneMeta[] = []
    for (const key of kv.keys()) {
      if (!key.startsWith(SCENE_PREFIX)) continue
      const id = key.slice(SCENE_PREFIX.length)
      const text = kv.getItem(key) ?? ''
      let docVersion = 0
      let nodeCount = 0
      try {
        const v = JSON.parse(text) as { version?: unknown; nodes?: unknown }
        if (typeof v.version === 'number') docVersion = v.version
        if (Array.isArray(v.nodes)) nodeCount = v.nodes.length
        else if (v.nodes && typeof v.nodes === 'object') nodeCount = Object.keys(v.nodes).length
      } catch {
        // 坏文档也列出来，读的时候再报错
      }
      scenes.push({ id, name: id, createdAt: '', updatedAt: '', nodeCount, docVersion })
    }
    return { scenes, checkpoints: [], currentSceneId: null }
  }

  const writeIndex = (index: SceneIndex) => kv.setItem(INDEX_KEY, JSON.stringify(index))

  const writeDoc = (key: string, snapshot: SceneSnapshot) =>
    kv.setItem(key, JSON.stringify(toSceneDocument(snapshot)))

  const loadKey = (key: string): SceneLoadResult | null => {
    const text = kv.getItem(key)
    if (text === null) return null
    try {
      return loadSceneDocument(JSON.parse(text))
    } catch {
      return { ok: false, error: { kind: 'not-json' } }
    }
  }

  return {
    list: (): SceneMeta[] => [...readIndex().scenes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

    create(name: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const t = now()
      const meta: SceneMeta = {
        id: newId(),
        name,
        createdAt: t,
        updatedAt: t,
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      writeDoc(sceneKey(meta.id), snapshot) // 先写文档，再写索引：索引写挂了还能重建
      writeIndex({ ...index, scenes: [...index.scenes, meta] })
      return meta
    },

    save(id: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const prev = index.scenes.find((s) => s.id === id)
      if (!prev) throw new Error(`场景 ${id} 不存在`)
      if (prev.docVersion > CURRENT_SCENE_VERSION) throw new SceneTooNewError(id, prev.docVersion)

      writeDoc(sceneKey(id), snapshot)
      const meta: SceneMeta = {
        ...prev,
        updatedAt: now(),
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === id ? meta : s)) })
      return meta
    },

    load: (id: string): SceneLoadResult | null => loadKey(sceneKey(id)),

    remove(id: string): void {
      const index = readIndex()
      kv.removeItem(sceneKey(id))
      for (const cp of index.checkpoints) if (cp.sceneId === id) kv.removeItem(checkpointKey(cp.id))
      writeIndex({
        scenes: index.scenes.filter((s) => s.id !== id),
        checkpoints: index.checkpoints.filter((c) => c.sceneId !== id),
        currentSceneId: index.currentSceneId === id ? null : index.currentSceneId,
      })
    },

    rename(id: string, name: string): void {
      const index = readIndex()
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === id ? { ...s, name } : s)) })
    },

    checkpoint(sceneId: string, label: string, snapshot: SceneSnapshot): CheckpointMeta {
      const index = readIndex()
      const meta: CheckpointMeta = { id: newId(), sceneId, label, createdAt: now() }
      writeDoc(checkpointKey(meta.id), snapshot)

      const mine = [...index.checkpoints.filter((c) => c.sceneId === sceneId), meta]
      const doomed = mine.slice(0, Math.max(0, mine.length - maxCheckpoints))
      for (const cp of doomed) kv.removeItem(checkpointKey(cp.id))
      const doomedIds = new Set(doomed.map((c) => c.id))

      writeIndex({
        ...index,
        checkpoints: [...index.checkpoints, meta].filter((c) => !doomedIds.has(c.id)),
      })
      return meta
    },

    listCheckpoints: (sceneId: string): CheckpointMeta[] =>
      readIndex().checkpoints.filter((c) => c.sceneId === sceneId),

    loadCheckpoint: (checkpointId: string): SceneLoadResult | null => loadKey(checkpointKey(checkpointId)),

    currentSceneId: (): string | null => readIndex().currentSceneId,

    setCurrentSceneId(id: string | null): void {
      writeIndex({ ...readIndex(), currentSceneId: id })
    },
  }
}

export type SceneStorage = ReturnType<typeof createSceneStorage>
```

**`src/core/store/persistence/scene-storage.test.ts` · 新建 · 8 条**

```ts
import { describe, expect, it } from 'vitest'
import { areSceneSnapshotsEqual } from '../history-control'
import { M1_FLAT_SCENE } from './fixtures'
import { loadSceneDocument } from './load-scene-document'
import { SCENE_FORMAT } from './scene-document'
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
    newId: () => `scene_${n++}`,
    maxCheckpointsPerScene,
  })
  return { kv, storage }
}

const m1 = () => {
  const r = loadSceneDocument(structuredClone(M1_FLAT_SCENE))
  if (!r.ok) throw new Error('fixture')
  return r.snapshot
}

describe('sceneStorage', () => {
  it('M1 老存档 → 读进来 → 存成新场景 → 再读：一模一样，且已是当前版本', () => {
    const { storage } = make()
    const snap = m1()
    const meta = storage.create('老房子', snap)

    const back = storage.load(meta.id)
    expect(back?.ok).toBe(true)
    if (!back?.ok) return
    expect(back.fromVersion).toBe(1)
    expect(areSceneSnapshotsEqual(back.snapshot, snap)).toBe(true)
    expect(storage.list()[0]).toMatchObject({ name: '老房子', nodeCount: Object.keys(snap.nodes).length, docVersion: 1 })
  })

  it('直接躺在存储里的 v0 文档（没有 format / version）也走迁移', () => {
    const { kv, storage } = make()
    kv.setItem('r3f-arch:scene:legacy', JSON.stringify(M1_FLAT_SCENE))
    expect(storage.load('legacy')).toMatchObject({ ok: true, fromVersion: 0 })
  })

  it('删除：文档、它的存档点、索引条目一起清掉；当前场景是它 → 置空', () => {
    const { kv, storage } = make()
    const snap = m1()
    const a = storage.create('a', snap)
    const b = storage.create('b', snap)
    storage.setCurrentSceneId(a.id)
    const cpA = storage.checkpoint(a.id, 'x', snap)
    const cpB = storage.checkpoint(b.id, 'y', snap)

    storage.remove(a.id)

    expect(kv.getItem(`r3f-arch:scene:${a.id}`)).toBeNull()
    expect(kv.getItem(`r3f-arch:checkpoint:${cpA.id}`)).toBeNull()
    expect(kv.getItem(`r3f-arch:checkpoint:${cpB.id}`)).not.toBeNull()
    expect(storage.list().map((s) => s.id)).toEqual([b.id])
    expect(storage.currentSceneId()).toBeNull()
  })

  it('存档点只留最近 N 个，旧的连文档一起删', () => {
    const { kv, storage } = make(memoryKV(), 3)
    const snap = m1()
    const a = storage.create('a', snap)
    for (const label of ['1', '2', '3', '4', '5']) storage.checkpoint(a.id, label, snap)

    expect(storage.listCheckpoints(a.id).map((c) => c.label)).toEqual(['3', '4', '5'])
    expect(kv.keys().filter((k) => k.startsWith('r3f-arch:checkpoint:'))).toHaveLength(3)
  })

  it('降级保护：索引记着文档是更新的版本存的 → save 抛 SceneTooNewError，文档原样不动', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const index = JSON.parse(kv.getItem('r3f-arch:index')!)
    index.scenes[0].docVersion = 99
    kv.setItem('r3f-arch:index', JSON.stringify(index))
    kv.setItem(`r3f-arch:scene:${a.id}`, 'NEWER')

    expect(() => storage.save(a.id, m1())).toThrow(SceneTooNewError)
    expect(kv.getItem(`r3f-arch:scene:${a.id}`)).toBe('NEWER')
  })

  it('读到比当前新的文档 → too-new（调用方据此不许对它启动自动保存）', () => {
    const { kv, storage } = make()
    kv.setItem('r3f-arch:scene:x', JSON.stringify({ format: SCENE_FORMAT, version: 99, nodes: [], rootNodeIds: [] }))
    expect(storage.load('x')).toEqual({ ok: false, error: { kind: 'too-new', version: 99 } })
  })

  it('写文档失败（配额满，大的是文档不是索引）→ 抛出，索引不变——所以必须先写文档再写索引', () => {
    const kv = memoryKV()
    const { storage } = make(kv)
    const a = storage.create('a', m1())
    const indexBefore = kv.getItem('r3f-arch:index')

    const setItem = kv.setItem
    kv.setItem = (k, v) => {
      if (k.startsWith('r3f-arch:scene:')) throw new Error('QuotaExceededError')
      setItem(k, v)
    }
    expect(() => storage.save(a.id, m1())).toThrow(/Quota/)
    expect(kv.map.get('r3f-arch:index')).toBe(indexBefore)
  })

  it('索引坏了 / 丢了 → 从 scene:* 键重建，一个场景都不丢', () => {
    const { kv, storage } = make()
    const a = storage.create('a', m1())
    const b = storage.create('b', m1())

    kv.setItem('r3f-arch:index', '{坏了')
    expect(storage.list().map((s) => s.id).sort()).toEqual([a.id, b.id].sort())

    kv.removeItem('r3f-arch:index')
    const rebuilt = storage.list()
    expect(rebuilt).toHaveLength(2)
    expect(rebuilt[0]!.nodeCount).toBe(Object.keys(m1().nodes).length)
  })
})
```

### 08 · `src/core/store/use-scene.ts` · 改两处 —— 写入边界（B4，Q1）

**08a · 在 `mergeNodePath` 下面新增 `validateMerged`**。`mergeNodePath` 本身不动，它现在长这样：

```ts
function mergeNodePath(prev: AnyNode, patch: Partial<AnyNode>): AnyNode {
    const merged: Record<string, unknown> = { ...prev, ...patch }
    for (const key of Object.keys(patch)) {
        if ((patch as Record<string, unknown>)[key] === undefined) delete merged[key]
    }
    return merged as AnyNode
}
```

紧接着它加：

```ts
/** 写入边界：store 里的每个节点都必须是合法的它自己。M9 起它会被自动保存写进磁盘。 */
function validateMerged(prev: AnyNode, merged: AnyNode): AnyNode {
    if (merged.type !== prev.type || merged.id !== prev.id) {
        throw new Error(`[scene] updateNode: ${prev.id} 不能改 type / id`)
    }
    // 值不合法（比如层高 0）：放进去的话，落盘后下次读档整层连同墙和门窗一起丢。
    const result = AnyNode.safeParse(merged)
    if (!result.success) {
        throw new Error(`[scene] updateNode: ${prev.id} 改完不是合法的 ${prev.type}：${result.error.issues[0]?.message ?? ''}`)
    }
    // 别的类型的字段：zod 会静默剥掉，不丢数据，但会把调用方的错藏起来。
    const stripped = Object.keys(merged).filter((k) => !(k in result.data))
    if (stripped.length > 0) {
        throw new Error(`[scene] updateNode: ${prev.type} 没有字段 ${stripped.join(', ')}`)
    }
    return result.data
}
```

**08b · `updateNode` 开头**：先校验、再写。改前：

```ts
            updateNode: (id, patch) => {
                if ('parentId' in patch || 'children' in patch) {
                    throw new Error('[scene] updateNode: parentId / children 不可 patch')
                }
                set((s) => {
                    const prev = s.nodes[id]
                    if (!prev) return s
                    return { nodes: { ...s.nodes, [id]: mergeNodePath(prev, patch) } }
                })
```

改后：

```ts
            updateNode: (id, patch) => {
                if ('parentId' in patch || 'children' in patch) {
                    throw new Error('[scene] updateNode: parentId / children 不可 patch')
                }
                const prev = get().nodes[id]
                if (!prev) return
                // 校验通过才写：抛错时 store 一个字节都没动。
                const validated = validateMerged(prev, mergeNodePath(prev, patch))
                set((s) => ({ nodes: { ...s.nodes, [id]: validated } }))
```

`updateNode` 里 `const next = get().nodes[id]` 往下的脏传播不变。

**08c · `src/core/store/use-scene.test.ts` · 末尾追加 6 条**（复用文件里已有的 `reset` / `addWall` / `nodeAt`；`addLevel` 原来只定义在另一个 `describe` 里，所以这里自带一个）：

```ts
describe('updateNode 写入边界（M9 · B4）', () => {
  beforeEach(reset)

  const addLevel = (height = 2.5) =>
    useScene.getState().addNode({ type: 'level', level: 0, height })

  it('别的类型的字段 → 抛错，场景不变（Partial<AnyNode> 在类型上放行了它）', () => {
    const id = addWall()
    const before = useScene.getState().nodes
    expect(() => useScene.getState().updateNode(id, { polygon: [[0, 0], [1, 0], [1, 1]] })).toThrow(/polygon/)
    expect(useScene.getState().nodes).toBe(before)
  })

  it('值不合法（负厚度）→ 抛错', () => {
    const id = addWall()
    expect(() => useScene.getState().updateNode(id, { thickness: -1 })).toThrow()
  })

  it('层高 0 → 抛错，层原样不动（不挡的话，落盘后下次读档整层丢失）', () => {
    const levelId = addLevel()
    const before = nodeAt(levelId)
    expect(() => useScene.getState().updateNode(levelId, { height: 0 })).toThrow()
    expect(nodeAt(levelId)).toBe(before)
  })

  it('改 type → 抛错', () => {
    const id = addWall()
    expect(() => useScene.getState().updateNode(id, { type: 'slab' })).toThrow(/type/)
  })

  it('D23 回归：height: undefined 仍然删掉这个键，不被 parse 填回来', () => {
    const id = addWall()
    useScene.getState().updateNode(id, { height: 3 })
    useScene.getState().updateNode(id, { height: undefined })
    expect('height' in nodeAt(id)!).toBe(false)
  })

  it('合法 patch 照常：写进去、进历史', () => {
    const id = addWall()
    useScene.getState().updateNode(id, { end: [9, 0] })
    expect(nodeAt(id)).toMatchObject({ end: [9, 0] })
    expect(useScene.temporal.getState().pastStates).toHaveLength(2)
  })
})
```

---

### 敲完之后应该看到什么

| 怎么试 | 应该 |
|---|---|
| `pnpm verify` | **20 文件 / 252 用例，全绿** |
| 打开页面，画几堵墙 | **和敲之前完全一样**。刷新仍然清空——`main.tsx` 还没接存档，那是 app 批的事 |
| 拖一堵墙、拖一个端点球，松手 | 行为不变，**控制台没有 `[scene] updateNode` 报错**。这两处（`move-tool.tsx:45`、`endpoint-handles.tsx:117`）只写 `start` / `end`，按代码推是合法的——**未在浏览器验证** |
| 控制台里把某一层的层高改成 0（片段见下） | **抛错**：`[scene] updateNode: level_… 改完不是合法的 level：…`；画面不变 |

```js
// 浏览器控制台（Vite 开发服务器下）
const { useScene } = await import('/src/core/store/use-scene.ts')
const level = Object.values(useScene.getState().nodes).find((n) => n.type === 'level')
useScene.getState().updateNode(level.id, { height: 0 })   // 应该抛错
```

### 下一步

1. 敲完跑 `pnpm verify`，再 **`/review`**。
2. **`/gate viewer`**：M9 的 viewer 层没有改动（§02 E：`NodeRenderer` 找不到节点返回 `null`，`GeometrySystem` 对不存在的脏 id 直接 `clearDirty`），这一关只确认「本层无改动、无自动护栏」。
3. **`/gate app`** 之前，先定前置 B 的 **B2**（导入是新建场景还是覆盖）和 **B3**（要不要误删护栏）。app 批是：`autosave` · `local-storage-kv` · `use-persistence` · `scene-session` · `file-io` · 面板 · `app.tsx` / `main.tsx`。
