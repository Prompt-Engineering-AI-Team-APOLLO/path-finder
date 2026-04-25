import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import ConfirmPage from './pages/ConfirmPage'
import BookingPage from './pages/BookingPage'
import type { FlightOffer, BookingRead } from './pages/BookingPage'
import type { Message } from './components/ui'

// ── Storage keys ────────────────────────────────────────────────────────────
const AUTH_KEY = 'pathfinder_auth_session'
const CHAT_KEY = 'pathfinder_chat'
const PAGE_KEY = 'pathfinder_page'
const BOOKING_KEY = 'pathfinder_booking'
const BOOKING_CTX_KEY = 'pathfinder_booking_ctx'

// ── Types ───────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeWelcomeMessage = (): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI travel curator. Tell me where you'd like to go and I'll plan the perfect trip — flights, activities, dining, and more. Where shall we begin?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
})

const loadSession = (): AuthSession | null => {
  const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as AuthSession } catch { return null }
}

const loadMessages = (): Message[] => {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    const msgs = raw ? (JSON.parse(raw) as Message[]) : null
    return msgs && msgs.length > 0 ? msgs : [makeWelcomeMessage()]
  } catch { return [makeWelcomeMessage()] }
}

const loadBooking = (): BookingRead | null => {
  try {
    const raw = localStorage.getItem(BOOKING_KEY)
    return raw ? (JSON.parse(raw) as BookingRead) : null
  } catch { return null }
}

const loadBookingCtx = (): BookingContext | null => {
  try {
    const raw = sessionStorage.getItem(BOOKING_CTX_KEY)
    return raw ? (JSON.parse(raw) as BookingContext) : null
  } catch { return null }
}

