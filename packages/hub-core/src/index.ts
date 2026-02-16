/**
 * FROZEN CORE PACKAGE
 * Baseline: o4o-operator-os-baseline-v1
 * Structural changes require explicit Work Order.
 *
 * @o4o/hub-core
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1
 *
 * Hub UI core — 역할 기반 카드 레이아웃 + AI 운영 신호.
 * 서비스별 HubPage는 카드 정의만 전달하고,
 * hub-core가 렌더링과 역할 필터링을 담당한다.
 */

// Types
export type {
  HubCardDefinition,
  HubSectionDefinition,
  HubLayoutProps,
  HubSignal,
  HubAction,
  HubActionResult,
} from './types.js';

// Components
export { HubLayout } from './components/HubLayout.js';
export { HubSection } from './components/HubSection.js';
export { HubCard } from './components/HubCard.js';

// Utilities
export { filterCardsByRole, filterSectionsByRole } from './role-filter.js';
export { createSignal, createActionSignal, mergeSignals } from './signal-adapter.js';
