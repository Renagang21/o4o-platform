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
  | 'diabetes-care-pharmacy'
  | 'platform-core'
  | 'global';

export type TemplateCategory = 'commerce' | 'organization' | 'community' | 'education' | 'health' | 'retail';

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
 * Service Template
 */
export interface ServiceTemplate {
  id: string;
  label: string;
  description: string;
  serviceGroup: ServiceGroup;
  coreApps: string[];
  extensionApps?: string[];
  globalCoreApps?: string[];
  autoInstall: boolean;
  defaultSettings?: Record<string, unknown>;
  icon?: string;
  category?: TemplateCategory;
  version: string;
  author?: string;
  isActive: boolean;
}

/**
 * Service Provisioning Request
 */
export interface ServiceProvisioningRequest {
  organizationId: string;
  tenantId: string;
  serviceTemplateId: string;
  settingsOverride?: Record<string, unknown>;
  additionalExtensions?: string[];
  skipApps?: string[];
}

/**
 * Service Provisioning Result
 */
export interface ServiceProvisioningResult {
  success: boolean;
  organizationId: string;
  tenantId: string;
  serviceGroup: ServiceGroup;
  installedApps: string[];
  skippedApps: string[];
  failedApps: Array<{ appId: string; error: string }>;
  installationTimeMs: number;
  error?: string;
}

/**
 * Installation Preview
 */
export interface InstallationPreview {
  template: ServiceTemplate | undefined;
  appsToInstall: string[];
  alreadyInstalled: string[];
  willBeSkipped: string[];
  dependencyOrder: string[];
  issues: string[];
}

/**
 * Template Stats
 */
export interface TemplateStats {
  total: number;
  active: number;
  byServiceGroup: Record<string, number>;
  byCategory: Record<string, number>;
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
export const adminAppsApi = {
  /**
   * Get all installed apps
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

  // ===========================================================================
  // Service Template APIs (Phase 7)
  // ===========================================================================

  /**
   * Get all service templates
   */
  getTemplates: async (filters?: {
    serviceGroup?: ServiceGroup;
    category?: TemplateCategory;
    activeOnly?: boolean;
  }): Promise<ServiceTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.serviceGroup) params.append('serviceGroup', filters.serviceGroup);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.activeOnly) params.append('activeOnly', 'true');

    const queryString = params.toString();
    const response = await api.get(`/v1/service/templates${queryString ? `?${queryString}` : ''}`);
    return response.data.data;
  },

  /**
   * Get a specific template with its apps
   */
  getTemplate: async (templateId: string): Promise<{
    template: ServiceTemplate;
    apps: { coreApps: string[]; extensionApps: string[] };
  }> => {
    const response = await api.get(`/v1/service/templates/${templateId}`);
    return response.data.data;
  },

  /**
   * Get installation preview for a template
   */
  getInstallationPreview: async (
    templateId: string,
    options?: {
      installExtensions?: boolean;
      skipApps?: string[];
      additionalExtensions?: string[];
    }
  ): Promise<InstallationPreview> => {
    const params = new URLSearchParams();
    if (options?.installExtensions) params.append('installExtensions', 'true');
    if (options?.skipApps) params.append('skipApps', options.skipApps.join(','));
    if (options?.additionalExtensions) params.append('additionalExtensions', options.additionalExtensions.join(','));

    const queryString = params.toString();
    const response = await api.get(`/v1/service/templates/${templateId}/preview${queryString ? `?${queryString}` : ''}`);
    return response.data.data;
  },

  /**
   * Install a service template
   */
  installTemplate: async (
    templateId: string,
    options?: {
      installExtensions?: boolean;
      skipApps?: string[];
      additionalExtensions?: string[];
    }
  ): Promise<{
    success: boolean;
    installed: string[];
    skipped: string[];
    failed: Array<{ appId: string; error: string }>;
  }> => {
    const response = await api.post(`/v1/service/templates/${templateId}/install`, options || {});
    return response.data.data;
  },

  /**
   * Provision a complete service
   */
  provisionService: async (request: ServiceProvisioningRequest): Promise<ServiceProvisioningResult> => {
    const response = await api.post('/v1/service/create', request);
    return response.data.data;
  },

  /**
   * Get recommended templates for a service group
   */
  getRecommendedTemplates: async (serviceGroup: ServiceGroup): Promise<ServiceTemplate[]> => {
    const response = await api.get(`/v1/service/templates/recommend/${serviceGroup}`);
    return response.data.data;
  },

  /**
   * Get template statistics
   */
  getTemplateStats: async (): Promise<TemplateStats> => {
    const response = await api.get('/v1/service/stats');
    return response.data.data;
  },

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
