import type { CSSProperties } from 'react';
import { DEFAULT_ACCENT } from '../types';

export interface CourseProgressBarProps {
  /** 0-100 진도율. */
  percent: number;
  /** 완료 레슨 수(표시용, optional). */
  completedCount?: number;
  /** 전체 레슨 수(표시용, optional). */
  totalCount?: number;
  /** 진도율 텍스트 노출 여부(기본 true). */
  showLabel?: boolean;
  /** accent(채움) 색상. */
  accent?: string;
  /** 높이 등 컴팩트 모드. */
  compact?: boolean;
  style?: CSSProperties;
}

/**
 * 강의 진도율 막대 + (옵션) "n / m 레슨 완료" 카운트.
 * progress 수치는 호출자가 canonical 값으로 전달(서비스가 enrollment.progress 매핑).
 */
export function CourseProgressBar({
  percent,
  completedCount,
  totalCount,
  showLabel = true,
  accent = DEFAULT_ACCENT,
  compact = false,
  style,
}: CourseProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const showCount = typeof completedCount === 'number' && typeof totalCount === 'number';

  return (
    <div style={style}>
      <div
        style={{
          width: '100%',
          height: compact ? '6px' : '8px',
          background: '#e2e8f0',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: accent,
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '8px 0 0' }}>
          진도율: {clamped}%
        </p>
      )}
      {showCount && (
        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '4px 0 0' }}>
          {completedCount} / {totalCount} 레슨 완료
        </p>
      )}
    </div>
  );
}
