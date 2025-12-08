/**
 * YaksaRoleBadge - Role Badge Component
 *
 * Displays user role badges with appropriate styling.
 */

'use client';

import { getRoleBadgeStyle } from './theme';
import type { YaksaRole } from '@/lib/yaksa/forum-data';

interface YaksaRoleBadgeProps {
  role: YaksaRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ROLE_CONFIG: Record<YaksaRole, { label: string; icon: string }> = {
  administrator: { label: '관리자', icon: '👑' },
  operator: { label: '운영자', icon: '🛡️' },
  member: { label: '회원', icon: '✓' },
  guest: { label: '비회원', icon: '' },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1',
};

export function YaksaRoleBadge({
  role,
  size = 'sm',
  showLabel = true,
}: YaksaRoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  const badgeStyle = getRoleBadgeStyle(role);

  if (role === 'guest' && !showLabel) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${SIZE_CLASSES[size]}`}
      style={badgeStyle}
    >
      {config.icon && <span>{config.icon}</span>}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * YaksaVerifiedBadge - Verified pharmacist badge
 */
export function YaksaVerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${SIZE_CLASSES[size]}`}
      style={{
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        color: '#16a34a',
      }}
      title="면허인증 완료"
    >
      <span>✓</span>
      <span>인증</span>
    </span>
  );
}

/**
 * YaksaStatusBadge - Post status badge
 */
interface YaksaStatusBadgeProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: '임시저장', bg: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
  pending: { label: '승인대기', bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
  approved: { label: '승인됨', bg: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' },
  rejected: { label: '반려됨', bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
};

export function YaksaStatusBadge({ status, size = 'sm' }: YaksaStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export default YaksaRoleBadge;
