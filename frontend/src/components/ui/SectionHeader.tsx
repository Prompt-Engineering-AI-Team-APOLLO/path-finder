import React from 'react';

export interface SectionHeaderProps {
  icon?: React.ReactNode;
  heading: string;
  subheading?: string;
  action?: React.ReactNode;
  theme?: 'dark' | 'light';
  className?: string;
}

export default function SectionHeader({
  icon,
  heading,
  subheading,
  action,
  theme = 'dark',
  className = '',
}: SectionHeaderProps) {
  const headingColor = theme === 'light' ? 'var(--color-text-dark)' : 'var(--color-text-primary)';
  const subColor = theme === 'light' ? 'var(--color-text-dark-secondary)' : 'var(--color-text-secondary)';
  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
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
        )}
        <div>
          <h2
            style={{
              color: headingColor,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-tight)',
              margin: 0,
            }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              style={{
                color: subColor,
                fontSize: 'var(--text-sm)',
                marginTop: 2,
              }}
            >
              {subheading}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
