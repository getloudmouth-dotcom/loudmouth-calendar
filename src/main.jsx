import { Sentry } from './sentry.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h2>Something went wrong.</h2>
        <p style={{ opacity: 0.7 }}>The error has been reported. You can try again.</p>
        <button onClick={resetError} style={{ padding: '8px 16px', marginTop: 12 }}>Reload</button>
        {import.meta.env.DEV && <pre style={{ marginTop: 16, fontSize: 12 }}>{String(error)}</pre>}
      </div>
    )}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
