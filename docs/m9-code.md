# M9 §07 全码

**验证**：`tsc` ✅ · `eslint` ✅ · `vitest` ✅ **20 passed (20) · 265 passed (265)** · `vite build` ✅ · 变异测试 **32 / 32 被抓**。
在 2026-09-17 你的 `src/` 的全新拷贝上，**按下面的顺序一步一步做了你要做的每个动作，每一步都跑了 `check-types` / `lint` / `vitest`**，表里的数字全是实测。代码块由脚本从跑过的文件原样导出，不是手抄。

**未验证**：浏览器里的渲染与交互（本批是纯 core；但第 08 步改了 `updateNode`，拖墙 / 拖端点球会走到它，见末尾「肉眼」）；真实 `localStorage`（存储层只用内存 KV 测过）。

> 设计在 `m9-persistence.html`（§02 机制 · §04 建造顺序）。按 **core → viewer → app** 三批放出，每批先过 `/gate`（D29）。每批敲完：`pnpm verify` → `/review`。

---

## core 批（2026-09-17 修订版）

> **这一版整体替换上一版**（上一版在 git 的 `2efb179` 里）。上一版你还没敲，所以不用对照着改，照这一版从头敲。

### 和上一版的差

| 上一版 | 这一版 | 为什么 |
|---|---|---|
| 目录 `src/core/store/persistence/` | **`src/core/persistence/`** | 你决定改回设计目录 |
| `fixtures.ts` 和实现文件放在一起 | **`__fixtures__/legacy-scenes.ts`**，文件头写明「冻结、只给测试用」 | 它是测试输入，不是实现；实现文件一个都不 import 它 |
| v0 → v1 调 `migrateToLevels` 造容器 | 容器的 **v1 形状冻结在迁移里** | 迁移是历史记录，不能依赖会随 schema 变的代码（今天的 `SiteNode.parse` / `DEFAULT_LEVEL_HEIGHT`）。否则 v2 出现时，v0 文档会被直接造成 v2 的样子，再被 v1 → v2 改一遍 |
| v0 → v1 遇到没 id / 重复 id 的节点直接跳过 | 原样放行，由 normalize **丢掉并报告** | 上一版会悄悄吞节点（复查发现，新增测试钉住） |
| normalize 直接 `parse` | 先要求 id 是字符串 | `objectId` 带 default，缺 id 的节点会被 parse **发明一个新 id**，变成谁都不认识的新根 |
| `updateNode` 用 `in` 查多余字段 | **`Object.hasOwn`** | `constructor` 之类在原型链上，`in` 会漏判 |
| 存储：索引就是真相 | **索引是缓存，以存储里实际的键为准** | 上一版：写完文档没写成索引的场景永远不出现；文档没了记录还在；一条缺字段的记录让 `list()` 崩；存档点在索引重建后永远泄漏 |
| 降级保护只看索引 | **索引和文档本身都看** | 新版本写完文档、没写成索引时，只有文档知道自己是新版本 |
| 存档点键 `checkpoint:<id>`；`loadCheckpoint(id)` | **`checkpoint:<场景id>:<id>`**；`loadCheckpoint(场景id, id)` | 索引丢了也知道存档点属于谁，删场景时按前缀删干净 |
| `newId: () => string` | `newId: (kind) => string` | 场景和存档点的 id 前缀分开 |

### 和设计文档的差（约定 6）

| 设计写的 | 实际 | 为什么 |
|---|---|---|
| `readSceneDocument` | **`loadSceneDocument`** | 你的命名 |
| —— | 你的闸门测试 **`src/core/persistence/gate-core.test.ts`** | 你写的，第 00 步挪过来，第 05 步改两处 |
| 你的桩：返回 `{ snapshot, report }`，失败抛 | **联合类型** `{ ok: true, … } \| { ok: false, error }`，`report` 带原因 | 闸门第 2 步实测：抛异常时 `not-a-scene` 在调用方说不清原因；你在 Q1 那棵树上标的正是原因 |
| §02 C「v0 → v1 直接调 `migrateToLevels`」（D27 把它定位成迁移链第一个节点） | **不调**，形状冻结在迁移里 | 见上表第三行。`migrateToLevels` 仍然是 `ensureScaffold` 的实现，不受影响 |
| `replaceScene` 拿暂停租约 | **不拿** | 变异测试：去掉租约全绿，紧跟着的 `clear()` 已经清掉那条历史 |
| §02 I 的例子「跨类型字段读档会丢墙」 | 跨类型字段被 zod **静默剥掉**；丢数据的是**非法值**（层高 0） | 沙箱探针；HTML 里已加更正框 |

