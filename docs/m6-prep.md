# 场景存档 —— localStorage 自动保存

> 2026-09-02。**M9 的一半，提前到 M6 之前。**另一半（导入导出、迁移链、场景列表）
> 留在 M9 —— 那部分要等 schema 稳定。

---

## 这份文件和 `m6-slab-ceiling-column.html` 的关系

**开工闸门看那份文档的「前置 C · 21 处编辑」，不看这里。**它比我一开始写的清单更全 ——
我漏了两条真 bug：

| 我漏的 | 症状 |
|---|---|
| **B1 · `core/store/use-scene.ts:42,48`** —— `updateNode` / `removeNode` 退回成箭头体，脏标记没接上 | 改墙根本不进脏集。`GeometrySystem` 的唯一输入是脏集 |
| **B2 · `core/systems/wall/wall-adjacency.ts:35`** —— 共端点四项里第一项写重了（`dirtyEndKey` 两次），`startKey === dirtyStartKey` 丢了 | 两堵从同一个角向外画的墙检测不到相邻 |

**这份文件只加一件前置 C 没有的事：存档。**

---

## 为什么提前它

不是「早点做存档」。是**它改变之后每一站的手感**：

现在每次刷新场景归零 —— 你攒不出一个 30 堵墙的房子，
也就没法真正验证「100 堵墙拖一堵卡不卡」，更没法给别人看。
`pnpm verify` 已经红了 8 天，8 天里你敲完 M4 后半程和整个 M5，全程没有一次绿灯。
**1878 行代码，你几乎没法真正用它。**

M6 是 600–800 行。在一个测不了、活不过刷新的东西上再加这么多，
出问题时你分不清是新写的还是旧欠的。

---

## 验证

在一份 `src/` 的完整拷贝上，**先应用前置 C 的 21 处**，再加这三处：

```
tsc --build --force --noEmit   ✅
eslint src                     ✅
vitest run                     ✅  3 文件 / 45 用例（新增 14）
vite build                     ✅  693 modules
```

---

## 1 · 新建 `src/core/store/scene-persistence.ts`

```ts
import { AnyNode, type AnyNodeId } from "../schema/types"
import { useScene } from "./use-scene"

/**
 * localStorage 自动存档 —— M9 的一半，提前到 M6 之前。
 *
 * 提前它的理由不是「早点做存档」，是**它改变之后每一站的手感**：
 * 现在每次刷新场景归零，你没法攒出一个 30 堵墙的房子，
 * 也就没法真正验证「100 堵墙拖一堵卡不卡」。
 *
 * M9 的另一半（导入导出、迁移链、场景列表）留在原地 —— 那部分要等 schema 稳定。
 */

const STORAGE_KEY = 'r3f-arch:scene'
const STORAGE_VERSION = 1
const SAVE_DEBOUNCE_MS = 300

type PersistedScene = {
    version: number
    /** 存数组而不是 Record —— key 本来就是 id，数组少一整类 key/id 不一致的错。 */
    nodes: unknown[]
    rootNodeIds: string[]
}

export function saveScene(): void {
    const { nodes, rootNodeIds } = useScene.getState()
    const payload: PersistedScene = {
        version: STORAGE_VERSION,
        nodes: Object.values(nodes),
        rootNodeIds,
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
        // 配额满、隐私模式、localStorage 被禁 —— 存不上不该让编辑器崩。
    }
}

/**
 * 启动时读一次。读不到 / 读坏了都返回 false 并保持空场景。
 *
 * **每个节点单独 safeParse**：一个坏节点只丢它自己，不该让整个存档作废。
 * 这条在 M9 加迁移链之后更重要 —— 那时候「部分节点是旧格式」会是常态。
 */
export function loadScene(): boolean {
    let raw: string | null = null
    try {
        raw = localStorage.getItem(STORAGE_KEY)
    } catch {
        return false
    }
    if (!raw) return false

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return false
    }

    const payload = parsed as Partial<PersistedScene> | null
    // 版本不认识就当没有存档。M9 会在这里接迁移链，现在先直接丢。
    if (!payload || payload.version !== STORAGE_VERSION) return false
    if (!Array.isArray(payload.nodes)) return false

    const nodes: Record<AnyNodeId, AnyNode> = {}
    const known = new Set<string>()
    for (const candidate of payload.nodes) {
        const result = AnyNode.safeParse(candidate)
        if (!result.success) continue
        nodes[result.data.id] = result.data
        known.add(result.data.id)
    }

    const savedOrder = Array.isArray(payload.rootNodeIds) ? payload.rootNodeIds : []
    const rootNodeIds = savedOrder.filter(
        (id): id is AnyNodeId => typeof id === 'string' && known.has(id),
    )
    // 存档里漏了某个节点的 id 时兜底，否则它会永远不被渲染。
    for (const id of known) {
        if (!rootNodeIds.includes(id as AnyNodeId)) rootNodeIds.push(id as AnyNodeId)
    }

    useScene.setState({ nodes, rootNodeIds })
    // 几何全部重建 —— GeometrySystem 只看脏集，不标脏读档后画面是空的。
    useScene.getState().markAllDirty()
    // 读档不该能被 Ctrl+Z 撤回到空场景。必须在 setState 之后。
    useScene.temporal.getState().clear()

    return rootNodeIds.length > 0
}

/** 订阅 store，防抖写盘。返回取消订阅的闭包。 */
export function startScenePersistence(): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined

    // 拖拽期间主 store 一动不动（走 live 覆盖），所以这里的触发本来就很稀疏。
    // 防抖是给「连续画墙」那种一秒好几次的场景兜底的。
    const unsubscribe = useScene.subscribe(() => {
        if (timer !== undefined) clearTimeout(timer)
        timer = setTimeout(saveScene, SAVE_DEBOUNCE_MS)
    })

    return () => {
        if (timer !== undefined) clearTimeout(timer)
        unsubscribe()
    }
}

/** 逃生口。存档坏了或想从空场景重来时调它，然后刷新。 */
export function clearPersistedScene(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // 同 saveScene：读写 localStorage 失败不该崩。
    }
}
```

