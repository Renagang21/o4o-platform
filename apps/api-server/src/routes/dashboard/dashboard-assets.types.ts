/**
 * Dashboard Assets — Types & Utility Functions
 *
 * Extracted from dashboard-assets.routes.ts (WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1)
 * Contains: Type definitions, status derivation, exposure computation
 */

/**
 * Source types for dashboard asset copy
 */
export type DashboardAssetSourceType = 'content' | 'signage_media' | 'signage_playlist';

/**
 * Copy options (Phase 2-B)
 */
export type TitleMode = 'keep' | 'edit';
export type DescriptionMode = 'keep' | 'empty';
export type TemplateType = 'info' | 'promo' | 'guide';

export interface CopyOptions {
  titleMode?: TitleMode;
  title?: string;
  descriptionMode?: DescriptionMode;
  templateType?: TemplateType;
}

/**
 * Request body for copy operation
 */
export interface CopyAssetRequest {
  sourceType: DashboardAssetSourceType;
  sourceId: string;
  targetDashboardId: string;
  options?: CopyOptions;
}

/**
 * Response for copy operation
 */
export interface CopyAssetResponse {
  success: boolean;
  dashboardAssetId: string;
  status: 'draft';
  sourceType: DashboardAssetSourceType;
  sourceId: string;
}

/**
 * Derive dashboard asset status from CmsMedia fields
 */
export function deriveDashboardStatus(asset: { isActive: boolean; metadata?: any }): 'draft' | 'active' | 'archived' {
  if (asset.metadata?.dashboardStatus === 'archived') return 'archived';
  if (asset.isActive) return 'active';
  return 'draft';
}

/**
 * Phase 5: Compute exposure locations for a dashboard asset
 * 읽기 전용 계산 — DB 조회 없음
 */
export type ExposureLocation = 'home' | 'signage' | 'promo';

export function computeExposure(asset: { type: string; isActive: boolean; metadata?: any }): ExposureLocation[] {
  if (deriveDashboardStatus(asset) !== 'active') return [];

  const sourceType = asset.metadata?.sourceType;

  // 사이니지 자산 → 디지털 사이니지
  if (sourceType === 'signage_media' || sourceType === 'signage_playlist') {
    return ['signage'];
  }

  // 콘텐츠 자산 — type 기반 판단
  const contentType = asset.type;
  if (contentType === 'hero' || contentType === 'promo') {
    return ['home', 'promo'];
  }
  // notice, news, featured, event 등 → 매장 홈
  return ['home'];
}
