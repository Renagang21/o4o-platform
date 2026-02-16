/**
 * HubCard — 단일 허브 카드 컴포넌트
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1
 * WO-PLATFORM-AI-HUB-ASSETCOPY-INTEGRATION-V1
 *
 * 아이콘 타입에 따른 렌더링:
 * - string → emoji로 표시
 * - ReactNode → lucide/svg 아이콘 (iconBg/iconColor 적용)
 * - 없음 → 아이콘 없이 표시
 *
 * Signal 배지:
 * - info: 파란색 배지
 * - warning: 주황색 배지
 * - critical: 빨간색 배지 + 펄스 애니메이션
 *
 * QuickAction:
 * - signal.action이 존재하면 카드 하단에 실행 버튼 표시
 * - 클릭 시 onActionTrigger 호출 → 로딩/성공/실패 피드백
 */

import { useState } from 'react';
import type { HubCardDefinition, HubSignal, HubActionResult } from '../types.js';

interface HubCardProps {
  card: HubCardDefinition;
  signal?: HubSignal;
  onClick?: (href: string) => void;
  onActionTrigger?: (key: string, payload?: Record<string, unknown>) => Promise<HubActionResult>;
}

// Signal level → 색상 매핑
const SIGNAL_COLORS: Record<HubSignal['level'], { color: string; bg: string; border: string }> = {
  info: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

export function HubCard({ card, signal, onClick, onActionTrigger }: HubCardProps) {
  const [hovered, setHovered] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState('');

  const handleClick = () => {
    if (onClick) {
      onClick(card.href);
    }
  };

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!signal?.action || !onActionTrigger || actionState === 'loading') return;

    setActionState('loading');
    setActionMessage('');

    try {
      const result = await onActionTrigger(signal.action.key, signal.action.payload);
      if (result.success) {
        setActionState('success');
        setActionMessage(result.message || '완료');
      } else {
        setActionState('error');
        setActionMessage(result.message || '실패');
      }
    } catch {
      setActionState('error');
      setActionMessage('오류 발생');
    }

    // 3초 후 상태 리셋
    setTimeout(() => {
      setActionState('idle');
      setActionMessage('');
    }, 3000);
  };

  const isEmojiIcon = typeof card.icon === 'string';
  const hasAction = signal?.action && onActionTrigger;

  return (
    <button
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      {card.icon && (
        isEmojiIcon ? (
          <span style={styles.emojiIcon}>{card.icon}</span>
        ) : (
          <div style={{
            ...styles.iconBox,
            backgroundColor: card.iconBg || '#F1F5F9',
          }}>
            {card.icon}
          </div>
        )
      )}

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.titleRow}>
          <span style={styles.title}>{card.title}</span>
          {/* Static badge (기존) */}
          {card.badge && !signal && (
            <span style={styles.badge}>{card.badge}</span>
          )}
          {/* Signal badge (AI 신호) */}
          {signal && <SignalBadge signal={signal} />}
        </div>
        <span style={styles.description}>{card.description}</span>

        {/* QuickAction 버튼 */}
        {hasAction && (
          <div style={styles.actionRow}>
            <QuickActionButton
              label={signal!.action!.buttonLabel}
              state={actionState}
              message={actionMessage}
              onClick={handleAction}
            />
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * SignalBadge — 신호 수준에 따른 동적 배지
 */
function SignalBadge({ signal }: { signal: HubSignal }) {
  const colors = SIGNAL_COLORS[signal.level];
  const displayText = signal.count != null
    ? (signal.label ? `${signal.label} ${signal.count}` : `${signal.count}`)
    : (signal.label || '');

  if (!displayText) return null;

  return (
    <span
      style={{
        ...styles.signalBadge,
        color: colors.color,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        animation: signal.pulse ? 'hub-signal-pulse 2s ease-in-out infinite' : undefined,
      }}
    >
      {signal.level === 'critical' && (
        <span style={styles.signalDot}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.color,
          }} />
        </span>
      )}
      {displayText}
    </span>
  );
}

/**
 * QuickActionButton — 실행 버튼 + 상태 피드백
 */
function QuickActionButton({
  label,
  state,
  message,
  onClick,
}: {
  label: string;
  state: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const stateStyles: Record<string, React.CSSProperties> = {
    idle: { backgroundColor: '#3b82f6', color: '#ffffff', cursor: 'pointer' },
    loading: { backgroundColor: '#93c5fd', color: '#ffffff', cursor: 'wait' },
    success: { backgroundColor: '#22c55e', color: '#ffffff', cursor: 'default' },
    error: { backgroundColor: '#ef4444', color: '#ffffff', cursor: 'default' },
  };

  const displayLabel =
    state === 'loading' ? '...' :
    state === 'success' ? message :
    state === 'error' ? message :
    label;

  return (
    <span
      role="button"
      tabIndex={0}
      style={{ ...styles.actionButton, ...stateStyles[state] }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(e as any); }}
    >
      {displayLabel}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
    textAlign: 'left' as const,
    width: '100%',
  },
  cardHover: {
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    borderColor: '#3b82f6',
    transform: 'translateY(-1px)',
  },
  emojiIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  iconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '1px 6px',
    borderRadius: '8px',
  },
  signalBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap' as const,
  },
  signalDot: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  description: {
    fontSize: '13px',
    color: '#64748b',
  },
  actionRow: {
    marginTop: '8px',
  },
  actionButton: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: '6px',
    border: 'none',
    transition: 'background-color 0.2s',
    userSelect: 'none' as const,
  },
};
