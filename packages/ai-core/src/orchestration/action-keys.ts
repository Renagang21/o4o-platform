/**
 * Platform Action Keys
 *
 * WO-PLATFORM-AI-HUB-ASSETCOPY-INTEGRATION-V1
 *
 * AI → Hub → Executor 흐름의 표준 키.
 * Hub는 문자열 하드코딩 금지 — 반드시 이 상수를 사용한다.
 *
 * 키 형식: {domain}.{action}.{type}
 */

export const ACTION_KEYS = {
  // Asset Copy
  ASSET_COPY_CMS: 'asset.copy.cms',
  ASSET_COPY_SIGNAGE: 'asset.copy.signage',

  // KPA Operations
  KPA_PENDING_APPROVALS: 'kpa.process.pending_approvals',
  KPA_NOTICE_CREATE: 'kpa.create.notice',

  // Neture Operations
  NETURE_CAMPAIGN_SUGGEST: 'neture.suggest.campaign',
  NETURE_STOCK_ALERT: 'neture.alert.low_stock',

  // Neture Hub Trigger Operations
  NETURE_REVIEW_PENDING: 'neture.trigger.review_pending',
  NETURE_AUTO_PRODUCT: 'neture.trigger.auto_product',
  NETURE_COPY_BEST_CONTENT: 'neture.trigger.copy_best_content',
  NETURE_REFRESH_SETTLEMENT: 'neture.trigger.refresh_settlement',
  NETURE_REFRESH_AI: 'neture.trigger.refresh_ai',
  NETURE_APPROVE_SUPPLIER: 'neture.trigger.approve_supplier',
  NETURE_MANAGE_PARTNERSHIP: 'neture.trigger.manage_partnership',
  NETURE_AUDIT_REVIEW: 'neture.trigger.audit_review',

  // GlycoPharm Care Operations
  GLYCOPHARM_CARE_REVIEW: 'glycopharm.trigger.care_review',
  GLYCOPHARM_CREATE_SESSION: 'glycopharm.trigger.create_session',
  GLYCOPHARM_REFRESH_ANALYSIS: 'glycopharm.trigger.refresh_analysis',
  GLYCOPHARM_REFRESH_AI: 'glycopharm.trigger.refresh_ai',
  GLYCOPHARM_REFRESH_REVENUE: 'glycopharm.trigger.refresh_revenue',
  GLYCOPHARM_REVIEW_REQUESTS: 'glycopharm.trigger.review_requests',
  GLYCOPHARM_SYNC_SIGNAGE: 'glycopharm.trigger.sync_signage',
  GLYCOPHARM_APPROVE_PHARMACY: 'glycopharm.trigger.approve_pharmacy',

  // Platform Hub Operations (WO-PLATFORM-GLOBAL-HUB-V1)
  PLATFORM_CROSS_SERVICE_TRIGGER: 'platform.trigger.execute_cross_service',
} as const;

export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];
