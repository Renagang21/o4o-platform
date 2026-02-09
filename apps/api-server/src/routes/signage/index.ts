/**
 * Signage Routes Module
 *
 * Phase 2 Production Build - Sprint 2-2
 * Digital Signage Core API endpoints
 *
 * WO-APP-SIGNAGE-PUBLIC-API-PHASE1-V1
 * - createSignageRoutes: 인증 필수 (관리자/운영자용)
 * - createSignagePublicRoutes: 인증 불필요 (공개 조회용)
 */
export { createSignageRoutes } from './signage.routes.js';
export { createSignagePublicRoutes } from './signage-public.routes.js';

// Re-export types for consumers
export type * from './dto/index.js';
