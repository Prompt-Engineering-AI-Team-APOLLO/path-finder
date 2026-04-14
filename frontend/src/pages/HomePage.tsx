import { useState, useRef } from 'react';
import {
  Badge,
  StepIndicator,
  CompanionPanel,
  CategoryCard,
  EditorPickCard,
  Button,
} from '../components/ui';
import type { Message } from '../components/ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const SYSTEM_PROMPT = `You are Pathfinder, a premium AI travel curator. Help users plan trips and book flights.

RESPONSE STYLE:
- SHORT responses only — max 2 short paragraphs, 2-3 sentences each.
- Put a blank line between paragraphs.
- Be friendly and direct. Never write a wall of text.

CONVERSATION FLOW:
1. When the user mentions a destination but not an origin → ask where they are flying FROM.
2. When you know origin + destination but no date → ask for a specific travel date (or confirm you will use the soonest available).
3. Assume 1 passenger and economy unless stated otherwise.
4. After flight results are shown, briefly highlight the best 1-2 options and ask which they'd like to book.`;

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI travel curator. Tell me where you'd like to go and I'll plan the perfect trip — flights, activities, dining, and more. Where shall we begin?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

/* ── Sparkle icon for CompanionPanel header ── */
function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}

/* ── Quick action icons ── */
const PlaneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);
const BedIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 4v16M2 8h18a2 2 0 012 2v8H2M2 12h20"/>
  </svg>
);

/* ── Featured card: Italy Activities ── */
function ItalyTrendingCard() {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #0D4A4A 0%, #0A3240 50%, #1a1040 100%)',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Map illustration overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 70% 40%, rgba(13,209,204,0.12) 0%, transparent 60%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', top: '10%', right: '8%', opacity: 0.15,
        fontSize: 80, lineHeight: 1,
      }}>🗺</div>

      <div style={{ position: 'relative', padding: '20px' }}>
        <Badge variant="trending">Trending Now</Badge>
        <h3 style={{ color: 'white', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '10px 0 6px' }}>
          Top Activities in Italy
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', margin: '0 0 16px', lineHeight: 'var(--leading-normal)' }}>
          From private vineyard tours to coastal heli-rides
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" size="sm">Book Now</Button>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Featured card: Car Rentals France ── */
function CarRentalCard() {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(160deg, #1a0d2e 0%, #2d1a4a 50%, #1a0a30 100%)',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Car silhouette hint */}
      <div aria-hidden style={{
        position: 'absolute', bottom: '30%', right: '-5%',
        fontSize: 72, opacity: 0.12, transform: 'rotate(-5deg)',
      }}>🚗</div>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 60%, rgba(112,71,235,0.14) 0%, transparent 65%)',
      }} />

      <div style={{ position: 'relative', padding: '18px' }}>
        <Badge variant="curated">Exclusive Collection</Badge>
        <h3 style={{ color: 'white', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '8px 0 4px' }}>
          Car Rentals in France
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--text-xs)', margin: 0 }}>
          Vintage Classics & Modern Hypercars
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  { number: '01', label: 'Welcome' },
  { number: '02', label: 'Plan' },
  { number: '03', label: 'Confirm' },
];

/* ─────────────────────────────────────────────
   HomePage
───────────────────────────────────────────── */
interface HomePageProps {
  userEmail?: string;
  accessToken?: string;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
}

