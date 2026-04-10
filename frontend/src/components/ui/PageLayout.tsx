import React from 'react';

export interface PageLayoutProps {
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  className?: string;
}

export default function PageLayout({
  leftPanel,
  rightPanel,
  children,
  leftWidth = 320,
  rightWidth = 300,
  className = '',
}: PageLayoutProps) {
  const hasLeft = Boolean(leftPanel);
  const hasRight = Boolean(rightPanel);

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        background: 'var(--color-bg-base)',
        fontFamily: 'var(--font-sans)',
      }}
      className={className}
    >
      {/* ── Left Panel (AI Companion) ── */}
      {hasLeft && (
        <aside
          style={{
            width: leftWidth,
            minWidth: leftWidth,
            height: '100%',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          {leftPanel}
        </aside>
      )}

      {/* ── Center Content ── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) transparent',
        }}
      >
        {children}
      </main>

      {/* ── Right Panel (Trip Summary) ── */}
      {hasRight && (
        <aside
          style={{
            width: rightWidth,
            minWidth: rightWidth,
            height: '100%',
            flexShrink: 0,
            borderLeft: '1px solid var(--color-border)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--color-border) transparent',
          }}
        >
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
