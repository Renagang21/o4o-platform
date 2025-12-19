/**
 * Member-Yaksa
 *
 * 약사회 회원용 앱 (관리자가 아닌 약사 회원 대상)
 * - 프로필 관리 (본인 정보)
 * - 약국 정보 관리 (본인 책임)
 * - 홈 대시보드 (통합 알림/공지)
 *
 * @package @o4o/member-yaksa
 */

// Manifest
export { manifest, memberYaksaManifest, default as memberYaksaDefault } from './manifest.js';

// Backend
export * from './backend/index.js';

// Lifecycle
export { lifecycle, install, activate, deactivate } from './lifecycle/index.js';
