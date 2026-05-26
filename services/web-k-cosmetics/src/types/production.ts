/**
 * Production Router State Types — K-Cosmetics
 *
 * WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1 (초기 로컬 정의)
 * WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1 (2026-05-26):
 *   로컬 중복 정의 제거 → @o4o/types/production canonical re-export.
 *   기존 사용처의 `import { ... } from '../types/production'` 경로 호환 유지.
 */

export type {
  ProductionTarget,
  ProductionSourceItem,
  ProductionSource,
  ProductionRouterState,
} from '@o4o/types/production';
