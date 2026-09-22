# M9 §07 全码

**验证**：`tsc` ✅ · `eslint` ✅ · `vitest` ✅ **20 passed (20) · 265 passed (265)** · `vite build` ✅ · 变异测试 **32 / 32 被抓**。
在 2026-09-17 你的 `src/` 的全新拷贝上，**按下面的顺序一步一步做了你要做的每个动作，每一步都跑了 `check-types` / `lint` / `vitest`**，表里的数字全是实测。代码块由脚本从跑过的文件原样导出，不是手抄。

**未验证**：浏览器里的渲染与交互（本批是纯 core；但第 08 步改了 `updateNode`，拖墙 / 拖端点球会走到它，见末尾「肉眼」）；真实 `localStorage`（存储层只用内存 KV 测过）。

> 设计在 `m9-persistence.html`（§02 机制 · §04 建造顺序）。按 **core → viewer → app** 三批放出，每批先过 `/gate`（D29）。每批敲完：`pnpm verify` → `/review`。
>
> **上面这组数字是 core 批的。**viewer 批：M9 无改动，`/gate viewer` 2026-09-21 只做确认（`grep -rn "persistence|replaceScene|SceneDocument" src/viewer` 为空；脏 id 找不到节点时 `geometry-system.tsx:35-38` 直接 `clearDirty`）。**app 批见本文件末尾**，它自带一组验证范围（21 文件 / 287 用例 · 变异 16/16）。

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

---

## app 批（2026-09-21）

**验证**：`tsc` ✅ · `eslint` ✅ · `vitest` **21 文件 / 287 用例** ✅ · `vite build` ✅ · 变异测试 **16 / 16 被抓**（全部在沙箱副本上跑的，2026-09-21）
**未验证**：**浏览器里的渲染与交互一条都没跑过** —— 场景面板、导入/导出的系统对话框、Ctrl+S、`pagehide`、隐私模式退化、双击重命名时的快捷键屏蔽，全部靠 §05 B 的肉眼验收。

**闸门记录**（`/gate app`，2026-09-21）：三问全过。Q3 第一次答漏了 `autosave.stop()` / `startAutosave()` 那两端 —— 规矩记住了，但它在调用链上的位置还没长进去。这一批的红测试就是照着这个缺口选的。

**方案变更（约定 6）：原计划「你先自己写红测试，我再放码」没走通** —— 缺的是这类测试的搭法（假 store / 假时钟 / `EventTarget`），不是断言。改成：**测试和实现一起给，但测试排在前面**，你先敲测试、跑红、看清它为什么红，再敲实现看它转绿。第 09、13 两步敲完都必须是红的，**红的样子也写在下面了**；如果你那里红成别的样子，先停下来对一下。

### 前置 B 的最后两条已定（2026-09-21）

| | 定的 | 这一批里体现在哪 |
|---|---|---|
| **B2** 导入 | **新建场景**，当前场景不动 | `importSceneText`：`storage.create` 之后才 `adoptScene`；测试「导入 M1 语料」断言原场景的文档字节不变 |
| **B3** 误删护栏 | **不抄**，靠 Ctrl+S 存档点 | 没有 `isSuspiciousNodeDrop`。代价写进 §06 债表 |

B1 / B4 / B5 在 core 批里已经按推荐实现并跑绿，等于事实上拍板。**B1–B5 五条连同 D31 一起补进 `DECISIONS.md`**（见本批末尾）。

### 和设计文档的差（约定 6）

| # | 原方案（§02 / §04） | 行不通 / 不够的地方 | 改成 |
|---|---|---|---|
| 1 | `localStorageKV(storage?: Storage)`，隐私模式在默认参数那一处兜住、退化成内存 KV | 一个**悄悄换实现**的函数没法告诉任何人「本次不会保存」，而 §04 第 14 步要求状态栏显示它 | 拆成三个导出：`localStorageKV(storage)` · `memoryKV()` · `detectLocalStorage()`。**决定权回到 `main.tsx`**：探测失败就用内存 KV 并把状态设成 `disabled` |
| 2 | `PersistenceState` 四个字段 | 面板读的是 `storage.list()` —— **storage 是文件，不是 store，写完不会重渲染** | 加 `revision`（写盘后 +1，面板订阅它）和 `currentSceneName`（状态栏省一次 `list()`） |
| 3 | §04 第 12 步列了 8 个函数 | 面板要「存档点点一下恢复」；测试要能重置模块级的会话句柄 | 加 `restoreCheckpoint()` 和 `stopSession()` |
| 4 | §02 J 伪代码：`openScene` 第一句是 `autosave?.stop()` | 和同一段里「**读失败什么都不动**」自相矛盾 —— 一旦 stop 了，当前场景的自动保存就已经死了 | `storage.load()` 排在 `stop()` 前面。load 是纯读，两条都满足。**变异测试「照伪代码写」那一条会红** |
| 5 | §02 H 的兜底：「一个节点都没留下、却丢了若干个 → 拒绝」 | 判据写成「`nodes` 是空的」**永远不成立** —— v0 → v1 自己会造出 site / building / level。沙箱第一版就是这么写的，测试当场红 | 判据改成「**文件里的东西一个都没留下**（只剩迁移造的三种容器）」 |
| 6 | （无）`startAutosave` 里我原本加了个 `stopped` 标志位 | 有了它，「忘记退订」这个 bug 就不可观测了 —— 变异测试原本抓不到 | **删掉标志位**，退订是唯一机制。少一行代码，多抓一个 bug |
| 7 | `App()` 无参 | `storage` 实例在 `main.tsx` 建，Ctrl+S 和面板都要它 | `App({ storage })`，`main.tsx` 传进去 |
| 8 | §02 J 只写了「没有任何场景」和「有 currentSceneId」 | 索引坏掉重建时 `currentSceneId` 会是 `null`，而磁盘上明明有场景 | `bootScenes` 多一条：`currentSceneId() ?? list()[0]?.id ?? null` |

### 敲的顺序，以及每一步之后应该看到什么

| 步 | 文件 | 敲完跑 `pnpm test` 应该看到 |
|---|---|---|
| 09 | `app/persistence/autosave.test.ts` · 新建 | **红**：`startAutosave` 只有签名没有实现（你 09-21 敲的那个空壳），`check-types` 报 TS2391 |
| 10 | `app/persistence/autosave.ts` · 填实现 | 绿，**+9 用例**（20 文件 / 273） |
| 11 | `app/persistence/local-storage-kv.ts` · 新建 | 绿，用例数不变 |
| 12 | `app/store/use-persistence.ts` · 新建 | 绿，用例数不变 |
| 13 | `app/persistence/scene-session.test.ts` · 新建 | **红**：`./scene-session` 不存在 |
| 14 | `app/persistence/scene-session.ts` · 新建 | 绿，**+14 用例**（21 文件 / 287） |
| 15 | `app/persistence/file-io.ts` · 新建 | 绿（本文件无测试） |
| 16 | `app/components/scene-panel.tsx` · 新建 | 绿 |
| 17 | `app/app.tsx` · 改四处 | 绿 |
| 18 | `main.tsx` · 改写 | 绿 —— **到这里刷新才不再清空** |

