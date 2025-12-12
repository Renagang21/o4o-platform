/**
 * Cosmetics Sample & Display Extension
 *
 * Phase 6-H: 샘플 재고, 사용 로그, 진열 레이아웃, 전환율 관리
 *
 * Supplier → Sample → Seller → Display → Partner → Customer 흐름 연결
 */

// Manifest
export { manifest } from './manifest';

// Backend
export * from './backend';

// Lifecycle
export { lifecycle, install, activate, deactivate, uninstall } from './lifecycle';
