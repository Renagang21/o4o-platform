/**
 * LMS Marketing Package
 *
 * Core ID 참조 방식의 Marketing Extension
 * - ProductContent: ContentBundle(type=PRODUCT) 래퍼
 * - QuizCampaign: Core Quiz 캠페인 컨텍스트
 * - SurveyCampaign: Core Survey 캠페인 컨텍스트
 *
 * 핵심 원칙:
 * - Core Entity 재정의 금지
 * - Core ID 참조만 허용
 * - 데이터 분석 기능 없음 (실행 컨텍스트만)
 */

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Manifest
export { lmsMarketingManifest, manifest } from './manifest.js';
