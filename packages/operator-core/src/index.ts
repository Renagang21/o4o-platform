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

// Threshold Config (WO-OPERATOR-SIGNAL-THRESHOLD-CONFIG-V1)
export type { ThresholdRule, OperatorThresholdConfig } from './threshold';
export { DEFAULT_THRESHOLD } from './threshold';

// Signal Engine (WO-OPERATOR-SIGNAL-CORE-V1)
export {
  computeOverallSignal,
  computeForumSignal,
  computeContentSignageSignal,
  sortAndLimitActivity,
} from './signal';

// AI Action Layer (WO-OPERATOR-AI-ACTION-LAYER-V1)
export type { OperatorActionSuggestion } from './action';
export { generateOperatorActions } from './action';
export { OperatorActionPanel } from './layout/OperatorActionPanel';
