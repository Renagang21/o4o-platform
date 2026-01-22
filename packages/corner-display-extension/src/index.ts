/**
 * @o4o/corner-display-extension
 *
 * 매장 코너별 디스플레이 관리 Extension
 *
 * Phase 2 핵심 원칙:
 * - 태블릿 = 코너의 물리적 확장 (POP)
 * - CornerDisplay 1 : N Device (단방향 귀속)
 * - 전환/선택 개념 완전 배제
 * - Extension을 꺼도 Phase 1 정상 동작
 */

// Entities
export {
  CornerDisplay,
  CornerDisplayDevice,
} from './entities/index.js';

export type {
  CornerDisplayType,
  CornerDisplayStatus,
  DeviceType,
} from './entities/index.js';

// Services
export { CornerDisplayService } from './services/index.js';
export type {
  ListingProduct,
  CornerDisplayWithProducts,
} from './services/index.js';

// Routes
export { createCornerDisplayRoutes } from './routes/index.js';

// UI
export { CornerDisplayHost } from './ui/index.js';
export type {
  CornerDisplayHostProps,
  CornerContext,
  CornerContextWithProducts,
  CornerProduct,
} from './ui/index.js';

/**
 * Extension 엔티티 목록 (TypeORM 등록용)
 */
export const cornerDisplayEntities = [
  // Lazy import to avoid circular dependency
  async () => (await import('./entities/CornerDisplay.entity.js')).CornerDisplay,
  async () => (await import('./entities/CornerDisplayDevice.entity.js')).CornerDisplayDevice,
];
