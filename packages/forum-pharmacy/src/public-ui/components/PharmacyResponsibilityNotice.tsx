/**
 * PharmacyResponsibilityNotice - 책임 경계 고지
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * C. 책임 경계 명확화 (Responsibility Boundary)
 * - 약사회/플랫폼이 책임진다고 오해할 여지 제거
 */

import React from 'react';
import {
  PharmacyDisclaimerType,
  PHARMACY_DISCLAIMERS,
  PharmacyStatementScope,
} from '../../backend/types/index.js';

export interface PharmacyResponsibilityNoticeProps {
  /** 책임 고지 유형 */
  disclaimerType: PharmacyDisclaimerType;
  /** 커스텀 고지 문구 (있으면 기본 문구 대체) */
  customDisclaimer?: string;
  /** 표시 스타일 */
  variant?: 'inline' | 'block' | 'footer';
}

/**
 * 책임 경계 고지 컴포넌트
 *
 * 게시글/댓글 하단에 표시하여 책임 오인 방지
 */
export function PharmacyResponsibilityNotice({
  disclaimerType,
  customDisclaimer,
  variant = 'footer',
}: PharmacyResponsibilityNoticeProps): React.ReactElement {
  const text = customDisclaimer || PHARMACY_DISCLAIMERS[disclaimerType];

  const variantStyles: Record<string, React.CSSProperties> = {
    inline: {
      display: 'inline',
      fontSize: '0.75rem',
      color: '#6B7280',
      fontStyle: 'italic',
    },
    block: {
      display: 'block',
      padding: '8px 12px',
      backgroundColor: '#FEF3C7',
      borderLeft: '3px solid #F59E0B',
      borderRadius: '0 4px 4px 0',
      fontSize: '0.8125rem',
      color: '#92400E',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      backgroundColor: '#F3F4F6',
      borderRadius: '4px',
      fontSize: '0.75rem',
      color: '#6B7280',
    },
  };

  return (
    <div style={variantStyles[variant]}>
      {variant === 'footer' && <span style={{ opacity: 0.7 }}>ℹ️</span>}
      <span>{text}</span>
    </div>
  );
}

/**
 * 게시판 책임 고지 컴포넌트
 * - 게시판 상단에 표시
 */
export interface PharmacyBoardDisclaimerProps {
  /** 게시판이 약사회 공식 게시판인지 여부 */
  isOfficial?: boolean;
  /** 커스텀 고지 문구 */
  customMessage?: string;
}

export function PharmacyBoardDisclaimer({
  isOfficial = false,
  customMessage,
}: PharmacyBoardDisclaimerProps): React.ReactElement {
  const defaultMessage = isOfficial
    ? '이 게시판의 공지사항은 약사회 공식 안내입니다. 일반 게시글은 회원 개인의 의견입니다.'
    : '이 게시판의 모든 게시글은 작성자 개인의 의견이며, 약사회 또는 플랫폼의 공식 입장이 아닙니다.';

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: isOfficial ? '#EFF6FF' : '#F9FAFB',
        borderRadius: '8px',
        border: isOfficial ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>
          {isOfficial ? '📢' : 'ℹ️'}
        </span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: isOfficial ? '#1E40AF' : '#6B7280',
              lineHeight: 1.5,
            }}
          >
            {customMessage || defaultMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 전문 의견 고지 컴포넌트
 * - 전문 자격 기반 발언에 표시
 */
export interface PharmacyProfessionalDisclaimerProps {
  /** 발언 범위 */
  scope: PharmacyStatementScope;
  /** 약사 이름 */
  pharmacistName?: string;
}

export function PharmacyProfessionalDisclaimer({
  scope,
  pharmacistName,
}: PharmacyProfessionalDisclaimerProps): React.ReactElement | null {
  if (scope !== PharmacyStatementScope.PROFESSIONAL) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        backgroundColor: '#DBEAFE',
        borderRadius: '4px',
        fontSize: '0.6875rem',
        color: '#1E40AF',
      }}
    >
      <span>👨‍⚕️</span>
      <span>
        {pharmacistName
          ? `${pharmacistName} 약사의 전문 의견입니다 (개인 판단 기반)`
          : '약사의 전문 의견입니다 (개인 판단 기반)'}
      </span>
    </div>
  );
}

export default PharmacyResponsibilityNotice;
