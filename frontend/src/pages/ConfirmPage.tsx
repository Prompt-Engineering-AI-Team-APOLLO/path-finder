import { useState, useEffect } from 'react';
import {
  TopNav,
  PageLayout,
  CompanionPanel,
  ConfirmationCard,
  TripSummaryItem,
  TotalCostBar,
  Badge,
  Button,
  SectionHeader,
} from '../components/ui';
import type { Message } from '../components/ui';
import type { BookingRead } from './BookingPage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/* ── Icons ── */
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z"/>
  </svg>
);
const PlaneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);
const PassportIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-1a5 5 0 0110 0v1"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const CONFIRM_STEPS = [
  { number: '01', label: 'Welcome' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

/* ── Helpers ── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─────────────────────────────────────────────
   ConfirmPage
───────────────────────────────────────────── */
interface ConfirmPageProps {
  bookingData?: BookingRead;
  userEmail?: string;
  accessToken?: string;
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function ConfirmPage({
  bookingData,
  userEmail,
  accessToken,
  onNavigate,
  messages,
  setMessages,
  onClearChat,
}: ConfirmPageProps) {

  const [isTyping, setIsTyping] = useState(false);
  const [allBookings, setAllBookings] = useState<BookingRead[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch all bookings for this account on mount
  useEffect(() => {
    const token = accessToken
      || (() => {
        const raw = localStorage.getItem('pathfinder_auth_session') || sessionStorage.getItem('pathfinder_auth_session');
        return raw ? JSON.parse(raw)?.accessToken : null;
      })();
    if (!token) return;

    setLoadingBookings(true);
    fetch(`${API_BASE}/flights/bookings`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: BookingRead[]) => {
        // Sort newest first
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setAllBookings(sorted);
      })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [accessToken]);

  const handleSend = async (text: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Detect search / new flight intent → navigate home
    const searchPattern = /\b(find|search|look|show|get)\b.{0,40}\b(flight|flights|ticket|tickets)\b|\b(search|find|look|show).{0,20}(more|again|different|other|else|alternatives|new|another)|(go back|new search|start over|search more|find me a flight)\b/i;
    if (searchPattern.test(text)) {
      setMessages(prev => [
        ...prev,
        { id: String(Date.now()), role: 'user' as const, content: text, timestamp: ts },
        { id: String(Date.now() + 1), role: 'assistant' as const, content: "Sure! Taking you back to search for flights.", timestamp: ts },
      ]);
      setTimeout(() => onNavigate?.('home'), 800);
      return;
    }

    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: ts };
    const assistantId = String(Date.now() + 1);
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', timestamp: ts };

    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, assistantMsg]);
    setIsTyping(true);

    try {
      const sessionRaw = localStorage.getItem('pathfinder_auth_session') || sessionStorage.getItem('pathfinder_auth_session');
      const token = sessionRaw ? JSON.parse(sessionRaw)?.accessToken : null;

      const res = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const rawChunk = line.slice(6);
          if (rawChunk === '[DONE]') break;
          let chunk: string;
          try { chunk = JSON.parse(rawChunk); } catch { chunk = rawChunk; }
          fullResponse += chunk;
          setMessages((prev: Message[]) =>
            prev.map((m: Message) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          );
        }
      }

      // If agent response itself suggests searching, navigate home after reading it
      const agentSuggestsSearch = /\b(search|find|look).{0,30}(flight|new trip|another)\b/i.test(fullResponse);
      if (agentSuggestsSearch) {
        setTimeout(() => onNavigate?.('home'), 2000);
      }

    } catch {
      setMessages((prev: Message[]) =>
        prev.map((m: Message) =>
          m.id === assistantId ? { ...m, content: 'Sorry, something went wrong. Please try again.' } : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  /* ── Left panel ── */
  const leftPanel = (
    <CompanionPanel
      messages={messages}
      onSendMessage={handleSend}
      onClearChat={onClearChat}
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Personal Concierge"
      headerIcon={<SparkleIcon />}
      inputPlaceholder='Say "find flights" to search again...'
      isTyping={isTyping}
      inputLoading={isTyping}
      inputDisabled={isTyping}
      quickActionsLabel="Quick Actions"
      quickActions={[
        { icon: <PassportIcon />, label: 'Check Visa Requirements' },
        { icon: <DownloadIcon />, label: 'Download Itinerary' },
        { icon: <StarIcon />, label: 'Find new flights', onClick: () => onNavigate?.('home') },
      ]}
    />
  );

  /* ── Derived: use API-fetched list or fall back to single prop ── */
  const displayBookings = allBookings.length > 0 ? allBookings : (bookingData ? [bookingData] : []);
  const latestBooking = displayBookings[0] ?? null;
  const olderBookings = displayBookings.slice(1);
  const totalSpend = displayBookings.reduce((sum, b) => sum + b.total_price, 0);

  /* ── Right panel ── */
  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
            My Bookings
          </h2>
          {displayBookings.length > 0 && (
            <Badge variant="confirmed" dot>{displayBookings.length} confirmed</Badge>
          )}
        </div>

        {loadingBookings && (
          <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)', textAlign: 'center', padding: '12px 0' }}>
            Loading bookings...
          </p>
        )}

        {displayBookings.length > 0 ? (
          displayBookings.map((b, idx) => (
            <div key={b.booking_reference} style={{ marginBottom: 14 }}>
              <TripSummaryItem
                icon={<PlaneIcon />}
                label={idx === 0 ? 'Latest · ' + b.outbound_origin + ' → ' + b.outbound_destination : b.outbound_origin + ' → ' + b.outbound_destination}
                value={fmtFullDate(b.outbound_departure_at)}
                price={b.total_price}
              />
              <div style={{
                marginTop: 6,
                padding: '8px 12px',
                background: idx === 0 ? 'var(--color-primary-subtle)' : 'var(--color-bg-surface)',
                border: `1px solid ${idx === 0 ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', fontFamily: 'monospace' }}>
                  {b.booking_reference}
                </span>
                <span style={{ color: 'var(--color-text-dark-muted)', fontSize: 10 }}>
                  {b.passenger_count} pax · {b.cabin_class.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))
        ) : !loadingBookings ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.6 }}>
              No confirmed bookings yet.
            </p>
          </div>
        ) : null}
      </div>

      <TotalCostBar
        label={displayBookings.length > 1 ? `Total Spent (${displayBookings.length} bookings)` : 'Total Cost'}
        totalPrice={totalSpend}
        subLabel={displayBookings.length > 0 ? 'All bookings · taxes & fees included' : 'No booking confirmed'}
        ctaLabel="Search More Flights"
        ctaDisabled={false}
        breakdown={displayBookings.map(b => ({
          label: `${b.outbound_airline} ${b.outbound_flight_number} (${b.passenger_count} pax)`,
          amount: b.total_price,
        }))}
      />
    </div>
  );

  /* ── Center content ── */
  return (
    <>
      <TopNav
        steps={CONFIRM_STEPS}
        currentStep={2}
        userName={bookingData?.passengers[0]
          ? `${bookingData.passengers[0].first_name} ${bookingData.passengers[0].last_name}`
          : userEmail
        }
        notificationCount={0}
        onStepClick={(i) => {
          const pages = ['home', 'home', 'confirm'];
          if (pages[i] && pages[i] !== 'confirm') onNavigate?.(pages[i]);
        }}
      />
      <PageLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftWidth={300}
        rightWidth={300}
        bg="var(--color-bg-page-light)"
      >
        <div
          className="surface-light"
          style={{ padding: '28px 28px', background: 'var(--color-bg-page-light)', minHeight: '100%' }}
        >
          {latestBooking ? (
            <>
              {/* ── Hero ── */}
              <div style={{ textAlign: 'center', marginBottom: 28, padding: '24px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-2xl)', border: '1.5px solid var(--color-green-border)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-green-bg)', border: '2px solid var(--color-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h1 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 6px' }}>
                  {displayBookings.length > 1 ? `${displayBookings.length} Bookings Confirmed!` : 'Booking Confirmed!'}
                </h1>
                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
                  {latestBooking.outbound_origin_city} → {latestBooking.outbound_destination_city} · latest booking
                </p>
                <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', fontFamily: 'monospace', margin: '8px 0 0' }}>
                  Ref: {latestBooking.booking_reference}
                </p>
              </div>

              {/* ── Latest booking detail ── */}
              <SectionHeader icon={<PlaneIcon />} heading="Latest Booking" theme="light" />
              <div style={{ marginTop: 14, marginBottom: 24 }}>
                <ConfirmationCard
                  airline={latestBooking.outbound_airline}
                  flightNumber={latestBooking.outbound_flight_number}
                  cabinClass={latestBooking.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  departureTime={fmtTime(latestBooking.outbound_departure_at)}
                  departureCode={latestBooking.outbound_origin}
                  departureCity={latestBooking.outbound_origin_city}
                  arrivalTime={fmtTime(latestBooking.outbound_arrival_at)}
                  arrivalCode={latestBooking.outbound_destination}
                  arrivalCity={latestBooking.outbound_destination_city}
                  duration={fmtDuration(latestBooking.outbound_duration_minutes)}
                  date={fmtFullDate(latestBooking.outbound_departure_at)}
                  bookingRef={latestBooking.booking_reference}
                />
              </div>

              {/* ── Passengers for latest booking ── */}
              <SectionHeader icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              } heading="Passengers" theme="light" />
              <div style={{ marginTop: 14, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {latestBooking.passengers.map((p, i) => (
                  <div key={i} style={{ padding: '16px 20px', background: 'var(--color-bg-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '1.5px solid var(--color-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{i + 1}</span>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0 }}>{p.first_name} {p.last_name}</p>
                      <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '3px 0 0' }}>
                        DOB: {p.date_of_birth}{p.nationality ? ` · ${p.nationality}` : ''}{p.passport_number ? ` · ${p.passport_number}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Previous bookings ── */}
              {olderBookings.length > 0 && (
                <>
                  <SectionHeader icon={<PlaneIcon />} heading={`Previous Bookings (${olderBookings.length})`} theme="light" />
                  <div style={{ marginTop: 14, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {olderBookings.map(b => (
                      <div key={b.booking_reference} style={{ padding: '16px 20px', background: 'var(--color-bg-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                            </div>
                            <div>
                              <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>{b.outbound_airline} {b.outbound_flight_number}</p>
                              <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '1px 0 0' }}>{b.outbound_origin} → {b.outbound_destination} · {fmtFullDate(b.outbound_departure_at)}</p>
                            </div>
                          </div>
                          <Badge variant="confirmed">Confirmed</Badge>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', fontFamily: 'monospace' }}>{b.booking_reference}</span>
                          <span style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
                            {b.passenger_count} pax · ${b.total_price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Actions ── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Button variant="primary" size="md" icon={<DownloadIcon />} iconPosition="left">
                  Download Itinerary
                </Button>
                <Button variant="secondary" size="md">Share Trip</Button>
                <Button variant="ghost" size="md" onClick={() => onNavigate?.('home')}>
                  Search More Flights
                </Button>
              </div>
            </>
          ) : !loadingBookings ? (
            /* ── Empty state ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg-surface)', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark-muted)' }}>
                <SearchIcon />
              </div>
              <div>
                <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: '0 0 8px' }}>No Bookings Yet</h2>
                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 24px', maxWidth: 340, lineHeight: 1.6 }}>
                  Search for a flight and complete a booking to see your confirmations here.
                </p>
                <Button variant="primary" size="md" onClick={() => onNavigate?.('home')}>Search Flights →</Button>
              </div>
            </div>
          ) : null}
        </div>
      </PageLayout>
    </>
  );
}
