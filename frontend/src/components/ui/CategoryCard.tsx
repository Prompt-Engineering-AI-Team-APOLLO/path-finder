import React from 'react';

export interface CategoryCardProps {
  title: string;
  subtitle?: string;
  image?: string;
  imageCss?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export default function CategoryCard({
  title,
  subtitle,
  image,
  imageCss,
  icon,
  onClick,
  selected = false,
  className = '',
}: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        border: selected
          ? '2px solid var(--color-border-selected)'
          : '1.5px solid var(--color-border)',
        boxShadow: selected ? 'var(--shadow-primary)' : 'var(--shadow-card)',
        transition: 'var(--transition-base)',
        cursor: 'pointer',
        position: 'relative',
        display: 'block',
        width: '100%',
        aspectRatio: '4/3',
        background: 'var(--color-bg-card)',
      }}
      className={`group text-left ${className}`}
    >
      {/* Background image or CSS gradient */}
      {image ? (
        <img
          src={image}
          alt={title}
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 400ms ease',
          }}
          className="group-hover:scale-105"
        />
      ) : imageCss ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: imageCss,
            transition: 'transform 400ms ease',
          }}
          className="group-hover:scale-105"
        />
      ) : null}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--gradient-card-overlay)',
        }}
      />

      {/* Selected indicator */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 22,
            height: 22,
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

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
        }}
      >
        {icon && (
          <div
            style={{
              color: 'rgba(255,255,255,0.75)',
              marginBottom: 6,
            }}
          >
            {icon}
          </div>
        )}
        <p
          style={{
            color: 'white',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-bold)',
            lineHeight: 'var(--leading-tight)',
            margin: 0,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}
