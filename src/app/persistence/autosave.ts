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
      dirty = false
      options.onStatus?.('saved')
    } catch (error) {
      options.onStatus?.('error', error)
    }
  }

  const unsubscribe = options.store.subscribe((state, prev) => {
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
    stop() {
      flush()
      exitTarget?.removeEventListener('pagehide', onExit)
      unsubscribe()
    },
  }
}