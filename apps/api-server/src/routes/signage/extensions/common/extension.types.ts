/**
 * Signage Extension - Common Types
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Phase 3 Extension 공통 타입 정의
 * 이 파일은 모든 Extension에서 사용하는 공통 타입을 정의합니다.
 */

// ============================================================================
// EXTENSION TYPES
// ============================================================================

/**
 * 지원하는 Extension 타입
 */
export type ExtensionType = 'pharmacy' | 'cosmetics' | 'seller' | 'tourist';

/**
 * Extension 상태
 */
export type ExtensionStatus = 'enabled' | 'disabled' | 'maintenance';

/**
 * Extension 설정
 */
export interface ExtensionConfig {
  type: ExtensionType;
  status: ExtensionStatus;
  version: string;
  features: ExtensionFeatureFlags;
}

/**
 * Extension Feature Flags
 */
export interface ExtensionFeatureFlags {
  aiGeneration: boolean;
  forceContent: boolean;
  analytics: boolean;
  selfEdit: boolean;
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

/**
 * Extension Content Source
 * Phase 3 Design FROZEN: Force 허용은 hq, pharmacy-hq만
 */
export type ExtensionContentSource =
  | 'pharmacy-hq'
  | 'cosmetics-brand'
  | 'tourism-authority'
  | 'seller-partner';

/**
 * Content Scope
 */
export type ContentScope = 'global' | 'store';

/**
 * Content Status
 */
export type ContentStatus = 'draft' | 'pending' | 'approved' | 'published' | 'rejected' | 'archived';

/**
 * Extension Content Base Interface
 * 모든 Extension Content는 이 인터페이스를 구현해야 함
 */
export interface ExtensionContentBase {
  id: string;
  organizationId: string;
  title: string;
  source: ExtensionContentSource;
  scope: ContentScope;
  status: ContentStatus;
  isForced: boolean;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONTENT SOURCE CONSTANTS (FROZEN)
// ============================================================================

/**
 * Core Content Sources (Phase 2)
 * Phase 3 Design FROZEN: Core는 변경 금지
 */
export const CORE_CONTENT_SOURCES = ['hq', 'supplier', 'community'] as const;
export type CoreContentSource = typeof CORE_CONTENT_SOURCES[number];

/**
 * Force 허용 Source 목록
 * Phase 3 Design FROZEN: 변경 금지
 * Core: hq만, Extension: pharmacy-hq만
 */
export const FORCE_ALLOWED_SOURCES: readonly ExtensionContentSource[] = ['pharmacy-hq'] as const;

/**
 * Force 허용 여부 확인
 */
export function isForceAllowed(source: ExtensionContentSource): boolean {
  return FORCE_ALLOWED_SOURCES.includes(source);
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Extension API 성공 응답
 */
export interface ExtensionSuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    extension?: ExtensionType;
  };
}

/**
 * Extension API 에러 응답
 */
export interface ExtensionErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  extension?: ExtensionType;
}

/**
 * Extension List 응답
 */
export interface ExtensionListResponse<T> extends ExtensionSuccessResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    extension: ExtensionType;
  };
}

// ============================================================================
// GLOBAL CONTENT TYPES
// ============================================================================

/**
 * Global Content Item (Core ↔ Extension 연동용)
 */
export interface ExtensionGlobalContentItem {
  id: string;
  title: string;
  description?: string | null;
  source: string;
  scope: string;
  isForced: boolean;
  canClone: boolean;
  thumbnailUrl?: string | null;
  createdAt?: string;
  contentType: 'playlist' | 'media';
}

// ============================================================================
// CLONE TYPES
// ============================================================================

/**
 * Clone 요청
 */
export interface CloneRequest {
  title?: string;
  customizations?: Record<string, unknown>;
}

/**
 * Clone 결과 (Core Adapter용)
 */
export interface CloneResult {
  success: boolean;
  clonedId: string;
  sourceId: string;
  itemsCloned: number;
  mediaCloned: number;
}

/**
 * Extension Clone 결과 (API Response용)
 */
export interface ExtensionCloneResult {
  id: string;
  originalId: string;
  scope: 'store';
  source: ExtensionContentSource;
  createdAt: string;
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Extension 에러 코드
 */
export const ExtensionErrorCodes = {
  // 공통
  EXT_NOT_FOUND: 'EXT_NOT_FOUND',
  EXT_FORBIDDEN: 'EXT_FORBIDDEN',
  EXT_DISABLED: 'EXT_DISABLED',
  EXT_INVALID_SCOPE: 'EXT_INVALID_SCOPE',

  // Clone
  EXT_CLONE_FAILED: 'EXT_CLONE_FAILED',
  EXT_CLONE_NOT_ALLOWED: 'EXT_CLONE_NOT_ALLOWED',

  // Force
  EXT_FORCE_NOT_ALLOWED: 'EXT_FORCE_NOT_ALLOWED',

  // Publish
  EXT_PUBLISH_FAILED: 'EXT_PUBLISH_FAILED',
  EXT_APPROVAL_REQUIRED: 'EXT_APPROVAL_REQUIRED',
} as const;

export type ExtensionErrorCode = typeof ExtensionErrorCodes[keyof typeof ExtensionErrorCodes];
