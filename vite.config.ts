import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 只服务于 src/main.tsx 的开发预览；库产物仍然走 `tsc --build` → dist。
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
})
