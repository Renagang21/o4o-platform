/**
 * ContentBadge - 클릭 가능한 콘텐츠 배지
 *
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1
 *
 * 용도:
 * - 추천/타입/출처 표시
 * - 클릭 시 필터/정렬 트리거
 */

import React from 'react';

// Content types (inline to avoid module resolution issues)
export type ContentSourceType = 'operator' | 'supplier' | 'pharmacist';

const CONTENT_SOURCE_LABELS: Record<ContentSourceType, string> = {
  operator: '운영자',
  supplier: '공급자',
  pharmacist: '사용자',
};

const CONTENT_SOURCE_COLORS: Record<ContentSourceType, string> = {
  operator: '#1a5276',
  supplier: '#6c3483',
  pharmacist: '#1e8449',
};

export type ContentBadgeVariant = 'recommended' | 'type' | 'source' | 'stat';

export interface ContentBadgeProps {
  label: string;
  variant?: ContentBadgeVariant;
  /** 출처 유형 (source variant일 때 자동 색상) */
  sourceType?: ContentSourceType;
  /** 커스텀 색상 */
  color?: string;
  /** 배경 색상 */
  bgColor?: string;
  /** 아이콘 (예: 👁 조회수) */
  icon?: React.ReactNode;
  /** 클릭 핸들러 (있으면 클릭 가능) */
  onClick?: () => void;
  /** 활성 상태 (필터 적용 중) */
  active?: boolean;
  /** 크기 */
  size?: 'sm' | 'md';
}

const VARIANT_COLORS: Record<ContentBadgeVariant, { bg: string; text: string }> = {
  recommended: { bg: '#FEF3C7', text: '#B45309' },
  type: { bg: '#F3F4F6', text: '#4B5563' },
  source: { bg: '#EFF6FF', text: '#1D4ED8' },
  stat: { bg: 'transparent', text: '#6B7280' },
};

export function ContentBadge({
  label,
  variant = 'type',
  sourceType,
  color,
  bgColor,
  icon,
  onClick,
  active = false,
  size = 'sm',
}: ContentBadgeProps) {
  // 출처 유형이면 자동 색상 적용
  const effectiveColor = color
    || (sourceType ? CONTENT_SOURCE_COLORS[sourceType] : VARIANT_COLORS[variant].text);
  const effectiveBgColor = bgColor
    || (sourceType ? `${CONTENT_SOURCE_COLORS[sourceType]}15` : VARIANT_COLORS[variant].bg);

  const isClickable = !!onClick;

  const sizeStyles = size === 'sm'
    ? { fontSize: '11px', padding: '2px 8px' }
    : { fontSize: '12px', padding: '4px 10px' };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '4px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    color: effectiveColor,
    backgroundColor: effectiveBgColor,
    border: active ? `1px solid ${effectiveColor}` : '1px solid transparent',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.15s ease',
    ...sizeStyles,
  };

  const hoverStyles: React.CSSProperties = isClickable
    ? { filter: 'brightness(0.95)' }
    : {};

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <span
      style={baseStyles}
      onClick={isClickable ? handleClick : undefined}
      onMouseOver={(e) => {
        if (isClickable) Object.assign(e.currentTarget.style, hoverStyles);
      }}
      onMouseOut={(e) => {
        if (isClickable) e.currentTarget.style.filter = 'none';
      }}
      title={isClickable ? `${label} 필터` : undefined}
    >
      {icon}
      {label}
    </span>
  );
}

/**
 * 출처 배지 헬퍼
 */
export function SourceBadge({
  sourceType,
  onClick,
  active,
  size,
}: {
  sourceType: ContentSourceType;
  onClick?: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <ContentBadge
      label={CONTENT_SOURCE_LABELS[sourceType]}
      variant="source"
      sourceType={sourceType}
      onClick={onClick}
      active={active}
      size={size}
    />
  );
}

/**
 * 추천 배지
 */
export function RecommendedBadge({
  onClick,
  active,
  size,
}: {
  onClick?: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <ContentBadge
      label="추천"
      variant="recommended"
      icon={<span>⭐</span>}
      onClick={onClick}
      active={active}
      size={size}
    />
  );
}