---

### 09 · `src/app/persistence/autosave.test.ts` · 新建

先敲它。四条不变量在闸门里讲过：两条顺序 · 引用没变不写 · 写失败不丢改动。加上防抖、`pagehide`、停掉之后不再写，一共 9 条。

**假 store 是这一整个文件的关键**：autosave 只用到 store 的两件事 —— `getState()` 和 `subscribe(state, prev)`。所以测试里不需要真的 `useScene`，二十行就能造一个，而且能精确控制「通知了但引用没变」这种真 store 不好构造的情况。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { asNodeId } from "../../core/schema/types"
import type { SceneSnapshot } from "../../core/store/history-control"
import { startAutosave, type AutosaveStatus } from "./autosave"

/** 假 store：只有 autosave 用得到的两件事 —— getState 和 subscribe(state, prev)。 */
function fakeStore(initial: SceneSnapshot) {
    let state = initial
    const listeners = new Set<(s: SceneSnapshot, prev: SceneSnapshot) => void>()
    return {
        getState: () => state,
        subscribe(listener: (s: SceneSnapshot, prev: SceneSnapshot) => void) {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
        /** 一次真改动：换引用 + 通知。replaceScene 和 addNode 在 autosave 眼里都长这样。 */
        setScene(next: SceneSnapshot) {
            const prev = state
            state = next
            for (const listener of listeners) listener(state, prev)
        },
        /** 通知了，但 nodes / rootNodeIds 是同一个引用 —— 拖拽期间就是这样。 */
        notifyWithoutChange() {
            for (const listener of listeners) listener(state, state)
        },
    }
}

/** 用 rootNodeIds 给场景贴个标签，断言里一眼看出写进去的是哪一份。 */
const scene = (tag: string): SceneSnapshot => ({ nodes: {}, rootNodeIds: [asNodeId(tag)] })
const tagOf = (s: SceneSnapshot) => s.rootNodeIds[0]

describe('startAutosave', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('启动顺序对：先读档、后 startAutosave → 一次都不写', () => {
        const store = fakeStore(scene('空'))
        store.setScene(scene('读回来的'))                     // 读档发生在订阅之前

        const writes: SceneSnapshot[] = []
        startAutosave({ store, write: (s) => writes.push(s) })
        vi.advanceTimersByTime(1000)

        expect(writes).toHaveLength(0)
    })

    it('启动顺序反了：先 startAutosave、后读档 → 把刚读回来的东西又写一遍', () => {
        const store = fakeStore(scene('空'))

        const writes: SceneSnapshot[] = []
        startAutosave({ store, write: (s) => writes.push(s) })
        store.setScene(scene('读回来的'))                     // 读档发生在订阅之后
        vi.advanceTimersByTime(1000)

        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('读回来的')
    })

    it('切场景顺序对：stop() 先 flush，写进去的是【旧】场景', () => {
        const store = fakeStore(scene('旧'))
        const writes: SceneSnapshot[] = []
        const autosave = startAutosave({ store, write: (s) => writes.push(s) })

        store.setScene(scene('旧·改过'))                      // 旧场景上一笔还没落盘的改动
        autosave.stop()                                       // ② 先 stop
        store.setScene(scene('新'))                           // 再 replaceScene

        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('旧·改过')
    })

    it('切场景顺序反了：stop() 的 flush 读到的已经是【新】场景 —— 新房子写进旧 id', () => {
        const store = fakeStore(scene('旧'))
        const writes: SceneSnapshot[] = []
        const autosave = startAutosave({ store, write: (s) => writes.push(s) })

        store.setScene(scene('旧·改过'))
        store.setScene(scene('新'))                           // 先 replaceScene
        autosave.stop()                                       // 再 stop

        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('新')                  // ← 这就是那个静默覆盖
    })

    it('引用没变不写：通知了，但 nodes / rootNodeIds 是同一个引用（拖拽期间）', () => {
        const store = fakeStore(scene('场景'))
        const writes: SceneSnapshot[] = []
        const autosave = startAutosave({ store, write: (s) => writes.push(s) })

        store.notifyWithoutChange()
        store.notifyWithoutChange()
        vi.advanceTimersByTime(1000)
        autosave.flush()

        expect(writes).toHaveLength(0)
    })

    it('防抖合并：500ms 内三次改动 → 只写一次，写的是最后一次', () => {
        const store = fakeStore(scene('0'))
        const writes: SceneSnapshot[] = []
        startAutosave({ store, write: (s) => writes.push(s) })

        store.setScene(scene('1'))
        vi.advanceTimersByTime(200)
        store.setScene(scene('2'))
        vi.advanceTimersByTime(200)
        store.setScene(scene('3'))
        vi.advanceTimersByTime(499)
        expect(writes).toHaveLength(0)                        // 还没到点

        vi.advanceTimersByTime(1)
        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('3')
    })

    it('pagehide 立刻 flush：刷新得快，最后一次改动不丢', () => {
        const store = fakeStore(scene('0'))
        const writes: SceneSnapshot[] = []
        const exitTarget = new EventTarget()
        startAutosave({ store, write: (s) => writes.push(s), exitTarget })

        store.setScene(scene('1'))
        exitTarget.dispatchEvent(new Event('pagehide'))        // 没有 advanceTimers

        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('1')
    })

    it('写失败：onStatus 报 error，改动仍然是脏的，下一次 flush 重试', () => {
        const store = fakeStore(scene('0'))
        const writes: SceneSnapshot[] = []
        const status: AutosaveStatus[] = []
        let failing = true
        const autosave = startAutosave({
            store,
            write: (s) => {
                if (failing) throw new Error('配额满了')
                writes.push(s)
            },
            onStatus: (s) => status.push(s),
        })

        store.setScene(scene('1'))
        vi.advanceTimersByTime(500)
        expect(writes).toHaveLength(0)
        expect(status).toEqual(['pending', 'error'])

        failing = false
        autosave.flush()                                       // 没有新改动，但它还脏着 → 重试
        expect(writes).toHaveLength(1)
        expect(tagOf(writes[0]!)).toBe('1')
        expect(status.at(-1)).toBe('saved')
    })

    it('stop 之后：再改动不写、pagehide 也不写（退订 + 摘监听）', () => {
        const store = fakeStore(scene('0'))
        const writes: SceneSnapshot[] = []
        const exitTarget = new EventTarget()
        const autosave = startAutosave({ store, write: (s) => writes.push(s), exitTarget })

        autosave.stop()
        store.setScene(scene('1'))
        vi.advanceTimersByTime(1000)
        exitTarget.dispatchEvent(new Event('pagehide'))

        expect(writes).toHaveLength(0)
    })
})
```

**现在跑 `pnpm test`。应该红** —— `startAutosave` 那个空壳只有签名，`check-types` 会报 `TS2391: Function implementation is missing`。这一步的意义：**九条断言在实现存在之前就已经定死了**，实现没有机会把它们往自己身上掰。

---

### 10 · `src/app/persistence/autosave.ts` · 填实现（你那个空壳的下半身）

签名你已经敲了，把 body 补上。注意里面**没有** `stopped` 标志位 —— 理由见上面差异表第 6 条。

```ts
import type { SceneSnapshot } from "../../core/store/history-control"

