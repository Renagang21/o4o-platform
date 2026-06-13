import type { CSSProperties } from 'react';
import type { CourseVisibility } from '../types';

export interface CourseVisibilityBadgeProps {
  visibility?: CourseVisibility;
  /** 서비스별 라벨 override (기본: 공개 / 회원제). */
  labels?: Partial<Record<CourseVisibility, string>>;
  style?: CSSProperties;
}

const DEFAULT_LABELS: Record<CourseVisibility, string> = {
  public: '공개',
  members: '회원제',
};

const PALETTE: Record<CourseVisibility, { bg: string; fg: string }> = {
  public: { bg: '#dcfce7', fg: '#15803d' },
  members: { bg: '#ede9fe', fg: '#6d28d9' },
};

const baseStyle: CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 600,
  padding: '2px 10px',
  borderRadius: '9999px',
  lineHeight: 1.6,
};

/**
 * 공개/회원제 표시 배지. 미지정 시 'members' 로 간주(회원제 기본).
 */
export function CourseVisibilityBadge({ visibility = 'members', labels, style }: CourseVisibilityBadgeProps) {
  const palette = PALETTE[visibility];
  const label = labels?.[visibility] ?? DEFAULT_LABELS[visibility];
  return (
    <span style={{ ...baseStyle, background: palette.bg, color: palette.fg, ...style }}>
      {label}
    </span>
  );
}
