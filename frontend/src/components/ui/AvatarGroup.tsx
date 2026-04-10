import React from 'react';
import Avatar from './Avatar';

export interface AvatarGroupItem {
  src?: string;
  name?: string;
  alt?: string;
}

export interface AvatarGroupProps {
  avatars: AvatarGroupItem[];
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizePx: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

const countTextSize: Record<string, string> = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

export default function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
  className = '',
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;
  const px = sizePx[size];
  const overlap = Math.round(px * 0.35);

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ paddingLeft: overlap }}
      role="group"
      aria-label={`${avatars.length} members`}
    >
      {visible.map((avatar, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: visible.length - i,
            position: 'relative',
          }}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt}
            size={size}
          />
        </div>
      ))}

      {overflow > 0 && (
        <div
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: 'var(--color-bg-card-hover)',
            border: '1.5px solid var(--color-border-medium)',
            marginLeft: -overlap,
            zIndex: 0,
            position: 'relative',
            fontFamily: 'var(--font-sans)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-text-secondary)',
          }}
          className={`flex items-center justify-center ${countTextSize[size]}`}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
