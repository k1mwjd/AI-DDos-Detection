import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // React Fast Refresh와 JSX/TSX 변환을 Vite 개발 서버와 빌드 과정에 연결합니다.
  plugins: [react()],
})
