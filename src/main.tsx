// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'

// StrictMode 会把 effect 挂载两次 → useRegistry 注册/注销各跑两轮。
// 如果你的清理函数写对了，registry 里最终只有一份。这是个免费的自检。
createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)