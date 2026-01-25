/**
 * Learning App v1
 *
 * 콘텐츠를 순서대로 보여주는 Flow 관리 도구
 *
 * 정체성:
 * - Learning App은 LMS가 아니다
 * - 교육/평가/수료 기능 없음
 * - Content App 없이는 의미 없음
 * - 독립 메뉴 진입 없음
 *
 * 핵심 원칙:
 * - Flow = 콘텐츠 묶음 + 순서 정보
 * - Step = Content ID 참조
 * - Progress = 위치 추적 (완료/이수 아님)
 */

export { learningAppManifest } from './manifest.js';
export * from './types/index.js';
export * from './lifecycle/index.js';
