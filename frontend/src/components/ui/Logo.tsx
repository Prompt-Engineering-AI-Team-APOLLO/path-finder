
export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: 'text-base' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 44, text: 'text-2xl' },
};

export default function Logo({
  size = 'md',
  showWordmark = true,
  className = '',
}: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      {/* Icon mark */}
      <div
        style={{
          width: icon,
          height: icon,
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-primary)',
        }}
        className="flex items-center justify-center shrink-0"
        aria-hidden
      >
        {/* Compass / path arrow icon */}
        <svg
          width={icon * 0.55}
          height={icon * 0.55}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.54 5.06L11 13.5a.5.5 0 01-.64.26l-2.5-1a.5.5 0 01-.26-.64l2.54-6.44a.5.5 0 01.9 0l2 3.44a.5.5 0 01-.5.94z"
            fill="white"
            opacity="0.9"
          />
          <circle cx="10" cy="10" r="1.5" fill="white" />
        </svg>
      </div>

      {showWordmark && (
        <span
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: 'var(--weight-bold)',
            letterSpacing: 'var(--tracking-tight)',
          }}
          className={text}
        >
          Pathfinder
        </span>
      )}
    </div>
  );
}
