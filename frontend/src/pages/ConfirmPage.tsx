import { useState, useEffect } from 'react';
import {
  TopNav,
  PageLayout,
  CompanionPanel,
  ConfirmationCard,
  TotalCostBar,
  Badge,
  Button,
  SectionHeader,
  BookingDetailModal,
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
const SearchSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
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
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusStyle(status: string): { color: string; bg: string; border: string; label: string } {
  if (status === 'cancelled') return { color: '#E53E3E', bg: 'rgba(229,62,62,0.1)', border: 'rgba(229,62,62,0.3)', label: 'Cancelled' };
  if (status === 'modified')  return { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.3)', label: 'Modified' };
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: 'Confirmed' };
}

/* ─────────────────────────────────────────────
   ConfirmPage
───────────────────────────────────────────── */
interface ConfirmPageProps {
  bookingData?: BookingRead;
  userEmail?: string;
  accessToken?: string;
  onNavigate?: (page: string, searchQuery?: string) => void;
  onSignOut?: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function ConfirmPage({
  bookingData,
  userEmail,
  accessToken,
  onNavigate,
  onSignOut,
  messages,
  setMessages,
  onClearChat,
}: ConfirmPageProps) {

  const [isTyping, setIsTyping] = useState(false);
  const [allBookings, setAllBookings] = useState<BookingRead[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [detailBooking, setDetailBooking] = useState<BookingRead | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchBookings = () => {
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
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setAllBookings(sorted);
      })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  };

  // Fetch all bookings on mount
  useEffect(() => {
    fetchBookings();
  }, [accessToken]); // re-fetch when token changes (e.g. after login)