### 三个设计点

1. **每个节点单独 `safeParse`。**一个坏节点只丢它自己，不该让整个存档作废。
   M9 加迁移链之后「部分节点是旧格式」会是常态 —— 现在就把这个形状定下来。
2. **`markAllDirty()` 必须调。**`GeometrySystem` 只看脏集。不标脏，读档后画面是空的。
   （前置 C 的 B1 修完这条才成立 —— 那两处正是脏集的写入口。）
3. **`temporal.clear()` 必须在 `setState` 之后。**否则读档能被 `Ctrl+Z` 撤回到空场景。

---

## 2 · 改 `src/main.tsx`

```diff
 import { App } from './app/app'
+import { loadScene, startScenePersistence } from './core/store/scene-persistence'
+
+// 在 render 之前读档 —— GeometrySystem 第一帧就能拿到节点。
+// 放进组件的 effect 里会晚一拍，表现是「读档后闪一下空场景」。
+loadScene()
+startScenePersistence()
```

---

## 3 · 新建 `src/core/store/scene-persistence.test.ts`

14 个用例。项目里没装 jsdom，但这个模块只用到 `localStorage` 的三个方法 ——
手搓一个 10 行的替身就够了。判据和 `drag-session.test.ts` 一样：
**需要的是 DOM 的接口还是 DOM 的行为**，这里是前者。

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnyNodeId } from '../schema/types'
import {
  clearPersistedScene,
  loadScene,
  saveScene,
  startScenePersistence,
} from './scene-persistence'
import { useScene } from './use-scene'

/**
 * 项目里没装 jsdom，但这个模块只用到 localStorage 的三个方法 ——
 * 手搓一个 10 行的替身就够了。判据和 drag-session.test.ts 一样：
 * 需要的是 DOM 的**接口**还是 DOM 的**行为**。这里是前者。
 */
function installFakeStorage() {
  const map = new Map<string, string>()
  const fake = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    get size() {
      return map.size
    },
    raw: map,
  }
  Reflect.set(globalThis, 'localStorage', fake)
  return fake
}

let storage: ReturnType<typeof installFakeStorage>

function resetScene() {
  useScene.setState({ nodes: {}, rootNodeIds: [] })
  useScene.getState().dirtyNodes.clear()
  useScene.temporal.getState().resume()
  useScene.temporal.getState().clear()
}

function addWall(start: [number, number], end: [number, number]): AnyNodeId {
  return useScene.getState().addNode({ type: 'wall', start, end })
}

