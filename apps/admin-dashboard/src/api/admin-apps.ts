/**
 * Admin Apps API
 *
 * API client for app management (App Market V1)
 * Phase 7: Service Templates & App Installer Automation
 */

import api from './base';

// =============================================================================
// Service Template Types (Phase 7)
// =============================================================================

export type ServiceGroup =
  | 'cosmetics'
  | 'yaksa'
  | 'tourist'
  | 'sellerops'
  | 'supplierops'
  | 'partnerops'
  | 'signage'
  | 'platform-core'
  | 'global';

export type AppType = 'core' | 'feature' | 'extension' | 'standalone';

/**
 * Service Group Metadata for UI display
 */
export interface ServiceGroupMeta {
  id: ServiceGroup;
  name: string;
  nameKo: string;
  description: string;
  icon?: string;
  color?: string;
  priority: number;
}

/**
 * App Registry Entry (installed app)
 */
export interface AppRegistryEntry {
  id: string;
  appId: string;
  name: string;
  version: string;
  previousVersion?: string;  // Previous version for rollback
  status: 'installed' | 'active' | 'inactive';
  source: string;
  installedAt: string;
  updatedAt: string;
  availableVersion?: string; // Latest version from catalog
  hasUpdate?: boolean;       // Whether an update is available
  canRollback?: boolean;     // Whether rollback is available
  ownsTables?: string[];     // Tables owned by this app
  ownsCPT?: string[];        // CPTs owned by this app
  ownsACF?: string[];        // ACF groups owned by this app
}

/**
 * Version Info Response
 */
export interface VersionInfo {
  appId: string;
  currentVersion: string;
  previousVersion: string | null;
  availableVersion: string | null;
  hasUpdate: boolean;
  canRollback: boolean;
}

/**
 * App Catalog Item (available in market)
 */
export interface AppCatalogItem {
  appId: string;
  name: string;
  version: string;
  description?: string;
  /** @deprecated Use serviceGroups instead */
  category?: string;
  icon?: string;
  homepage?: string;
  author?: string;
  type?: AppType;  // App type: core, feature, extension, standalone
  tags?: string[];                              // Searchable tags
  dependencies?: Record<string, string>;        // Dependencies: { appId: versionRange }
  source?: 'local' | 'remote';                  // App source
  vendor?: string;                              // Vendor for remote apps
  url?: string;                                 // Remote manifest URL
  hash?: string;                                // SHA-256 hash for integrity
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';  // Security risk level
  serviceGroups?: ServiceGroup[];               // Service groups this app belongs to
  incompatibleWith?: string[];                  // Apps that are incompatible with this app
}

/**
 * Remote App Install Options
 */
export interface RemoteInstallOptions {
  manifestUrl: string;
  expectedHash?: string;
  skipHashVerification?: boolean;
}

/**
 * Security Validation Result
 */
export interface SecurityValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; field?: string }>;
  warnings: Array<{ code: string; message: string; field?: string }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Disabled App Status
 * @see docs/platform/disabled-app-policy.md
 */
export type DisabledAppStatus = 'broken' | 'incomplete' | 'paused' | 'deprecated';

/**
 * Disabled App Entry
 */
export interface DisabledAppEntry {
  appId: string;
  name: string;
  disabled: {
    status: DisabledAppStatus;
    reason: string;
    nextAction: string;
    disabledAt: string;
    trackingId?: string;
  };
}

/**
 * Disabled Apps Summary
 */
export interface DisabledAppsSummary {
  total: number;
  broken: number;
  incomplete: number;
  paused: number;
  deprecated: number;
}

/**
 * Admin Apps API Client
 */
/**
 * WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1
 *
 * 인증 사용자용 read-only 앱 활성 상태.
 * 메뉴·라우트 게이팅 전용이며 관리 필드를 포함하지 않는다.
 * 플랫폼 관리자 전용 `/admin/apps`(requireAdmin)와는 별개 계약이다 — 혼용 금지.
 */
export interface AppAvailabilityEntry {
  appId: string;
  active: boolean;
}

export const appAvailabilityApi = {
  /** 활성 앱만 반환한다. 목록에 없으면 비활성으로 해석한다. */
  getAvailability: async (): Promise<AppAvailabilityEntry[]> => {
    const response = await api.get('/apps/availability');
    return response.data.apps;
  },
};

