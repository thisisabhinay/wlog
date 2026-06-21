import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const oldData = localStorage.getItem('career-logbook');
if (oldData && !localStorage.getItem('work-logbook')) {
  localStorage.setItem('work-logbook', oldData);
  localStorage.removeItem('career-logbook');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
