import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
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
type Page = 'login' | 'plan' | 'confirm' | 'booking'

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
  const stored = localStorage.getItem(PAGE_KEY)
  // Migrate legacy stored page "home" to "plan"
  if (stored === 'home') return 'plan'
  const validPages: Page[] = ['plan', 'confirm']
  // 'booking' is not restored on refresh (context lost); fallback to plan
  return stored && validPages.includes(stored as Page) ? (stored as Page) : 'plan'
}

const toIso = (value: string): string => new Date(value).toISOString()

const makeSelectionBooking = (
  outbound: FlightOffer,
  inbound: FlightOffer,
  totalPrice: number,
  currency: string,
  userEmail?: string,
): BookingRead => {
  const refSeed = `${outbound.flight_number}${inbound.flight_number}${Date.now().toString().slice(-6)}`.replace(/\s+/g, '').toUpperCase()
  const bookingReference = `PF-${refSeed.slice(0, 8)}`
  const now = new Date().toISOString()

  return {
    id: `plan-${Date.now()}`,
    booking_reference: bookingReference,
    status: 'confirmed',
    outbound_flight_number: outbound.flight_number,
    outbound_airline: outbound.airline,
    outbound_airline_code: outbound.flight_number.slice(0, 2).toUpperCase(),
    outbound_origin: outbound.origin,
    outbound_destination: outbound.destination,
    outbound_origin_city: outbound.origin_city,
    outbound_destination_city: outbound.destination_city,
    outbound_departure_at: toIso(outbound.departure_at),
    outbound_arrival_at: toIso(outbound.arrival_at),
    outbound_duration_minutes: outbound.duration_minutes,
    outbound_stops: outbound.stops,
    cabin_class: outbound.cabin_class,
    passenger_count: 1,
    total_price: totalPrice,
    currency,
    passengers: [
      {
        first_name: 'Traveler',
        last_name: 'Guest',
        date_of_birth: '1990-01-01',
        passport_number: null,
        nationality: null,
      },
    ],
    contact_email: userEmail ?? 'traveler@example.com',
    contact_phone: null,
    created_at: now,
    updated_at: now,
  }
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>(loadPage)
  const [session, setSession] = useState<AuthSession | null>(loadSession)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRead | null>(loadBooking)

  const [bookingContext] = useState<BookingContext | null>(loadBookingCtx)

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
  const navigate = (target: string) => {
    const mapped = target === 'home' ? 'plan' : target
    setPage(mapped as Page)
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
    setPage('plan')
  }

  // ── Chat handlers ──
  const clearChat = () => {
    const fresh = [makeWelcomeMessage()]
    setMessages(fresh)
    localStorage.setItem(CHAT_KEY, JSON.stringify(fresh))
  }

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

  const handlePlanConfirmSelection = ({
    outbound,
    inbound,
    totalPrice,
    currency,
  }: {
    outbound: FlightOffer
    inbound: FlightOffer
    totalPrice: number
    currency: string
  }) => {
    const booking = makeSelectionBooking(outbound, inbound, totalPrice, currency, session?.email)
    setConfirmedBooking(booking)
    setMessages(prev => [
      ...prev,
      {
        id: `plan-confirm-${Date.now()}`,
        role: 'assistant' as const,
        content: `Your trip is confirmed. Trip summary saved for ${booking.contact_email}. Please check your email for itinerary details.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
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

      {page === 'booking' && bookingContext && (
        <BookingPage
          flight={bookingContext.flight}
          passengerCount={bookingContext.passengerCount}
          accessToken={session?.accessToken}
          userEmail={session?.email}
          onBack={() => setPage('plan')}
          onBookingComplete={handleBookingComplete}
          onNavigate={navigate}
          {...sharedChat}
        />
      )}

      {/* If booking page is requested but context lost (e.g. refresh), go plan */}
      {page === 'booking' && !bookingContext && (
        <PlanPage
          userEmail={session?.email}
          onNavigate={navigate}
          onConfirmSelection={handlePlanConfirmSelection}
          {...sharedChat}
        />
      )}

      {page === 'plan' && (
        <PlanPage
          userEmail={session?.email}
          onNavigate={navigate}
          onConfirmSelection={handlePlanConfirmSelection}
          {...sharedChat}
        />
      )}

      {page === 'confirm' && (
        <ConfirmPage
          bookingData={confirmedBooking ?? undefined}
          userEmail={session?.email}
          onNavigate={navigate}
          {...sharedChat}
        />
      )}
    </div>
  )
}
