import React, { useState, useRef } from 'react';
import {
  Badge,
  StepIndicator,
  CompanionPanel,
  CategoryCard,
  Button,
  FlightCard,
} from '../components/ui';
import type { Message } from '../components/ui';
import { HOTELS_CATEGORY_IMAGE, HOTEL_SUGGESTIONS } from '../data/hotels';
import {
  ACTIVITIES_FEATURE_IMAGE,
  ACTIVITY_MOCK_MEDIA,
  CAR_RENTAL_MOCK_DATA,
  CAR_RENTALS_CATEGORY_IMAGE,
  EDITOR_PICK_FEATURED,
  EDITOR_PICK_MOCK_DATA,
  FLIGHT_MOCK_MEDIA,
  FLIGHTS_CATEGORY_IMAGE,
  RESTAURANT_MOCK_DATA,
  RESTAURANTS_CATEGORY_IMAGE,
} from '../data/travelMocks';
import type { MockHotel } from '../data/hotels';
import type {
  MockActivityMedia,
  MockCarRental,
  MockEditorPick,
  MockEditorPickActivity,
  MockFlightMedia,
  MockRestaurantMedia,
} from '../data/travelMocks';

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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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
function ItalyTrendingCard({ onOpenList }: { onOpenList: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={onOpenList}
      style={{
        background: 'transparent',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        perspective: 1000,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 200,
          transformStyle: 'preserve-3d',
          transition: 'transform 450ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--shadow-md)',
            background: 'linear-gradient(135deg, #0D4A4A 0%, #0A3240 50%, #1a1040 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <img
            src={ACTIVITIES_FEATURE_IMAGE}
            alt="Top activities in Italy"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.45,
            }}
          />
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 70% 40%, rgba(13,209,204,0.12) 0%, transparent 60%)',
          }} />
          <div aria-hidden style={{
            position: 'absolute', top: '10%', right: '8%', opacity: 0.15,
            fontSize: 80, lineHeight: 1,
          }}>🗺</div>

          <div style={{ position: 'relative', padding: '20px', textAlign: 'left' }}>
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--shadow-md)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(140deg, #111936 0%, #271850 100%)',
            padding: 18,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
              Explore Premium Activities
            </p>
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
              Flip complete. Tap to view mock activity list with images, durations, and pricing.
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
            {ACTIVITY_MOCK_MEDIA.length} curated activities available
          </p>
        </div>
      </div>
    </button>
  );
}

function ActivityListCard({ activity }: { activity: MockActivityMedia }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--color-border-medium)',
        background: '#131833',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={activity.image}
          alt={activity.title}
          style={{ width: '100%', height: 170, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: 'rgba(8, 12, 24, 0.78)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            maxWidth: '85%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activity.title}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
          {activity.title}
        </p>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          {activity.city}
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          {activity.shortDescription}
        </p>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{activity.duration}</span>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
            From ${activity.priceFrom} {activity.currency}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivitySuggestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 14, 0.78)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1080px, 100%)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border-medium)',
          background: '#0F1325',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              Activity Suggestions
            </p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
              Mock activity list with photos and pricing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {ACTIVITY_MOCK_MEDIA.map((activity) => (
            <ActivityListCard key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Featured card: Car Rentals France ── */
function CarRentalCard({ onOpenList }: { onOpenList: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={onOpenList}
      style={{
        background: 'transparent',
        border: 'none',
        width: '100%',
        minHeight: 200,
        cursor: 'pointer',
        perspective: 1000,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 200,
          transformStyle: 'preserve-3d',
          transition: 'transform 450ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--shadow-md)',
            background: 'linear-gradient(160deg, #1a0d2e 0%, #2d1a4a 50%, #1a0a30 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <img
            src={CAR_RENTALS_CATEGORY_IMAGE}
            alt="Car rentals in France"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.42,
            }}
          />
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 30% 60%, rgba(112,71,235,0.14) 0%, transparent 65%)',
          }} />
          <div aria-hidden style={{
            position: 'absolute', bottom: '30%', right: '-5%',
            fontSize: 72, opacity: 0.12, transform: 'rotate(-5deg)',
          }}>🚗</div>

          <div style={{ position: 'relative', padding: '18px', textAlign: 'left' }}>
            <Badge variant="curated">Exclusive Collection</Badge>
            <h3 style={{ color: 'white', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '8px 0 4px' }}>
              Car Rentals in France
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--text-xs)', margin: 0 }}>
              Vintage Classics & Modern Hypercars
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-md)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(140deg, #161532 0%, #321c52 100%)',
            padding: 16,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
              Premium Car Options
            </p>
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
              Flip complete. Tap to see mock car models, specs, and daily pricing.
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
            {CAR_RENTAL_MOCK_DATA.length} rental cars available
          </p>
        </div>
      </div>
    </button>
  );
}