export const adminAppsApi = {
  /**
   * Get all installed apps
   *
   * ⚠️ platform 관리자 전용(`requireAdmin`). 앱 관리 화면(AppStorePage 등)에서만 사용한다.
   *    메뉴·라우트 게이팅에는 `appAvailabilityApi.getAvailability()` 를 사용할 것.
   */
  getInstalledApps: async (): Promise<AppRegistryEntry[]> => {
    const response = await api.get('/admin/apps');
    return response.data.apps;
  },

  /**
   * Get app catalog (available apps)
   */
  getMarketApps: async (): Promise<AppCatalogItem[]> => {
    const response = await api.get('/admin/apps/market');
    return response.data.apps;
  },

  /**
   * Get disabled apps registry
   * @see docs/platform/disabled-app-policy.md
   */
  getDisabledApps: async (): Promise<{
    apps: DisabledAppEntry[];
    summary: DisabledAppsSummary;
  }> => {
    const response = await api.get('/admin/apps/disabled');
    return { apps: response.data.apps, summary: response.data.summary };
  },

  /**
   * Get specific app status
   */
  getAppStatus: async (appId: string): Promise<AppRegistryEntry> => {
    const response = await api.get(`/admin/apps/${appId}`);
    return response.data.app;
  },

  /**
   * Install an app
   */
  installApp: async (appId: string): Promise<void> => {
    await api.post('/admin/apps/install', { appId });
  },

  /**
   * Activate an app
   */
  activateApp: async (appId: string): Promise<void> => {
    await api.post('/admin/apps/activate', { appId });
  },

  /**
   * Deactivate an app
   */
  deactivateApp: async (appId: string): Promise<void> => {
    await api.post('/admin/apps/deactivate', { appId });
  },

  /**
   * Uninstall an app
   */
  uninstallApp: async (appId: string, purge: boolean = false): Promise<void> => {
    await api.post('/admin/apps/uninstall', { appId, purge });
  },

  /**
   * Update an app to the latest version
   */
  updateApp: async (appId: string): Promise<void> => {
    await api.post('/admin/apps/update', { appId });
  },

  /**
   * Rollback an app to its previous version
   */
  rollbackApp: async (appId: string): Promise<{ revertedTo: string }> => {
    const response = await api.post('/admin/apps/rollback', { appId });
    return response.data;
  },

  /**
   * Get version info for an app
   */
  getVersionInfo: async (appId: string): Promise<VersionInfo> => {
    const response = await api.get(`/admin/apps/${appId}/version-info`);
    return response.data;
  },

  /**
   * Install a remote app from URL
   */
  installRemoteApp: async (options: RemoteInstallOptions): Promise<{ appId: string; manifest: AppCatalogItem }> => {
    const response = await api.post('/admin/apps/install-remote', options);
    return response.data;
  },

  /**
   * Validate a remote manifest URL (preview before install)
   */
  validateRemoteManifest: async (manifestUrl: string): Promise<{
    manifest: AppCatalogItem;
    validation: SecurityValidationResult;
  }> => {
    const response = await api.post('/admin/apps/validate-remote', { manifestUrl });
    return response.data;
  },

  // WO-O4O-SERVICE-PROVISIONING-CANONICAL-CONTRACT-AND-LEGACY-API-CLOSURE-V1
  //   (판정 SERVICE_PROVISIONING_LEGACY_RETIRE — 전 축)
  //   Service Template API 7개(getTemplates·getTemplate·getInstallationPreview·
  //   installTemplate·provisionService·getRecommendedTemplates·getTemplateStats)와
  //   관련 타입을 제거했다. backend `/api/v1/service/*` 라우터가 mount 해제됐고,
  //   production 에서는 배포 이미지에 template JSON 이 없어 목록이 항상 비어 있었다.
  //   유일한 소비처였던 `ServiceTemplateSelector` 도 함께 제거했다(AppStore
  //   READ-ONLY 계약 WO-APPSTORE-UI-DEMOTION 과도 충돌했다).

  // ===========================================================================
  // ServiceGroup APIs (Phase 6)
  // ===========================================================================

  /**
   * Get all service group metadata for UI display
   */
  getServiceGroupMeta: async (): Promise<ServiceGroupMeta[]> => {
    const response = await api.get('/admin/apps/service-groups');
    return response.data.data;
  },

  /**
   * Get apps filtered by service group
   */
  getAppsByServiceGroup: async (serviceGroup: ServiceGroup): Promise<AppCatalogItem[]> => {
    const response = await api.get(`/admin/apps/by-service/${serviceGroup}`);
    return response.data.data;
  },

  /**
   * Get service group statistics
   */
  getServiceGroupStats: async (): Promise<Array<{
    serviceGroup: ServiceGroup;
    meta: ServiceGroupMeta;
    coreCount: number;
    featureCount: number;
    extensionCount: number;
    totalCount: number;
  }>> => {
    const response = await api.get('/admin/apps/service-groups/stats');
    return response.data.data;
  },

  /**
   * Check if an app is compatible with currently installed apps
   */
  checkAppCompatibility: async (appId: string): Promise<{
    compatible: boolean;
    incompatibleWith: string[];
    warnings: string[];
  }> => {
    const response = await api.get(`/admin/apps/${appId}/compatibility`);
    return response.data.data;
  },
};
