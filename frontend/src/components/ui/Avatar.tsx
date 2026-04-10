import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizePx: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const textSize: Record<string, string> = {
  xs: 'text-[9px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const dotSize: Record<string, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getAvatarColor(name: string): string {
  const colors = [
    '#7047EB', '#5B8AFF', '#F4617F', '#22C55E',
    '#0DD1CC', '#F97316', '#F59E0B', '#8B5CF6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({
  src,
  alt,
  name = '',
  size = 'md',
  online,
  className = '',
}: AvatarProps) {
  const px = sizePx[size];
  const dot = dotSize[size];
  const initials = name ? getInitials(name) : '?';
  const bgColor = getAvatarColor(name || 'user');

  return (
    <div
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <div
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          overflow: 'hidden',
          background: src ? 'var(--color-bg-card)' : bgColor,
          border: '1.5px solid var(--color-border-medium)',
          flexShrink: 0,
        }}
        className="flex items-center justify-center"
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', color: '#fff' }}
            className={textSize[size]}
          >
            {initials}
          </span>
        )}
      </div>

      {online !== undefined && (
        <span
          style={{
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: online ? 'var(--color-green)' : 'var(--color-text-muted)',
            border: '2px solid var(--color-bg-base)',
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