  // Open modal with a fresh API fetch so details are always up-to-date
  const openDetail = (ref: string) => {
    const raw = localStorage.getItem('pathfinder_auth_session') || sessionStorage.getItem('pathfinder_auth_session');
    const token = accessToken || (raw ? JSON.parse(raw)?.accessToken : null);

    // Show modal immediately with whatever we have in local state (instant feedback)
    const cached = allBookings.find(b => b.booking_reference === ref) ?? null;
    setDetailBooking(cached);
    setLoadingDetail(true);

    fetch(`${API_BASE}/flights/bookings/${ref}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.ok ? r.json() : null)
      .then((fresh: BookingRead | null) => {
        if (fresh) {
          setDetailBooking(fresh);
          // Also update the entry in allBookings so the list reflects the latest status
          setAllBookings(prev => prev.map(b => b.booking_reference === fresh.booking_reference ? fresh : b));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  };

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
      setTimeout(() => onNavigate?.('home', text), 800);
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

      // If the agent mentioned any booking reference, re-fetch the list to pick up
      // status changes (cancelled, modified, etc.) reliably — no fragile text matching.
      const mentionsBookingRef = /\bPF-[A-Z0-9]{4,10}\b/.test(fullResponse);
      if (mentionsBookingRef) {
        setTimeout(() => fetchBookings(), 800);
      }

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

  /* ── Derived ── */
  const displayBookings = allBookings.length > 0 ? allBookings : (bookingData ? [bookingData] : []);
  // Latest = most recent non-cancelled booking; fall back to the very latest if all are cancelled
  const latestBooking = displayBookings.find(b => b.status !== 'cancelled') ?? displayBookings[0] ?? null;
  const olderBookings = displayBookings.filter(b => b !== latestBooking);
  const activeBookings = displayBookings.filter(b => b.status !== 'cancelled');
  const confirmedCount = activeBookings.length;
  // Exclude cancelled bookings from total spend
  const totalSpend = activeBookings.reduce((sum, b) => sum + b.total_price, 0);

  /* ── Right panel ── */
  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
            My Bookings
          </h2>
          {confirmedCount > 0 && (
            <Badge variant="confirmed" dot>{confirmedCount} confirmed</Badge>
          )}
        </div>

        {loadingBookings && (
          <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)', textAlign: 'center', padding: '12px 0' }}>
            Loading bookings...
          </p>
        )}

        {displayBookings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayBookings.map((b, idx) => {
              const ss = statusStyle(b.status);
              const isCancelled = b.status === 'cancelled';
              return (
                <button
                  key={b.booking_reference}
                  type="button"
                  onClick={() => openDetail(b.booking_reference)}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '12px 14px',
                    background: isCancelled ? 'rgba(229,62,62,0.04)' : idx === 0 ? 'var(--color-primary-subtle)' : 'var(--color-bg-surface)',
                    border: `1.5px solid ${isCancelled ? 'rgba(229,62,62,0.25)' : idx === 0 ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    transition: 'var(--transition-base)',
                    opacity: isCancelled ? 0.75 : 1,
                  }}
                  className="group hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-card-hover)]"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {idx === 0 && !isCancelled && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 'var(--radius-full)',
                            background: 'var(--color-primary)', color: 'white',
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
                          }}>Latest</span>
                        )}
                        <span style={{
                          padding: '1px 7px', borderRadius: 'var(--radius-full)',
                          background: ss.bg, border: `1px solid ${ss.border}`,
                          color: ss.color, fontSize: 9, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>{ss.label}</span>
                      </div>
                      <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        {b.outbound_origin} → {b.outbound_destination}
                      </p>
                      <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '2px 0 0' }}>
                        {b.outbound_airline} · {fmtShortDate(b.outbound_departure_at)}
                      </p>
                      <p style={{ color: idx === 0 && !isCancelled ? 'var(--color-primary)' : 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'monospace', margin: '4px 0 0' }}>
                        {b.booking_reference}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ color: isCancelled ? 'var(--color-text-dark-muted)' : 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 700, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        ${b.total_price.toLocaleString()}
                      </span>
                      <span style={{ color: 'var(--color-text-dark-muted)', fontSize: 10 }}>
                        {b.passenger_count} pax
                      </span>
                      <span style={{ color: 'var(--color-text-dark-muted)' }} className="group-hover:text-[var(--color-primary)]">
                        <ChevronIcon />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : !loadingBookings ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.6 }}>
              No confirmed bookings yet.
            </p>
          </div>
        ) : null}
      </div>

      <TotalCostBar
        label={activeBookings.length > 1 ? `Total Spent (${activeBookings.length} active)` : 'Total Cost'}
        totalPrice={totalSpend}
        subLabel={activeBookings.length > 0 ? 'Active bookings only · taxes & fees included' : 'No active bookings'}
        ctaLabel="Search More Flights"
        onCta={() => onNavigate?.('home')}
        ctaDisabled={false}
        breakdown={activeBookings.map(b => ({
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
        userName={userEmail}
        notificationCount={0}
        onSignOut={onSignOut}
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
              {(() => {
                const lss = statusStyle(latestBooking.status);
                const heroIcon = latestBooking.status === 'cancelled'
                  ? <path d="M18 6L6 18M6 6l12 12" />
                  : latestBooking.status === 'modified'
                    ? <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                    : <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>;
                const heroTitle = latestBooking.status === 'cancelled'
                  ? 'Booking Cancelled'
                  : latestBooking.status === 'modified'
                    ? 'Booking Modified'
                    : confirmedCount > 1 ? `${confirmedCount} Bookings Confirmed!` : 'Booking Confirmed!';
                return (
                  <div style={{ textAlign: 'center', marginBottom: 28, padding: '24px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-2xl)', border: `1.5px solid ${lss.border}`, boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: lss.bg, border: `2px solid ${lss.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={lss.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {heroIcon}
                      </svg>
                    </div>
                    <h1 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 6px' }}>
                      {heroTitle}
                    </h1>
                    <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
                      {latestBooking.outbound_origin_city} → {latestBooking.outbound_destination_city} · {latestBooking.status}
                    </p>
                    <p style={{ color: lss.color, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', fontFamily: 'monospace', margin: '8px 0 0' }}>
                      Ref: {latestBooking.booking_reference}
                    </p>
                  </div>
                );
              })()}

              {/* ── Latest booking detail ── */}
              <SectionHeader icon={<PlaneIcon />} heading={`Latest Booking · ${statusStyle(latestBooking.status).label}`} theme="light" />
              <div style={{ marginTop: 14, marginBottom: 8 }}>
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
              <div style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => latestBooking && openDetail(latestBooking.booking_reference)}
                  style={{
                    width: '100%', padding: '10px', marginTop: 8,
                    background: 'none', border: '1px dashed var(--color-border-medium)',
                    borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    color: 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'var(--transition-base)',
                  }}
                  className="hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-subtle)]"
                >
                  View Full Details & Passenger Info
                  <ChevronIcon />
                </button>
              </div>

              {/* ── Previous bookings ── */}
              {olderBookings.length > 0 && (
                <>
                  <SectionHeader icon={<PlaneIcon />} heading={`Previous Bookings (${olderBookings.length})`} theme="light" />
                  <div style={{ marginTop: 14, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {olderBookings.map(b => {
                      const ss = statusStyle(b.status);
                      const isCancelled = b.status === 'cancelled';
                      return (
                        <button
                          key={b.booking_reference}
                          type="button"
                          onClick={() => openDetail(b.booking_reference)}
                          style={{
                            width: '100%', textAlign: 'left', cursor: 'pointer',
                            padding: '16px 20px',
                            background: isCancelled ? 'rgba(229,62,62,0.03)' : 'var(--color-bg-surface)',
                            border: `1.5px solid ${isCancelled ? 'rgba(229,62,62,0.2)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'var(--transition-base)',
                            opacity: isCancelled ? 0.8 : 1,
                          }}
                          className="group hover:border-[var(--color-primary-border)] hover:shadow-[var(--shadow-primary)]"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: isCancelled ? '#ccc' : 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                              </div>
                              <div>
                                <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                  {b.outbound_airline} {b.outbound_flight_number}
                                </p>
                                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '2px 0 0' }}>
                                  {b.outbound_origin_city} → {b.outbound_destination_city} · {fmtShortDate(b.outbound_departure_at)}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                background: ss.bg, border: `1px solid ${ss.border}`,
                                color: ss.color, fontSize: 10, fontWeight: 700,
                              }}>{ss.label}</span>
                              <span style={{ color: 'var(--color-text-dark-muted)' }} className="group-hover:text-[var(--color-primary)]">
                                <ChevronIcon />
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                            <span style={{ color: isCancelled ? 'var(--color-text-dark-muted)' : 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'monospace' }}>{b.booking_reference}</span>
                            <span style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                              {b.passenger_count} pax · ${b.total_price.toLocaleString()}
                            </span>
                          </div>
                          <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 10, margin: '8px 0 0', fontWeight: 600 }}>
                            Click to view full details →
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Actions ── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Button variant="primary" size="md" icon={<DownloadIcon />} iconPosition="left">
                  Download Itinerary
                </Button>
                <Button variant="secondary" size="md">Share Trip</Button>
                <Button variant="secondary" size="md" icon={<SearchSmallIcon />} iconPosition="left" onClick={() => onNavigate?.('home')}>
                  Search More
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

      {/* ── Booking detail modal ── */}
      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          loading={loadingDetail}
        />
      )}
    </>
  );
}