export default function HomePage({ userEmail, accessToken, onOpenProfile, onSignOut }: HomePageProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const conversationId = useRef<string>(crypto.randomUUID());
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const callChatAPI = async (
    msgs: { role: string; content: string }[],
    maxTokens = 512,
  ): Promise<string> => {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        messages: msgs,
        conversation_id: conversationId.current,
        stream: false,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail ?? 'Request failed');
    return data.content as string;
  };

  // Parallel extraction call: zero-temperature, focused on returning structured JSON only.
  const extractFlightParams = async (
    history: { role: string; content: string }[],
  ) => {
    const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const extractPrompt = `You are a flight parameter extractor. Analyse the conversation and return ONLY a JSON object — no other text.

Return {"should_search":false} if origin OR destination is unknown.
Return {"should_search":true,"origin":"ATL","destination":"EWR","departure_date":"YYYY-MM-DD","passengers":1,"cabin_class":"economy"} when both airports are known.

Rules:
- Use IATA codes. Common ones: New York=JFK, Newark/NJ=EWR, Atlanta=ATL, LA=LAX, Chicago=ORD, Miami=MIA, SF=SFO, Boston=BOS, Dallas=DFW, Seattle=SEA, Denver=DEN, DC=DCA, Orlando=MCO, Houston=IAH, Vegas=LAS, Philly=PHL, Charlotte=CLT, Phoenix=PHX
- If date is vague or missing, use ${defaultDate}.
- Passengers default to 1, cabin to economy.
- Return ONLY the JSON.`;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          messages: [
            { role: 'system', content: extractPrompt },
            ...history,
            { role: 'user', content: 'Extract flight parameters. JSON only.' },
          ],
          stream: false,
          temperature: 0,
          max_tokens: 150,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
      const jsonStr = (data.content as string)?.match(/\{[\s\S]*\}/)?.[0];
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch {
      return null;
    }
  };

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      // Chat reply + flight param extraction run in parallel
      const [rawReply, params] = await Promise.all([
        callChatAPI([{ role: 'system', content: SYSTEM_PROMPT }, ...history]),
        extractFlightParams(history),
      ]);

      const cleanReply = rawReply.trim() || 'Let me find the best flights for you.';
      setMessages(prev => [...prev, { id: String(Date.now()), role: 'assistant', content: cleanReply, timestamp: now() }]);

      if (params?.should_search) {
        const flightRes = await fetch(`${API_BASE}/flights/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departure_date,
            passengers: params.passengers ?? 1,
            cabin_class: params.cabin_class ?? 'economy',
          }),
        });
        const flightData = await flightRes.json().catch(() => null);
        const flights: Record<string, unknown>[] = flightData?.outbound_flights ?? [];

        if (flightRes.ok && flights.length > 0) {
          const top4 = flights.slice(0, 4).map(f => ({
            flight_number: f.flight_number,
            airline: f.airline,
            departure: f.departure_at,
            arrival: f.arrival_at,
            duration_minutes: f.duration_minutes,
            stops: f.stops,
            cabin: f.cabin_class,
            price: `${f.currency} ${f.total_price}`,
            baggage_included: f.baggage_included,
          }));

          const presentReply = await callChatAPI([
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'assistant', content: cleanReply },
            {
              role: 'user',
              content: `Flight search results below. Present each flight clearly: flight number, airline, departure → arrival times, duration, stops, and price. Be concise.\n${JSON.stringify(top4, null, 2)}`,
            },
          ], 768);

          setMessages(prev => [...prev, { id: String(Date.now()), role: 'assistant', content: presentReply, timestamp: now() }]);
        } else {
          setMessages(prev => [...prev, {
            id: String(Date.now()),
            role: 'assistant',
            content: `No flights found from ${params.origin} to ${params.destination} on ${params.departure_date}. Try different dates or a nearby airport?`,
            timestamp: now(),
          }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: String(Date.now()),
        role: 'assistant',
        content: 'Unable to reach the server. Please check your connection and try again.',
        timestamp: now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#0A0A0F',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{ padding: '20px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Left: pill + heading */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-bg-glass)',
                border: '1px solid var(--color-border-medium)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
              The Digital Curator
            </span>
          </div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              fontWeight: 'var(--weight-extrabold)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Where do you{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              belong
            </span>
            {' '}next?
          </h1>
        </div>

        {/* Right: profile + step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingTop: 6 }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--color-bg-glass)',
                border: '1px solid var(--color-border-medium)',
                color: 'var(--color-text-primary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
              }}
            >
              Profile
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                {isProfileMenuOpen ? '▲' : '▼'}
              </span>
            </button>

            {isProfileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  minWidth: 220,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-medium)',
                  background: '#111321',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                  zIndex: 30,
                }}
              >
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Signed in as
                  <div style={{ marginTop: 3, color: 'var(--color-text-primary)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                    {userEmail || 'Traveler'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile?.();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-primary)',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSignOut?.();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: '#fca5a5',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <StepIndicator steps={STEPS} currentStep={0} />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 0,
          padding: '24px 32px',
          minHeight: 0,
        }}
      >
        {/* LEFT: AI Companion */}
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            marginRight: 20,
          }}
        >
          <CompanionPanel
            messages={messages}
            onSendMessage={handleSend}
            assistantName="Pathfinder"
            assistantSubtitle="AI-Powered Travel Curation"
            headerIcon={<SparkleIcon />}
            inputPlaceholder="Ask your curator..."
            isTyping={isTyping}
            inputLoading={isTyping}
            inputDisabled={isTyping}
            userName={userEmail}
            quickActions={[
              { icon: <PlaneIcon />, label: 'Optimize flights', onClick: () => handleSend('Optimize my flights for the best price and schedule.') },
              { icon: <BedIcon />, label: 'Suggest hotels', onClick: () => handleSend('Suggest some great hotels for my trip.') },
            ]}
          />
        </div>

        {/* RIGHT: content grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Row 1: 3 category cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <CategoryCard
              title="Hotels"
              subtitle="428 Signature Properties"
              imageCss="linear-gradient(160deg, #1a2a4a 0%, #0d1e35 100%)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
              }
            />
            <CategoryCard
              title="Flights"
              subtitle="Global Routes & Private Charters"
              imageCss="linear-gradient(160deg, #0a1a35 0%, #1a0d2e 100%)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              }
            />
            <CategoryCard
              title="Restaurants"
              subtitle="Michelin-Starred Experiences"
              imageCss="linear-gradient(160deg, #2a1a0a 0%, #1a0a0a 100%)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                  <path d="M18 2h-2v7h-3V2H11v7H8.5a2.5 2.5 0 00-2.5 2.5V22h16V11.5A2.5 2.5 0 0019.5 9H18V2z"/>
                </svg>
              }
            />
          </div>

          {/* Row 2: Italy card + Car card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            <ItalyTrendingCard />
            <CarRentalCard />
          </div>

          {/* Row 3: Editor's pick */}
          <EditorPickCard
            imageCss="linear-gradient(135deg, #1a0a1a 0%, #0a1a2a 35%, #1a2a0a 100%)"
            label="Editor's Pick"
            title="Midnight in Florence"
            description="A private walking tour through the Oltrarno district, followed by a candlelit dinner in a 16th-century palazzo — exclusively curated for Pathfinder members."
            ctaLabel="Book Now"
            onCta={() => {}}
            secondaryCtaLabel="View All"
            onSecondaryCta={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
