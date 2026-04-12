import Badge from './Badge';

export interface FlightCardProps {
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  cabinClass: string;
  departureTime: string;
  departureCode: string;
  arrivalTime: string;
  arrivalCode: string;
  duration: string;
  stops: number;
  price: string | number;
  currency?: string;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function FlightCard({
  airline,
  airlineLogo,
  flightNumber,
  cabinClass,
  departureTime,
  departureCode,
  arrivalTime,
  arrivalCode,
  duration,
  stops,
  price,
  currency = 'USD',
  recommended = false,
  selected = false,
  onSelect,
  className = '',
}: FlightCardProps) {
  const stopLabel = stops === 0 ? 'Nonstop' : stops === 1 ? '1 stop' : `${stops} stops`;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        fontFamily: 'var(--font-sans)',
        background: selected ? 'var(--color-primary-subtle)' : 'var(--color-bg-card)',
        border: selected
          ? '1.5px solid var(--color-border-selected)'
          : '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 20px',
        width: '100%',
        cursor: 'pointer',
        transition: 'var(--transition-base)',
        boxShadow: selected ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
        textAlign: 'left',
        display: 'block',
      }}
      className={`group hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-card-hover)] ${className}`}
    >
      {/* Top row: airline + badge + selected check */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {airlineLogo ? (
            <img
              src={airlineLogo}
              alt={airline}
              className="h-6 w-auto object-contain"
              draggable={false}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
          )}
          <div>
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 1,
              }}
            >
              {airline}
            </p>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                marginTop: 2,
              }}
            >
              {flightNumber} · {cabinClass}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {recommended && <Badge variant="recommended">Recommended</Badge>}
          {selected && (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Flight route row */}
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="text-left min-w-[60px]">
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-bold)',
              lineHeight: 1,
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            {departureTime}
          </p>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              marginTop: 2,
            }}
          >
            {departureCode}
          </p>
        </div>

        {/* Duration / route line */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {duration}
          </p>
          <div className="w-full flex items-center gap-1">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: '1.5px solid var(--color-text-muted)',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'var(--color-border-medium)',
              }}
            />
            {stops > 0 && (
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--color-amber)',
                  flexShrink: 0,
                }}
              />
            )}
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'var(--color-border-medium)',
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)" aria-hidden>
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <p
            style={{
              color: stops === 0 ? 'var(--color-green)' : 'var(--color-amber)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
            }}
          >
            {stopLabel}
          </p>
        </div>

        {/* Arrival */}
        <div className="text-right min-w-[60px]">
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-bold)',
              lineHeight: 1,
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            {arrivalTime}
          </p>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              marginTop: 2,
            }}
          >
            {arrivalCode}
          </p>
        </div>
      </div>

      {/* Bottom row: price */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          marginTop: 14,
          paddingTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
          }}
        >
          per person
        </span>
        <span
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-bold)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {currency === 'USD' ? '$' : currency}
          {typeof price === 'number' ? price.toLocaleString() : price}
        </span>
      </div>
    </button>
  );
}