export type AutosaveStatus = 'pending' | 'saved' | 'error'

type AutosaveStore = {
    getState(): SceneSnapshot
    subscribe(listener: (state: SceneSnapshot, prev: SceneSnapshot) => void): () => void
}

type ExitTarget = {
    addEventListener(type: 'pagehide', listener: () => void): void
    removeEventListener(type: 'pagehide', listener: () => void): void
}

/**
 * 自动保存：订阅场景 store，防抖写盘。
 *
 * 两条顺序由【调用方】负责（§02 F），这里只保证自己这半边：
 *   ① 启动：调用方必须先读档、后 startAutosave。反过来，读档那一次 setState
 *      会被下面的订阅当成一次改动，把刚读回来的东西又写一遍。
 *   ② 切场景：调用方必须先 stop()、再 replaceScene、再为新场景 start。
 *      反过来，stop() 里那次 flush 读到的 getState() 已经是【新】场景，
 *      而 write 还绑着【旧】场景的 id —— 旧文档被新房子覆盖，不报错。
 */
export function startAutosave(options: {
    store: AutosaveStore
    write: (snapshot: SceneSnapshot) => void
    debounceMs?: number
    exitTarget?: ExitTarget
    onStatus?: (status: AutosaveStatus, error?: unknown) => void
}): { flush(): void; stop(): void } {
    const debounceMs = options.debounceMs ?? 500
    const exitTarget = options.exitTarget ?? (typeof window === 'undefined' ? null : window)

    let dirty = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
        if (timer !== null) clearTimeout(timer)
        timer = null
    }

    const flush = () => {
        clearTimer()
        if (!dirty) return
        try {
            options.write(options.store.getState())
            // 先 write 成功、再清脏。反过来写失败就把这笔改动丢了（m6-prep.ts:85-87 就是这样吞的）。
            dirty = false
            options.onStatus?.('saved')
        } catch (error) {
            options.onStatus?.('error', error)
        }
    }

    const unsubscribe = options.store.subscribe((state, prev) => {
        // 只认这两个引用。脏集是就地改的、live 覆盖不碰 store —— 拖拽期间一次都不触发。
        if (state.nodes === prev.nodes && state.rootNodeIds === prev.rootNodeIds) return
        dirty = true
        options.onStatus?.('pending')
        clearTimer()
        timer = setTimeout(flush, debounceMs)
    })

    const onExit = () => flush()
    exitTarget?.addEventListener('pagehide', onExit)

    return {
        flush,
        // 退订【之后】不该再有任何写盘。没有 stopped 标志位兜底：退订就是唯一的机制，
        // 加了标志位，"忘记退订"这个错就变得看不见了（变异测试原本抓不到它）。
        stop() {
            flush()
            exitTarget?.removeEventListener('pagehide', onExit)
            unsubscribe()
        },
    }
}
```

**`store` 直接传 `useScene`**（第 14 步里就是这么传的）：方法参数双变，`SceneState` 结构上满足 `AutosaveStore`，类型对得上。

跑 `pnpm test`：**9 条全绿**（20 文件 / 273 用例）。

---

### 11 · `src/app/persistence/local-storage-kv.ts` · 新建

真正碰浏览器的那一层。core 只认 `KeyValueStore` 接口（B5），实现住 app —— 这就是 core 那一层能在 node 里跑测试的原因。

```ts
import type { KeyValueStore } from "../../core/persistence/scene-storage"

/**
 * 真正碰浏览器的那一层。core 只认 KeyValueStore 接口（前置 B5），实现住在 app。
 *
 * 方法内部【不要】try/catch：配额满的异常要一路冒到 startAutosave 的 onStatus('error')，
 * 吞在这里就回到 m6-prep 那样 —— 盘写不进去，而用户永远不知道。
 */
export function localStorageKV(storage: Storage): KeyValueStore {
    return {
        getItem: (key) => storage.getItem(key),
        setItem: (key, value) => { storage.setItem(key, value) },
        removeItem: (key) => { storage.removeItem(key) },
        keys: () => {
            const out: string[] = []
            for (let i = 0; i < storage.length; i += 1) {
                const key = storage.key(i)
                if (key !== null) out.push(key)
            }
            return out
        },
    }
}

/** 退化用：这一次会话记得住，刷新就没了。隐私模式下的兜底，也是测试用的 KV。 */
export function memoryKV(): KeyValueStore {
    const map = new Map<string, string>()
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => { map.set(key, value) },
        removeItem: (key) => { map.delete(key) },
        keys: () => [...map.keys()],
    }
}

/**
 * 隐私模式下连【访问】window.localStorage 都会抛，所以探测只能 try/catch，
 * 而且要真的写一次 —— Safari 无痕里 localStorage 存在，setItem 才抛。
 * 返回 null 表示这一次会话存不了盘，由调用方（main.tsx）决定怎么告诉用户。
 */
export function detectLocalStorage(): Storage | null {
    try {
        const probe = '__r3f-arch-probe__'
        window.localStorage.setItem(probe, '1')
        window.localStorage.removeItem(probe)
        return window.localStorage
    } catch {
        return null
    }
}
```

---

### 12 · `src/app/store/use-persistence.ts` · 新建

纯 zustand，只给 UI 读。**这里没有 storage 实例，也没有 autosave 句柄** —— 它们不是状态，是"活着的东西"，住第 14 步那个模块。

```ts
import { create } from "zustand"
import type { LoadReport } from "../../core/persistence/normalize-snapshot"
import type { AutosaveStatus } from "../persistence/autosave"

export type SaveStatus = AutosaveStatus | 'idle' | 'disabled'

type PersistenceState = {
    currentSceneId: string | null
    currentSceneName: string | null
    saveStatus: SaveStatus
    lastReport: { fromVersion: number; report: LoadReport } | null
    lastError: string | null
    /** 存储是文件不是状态：面板每次读 storage.list()，靠这个计数器知道该重读了。 */
    revision: number

    setCurrentScene: (id: string | null, name: string | null) => void
    setSaveStatus: (status: SaveStatus) => void
    setReport: (report: { fromVersion: number; report: LoadReport } | null) => void
    setError: (message: string | null) => void
    bumpRevision: () => void
}

