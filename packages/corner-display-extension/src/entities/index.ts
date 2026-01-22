/**
 * Corner Display Extension - Entities
 *
 * Phase 2 핵심 원칙:
 * - CornerDisplay 1 : N Device (단방향 귀속)
 * - 태블릿 = 코너의 물리적 확장
 * - 전환/선택 개념 없음
 */

export { CornerDisplay } from './CornerDisplay.entity.js';
export type { CornerDisplayType, CornerDisplayStatus } from './CornerDisplay.entity.js';

export { CornerDisplayDevice } from './CornerDisplayDevice.entity.js';
export type { DeviceType } from './CornerDisplayDevice.entity.js';
