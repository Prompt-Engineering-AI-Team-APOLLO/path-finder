import React, { useState, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  fullWidth = true,
  className = '',
  type = 'text',
  id: externalId,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
          }}
          className="block"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Left icon */}
        {iconLeft && (
          <span
            style={{ color: 'var(--color-text-muted)' }}
            className="absolute left-3.5 flex items-center pointer-events-none z-10"
          >
            {iconLeft}
          </span>
        )}

        <input
          id={inputId}
          type={resolvedType}
          disabled={disabled}
          style={{
            background: 'var(--color-bg-input)',
            color: 'var(--color-text-primary)',
            borderColor: error
              ? 'var(--color-coral)'
              : 'var(--color-border-medium)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            transition: 'var(--transition-base)',
          }}
          className={[
            'w-full h-11 border bg-transparent',
            'placeholder:text-[var(--color-text-muted)]',
            'outline-none',
            'focus:border-[var(--color-primary)]',
            'focus:shadow-[var(--shadow-input)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            iconLeft ? 'pl-10' : 'pl-4',
            iconRight || isPassword ? 'pr-10' : 'pr-4',
            className,
          ].join(' ')}
          {...props}
        />

        {/* Right icon or password toggle */}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{ color: 'var(--color-text-muted)' }}
            className="absolute right-3.5 flex items-center hover:text-[var(--color-text-secondary)] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        ) : iconRight ? (
          <span
            style={{ color: 'var(--color-text-muted)' }}
            className="absolute right-3.5 flex items-center pointer-events-none"
          >
            {iconRight}
          </span>
        ) : null}
      </div>

      {/* Error or hint */}
      {error ? (
        <p
          style={{
            color: 'var(--color-coral)',
            fontSize: 'var(--text-xs)',
          }}
          className="flex items-center gap-1"
          role="alert"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
