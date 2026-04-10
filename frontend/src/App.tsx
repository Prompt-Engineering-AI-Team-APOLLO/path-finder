import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import ConfirmPage from './pages/ConfirmPage'

type Page = 'login' | 'home' | 'plan' | 'confirm'

const PAGES: { id: Page; label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'home', label: 'Home' },
  { id: 'plan', label: 'Plan' },
  { id: 'confirm', label: 'Confirm' },
]

export default function App() {
  const [page, setPage] = useState<Page>('login')

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      {/* Dev page switcher */}
      <nav
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          gap: 6,
          background: 'rgba(15,15,30,0.92)',
          border: '1px solid rgba(112,71,235,0.3)',
          borderRadius: '9999px',
          padding: '6px 10px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {PAGES.map(p => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            style={{
              padding: '5px 14px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: '150ms ease',
              background: page === p.id ? 'var(--color-primary)' : 'transparent',
              color: page === p.id ? 'white' : 'rgba(255,255,255,0.5)',
            }}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {page === 'login'   && <LoginPage />}
      {page === 'home'    && <HomePage />}
      {page === 'plan'    && <PlanPage />}
      {page === 'confirm' && <ConfirmPage />}
    </div>
  )
}
