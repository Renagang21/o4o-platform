import { useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
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
  /**
   * 'light'(기본): 흰 배경 카드 안. 'dark': 레슨 플레이어 사이드바(짙은 배경).
   * 색만 바뀌고 구조/동작은 동일하다.
   */
  variant?: 'light' | 'dark';
  style?: CSSProperties;
}

interface LessonListPalette {
  title: string;
  meta: string;
  divider: string;
  hoverBg: string;
  currentBg: string;
  idleBadgeBg: string;
  idleBadgeFg: string;
}

const PALETTES: Record<'light' | 'dark', LessonListPalette> = {
  light: {
    title: '#0f172a',
    meta: '#94a3b8',
    divider: '#f1f5f9',
    hoverBg: '#f8fafc',
    currentBg: '#f8fafc',
    idleBadgeBg: '#e2e8f0',
    idleBadgeFg: '#64748b',
  },
  dark: {
    title: '#e2e8f0',
    meta: '#64748b',
    divider: '#1e293b',
    hoverBg: '#1e293b',
    currentBg: '#1e293b',
    idleBadgeBg: '#334155',
    idleBadgeFg: '#cbd5e1',
  },
};

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
};

interface LessonRowProps {
  lesson: LessonItemView;
  index: number;
  accent: string;
  openLabel: string;
  rowClickMode: 'action' | 'row';
  palette: LessonListPalette;
  padded: boolean;
  href?: string;
  onLessonClick?: (lesson: LessonItemView) => void;
}

function LessonRow({ lesson, index, accent, openLabel, rowClickMode, palette, padded, href, onLessonClick }: LessonRowProps) {
  const [hover, setHover] = useState(false);
  const accessible = !lesson.locked;
  const rowClickable = rowClickMode === 'row' && accessible && (!!href || !!onLessonClick);

  const background = lesson.current
    ? palette.currentBg
    : rowClickable && hover
      ? palette.hoverBg
      : undefined;

  const rowStyle: CSSProperties = {
    ...itemStyle,
    padding: padded ? '12px 16px' : itemStyle.padding,
    borderBottom: `1px solid ${palette.divider}`,
  };

  /** href 가 있어도 onLessonClick 이 있으면 좌클릭은 SPA 이동으로 가로챈다. */
  const handleAnchorClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onLessonClick) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onLessonClick(lesson);
  };

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
          background: lesson.completed ? accent : palette.idleBadgeBg,
          color: lesson.completed ? '#fff' : palette.idleBadgeFg,
        }}
      >
        {lesson.completed ? '✓' : (lesson.order ?? index + 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {lesson.kind && <span style={{ fontSize: '13px' }}>{KIND_ICON[lesson.kind]}</span>}
          <span style={{ fontSize: '14px', fontWeight: lesson.current ? 700 : 500, color: palette.title }}>
            {lesson.title}
          </span>
          {lesson.isPreview && (
            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', background: '#e0f2fe', color: '#0369a1' }}>
              미리보기
            </span>
          )}
        </div>
        {typeof lesson.durationMinutes === 'number' && (
          <span style={{ fontSize: '12px', color: palette.meta }}>{lesson.durationMinutes}분</span>
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
        onClick={handleAnchorClick}
        style={{ ...rowStyle, background, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
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
          ...rowStyle,
          background,
          width: '100%',
          textAlign: 'left',
          border: 'none',
          borderBottom: `1px solid ${palette.divider}`,
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
    <div style={{ ...rowStyle, background }} aria-current={ariaCurrent} aria-disabled={accessible ? undefined : true}>
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
  variant = 'light',
  style,
}: LessonListProps) {
  const palette = PALETTES[variant];
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
          palette={palette}
          padded={variant === 'dark'}
          href={!lesson.locked ? hrefFor?.(lesson) : undefined}
          onLessonClick={onLessonClick}
        />
      ))}
    </div>
  );
}
