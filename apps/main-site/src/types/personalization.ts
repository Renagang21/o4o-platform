/**
 * 개인화 시스템 타입 정의
 */

import { UserRole } from './user';

/**
 * 사용자 행태 신호
 */
export interface BehaviorSignals {
  // 메뉴 클릭 기록 (최근 30일)
  menuClicks: Record<string, number>;

  // 카드 실행 기록
  cardExecutions: Record<string, number>;

  // 에러/실패 이벤트
  errors: Record<string, number>;

  // 최근 액션 타임스탬프
  lastActions: Record<string, number>;

  // 세션 정보
  sessionStart: number;
  pageDepth: number;

  // 미완료 작업
  pendingTasks: {
    orders?: number;
    inventory?: number;
    campaigns?: number;
  };
}

/**
 * 상태 신호
 */
export interface StateSignals {
  isFirstVisit: boolean;
  daysSinceSignup: number;
  lastLoginDays: number;
  completedOnboarding: boolean;
}

/**
 * 기기 신호
 */
export interface DeviceSignals {
  isMobile: boolean;
  screenWidth: number;
  sessionLength: number;
}

/**
 * 통합 사용자 신호
 */
export interface UserSignals {
  role: UserRole | string;
  roles: (UserRole | string)[];
  behavior: BehaviorSignals;
  state: StateSignals;
  device: DeviceSignals;
}

/**
 * 콘텐츠 카드 정의
 */
export interface ContentCard {
  id: string;
  type: 'action' | 'guide' | 'promotion' | 'warning' | 'info';
  title: string;
  description: string;
  icon?: string;
  badge?: {
    text: string;
    variant: 'urgent' | 'new' | 'warning' | 'info';
  };
  action?: {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary';
  };
  // 노출 조건
  conditions?: {
    roles?: (UserRole | string)[];
    minDaysSinceSignup?: number;
    maxDaysSinceSignup?: number;
    requiresPendingTasks?: boolean;
    requiresFirstVisit?: boolean;
  };
  // 가중치 (높을수록 우선)
  baseWeight: number;
}

/**
 * 배너 정의
 */
export interface Banner {
  id: string;
  type: 'notice' | 'promotion' | 'guide' | 'system';
  title: string;
  message: string;
  variant: 'info' | 'warning' | 'success' | 'error';
  dismissible: boolean;
  action?: {
    label: string;
    url: string;
  };
  conditions?: {
    roles?: (UserRole | string)[];
    priority: number; // 1-10, 높을수록 우선
    startDate?: string;
    endDate?: string;
  };
}

/**
 * 추천 아이템
 */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon?: string;
  url: string;
  category: 'shortcut' | 'tool' | 'doc' | 'feature';
  weight: number;
}

/**
 * 개인화된 피드
 */
export interface PersonalizedFeed {
  topNotice?: Banner;
  mainCards: ContentCard[];
  suggestions: Suggestion[];
  bottomBanners: Banner[];
  metadata: {
    personalizedAt: number;
    source: 'rules' | 'api' | 'default';
    appliedRules: string[];
  };
}

/**
 * 개인화 설정
 */
export interface PersonalizationSettings {
  enabled: boolean;
  collectBehavior: boolean;
  showRecommendations: boolean;
}

/**
 * 개인화 이벤트
 */
export interface PersonalizationEvent {
  type: 'feed_loaded' | 'card_impression' | 'card_click' | 'banner_impression' | 'banner_click';
  role: string;
  itemId?: string;
  position?: number;
  metadata?: Record<string, any>;
}
