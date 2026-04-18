import React, { useState } from 'react';
import { TopNav, Button, Input, Badge } from '../components/ui';
import type { Message } from '../components/ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ── Exported types ──────────────────────────────────────────────────────────

export interface FlightOffer {
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

export interface BookingRead {
  id: string;
  booking_reference: string;
  status: string;
  outbound_flight_number: string;
  outbound_airline: string;
  outbound_airline_code: string;
  outbound_origin: string;
  outbound_destination: string;
  outbound_origin_city: string;
  outbound_destination_city: string;
  outbound_departure_at: string;
  outbound_arrival_at: string;
  outbound_duration_minutes: number;
  outbound_stops: number;
  cabin_class: string;
  passenger_count: number;
  total_price: number;
  currency: string;
  passengers: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    passport_number: string | null;
    nationality: string | null;
  }[];
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingPageProps {
  flight: FlightOffer;
  passengerCount: number;
  accessToken?: string;
  userEmail?: string;
  onBack: () => void;
  onBookingComplete: (booking: BookingRead) => void;
  onNavigate?: (page: string) => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  onClearChat?: () => void;
}

// ── Internal form type ────────────────────────────────────────────────────────

interface PassengerForm {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  passport_number: string;
  nationality: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlaneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const BaggageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="12" height="16" rx="2"/>
    <path d="M9 4V2h6v2"/>
    <line x1="12" y1="9" x2="12" y2="15"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
  </svg>
);

// ── Step progress indicator ───────────────────────────────────────────────────

function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { label: 'Passenger Details' },
    { label: 'Contact Info' },
    { label: 'Review & Confirm' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {steps.map(({ label }, i) => {
        const num = i + 1;
        const isActive = step === num;
        const isDone = step > num;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: isDone
                    ? 'rgba(34,197,94,0.15)'
                    : isActive
                    ? 'linear-gradient(135deg, #7047EB, #9F6EFF)'
                    : 'var(--color-bg-glass)',
                  border: isDone
                    ? '1.5px solid rgba(34,197,94,0.45)'
                    : isActive
                    ? 'none'
                    : '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDone ? '#22c55e' : isActive ? 'white' : 'var(--color-text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  flexShrink: 0,
                  transition: 'all 250ms ease',
                }}
              >
                {isDone ? <CheckIcon /> : num}
              </div>
              <p
                style={{
                  color: isActive
                    ? 'var(--color-text-primary)'
                    : isDone
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-normal)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  transition: 'color 250ms ease',
                }}
              >
                {label}
              </p>
            </div>
            {i < 2 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isDone ? 'rgba(34,197,94,0.3)' : 'var(--color-border)',
                  margin: '0 12px',
                  transition: 'background 250ms ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── BookingPage ───────────────────────────────────────────────────────────────

export default function BookingPage({
  flight,
  passengerCount,
  accessToken,
  userEmail,
  onBack,
  onBookingComplete,
  onNavigate,
}: BookingPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [passengers, setPassengers] = useState<PassengerForm[]>(
    Array.from({ length: passengerCount }, () => ({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      passport_number: '',
      nationality: '',
    }))
  );
  const [contactEmail, setContactEmail] = useState(userEmail ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currencySymbol = flight.currency === 'USD' ? '$' : flight.currency;
  const totalPrice = flight.price_per_person * passengerCount;

  // ── Passenger field update ──
  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    setErrors(prev => {
      const next = { ...prev };
      delete next[`p${index}_${field}`];
      return next;
    });
  };

  // ── Validation ──
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    passengers.forEach((p, i) => {
      if (!p.first_name.trim()) errs[`p${i}_first_name`] = 'Required';
      if (!p.last_name.trim()) errs[`p${i}_last_name`] = 'Required';
      if (!p.date_of_birth) {
        errs[`p${i}_date_of_birth`] = 'Required';
      } else {
        const dob = new Date(p.date_of_birth);
        if (isNaN(dob.getTime()) || dob >= new Date()) {
          errs[`p${i}_date_of_birth`] = 'Must be a past date';
        }
      }
      if (p.nationality && !/^[A-Za-z]{2}$/.test(p.nationality)) {
        errs[`p${i}_nationality`] = '2-letter code (e.g. US)';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!contactEmail.trim()) {
      errs['contact_email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errs['contact_email'] = 'Enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step === 1) onBack();
    else setStep(prev => (prev - 1) as 1 | 2 | 3);
  };

  // ── API submission ──
  const handleConfirm = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const body = {
        outbound_offer_id: flight.offer_id,
        passengers: passengers.map(p => ({
          first_name: p.first_name.trim(),
          last_name: p.last_name.trim(),
          date_of_birth: p.date_of_birth,
          passport_number: p.passport_number.trim() || null,
          nationality: p.nationality.trim().toUpperCase() || null,
        })),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || null,
      };

      const res = await fetch(`${API_BASE}/flights/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? 'Booking failed. Please try again.');
      onBookingComplete(data as BookingRead);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Left sidebar: selected flight ──
  const leftSidebar = (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        padding: '28px 20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wider)',
          margin: 0,
        }}
      >
        Selected Flight
      </p>

      {/* Flight card */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            background: 'var(--gradient-primary-soft)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
              {flight.airline}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '2px 0 0' }}>
              {flight.flight_number} · {capitalize(flight.cabin_class)}
            </p>
          </div>
          <Badge variant="confirmed">Selected</Badge>
        </div>

        {/* Route */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Departure */}
            <div style={{ flexShrink: 0 }}>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', lineHeight: 1, margin: 0 }}>
                {fmt(flight.departure_at)}
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: '2px 0 0' }}>
                {flight.origin}
              </p>
            </div>

            {/* Duration line */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                {fmtDuration(flight.duration_minutes)}
              </p>
              <div style={{ width: '100%', height: 1, background: 'var(--color-border-medium)', position: 'relative' }}>
                <svg style={{ position: 'absolute', right: -6, top: -7 }} width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
              <p style={{ color: flight.stops === 0 ? 'var(--color-green)' : 'var(--color-amber)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', margin: 0 }}>
                {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Arrival */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', lineHeight: 1, margin: 0 }}>
                {fmt(flight.arrival_at)}
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: '2px 0 0' }}>
                {flight.destination}
              </p>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center', margin: '12px 0 0' }}>
            {fmtDate(flight.departure_at)}
          </p>
        </div>

        {/* Baggage row */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: flight.baggage_included ? 'var(--color-green)' : 'var(--color-text-muted)', display: 'flex' }}>
            <BaggageIcon />
          </span>
          <p style={{ color: flight.baggage_included ? 'var(--color-green)' : 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            {flight.baggage_included ? 'Baggage included' : 'No baggage included'}
          </p>
        </div>
      </div>

      {/* Price summary */}
      <div
        style={{
          background: 'var(--color-primary-subtle)',
          border: '1px solid var(--color-primary-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '0 0 8px' }}>
          {currencySymbol}{flight.price_per_person.toLocaleString()} × {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>Total</p>
          <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', margin: 0 }}>
            {currencySymbol}{totalPrice.toLocaleString()}
          </p>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '6px 0 0' }}>Taxes & fees included</p>
      </div>

      {/* Step hint */}
      <div
        style={{
          background: 'var(--color-bg-glass)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 14px',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0, lineHeight: 1.6 }}>
          Step {step} of 3: {step === 1 ? 'Enter passenger details' : step === 2 ? 'Add contact information' : 'Review and confirm your booking'}
        </p>
      </div>
    </div>
  );

  // ── Step 1: Passenger details ─────────────────────────────────────────────

  const passengerStep = (
    <div>
      <h2
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-tight)',
          margin: '0 0 6px',
        }}
      >
        Passenger Details
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Enter details as they appear on your passport or government ID.
      </p>

      {passengers.map((p, i) => (
        <div
          key={i}
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            marginBottom: 16,
          }}
        >
          {/* Passenger heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7047EB, #9F6EFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-bold)',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
              {passengerCount === 1 ? 'Primary Passenger' : `Passenger ${i + 1}`}
            </p>
          </div>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input
              label="First Name"
              placeholder="John"
              value={p.first_name}
              onChange={e => updatePassenger(i, 'first_name', e.target.value)}
              error={errors[`p${i}_first_name`]}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={p.last_name}
              onChange={e => updatePassenger(i, 'last_name', e.target.value)}
              error={errors[`p${i}_last_name`]}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={p.date_of_birth}
              onChange={e => updatePassenger(i, 'date_of_birth', e.target.value)}
              error={errors[`p${i}_date_of_birth`]}
            />
            <Input
              label="Nationality (optional)"
              placeholder="US"
              maxLength={2}
              value={p.nationality}
              onChange={e => updatePassenger(i, 'nationality', e.target.value.toUpperCase())}
              error={errors[`p${i}_nationality`]}
              hint="2-letter ISO code"
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Passport Number (optional)"
                placeholder="e.g. A12345678"
                value={p.passport_number}
                onChange={e => updatePassenger(i, 'passport_number', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" size="md" onClick={handleBack}>
          ← Back to Search
        </Button>
        <Button variant="primary" size="md" onClick={handleNext}>
          Continue to Contact →
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Contact info ──────────────────────────────────────────────────

  const contactStep = (
    <div>
      <h2
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-tight)',
          margin: '0 0 6px',
        }}
      >
        Contact Information
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Your booking confirmation and travel updates will be sent here.
      </p>

      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            value={contactEmail}
            onChange={e => {
              setContactEmail(e.target.value);
              setErrors(prev => { const next = { ...prev }; delete next['contact_email']; return next; });
            }}
            error={errors['contact_email']}
          />
          <Input
            label="Phone Number (optional)"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            hint="For urgent flight notifications only"
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" size="md" onClick={handleBack}>
          ← Back
        </Button>
        <Button variant="primary" size="md" onClick={handleNext}>
          Review Booking →
        </Button>
      </div>
    </div>
  );

  // ── Step 3: Review & confirm ──────────────────────────────────────────────

  const reviewStep = (
    <div>
      <h2
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-tight)',
          margin: '0 0 6px',
        }}
      >
        Review &amp; Confirm
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Please review your booking details before confirming.
      </p>

      {/* API error banner */}
      {apiError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            marginBottom: 20,
            color: '#f87171',
            fontSize: 'var(--text-sm)',
          }}
        >
          {apiError}
        </div>
      )}

      {/* Flight summary row */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 10px' }}>
          Flight
        </p>
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--color-primary)', display: 'flex' }}>
              <PlaneIcon />
            </span>
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
                {flight.airline} {flight.flight_number}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '3px 0 0' }}>
                {flight.origin} → {flight.destination} · {fmt(flight.departure_at)} · {fmtDate(flight.departure_at)}
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0, flexShrink: 0 }}>
            {currencySymbol}{totalPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Passengers summary */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 10px' }}>
          Passengers
        </p>
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          {passengers.map((p, i) => (
            <div
              key={i}
              style={{
                padding: '14px 20px',
                borderBottom: i < passengers.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--color-bg-glass)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-bold)',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
                    {p.first_name} {p.last_name}
                  </p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '2px 0 0' }}>
                    DOB: {p.date_of_birth}
                    {p.nationality ? ` · ${p.nationality}` : ''}
                    {p.passport_number ? ` · ${p.passport_number}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Contact summary */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', margin: '0 0 10px' }}>
          Contact
        </p>
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
              {contactEmail}
            </p>
            {contactPhone && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '2px 0 0' }}>
                {contactPhone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Terms notice */}
      <div
        style={{
          background: 'var(--color-bg-glass)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          marginBottom: 28,
        }}
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0, lineHeight: 1.7 }}>
          By confirming, you agree to the fare rules for this ticket. Modifications and cancellations are subject to the airline's policy.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="ghost" size="md" onClick={handleBack} disabled={isLoading}>
          ← Back
        </Button>
        <Button variant="primary" size="lg" onClick={handleConfirm} disabled={isLoading}>
          {isLoading
            ? 'Confirming Booking...'
            : `Confirm & Pay ${currencySymbol}${totalPrice.toLocaleString()}`}
        </Button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const BOOKING_STEPS = [
    { number: '01', label: 'Search' },
    { number: '02', label: 'Book' },
    { number: '03', label: 'Confirm' },
  ];

  return (
    <>
      <TopNav
        steps={BOOKING_STEPS}
        currentStep={1}
        userName={userEmail}
        onStepClick={(i) => {
          if (i === 0) onBack();
          else if (i === 2 && onNavigate) onNavigate('confirm');
        }}
      />
      <div
        style={{
          display: 'flex',
          height: 'calc(100svh - 64px)',
          background: '#0A0A0F',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {leftSidebar}

        {/* Center: form steps */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 48px',
            maxWidth: 720,
          }}
        >
          <StepProgress step={step} />
          {step === 1 && passengerStep}
          {step === 2 && contactStep}
          {step === 3 && reviewStep}
        </div>
      </div>
    </>
  );
}
