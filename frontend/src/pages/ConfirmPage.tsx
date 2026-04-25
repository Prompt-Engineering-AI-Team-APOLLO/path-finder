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
  { number: '01', label: 'Home' },
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
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function ConfirmPage({
  bookingData,
  userEmail,
  onNavigate,
  messages,
  setMessages,
  onClearChat,
}: ConfirmPageProps) {

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
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
      inputPlaceholder="Ask anything about your trip..."
      quickActionsLabel="Quick Actions"
      quickActions={[
        { icon: <PassportIcon />, label: 'Check Visa Requirements' },
        { icon: <DownloadIcon />, label: 'Download Itinerary' },
        { icon: <StarIcon />, label: 'Search flights', onClick: () => onNavigate?.('home') },
      ]}
    />
  );

  /* ── Right panel ── */
  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
            Trip Summary
          </h2>
          {bookingData && <Badge variant="confirmed" dot>Confirmed</Badge>}
        </div>

        {bookingData ? (
          <>
            <TripSummaryItem
              icon={<PlaneIcon />}
              label="Flights"
              value={`${bookingData.outbound_origin} → ${bookingData.outbound_destination} · ${fmtFullDate(bookingData.outbound_departure_at)}`}
              price={bookingData.total_price}
            />

            {/* Booking reference */}
            <div
              style={{
                marginTop: 20,
                padding: '14px',
                background: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 6px' }}>
                Booking Reference
              </p>
              <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', fontFamily: 'monospace', margin: 0 }}>
                {bookingData.booking_reference}
              </p>
              <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '4px 0 0' }}>
                Confirmation sent to {bookingData.contact_email}
              </p>
            </div>

            {/* Passengers */}
            {bookingData.passengers.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 8px' }}>
                  Passengers
                </p>
                {bookingData.passengers.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'var(--color-primary)', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-xs)', fontWeight: 600, margin: 0 }}>
                        {p.first_name} {p.last_name}
                      </p>
                      {p.nationality && (
                        <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 10, margin: '1px 0 0' }}>{p.nationality}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* No booking state */
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.6 }}>
              No confirmed booking yet. Search for a flight to get started.
            </p>
          </div>
        )}
      </div>

      <TotalCostBar
        label="Total Cost"
        totalPrice={bookingData?.total_price ?? 0}
        subLabel={bookingData
          ? `${bookingData.passenger_count} passenger${bookingData.passenger_count > 1 ? 's' : ''} · taxes & fees included`
          : 'No booking confirmed'
        }
        ctaLabel="Download PDF"
        ctaDisabled={!bookingData}
        breakdown={bookingData
          ? [{ label: `${bookingData.outbound_airline} ${bookingData.outbound_flight_number} (${bookingData.passenger_count} pax)`, amount: bookingData.total_price }]
          : []
        }
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
          {bookingData ? (
            /* ── Confirmed booking view ── */
            <>
              {/* Hero */}
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: 28,
                  padding: '24px',
                  background: 'var(--color-bg-surface)',
                  borderRadius: 'var(--radius-2xl)',
                  border: '1.5px solid var(--color-green-border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--color-green-bg)',
                    border: '2px solid var(--color-green-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h1 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 6px' }}>
                  Booking Confirmed!
                </h1>
                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
                  Your flight from {bookingData.outbound_origin_city} to {bookingData.outbound_destination_city} is confirmed.
                </p>
                <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', fontFamily: 'monospace', margin: '8px 0 0' }}>
                  Ref: {bookingData.booking_reference}
                </p>
              </div>

              {/* Flight confirmation card */}
              <SectionHeader icon={<PlaneIcon />} heading="Your Flight" theme="light" />
              <div style={{ marginTop: 14, marginBottom: 24 }}>
                <ConfirmationCard
                  airline={bookingData.outbound_airline}
                  flightNumber={bookingData.outbound_flight_number}
                  cabinClass={bookingData.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  departureTime={fmtTime(bookingData.outbound_departure_at)}
                  departureCode={bookingData.outbound_origin}
                  departureCity={bookingData.outbound_origin_city}
                  arrivalTime={fmtTime(bookingData.outbound_arrival_at)}
                  arrivalCode={bookingData.outbound_destination}
                  arrivalCity={bookingData.outbound_destination_city}
                  duration={fmtDuration(bookingData.outbound_duration_minutes)}
                  date={fmtFullDate(bookingData.outbound_departure_at)}
                  bookingRef={bookingData.booking_reference}
                />
              </div>

              {/* Passengers */}
              <SectionHeader icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              } heading="Passengers" theme="light" />
              <div style={{ marginTop: 14, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bookingData.passengers.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '16px 20px',
                      background: 'var(--color-bg-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--color-primary-subtle)',
                        border: '1.5px solid var(--color-primary-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{i + 1}</span>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
                        {p.first_name} {p.last_name}
                      </p>
                      <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '3px 0 0' }}>
                        DOB: {p.date_of_birth}
                        {p.nationality ? ` · ${p.nationality}` : ''}
                        {p.passport_number ? ` · ${p.passport_number}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Button variant="primary" size="md" icon={<DownloadIcon />} iconPosition="left">
                  Download Itinerary
                </Button>
                <Button variant="secondary" size="md">
                  Share Trip
                </Button>
                <Button variant="ghost" size="md" onClick={() => onNavigate?.('home')}>
                  Search More Flights
                </Button>
              </div>
            </>
          ) : (
            /* ── Empty state: no booking yet ── */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--color-bg-surface)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-dark-muted)',
                }}
              >
                <SearchIcon />
              </div>
              <div>
                <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: '0 0 8px' }}>
                  No Booking Yet
                </h2>
                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 24px', maxWidth: 340, lineHeight: 1.6 }}>
                  Search for a flight, select your preferred option, and complete the booking form to see your confirmation here.
                </p>
                <Button variant="primary" size="md" onClick={() => onNavigate?.('home')}>
                  Search Flights →
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    </>
  );
}
