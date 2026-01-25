/**
 * Content App
 *
 * 플랫폼 공통 콘텐츠 제작 도구
 *
 * 핵심 책임:
 * - 콘텐츠를 만든다
 * - 저장한다
 * - 다른 서비스에서 참조할 수 있게 한다
 *
 * 비범위:
 * - 학습 흐름 / 진도 / 수료 → Learning App
 * - 응답 수집 / 집계 → Participation App
 * - 점수 / 등급 / 랭킹 → 별도 App
 */

// Manifest export
export { contentAppManifest } from './manifest.js';
export { default } from './manifest.js';

// Types export
export * from './types/index.js';

// Lifecycle
export * from './lifecycle/index.js';
