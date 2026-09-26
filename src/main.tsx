import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// Offline support + push. A new deploy reloads the page once it takes over.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const had = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had && !reloading) { reloading = true; location.reload() }
  })
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update() })
  }).catch(() => {})
}
