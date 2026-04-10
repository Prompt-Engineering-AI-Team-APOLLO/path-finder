import React from 'react';

export type BadgeVariant =
  | 'recommended'
  | 'curated'
  | 'selected'
  | 'escape'
  | 'confirmed'
  | 'trending'
  | 'default';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  recommended: {
    container: 'bg-[var(--color-coral-bg)] text-[var(--color-coral)] border-[var(--color-coral-border)]',
    dot: 'bg-[var(--color-coral)]',
  },
  curated: {
    container: 'bg-[var(--color-primary-subtle)] text-[var(--color-primary-light)] border-[var(--color-primary-border)]',
    dot: 'bg-[var(--color-primary-light)]',
  },
  selected: {
    container: 'bg-[var(--color-green-bg)] text-[var(--color-green)] border-[var(--color-green-border)]',
    dot: 'bg-[var(--color-green)]',
  },
  escape: {
    container: 'bg-[var(--color-teal-bg)] text-[var(--color-teal)] border-[var(--color-teal-border)]',
    dot: 'bg-[var(--color-teal)]',
  },
  confirmed: {
    container: 'bg-[var(--color-green-bg)] text-[var(--color-green)] border-[var(--color-green-border)]',
    dot: 'bg-[var(--color-green)]',
  },
  trending: {
    container: 'bg-[var(--color-orange-bg)] text-[var(--color-orange)] border-[var(--color-orange-border)]',
    dot: 'bg-[var(--color-orange)]',
  },
  default: {
    container: 'bg-[var(--color-bg-glass)] text-[var(--color-text-secondary)] border-[var(--color-border-medium)]',
    dot: 'bg-[var(--color-text-secondary)]',
  },
};

export default function Badge({
  variant = 'default',
  children,
  dot = false,
  className = '',
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      style={{ fontFamily: 'var(--font-sans)' }}
      className={[
        'inline-flex items-center gap-1.5',
        'px-2.5 py-0.5',
        'rounded-[var(--radius-full)]',
        'text-[10px] font-bold tracking-[var(--tracking-wider)] uppercase',
        'border',
        styles.container,
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      )}
      {children}
    </span>
  );
}
