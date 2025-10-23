import { authClient } from '@o4o/auth-client';

// Types
export interface App {
  id: string;
  slug: string;
  name: string;
  description?: string;
  provider: string;
  category: string;
  status: 'active' | 'inactive' | 'deprecated';
  manifest?: AppManifest;
  createdAt: string;
  updatedAt: string;
}

export interface AppManifest {
  provides?: {
    apis?: Array<{ path: string; method: string; description?: string }>;
    shortcodes?: Array<{ name: string; description?: string }>;
    blocks?: Array<{ name: string; title?: string }>;
  };
  permissions?: {
    scopes: string[];
    requiredRole?: string;
  };
  settingsSchema?: Record<string, any>;
  resources?: {
    scriptUrl?: string;
    styleUrl?: string;
  };
}

export interface AppInstance {
  id: string;
  appId: string;
  businessId?: string | null;
  config?: Record<string, any>;
  status: 'active' | 'inactive';
  usageCount: number;
  lastUsedAt?: string | null;
  installedAt: string;
  app?: App;
}

export interface AppUsageStats {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  successRate: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgDuration: number;
}

export interface ExecuteOptions {
  action: string;
  payload: any;
  businessId?: string | null;
}

export interface ExecuteResult {
  success: boolean;
  data?: any;
  error?: {
    type: string;
    message: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
  };
}

class AppSystemApi {
  /**
   * Get all active apps
   */
  async getAllApps(params?: { provider?: string; category?: string }): Promise<App[]> {
    try {
      const response = await authClient.api.get('/apps', { params });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching apps:', error);
      return [];
    }
  }

  /**
   * Get app by slug
   */
  async getApp(slug: string): Promise<App | null> {
    try {
      const response = await authClient.api.get(`/apps/${slug}`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error fetching app ${slug}:`, error);
      return null;
    }
  }

  /**
   * Install an app
   */
  async installApp(slug: string, config?: Record<string, any>, businessId?: string | null): Promise<AppInstance | null> {
    try {
      const response = await authClient.api.post(`/apps/${slug}/install`, {
        config,
        businessId
      });
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error installing app ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get app instance
   */
  async getInstance(slug: string, businessId?: string | null): Promise<AppInstance | null> {
    try {
      const response = await authClient.api.get(`/apps/${slug}/instance`, {
        params: { businessId }
      });
      return response.data?.data || null;
    } catch (error: any) {
      // Don't log 404 errors - app just isn't installed yet (expected)
      if (error.response?.status !== 404) {
        console.error(`Error fetching instance for ${slug}:`, error);
      }
      return null;
    }
  }

  /**
   * Update app configuration
   */
  async updateConfig(slug: string, config: Record<string, any>, businessId?: string | null): Promise<AppInstance | null> {
    try {
      const response = await authClient.api.put(`/apps/${slug}/config`, {
        config,
        businessId
      });
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error updating config for ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Execute app action
   */
  async execute(slug: string, options: ExecuteOptions): Promise<ExecuteResult> {
    try {
      const response = await authClient.api.post(`/apps/${slug}/execute`, {
        action: options.action,
        payload: options.payload,
        businessId: options.businessId
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error executing ${slug}:`, error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: error.response?.data?.error || error.message || 'Unknown error'
        }
      };
    }
  }

  /**
   * Get app usage statistics
   */
  async getUsageStats(slug: string, params?: {
    businessId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AppUsageStats | null> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.businessId) queryParams.businessId = params.businessId;
      if (params?.userId) queryParams.userId = params.userId;
      if (params?.startDate) queryParams.startDate = params.startDate.toISOString();
      if (params?.endDate) queryParams.endDate = params.endDate.toISOString();

      const response = await authClient.api.get(`/apps/${slug}/usage`, { params: queryParams });
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error fetching usage stats for ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get overall usage statistics across all apps
   */
  async getOverallUsage(params?: {
    businessId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AppUsageStats | null> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.businessId) queryParams.businessId = params.businessId;
      if (params?.userId) queryParams.userId = params.userId;
      if (params?.startDate) queryParams.startDate = params.startDate.toISOString();
      if (params?.endDate) queryParams.endDate = params.endDate.toISOString();

      const response = await authClient.api.get('/apps/usage/overall', { params: queryParams });
      return response.data?.data || null;
    } catch (error) {
      console.error('Error fetching overall usage stats:', error);
      return null;
    }
  }
}

export const appSystemApi = new AppSystemApi();
