import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CLAVES_HEREDADAS } from './config'
import { adoptarClavesAntiguas } from './lib/storage'
import './styles.css'
import './components/print/print.css'

// Antes de pintar nada: si este despliegue tenía datos con las claves antiguas (sin prefijo por
// ruta), se copian a las nuevas. Copia, no mueve: si algo falla, el original sigue ahí.
if (typeof localStorage !== 'undefined') adoptarClavesAntiguas(localStorage, CLAVES_HEREDADAS)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
