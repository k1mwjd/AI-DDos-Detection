import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// index.html의 #root 엘리먼트에 React 앱을 마운트
// StrictMode는 개발 중 부작용이 있는 렌더링 로직을 더 쉽게 찾도록 도와줌
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
