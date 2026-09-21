import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { asNodeId } from "../../core/schema/types"
import type { SceneSnapshot } from "../../core/store/history-control"
import { startAutosave, type AutosaveStatus } from "./autosave"

function fakeStore(initial: SceneSnapshot) {
  let state = initial
  const listeners = new Set<(s: SceneSnapshot, prev: SceneSnapshot) => void>()
  return {
    getState: () => state,
    subscribe(listener: (s: SceneSnapshot, prev: SceneSnapshot) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setScene(next: SceneSnapshot) {
      const prev = state
      state = next
      for (const listener of listeners) listener(state, prev)
    },
    notifyWithoutChange() {
      for (const listener of listeners) listener(state, state)
    },
  }
}

/** 用 rootNodeIds 给场景贴个标签，断言里一眼看出写进去的是哪一份 */
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
