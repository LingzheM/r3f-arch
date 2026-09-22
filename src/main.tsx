// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { ensureScaffold } from './app/lib/level/level-actions'
import { createSceneStorage } from './core/persistence/scene-storage'
import { detectLocalStorage, localStorageKV, memoryKV } from './app/persistence/local-storage-kv'

const browserStorage = detectLocalStorage()
const storage = createSceneStorage(browserStorage === null ? memoryKV() : localStorageKV(browserStorage))

ensureScaffold()
// StrictMode 会把 effect 挂载两次 → useRegistry 注册/注销各跑两轮。
// 如果你的清理函数写对了，registry 里最终只有一份。这是个免费的自检。
createRoot(document.getElementById('root')!).render(
  <StrictMode><App storage={storage} /></StrictMode>,
)