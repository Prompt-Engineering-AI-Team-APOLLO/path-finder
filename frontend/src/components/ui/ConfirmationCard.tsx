import Badge from './Badge';

export interface ConfirmationCardProps {
  airline: string;
  flightNumber: string;
  cabinClass: string;
  departureTime: string;
  departureCode: string;
  departureCity: string;
  arrivalTime: string;
  arrivalCode: string;
  arrivalCity: string;
  duration: string;
  date: string;
  seat?: string;
  bookingRef?: string;
  className?: string;
}

export default function ConfirmationCard({
  airline,
  flightNumber,
  cabinClass,
  departureTime,
  departureCode,
  departureCity,
  arrivalTime,
  arrivalCode,
  arrivalCity,
  duration,
  date,
  seat,
  bookingRef,
  className = '',
}: ConfirmationCardProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-card)',
        border: '1.5px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}
      className={className}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--gradient-primary-soft)',
          borderBottom: '1px solid var(--color-border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-bold)',
            }}
          >
            {airline}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 1 }}>
            {flightNumber} · {cabinClass}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="confirmed" dot>Confirmed</Badge>
        </div>
      </div>

      {/* Route */}
      <div style={{ padding: '20px' }}>
        <div className="flex items-center gap-4">
          {/* Departure */}
          <div className="flex-1">
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--weight-extrabold)',
                lineHeight: 1,
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {departureTime}
            </p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                marginTop: 2,
              }}
            >
              {departureCode}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
              {departureCity}
            </p>
          </div>

          {/* Duration / dashed line */}
          <div className="flex-1 flex flex-col items-center">
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 6 }}>
              {duration}
            </p>
            <div className="w-full flex items-center gap-0">
              <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--color-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, borderTop: '2px dashed var(--color-primary-border)' }} />
              {/* Plane icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary)" style={{ flexShrink: 0 }}>
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <div style={{ flex: 1, borderTop: '2px dashed var(--color-primary-border)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--color-primary)', flexShrink: 0 }} />
            </div>
            <p style={{ color: 'var(--color-green)', fontSize: 'var(--text-xs)', marginTop: 5, fontWeight: 'var(--weight-medium)' }}>
              Nonstop
            </p>
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--weight-extrabold)',
                lineHeight: 1,
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {arrivalTime}
            </p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                marginTop: 2,
              }}
            >
              {arrivalCode}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
              {arrivalCity}
            </p>
          </div>
        </div>

        {/* Footer details */}
        {(date || seat || bookingRef) && (
          <div
            style={{
              borderTop: '1px dashed var(--color-border-medium)',
              marginTop: 16,
              paddingTop: 14,
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            {date && (
              <div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Date</p>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{date}</p>
              </div>
            )}
            {seat && (
              <div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Seat</p>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{seat}</p>
              </div>
            )}
            {bookingRef && (
              <div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Booking Ref</p>
                <p
                  style={{
                    color: 'var(--color-primary-light)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-bold)',
                    letterSpacing: 'var(--tracking-wide)',
                    fontFamily: 'monospace',
                  }}
                >
                  {bookingRef}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
