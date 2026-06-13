import type { CSSProperties } from 'react';
import type { CourseStatus } from '../types';

export interface CourseStatusBadgeProps {
  status: CourseStatus;
  /** 서비스별 라벨 override. */
  labels?: Partial<Record<CourseStatus, string>>;
  style?: CSSProperties;
}

const DEFAULT_LABELS: Record<CourseStatus, string> = {
  draft: '준비중',
  pending_review: '검토 대기',
  published: '공개',
  rejected: '반려됨',
  archived: '종료',
};

const PALETTE: Record<CourseStatus, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  pending_review: { bg: '#fef9c3', fg: '#a16207' },
  published: { bg: '#dcfce7', fg: '#15803d' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c' },
  archived: { bg: '#e2e8f0', fg: '#64748b' },
};

const baseStyle: CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 600,
  padding: '2px 10px',
  borderRadius: '9999px',
  lineHeight: 1.6,
};

/** 강의 상태 표시 배지(draft/pending_review/published/rejected/archived). */
export function CourseStatusBadge({ status, labels, style }: CourseStatusBadgeProps) {
  const palette = PALETTE[status];
  const label = labels?.[status] ?? DEFAULT_LABELS[status];
  return (
    <span style={{ ...baseStyle, background: palette.bg, color: palette.fg, ...style }}>
      {label}
    </span>
  );
}
