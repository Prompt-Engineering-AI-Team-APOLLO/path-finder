import { useState } from 'react';
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
const BedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 4v16M2 8h18a2 2 0 012 2v8H2M2 12h20"/>
  </svg>
);
const CompassIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
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

/* ── Static conversation ── */
const CONFIRM_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "🎉 Incredible choice! Your trip to Tokyo is officially confirmed. I've already added the Mt. Fuji tour to your digital itinerary. Is there anything else I can help you prepare for your journey?",
    timestamp: 'Just now',
  },
];

const CONFIRM_STEPS = [
  { number: '01', label: 'Explore' },
  { number: '02', label: 'Bookings' },
  { number: '03', label: 'Confirm' },
];

/* ── Confirmed hotel mini card ── */
function HotelConfirmCard() {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1.5px solid var(--color-green-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Placeholder hotel image gradient */}
      <div style={{ height: 80, background: 'linear-gradient(135deg, #1a2a4a 0%, #0d3040 100%)', position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.25 }}>🏨</div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Badge variant="confirmed" dot>Confirmed</Badge>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: '0 0 2px' }}>
          Park Hyatt Tokyo
        </p>
        <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '0 0 8px' }}>
          Shinjuku · Deluxe King · 4 nights
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-text-dark-muted)', fontSize: 'var(--text-xs)' }}>Oct 12 – 16</span>
          <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>$1,840</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ConfirmPage
───────────────────────────────────────────── */

interface ConfirmPageProps {
  bookingData?: BookingRead;
  userEmail?: string;
}

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

