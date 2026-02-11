/**
 * Operator Core - Shared Types
 *
 * 모든 서비스의 Operator 대시보드가 공유하는 타입 정의.
 * 서비스별 데이터 구조는 각 서비스의 operatorConfig에서 이 타입으로 변환한다.
 */

export type SignalStatus = 'good' | 'warning' | 'alert';

/** Signal 파생 결과 (Hero, Card 내부에서 사용) */
export interface OperatorSignal {
  status: SignalStatus;
  message: string;
}

/** Hero 영역 설정 */
export interface OperatorHeroConfig {
  status: SignalStatus;
  title: string;
  subtitle?: string;
  statusDots: { label: string; status: SignalStatus }[];
}

/** Signal Card 1장 설정 */
export interface OperatorSignalCardConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  signal: OperatorSignal;
  actionLabel: string;
  actionLink: string;
}

/** Activity Feed 아이템 */
export interface OperatorActivityItem {
  id: string;
  type: 'content' | 'forum' | string;
  title: string;
  detail: string;
  date: string;
}

/** Operator Dashboard 전체 설정 (서비스별 config가 반환) */
export interface OperatorDashboardConfig {
  pageTitle: string;
  pageSubtitle: string;
  hero: OperatorHeroConfig;
  signalCards: OperatorSignalCardConfig[];
  activityFeed: OperatorActivityItem[];
}
