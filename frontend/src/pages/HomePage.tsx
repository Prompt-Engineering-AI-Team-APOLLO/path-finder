import React, { useState } from 'react';
import {
  Badge,
  StepIndicator,
  CompanionPanel,
  CategoryCard,
  EditorPickCard,
  Button,
} from '../components/ui';
import type { Message } from '../components/ui';

/* ── Static conversation ── */
const MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Good morning, Alex. I've noticed you've been looking at Mediterranean escapes. Would you like to see a curated route through the Amalfi Coast or perhaps some secluded villas in Crete?",
    timestamp: '9:14 AM',
  },
  {
    id: '2',
    role: 'user',
    content: "Show me something exclusive in Italy. I'm looking for high-end activities and a premium car rental for the coastal drive.",
    timestamp: '9:15 AM',
  },
  {
    id: '3',
    role: 'assistant',
    content: "Understood. I've updated the itinerary to focus on top-tier Italian experiences — including a private Amalfi villa, Michelin-starred dining in Positano, and a Ferrari Roma for the coastal route.",
    timestamp: '9:15 AM',
  },
];

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
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>(MESSAGES);

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
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

        {/* Right: step indicator */}
        <div style={{ paddingTop: 6 }}>
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
            assistantName="Intelligent Companion"
            assistantSubtitle="AI-Powered Travel Curation"
            headerIcon={<SparkleIcon />}
            inputPlaceholder="Ask your curator..."
            quickActions={[
              { icon: <PlaneIcon />, label: 'Optimize flights' },
              { icon: <BedIcon />, label: 'Suggest hotels' },
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
