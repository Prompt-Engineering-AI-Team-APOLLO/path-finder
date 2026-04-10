import React, { useState, useRef } from 'react';

export interface ChatInputProps {
  onSend?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function ChatInput({
  onSend,
  placeholder = 'Ask Pathfinder anything...',
  disabled = false,
  loading = false,
  className = '',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSend?.(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !loading;

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-input)',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-xl)',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        transition: 'var(--transition-base)',
      }}
      className={`focus-within:border-[var(--color-primary)] focus-within:shadow-[var(--shadow-input)] ${className}`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          resize: 'none',
          minHeight: 24,
          maxHeight: 120,
          padding: 0,
          fontFamily: 'var(--font-sans)',
        }}
        className="placeholder:text-[var(--color-text-muted)] disabled:opacity-40"
        aria-label="Chat message input"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-full)',
          background: canSend ? 'var(--gradient-primary)' : 'var(--color-bg-glass)',
          border: canSend ? 'none' : '1px solid var(--color-border)',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'var(--transition-base)',
          boxShadow: canSend ? 'var(--shadow-primary)' : 'none',
        }}
        aria-label="Send message"
      >
        {loading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={canSend ? 'white' : 'var(--color-text-muted)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  );
}