### 前置 B 用的是推荐值

本批按推荐实现了 **B1**（文档级整数版本号）、**B4**（只还写入边界）、**B5**（同步存储）。B2（导入语义）、B3（误删护栏）到 app 批才生效。**要改任何一条，在 `/gate app` 之前告诉我。**

### 敲的顺序，以及每一步之后应该看到什么（全部实测）

| 步 | 做什么 | `check-types` | `lint` | `vitest` |
|---|---|---|---|---|
| 基线（你当前的 src/） | 什么都不做 | ❌（TS6133: 'raw' is declared but its value is never read.） | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/store/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 00 | 把你的两个文件挪到 `src/core/persistence/`，删掉 `src/core/store/persistence/` | ✅ | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 01 | `scene-document.ts` | ✅ | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 02 | `__fixtures__/legacy-scenes.ts` | ✅ | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 03 | `migrations.ts` + `migrations/v0-to-v1.ts` | ✅ | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 04 | `normalize-snapshot.ts` | ✅ | ✅ | 1 failed | 16 passed (17) · 1 failed | 210 passed (211)；红：src/core/persistence/gate-core.test.ts > loadSceneDocument > v0 文档： 楼板 elevation 0.05 迁移成 0 |
| 05 | `load-scene-document.ts` + 删 `gate-core.ts` + 改 `gate-core.test.ts` + `load-scene-document.test.ts` | ✅ | ✅ | 18 passed (18) · 239 passed (239) |
| 06 | `store/replace-scene.ts` + 测试 | ✅ | ✅ | 19 passed (19) · 242 passed (242) |
| 07 | `scene-storage.ts` + 测试 | ✅ | ✅ | 20 passed (20) · 258 passed (258) |
| 08 | `store/use-scene.ts` 两处 + `use-scene.test.ts` 追加 | ✅ | ✅ | 20 passed (20) · 265 passed (265) |

> 基线那一行的 `check-types` 是红的：你的桩 `gate-core.ts` 的参数 `raw` 没被用到（`noUnusedParameters`），所以 `pnpm verify` 现在停在第一步，根本没跑到测试。第 00 步把它改成 `_raw` 就绿了。00–04 之间你的闸门测试一直红在 `not implemented`，这是对的；05 之后转绿。

---

### 00 · 把你的两个文件挪到设计目录

1. **新建** `src/core/persistence/gate-core.ts`（你的桩，只改了 import 路径，参数名改成 `_raw`）：

```ts
import type { AnyNodeId } from "../schema/types";
import type { SceneSnapshot } from "../store/history-control";

export type LoadReport = {
  droppedNodeIds: AnyNodeId[]
}

export function loadSceneDocument(_raw: unknown): { snapshot: SceneSnapshot; report: LoadReport } {
  throw new Error('not implemented')
}
```

2. **新建** `src/core/persistence/gate-core.test.ts`（你的测试，只改了两行 import 路径）：

```ts
import { describe, expect, it } from "vitest";
import { asNodeId } from "../schema/types";
import type { SlabNode } from "../schema/slab";
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

3. **删除整个 `src/core/store/persistence/` 目录**（里面就是这两个文件的旧位置）。

### 01 · `src/core/persistence/scene-document.ts` · 新建 · 51 行

信封的样子、当前版本号，以及「根由 `parentId` 决定，存档里的顺序只用来排序」（§02 A）。

```ts
import type { AnyNode, AnyNodeId } from '../schema/types'
import type { SceneSnapshot } from '../store/history-control'

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

/** 根 = parentId 为空的节点。存档里的 rootNodeIds 只用来排序，不用来决定谁是根。 */
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

### 02 · `src/core/persistence/__fixtures__/legacy-scenes.ts` · 新建 · 66 行

**测试输入，不是实现。**项目从没存过档，「M1 时代的存档」只能按 git 历史里当时的 zod 定义写出来。被 `.default()` 物化进数据的字段一个都不能漏——那才是当年 `addNode` 真正写进去的东西。**以后 schema 变了，这个文件一个字都不改。**

