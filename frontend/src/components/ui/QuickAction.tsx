import React from 'react';

export interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function QuickAction({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className = '',
}: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-sans)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        background: active ? 'var(--color-primary-subtle)' : 'var(--color-bg-glass)',
        border: active
          ? '1px solid var(--color-primary-border)'
          : '1px solid var(--color-border)',
        color: active ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition-base)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.4 : 1,
      }}
      className={`hover:border-[var(--color-border-medium)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-glass-hover)] ${className}`}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: 14, height: 14 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