function CarRentalListCard({ car }: { car: MockCarRental }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--color-border-medium)',
        background: '#131833',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={car.image}
          alt={car.name}
          style={{ width: '100%', height: 170, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: 'rgba(8, 12, 24, 0.78)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            maxWidth: '85%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {car.name}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
          {car.name}
        </p>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          {car.location} · {car.category}
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          {car.shortDescription}
        </p>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
            {car.transmission} · {car.seats} seats
          </span>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
            ${car.pricePerDay}/day
          </span>
        </div>
      </div>
    </div>
  );
}

function CarRentalSuggestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 14, 0.78)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1080px, 100%)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border-medium)',
          background: '#0F1325',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              Car Rental Suggestions
            </p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
              Mock car list with images and daily pricing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {CAR_RENTAL_MOCK_DATA.map((car) => (
            <CarRentalListCard key={car.id} car={car} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorPickFlipCard({ pick, onOpen }: { pick: MockEditorPick; onOpen: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={onOpen}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        perspective: 1000,
        minHeight: 280,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 280,
          transformStyle: 'preserve-3d',
          transition: 'transform 500ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            border: '1.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            backfaceVisibility: 'hidden',
          }}
        >
          <img
            src={pick.image}
            alt={pick.title}
            draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,26,0.2) 0%, rgba(8,8,26,0.9) 72%, rgba(8,8,26,0.98) 100%)' }} />
          <div style={{ position: 'relative', padding: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--gradient-primary)', borderRadius: 'var(--radius-full)', padding: '3px 12px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'white' }}>
              {pick.label}
            </span>
            <div>
              <h3 style={{ color: 'white', fontSize: 'var(--text-2xl)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>{pick.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--text-sm)', margin: 0 }}>{pick.description}</p>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            border: '1.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(140deg, #181334 0%, #251447 100%)',
            padding: 20,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: 0 }}>Tonight's Curated Lineup</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: '8px 0 0' }}>
              {pick.activities.length} activities in {pick.city}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '8px 0 0' }}>
              Tap to view full activity details and pricing.
            </p>
          </div>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
            Open Editor's Pick →
          </span>
        </div>
      </div>
    </button>
  );
}

