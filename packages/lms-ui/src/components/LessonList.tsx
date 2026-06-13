import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LessonItemView, LessonKind } from '../types';
import { DEFAULT_ACCENT } from '../types';

export interface LessonListProps {
  lessons: LessonItemView[];
  /** lesson → 이동 경로(접근 가능할 때). 서비스가 route 주입. */
  hrefFor?: (lesson: LessonItemView) => string;
  onLessonClick?: (lesson: LessonItemView) => void;
  accent?: string;
  /** trailing action 라벨(rowClickMode='action' 일 때). */
  openLabel?: string;
  /**
   * 'action'(기본): 우측 trailing "보기" 액션 — 기존 동작(backward-compatible).
   * 'row': 행 전체가 클릭/링크. href 있으면 `<a>`, 없고 onLessonClick 있으면 `<button>`.
   *        locked 레슨은 클릭 불가. trailing 액션은 렌더하지 않는다(행 자체가 액션).
   */
  rowClickMode?: 'action' | 'row';
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

interface LessonRowProps {
  lesson: LessonItemView;
  index: number;
  accent: string;
  openLabel: string;
  rowClickMode: 'action' | 'row';
  href?: string;
  onLessonClick?: (lesson: LessonItemView) => void;
}

function LessonRow({ lesson, index, accent, openLabel, rowClickMode, href, onLessonClick }: LessonRowProps) {
  const [hover, setHover] = useState(false);
  const accessible = !lesson.locked;
  const rowClickable = rowClickMode === 'row' && accessible && (!!href || !!onLessonClick);

  const background = lesson.current
    ? '#f8fafc'
    : rowClickable && hover
      ? '#f8fafc'
      : undefined;

  // 행 내부(번호/완료 + 타입·제목·미리보기·길이). action/row 모드 공통.
  const inner: ReactNode = (
    <>
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
    </>
  );

  const ariaCurrent = lesson.current ? ('true' as const) : undefined;

  // ── row mode: 행 전체가 링크/버튼 ──────────────────────────────────────────
  if (rowClickMode === 'row' && accessible && href) {
    return (
      <a
        href={href}
        aria-current={ariaCurrent}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ ...itemStyle, background, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
      >
        {inner}
      </a>
    );
  }
  if (rowClickMode === 'row' && accessible && onLessonClick) {
    return (
      <button
        type="button"
        onClick={() => onLessonClick(lesson)}
        aria-current={ariaCurrent}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          ...itemStyle,
          background,
          width: '100%',
          textAlign: 'left',
          border: 'none',
          borderBottom: '1px solid #f1f5f9',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        {inner}
      </button>
    );
  }

  // ── action mode(기본) 또는 locked/네비게이션 대상 없음: 비클릭 행 + trailing 액션 ──
  return (
    <div style={{ ...itemStyle, background }} aria-current={ariaCurrent} aria-disabled={accessible ? undefined : true}>
      {inner}
      {rowClickMode === 'action' && accessible && href && (
        <a href={href} style={{ fontSize: '13px', fontWeight: 600, color: accent, textDecoration: 'none', flexShrink: 0 }}>
          {openLabel}
        </a>
      )}
      {rowClickMode === 'action' && accessible && !href && onLessonClick && (
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
}

/**
 * 레슨 목록 — 번호/완료 체크, 타입 아이콘, 미리보기 배지, 현재 강조.
 * 완료/현재/잠금 상태는 view model 로 주입(서비스가 enrollment 기준 계산).
 *
 * - `rowClickMode='action'`(기본): 우측 trailing "보기" 링크/버튼(기존 동작).
 * - `rowClickMode='row'`: 행 전체 클릭/링크(레슨 사이드바 패턴 — KPA/GP/KCos 수렴용).
 *   href 있으면 `<a>`(네이티브 키보드/링크), 없으면 `<button>`(네이티브 키보드).
 *   locked 레슨은 비클릭(aria-disabled).
 */
export function LessonList({
  lessons,
  hrefFor,
  onLessonClick,
  accent = DEFAULT_ACCENT,
  openLabel = '보기',
  rowClickMode = 'action',
  style,
}: LessonListProps) {
  return (
    <div style={style}>
      {lessons.map((lesson, index) => (
        <LessonRow
          key={lesson.id}
          lesson={lesson}
          index={index}
          accent={accent}
          openLabel={openLabel}
          rowClickMode={rowClickMode}
          href={!lesson.locked ? hrefFor?.(lesson) : undefined}
          onLessonClick={onLessonClick}
        />
      ))}
    </div>
  );
}