beforeEach(() => {
  storage = installFakeStorage()
  resetScene()
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('存 → 读', () => {
  it('一趟往返之后场景一模一样', () => {
    const a = addWall([0, 0], [4, 0])
    const b = addWall([4, 0], [4, 3])
    saveScene()

    resetScene()
    expect(useScene.getState().rootNodeIds).toEqual([])

    expect(loadScene()).toBe(true)
    expect(useScene.getState().rootNodeIds).toEqual([a, b])
    expect(useScene.getState().nodes[a]).toMatchObject({ start: [0, 0], end: [4, 0] })
    expect(useScene.getState().nodes[b]).toMatchObject({ start: [4, 0], end: [4, 3] })
  })

  it('读档之后全部标脏 —— 否则 GeometrySystem 不会建，画面是空的', () => {
    addWall([0, 0], [4, 0])
    saveScene()
    resetScene()

    loadScene()
    expect(useScene.getState().dirtyNodes.size).toBe(1)
  })

  it('读档不能被 Ctrl+Z 撤回到空场景', () => {
    const a = addWall([0, 0], [4, 0])
    saveScene()
    resetScene()
    loadScene()

    expect(useScene.temporal.getState().pastStates).toHaveLength(0)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[a]).toBeDefined()
  })

  it('读档之后还能继续正常撤销新的改动', () => {
    const a = addWall([0, 0], [4, 0])
    saveScene()
    resetScene()
    loadScene()

    useScene.getState().updateNode(a, { end: [9, 0] })
    useScene.temporal.getState().undo()

    expect(useScene.getState().nodes[a]).toMatchObject({ end: [4, 0] })
  })
})

describe('坏存档不许让编辑器崩', () => {
  it('没有存档 → false，空场景', () => {
    expect(loadScene()).toBe(false)
    expect(useScene.getState().rootNodeIds).toEqual([])
  })

  it('不是 JSON → false', () => {
    storage.raw.set('r3f-arch:scene', '{{{ 坏了')
    expect(loadScene()).toBe(false)
  })

  it('版本号不认识 → false（M9 会在这里接迁移链）', () => {
    storage.raw.set(
      'r3f-arch:scene',
      JSON.stringify({ version: 99, nodes: [], rootNodeIds: [] }),
    )
    expect(loadScene()).toBe(false)
  })

  it('单个节点坏掉只丢它自己，其余照常加载', () => {
    const a = addWall([0, 0], [4, 0])
    saveScene()

    const payload = JSON.parse(storage.raw.get('r3f-arch:scene')!)
    payload.nodes.push({ type: 'wall', start: [0, 0] }) // 缺 end
    payload.nodes.push({ type: '不存在的类型' })
    payload.rootNodeIds.push('wall_ghost')
    storage.raw.set('r3f-arch:scene', JSON.stringify(payload))

    resetScene()
    expect(loadScene()).toBe(true)
    expect(useScene.getState().rootNodeIds).toEqual([a])
  })

  it('rootNodeIds 漏了某个节点时兜底，不让它变成看不见的孤儿', () => {
    const a = addWall([0, 0], [4, 0])
    saveScene()

    const payload = JSON.parse(storage.raw.get('r3f-arch:scene')!)
    payload.rootNodeIds = []
    storage.raw.set('r3f-arch:scene', JSON.stringify(payload))

    resetScene()
    loadScene()
    expect(useScene.getState().rootNodeIds).toEqual([a])
  })

  it('localStorage 读写抛异常时不冒泡', () => {
    Reflect.set(globalThis, 'localStorage', {
      getItem: () => {
        throw new Error('隐私模式')
      },
      setItem: () => {
        throw new Error('配额满')
      },
      removeItem: () => {
        throw new Error('nope')
      },
    })

    expect(() => saveScene()).not.toThrow()
    expect(loadScene()).toBe(false)
    expect(() => clearPersistedScene()).not.toThrow()
  })
})

describe('自动保存', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('改动之后防抖写盘', () => {
    const stop = startScenePersistence()

    addWall([0, 0], [4, 0])
    expect(storage.size).toBe(0) // 还在防抖窗口里

    vi.advanceTimersByTime(300)
    expect(storage.size).toBe(1)

    stop()
  })

  it('连续改动只写一次盘', () => {
    const stop = startScenePersistence()
    let writes = 0
    const setItem = storage.setItem
    storage.setItem = (k: string, v: string) => {
      writes += 1
      setItem(k, v)
    }

    addWall([0, 0], [4, 0])
    vi.advanceTimersByTime(100)
    addWall([4, 0], [4, 3])
    vi.advanceTimersByTime(100)
    addWall([4, 3], [0, 3])
    vi.advanceTimersByTime(300)

    expect(writes).toBe(1)
    stop()
  })

  it('停掉之后不再写盘', () => {
    const stop = startScenePersistence()
    stop()

    addWall([0, 0], [4, 0])
    vi.advanceTimersByTime(300)

    expect(storage.size).toBe(0)
  })

  it('clearPersistedScene 清掉存档', () => {
    addWall([0, 0], [4, 0])
    saveScene()
    expect(storage.size).toBe(1)

    clearPersistedScene()
    expect(storage.size).toBe(0)
    expect(loadScene()).toBe(false)
  })
})
```

---

## 验收

- [ ] 画几堵墙 → **刷新页面 → 墙还在**
- [ ] 刷新后立刻按 `Ctrl+Z` → **撤不掉**（撤销栈是干净的）
- [ ] 刷新后墙**立刻出现**，不用动鼠标（`markAllDirty` 生效）
- [ ] 刷新后接着改一堵墙 → `Ctrl+Z` 能撤这一次
- [ ] `pnpm verify` 全绿

**逃生口**：存档坏了或想从空场景重来 —— devtools 里
`localStorage.removeItem('r3f-arch:scene')` 然后刷新。
或者代码里调 `clearPersistedScene()`。

---

## 做完之后

| | 之前 | 之后 |
|---|---|---|
| 刷新 | 场景归零 | 场景还在 |
| 测试 | 2 文件 31 例 | 3 文件 45 例 |
| M9 剩下的 | 全部 | 导入导出 + 迁移链 + 场景列表 |

`STATE.md` 的缺陷表里「刷新即丢，无存档 | M1 | M9」这一条可以划掉一半。
