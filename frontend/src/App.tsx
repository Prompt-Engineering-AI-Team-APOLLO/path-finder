import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import ConfirmPage from './pages/ConfirmPage'
import BookingPage from './pages/BookingPage'
import type { FlightOffer, BookingRead } from './pages/BookingPage'

type Page = 'login' | 'home' | 'plan' | 'confirm' | 'booking'

type AuthSession = {
  email: string
  signedInAt: string
  accessToken: string
  refreshToken: string
}

interface BookingContext {
  flight: FlightOffer
  passengerCount: number
}

const AUTH_SESSION_KEY = 'pathfinder_auth_session'

const loadSession = (): AuthSession | null => {
  const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    return null
  }
}

const PAGES: { id: Page; label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'home', label: 'Home' },
  { id: 'booking', label: 'Booking' },
  { id: 'plan', label: 'Plan' },
  { id: 'confirm', label: 'Confirm' },
]

export default function App() {
  const [page, setPage] = useState<Page>('login')
  const [session, setSession] = useState<AuthSession | null>(null)
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRead | null>(null)

  useEffect(() => {
    setSession(loadSession())
  }, [])

  const handleSignInSuccess = ({ email, remember, accessToken, refreshToken }: { email: string; remember: boolean; accessToken: string; refreshToken: string }) => {
    const nextSession: AuthSession = {
      email,
      signedInAt: new Date().toISOString(),
      accessToken,
      refreshToken,
    }

    if (remember) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession))
      sessionStorage.removeItem(AUTH_SESSION_KEY)
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession))
      localStorage.removeItem(AUTH_SESSION_KEY)
    }

    setSession(nextSession)
    setPage('home')
  }

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setSession(null)
    setPage('login')
  }

  const handleContinueToBooking = (flight: FlightOffer, passengerCount: number) => {
    setBookingContext({ flight, passengerCount })
    setPage('booking')
  }

  const handleBookingComplete = (booking: BookingRead) => {
    setConfirmedBooking(booking)
    setPage('confirm')
  }

  const finalPage: Page = page

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
              background: finalPage === p.id ? 'var(--color-primary)' : 'transparent',
              color: finalPage === p.id ? 'white' : 'rgba(255,255,255,0.5)',
            }}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {finalPage === 'login' && <LoginPage onSignInSuccess={handleSignInSuccess} />}

      {finalPage === 'home' && (
        <HomePage
          userEmail={session?.email}
          accessToken={session?.accessToken}
          onOpenProfile={() => setPage('home')}
          onSignOut={handleSignOut}
          onContinueToBooking={handleContinueToBooking}
        />
      )}

      {finalPage === 'booking' && bookingContext && (
        <BookingPage
          flight={bookingContext.flight}
          passengerCount={bookingContext.passengerCount}
          accessToken={session?.accessToken}
          userEmail={session?.email}
          onBack={() => setPage('home')}
          onBookingComplete={handleBookingComplete}
        />
      )}

      {finalPage === 'plan' && <PlanPage />}

      {finalPage === 'confirm' && (
        <ConfirmPage bookingData={confirmedBooking ?? undefined} userEmail={session?.email} />
      )}
    </div>
  )
}
