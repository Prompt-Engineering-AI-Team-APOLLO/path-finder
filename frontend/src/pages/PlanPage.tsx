import { useState, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  TopNav,
  PageLayout,
  CompanionPanel,
  TravelStyleCard,
  SectionHeader,
  FlightCard,
  EmptyState,
  TripSummaryItem,
  TotalCostBar,
  Badge,
} from '../components/ui';
import type { Message } from '../components/ui';
import type { FlightOffer, BookingRead } from './BookingPage';

/* ── Icons ── */
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
const CarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const CompassIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const SmallPlaneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);
const SmallBedIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 4v16M2 8h18a2 2 0 012 2v8H2M2 12h20"/>
  </svg>
);

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const PLAN_STEPS = [
  { number: '01', label: 'Search' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

/* ── Helpers ── */
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ── Empty hotel placeholder ── */
function NoHotelSlot() {
  return (
    <div
      style={{
        border: '1.5px dashed var(--color-border-light-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px',
        textAlign: 'center',
        color: 'var(--color-text-dark-muted)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-wider)',
        textTransform: 'uppercase',
      }}
    >
      No Hotel Selected
    </div>
  );
}

/* ─────────────────────────────────────────────
   PlanPage
───────────────────────────────────────────── */
interface PlanPageProps {
  userEmail?: string;
  accessToken?: string;
  onNavigate?: (page: string, searchQuery?: string) => void;
  onSignOut?: () => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  onClearChat?: () => void;
  // Flight selected from HomePage chat
  selectedFlight?: FlightOffer | null;
  setSelectedFlight?: (flight: FlightOffer) => void;
  selectedFlightId?: string | null;
  setSelectedFlightId?: (id: string | null) => void;
  flightResults?: FlightOffer[] | null;
  // Unfiltered full result set — used for alias index so filtering never shifts it
  rawFlightResults?: FlightOffer[] | null;
  passengerCount?: number;
  setConfirmedBooking?: (booking: BookingRead) => void;
}

export default function PlanPage({
  userEmail,
  accessToken,
  onNavigate,
  onSignOut,
  messages,
  setMessages,
  onClearChat,
  selectedFlight,
  setSelectedFlight,
  selectedFlightId,
  setSelectedFlightId,
  flightResults,
  rawFlightResults,
  passengerCount = 1,
  setConfirmedBooking,
}: PlanPageProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>('Urban Adventure');
  const [isTyping, setIsTyping] = useState(false);

  // Track which flight we've already auto-triggered for (avoid re-firing on re-render)
  const triggeredFlightRef = useRef<string | null>(null);
  // Holds the offer alias until the user provides passenger details — injected
  // invisibly into the API payload so the agent cannot book before they do.
  const pendingOfferRef = useRef<string | null>(null);
  // Index into messages[] where the current booking session started — so we
  // only send session messages to the agent (not old bookings / old chat).
  const sessionStartRef = useRef<number>(0);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getToken = () => {
    const raw = localStorage.getItem('pathfinder_auth_session') || sessionStorage.getItem('pathfinder_auth_session');
    return raw ? JSON.parse(raw)?.accessToken : (accessToken ?? null);
  };

  const handleSend = async (text: string, { skipNavCheck = false }: { skipNavCheck?: boolean } = {}) => {
    const ts = now();

    // ── "Search more" intent: navigate back to HomePage ──────────────────────
    const searchMorePattern = /\b(find|search|look|show|get)\b.{0,40}\b(flight|flights|ticket|tickets)\b|\b(search|find|look|show).{0,20}(more|again|different|other|else|alternatives|new|another)|(go back|different flight|something else|don't like|start over|new search|cancel booking|never mind)\b/i;
    if (!skipNavCheck && searchMorePattern.test(text)) {
      setMessages(prev => [
        ...prev,
        { id: String(Date.now()), role: 'user' as const, content: text, timestamp: ts },
        { id: String(Date.now() + 1), role: 'assistant' as const, content: "No problem! Taking you back to search for flights.", timestamp: ts },
      ]);
      pendingOfferRef.current = null;
      setTimeout(() => onNavigate?.('home', text), 900);
      return;
    }

    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: ts };
    const assistantId = String(Date.now() + 1);
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', timestamp: ts };

    // UI: append to full history so chat panel shows everything
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsTyping(true);

    // API: only send messages from the current booking session so the agent
    // never sees passenger details or offer_ids from previous bookings.
    const sessionMsgs = messages.slice(sessionStartRef.current);
    // Invisibly append the pending offer_id to this turn's user message.
    // The agent needs it to call book_flight but must not see it before the
    // user has provided their passenger details (i.e. in the trigger turn).
    const apiUserContent = pendingOfferRef.current
      ? `${text}\n\n[offer_id for this booking: ${pendingOfferRef.current}]`
      : text;
    const apiMessages = [
      ...sessionMsgs.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: apiUserContent },
    ];

    let fullResponse = '';

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

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

      // ── Detect booking reference in agent response ──────────────────────────
      // Pattern: PF- followed by 4-10 uppercase alphanumeric chars
      const bookingRefMatch = fullResponse.match(/\bPF-[A-Z0-9]{4,10}\b/);
      if (bookingRefMatch && setConfirmedBooking) {
        const ref = bookingRefMatch[0];
        pendingOfferRef.current = null; // offer consumed — clear so it isn't reused
        try {
          const fetchToken = getToken();
          const bookingRes = await fetch(`${API_BASE}/flights/bookings/${ref}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(fetchToken ? { Authorization: `Bearer ${fetchToken}` } : {}),
            },
          });
          if (bookingRes.ok) {
            const booking: BookingRead = await bookingRes.json();
            setConfirmedBooking(booking);
            // Brief pause so user reads the confirmation message before navigating
            setTimeout(() => onNavigate?.('confirm'), 1500);
          }
        } catch {
          // Booking fetch failed — stay on page, user can navigate manually
        }
      }

    } catch {
      setMessages((prev: Message[]) =>
        prev.map((m: Message) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // ── Auto-trigger agent when a flight is selected ──────────────────────────
  useEffect(() => {
    if (!selectedFlight) return;
    if (triggeredFlightRef.current === selectedFlight.offer_id) return;
    triggeredFlightRef.current = selectedFlight.offer_id;

    // Use ISO date directly to avoid timezone shifting from locale formatting
    const depDate = selectedFlight.departure_at.split('T')[0]; // YYYY-MM-DD
    const cabinLabel = selectedFlight.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Construct the agent alias offer_id (format matches agent_tools.py make_alias).
    // Use rawFlightResults (unfiltered, capped to 4) so filtering never shifts the
    // index — alias indices must match the agent's own [:4]-sliced result order.
    const indexSource = rawFlightResults ?? flightResults;
    const selectedIndex = indexSource
      ? (indexSource.findIndex(f => f.offer_id === selectedFlight.offer_id) + 1) || 1
      : 1;
    const offerAlias = `O${selectedIndex}:${selectedFlight.origin}:${selectedFlight.destination}:${depDate}:${selectedFlight.cabin_class}:${passengerCount}`;

    // Store the offer alias in a ref — NOT sent to the agent yet.
    // It will be invisibly appended to the user's passenger-details reply so the
    // agent has everything it needs exactly when it calls book_flight, but cannot
    // act before the user has provided their details.
    pendingOfferRef.current = offerAlias;

    // Brief display message shown in chat — user-friendly only
    const displayText = `I'd like to book ${selectedFlight.airline} ${selectedFlight.flight_number} — ${selectedFlight.origin} → ${selectedFlight.destination} on ${depDate}.`;

    // Agent instruction: flight info only, NO offer_id (so agent cannot book yet)
    const agentText =
      `I've selected this flight and need help booking it:\n` +
      `- ${selectedFlight.airline} ${selectedFlight.flight_number}\n` +
      `- ${selectedFlight.origin_city} (${selectedFlight.origin}) → ${selectedFlight.destination_city} (${selectedFlight.destination})\n` +
      `- Departure: ${formatTime(selectedFlight.departure_at)} · Arrival: ${formatTime(selectedFlight.arrival_at)}\n` +
      `- Date: ${depDate} · ${cabinLabel} · ${passengerCount} passenger(s) · $${selectedFlight.price_per_person}/person\n\n` +
      `Please ask me for my passenger details: first_name and last_name as SEPARATE fields, ` +
      `date_of_birth (YYYY-MM-DD format), and contact email. Do not attempt to book yet.`;

    const ts = now();
    const assistantId = String(Date.now() + 1);

    // Record where this booking session starts before adding new messages.
    // handleSend will slice messages from this index so old booking data is
    // never sent to the agent.
    setMessages(prev => {
      sessionStartRef.current = prev.length;
      return [
        ...prev,
        { id: String(Date.now()), role: 'user' as const, content: displayText, timestamp: ts },
        { id: assistantId, role: 'assistant' as const, content: '', timestamp: ts },
      ];
    });
    setIsTyping(true);

    // Fresh single-message call — agent has no prior history at all for this turn
    const token = getToken();
    fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: agentText }] }),
    })
      .then(async res => {
        if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
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
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m));
          }
        }
      })
      .catch(() => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: 'Sorry, something went wrong. Please try again.' } : m
        ));
      })
      .finally(() => setIsTyping(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlight?.offer_id]);

  /* ── Derived display values ── */
  const flightPrice = selectedFlight ? selectedFlight.total_price : 0;
  const activityPrice = 320;
  const totalCost = flightPrice + activityPrice;

  const routeLabel = selectedFlight
    ? `${selectedFlight.origin_city} (${selectedFlight.origin}) → ${selectedFlight.destination_city} (${selectedFlight.destination})`
    : 'No flight selected';

  const flightDetailLabel = selectedFlight
    ? `${selectedFlight.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · ${new Date(selectedFlight.departure_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  /* ── Left panel ── */
  const leftPanel = (
    <CompanionPanel
      messages={messages}
      onSendMessage={handleSend}
      onClearChat={onClearChat}
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Travel Curator"
      isOnline={true}
      isTyping={isTyping}
      inputLoading={isTyping}
      inputDisabled={isTyping}
      inputPlaceholder={selectedFlight ? "Provide passenger details or ask anything..." : "Ask your companion..."}
      quickActions={[
        { icon: <SmallPlaneIcon />, label: 'Search other flights', onClick: () => onNavigate?.('home') },
        { icon: <SmallBedIcon />, label: 'Suggest 5-star hotels', onClick: () => handleSend('Can you suggest some great hotels near the destination?') },
      ]}
    />
  );

  /* ── Right panel (Trip Summary) ── */
  const rightPanel = (
    <div className="surface-light" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page-light)' }}>
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 16px' }}>
          Trip Summary
        </h2>

        {/* Flights */}
        <TripSummaryItem
          icon={<PlaneIcon />}
          label="Flights"
          value={routeLabel}
          price={selectedFlight ? flightPrice : undefined}
        >
          {flightDetailLabel && (
            <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
              {flightDetailLabel}
            </p>
          )}
        </TripSummaryItem>

        {/* Hotel */}
        <TripSummaryItem icon={<BedIcon />} label="Accommodation" value="No hotel selected yet">
          <NoHotelSlot />
        </TripSummaryItem>

        {/* Transport */}
        <TripSummaryItem icon={<CarIcon />} label="Transportation" value="Not added" />

        {/* Activities */}
        <TripSummaryItem
          icon={<CompassIcon />}
          label="Activities"
          value="Mt. Fuji Private Tour"
          price={activityPrice}
          expandable
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
              Full-day guided tour with private transport
            </p>
            <Badge variant="confirmed">Included</Badge>
          </div>
        </TripSummaryItem>
      </div>

      {/* Total bar pinned to bottom */}
      <div style={{ flex: 1 }} />
      <TotalCostBar
        label="Total Trip Cost"
        totalPrice={totalCost}
        subLabel="Inc. taxes & fees"
        ctaLabel={selectedFlight ? "Confirm via Chat →" : "Select a flight first"}
        ctaDisabled={!selectedFlight}
        breakdown={selectedFlight ? [
          { label: `${selectedFlight.airline} ${selectedFlight.flight_number} (${passengerCount} pax)`, amount: flightPrice },
          { label: 'Mt. Fuji Tour', amount: activityPrice },
        ] : []}
      />
    </div>
  );

  /* ── Center content ── */
  return (
    <>
      <TopNav
        steps={PLAN_STEPS}
        currentStep={1}
        userName={userEmail}
        notificationCount={0}
        onSignOut={onSignOut}
        onStepClick={(i) => {
          const pages = ['home', 'plan', 'confirm'];
          if (pages[i] && pages[i] !== 'plan') onNavigate?.(pages[i]);
        }}
      />
      <PageLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftWidth={300}
        rightWidth={290}
        bg="var(--color-bg-page-light)"
      >
        <div className="surface-light" style={{ padding: '24px 28px', minHeight: '100%', background: 'var(--color-bg-page-light)' }}>

          {/* Travel style selector */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 16px' }}>
              Choose Your Travel Style
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #3B2A1A 0%, #5C3D1E 50%, #2A1A0A 100%)"
                tag="Curated"
                tagVariant="curated"
                title="Luxury Elite"
                description="Private villas, Michelin dining, chauffeur service"
                selected={selectedStyle === 'Luxury Elite'}
                onSelect={() => setSelectedStyle('Luxury Elite')}
              />
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #0D0D2E 0%, #1A0D3A 40%, #0A1A3A 100%)"
                tag="Selected"
                tagVariant="selected"
                title="Urban Adventure"
                description="Rooftop bars, street food, cultural deep dives"
                selected={selectedStyle === 'Urban Adventure'}
                onSelect={() => setSelectedStyle('Urban Adventure')}
              />
              <TravelStyleCard
                imageCss="linear-gradient(160deg, #0A2A1A 0%, #1A3A0A 50%, #0A1A0A 100%)"
                tag="Escape"
                tagVariant="escape"
                title="Zen Nature"
                description="Ryokans, onsen, forest hikes, sacred shrines"
                selected={selectedStyle === 'Zen Nature'}
                onSelect={() => setSelectedStyle('Zen Nature')}
              />
            </div>
          </div>

          {/* Flight options */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader
              icon={<PlaneIcon />}
              heading={flightResults && flightResults.length > 0 ? 'Available Flights' : 'Your Selected Flight'}
              subheading={
                flightResults && flightResults.length > 0
                  ? `${flightResults.length} option${flightResults.length > 1 ? 's' : ''} found — select one to book`
                  : selectedFlight ? routeLabel : 'No flight selected yet'
              }
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {flightResults && flightResults.length > 0 ? (
                flightResults.map((f, i) => {
                  const isSelected = f.offer_id === (selectedFlightId ?? selectedFlight?.offer_id);
                  return (
                    <div
                      key={f.offer_id}
                      onClick={() => {
                        setSelectedFlight?.(f);
                        setSelectedFlightId?.(f.offer_id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <FlightCard
                        airline={f.airline}
                        flightNumber={f.flight_number}
                        cabinClass={f.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        departureTime={formatTime(f.departure_at)}
                        departureCode={f.origin}
                        arrivalTime={formatTime(f.arrival_at)}
                        arrivalCode={f.destination}
                        duration={formatDuration(f.duration_minutes)}
                        stops={f.stops}
                        price={f.price_per_person}
                        currency={f.currency}
                        recommended={i === 0}
                        selected={isSelected}
                      />
                    </div>
                  );
                })
              ) : selectedFlight ? (
                <FlightCard
                  airline={selectedFlight.airline}
                  flightNumber={selectedFlight.flight_number}
                  cabinClass={selectedFlight.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  departureTime={formatTime(selectedFlight.departure_at)}
                  departureCode={selectedFlight.origin}
                  arrivalTime={formatTime(selectedFlight.arrival_at)}
                  arrivalCode={selectedFlight.destination}
                  duration={formatDuration(selectedFlight.duration_minutes)}
                  stops={selectedFlight.stops}
                  price={selectedFlight.price_per_person}
                  currency={selectedFlight.currency}
                  recommended
                  selected
                />
              ) : (
                <EmptyState
                  icon={<SearchIcon />}
                  message="No flight selected"
                  description="Go back to search and select a flight to continue with booking."
                />
              )}
            </div>
          </div>

          {/* Booking instructions */}
          {selectedFlight && (
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(112,71,235,0.06)',
                border: '1px solid rgba(112,71,235,0.2)',
                borderRadius: 'var(--radius-xl)',
                marginBottom: 24,
              }}
            >
              <p style={{ color: 'var(--color-text-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: '0 0 6px' }}>
                Complete your booking via chat
              </p>
              <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)', margin: 0, lineHeight: 1.6 }}>
                Your AI curator on the left will guide you through the booking. Provide your passenger details (full name, date of birth, passport number) and contact email when asked.
              </p>
            </div>
          )}
        </div>
      </PageLayout>
    </>
  );
}
