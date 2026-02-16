/**
 * Hub Core Types
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1
 *
 * 공통 허브 카드/섹션 타입 정의.
 * 서비스별 HubPage는 이 타입으로 카드를 정의하고,
 * hub-core 컴포넌트에 주입한다.
 */

import type { ReactNode } from 'react';

/**
 * AI 운영 신호 — 카드에 표시되는 동적 상태 배지
 *
 * level에 따라 색상이 결정된다:
 * - info: 파란색 (정보성)
 * - warning: 주황색 (주의 필요)
 * - critical: 빨간색 (즉시 조치)
 */
export interface HubSignal {
  /** 신호 수준 */
  level: 'info' | 'warning' | 'critical';
  /** 신호 라벨 (예: "승인 대기") */
  label?: string;
  /** 카운트 숫자 (예: 3) */
  count?: number;
  /** 펄스 애니메이션 활성화 */
  pulse?: boolean;
}

/**
 * 단일 허브 카드 정의
 */
export interface HubCardDefinition {
  /** 고유 ID */
  id: string;
  /** 카드 제목 */
  title: string;
  /** 카드 설명 */
  description: string;
  /** 클릭 시 이동 경로 */
  href: string;
  /** 아이콘 — emoji string 또는 ReactNode (lucide 등) */
  icon?: string | ReactNode;
  /** 아이콘 배경색 (lucide 아이콘 사용 시) */
  iconBg?: string;
  /** 아이콘 색상 (lucide 아이콘 사용 시) */
  iconColor?: string;
  /** 뱃지 텍스트 (예: "NEW", "3건") */
  badge?: string;
  /** 신호 매핑 키 — HubLayoutProps.signals에서 이 키로 신호를 가져옴 */
  signalKey?: string;
  /** 허용 역할 목록 — 비어있거나 undefined면 모든 역할에 노출 */
  roles?: string[];
}

/**
 * 허브 섹션 정의 — 카드 그룹
 */
export interface HubSectionDefinition {
  /** 고유 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 뱃지 (예: "Admin") */
  badge?: string;
  /** 카드 목록 */
  cards: HubCardDefinition[];
  /** 이 섹션을 볼 수 있는 역할 — 비어있거나 undefined면 모든 역할에 노출 */
  roles?: string[];
}

/**
 * HubLayout props
 */
export interface HubLayoutProps {
  /** 허브 제목 */
  title: string;
  /** 허브 부제목 */
  subtitle?: string;
  /** 섹션 정의 */
  sections: HubSectionDefinition[];
  /** 현재 사용자 역할 목록 */
  userRoles: string[];
  /** 카드 클릭 핸들러 — 기본: window.location.href */
  onCardClick?: (href: string) => void;
  /** 카드별 신호 데이터 — card.signalKey로 매핑 */
  signals?: Record<string, HubSignal>;
  /** 섹션 전/후에 추가 렌더링 */
  beforeSections?: ReactNode;
  afterSections?: ReactNode;
  /** 푸터 텍스트 */
  footerNote?: string;
}
