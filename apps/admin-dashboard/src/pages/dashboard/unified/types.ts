/**
 * Unified Dashboard v1 - Types
 * PoC: 사용자 기준 단일 대시보드
 *
 * Role 기반 → Context 기반 판단
 */

// 사용자 컨텍스트 타입
export type UserContextType =
  | 'seller'      // 판매자 컨텍스트
  | 'supplier'    // 공급자 컨텍스트
  | 'partner'     // 파트너 컨텍스트
  | 'executive'   // 임원 컨텍스트 (향후 확장)
  | 'admin';      // 관리자 컨텍스트

// 카드 우선순위
export type CardPriority = 'critical' | 'high' | 'normal' | 'low';

// 카드 크기
export type CardSize = 'small' | 'medium' | 'large' | 'full';

// 통합 대시보드 카드 설정
export interface UnifiedCardConfig {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  size: CardSize;
  priority: CardPriority;
  // 노출 조건
  showCondition: 'always' | UserContextType[];
  // 컴포넌트 렌더링
  component: React.ComponentType<UnifiedCardProps>;
}

// 카드 Props
export interface UnifiedCardProps {
  config: UnifiedCardConfig;
  userContexts?: UserContextType[];
  onAction?: (action: string, data?: any) => void;
}

// 사용자 컨텍스트 정보
export interface UserContextInfo {
  contexts: UserContextType[];
  primaryContext: UserContextType;
  // 역할에서 파생된 정보
  isSeller: boolean;
  isSupplier: boolean;
  isPartner: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
}

// AI 요약 데이터
export interface AISummaryData {
  summary: string;
  highlights: string[];
  lastUpdated: Date;
}

// 통합 대시보드 상태
export interface UnifiedDashboardState {
  userContext: UserContextInfo;
  visibleCards: UnifiedCardConfig[];
  aiSummary?: AISummaryData;
  isLoading: boolean;
}
