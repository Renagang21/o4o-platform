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
  status: 'installed' | 'active' | 'inactive';
  source: string;
  installedAt: string;
  updatedAt: string;
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
}

/**
 * Admin Apps API Client
 */
export const adminAppsApi = {
  /**
   * Get all installed apps
   */
  getInstalledApps: async (): Promise<AppRegistryEntry[]> => {
    const response = await api.get('/api/admin/apps');
    return response.data.apps;
  },

  /**
   * Get app catalog (available apps)
   */
  getMarketApps: async (): Promise<AppCatalogItem[]> => {
    const response = await api.get('/api/admin/apps/market');
    return response.data.apps;
  },

  /**
   * Get specific app status
   */
  getAppStatus: async (appId: string): Promise<AppRegistryEntry> => {
    const response = await api.get(`/api/admin/apps/${appId}`);
    return response.data.app;
  },

  /**
   * Install an app
   */
  installApp: async (appId: string): Promise<void> => {
    await api.post('/api/admin/apps/install', { appId });
  },

  /**
   * Activate an app
   */
  activateApp: async (appId: string): Promise<void> => {
    await api.post('/api/admin/apps/activate', { appId });
  },

  /**
   * Deactivate an app
   */
  deactivateApp: async (appId: string): Promise<void> => {
    await api.post('/api/admin/apps/deactivate', { appId });
  },

  /**
   * Uninstall an app
   */
  uninstallApp: async (appId: string): Promise<void> => {
    await api.post('/api/admin/apps/uninstall', { appId });
  },
};
