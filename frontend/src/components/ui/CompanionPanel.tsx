import React, { useRef, useEffect } from 'react';
import Avatar from './Avatar';
import ChatMessage, { type MessageRole } from './ChatMessage';
import ChatInput from './ChatInput';
import QuickAction from './QuickAction';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export interface QuickActionItem {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export interface CompanionPanelProps {
  messages: Message[];
  onSendMessage?: (message: string) => void;
  assistantName?: string;
  assistantSubtitle?: string;
  assistantAvatarSrc?: string;
  headerIcon?: React.ReactNode;
  isOnline?: boolean;
  inputPlaceholder?: string;
  isTyping?: boolean;
  quickActions?: QuickActionItem[];
  quickActionsLabel?: string;
  inputDisabled?: boolean;
  inputLoading?: boolean;
  className?: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name="Pathfinder" size="xs" />
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '18px 18px 18px 4px',
          background: 'var(--color-bg-card-hover)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-text-muted)',
              animation: 'bounce 1.2s infinite',
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CompanionPanel({
  messages,
  onSendMessage,
  assistantName = 'Pathfinder AI',
  assistantSubtitle,
  assistantAvatarSrc,
  headerIcon,
  isOnline = true,
  inputPlaceholder,
  isTyping = false,
  quickActions,
  quickActionsLabel,
  inputDisabled = false,
  inputLoading = false,
  className = '',
}: CompanionPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-elevated)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
      className={className}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {headerIcon ? (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: 'var(--shadow-primary)',
                }}
              >
                {headerIcon}
              </div>
            ) : (
              <>
                <Avatar
                  src={assistantAvatarSrc}
                  name={assistantName}
                  size="md"
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    zIndex: -1,
                  }}
                  aria-hidden
                />
              </>
            )}
          </div>
          <div>
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-bold)',
                lineHeight: 1,
              }}
            >
              {assistantName}
            </p>
            {assistantSubtitle ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
                {assistantSubtitle}
              </p>
            ) : (
            <p
              style={{
                color: isOnline ? 'var(--color-green)' : 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isOnline ? 'var(--color-green)' : 'var(--color-text-muted)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
                aria-hidden
              />
              {isOnline ? 'Online · Ready to help' : 'Offline'}
            </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) transparent',
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-primary)',
              }}
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Tell me where you want to go and I'll plan your perfect trip.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            assistantName={assistantName}
            avatarSrc={assistantAvatarSrc}
          />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick actions ── */}
      {quickActions && quickActions.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          {quickActionsLabel && (
            <p style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {quickActionsLabel}
            </p>
          )}
          <div
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {quickActions.map((action, i) => (
              <QuickAction
                key={i}
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: quickActions ? 'none' : '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <ChatInput
          onSend={onSendMessage}
          placeholder={inputPlaceholder}
          disabled={inputDisabled}
          loading={inputLoading}
        />
      </div>
    </div>
  );
}
