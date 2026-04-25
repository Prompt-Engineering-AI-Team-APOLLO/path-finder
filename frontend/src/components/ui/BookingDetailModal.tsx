import { ConfirmationCard } from './index';
import type { BookingRead } from '../../pages/BookingPage';

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
  if (status === 'modified')  return { color: '#D97706', bg: 'rgba(217,119,6,0.1)',  border: 'rgba(217,119,6,0.3)',  label: 'Modified'  };
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: 'Confirmed' };
}

/* ── Icons ── */
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

export interface BookingDetailModalProps {
  booking: BookingRead;
  onClose: () => void;
  loading?: boolean;
}

export default function BookingDetailModal({ booking, onClose, loading = false }: BookingDetailModalProps) {
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const ss = statusStyle(booking.status);

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="surface-light"
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-2xl)',
          position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid var(--color-primary-border)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--color-primary-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--gradient-primary)',
        }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--text-xs)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Booking Details
            </p>
            <p style={{ color: '#FFFFFF', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-extrabold)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
              {booking.booking_reference}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              background: ss.bg, border: `1px solid ${ss.border}`,
              color: ss.color, fontSize: 11, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{ss.label}</span>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ── Loading bar (uses CSS tokens) ── */}
        {loading && (
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, var(--color-primary), var(--color-primary-light), var(--color-primary))`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s linear infinite',
          }} />
        )}

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px', background: '#FFFFFF' }}>

          {/* Flight — reuse ConfirmationCard */}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Flight
          </p>
          <div style={{ marginBottom: 24 }}>
            <ConfirmationCard
              airline={booking.outbound_airline}
              flightNumber={booking.outbound_flight_number}
              cabinClass={booking.cabin_class.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              departureTime={fmtTime(booking.outbound_departure_at)}
              departureCode={booking.outbound_origin}
              departureCity={booking.outbound_origin_city}
              arrivalTime={fmtTime(booking.outbound_arrival_at)}
              arrivalCode={booking.outbound_destination}
              arrivalCity={booking.outbound_destination_city}
              duration={fmtDuration(booking.outbound_duration_minutes)}
              date={fmtFullDate(booking.outbound_departure_at)}
              bookingRef={booking.booking_reference}
            />
          </div>

          {/* Passengers */}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Passengers ({booking.passengers.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {booking.passengers.map((p, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                background: 'var(--color-bg-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--color-primary-subtle)',
                  border: '1.5px solid var(--color-primary-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
                    {p.first_name} {p.last_name}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4 }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                      DOB: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{p.date_of_birth}</span>
                    </p>
                    {p.nationality && (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                        Nationality: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{p.nationality}</span>
                      </p>
                    )}
                    {p.passport_number && (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                        Passport: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontFamily: 'monospace' }}>{p.passport_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Contact
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--color-bg-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ color: 'var(--color-text-muted)' }}><MailIcon /></span>
              <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{booking.contact_email}</span>
            </div>
            {booking.contact_phone && (
              <div style={{
                padding: '12px 16px',
                background: 'var(--color-bg-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}><PhoneIcon /></span>
                <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{booking.contact_phone}</span>
              </div>
            )}
          </div>

          {/* Price summary */}
          <div style={{
            padding: '16px 18px',
            background: 'var(--color-primary-subtle)',
            border: '1.5px solid var(--color-primary-border)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Total Paid</p>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-extrabold)', margin: '4px 0 0', letterSpacing: 'var(--tracking-tight)' }}>
                {booking.currency === 'USD' ? '$' : booking.currency}{booking.total_price.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Booked on</p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 600, margin: '4px 0 0' }}>{fmtShortDate(booking.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
