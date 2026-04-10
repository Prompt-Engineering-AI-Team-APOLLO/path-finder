import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  message,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        gap: 12,
      }}
      className={className}
      role="status"
    >
      {/* Icon container */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-bg-card)',
          border: '1.5px solid var(--color-border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          marginBottom: 4,
        }}
        aria-hidden
      >
        {icon ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        )}
      </div>

      <p
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--weight-semibold)',
          lineHeight: 'var(--leading-snug)',
          maxWidth: 280,
          margin: 0,
        }}
      >
        {message}
      </p>

      {description && (
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)',
            maxWidth: 300,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}

      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
