/**
 * @o4o/operator-core - Operator Dashboard Core
 *
 * 공통 레이아웃, 컴포넌트, 타입을 제공한다.
 * 서비스별 config만 작성하면 동일한 Operator 대시보드 구조를 사용할 수 있다.
 */

// Types
export type {
  SignalStatus,
  OperatorSignal,
  OperatorHeroConfig,
  OperatorSignalCardConfig,
  OperatorActivityItem,
  OperatorDashboardConfig,
} from './types';

// Layout (main entry)
export { OperatorLayout } from './layout/OperatorLayout';
export { OperatorHero } from './layout/OperatorHero';
export { OperatorSignalCards } from './layout/OperatorSignalCards';
export { OperatorActivityFeed } from './layout/OperatorActivityFeed';

// Components (개별 사용)
export { SignalCard } from './components/SignalCard';
export { StatusDot } from './components/StatusDot';

// Utils
export { timeAgo } from './utils';
