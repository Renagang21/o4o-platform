/**
 * LessonCardPreview — LMS 강의 Reference Metadata preview component
 *
 * WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
 *
 * 매장이 자료함에 가져온 LMS 강의 항목을 표시하는 공통 컴포넌트.
 * POP / QR / 블로그 / 상품 상세설명 / 자료함 목록에서 동일하게 재사용한다.
 *
 * **표시 원칙 (Reference Metadata)**:
 *   강의 본문(lesson body)·video URL·quiz 내용은 props에 받지 않으며 화면에도 표시하지 않는다.
 *   썸네일·제목·요약·강사명·레슨수·visibility·원본 보기 CTA만 다룬다.
 *
 * **Variant**:
 *   - `card`(기본): 썸네일 박스 + 본문 + CTA. 자료함 카드 모드 / 블로그 inline / POP 미리보기 등에 적합.
 *   - `compact`: 썸네일 작게 + 1줄 형태. 자료함 list 모드 / 인라인 표시에 적합.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { LessonSnapshotContent } from './types';

export type LessonCardPreviewVariant = 'card' | 'compact';

export interface LessonCardPreviewProps {
  /** 강의 메타데이터 (Reference Metadata) */
  snapshot: LessonSnapshotContent;
  /** 'card'(기본) — 썸네일 + 본문 + CTA / 'compact' — 1줄 인라인 */
  variant?: LessonCardPreviewVariant;
  /** 원본 강의 링크 override. 미지정 시 snapshot.publicUrl 사용. */
  href?: string;
  /** 새 탭 열기 (기본 true — 매장 운영자 흐름은 자료함 페이지를 잃지 않는 게 자연스러움) */
  openInNewTab?: boolean;
  /** CTA 라벨 override (기본: "강의 보기") */
  ctaLabel?: string;
  /** CTA 클릭 시 추가 동작. 기본 동작(href 이동)과 함께 호출됨. */
  onOpen?: () => void;
  /** 우측 슬롯 — 매장에서 추가/제거/배지 등 컨텍스트 액션을 주입. */
  rightSlot?: ReactNode;
  /** 카드 강조 색상. 기본 보라(LMS 톤). */
  accentColor?: string;
  /** className override */
  className?: string;
  /** style override */
  style?: CSSProperties;
}

const DEFAULT_ACCENT = '#7C3AED';

const VISIBILITY_LABEL: Record<LessonSnapshotContent['visibility'], string> = {
  public: '공개',
  members: '회원제',
};

/**
 * 외부 링크 표시(↗) — 새 탭으로 열림을 시각적으로 안내.
 */
function ExternalArrow({ size = 12, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export function LessonCardPreview({
  snapshot,
  variant = 'card',
  href,
  openInNewTab = true,
  ctaLabel = '강의 보기',
  onOpen,
  rightSlot,
  accentColor = DEFAULT_ACCENT,
  className,
  style,
}: LessonCardPreviewProps) {
  const finalHref = href ?? snapshot.publicUrl;
  const targetProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noreferrer' }
    : {};

  const handleOpen = () => {
    if (onOpen) onOpen();
  };

  if (variant === 'compact') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          ...style,
        }}
      >
        <div style={compactThumbStyle(snapshot.thumbnail, accentColor)}>
          {!snapshot.thumbnail && <span style={{ fontSize: 18 }}>🎓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={lessonBadgeStyle(accentColor)}>강의</span>
            <a
              href={finalHref}
              {...targetProps}
              onClick={handleOpen}
              style={compactTitleStyle}
              title={snapshot.title}
            >
              {snapshot.title}
            </a>
          </div>
          <div style={compactMetaRowStyle}>
            {snapshot.instructorName && <span>강사 {snapshot.instructorName}</span>}
            <span>레슨 {snapshot.lessonCount}개</span>
            <span>· {VISIBILITY_LABEL[snapshot.visibility]}</span>
          </div>
        </div>
        {rightSlot && <div style={{ flexShrink: 0 }}>{rightSlot}</div>}
      </div>
    );
  }

  // variant === 'card'
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 14,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        ...style,
      }}
    >
      <div style={cardThumbStyle(snapshot.thumbnail, accentColor)}>
        {!snapshot.thumbnail && <span style={{ fontSize: 36 }}>🎓</span>}
        <span style={cardThumbBadgeStyle(accentColor)}>강의</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <h3 style={cardTitleStyle} title={snapshot.title}>
          {snapshot.title}
        </h3>
        {snapshot.summary && (
          <p style={cardSummaryStyle} title={snapshot.summary}>
            {snapshot.summary}
          </p>
        )}
        <div style={cardMetaRowStyle}>
          {snapshot.instructorName && <span>강사 {snapshot.instructorName}</span>}
          <span>· 레슨 {snapshot.lessonCount}개</span>
          <span>· {VISIBILITY_LABEL[snapshot.visibility]}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <a
          href={finalHref}
          {...targetProps}
          onClick={handleOpen}
          style={cardCtaStyle(accentColor)}
        >
          {ctaLabel}
          <ExternalArrow color="currentColor" />
        </a>
        {rightSlot && <div style={{ marginLeft: 'auto' }}>{rightSlot}</div>}
      </div>
    </div>
  );
}

/* ──────────────── styles ──────────────── */

function compactThumbStyle(
  thumbnail: string | null,
  accent: string,
): CSSProperties {
  return {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 6,
    background: thumbnail
      ? `center / cover no-repeat url(${JSON.stringify(thumbnail)})`
      : `${accent}14`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: accent,
  };
}

function cardThumbStyle(
  thumbnail: string | null,
  accent: string,
): CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 8,
    background: thumbnail
      ? `center / cover no-repeat url(${JSON.stringify(thumbnail)})`
      : `${accent}14`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: accent,
    overflow: 'hidden',
  };
}

function cardThumbBadgeStyle(accent: string): CSSProperties {
  return {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: '2px 8px',
    background: accent,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 999,
    letterSpacing: 0.2,
  };
}

function lessonBadgeStyle(accent: string): CSSProperties {
  return {
    display: 'inline-block',
    padding: '1px 7px',
    background: `${accent}1A`,
    color: accent,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 999,
    flexShrink: 0,
  };
}

const compactTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#1f2937',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
  minWidth: 0,
};

const compactMetaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  fontSize: 12,
  color: '#6b7280',
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: '#111827',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.4,
};

const cardSummaryStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: '#4b5563',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.45,
};

const cardMetaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexWrap: 'wrap',
  fontSize: 12,
  color: '#6b7280',
};

function cardCtaStyle(accent: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: accent,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    textDecoration: 'none',
  };
}
