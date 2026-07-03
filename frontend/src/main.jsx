import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Sentry solo se activa si VITE_SENTRY_DSN está configurado (Fase 7 del PRD
// de hardening). Sin esa variable, esto es un no-op — igual que sin esta
// fase — así que ningún entorno (dev, CI, build sin la env var) cambia de
// comportamiento por accidente.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    // Sin tracing de performance por defecto (ver mismo criterio en backend/observability.py).
    tracesSampleRate: 0,
  })
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
