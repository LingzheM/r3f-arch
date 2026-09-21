import type { KeyValueStore } from "../../core/persistence/scene-storage";

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

export function memoryKV(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: (key) => { map.delete(key) },
    keys: () => [...map.keys()],
  }
}

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