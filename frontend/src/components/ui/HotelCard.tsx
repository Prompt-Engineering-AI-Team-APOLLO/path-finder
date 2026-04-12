export interface HotelCardProps {
  image: string;
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  pricePerNight: number;
  currency?: string;
  rating?: number;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'var(--color-amber)' : 'var(--color-border-medium)'} aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function HotelCard({
  image,
  name,
  location,
  checkIn,
  checkOut,
  nights,
  roomType,
  pricePerNight,
  currency = 'USD',
  rating,
  selected = false,
  onSelect,
  className = '',
}: HotelCardProps) {
  const stars = rating ? Math.round(rating) : 0;
  const totalPrice = pricePerNight * nights;

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? (e) => e.key === 'Enter' && onSelect() : undefined}
      style={{
        fontFamily: 'var(--font-sans)',
        background: selected ? 'var(--color-primary-subtle)' : 'var(--color-bg-card)',
        border: selected
          ? '1.5px solid var(--color-border-selected)'
          : '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: selected ? 'var(--shadow-primary)' : 'var(--shadow-card)',
        transition: 'var(--transition-base)',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      className={`group hover:border-[var(--color-border-primary)] ${className}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <img
          src={image}
          alt={name}
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              boxShadow: 'var(--shadow-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--weight-bold)',
                lineHeight: 'var(--leading-snug)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </h3>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                marginTop: 2,
              }}
              className="flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-text-muted)" aria-hidden>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {location}
            </p>
          </div>
          {rating !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} filled={i < stars} />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            marginTop: 12,
            paddingTop: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 16px',
          }}
        >
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Check-in</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{checkIn}</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Check-out</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{checkOut}</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Room</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{roomType}</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{nights} nights total</p>
            <p style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
              {currency === 'USD' ? '$' : currency}{totalPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
