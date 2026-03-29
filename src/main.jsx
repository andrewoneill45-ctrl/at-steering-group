import "./theme.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker — shows a toast when new version is available
registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload to update?')) {
      window.location.reload()
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