function EditorPickActivityCard({ activity }: { activity: MockEditorPickActivity }) {
  return (
    <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border-medium)', background: '#131833', boxShadow: 'var(--shadow-card)' }}>
      <img src={activity.image} alt={activity.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
      <div style={{ padding: 12 }}>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{activity.name}</p>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{activity.time} · {activity.location}</p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{activity.description}</p>
        <p style={{ margin: '10px 0 0', color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
          ${activity.price} {activity.currency}
        </p>
      </div>
    </div>
  );
}

function EditorPickSuggestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3, 6, 14, 0.78)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(1120px, 100%)', maxHeight: '85svh', overflow: 'auto', borderRadius: 'var(--radius-3xl)', border: '1px solid var(--color-border-medium)', background: '#0F1325', boxShadow: '0 28px 90px rgba(0,0,0,0.6)', padding: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>Editor's Picks</p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>Mock extracted activities and pricing</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {EDITOR_PICK_MOCK_DATA.map((pick) => (
            <section key={pick.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: 14, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)' }}>{pick.title}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{pick.city} · {pick.description}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {pick.activities.map((activity) => (
                  <EditorPickActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function HotelSuggestionFlipCard({ hotel, onOpen }: { hotel: MockHotel; onOpen: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={onOpen}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        perspective: 1000,
        minHeight: 240,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 240,
          transformStyle: 'preserve-3d',
          transition: 'transform 450ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-card)',
            backfaceVisibility: 'hidden',
            background: '#101322',
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={hotel.image}
              alt={hotel.name}
              style={{ width: '100%', height: 170, objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                left: 10,
                bottom: 10,
                background: 'rgba(8, 12, 24, 0.78)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                maxWidth: '85%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {hotel.name}
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{hotel.name}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{hotel.location}</p>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-card)',
            background: 'linear-gradient(140deg, #151a33 0%, #24183a 100%)',
            color: 'var(--color-text-primary)',
            padding: 14,
            textAlign: 'left',
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{hotel.name}</p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>{hotel.shortDescription}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>${hotel.pricePerNight}/night</p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Tap to view all hotel mock data</p>
          </div>
        </div>
      </div>
    </button>
  );
}

function HotelSuggestionModal({ onClose, onOpenAll }: { onClose: () => void; onOpenAll: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 14, 0.78)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1040px, 100%)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border-medium)',
          background: '#0F1325',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>Hotel Suggestions</p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>Flip cards to preview top stays</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {HOTEL_SUGGESTIONS.map((hotel) => (
            <HotelSuggestionFlipCard key={hotel.id} hotel={hotel} onOpen={onOpenAll} />
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={onOpenAll}>
            View All Hotels →
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlightSuggestionFlipCard({ flight }: { flight: MockFlightMedia }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        perspective: 1000,
        minHeight: 250,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 250,
          transformStyle: 'preserve-3d',
          transition: 'transform 450ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-card)',
            backfaceVisibility: 'hidden',
            background: '#101322',
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={flight.image}
              alt={`${flight.originCode} to ${flight.destinationCode}`}
              style={{ width: '100%', height: 160, objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                left: 10,
                bottom: 10,
                background: 'rgba(8, 12, 24, 0.78)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                maxWidth: '85%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {flight.airline}
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
              {flight.originCode} → {flight.destinationCode}
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              {flight.originCity} to {flight.destinationCity}
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-card)',
            background: 'linear-gradient(140deg, #101a37 0%, #1e1742 100%)',
            color: 'var(--color-text-primary)',
            padding: 14,
            textAlign: 'left',
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{flight.airline} · {flight.flightNumber}</p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              Origin: {flight.originCode} ({flight.originCity})
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              Destination: {flight.destinationCode} ({flight.destinationCity})
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
              ${flight.pricePerPerson}/{flight.currency} per traveler
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              Mock flight suggestion
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function FlightSuggestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 14, 0.78)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1040px, 100%)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border-medium)',
          background: '#0F1325',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              Flight Suggestions
            </p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
              Flip cards to view origin, destination, and pricing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {FLIGHT_MOCK_MEDIA.map((flight) => (
            <FlightSuggestionFlipCard key={flight.id} flight={flight} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RestaurantCategoryFlipCard({ onOpenList }: { onOpenList: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={onOpenList}
      style={{
        width: '100%',
        minHeight: 0,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        perspective: 1000,
        aspectRatio: '4/3',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 450ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <img
            src={RESTAURANTS_CATEGORY_IMAGE}
            alt="Restaurant experiences"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-card-overlay)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', textAlign: 'left' }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                <path d="M18 2h-2v7h-3V2H11v7H8.5a2.5 2.5 0 00-2.5 2.5V22h16V11.5A2.5 2.5 0 0019.5 9H18V2z"/>
              </svg>
            </div>
            <p style={{ color: 'white', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
              Restaurants
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
              Michelin-Starred Experiences
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: 'var(--shadow-card)',
            background: 'linear-gradient(140deg, #2a1a0a 0%, #1a0a0a 100%)',
            color: 'var(--color-text-primary)',
            padding: 14,
            textAlign: 'left',
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
              Curated Dining Collection
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              Flip complete. Tap to view mock restaurants, pricing, and details.
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
            {RESTAURANT_MOCK_DATA.length} restaurants available
          </p>
        </div>
      </div>
    </button>
  );
}

function RestaurantListCard({ restaurant }: { restaurant: MockRestaurantMedia }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--color-border-medium)',
        background: '#131833',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={restaurant.image}
          alt={restaurant.name}
          style={{ width: '100%', height: 170, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: 'rgba(8, 12, 24, 0.78)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            maxWidth: '85%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {restaurant.name}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
          {restaurant.name}
        </p>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          {restaurant.city} · {restaurant.cuisine}
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          {restaurant.shortDescription}
        </p>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
            Avg cost {restaurant.priceTier}
          </span>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
            ${restaurant.averageCostPerPerson}/person
          </span>
        </div>
      </div>
    </div>
  );
}

function RestaurantSuggestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 14, 0.78)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1080px, 100%)',
          borderRadius: 'var(--radius-3xl)',
          border: '1px solid var(--color-border-medium)',
          background: '#0F1325',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              Restaurant Suggestions
            </p>
            <h3 style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
              Mock restaurant list with images and pricing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', width: 34, height: 34, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {RESTAURANT_MOCK_DATA.map((restaurant) => (
            <RestaurantListCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { number: '01', label: 'Home' },
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
  onNavigate?: (page: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
  // Flight search state — lifted to App so it survives navigation
  flightResults: FlightOffer[] | null;
  setFlightResults: React.Dispatch<React.SetStateAction<FlightOffer[] | null>>;
  rawFlightResults: FlightOffer[] | null;
  setRawFlightResults: React.Dispatch<React.SetStateAction<FlightOffer[] | null>>;
  showFlightResults: boolean;
  setShowFlightResults: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFlightId: string | null;
  setSelectedFlightId: React.Dispatch<React.SetStateAction<string | null>>;
  flightRoute: { from: string; to: string } | null;
  setFlightRoute: React.Dispatch<React.SetStateAction<{ from: string; to: string } | null>>;
  passengerCount: number;
  setPassengerCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function HomePage({ userEmail, accessToken, onOpenProfile, onSignOut, onContinueToBooking, onNavigate, messages, setMessages, onClearChat, flightResults, setFlightResults, rawFlightResults, setRawFlightResults, showFlightResults, setShowFlightResults, selectedFlightId, setSelectedFlightId, flightRoute, setFlightRoute, passengerCount, setPassengerCount }: HomePageProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [detailFlight, setDetailFlight] = useState<FlightOffer | null>(null);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);
  const [showRestaurantSuggestions, setShowRestaurantSuggestions] = useState(false);
  const [showCarRentalSuggestions, setShowCarRentalSuggestions] = useState(false);
  const [showEditorPickSuggestions, setShowEditorPickSuggestions] = useState(false);
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

          <StepIndicator
            steps={STEPS}
            currentStep={0}
            onStepClick={(i) => {
              const pages = ['home', 'plan', 'confirm'];
              if (pages[i] && pages[i] !== 'home') onNavigate?.(pages[i]);
            }}
          />
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
            onClearChat={onClearChat}
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
                  image={HOTELS_CATEGORY_IMAGE}
                  onClick={() => setShowHotelSuggestions(true)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                    </svg>
                  }
                />
                <CategoryCard
                  title="Flights"
                  subtitle="Global Routes & Private Charters"
                  image={FLIGHTS_CATEGORY_IMAGE}
                  onClick={() => setShowFlightSuggestions(true)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.8">
                      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  }
                />
                <RestaurantCategoryFlipCard onOpenList={() => setShowRestaurantSuggestions(true)} />
              </div>

              {/* Row 2: Italy card + Car card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
                <ItalyTrendingCard onOpenList={() => setShowActivitySuggestions(true)} />
                <CarRentalCard onOpenList={() => setShowCarRentalSuggestions(true)} />
              </div>

              {/* Row 3: Editor's pick */}
              <EditorPickFlipCard
                pick={EDITOR_PICK_FEATURED}
                onOpen={() => setShowEditorPickSuggestions(true)}
              />
            </>
          )}
        </div>
      </div>

      {detailFlight && <FlightDetailModal flight={detailFlight} onClose={() => setDetailFlight(null)} />}
      {showHotelSuggestions && (
        <HotelSuggestionModal
          onClose={() => setShowHotelSuggestions(false)}
          onOpenAll={() => {
            setShowHotelSuggestions(false);
            onNavigate?.('hotels');
          }}
        />
      )}
      {showFlightSuggestions && (
        <FlightSuggestionModal onClose={() => setShowFlightSuggestions(false)} />
      )}
      {showActivitySuggestions && (
        <ActivitySuggestionModal onClose={() => setShowActivitySuggestions(false)} />
      )}
      {showRestaurantSuggestions && (
        <RestaurantSuggestionModal onClose={() => setShowRestaurantSuggestions(false)} />
      )}
      {showCarRentalSuggestions && (
        <CarRentalSuggestionModal onClose={() => setShowCarRentalSuggestions(false)} />
      )}
      {showEditorPickSuggestions && (
        <EditorPickSuggestionModal onClose={() => setShowEditorPickSuggestions(false)} />
      )}
    </div>
  );
}
