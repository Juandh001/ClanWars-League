import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { resetRealtimeConnection } from './lib/supabase'

// Reset realtime connection on app init to clear any stale state
resetRealtimeConnection()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
