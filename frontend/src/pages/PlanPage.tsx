import { useState } from 'react';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';


const PLAN_STEPS = [
  { number: '01', label: 'Search' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

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
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

export default function PlanPage({ userEmail, onNavigate, messages, setMessages, onClearChat }: PlanPageProps) {
  const [selectedFlight, setSelectedFlight] = useState<string | null>('JP448');
  const [selectedStyle, setSelectedStyle] = useState<string>('Urban Adventure');

  const handleSend = async (text: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: ts };
    const assistantId = String(Date.now() + 1);
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', timestamp: ts };

    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, assistantMsg]);
    
    try {
      const sessionRaw =
        localStorage.getItem('pathfinder_auth_session') ||
        sessionStorage.getItem('pathfinder_auth_session');
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
          const chunk = line.slice(6);
          if (chunk === '[DONE]') break;
          setMessages((prev: Message[]) =>
            prev.map((m: Message) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
          );
        }
      }
    } catch (err) {
      setMessages((prev: Message[]) =>
        prev.map((m: Message) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
    }
  };

  const totalCost = selectedFlight === 'JP448' ? 3210 : selectedFlight === 'JP442' ? 1462 : 0;

  /* ── Left panel ── */
  const leftPanel = (
    <CompanionPanel
      messages={messages}
      onSendMessage={handleSend}
      onClearChat={onClearChat}
      assistantName="Pathfinder AI"
      assistantSubtitle="Your Travel Curator"
      isOnline={true}
      inputPlaceholder="Ask your companion..."
      quickActions={[
        { icon: <SmallPlaneIcon />, label: 'Search flights', onClick: () => onNavigate?.('home') },
        { icon: <SmallBedIcon />, label: 'Suggest 5-star hotels' },
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
          value="London (LHR) → Tokyo (HND)"
          price={selectedFlight ? (selectedFlight === 'JP448' ? 2890 : 1142) : undefined}
        >
          <p style={{ color: 'var(--color-text-dark-secondary)', fontSize: 'var(--text-xs)' }}>
            {selectedFlight === 'JP448' ? 'Business Class · Oct 12' : selectedFlight === 'JP442' ? 'Economy · Oct 12' : ''}
          </p>
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
          price={320}
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
        ctaLabel="Review and Confirm →"
        ctaDisabled={!selectedFlight}
        breakdown={selectedFlight ? [
          { label: selectedFlight === 'JP448' ? 'Business Class Flight' : 'Economy Flight', amount: selectedFlight === 'JP448' ? 2890 : 1142 },
          { label: 'Mt. Fuji Tour', amount: 320 },
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

          {/* Outbound flights */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Outbound Flights"
              subheading="London Heathrow → Tokyo Haneda"
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FlightCard
                airline="Japan Airlines"
                flightNumber="JP 442"
                cabinClass="Economy"
                departureTime="10:20"
                departureCode="LHR"
                arrivalTime="06:05"
                arrivalCode="HND"
                duration="11h 45m"
                stops={0}
                price={1142}
                selected={selectedFlight === 'JP442'}
                onSelect={() => setSelectedFlight(selectedFlight === 'JP442' ? null : 'JP442')}
              />
              <FlightCard
                airline="Japan Airlines"
                flightNumber="JP 448"
                cabinClass="Business"
                departureTime="13:50"
                departureCode="LHR"
                arrivalTime="09:35"
                arrivalCode="HND"
                duration="11h 45m"
                stops={0}
                price={2890}
                recommended
                selected={selectedFlight === 'JP448'}
                onSelect={() => setSelectedFlight(selectedFlight === 'JP448' ? null : 'JP448')}
              />
            </div>
          </div>

          {/* Inbound flights */}
          <div>
            <SectionHeader
              icon={<PlaneIcon />}
              heading="Inbound Flights"
              subheading="Tokyo Haneda → London Heathrow"
              theme="light"
              className="mb-4"
            />
            <div style={{ marginTop: 14 }}>
              {selectedFlight ? (
                <EmptyState
                  icon={<SearchIcon />}
                  message="Loading return options..."
                  description="Fetching best-value inbound flights matched to your outbound selection."
                />
              ) : (
                <EmptyState
                  icon={<SearchIcon />}
                  message="Select your outbound flight first"
                  description="Return options will appear once you choose an outbound flight above."
                />
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
