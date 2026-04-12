
export interface ActivityCardProps {
  image: string;
  tag?: string;
  title: string;
  description?: string;
  price?: string | number;
  currency?: string;
  onClick?: () => void;
  className?: string;
}

export default function ActivityCard({
  image,
  tag,
  title,
  description,
  price,
  currency = 'USD',
  onClick,
  className = '',
}: ActivityCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-card)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        transition: 'var(--transition-base)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      className={`group hover:border-[var(--color-border-medium)] hover:shadow-[var(--shadow-md)] ${className}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={image}
          alt={title}
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {tag && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'var(--color-primary-subtle)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--color-primary-border)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              color: 'var(--color-primary-light)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
            }}
          >
            {tag}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <h3
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-semibold)',
            lineHeight: 'var(--leading-snug)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-normal)',
              marginTop: 4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}
        {price !== undefined && (
          <p
            style={{
              color: 'var(--color-primary-light)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-bold)',
              marginTop: 10,
            }}
          >
            {currency === 'USD' ? '$' : currency}
            {typeof price === 'number' ? price.toLocaleString() : price}
            <span
              style={{
                color: 'var(--color-text-muted)',
                fontWeight: 'var(--weight-regular)',
                marginLeft: 4,
                fontSize: 'var(--text-xs)',
              }}
            >
              / person
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
