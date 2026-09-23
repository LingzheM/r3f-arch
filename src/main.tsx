// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { createSceneStorage } from './core/persistence/scene-storage'
import { detectLocalStorage, localStorageKV, memoryKV } from './app/persistence/local-storage-kv'
import { usePersistence } from './app/store/use-persistence'
import { bootScenes } from './app/persistence/scene-session'

const browserStorage = detectLocalStorage()
const storage = createSceneStorage(browserStorage === null ? memoryKV() : localStorageKV(browserStorage))

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