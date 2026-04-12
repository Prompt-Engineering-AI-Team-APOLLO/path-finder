
export interface DividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function Divider({
  label,
  orientation = 'horizontal',
  className = '',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        style={{
          width: 1,
          alignSelf: 'stretch',
          background: 'var(--color-border)',
        }}
        role="separator"
        aria-orientation="vertical"
        className={className}
      />
    );
  }

  if (!label) {
    return (
      <div
        style={{
          height: 1,
          background: 'var(--color-border)',
          width: '100%',
        }}
        role="separator"
        aria-orientation="horizontal"
        className={className}
      />
    );
  }

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`flex items-center gap-3 w-full ${className}`}
      role="separator"
      aria-orientation="horizontal"
    >
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <span
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)',
          whiteSpace: 'nowrap',
          padding: '0 4px',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  );
}
