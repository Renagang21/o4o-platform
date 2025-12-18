/**
 * Groupbuy-Yaksa
 *
 * 지부/분회 주도의 공동구매 Extension
 * Phase 1: Entity & Domain Model
 *
 * 핵심 원칙:
 * - 공동구매는 '조건이 붙은 상품'
 * - 주문·배송·정산은 기존 B2B 흐름(dropshipping-core) 사용
 * - 금액 없음, 수량만 관리
 */

// Manifest
export { manifest, default as defaultManifest } from './manifest.js';

// Backend (Entities & Services)
export * from './backend/index.js';

// Lifecycle
export { lifecycle, install, activate, deactivate, uninstall } from './lifecycle/index.js';
