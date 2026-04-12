import Button from './Button';

export interface CostBreakdownItem {
  label: string;
  amount: number;
}

export interface TotalCostBarProps {
  label?: string;
  totalPrice: number;
  currency?: string;
  subLabel?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  breakdown?: CostBreakdownItem[];
  className?: string;
}

export default function TotalCostBar({
  label = 'Total Trip Cost',
  totalPrice,
  currency = 'USD',
  subLabel,
  ctaLabel = 'Confirm & Book',
  onCta,
  ctaDisabled = false,
  ctaLoading = false,
  breakdown,
  className = '',
}: TotalCostBarProps) {
  const symbol = currency === 'USD' ? '$' : currency;

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
        padding: '16px 20px',
      }}
      className={className}
    >
      {/* Cost breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 14,
            padding: '12px 16px',
            background: 'var(--color-bg-glass)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                }}
              >
                {symbol}{item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total row + CTA */}
      <div className="flex items-center justify-between gap-4">
        {/* Price */}
        <div>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              marginBottom: 2,
            }}
          >
            {label}
          </p>
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--weight-extrabold)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 1,
            }}
          >
            {symbol}
            <span>{totalPrice.toLocaleString()}</span>
          </p>
          {subLabel && (
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                marginTop: 3,
              }}
            >
              {subLabel}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <Button
          variant="primary"
          size="lg"
          onClick={onCta}
          disabled={ctaDisabled}
          loading={ctaLoading}
          fullWidth={false}
          style={{ minWidth: 160 }}
          icon={
            !ctaLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            ) : undefined
          }
          iconPosition="right"
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
