import React from 'react';
import Badge, { BadgeVariant } from './Badge';

export interface TravelStyleCardProps {
  image?: string;
  imageCss?: string;
  tag: string;
  tagVariant?: BadgeVariant;
  title: string;
  description?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function TravelStyleCard({
  image,
  imageCss,
  tag,
  tagVariant = 'curated',
  title,
  description,
  selected = false,
  onSelect,
  className = '',
}: TravelStyleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        position: 'relative',
        border: selected
          ? '2px solid var(--color-border-selected)'
          : '1.5px solid var(--color-border)',
        boxShadow: selected ? 'var(--shadow-primary-lg)' : 'var(--shadow-card)',
        transition: 'var(--transition-slow)',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        aspectRatio: '3/4',
        textAlign: 'left',
        background: 'var(--color-bg-card)',
      }}
      className={`group ${className}`}
      aria-pressed={selected}
    >
      {/* Background image or CSS gradient */}
      {image ? (
        <img
          src={image}
          alt={title}
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 500ms ease' }}
          className="group-hover:scale-105"
        />
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, background: imageCss ?? 'var(--color-bg-card)', transition: 'transform 500ms ease' }}
          className="group-hover:scale-[1.02]"
        />
      )}

      {/* Gradient overlay — stronger at bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: selected
            ? 'linear-gradient(180deg, rgba(112,71,235,0.2) 0%, rgba(8,8,26,0.88) 100%)'
            : 'var(--gradient-card-overlay)',
          transition: 'var(--transition-slow)',
        }}
      />

      {/* Selection ring highlight */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'inset 0 0 0 2px var(--color-primary)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          position: 'relative',
          padding: '14px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top: tag + check */}
        <div className="flex items-start justify-between">
          <Badge variant={tagVariant}>{tag}</Badge>
          {selected && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                boxShadow: 'var(--shadow-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom: title + description */}
        <div>
          <h3
            style={{
              color: 'white',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-bold)',
              lineHeight: 'var(--leading-tight)',
              letterSpacing: 'var(--tracking-tight)',
              margin: 0,
            }}
          >
            {title}
          </h3>
          {description && (
            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 'var(--text-xs)',
                lineHeight: 'var(--leading-normal)',
                marginTop: 4,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