```ts
/**
 * 冻结的存档语料 —— 不要随 schema 更新。
 *
 * M9 之前项目从没持久化过，所以这些不是捡来的老存档，而是按 git 历史里当时的 zod 定义
 * 手写的「那时如果有存档，它会长这样」。被 .default() 物化进数据的字段
 * （object / visible / metadata / slab.elevation）一个不少。
 * 形状就是 useScene 的 { nodes: Record<id, node>, rootNodeIds }：没有 format，没有 version。
 *
 * 以后 schema 变了，这里一个字都不改：改了，迁移测试就变成「新格式读新格式」，永远绿、什么都不证明。
 * 新版本的语料另起一个导出，旧的留着。只给测试用，产品代码不许 import。
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

### 03 · 迁移链

**03a · `src/core/persistence/migrations.ts` · 新建 · 36 行** —— 链按 `from` 查找，`version` 由 runner 写（§02 B）。

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
    // 按 from 查找，不按数组下标：链的顺序由编号决定，不由谁先写进数组决定。
    const step = migrations.find((m) => m.from === from)
    if (!step) throw new SceneMigrationError(from, `没有从 v${from} 出发的迁移`)
    current = { ...step.migrate(current), version: from + 1 }
  }
  return current
}
```

**03b · `src/core/persistence/migrations/v0-to-v1.ts` · 新建 · 70 行** —— 全链唯一「看形状」的地方；只在「平」时改 0.05、收进容器（§02 C，Q2）。`0.05` 和 `2.5` 写成字面量是故意的：它们记录的是**当时**的值，import 今天的常量就错了。

```ts
import { generateId } from '../../schema/base'
import type { SceneMigration } from '../migrations'
import { deriveRootIds, type RawNode } from '../scene-document'

/*
 * v0 → v1：M8 之前的平场景。
 *
 * 迁移是历史记录，必须冻结：这里不 import 任何会随 schema 变化的东西——默认值常量、
 * SiteNode.parse / LevelNode.parse、migrateToLevels 都不行。它产出的永远是「v1 那一刻」的形状。
 * 要是这里调了今天的 schema，等 v2 出现，v0 的文档会被直接造成 v2 的样子，
 * 再被 v1 → v2 改一遍，verify 全绿、数据静默出错。
 */

const CONTAINER_TYPES = new Set(['site', 'building', 'level'])

/** v0 时的 DEFAULT_SLAB_ELEVATION（M6 到 M8 批 F 之前）。zod 的 .default() 在 addNode 时把它写进了每一块楼板。 */
const V0_SLAB_ELEVATION = 0.05

/** v1 新建层的层高（M8 的 DEFAULT_LEVEL_HEIGHT）。显式写进数据：缺席要留给「用户没设过」（D23）。 */
const V1_LEVEL_HEIGHT = 2.5

const v1Container = (
  type: 'site' | 'building' | 'level',
  id: string,
  parentId: string | null,
  children: string[],
  extra: RawNode = {},
): RawNode => ({ object: 'node', id, type, parentId, children, visible: true, metadata: {}, ...extra })

export const v0ToV1: SceneMigration = {
  from: 0,
  note: 'M8 之前的平场景：楼板 0.05 → 0；收进 Site → Building → Level 0',
  migrate: (doc) => {
    // v0 没有版本号，这里是全链唯一允许「看形状」的地方：一个容器都没有 = M8 之前。
    const flat = !doc.nodes.some((n) => CONTAINER_TYPES.has(String(n.type)))
    if (!flat) return { nodes: doc.nodes, rootNodeIds: doc.rootNodeIds }

    // 用 Map 不用普通对象：id 恰好叫 constructor 之类时，`id in {}` 会被原型链骗到。
    const keyed = new Map<string, RawNode>()
    // 没法按 id 收养的（id 不是字符串、id 重复）原样放行，交给 normalize 去丢、去报告——迁移不许悄悄吞节点。
    const passThrough: RawNode[] = []
    for (const raw of doc.nodes) {
      if (typeof raw.id !== 'string' || keyed.has(raw.id)) {
        passThrough.push(raw)
        continue
      }
      keyed.set(raw.id, raw.type === 'slab' && raw.elevation === V0_SLAB_ELEVATION ? { ...raw, elevation: 0 } : raw)
    }

    const siteId = generateId('site')
    const buildingId = generateId('building')
    const levelId = generateId('level')

    // 根下的节点收进 Level 0。不经过 addNode，所以 parentId 和 children 两侧都在这里写对。
    // 不用补 children 字段：normalize 最后那次 parse 会填成 []。
    const adopted = deriveRootIds([...keyed.values()], doc.rootNodeIds)
    for (const id of adopted) keyed.set(id, { ...keyed.get(id), parentId: levelId })

    return {
      nodes: [
        v1Container('site', siteId, null, [buildingId]),
        v1Container('building', buildingId, siteId, [levelId]),
        v1Container('level', levelId, buildingId, adopted, { level: 0, baseElevation: 0, height: V1_LEVEL_HEIGHT }),
        ...keyed.values(),
        ...passThrough,
      ],
      rootNodeIds: [siteId],
    }
  },
}
```

