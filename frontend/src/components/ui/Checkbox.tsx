import React, { useId } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export default function Checkbox({
  label,
  description,
  error,
  id: externalId,
  className = '',
  checked,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = externalId ?? generatedId;

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`flex items-start gap-3 ${className}`}
    >
      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          className="sr-only peer"
          {...props}
        />
        <label
          htmlFor={checkboxId}
          style={{
            width: 18,
            height: 18,
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-medium)'}`,
            background: checked ? 'var(--color-primary)' : 'var(--color-bg-input)',
            transition: 'var(--transition-base)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: checked ? 'var(--shadow-primary)' : 'none',
          }}
          className="flex items-center justify-center"
          aria-hidden
        >
          {checked && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden
            >
              <path
                d="M1.5 5L3.8 7.5L8.5 2.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </label>
      </div>

      {(label || description) && (
        <div className="flex flex-col gap-0.5 min-w-0">
          {label && (
            <label
              htmlFor={checkboxId}
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer',
              }}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {description}
            </p>
          )}
          {error && (
            <p
              style={{
                color: 'var(--color-coral)',
                fontSize: 'var(--text-xs)',
              }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
