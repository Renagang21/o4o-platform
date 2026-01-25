/**
 * PharmacyAuthorBadge - 작성자 유형 배지
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * A. 발언 맥락 표시 (Context Attribution)
 * - 작성자가 누구인지, 어떤 자격으로 썼는지 즉시 인지 가능하게 함
 */

import React from 'react';
import {
  PharmacyAuthorType,
  PharmacyStatementScope,
  PHARMACY_AUTHOR_BADGES,
} from '../../backend/types/index.js';

export interface PharmacyAuthorBadgeProps {
  /** 작성자 유형 */
  authorType: PharmacyAuthorType;
  /** 발언 범위 (optional) */
  statementScope?: PharmacyStatementScope;
  /** 약국명 (약국 단위 발언 시) */
  pharmacyName?: string;
  /** 전문 자격 표시 여부 */
  showProfessionalBadge?: boolean;
  /** 크기 */
  size?: 'small' | 'medium' | 'large';
  /** 아이콘 표시 여부 */
  showIcon?: boolean;
}

/**
 * 작성자 유형 배지 컴포넌트
 *
 * 게시글/댓글에서 작성자의 맥락을 표시
 * - 개설약사 / 근무약사 / 약업사업자 / 일반
 */
export function PharmacyAuthorBadge({
  authorType,
  statementScope,
  pharmacyName,
  showProfessionalBadge = false,
  size = 'medium',
  showIcon = true,
}: PharmacyAuthorBadgeProps): React.ReactElement {
  const badge = PHARMACY_AUTHOR_BADGES[authorType];

  const sizeStyles = {
    small: { fontSize: '0.6875rem', padding: '2px 6px' },
    medium: { fontSize: '0.75rem', padding: '3px 8px' },
    large: { fontSize: '0.8125rem', padding: '4px 10px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...sizeStyles[size],
        backgroundColor: badge.backgroundColor,
        color: badge.color,
        borderRadius: '12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {showIcon && badge.icon && (
        <span style={{ fontSize: size === 'small' ? '0.75rem' : '0.875rem' }}>
          {badge.icon}
        </span>
      )}
      <span>{badge.label}</span>

      {/* 전문 자격 표시 */}
      {showProfessionalBadge && statementScope === PharmacyStatementScope.PROFESSIONAL && (
        <span
          style={{
            marginLeft: '2px',
            fontSize: size === 'small' ? '0.625rem' : '0.6875rem',
            opacity: 0.8,
          }}
        >
          (전문)
        </span>
      )}

      {/* 약국 단위 발언 표시 */}
      {pharmacyName && statementScope === PharmacyStatementScope.PHARMACY_UNIT && (
        <span
          style={{
            marginLeft: '4px',
            fontSize: size === 'small' ? '0.625rem' : '0.6875rem',
            color: badge.color,
            opacity: 0.7,
          }}
        >
          @{pharmacyName}
        </span>
      )}
    </span>
  );
}

/**
 * 발언 범위 배지 컴포넌트
 */
export interface PharmacyStatementScopeBadgeProps {
  scope: PharmacyStatementScope;
  size?: 'small' | 'medium';
}

export function PharmacyStatementScopeBadge({
  scope,
  size = 'small',
}: PharmacyStatementScopeBadgeProps): React.ReactElement {
  const scopeLabels: Record<PharmacyStatementScope, string> = {
    [PharmacyStatementScope.PERSONAL]: '개인 의견',
    [PharmacyStatementScope.PROFESSIONAL]: '전문 의견',
    [PharmacyStatementScope.PHARMACY_UNIT]: '약국 의견',
  };

  const scopeColors: Record<PharmacyStatementScope, { color: string; bg: string }> = {
    [PharmacyStatementScope.PERSONAL]: { color: '#6B7280', bg: '#F3F4F6' },
    [PharmacyStatementScope.PROFESSIONAL]: { color: '#1E40AF', bg: '#DBEAFE' },
    [PharmacyStatementScope.PHARMACY_UNIT]: { color: '#047857', bg: '#D1FAE5' },
  };

  const colors = scopeColors[scope];

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: size === 'small' ? '0.625rem' : '0.6875rem',
        padding: size === 'small' ? '1px 4px' : '2px 6px',
        backgroundColor: colors.bg,
        color: colors.color,
        borderRadius: '4px',
        fontWeight: 500,
      }}
    >
      {scopeLabels[scope]}
    </span>
  );
}

export default PharmacyAuthorBadge;