### 04 · `src/core/persistence/normalize-snapshot.ts` · 新建 · 119 行

进 store 前的最后一道：要求字符串 id → 逐个 `parse` → 沿 `parentId` 下判决（缺父 / 成环 / 祖先被丢）→ **按 `parentId` 重建 `children`** → 推根（§02 D，Q3）。

```ts
import { AnyNode, type AnyNodeId } from '../schema/types'
import type { SceneSnapshot } from '../store/history-control'
import { deriveRootIds, type RawNode } from './scene-document'

export type DropReason = 'invalid' | 'duplicate-id' | 'missing-parent' | 'cycle' | 'ancestor-dropped'
export type DroppedNode = { id: string | null; reason: DropReason }
export type LoadReport = { dropped: DroppedNode[]; repairedParents: string[] }

/**
 * 迁移之后、进 store 之前的最后一道：逐个 parse、丢坏的、按 parentId 重建 children、推出根。
 * parentId 是真相，children 是索引（D19）——存档里的 children 只用来保顺序。
 * 丢掉的每一个节点都进报告：静默是本项目 bug 的共同点。
 */
export function normalizeSceneNodes(
  rawNodes: readonly RawNode[],
  savedRootIds: readonly unknown[],
): { snapshot: SceneSnapshot; report: LoadReport } {
  const dropped: DroppedNode[] = []
  const parsed = new Map<string, AnyNode>()

  for (const raw of rawNodes) {
    // 先要求有字符串 id：objectId 带 default，缺 id 的节点 parse 时会被发明一个新 id，
    // 变成一个谁都不认识的新根。读档时不许这样「修」数据。
    if (typeof raw.id !== 'string') {
      dropped.push({ id: null, reason: 'invalid' })
      continue
    }
    const result = AnyNode.safeParse(raw)
    if (!result.success) {
      dropped.push({ id: raw.id, reason: 'invalid' })
      continue
    }
    if (parsed.has(result.data.id)) {
      dropped.push({ id: result.data.id, reason: 'duplicate-id' })
      continue
    }
    parsed.set(result.data.id, result.data)
  }

  // 沿 parentId 往上走，给每个节点下判决。判决缓存让它是线性的；「本次路径」集合让环不会把它挂住。
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

### 05 · 加载入口，以及你的闸门测试转绿

**05a · `src/core/persistence/load-scene-document.ts` · 新建 · 81 行** —— 信封 → 迁移 → 规范化，**一步都不碰 store**（Q3：读取失败 = 什么都没发生）。

```ts
import type { SceneSnapshot } from '../store/history-control'
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

// 不是对象的条目换成 {}：让 normalize 把它记成 invalid，而不是在这里悄悄过滤掉。
const asRawNodes = (list: readonly unknown[]): RawNode[] => list.map((n) => (isObject(n) ? n : {}))
const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** 信封：认出版本。比当前新的在这里就拒绝，一环迁移都不跑。 */
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

  // 有 format 或 version、但对不上：不猜。
  if ('format' in value || 'version' in value) return { kind: 'not-a-scene' }

  // v0：版本号出现之前的样子，就是 useScene 的 { nodes: Record<id, node>, rootNodeIds }——没有 format，也没有 version。
  const { nodes } = value
  const list = Array.isArray(nodes) ? nodes : isObject(nodes) ? Object.values(nodes) : null
  if (list === null) return { kind: 'not-a-scene' }
  return { version: 0, nodes: asRawNodes(list), rootNodeIds: asIds(value.rootNodeIds) }
}

/**
 * 读档：信封 → 迁移 → 规范化。纯函数，一步都不碰 store——读取失败 = 什么都没发生。
 * 不改入参。
 */
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

/** 从文本读档（文件导入、localStorage）。不是 JSON 就返回错误，不抛。 */
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

**05b · 删除 `src/core/persistence/gate-core.ts`**（桩完成使命）。

**05c · 改 `src/core/persistence/gate-core.test.ts`**：import 指向 `./load-scene-document`；读完先检查 `ok`。改完是这样：

