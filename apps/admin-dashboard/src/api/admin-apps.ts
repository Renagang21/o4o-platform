/**
 * Admin Apps API
 *
 * API client for app management (App Market V1)
 */

import api from './base';

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
  category?: string;
  icon?: string;
  homepage?: string;
  author?: string;
  type?: 'core' | 'extension' | 'standalone';  // App type for Core/Extension pattern
  tags?: string[];                              // Searchable tags
  dependencies?: Record<string, string>;        // Dependencies: { appId: versionRange }
  source?: 'local' | 'remote';                  // App source
  vendor?: string;                              // Vendor for remote apps
  url?: string;                                 // Remote manifest URL
  hash?: string;                                // SHA-256 hash for integrity
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';  // Security risk level
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
};
