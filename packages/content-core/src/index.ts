/**
 * Content Core
 *
 * 콘텐츠 단일 진실 원천 (Single Source of Truth)
 *
 * ⚠️ SKELETON 상태
 * ===============
 * 이 패키지는 아직 사용되지 않습니다.
 * - API 없음
 * - UI 없음
 * - 마이그레이션 없음
 * - 기존 시스템 연결 없음
 *
 * 이 패키지의 목적:
 * - Content Core 개념을 코드로 표현
 * - 타입과 엔티티 정의만 제공
 * - 향후 Extension이 참조할 수 있는 기반 마련
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 *
 * @package @o4o-apps/content-core
 * @version 0.1.0-skeleton
 */

// Types
export * from './types/index.js';

// Entities
export * from './entities/index.js';

// Entity list for TypeORM (향후 사용)
import { ContentAsset } from './entities/index.js';
export const entities = [ContentAsset];