```ts
import { describe, expect, it } from "vitest";
import { asNodeId } from "../schema/types";
import type { SlabNode } from "../schema/slab";
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

**05d · `src/core/persistence/load-scene-document.test.ts` · 新建**

```ts
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
```

### 06 · `src/core/store/replace-scene.ts` · 新建 · 19 行

读档、切场景、导入共用：一次 `setState`、脏集换成新的 `Set`、清历史（§02 E）。

```ts
import type { AnyNodeId } from '../schema/types'
import type { SceneSnapshot } from './history-control'
import { useScene } from './use-scene'

/**
 * 整场景替换：读档、切场景、导入都走这里。
 * 三件事缺一不可——一次 setState 写完、历史清空、脏集恰好是新节点（旧 id 不留在脏集里）。
 *
 * 不用 markAllDirty()：它只往旧集合里加，旧场景的 id 会留下。
 * 不拿 acquireSceneHistoryPause：紧跟着的 clear() 已经把这次写入留下的历史清掉了（变异测试验证过）。
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

**`src/core/store/replace-scene.test.ts` · 新建**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { M1_FLAT_SCENE } from '../persistence/__fixtures__/legacy-scenes'
import { loadSceneDocument } from '../persistence/load-scene-document'
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

  it('替换之后的下一次编辑照常进历史、能撤', () => {
    replaceScene(snapshot())
    const wallId = 'wall_0a1b2c3d4e5a6b7c' as AnyNodeId

    useScene.getState().updateNode(wallId, { end: [9, 0] })
    expect(useScene.temporal.getState().pastStates).toHaveLength(1)

    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[wallId]).toMatchObject({ end: [4, 0] })
  })
})
```

### 07 · `src/core/persistence/scene-storage.ts` · 新建 · 242 行

索引是缓存、存储里实际的键才是真相；**先写文档再写索引**；文档或索引任一处说「更新的版本存的」就拒绝覆盖（§02 G）。

```ts
import { generateId } from '../schema/base'
import type { SceneSnapshot } from '../store/history-control'
import { parseSceneDocument, type SceneLoadResult } from './load-scene-document'
import { CURRENT_SCENE_VERSION, toSceneDocument } from './scene-document'

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  /** 返回一个快照数组：调用方会一边遍历一边删。 */
  keys(): string[]
}

export type SceneMeta = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
  /** 这份文档是哪个版本存的。比当前代码新就拒绝覆盖（降级保护）。 */
  docVersion: number
}

export type CheckpointMeta = { id: string; sceneId: string; label: string; createdAt: string }

type SceneIndex = { scenes: SceneMeta[]; checkpoints: CheckpointMeta[]; currentSceneId: string | null }

const PREFIX = 'r3f-arch:'
const INDEX_KEY = `${PREFIX}index`
const SCENE_PREFIX = `${PREFIX}scene:`
const CHECKPOINT_PREFIX = `${PREFIX}checkpoint:`
const sceneKey = (sceneId: string) => `${SCENE_PREFIX}${sceneId}`
// 存档点的键带着场景 id：索引丢了也知道它属于谁，删场景时按前缀就能删干净。
const checkpointKey = (sceneId: string, checkpointId: string) => `${CHECKPOINT_PREFIX}${sceneId}:${checkpointId}`

export class SceneTooNewError extends Error {
  constructor(sceneId: string, version: number) {
    super(`场景 ${sceneId} 是 v${version} 存的，比当前 v${CURRENT_SCENE_VERSION} 新，拒绝覆盖`)
    this.name = 'SceneTooNewError'
  }
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isSceneMeta = (v: unknown): v is SceneMeta =>
  isRecord(v) && isString(v.id) && isString(v.name) && isString(v.createdAt) &&
  isString(v.updatedAt) && isNumber(v.nodeCount) && isNumber(v.docVersion)

const isCheckpointMeta = (v: unknown): v is CheckpointMeta =>
  isRecord(v) && isString(v.id) && isString(v.sceneId) && isString(v.label) && isString(v.createdAt)

/** 只看文档的版本号和节点数，不做完整加载。读不出来就当 v0、0 个节点——真正打开时再报错。 */
function peekDocument(text: string | null): { docVersion: number; nodeCount: number } {
  let value: unknown
  try {
    value = JSON.parse(text ?? '')
  } catch {
    return { docVersion: 0, nodeCount: 0 }
  }
  if (!isRecord(value)) return { docVersion: 0, nodeCount: 0 }
  const { version, nodes } = value
  return {
    docVersion: isNumber(version) ? version : 0,
    nodeCount: Array.isArray(nodes) ? nodes.length : isRecord(nodes) ? Object.keys(nodes).length : 0,
  }
}

export function createSceneStorage(
  kv: KeyValueStore,
  options: {
    now?: () => string
    newId?: (kind: 'scene' | 'checkpoint') => string
    maxCheckpointsPerScene?: number
  } = {},
) {
  const now = options.now ?? (() => new Date().toISOString())
  const newId = options.newId ?? ((kind: 'scene' | 'checkpoint') => generateId(kind))
  const maxCheckpoints = options.maxCheckpointsPerScene ?? 10

  /** 存下来的索引。坏了、丢了、某条记录缺字段，都只是「少几条记录」，不会让调用方崩。 */
  const readStoredIndex = (): Partial<SceneIndex> => {
    const raw = kv.getItem(INDEX_KEY)
    if (raw === null) return {}
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return {}
    }
    if (!isRecord(value)) return {}
    return {
      scenes: Array.isArray(value.scenes) ? value.scenes.filter(isSceneMeta) : [],
      checkpoints: Array.isArray(value.checkpoints) ? value.checkpoints.filter(isCheckpointMeta) : [],
      currentSceneId: isString(value.currentSceneId) ? value.currentSceneId : null,
    }
  }

