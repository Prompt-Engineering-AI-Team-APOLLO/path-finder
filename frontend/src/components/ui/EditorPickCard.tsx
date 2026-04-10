import React from 'react';

export interface EditorPickCardProps {
  image?: string;
  imageCss?: string;
  label?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  className?: string;
}

export default function EditorPickCard({
  image,
  imageCss,
  label = "Editor's Pick",
  title,
  description,
  ctaLabel = 'Explore',
  onCta,
  secondaryCtaLabel,
  onSecondaryCta,
  className = '',
}: EditorPickCardProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)',
        border: '1.5px solid var(--color-border)',
        minHeight: 280,
      }}
      className={`group ${className}`}
    >
      {/* Full-bleed background image or gradient */}
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
          style={{ position: 'absolute', inset: 0, background: imageCss ?? 'var(--color-bg-card)' }}
        />
      )}

      {/* Dark gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(8,8,26,0.15) 0%, rgba(8,8,26,0.82) 60%, rgba(8,8,26,0.96) 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 280,
        }}
      >
        {/* Top label tag */}
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 12px',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-bold)',
              color: 'white',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" aria-hidden>
              <path d="M12 2l2.09 6.26H22l-6.18 4.49 2.35 7.25L12 15.77l-6.18 4.23 2.35-7.25L2 8.26h7.91z" />
            </svg>
            {label}
          </span>
        </div>

        {/* Bottom content */}
        <div>
          <h3
            style={{
              color: 'white',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--weight-bold)',
              lineHeight: 'var(--leading-tight)',
              letterSpacing: 'var(--tracking-tight)',
              margin: '0 0 8px',
            }}
          >
            {title}
          </h3>
          {description && (
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-normal)',
                marginBottom: 16,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </p>
          )}
          {(onCta || onSecondaryCta) && (
            <div className="flex items-center gap-3">
              {onCta && (
                <button
                  type="button"
                  onClick={onCta}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    boxShadow: 'var(--shadow-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  className="hover:opacity-90"
                >
                  {ctaLabel}
                </button>
              )}
              {onSecondaryCta && (
                <button
                  type="button"
                  onClick={onSecondaryCta}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.12)',
                    color: 'white',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    backdropFilter: 'blur(8px)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  className="hover:bg-[rgba(255,255,255,0.18)]"
                >
                  {secondaryCtaLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
