import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App.tsx'
import { ProfileProvider } from './context/ProfileContext.tsx'
import { AccessibilityProvider } from './context/AccessibilityContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  </StrictMode>,
)
