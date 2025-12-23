/**
 * CGM Pharmacist App
 *
 * 약사용 CGM 환자 관리 앱
 * - 환자 CGM 데이터 요약 및 관리
 * - 상담/코칭 도구
 * - 위험 모니터링
 *
 * @package @o4o/cgm-pharmacist-app
 */

// Manifest
export { cgmPharmacistAppManifest, default as manifest } from './manifest.js';

// Lifecycle
export * from './lifecycle/index.js';

// Types
export * from './backend/dto/index.js';

// Backend (for API server)
export * from './backend/index.js';

// Frontend (for Admin dashboard)
export * from './frontend/index.js';

// CGM Adapters (for vendor integrations)
export * from './adapters/index.js';