export const usePersistence = create<PersistenceState>((set) => ({
    currentSceneId: null,
    currentSceneName: null,
    saveStatus: 'idle',
    lastReport: null,
    lastError: null,
    revision: 0,

    setCurrentScene: (currentSceneId, currentSceneName) => set({ currentSceneId, currentSceneName }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setReport: (lastReport) => set({ lastReport }),
    setError: (lastError) => set({ lastError }),
    bumpRevision: () => set((s) => ({ revision: s.revision + 1 })),
}))
```

---

### 13 · `src/app/persistence/scene-session.test.ts` · 新建

14 条。这一批真正的护栏在这里 —— 闸门 Q3 漏掉的那两端（`stop()` / `startAutosave()`）每一条都被钉住了。

**三个值得单独说的技巧：**

1. **`memoryKV()` 就是第二个实现**：core 的 `createSceneStorage` 只认接口，所以整个存储链路能在 node 里跑，一行 DOM 都不需要。
2. **探针空格**（第 3 条）：读档之后往磁盘上那份文档末尾加一个空格，什么都不改就退出，再断言空格还在 —— 只要被写过一次，`JSON.stringify` 的结果里就没有它了。**这是"没有发生写"唯一可靠的断言方式**，因为写回去的内容和原内容一模一样，比内容看不出来。
3. **`freshSession()` 模拟"关掉页面再打开"**：清掉模块级会话句柄 + 清空 store + 清编辑器状态，但**不动 kv** —— 磁盘留着，这才是"下次启动"。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { M1_FLAT_SCENE } from "../../core/persistence/__fixtures__/legacy-scenes"
import { createSceneStorage, type KeyValueStore, type SceneStorage } from "../../core/persistence/scene-storage"
import type { AnyNode } from "../../core/schema/types"
import { resetSceneHistoryPause } from "../../core/store/history-control"
import { replaceScene } from "../../core/store/replace-scene"
import { useScene } from "../../core/store/use-scene"
import { useEditor } from "../store/use-editor"
import { usePersistence } from "../store/use-persistence"
import { memoryKV } from "./local-storage-kv"
import {
    bootScenes, checkpointNow, deleteScene, exportCurrentScene,
    importSceneText, newScene, openScene, restoreCheckpoint, stopSession,
} from "./scene-session"

const SCENE_PREFIX = 'r3f-arch:scene:'

const freshSession = () => {
    stopSession()
    resetSceneHistoryPause(useScene)
    replaceScene({ nodes: {}, rootNodeIds: [] })
    useEditor.setState({ selectId: null, currentLevelId: null })
    usePersistence.setState({ currentSceneId: null, currentSceneName: null, saveStatus: 'idle', lastReport: null, lastError: null })
}

const nodesOf = (): AnyNode[] => Object.values(useScene.getState().nodes)
const typesInStore = () => new Set(nodesOf().map((n) => n.type))
const wallCount = () => nodesOf().filter((n) => n.type === 'wall').length

const addWall = () => useScene.getState().addNode({
    type: 'wall',
    parentId: useEditor.getState().currentLevelId,
    start: [0, 0],
    end: [1, 0],
})

const sceneKeys = (kv: KeyValueStore) => kv.keys().filter((k) => k.startsWith(SCENE_PREFIX))
const docTextOf = (kv: KeyValueStore, sceneId: string) => kv.getItem(`${SCENE_PREFIX}${sceneId}`)
const docWallCount = (kv: KeyValueStore, sceneId: string) => {
    const nodes = JSON.parse(docTextOf(kv, sceneId) ?? '{"nodes":[]}').nodes as { type: string }[]
    return nodes.filter((n) => n.type === 'wall').length
}

describe('scene-session', () => {
    let kv: KeyValueStore
    let storage: SceneStorage

    beforeEach(() => {
        vi.useFakeTimers()                       // 防抖用不到：每条断言前都靠 stop() / flush() 同步落盘
        freshSession()
        kv = memoryKV()
        storage = createSceneStorage(kv)
    })
    afterEach(() => {
        stopSession()
        vi.useRealTimers()
    })

    it('冷启动：建出一个带脚手架的场景，并记住它是当前场景', () => {
        bootScenes(storage)

        expect(storage.list()).toHaveLength(1)
        expect(typesInStore()).toEqual(new Set(['site', 'building', 'level']))
        expect(storage.currentSceneId()).toBe(storage.list()[0]!.id)
        expect(useEditor.getState().currentLevelId).not.toBeNull()
        expect(usePersistence.getState().currentSceneId).toBe(storage.currentSceneId())
    })

    it('再启动：读回同一个场景，不会多建一个', () => {
        bootScenes(storage)
        const sceneId = storage.currentSceneId()!
        addWall()
        stopSession()                            // 模拟关页面：stop 里那次 flush 落盘

        freshSession()                           // 新的一次会话：store 是空的
        expect(wallCount()).toBe(0)

        bootScenes(storage)
        expect(storage.list()).toHaveLength(1)
        expect(storage.currentSceneId()).toBe(sceneId)
        expect(wallCount()).toBe(1)
    })

    it('读档之后自动保存是干净的：什么都没改就退出，不会把刚读回来的东西再写一遍', () => {
        bootScenes(storage)
        const sceneId = storage.currentSceneId()!
        stopSession()

        freshSession()
        bootScenes(storage)                      // ← 读档

        // 在文档末尾放一个探针空格：只要被写过一次，JSON.stringify 的结果就没有它了。
        const key = `${SCENE_PREFIX}${sceneId}`
        kv.setItem(key, `${kv.getItem(key)} `)

        stopSession()                            // 没有任何编辑就退出

        expect(kv.getItem(key)!.endsWith(' ')).toBe(true)
    })

    it('打开一个坏场景：当前场景原样继续，自动保存还绑在当前场景上', () => {
        bootScenes(storage)
        const good = storage.currentSceneId()!
        const bad = newScene(storage, '坏的')
        openScene(storage, good)                 // 切回好的那个
        kv.setItem(`${SCENE_PREFIX}${bad.id}`, '{ 这不是 JSON')

        const result = openScene(storage, bad.id)

        expect(result?.ok).toBe(false)
        expect(storage.currentSceneId()).toBe(good)
        expect(usePersistence.getState().lastError).not.toBeNull()

        addWall()
        stopSession()
        expect(docWallCount(kv, good)).toBe(1)   // 改动仍然落在当前场景上
    })

    it('切场景清掉编辑器状态：选中不会留在上一个场景的节点 id 上', () => {
        bootScenes(storage)
        const first = storage.currentSceneId()!
        const wallId = addWall()
        useEditor.getState().select(wallId)

        newScene(storage, '第二个')
        expect(useEditor.getState().selectId).toBeNull()

        useEditor.getState().select(addWall())   // 在第二个场景里选中一堵墙，再切回去
        openScene(storage, first)
        expect(useEditor.getState().selectId).toBeNull()
        expect(useScene.getState().nodes[useEditor.getState().currentLevelId!]).toBeDefined()
    })

    it('打开 too-new 的场景：不覆盖它，另起一个新场景，状态栏说清为什么', () => {
        bootScenes(storage)
        const sceneId = storage.currentSceneId()!
        stopSession()

        // 用"未来版本"的代码存过一次：把文档的 version 改成 99
        const key = `${SCENE_PREFIX}${sceneId}`
        const future = JSON.stringify({ ...JSON.parse(kv.getItem(key)!), version: 99 })
        kv.setItem(key, future)

        freshSession()
        bootScenes(storage)

        expect(storage.currentSceneId()).not.toBe(sceneId)          // 当前场景是新建的那个
        expect(storage.list()).toHaveLength(2)
        expect(usePersistence.getState().lastError).toMatch(/v99/)
        expect(kv.getItem(key)).toBe(future)                         // 那份文档一个字节都没动

        addWall()
        stopSession()                                                // 改动落盘
        expect(kv.getItem(key)).toBe(future)                         // 仍然没动 —— 自动保存没绑在它身上
    })

    it('导入 M1 语料：新建一个场景并切过去，原场景一个字节不变（B2）', () => {
        bootScenes(storage)
        const before = storage.currentSceneId()!
        const beforeDoc = docTextOf(kv, before)

        const result = importSceneText(storage, JSON.stringify(M1_FLAT_SCENE), '导入的')

        expect(result.ok).toBe(true)
        expect(storage.list()).toHaveLength(2)
        expect(storage.currentSceneId()).not.toBe(before)
        expect(docTextOf(kv, before)).toBe(beforeDoc)               // 原场景没被动过
        expect(wallCount()).toBe(3)                                  // M1 语料的三堵墙
        expect(typesInStore()).toEqual(new Set(['site', 'building', 'level', 'wall']))  // v0 → v1 收进了容器
        expect(usePersistence.getState().lastReport?.fromVersion).toBe(0)
    })

    it('导入一个不是场景的 JSON：拒绝，当前场景不动，不多建场景', () => {
        bootScenes(storage)
        const before = storage.currentSceneId()!

        const result = importSceneText(storage, JSON.stringify({ nodes: [{ id: 'x', type: '不是节点' }] }), '垃圾')

        expect(result.ok).toBe(false)
        expect(storage.list()).toHaveLength(1)
        expect(storage.currentSceneId()).toBe(before)
        expect(usePersistence.getState().lastError).toMatch(/不是 r3f-arch/)
    })

    it('切场景：切走之前那笔改动写进【旧】场景，不写进新场景', () => {
        bootScenes(storage)
        const first = storage.currentSceneId()!
        addWall()                                                    // 还挂在防抖里，没落盘

        const second = newScene(storage, '第二个')

        expect(docWallCount(kv, first)).toBe(1)                      // ② stop 先把它写进旧 id
        expect(docWallCount(kv, second.id)).toBe(0)
        expect(wallCount()).toBe(0)                                  // 画面上是新场景
    })

    it('切回去再切过来：两个场景各自记得各自的内容', () => {
        bootScenes(storage)
        const first = storage.currentSceneId()!
        addWall()
        const second = newScene(storage, '第二个')
        addWall()
        addWall()

        openScene(storage, first)
        expect(wallCount()).toBe(1)

        openScene(storage, second.id)
        expect(wallCount()).toBe(2)
    })

    it('删当前场景：先切到别的场景，再删文档', () => {
        bootScenes(storage)
        const first = storage.currentSceneId()!
        const second = newScene(storage, '第二个')

        deleteScene(storage, second.id)

        expect(storage.currentSceneId()).toBe(first)
        expect(sceneKeys(kv)).toHaveLength(1)
        expect(storage.list().map((s) => s.id)).toEqual([first])
    })

    it('删掉最后一个场景：新建一个顶上，不会留下"没有当前场景"的状态', () => {
        bootScenes(storage)
        const only = storage.currentSceneId()!

        deleteScene(storage, only)

        expect(storage.currentSceneId()).not.toBeNull()
        expect(storage.currentSceneId()).not.toBe(only)
        expect(typesInStore()).toEqual(new Set(['site', 'building', 'level']))
    })

    it('导出：文件名带场景名，内容是 store 里【当前】的样子（不是磁盘上那份）', () => {
        bootScenes(storage)
        addWall()                                                    // 只在内存里，没落盘

        const out = exportCurrentScene(storage)!
        const doc = JSON.parse(out.text)

        expect(out.filename).toBe('未命名.r3f-scene.json')
        expect(doc.format).toBe('r3f-arch/scene')
        expect(doc.version).toBe(1)
        expect(doc.nodes.filter((n: { type: string }) => n.type === 'wall')).toHaveLength(1)
    })

    it('存档点：存一份、恢复成一个新场景，当前场景不动', () => {
        bootScenes(storage)
        const sceneId = storage.currentSceneId()!
        addWall()

        const cp = checkpointNow(storage, '一堵墙')!
        expect(storage.listCheckpoints(sceneId)).toHaveLength(1)

        addWall()
        addWall()
        expect(wallCount()).toBe(3)

        restoreCheckpoint(storage, sceneId, cp.id)

        expect(wallCount()).toBe(1)                                  // 回到存档点那一刻
        expect(storage.currentSceneId()).not.toBe(sceneId)           // 恢复走"导入"那条路：新场景
        expect(docWallCount(kv, sceneId)).toBe(3)                    // 原场景留着切走前的三堵
    })
})
```

跑 `pnpm test`：**红**，`./scene-session` 还不存在。

---

### 14 · `src/app/persistence/scene-session.ts` · 新建 —— M9 最危险的一步

整个 M9 里唯一"写反了就真丢数据"的地方。两条顺序写成注释贴在对应行上。

```ts
import { parseSceneDocument, type SceneLoadError, type SceneLoadResult } from "../../core/persistence/load-scene-document"
import { toSceneDocument } from "../../core/persistence/scene-document"
import type { CheckpointMeta, SceneMeta, SceneStorage } from "../../core/persistence/scene-storage"
import type { SceneSnapshot } from "../../core/store/history-control"
import { replaceScene } from "../../core/store/replace-scene"
import { useScene } from "../../core/store/use-scene"
import { ensureScaffold } from "../lib/level/level-actions"
import { useEditor } from "../store/use-editor"
import { usePersistence } from "../store/use-persistence"
import { startAutosave } from "./autosave"

/**
 * 编排层：谁在什么时候读写，读写之前要把谁清掉。
 *
 * 这个模块【有状态】—— 下面这个句柄就是"活着的会话"。core 那一层是无状态的纯函数加一个 kv，
 * 它知道"磁盘上记着哪个场景是当前的"（storage.currentSceneId()），但不知道谁正订阅着 store。
 */
let autosave: { flush(): void; stop(): void } | null = null

const EMPTY: SceneSnapshot = { nodes: {}, rootNodeIds: [] }

const snapshotNow = (): SceneSnapshot => {
    const { nodes, rootNodeIds } = useScene.getState()
    return { nodes, rootNodeIds }
}

export function describeLoadError(error: SceneLoadError): string {
    switch (error.kind) {
        case 'not-json': return '这不是一个 JSON 文件'
        case 'not-a-scene': return '这不是 r3f-arch 的场景文件'
        case 'too-new': return `这个文件是 v${error.version} 存的，比当前代码认识的版本新。换新版代码再打开，别用这份代码覆盖它`
        case 'migration-failed': return `从 v${error.from} 迁移失败：${error.message}`
    }
}

const nameOf = (storage: SceneStorage, sceneId: string): string | null =>
    storage.list().find((s) => s.id === sceneId)?.name ?? null

/** ① 自动保存永远最后启动：读档那一次 setState 必须发生在订阅之前。 */
function startSessionAutosave(storage: SceneStorage, sceneId: string): void {
    autosave = startAutosave({
        store: useScene,
        write: (snapshot) => {
            storage.save(sceneId, snapshot)
            usePersistence.getState().bumpRevision()
        },
        onStatus: (status, error) => {
            usePersistence.getState().setSaveStatus(status)
            if (status === 'error') {
                usePersistence.getState().setError(error instanceof Error ? error.message : String(error))
            }
        },
    })
}

/** ② 切场景第一步：把旧场景挂着的改动写进【旧】id。此刻 store 里还是旧场景。 */
function stopSessionAutosave(): void {
    autosave?.stop()
    autosave = null
}

/**
 * 切到某个已经在磁盘上、或刚刚建好的场景。§02 J 那段伪代码的后半段，顺序不能动：
 * stop → replaceScene → 清编辑器状态 → ensureScaffold → 记当前 → start
 */
function adoptScene(storage: SceneStorage, sceneId: string, snapshot: SceneSnapshot): void {
    stopSessionAutosave()

    replaceScene(snapshot)

    // 选中和当前层都指向旧场景的节点 id，不清就会指向不存在的东西。core 碰不到它们。
    useEditor.getState().select(null)
    useEditor.getState().setCurrentLevel(null)

    // 空文档补脚手架；v1 文档里容器已经有了，这一句只把当前层对齐（level-actions.ts:13-16 的早退分支）。
    ensureScaffold()

    storage.setCurrentSceneId(sceneId)

    const persistence = usePersistence.getState()
    persistence.setCurrentScene(sceneId, nameOf(storage, sceneId))
    persistence.setSaveStatus('saved')
    persistence.setError(null)
    persistence.bumpRevision()

    startSessionAutosave(storage, sceneId)
}

/** 开一个空场景（带脚手架），存进磁盘，切过去。 */
export function newScene(storage: SceneStorage, name: string): SceneMeta {
    stopSessionAutosave()

    replaceScene(EMPTY)
    useEditor.getState().select(null)
    useEditor.getState().setCurrentLevel(null)
    ensureScaffold()                       // 空场景：这一次它真的写 useScene（建 site / building / level）

    const meta = storage.create(name, snapshotNow())
    storage.setCurrentSceneId(meta.id)

    const persistence = usePersistence.getState()
    persistence.setCurrentScene(meta.id, meta.name)
    persistence.setSaveStatus('saved')
    persistence.setReport(null)
    persistence.bumpRevision()

    startSessionAutosave(storage, meta.id)
    return meta
}

/**
 * 打开一个场景。读失败什么都不动 —— 不 stop 当前自动保存、不替换场景 —— 只写 lastError。
 * 所以 load 排在 stop 前面：它是一次纯读，失败了当前场景连一个字节都没动过。
 */
export function openScene(storage: SceneStorage, id: string): SceneLoadResult | null {
    const result = storage.load(id)
    if (result === null) {
        usePersistence.getState().setError(`场景 ${id} 的文档不见了`)
        return null
    }
    if (!result.ok) {
        usePersistence.getState().setError(describeLoadError(result.error))
        return result
    }

    adoptScene(storage, id, result.snapshot)
    usePersistence.getState().setReport(
        result.fromVersion === 0 || result.report.dropped.length > 0 || result.report.repairedParents.length > 0
            ? { fromVersion: result.fromVersion, report: result.report }
            : null,
    )
    return result
}

/** 启动。全部在 render 之前跑完，否则会先闪一帧空场景。 */
export function bootScenes(storage: SceneStorage): void {
    const remembered = storage.currentSceneId() ?? storage.list()[0]?.id ?? null

    if (remembered !== null) {
        const result = openScene(storage, remembered)
        if (result !== null && result.ok) return
        // 打开失败：不碰它、不对它启动自动保存。下面新建一个，状态栏保留上面写的 lastError。
        const reason = usePersistence.getState().lastError
        newScene(storage, '未命名')
        usePersistence.getState().setError(reason)
        return
    }

    newScene(storage, '未命名')
}

/** 导入 = parse → 新建一个场景并切过去（前置 B2）。当前场景不动。 */
export function importSceneText(storage: SceneStorage, text: string, name: string): SceneLoadResult {
    const result = parseSceneDocument(text)
    if (!result.ok) {
        usePersistence.getState().setError(describeLoadError(result.error))
        return result
    }

    // 文件里的东西一个都没留下、却丢了若干个 → 当成不是我们的文件（v0 形状嗅探的兜底）。
    // 判据不能写成"nodes 是空的"：v0 → v1 自己会造出 site / building / level，永远不空。
    const survivors = Object.values(result.snapshot.nodes)
        .filter((n) => n.type !== 'site' && n.type !== 'building' && n.type !== 'level')
    if (survivors.length === 0 && result.report.dropped.length > 0) {
        const rejected: SceneLoadResult = { ok: false, error: { kind: 'not-a-scene' } }
        usePersistence.getState().setError(describeLoadError(rejected.error))
        return rejected
    }

    const meta = storage.create(name, result.snapshot)
    adoptScene(storage, meta.id, result.snapshot)
    usePersistence.getState().setReport({ fromVersion: result.fromVersion, report: result.report })
    return result
}

export function exportCurrentScene(storage: SceneStorage): { filename: string; text: string } | null {
    const sceneId = storage.currentSceneId()
    if (sceneId === null) return null

    const name = nameOf(storage, sceneId) ?? sceneId
    const safe = name.replace(/[\\/:*?"<>|]/g, '_').trim() || sceneId
    return {
        filename: `${safe}.r3f-scene.json`,
        text: JSON.stringify(toSceneDocument(snapshotNow()), null, 2),
    }
}

/** Ctrl+S：整份文档的拷贝，每场景留最近 10 个（core 那边修剪）。 */
export function checkpointNow(storage: SceneStorage, label?: string): CheckpointMeta | null {
    const sceneId = storage.currentSceneId()
    if (sceneId === null) return null

    autosave?.flush()                       // 先让场景文档本身是最新的，存档点和它才对得上
    const meta = storage.checkpoint(sceneId, label ?? new Date().toLocaleString(), snapshotNow())
    usePersistence.getState().bumpRevision()
    return meta
}

/** 恢复存档点走"导入"那条路：建一个新场景，原场景原封不动（B2 的同一条理由）。 */
export function restoreCheckpoint(storage: SceneStorage, sceneId: string, checkpointId: string): SceneLoadResult | null {
    const result = storage.loadCheckpoint(sceneId, checkpointId)
    if (result === null) {
        usePersistence.getState().setError('这个存档点的文档不见了')
        return null
    }
    if (!result.ok) {
        usePersistence.getState().setError(describeLoadError(result.error))
        return result
    }

    const base = nameOf(storage, sceneId) ?? '场景'
    const meta = storage.create(`${base}（存档点）`, result.snapshot)
    adoptScene(storage, meta.id, result.snapshot)
    return result
}

/**
 * 删场景。删的是当前场景时：先切到列表里下一个（没有就新建），再 remove。
 * 切走时那一次 flush 会写进马上要删掉的文档 —— 无害，比"加一个不 flush 的 stop"简单。
 */
export function deleteScene(storage: SceneStorage, id: string): void {
    if (storage.currentSceneId() === id) {
        const next = storage.list().find((s) => s.id !== id)
        if (next === undefined) {
            newScene(storage, '未命名')
        } else {
            openScene(storage, next.id)
        }
    }

    storage.remove(id)
    usePersistence.getState().bumpRevision()
}

export function renameScene(storage: SceneStorage, id: string, name: string): void {
    storage.rename(id, name)
    if (usePersistence.getState().currentSceneId === id) {
        usePersistence.getState().setCurrentScene(id, name)
    }
    usePersistence.getState().bumpRevision()
}

/** 关掉当前会话（测试的 beforeEach 用；产品代码只有切场景时才会走到它）。 */
export function stopSession(): void {
    stopSessionAutosave()
}
```

跑 `pnpm test`：**14 条全绿**（21 文件 / 287 用例）。`pnpm verify` 应该整个绿。

---

### 15 · `src/app/persistence/file-io.ts` · 新建（DOM，不测）

```ts
/** 纯 DOM，本项目没有 DOM 测试环境（D11）—— 这一整个文件靠肉眼验收。 */

export function downloadText(filename: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
}

export function pickTextFile(accept = '.json'): Promise<{ name: string; text: string } | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = accept

        const finish = (value: { name: string; text: string } | null) => {
            input.remove()
            resolve(value)
        }

        input.addEventListener('change', () => {
            const file = input.files?.[0]
            if (file === undefined) return finish(null)
            file.text().then((text) => finish({ name: file.name, text }), () => finish(null))
        })
        // 用户在系统对话框里点取消时 change 不触发。没有这一行，上面那个 Promise 永远挂着。
        input.addEventListener('cancel', () => finish(null))

        input.click()
    })
}
```

---

### 16 · `src/app/components/scene-panel.tsx` · 新建（React，不测）

右上角固定浮层，M12 才上 Radix（D12）。

```tsx
import { useState } from "react"
import type { SceneStorage } from "../../core/persistence/scene-storage"
import { downloadText, pickTextFile } from "../persistence/file-io"
import {
    checkpointNow, deleteScene, exportCurrentScene, importSceneText,
    newScene, openScene, renameScene, restoreCheckpoint,
} from "../persistence/scene-session"
import { usePersistence } from "../store/use-persistence"

/** M12 才上 Radix（D12）。现在是右上角一个固定浮层。 */
const panel: React.CSSProperties = {
    position: 'absolute', right: 12, top: 12, width: 280, maxHeight: 'calc(100vh - 24px)',
    overflow: 'auto', padding: 10, borderRadius: 4,
    font: '12px ui-monospace, monospace', background: 'rgba(255,255,255,.92)',
    boxShadow: '0 1px 6px rgba(0,0,0,.2)',
}
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }
const grow: React.CSSProperties = { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export function ScenePanel({ storage }: { storage: SceneStorage }) {
    // revision 是"磁盘被动过"的信号：storage 不是 store，读它的结果不会自己重渲染。
    const revision = usePersistence((s) => s.revision)
    const currentSceneId = usePersistence((s) => s.currentSceneId)
    const lastReport = usePersistence((s) => s.lastReport)
    const [editingId, setEditingId] = useState<string | null>(null)

    void revision
    const scenes = storage.list()
    const checkpoints = currentSceneId === null ? [] : storage.listCheckpoints(currentSceneId).slice(-10).reverse()

    const onImport = () => {
        void pickTextFile('.json').then((picked) => {
            if (picked === null) return
            importSceneText(storage, picked.text, picked.name.replace(/\.(r3f-scene\.)?json$/i, ''))
        })
    }

    const onExport = () => {
        const out = exportCurrentScene(storage)
        if (out !== null) downloadText(out.filename, out.text)
    }

    const onDelete = (id: string, name: string) => {
        if (window.confirm(`删除场景「${name}」？这会连同它的存档点一起删掉，撤不回来。`)) {
            deleteScene(storage, id)
        }
    }

    return (
        <div style={panel}>
            <div style={{ ...row, fontWeight: 'bold' }}>场景</div>

            {scenes.map((meta) => (
                <div key={meta.id} style={{ ...row, background: meta.id === currentSceneId ? 'rgba(0,120,255,.12)' : undefined }}>
                    {editingId === meta.id ? (
                        <input
                            autoFocus
                            defaultValue={meta.name}
                            style={{ ...grow, font: 'inherit' }}
                            onBlur={(e) => { renameScene(storage, meta.id, e.target.value.trim() || meta.name); setEditingId(null) }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                                if (e.key === 'Escape') setEditingId(null)
                            }}
                        />
                    ) : (
                        <span style={grow} title={`${meta.nodeCount} 个节点 · ${meta.updatedAt}`} onDoubleClick={() => setEditingId(meta.id)}>
                            {meta.name} <span style={{ opacity: .5 }}>· {meta.nodeCount}</span>
                        </span>
                    )}
                    <button disabled={meta.id === currentSceneId} onClick={() => openScene(storage, meta.id)}>打开</button>
                    <button onClick={() => onDelete(meta.id, meta.name)}>删</button>
                </div>
            ))}

            <div style={{ ...row, marginTop: 6 }}>
                <button onClick={() => newScene(storage, '未命名')}>新建</button>
                <button onClick={onImport}>导入</button>
                <button onClick={onExport}>导出</button>
                <button onClick={() => checkpointNow(storage)}>存档点</button>
            </div>

            {lastReport !== null && (
                <div style={{ ...row, opacity: .7 }}>
                    读档：从 v{lastReport.fromVersion} 迁过来
                    {lastReport.report.dropped.length > 0 && ` · 丢了 ${lastReport.report.dropped.length} 个`}
                    {lastReport.report.repairedParents.length > 0 && ` · 修了 ${lastReport.report.repairedParents.length} 个父`}
                </div>
            )}

            {checkpoints.length > 0 && (
                <>
                    <div style={{ ...row, marginTop: 6, fontWeight: 'bold' }}>存档点</div>
                    {checkpoints.map((cp) => (
                        <div key={cp.id} style={row}>
                            <span style={grow} title={cp.createdAt}>{cp.label || cp.createdAt || cp.id}</span>
                            <button onClick={() => restoreCheckpoint(storage, cp.sceneId, cp.id)}>恢复</button>
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}
```

---

### 17 · `src/app/app.tsx` · 改四处

**17a · import 和 `SAVE_LABEL`**（加在 `LevelVisibility` 那行之后 / `PLAN_MOUSE_BUTTONS` 之后）：

```tsx
import { ScenePanel } from "./components/scene-panel";
import type { SceneStorage } from "../core/persistence/scene-storage";
import { checkpointNow } from "./persistence/scene-session";
import { usePersistence } from "./store/use-persistence";

const PLAN_MOUSE_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }

const SAVE_LABEL: Record<string, string> = {
    idle: '未保存',
    pending: '未保存',
    saved: '已保存',
    error: '保存失败',
    disabled: '本次不会保存',
}

export function App({ storage }: { storage: SceneStorage }) {
```

**17b · 两个订阅**（`inputDragging` 那行之后）：

```tsx
    const saveStatus = usePersistence((s) => s.saveStatus)
    const lastError = usePersistence((s) => s.lastError)
```

**17c · keydown 开头加两段，依赖数组改成 `[storage]`**：

```tsx
        const onKey = (e: KeyboardEvent) => {
            // 面板上有输入框（重命名场景）。不跳过的话，在里面打字就会切工具 —— W 切墙、D 切门。
            const target = e.target as HTMLElement | null
            if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()          // 不拦浏览器会弹"保存网页"
                checkpointNow(storage)
                return
            }
            if (e.key === 'Tab') {
```

```tsx
        return () => window.removeEventListener('keydown', onKey)
    }, [storage])
```

**17d · 面板和状态栏**：`</Viewer>` 之后插 `<ScenePanel storage={storage} />`，状态栏最后两行换成：

```tsx
                &nbsp;|&nbsp; [ ] 切层 · L 顶上加一层 · Ctrl+S 存档点
                &nbsp;|&nbsp; {SAVE_LABEL[saveStatus]}{lastError === null ? '' : ` · ${lastError}`}
```

---

### 18 · `src/main.tsx` · 改写

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { detectLocalStorage, localStorageKV, memoryKV } from './app/persistence/local-storage-kv'
import { bootScenes } from './app/persistence/scene-session'
import { usePersistence } from './app/store/use-persistence'
import { createSceneStorage } from './core/persistence/scene-storage'

const browserStorage = detectLocalStorage()
const storage = createSceneStorage(browserStorage === null ? memoryKV() : localStorageKV(browserStorage))

// 读档、补脚手架、启动自动保存，全部在 render 之前跑完。
// 放进 effect 里会先闪一帧空场景，而且读档那次 setState 会撞上已经启动的自动保存。
bootScenes(storage)

if (browserStorage === null) {
  usePersistence.getState().setSaveStatus('disabled')
  usePersistence.getState().setError('浏览器不让写 localStorage（隐私模式？）—— 本次的改动不会被保存')
}

// StrictMode 会把 effect 挂载两次 → useRegistry 注册/注销各跑两轮。
// 如果你的清理函数写对了，registry 里最终只有一份。这是个免费的自检。
createRoot(document.getElementById('root')!).render(
  <StrictMode><App storage={storage} /></StrictMode>,
)
```

**`ensureScaffold()` 那一行没了** —— 它现在在 `bootScenes` 里面（`newScene` / `adoptScene` 各调一次）。

---

### 敲完之后应该看到什么

| 怎么试 | 应该 |
|---|---|
| `pnpm verify` | **全绿：21 文件 / 287 用例** |
| 打开页面，画几堵墙，**刷新** | **墙还在。**这是 M9 的验收本身 —— M1 起「刷新即丢」那条债在这一刻关掉 |
| 画一堵墙，盯右下角 | 「未保存」→ 半秒后「已保存」 |
| 拖一堵墙 / 拖端点球（按住不放来回拖） | 状态**一直是「已保存」**——拖拽期间一次都不写盘（live 覆盖不碰 store）。松手落一次 |
| 右上角面板「新建」→ 画一堵墙 → 「打开」回第一个 | 两个场景各自的墙互不串。**这条就是 Q2 那个 bug 的肉眼版** |
| 「导出」 | 下载 `未命名.r3f-scene.json`；用编辑器打开，`format` / `version: 1` / `nodes` 都在 |
| 「导入」刚导出的那份 | **多一个场景**（不是覆盖），切过去，内容一样 |
| 导入一个随便什么 `.json` | 状态栏「这不是 r3f-arch 的场景文件」，场景列表不变 |
| **把 M1 时代的存档喂进去**（`__fixtures__/legacy-scenes.ts` 里 `M1_FLAT_SCENE` 那段 JSON 存成文件） | 能加载、能迁移、能再存回新格式 —— **ROADMAP 给 M9 写的验收原文** |
| 双击场景名改名，打 `w` `d` `f` | **工具不切**（17c 那段）。改完 Enter |
| Ctrl+S | 面板下方出现存档点；**浏览器不弹"保存网页"** |
| 画一堵墙，**立刻关标签页**，再打开 | 墙在（`pagehide` flush） |
| 无痕窗口打开 | 状态栏「本次不会保存」，其它功能照常 |
| 控制台 `localStorage.setItem('x', 'y'.repeat(6e6))` 撑满配额，再画墙 | 状态栏「保存失败 · …」，**改动保持脏**，下一次改动会重试 |

### 变异测试（把实现故意改错，确认测试会红）

| 改错成 | 结果 |
|---|---|
| autosave 引用没变也算改动（拖拽期间写盘） | 1 failed | 22 passed |
| autosave 先清脏、后写盘 | 1 failed | 22 passed |
| autosave 写失败当成功 | 1 failed | 22 passed |
| autosave stop 不 flush | 7 failed | 16 passed |
| autosave stop 不退订 | 1 failed | 22 passed |
| autosave 防抖不重置（只认第一次改动） | 1 failed | 22 passed |
| session 切场景：先 replaceScene 后 stop（**Q2 那个 bug**） | 3 failed | 20 passed |
| session 自动保存排在 replaceScene 之前（读档被写盘） | 1 failed | 22 passed |
| session 切场景不清选中 | 1 failed | 22 passed |
| session 不补脚手架 | 1 failed | 22 passed |
| session newScene 不 stop 旧场景 | 2 failed | 21 passed |
| session 删场景：先 remove 再切走 | 2 failed | 21 passed |
| session 导入覆盖当前场景（违反 B2） | 1 failed | 22 passed |
| session 导入不做"一个都没留下"兜底 | 1 failed | 22 passed |
| session 打开失败后不新建 | 1 failed | 22 passed |
| session 照 §02 J 的伪代码：stop 排在 load 之前 | 1 failed | 22 passed |

**16 / 16 被抓**，跑完文件逐字节恢复（`restored: true`）。

> 第一轮有 4 条逃掉，值得记：两条是变异体本身写错了（改完等价），一条是测试写弱了（切场景前没选中任何东西，断言恒真），**一条是实现里那个 `stopped` 标志位让"忘记退订"不可观测** —— 删掉它，代码少一行、变异测试多抓一个。**"变异体逃掉"要先怀疑测试和实现，不要先怀疑变异体。**

### 下一步

1. 按 09 → 18 的顺序敲，09 和 13 敲完确认是**红的**，再往下。
2. `pnpm verify` 全绿之后跑 **`/review`**。
3. §05 B 的肉眼验收（上面那张表）—— **这一批 8 个文件里有 4 个没有任何自动护栏**（`file-io` / `scene-panel` / `app.tsx` / `main.tsx`），M9 的验收全压在这一步上。
4. 之后 **`/recite`** 收尾 M9，再回头还 M8 前置 C 的尾巴（P4 测试、P5、C6）。