  /**
   * 索引是缓存，存储里实际存在的键才是真相：
   * 索引记录了的沿用记录；没记录的（上次写完文档没写成索引、索引坏了）从文档本身重建；
   * 记录了但文档已经不在的丢掉。
   */
  const readIndex = (): SceneIndex => {
    const stored = readStoredIndex()
    const keys = kv.keys()

    const knownScenes = new Map((stored.scenes ?? []).map((s) => [s.id, s]))
    const scenes: SceneMeta[] = []
    for (const key of keys) {
      if (!key.startsWith(SCENE_PREFIX)) continue
      const id = key.slice(SCENE_PREFIX.length)
      scenes.push(knownScenes.get(id) ?? { id, name: id, createdAt: '', updatedAt: '', ...peekDocument(kv.getItem(key)) })
    }
    const sceneIds = new Set(scenes.map((s) => s.id))

    const present = new Set(keys.filter((k) => k.startsWith(CHECKPOINT_PREFIX)))
    const listed = new Set<string>()
    const recorded: CheckpointMeta[] = []
    for (const c of stored.checkpoints ?? []) {
      const key = checkpointKey(c.sceneId, c.id)
      if (!present.has(key) || listed.has(key)) continue
      listed.add(key)
      recorded.push(c)
    }
    const orphans: CheckpointMeta[] = []
    for (const key of present) {
      if (listed.has(key)) continue
      const rest = key.slice(CHECKPOINT_PREFIX.length)
      const cut = rest.indexOf(':')
      if (cut <= 0) continue
      orphans.push({ sceneId: rest.slice(0, cut), id: rest.slice(cut + 1), label: '', createdAt: '' })
    }
    // 旧的在前，修剪时从前面删；来历不明的孤儿当作最旧。场景已经不在的存档点不列出来。
    const checkpoints = [...orphans, ...recorded].filter((c) => sceneIds.has(c.sceneId))

    const current = stored.currentSceneId ?? null
    return { scenes, checkpoints, currentSceneId: current !== null && sceneIds.has(current) ? current : null }
  }

  const writeIndex = (index: SceneIndex) => kv.setItem(INDEX_KEY, JSON.stringify(index))

  const writeDoc = (key: string, snapshot: SceneSnapshot) => kv.setItem(key, JSON.stringify(toSceneDocument(snapshot)))

  const loadKey = (key: string): SceneLoadResult | null => {
    const text = kv.getItem(key)
    return text === null ? null : parseSceneDocument(text)
  }

  const requireScene = (index: SceneIndex, sceneId: string): SceneMeta => {
    const meta = index.scenes.find((s) => s.id === sceneId)
    if (!meta) throw new Error(`场景 ${sceneId} 不存在`)
    return meta
  }

