import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles.css'

// Motiv je napevno „graphite" (nastaveno přes data-theme v index.html) — modrý
// motiv byl vyřazen. Žádné přepínání za běhu.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
