import Logo from './Logo';
import StepIndicator, { type Step } from './StepIndicator';
import Avatar from './Avatar';

export interface TopNavProps {
  steps?: Step[];
  currentStep?: number;
  onStepClick?: (index: number) => void;
  userAvatar?: string;
  userName?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
  className?: string;
}

export default function TopNav({
  steps,
  currentStep = 0,
  onStepClick,
  userAvatar,
  userName,
  notificationCount = 0,
  onNotificationClick,
  onAvatarClick,
  className = '',
}: TopNavProps) {
  return (
    <header
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        height: 64,
      }}
      className={className}
    >
      <div
        className="flex items-center justify-between h-full"
        style={{ padding: '0 24px', maxWidth: '100%' }}
      >
        {/* Left: Logo */}
        <div className="flex items-center" style={{ minWidth: 180 }}>
          <Logo size="sm" />
        </div>

        {/* Center: Step indicator */}
        {steps && steps.length > 0 && (
          <div className="hidden md:flex items-center">
            <StepIndicator steps={steps} currentStep={currentStep} onStepClick={onStepClick} />
          </div>
        )}

        {/* Right: Notification + Avatar */}
        <div className="flex items-center gap-3" style={{ minWidth: 180, justifyContent: 'flex-end' }}>
          {/* Notification bell */}
          <button
            type="button"
            onClick={onNotificationClick}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-bg-glass)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              transition: 'var(--transition-base)',
            }}
            className="hover:bg-[var(--color-bg-glass-hover)] hover:text-[var(--color-text-primary)]"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {notificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-coral)',
                  border: '1.5px solid var(--color-bg-elevated)',
                }}
                aria-hidden
              />
            )}
          </button>

          {/* User avatar */}
          {(userAvatar || userName) && (
            <button
              type="button"
              onClick={onAvatarClick}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'var(--transition-base)',
              }}
              className="hover:opacity-80"
              aria-label="User menu"
            >
              <Avatar
                src={userAvatar}
                name={userName}
                size="sm"
                online={true}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