  return {
    list: (): SceneMeta[] => [...readIndex().scenes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

    create(name: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const t = now()
      const meta: SceneMeta = {
        id: newId('scene'),
        name,
        createdAt: t,
        updatedAt: t,
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      // 先写文档，再写索引：配额满时挂的是大的那个，索引保持旧值、仍然自洽。
      writeDoc(sceneKey(meta.id), snapshot)
      writeIndex({ ...index, scenes: [...index.scenes, meta] })
      return meta
    },

    save(sceneId: string, snapshot: SceneSnapshot): SceneMeta {
      const index = readIndex()
      const prev = requireScene(index, sceneId)
      // 降级保护看两处：索引的记录，和文档本身（新版本写完文档、没写成索引时，只有文档知道）。
      const stored = Math.max(prev.docVersion, peekDocument(kv.getItem(sceneKey(sceneId))).docVersion)
      if (stored > CURRENT_SCENE_VERSION) throw new SceneTooNewError(sceneId, stored)

      writeDoc(sceneKey(sceneId), snapshot)
      const meta: SceneMeta = {
        ...prev,
        updatedAt: now(),
        nodeCount: Object.keys(snapshot.nodes).length,
        docVersion: CURRENT_SCENE_VERSION,
      }
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === sceneId ? meta : s)) })
      return meta
    },

    /** null = 没有这个场景。 */
    load: (sceneId: string): SceneLoadResult | null => loadKey(sceneKey(sceneId)),

    remove(sceneId: string): void {
      kv.removeItem(sceneKey(sceneId))
      const prefix = `${CHECKPOINT_PREFIX}${sceneId}:`
      for (const key of kv.keys()) if (key.startsWith(prefix)) kv.removeItem(key)
      // 这时文档已经不在：它的记录、它的存档点、指向它的 currentSceneId 都会在读的时候被滤掉。
      writeIndex(readIndex())
    },

    rename(sceneId: string, name: string): void {
      const index = readIndex()
      requireScene(index, sceneId)
      writeIndex({ ...index, scenes: index.scenes.map((s) => (s.id === sceneId ? { ...s, name } : s)) })
    },

    checkpoint(sceneId: string, label: string, snapshot: SceneSnapshot): CheckpointMeta {
      const index = readIndex()
      requireScene(index, sceneId)
      const meta: CheckpointMeta = { id: newId('checkpoint'), sceneId, label, createdAt: now() }
      writeDoc(checkpointKey(sceneId, meta.id), snapshot)

      const mine = [...index.checkpoints.filter((c) => c.sceneId === sceneId), meta]
      const doomed = new Set(mine.slice(0, Math.max(0, mine.length - maxCheckpoints)))
      for (const c of doomed) kv.removeItem(checkpointKey(c.sceneId, c.id))
      writeIndex({ ...index, checkpoints: [...index.checkpoints, meta].filter((c) => !doomed.has(c)) })
      return meta
    },

    listCheckpoints: (sceneId: string): CheckpointMeta[] =>
      readIndex().checkpoints.filter((c) => c.sceneId === sceneId),

    /** null = 没有这个存档点。 */
    loadCheckpoint: (sceneId: string, checkpointId: string): SceneLoadResult | null =>
      loadKey(checkpointKey(sceneId, checkpointId)),

    currentSceneId: (): string | null => readIndex().currentSceneId,

    setCurrentSceneId(sceneId: string | null): void {
      const index = readIndex()
      if (sceneId !== null) requireScene(index, sceneId)
      writeIndex({ ...index, currentSceneId: sceneId })
    },
  }
}

export type SceneStorage = ReturnType<typeof createSceneStorage>
```

**`src/core/persistence/scene-storage.test.ts` · 新建**

```ts
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
```

### 08 · `src/core/store/use-scene.ts` · 改两处 —— 写入边界（B4，Q1）

**08a · 在 `mergeNodePath` 下面新增 `validateMerged`。** `mergeNodePath` 本身不动，它现在长这样：

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
    // 用 hasOwn 不用 in：constructor 之类的名字在原型链上，in 会漏判。
    const stripped = Object.keys(merged).filter((k) => !Object.hasOwn(result.data, k))
    if (stripped.length > 0) {
        throw new Error(`[scene] updateNode: ${prev.type} 没有字段 ${stripped.join(', ')}`)
    }
    return result.data
}
```

**08b · `updateNode` 开头：先校验、再写。** 把这一段：

```ts
                set((s) => {
                    const prev = s.nodes[id]
                    if (!prev) return s
                    return { nodes: { ...s.nodes, [id]: mergeNodePath(prev, patch) } }
                })
```

换成：

```ts
                const prev = get().nodes[id]
                if (!prev) return
                // 校验通过才写：抛错时 store 一个字节都没动。
                const validated = validateMerged(prev, mergeNodePath(prev, patch))
                set((s) => ({ nodes: { ...s.nodes, [id]: validated } }))
```

`updateNode` 里 `const next = get().nodes[id]` 往下的脏传播不变。

