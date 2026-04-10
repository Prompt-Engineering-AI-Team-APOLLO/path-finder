import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const sizeMap: Record<string, string> = {
  sm: 'h-8 px-4 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
};

const iconSizeMap: Record<string, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const variantMap: Record<string, string> = {
  primary: [
    'bg-[var(--color-primary)] text-white',
    'hover:bg-[var(--color-primary-hover)]',
    'active:scale-[0.97]',
    'shadow-[var(--shadow-primary)]',
    'hover:shadow-[var(--shadow-primary-lg)]',
  ].join(' '),

  secondary: [
    'bg-transparent text-[var(--color-text-primary)]',
    'border border-[var(--color-border-medium)]',
    'hover:border-[var(--color-border-strong)]',
    'hover:bg-[var(--color-bg-glass-hover)]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--color-text-secondary)]',
    'hover:text-[var(--color-text-primary)]',
    'hover:bg-[var(--color-bg-glass)]',
  ].join(' '),

  icon: [
    'bg-transparent text-[var(--color-text-secondary)]',
    'hover:text-[var(--color-text-primary)]',
    'hover:bg-[var(--color-bg-glass)]',
  ].join(' '),

  dark: [
    'bg-[#0F0F28] text-white',
    'hover:bg-[#1a1a40]',
    'active:scale-[0.97]',
    'shadow-[var(--shadow-md)]',
  ].join(' '),
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isIcon = variant === 'icon';
  const sizeClass = isIcon ? iconSizeMap[size] : sizeMap[size];

  return (
    <button
      disabled={disabled || loading}
      style={{ fontFamily: 'var(--font-sans)' }}
      className={[
        'inline-flex items-center justify-center font-semibold select-none',
        'rounded-[var(--radius-full)] cursor-pointer',
        'transition-all duration-[var(--duration-base)] ease-[var(--ease-default)]',
        'outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--color-primary)]',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--color-bg-base)]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        fullWidth ? 'w-full' : '',
        sizeClass,
        variantMap[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {!isIcon && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {isIcon ? icon : <span>{children}</span>}
          {icon && iconPosition === 'right' && !isIcon && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}
