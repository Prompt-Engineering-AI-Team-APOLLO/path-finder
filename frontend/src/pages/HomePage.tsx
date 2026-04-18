import { useState, useRef } from 'react';
import {
  Badge,
  StepIndicator,
  CompanionPanel,
  CategoryCard,
  EditorPickCard,
  Button,
  FlightCard,
} from '../components/ui';
import type { Message } from '../components/ui';

interface FlightOffer {
  offer_id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  stops: number;
  cabin_class: string;
  price_per_person: number;
  total_price: number;
  currency: string;
  baggage_included: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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

/* ── Flight detail modal ── */
function FlightDetailModal({ flight, onClose }: { flight: FlightOffer; onClose: () => void }) {
  const dep = new Date(flight.departure_at);
  const dateStr = dep.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111321', border: '1px solid var(--color-border-medium)', borderRadius: 'var(--radius-2xl)', width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', marginBottom: 4 }}>Flight Details</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{flight.airline} · {flight.flight_number}</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Route block */}
        <div style={{ padding: '24px 24px 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 16 }}>{dateStr}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)', lineHeight: 1 }}>{formatTime(flight.departure_at)}</p>
              <p style={{ color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)', marginTop: 4 }}>{flight.origin}</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>{flight.origin_city}</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{formatDuration(flight.duration_minutes)}</p>
              <div style={{ width: '100%', height: 1, background: 'var(--color-border-medium)', position: 'relative' }}>
                <svg style={{ position: 'absolute', right: -6, top: -7 }} width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
              <p style={{ color: flight.stops === 0 ? 'var(--color-green)' : 'var(--color-amber)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)', lineHeight: 1 }}>{formatTime(flight.arrival_at)}</p>
              <p style={{ color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)', marginTop: 4 }}>{flight.destination}</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>{flight.destination_city}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          {[
            { label: 'Cabin Class', value: flight.cabin_class.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
            { label: 'Baggage', value: flight.baggage_included ? 'Included' : 'Not included' },
            { label: 'Price per person', value: `${flight.currency === 'USD' ? '$' : flight.currency}${flight.price_per_person.toLocaleString()}` },
            { label: 'Total price', value: `${flight.currency === 'USD' ? '$' : flight.currency}${flight.total_price.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 4 }}>{label}</p>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>Close</button>
          <button type="button" style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--gradient-primary)', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Select Flight</button>
        </div>
      </div>
    </div>
  );
}

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
  onContinueToBooking?: (flight: FlightOffer, passengerCount: number) => void;
}

export default function HomePage({ userEmail, accessToken, onOpenProfile, onSignOut, onContinueToBooking }: HomePageProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  // rawFlightResults = full API results; flightResults = currently displayed (may be filtered)
  const [rawFlightResults, setRawFlightResults] = useState<FlightOffer[] | null>(null);
  const [flightResults, setFlightResults] = useState<FlightOffer[] | null>(null);
  const [showFlightResults, setShowFlightResults] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [flightRoute, setFlightRoute] = useState<{ from: string; to: string } | null>(null);
  const [detailFlight, setDetailFlight] = useState<FlightOffer | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const conversationId = useRef<string>(crypto.randomUUID());
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  // Build system prompt, injecting actual loaded flights so AI never hallucinates
  const buildSystemPrompt = (flights: FlightOffer[] | null, route: { from: string; to: string } | null) => {
    let prompt = SYSTEM_PROMPT;
    if (flights && flights.length > 0 && route) {
      const list = flights.map(f =>
        `• ${f.airline} ${f.flight_number} | Departs ${formatTime(f.departure_at)} | Arrives ${formatTime(f.arrival_at)} | ${formatDuration(f.duration_minutes)} | ${f.stops === 0 ? 'Nonstop' : f.stops + ' stop(s)'} | $${f.price_per_person} ${f.currency}/person`
      ).join('\n');
      prompt += `\n\nFLIGHTS CURRENTLY SHOWN TO USER (${flights.length} flights, ${route.from} → ${route.to}):\n${list}\n\nIMPORTANT: Only reference these exact flights. Never invent airline names, times, prices, or flight numbers.`;
    }
    return prompt;
  };

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

  const extractFlightParams = async (
    history: { role: string; content: string }[],
  ) => {
    const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const extractPrompt = `You are a flight parameter extractor. Read the ENTIRE conversation and return ONLY a JSON object — no other text.

STEP 1 — Decide should_search:
- true  → user wants a NEW flight search and both origin AND destination are known from any message
- false → user is filtering/refining existing results, or origin/destination unknown

STEP 2 — Extract filters (include any that apply, omit others):
- max_price: number (USD) — e.g. "under $300", "cheaper than $200"
- depart_before: "HH:MM" (24h) — e.g. "before 10am" → "10:00", "early morning" → "09:00"
- depart_after: "HH:MM" (24h) — e.g. "after 6pm" → "18:00"
- max_stops: number — e.g. "nonstop" → 0, "one stop or less" → 1
- airlines: ["Airline Name"] — e.g. "only Delta" → ["Delta"]

OUTPUT when should_search true:
{"should_search":true,"origin":"ATL","destination":"LAX","departure_date":"YYYY-MM-DD","passengers":1,"cabin_class":"economy"}
(add any filter fields if also mentioned)

OUTPUT when should_search false (filtering only):
{"should_search":false}
(add any filter fields that apply)

IATA codes: New York=JFK, Newark=EWR, Atlanta=ATL, Los Angeles=LAX, Chicago=ORD, Miami=MIA, San Francisco=SFO, Boston=BOS, Dallas=DFW, Seattle=SEA, Denver=DEN, Washington DC=DCA, Orlando=MCO, Houston=IAH, Las Vegas=LAS, Philadelphia=PHL, Charlotte=CLT, Phoenix=PHX, Minneapolis=MSP, Detroit=DTW, Portland=PDX

Other rules:
- Missing date → use ${defaultDate}
- Passengers default 1, cabin default economy
- Return ONLY valid JSON`;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          messages: [
            { role: 'system', content: extractPrompt },
            ...history,
            { role: 'user', content: 'Extract parameters now. JSON only.' },
          ],
          stream: false,
          temperature: 0,
          max_tokens: 200,
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

  // Apply all filter params to a flight list
  const applyFilters = (flights: FlightOffer[], params: Record<string, unknown>): FlightOffer[] => {
    let result = [...flights];
    if (typeof params.max_price === 'number') {
      result = result.filter(f => f.price_per_person <= (params.max_price as number));
    }
    if (typeof params.depart_before === 'string') {
      const [h, m] = (params.depart_before as string).split(':').map(Number);
      const limit = h * 60 + (m || 0);
      result = result.filter(f => {
        const d = new Date(f.departure_at);
        return d.getHours() * 60 + d.getMinutes() < limit;
      });
    }
    if (typeof params.depart_after === 'string') {
      const [h, m] = (params.depart_after as string).split(':').map(Number);
      const limit = h * 60 + (m || 0);
      result = result.filter(f => {
        const d = new Date(f.departure_at);
        return d.getHours() * 60 + d.getMinutes() >= limit;
      });
    }
    if (typeof params.max_stops === 'number') {
      result = result.filter(f => f.stops <= (params.max_stops as number));
    }
    if (Array.isArray(params.airlines) && (params.airlines as string[]).length > 0) {
      const names = (params.airlines as string[]).map(a => a.toLowerCase());
      result = result.filter(f => names.some(n => f.airline.toLowerCase().includes(n)));
    }
    return result;
  };

  const hasFilterParams = (params: Record<string, unknown>) =>
    params.max_price !== undefined ||
    params.depart_before !== undefined ||
    params.depart_after !== undefined ||
    params.max_stops !== undefined ||
    (Array.isArray(params.airlines) && (params.airlines as string[]).length > 0);

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text, timestamp: now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      // Use system prompt that includes currently loaded flights so AI stays grounded
      const systemPrompt = buildSystemPrompt(rawFlightResults, flightRoute);
      const rawReply = await callChatAPI([{ role: 'system', content: systemPrompt }, ...history]);
      const cleanReply = rawReply.trim() || 'Let me find the best options for you.';
      setMessages(prev => [...prev, { id: String(Date.now()), role: 'assistant', content: cleanReply, timestamp: now() }]);

      // Extractor sees full history including AI reply
      const historyWithReply = [...history, { role: 'assistant', content: cleanReply }];
      const params = await extractFlightParams(historyWithReply);

      if (params?.should_search) {
        // New search
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
        const allFlights: FlightOffer[] = flightData?.outbound_flights ?? [];

        if (flightRes.ok && allFlights.length > 0) {
          const displayed = hasFilterParams(params) ? applyFilters(allFlights, params) : allFlights;
          setRawFlightResults(allFlights);
          setFlightResults(displayed.length > 0 ? displayed : allFlights);
          setShowFlightResults(true);
          setSelectedFlightId(null);
          setFlightRoute({ from: params.origin, to: params.destination });
          setPassengerCount(params.passengers ?? 1);
        }
      } else if (params && hasFilterParams(params) && rawFlightResults) {
        // Filter existing results (always against the raw set so filters don't compound destructively)
        const filtered = applyFilters(rawFlightResults, params);
        setFlightResults(filtered.length > 0 ? filtered : rawFlightResults);
        setShowFlightResults(true);
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
        height: '100svh',
        overflow: 'hidden',
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
          overflow: 'hidden',
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

        {/* RIGHT: flight results or default content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
          {/* Restore banner — sticky, shown whenever flight results are hidden */}
          {flightResults && !showFlightResults && (
            <button
              type="button"
              onClick={() => setShowFlightResults(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 18px',
                background: 'linear-gradient(90deg, rgba(112,71,235,0.25) 0%, rgba(112,71,235,0.1) 100%)',
                border: '1px solid rgba(112,71,235,0.5)',
                borderRadius: 'var(--radius-xl)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-primary)">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
                  View flights · {flightRoute?.from} → {flightRoute?.to}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' }}>
                  {flightResults.length} flights
                </span>
                <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Show →</span>
              </div>
            </button>
          )}

          {showFlightResults && flightResults ? (
            /* ── Flight results panel ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Available Flights
                  </p>
                  <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
                    {flightRoute?.from} → {flightRoute?.to}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlightResults(false)}
                  style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  ← Back
                </button>
              </div>

              {/* Flight cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {flightResults.map((flight, i) => (
                  <div key={flight.offer_id}>
                    <FlightCard
                      airline={flight.airline}
                      flightNumber={flight.flight_number}
                      cabinClass={flight.cabin_class}
                      departureTime={formatTime(flight.departure_at)}
                      departureCode={flight.origin}
                      arrivalTime={formatTime(flight.arrival_at)}
                      arrivalCode={flight.destination}
                      duration={formatDuration(flight.duration_minutes)}
                      stops={flight.stops}
                      price={flight.price_per_person}
                      currency={flight.currency}
                      recommended={i === 0}
                      selected={selectedFlightId === flight.offer_id}
                      onSelect={() => setSelectedFlightId(flight.offer_id)}
                    />
                    <button
                      type="button"
                      onClick={() => setDetailFlight(flight)}
                      style={{ width: '100%', marginTop: 6, padding: '6px', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-wide)' }}
                    >
                      View Details ›
                    </button>
                  </div>
                ))}
              </div>

              {/* Book button */}
              {selectedFlightId && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    const flight = flightResults?.find(f => f.offer_id === selectedFlightId);
                    if (flight && onContinueToBooking) onContinueToBooking(flight, passengerCount);
                  }}
                >
                  Continue to Booking →
                </Button>
              )}
            </div>
          ) : (
            /* ── Default explore content ── */
            <>
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
            </>
          )}
        </div>
      </div>

      {detailFlight && <FlightDetailModal flight={detailFlight} onClose={() => setDetailFlight(null)} />}
    </div>
  );
}
