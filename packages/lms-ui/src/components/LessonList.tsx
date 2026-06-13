import type { CSSProperties } from 'react';
import type { LessonItemView, LessonKind } from '../types';
import { DEFAULT_ACCENT } from '../types';

export interface LessonListProps {
  lessons: LessonItemView[];
  /** lesson → 이동 경로(접근 가능할 때). 서비스가 route 주입. */
  hrefFor?: (lesson: LessonItemView) => string;
  onLessonClick?: (lesson: LessonItemView) => void;
  accent?: string;
  /** "보기" 등 링크 라벨. */
  openLabel?: string;
  style?: CSSProperties;
}

const KIND_ICON: Record<LessonKind, string> = {
  video: '🎬',
  article: '📄',
  quiz: '❓',
  assignment: '📝',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 0',
  borderBottom: '1px solid #f1f5f9',
};

/**
 * 레슨 목록 — 번호/완료 체크, 타입 아이콘, 미리보기 배지, 현재 강조, 접근 링크.
 * 완료/현재/잠금 상태는 view model 로 주입(서비스가 enrollment 기준 계산).
 */
export function LessonList({
  lessons,
  hrefFor,
  onLessonClick,
  accent = DEFAULT_ACCENT,
  openLabel = '보기',
  style,
}: LessonListProps) {
  return (
    <div style={style}>
      {lessons.map((lesson, index) => {
        const accessible = !lesson.locked;
        const href = accessible ? hrefFor?.(lesson) : undefined;
        return (
          <div
            key={lesson.id}
            style={{
              ...itemStyle,
              background: lesson.current ? '#f8fafc' : undefined,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0,
                background: lesson.completed ? accent : '#e2e8f0',
                color: lesson.completed ? '#fff' : '#64748b',
              }}
            >
              {lesson.completed ? '✓' : (lesson.order ?? index + 1)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {lesson.kind && <span style={{ fontSize: '13px' }}>{KIND_ICON[lesson.kind]}</span>}
                <span style={{ fontSize: '14px', fontWeight: lesson.current ? 700 : 500, color: '#0f172a' }}>
                  {lesson.title}
                </span>
                {lesson.isPreview && (
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', background: '#e0f2fe', color: '#0369a1' }}>
                    미리보기
                  </span>
                )}
              </div>
              {typeof lesson.durationMinutes === 'number' && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{lesson.durationMinutes}분</span>
              )}
            </div>
            {accessible && href && (
              <a href={href} style={{ fontSize: '13px', fontWeight: 600, color: accent, textDecoration: 'none', flexShrink: 0 }}>
                {openLabel}
              </a>
            )}
            {accessible && !href && onLessonClick && (
              <button
                type="button"
                onClick={() => onLessonClick(lesson)}
                style={{ fontSize: '13px', fontWeight: 600, color: accent, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                {openLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
