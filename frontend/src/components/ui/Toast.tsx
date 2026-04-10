import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title: string;
  subtitle?: string;
  duration?: number;
  onDismiss?: () => void;
}

const typeStyles: Record<ToastType, { border: string; icon: React.ReactNode }> = {
  success: {
    border: 'var(--color-green-border)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  error: {
    border: 'var(--color-coral-border)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  info: {
    border: 'var(--color-primary-border)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    border: 'var(--color-amber-border)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

export default function Toast({
  type = 'success',
  title,
  subtitle,
  duration = 4000,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);

    let leaveTimer: ReturnType<typeof setTimeout>;
    if (duration > 0) {
      leaveTimer = setTimeout(() => {
        setLeaving(true);
        setTimeout(() => onDismiss?.(), 300);
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
    };
  }, [duration, onDismiss]);

  const { border, icon } = typeStyles[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 'var(--z-toast)' as unknown as number,
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-card)',
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-xl)',
        padding: '14px 16px',
        minWidth: 300,
        maxWidth: 380,
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateY(0)' : 'translateY(12px)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            lineHeight: 'var(--leading-snug)',
            margin: 0,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-xs)',
              marginTop: 3,
              lineHeight: 'var(--leading-normal)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => {
          setLeaving(true);
          setTimeout(() => onDismiss?.(), 300);
        }}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          transition: 'var(--transition-base)',
        }}
        className="hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-glass)]"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}


/* ── ToastContainer: manages a stack of toasts ── */

export interface ToastItem extends ToastProps {
  id: string;
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            {...toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
