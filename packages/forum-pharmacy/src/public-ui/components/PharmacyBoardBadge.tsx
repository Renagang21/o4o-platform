/**
 * PharmacyBoardBadge - 게시판 유형 배지
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * B. 접근 범위 설정 (Scoped Visibility)
 * - 게시판이 누구를 위한 공간인지 명확히 표시
 */

import React from 'react';
import { PharmacyBoardType } from '../../backend/types/index.js';

export interface PharmacyBoardBadgeProps {
  /** 게시판 유형 */
  boardType: PharmacyBoardType;
  /** 조직명 (조직 게시판일 때) */
  organizationName?: string;
  /** 약국명 (약국 전용일 때) */
  pharmacyName?: string;
  /** 크기 */
  size?: 'small' | 'medium' | 'large';
}

const BOARD_TYPE_CONFIG: Record<
  PharmacyBoardType,
  { label: string; color: string; bg: string; icon: string }
> = {
  [PharmacyBoardType.PHARMACIST_ONLY]: {
    label: '약사 전용',
    color: '#1E40AF',
    bg: '#DBEAFE',
    icon: '💊',
  },
  [PharmacyBoardType.PHARMACY_PRIVATE]: {
    label: '약국 전용',
    color: '#047857',
    bg: '#D1FAE5',
    icon: '🏥',
  },
  [PharmacyBoardType.ORGANIZATION]: {
    label: '조직',
    color: '#7C3AED',
    bg: '#EDE9FE',
    icon: '🏛️',
  },
  [PharmacyBoardType.PUBLIC]: {
    label: '공개',
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: '🌐',
  },
};

/**
 * 게시판 유형 배지 컴포넌트
 *
 * 게시판 목록 및 상세에서 접근 범위 표시
 */
export function PharmacyBoardBadge({
  boardType,
  organizationName,
  pharmacyName,
  size = 'medium',
}: PharmacyBoardBadgeProps): React.ReactElement {
  const config = BOARD_TYPE_CONFIG[boardType];

  const sizeStyles = {
    small: { fontSize: '0.625rem', padding: '2px 6px' },
    medium: { fontSize: '0.75rem', padding: '3px 8px' },
    large: { fontSize: '0.8125rem', padding: '4px 10px' },
  };

  // 레이블 결정
  let displayLabel = config.label;
  if (boardType === PharmacyBoardType.ORGANIZATION && organizationName) {
    displayLabel = organizationName;
  } else if (boardType === PharmacyBoardType.PHARMACY_PRIVATE && pharmacyName) {
    displayLabel = `${pharmacyName} 전용`;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...sizeStyles[size],
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '4px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{config.icon}</span>
      <span>{displayLabel}</span>
    </span>
  );
}

/**
 * 게시판 접근 안내 컴포넌트
 */
export interface PharmacyBoardAccessGuideProps {
  boardType: PharmacyBoardType;
  organizationName?: string;
}

export function PharmacyBoardAccessGuide({
  boardType,
  organizationName,
}: PharmacyBoardAccessGuideProps): React.ReactElement {
  const getGuideText = (): string => {
    switch (boardType) {
      case PharmacyBoardType.PHARMACIST_ONLY:
        return '이 게시판은 약사만 이용할 수 있습니다.';
      case PharmacyBoardType.PHARMACY_PRIVATE:
        return '이 게시판은 해당 약국 구성원만 이용할 수 있습니다.';
      case PharmacyBoardType.ORGANIZATION:
        return organizationName
          ? `이 게시판은 ${organizationName} 소속 회원만 이용할 수 있습니다.`
          : '이 게시판은 조직 소속 회원만 이용할 수 있습니다.';
      case PharmacyBoardType.PUBLIC:
        return '이 게시판은 모든 사용자가 이용할 수 있습니다.';
      default:
        return '';
    }
  };

  const config = BOARD_TYPE_CONFIG[boardType];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: config.bg,
        borderRadius: '6px',
        fontSize: '0.8125rem',
        color: config.color,
      }}
    >
      <span>{config.icon}</span>
      <span>{getGuideText()}</span>
    </div>
  );
}

export default PharmacyBoardBadge;
