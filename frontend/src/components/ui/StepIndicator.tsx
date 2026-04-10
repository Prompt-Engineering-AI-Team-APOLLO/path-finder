import React from 'react';

export interface Step {
  number: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export default function StepIndicator({
  steps,
  currentStep,
  className = '',
}: StepIndicatorProps) {
  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`flex items-center gap-1 ${className}`}
      role="list"
      aria-label="Progress steps"
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <React.Fragment key={step.number}>
            <div
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: isActive
                  ? 'var(--color-primary-subtle)'
                  : 'transparent',
                border: isActive
                  ? '1px solid var(--color-primary-border)'
                  : '1px solid transparent',
                transition: 'var(--transition-base)',
              }}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Step number bubble */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isCompleted
                    ? 'var(--color-primary)'
                    : isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-bg-glass)',
                  border: isPending
                    ? '1.5px solid var(--color-border-medium)'
                    : 'none',
                  transition: 'var(--transition-base)',
                }}
              >
                {isCompleted ? (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 'var(--weight-bold)',
                      color: isActive ? 'white' : 'var(--color-text-muted)',
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                  color: isActive
                    ? 'var(--color-text-primary)'
                    : isCompleted
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                  transition: 'var(--transition-base)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {index < steps.length - 1 && (
              <div
                style={{
                  width: 20,
                  height: 1,
                  background: isCompleted
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                  transition: 'var(--transition-slow)',
                  flexShrink: 0,
                }}
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
