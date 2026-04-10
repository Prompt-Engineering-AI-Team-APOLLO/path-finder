import React, { useState } from 'react';

export interface TripSummaryItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  price?: string | number;
  currency?: string;
  expandable?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function TripSummaryItem({
  icon,
  label,
  value,
  price,
  currency = 'USD',
  expandable = false,
  children,
  className = '',
}: TripSummaryItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        borderBottom: '1px solid var(--color-border)',
      }}
      className={className}
    >
      <div
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        onClick={expandable ? () => setExpanded((v) => !v) : undefined}
        onKeyDown={expandable ? (e) => e.key === 'Enter' && setExpanded((v) => !v) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          cursor: expandable ? 'pointer' : 'default',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary-light)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Label + value */}
        <div className="flex-1 min-w-0">
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              marginBottom: 2,
            }}
          >
            {label}
          </p>
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value}
          </p>
        </div>

        {/* Price or expand chevron */}
        <div className="shrink-0 flex items-center gap-2">
          {price !== undefined && (
            <span
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-bold)',
              }}
            >
              {currency === 'USD' ? '$' : currency}
              {typeof price === 'number' ? price.toLocaleString() : price}
            </span>
          )}
          {expandable && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'var(--transition-base)',
              }}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>
      </div>

      {/* Expandable content */}
      {expandable && expanded && children && (
        <div
          style={{
            paddingBottom: 12,
            paddingLeft: 48,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