export default function ConfirmPage({ bookingData, userEmail }: ConfirmPageProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (bookingData) {
      return [
        {
          id: '1',
          role: 'assistant',
          content: `Your booking is confirmed! Reference: **${bookingData.booking_reference}**. Your confirmation has been sent to ${bookingData.contact_email}. Is there anything else I can help you with for your journey?`,
          timestamp: 'Just now',
        },
      ];
    }
    return CONFIRM_MESSAGES;
  });

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
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Personal Concierge"
      headerIcon={<SparkleIcon />}
      inputPlaceholder="Ask anything about your trip..."
      quickActionsLabel="Quick Actions"
      quickActions={[
        { icon: <PassportIcon />, label: 'Check Visa Requirements' },
        { icon: <DownloadIcon />, label: 'Download Itinerary' },
        { icon: <StarIcon />, label: 'Hotel Upgrade' },
      ]}
    />
  );

  /* ── Derive display values from real or fallback data ── */
  const bookingRef = bookingData?.booking_reference ?? 'PF-TYO-2024-8821';
  const contactEmail = bookingData?.contact_email ?? 'voyager@example.com';
  const flightPrice = bookingData?.total_price ?? 2890;

  /* ── Right panel ── */
  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
            Trip Summary
          </h2>
          <Badge variant="confirmed" dot>All Confirmed</Badge>
        </div>

        <TripSummaryItem
          icon={<PlaneIcon />}
          label="Flights"
          value={bookingData
            ? `${bookingData.outbound_origin} → ${bookingData.outbound_destination} · ${fmtFullDate(bookingData.outbound_departure_at)}`
            : 'LHR → HND · Oct 12'
          }
          price={flightPrice}
        />

        {!bookingData && (
          <>
            <TripSummaryItem
              icon={<BedIcon />}
              label="Accommodation"
              value="Park Hyatt Tokyo · 4 nights"
              price={1840}
            />
            <TripSummaryItem
              icon={<CompassIcon />}
              label="Activities"
              value="Mt. Fuji Private Tour"
              price={320}
              expandable
            >
              <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
                Full-day private guided tour with transport
              </p>
            </TripSummaryItem>
          </>
        )}

        {/* Booking reference block */}
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
            {bookingRef}
          </p>
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: '4px 0 0' }}>
            Confirmation sent to {contactEmail}
          </p>
        </div>

        {/* Passenger list (real booking only) */}
        {bookingData && bookingData.passengers.length > 0 && (
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
      </div>

      <TotalCostBar
        label="Total Cost"
        totalPrice={bookingData ? flightPrice : 5050}
        subLabel={bookingData ? `${bookingData.passenger_count} passenger${bookingData.passenger_count > 1 ? 's' : ''} · taxes & fees included` : 'All inclusive · taxes & fees'}
        ctaLabel="Download PDF"
        breakdown={bookingData
          ? [{ label: `${bookingData.outbound_airline} ${bookingData.outbound_flight_number} (${bookingData.passenger_count} pax)`, amount: flightPrice }]
          : [
              { label: 'Business Class Flights', amount: 2890 },
              { label: 'Park Hyatt Tokyo (4 nights)', amount: 1840 },
              { label: 'Mt. Fuji Private Tour', amount: 320 },
            ]
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
        userName={bookingData?.passengers[0] ? `${bookingData.passengers[0].first_name} ${bookingData.passengers[0].last_name}` : userEmail ?? 'Alex Morgan'}
        notificationCount={1}
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
          {/* Confirmation hero */}
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
              {bookingData
                ? `Your flight from ${bookingData.outbound_origin_city} to ${bookingData.outbound_destination_city} is confirmed. Ref: ${bookingData.booking_reference}`
                : 'Your Tokyo journey is all set. Have an extraordinary trip, Alex.'
              }
            </p>
          </div>

          {/* Flight confirmation card */}
          <SectionHeader
            icon={<PlaneIcon />}
            heading="Your Flight"
            theme="light"
          />
          <div style={{ marginTop: 14, marginBottom: 24 }}>
            <ConfirmationCard
              airline={bookingData?.outbound_airline ?? 'Japan Airlines'}
              flightNumber={bookingData?.outbound_flight_number ?? 'JP 448'}
              cabinClass={bookingData
                ? bookingData.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : 'Business Class'
              }
              departureTime={bookingData ? fmtTime(bookingData.outbound_departure_at) : '13:50'}
              departureCode={bookingData?.outbound_origin ?? 'LHR'}
              departureCity={bookingData?.outbound_origin_city ?? 'London Heathrow'}
              arrivalTime={bookingData ? fmtTime(bookingData.outbound_arrival_at) : '09:35'}
              arrivalCode={bookingData?.outbound_destination ?? 'HND'}
              arrivalCity={bookingData?.outbound_destination_city ?? 'Tokyo Haneda'}
              duration={bookingData ? fmtDuration(bookingData.outbound_duration_minutes) : '11h 45m'}
              date={bookingData ? fmtFullDate(bookingData.outbound_departure_at) : '12 October 2024'}
              bookingRef={bookingData?.booking_reference ?? 'JL-2024-8821'}
            />
          </div>

          {/* Hotel card */}
          <SectionHeader
            icon={<BedIcon />}
            heading="Your Hotel"
            theme="light"
          />
          <div style={{ marginTop: 14, marginBottom: 24 }}>
            <HotelConfirmCard />
          </div>

          {/* Activities */}
          <SectionHeader
            icon={<CompassIcon />}
            heading="Activities"
            theme="light"
          />
          <div
            style={{
              marginTop: 14,
              padding: '16px',
              background: 'var(--color-bg-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, #2a4a2a 0%, #1a3a1a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                🗻
              </div>
              <div style={{ marginLeft: 14 }}>
                <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: '0 0 2px' }}>
                  Mt. Fuji Private Tour
                </p>
                <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
                  Oct 14 · Full day · Private guide included
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <Badge variant="confirmed">Confirmed</Badge>
              <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>$320</span>
            </div>
          </div>

          {/* Actions row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button variant="primary" size="md" icon={<DownloadIcon />} iconPosition="left">
              Download Itinerary
            </Button>
            <Button variant="secondary" size="md">
              Share Trip
            </Button>
            <Button variant="ghost" size="md">
              View on Map
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
