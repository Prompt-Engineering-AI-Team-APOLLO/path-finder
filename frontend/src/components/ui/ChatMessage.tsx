import Avatar from './Avatar';

export type MessageRole = 'user' | 'assistant' | 'system';

function renderMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet list lines (- item or * item)
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> blocks in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul style="margin:6px 0 6px 16px;padding:0;list-style:disc">${m}</ul>`)
    // Headings
    .replace(/^### (.+)$/gm, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<strong>$1</strong>')
    .replace(/^# (.+)$/gm, '<strong>$1</strong>')
    // Newlines to <br>
    .replace(/\n/g, '<br/>');
}

export interface ChatMessageProps {
  role: MessageRole;
  content: string;
  timestamp?: string;
  avatarSrc?: string;
  userName?: string;
  assistantName?: string;
  className?: string;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  avatarSrc,
  userName = 'You',
  assistantName = 'Pathfinder',
  className = '',
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  if (role === 'system') return null;

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)' }}
      className={[
        'flex gap-2.5',
        isUser ? 'flex-row-reverse' : 'flex-row',
        'items-end',
        className,
      ].join(' ')}
    >
      {/* Avatar */}
      <div className="shrink-0 mb-1">
        <Avatar
          src={isAssistant ? avatarSrc : undefined}
          name={isAssistant ? assistantName : userName}
          size="xs"
        />
      </div>

      {/* Bubble */}
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}
      >
        <div
          style={{
            padding: '10px 14px',
            borderRadius: isUser
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            background: isUser
              ? 'var(--gradient-primary)'
              : 'var(--color-bg-card-hover)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)',
            boxShadow: isUser ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
            wordBreak: 'break-word',
          }}
        >
          {isAssistant
            ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            : content}
        </div>

        {timestamp && (
          <span
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
