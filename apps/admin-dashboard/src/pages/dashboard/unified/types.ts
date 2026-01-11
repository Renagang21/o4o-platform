/**
 * Unified Dashboard v1.1 - Types
 * 사용자 기준 단일 대시보드
 *
 * Role 기반 → Context 기반 판단
 * v1.1: 임원 컨텍스트 확장
 */

// 사용자 컨텍스트 타입
export type UserContextType =
  | 'seller'      // 판매자 컨텍스트
  | 'supplier'    // 공급자 컨텍스트
  | 'partner'     // 파트너 컨텍스트
  | 'operator'    // 운영자 컨텍스트 (membership/operator 흡수)
  | 'executive'   // 임원 컨텍스트 (v1.1)
  | 'admin';      // 관리자 컨텍스트

// v1.1: 임원 컨텍스트 타입 (지부/분회)
export type ExecutiveContextType = 'executive_branch' | 'executive_chapter';

// v1.1: 임원 컨텍스트 상세 정보
export interface ExecutiveContext {
  id: string;
  type: ExecutiveContextType;
  organizationId: string;
  organizationName: string;
  position?: string;  // 직책명 (회장, 부회장, 총무 등)
  term?: {
    startAt: Date;
    endAt?: Date;
  };
  status: 'active' | 'ended';
}

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

// v1.1: ExecutiveCard Props (임원 컨텍스트별 카드)
export interface ExecutiveCardProps extends UnifiedCardProps {
  executiveContext: ExecutiveContext;
}

// 사용자 컨텍스트 정보
export interface UserContextInfo {
  contexts: UserContextType[];
  primaryContext: UserContextType;
  // 역할에서 파생된 정보
  isSeller: boolean;
  isSupplier: boolean;
  isPartner: boolean;
  isOperator: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  // v1.1: 임원 컨텍스트 상세 (다중 가능)
  executiveContexts: ExecutiveContext[];
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

// ============================================
// Unified Notification v1
// ============================================

// 알림 타입
export type NotificationType =
  | 'system'        // 시스템 알림 (필독)
  | 'business'      // 비즈니스 알림 (주문, 정산 등)
  | 'organization'  // 조직 알림 (지부/분회)
  | 'information';  // 정보성 알림

// 알림 우선순위
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

// 알림 컨텍스트 태그 (어떤 역할/컨텍스트 관련인지)
export type NotificationContextTag = UserContextType | 'global';

// 단일 알림 항목
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  contextTag: NotificationContextTag;

  // 알림 내용
  title: string;
  message: string;

  // 참조 정보 (중복 제거용)
  referenceType?: string;   // 예: 'order', 'settlement', 'notice'
  referenceId?: string;     // 예: 주문 ID, 공지 ID

  // 메타데이터
  timestamp: Date;
  isRead: boolean;
  readAt?: Date;

  // 액션 링크
  actionUrl?: string;
  actionLabel?: string;
}

// 알림 그룹 (카드별 집계)
export interface NotificationGroup {
  contextTag: NotificationContextTag;
  type: NotificationType;
  count: number;
  unreadCount: number;
  highestPriority: NotificationPriority;
  latestTimestamp: Date;
  notifications: Notification[];
}

// 사용자 알림 집계 결과
export interface UserNotificationSummary {
  userId: string;
  totalCount: number;
  unreadCount: number;

  // 타입별 집계
  byType: Record<NotificationType, number>;

  // 컨텍스트별 집계 (카드 연계용)
  byContext: Record<NotificationContextTag, NotificationGroup>;

  // 우선순위별 집계
  byPriority: Record<NotificationPriority, number>;

  // 최근 중요 알림 (AI 요약용)
  criticalNotifications: Notification[];

  // 마지막 갱신
  lastUpdated: Date;
}

// AI 요약용 알림 컨텍스트
export interface NotificationAIContext {
  summary: UserNotificationSummary;
  recentHighPriority: Notification[];
  actionRequired: Notification[];
}