**08c · `src/core/store/use-scene.test.ts` 末尾追加**（复用文件里已有的 `reset` / `addWall` / `nodeAt`；`addLevel` 原来只定义在另一个 `describe` 里，所以这里自带一个）：

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

  it('原型链上的名字（constructor）也算多余字段', () => {
    const id = addWall()
    expect(() => useScene.getState().updateNode(id, { constructor: 1 } as never)).toThrow(/constructor/)
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
| `pnpm verify` | **全绿：20 passed (20) · 265 passed (265)** |
| 打开页面，画几堵墙 | **和敲之前完全一样**。刷新仍然清空——`main.tsx` 还没接存档，那是 app 批的事 |
| 拖一堵墙、拖一个端点球，松手 | 行为不变，**控制台没有 `[scene] updateNode` 报错**。`updateNode` 只有这两个调用点（`move-tool.tsx:45`、`endpoint-handles.tsx:117`），都只写 `start` / `end`，按代码推是合法的——**未在浏览器验证** |
| 控制台把一层的层高改成 0（片段见下） | **抛错** `[scene] updateNode: level_… 改完不是合法的 level：…`，画面不变 |

```js
// 浏览器控制台（Vite 开发服务器下）
const { useScene } = await import('/src/core/store/use-scene.ts')
const level = Object.values(useScene.getState().nodes).find((n) => n.type === 'level')
useScene.getState().updateNode(level.id, { height: 0 })   // 应该抛错
```

### 变异测试（把实现故意改错，确认测试会红）

| 改错成 | 结果 |
|---|---|
| v0→v1 不改楼板 0.05 | 3 failed | 262 passed (265) |
| v0→v1 去掉「平」判据 | 1 failed | 264 passed (265) |
| v0→v1 悄悄吞掉没 id / 重复 id 的节点 | 1 failed | 264 passed (265) |
| v0→v1 层高不显式写 | 2 failed | 263 passed (265) |
| v0→v1 不收养根下节点 | 7 failed | 258 passed (265) |
| 按数值嗅探：所有版本都改 0.05 | 2 failed | 263 passed (265) |
| normalize 让 parse 替缺 id 的节点发明 id | 3 failed | 262 passed (265) |
| normalize 不重建 children | 7 failed | 258 passed (265) |
| normalize 信任存档的 rootNodeIds | 1 failed | 264 passed (265) |
| normalize 放过环 | 1 failed | 264 passed (265) |
| normalize 放过缺父 | 2 failed | 263 passed (265) |
| normalize 父被丢时子不跟着丢 | 3 failed | 262 passed (265) |
| 信封：too-new 当成能读 | 2 failed | 263 passed (265) |
| 信封：不认 v0 | 39 failed | 226 passed (265) |
| 迁移链按数组下标找 | 1 failed | 264 passed (265) |
| replaceScene 不清历史 | 2 failed | 263 passed (265) |
| replaceScene 不换脏集 | 1 failed | 264 passed (265) |
| 存储 不做降级保护 | 2 failed | 263 passed (265) |
| 存储 降级保护只看索引 | 1 failed | 264 passed (265) |
| 存储 save 先写索引后写文档 | 1 failed | 264 passed (265) |
| 存储 孤儿文档不列出 | 4 failed | 261 passed (265) |
| 存储 失效记录照列 | 2 failed | 263 passed (265) |
| 存储 currentSceneId 不校验 | 2 failed | 263 passed (265) |
| 存储 缺字段的记录不过滤 | 1 failed | 264 passed (265) |
| 存储 删场景不按前缀删存档点 | 2 failed | 263 passed (265) |
| 存储 修剪不删文档 | 1 failed | 264 passed (265) |
| 存储 不检查场景存在 | 1 failed | 264 passed (265) |
| B4 不查多余字段 | 2 failed | 263 passed (265) |
| B4 用 in 不用 hasOwn | 1 failed | 264 passed (265) |
| B4 值不合法也放行 | 2 failed | 263 passed (265) |
| B4 不查 type / id | 1 failed | 264 passed (265) |
| B4 完全不校验 | 5 failed | 260 passed (265) |

**32 / 32 被抓**，跑完文件逐字节恢复（`restored: True`）。

### 下一步

1. 敲完跑 `pnpm verify`，再 **`/review`**。
2. **`/gate viewer`**：M9 的 viewer 层没有改动（`NodeRenderer` 找不到节点返回 `null`，`GeometrySystem` 对不存在的脏 id 直接 `clearDirty`），这一关只确认「本层无改动」。
3. **`/gate app`** 之前，先定前置 B 的 **B2**（导入是新建场景还是覆盖）和 **B3**（要不要误删护栏）。