const loadPage = (): Page => {
  const session = loadSession()
  if (!session) return 'login'
  const stored = localStorage.getItem(PAGE_KEY) as Page | null
  const validPages: Page[] = ['home', 'plan', 'confirm']
  // 'booking' is not restored on refresh (context lost); fallback to home
  return stored && validPages.includes(stored) ? stored : 'home'
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>(loadPage)
  const [session, setSession] = useState<AuthSession | null>(loadSession)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRead | null>(loadBooking)

  // ── Flight search state — lifted so it survives page navigation ──
  const [flightResults, setFlightResults] = useState<FlightOffer[] | null>(null)
  const [rawFlightResults, setRawFlightResults] = useState<FlightOffer[] | null>(null)
  const [showFlightResults, setShowFlightResults] = useState(false)
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null)
  const [flightRoute, setFlightRoute] = useState<{ from: string; to: string } | null>(null)
  const [passengerCount, setPassengerCount] = useState(1)
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(loadBookingCtx)
  // ── Chat ↔ UI sync state ──
  const [mentionedFlightId, setMentionedFlightId] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null)
  // ── Pending search query to auto-fire on HomePage ──
  const [pendingSearch, setPendingSearch] = useState<string | null>(null)

  // ── Persist page ──
  useEffect(() => {
    if (page !== 'login') localStorage.setItem(PAGE_KEY, page)
  }, [page])

  // ── Persist messages ──
  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages))
  }, [messages])

  // ── Persist confirmed booking ──
  useEffect(() => {
    if (confirmedBooking) {
      localStorage.setItem(BOOKING_KEY, JSON.stringify(confirmedBooking))
    }
  }, [confirmedBooking])

  // ── Persist booking context in sessionStorage (survives hot-reload, not refresh) ──
  useEffect(() => {
    if (bookingContext) {
      sessionStorage.setItem(BOOKING_CTX_KEY, JSON.stringify(bookingContext))
    } else {
      sessionStorage.removeItem(BOOKING_CTX_KEY)
    }
  }, [bookingContext])

  // ── Navigation handler ──
  const navigate = (target: string, searchQuery?: string) => {
    // Clear AI sync state when going back to search
    if (target === 'home') {
      setMentionedFlightId(null)
      setSelectedFlight(null)
      if (searchQuery) setPendingSearch(searchQuery)
    }
    setPage(target as Page)
  }

  // ── Auth handlers ──
  const handleSignInSuccess = ({
    email,
    remember,
    accessToken,
    refreshToken,
  }: {
    email: string
    remember: boolean
    accessToken: string
    refreshToken: string
  }) => {
    const nextSession: AuthSession = {
      email,
      signedInAt: new Date().toISOString(),
      accessToken,
      refreshToken,
    }
    if (remember) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextSession))
      sessionStorage.removeItem(AUTH_KEY)
    } else {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(nextSession))
      localStorage.removeItem(AUTH_KEY)
    }
    setSession(nextSession)
    setPage('home')
  }

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(PAGE_KEY)
    localStorage.removeItem(CHAT_KEY)
    localStorage.removeItem(BOOKING_KEY)
    sessionStorage.clear()
    setSession(null)
    setMessages([makeWelcomeMessage()])
    setConfirmedBooking(null)
    setBookingContext(null)
    setPage('login')
  }

  // ── Chat handlers ──
  const clearChat = () => {
    const fresh = [makeWelcomeMessage()]
    setMessages(fresh)
    localStorage.setItem(CHAT_KEY, JSON.stringify(fresh))
  }

  // ── Booking handlers ──
  const handleBookingComplete = (booking: BookingRead) => {
    setConfirmedBooking(booking)
    // Add confirmation message to shared chat
    setMessages(prev => [
      ...prev,
      {
        id: `booking-${Date.now()}`,
        role: 'assistant' as const,
        content: `Your flight booking is confirmed! Reference: **${booking.booking_reference}**. Confirmation sent to ${booking.contact_email}. Is there anything else I can help you with for your journey?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setPage('confirm')
  }

  // ── Shared CompanionPanel props ──
  const sharedChat = {
    messages,
    setMessages,
    onClearChat: clearChat,
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      {page === 'login' && (
        <LoginPage onSignInSuccess={handleSignInSuccess} />
      )}

      {page === 'home' && (
        <HomePage
          userEmail={session?.email}
          accessToken={session?.accessToken}
          onOpenProfile={() => setPage('home')}
          onSignOut={handleSignOut}
          onNavigate={navigate}
          flightResults={flightResults}
          setFlightResults={setFlightResults}
          rawFlightResults={rawFlightResults}
          setRawFlightResults={setRawFlightResults}
          showFlightResults={showFlightResults}
          setShowFlightResults={setShowFlightResults}
          selectedFlightId={selectedFlightId}
          setSelectedFlightId={setSelectedFlightId}
          flightRoute={flightRoute}
          setFlightRoute={setFlightRoute}
          setPassengerCount={setPassengerCount}
          mentionedFlightId={mentionedFlightId}
          setMentionedFlightId={setMentionedFlightId}
          setSelectedFlight={setSelectedFlight}
          pendingSearch={pendingSearch}
          onPendingSearchConsumed={() => setPendingSearch(null)}
          {...sharedChat}
        />
      )}

      {page === 'booking' && bookingContext && (
        <BookingPage
          flight={bookingContext.flight}
          passengerCount={bookingContext.passengerCount}
          accessToken={session?.accessToken}
          userEmail={session?.email}
          onBack={() => setPage('home')}
          onBookingComplete={handleBookingComplete}
          onNavigate={navigate}
          {...sharedChat}
        />
      )}

      {/* If booking page is requested but context lost (e.g. refresh), go home */}
      {page === 'booking' && !bookingContext && (
        <HomePage
          userEmail={session?.email}
          accessToken={session?.accessToken}
          onOpenProfile={() => setPage('home')}
          onSignOut={handleSignOut}
          onNavigate={navigate}
          flightResults={flightResults}
          setFlightResults={setFlightResults}
          rawFlightResults={rawFlightResults}
          setRawFlightResults={setRawFlightResults}
          showFlightResults={showFlightResults}
          setShowFlightResults={setShowFlightResults}
          selectedFlightId={selectedFlightId}
          setSelectedFlightId={setSelectedFlightId}
          flightRoute={flightRoute}
          setFlightRoute={setFlightRoute}
          setPassengerCount={setPassengerCount}
          mentionedFlightId={mentionedFlightId}
          setMentionedFlightId={setMentionedFlightId}
          setSelectedFlight={setSelectedFlight}
          pendingSearch={pendingSearch}
          onPendingSearchConsumed={() => setPendingSearch(null)}
          {...sharedChat}
        />
      )}

      {page === 'plan' && (
        <PlanPage
          userEmail={session?.email}
          accessToken={session?.accessToken}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          selectedFlight={selectedFlight}
          passengerCount={passengerCount}
          setConfirmedBooking={setConfirmedBooking}
          {...sharedChat}
        />
      )}

      {page === 'confirm' && (
        <ConfirmPage
          bookingData={confirmedBooking ?? undefined}
          userEmail={session?.email}
          accessToken={session?.accessToken}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          {...sharedChat}
        />
      )}
    </div>
  )
}
