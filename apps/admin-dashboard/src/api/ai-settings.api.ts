import { authClient } from '@o4o/auth-client';

export interface AISettingData {
  provider: string;
  apiKey: string | null;
  defaultModel: string | null;
  settings?: Record<string, any>;
}

export interface AISettingsResponse {
  [provider: string]: {
    apiKey: string | null;
    defaultModel: string | null;
    settings?: Record<string, any>;
  };
}

class AISettingsApi {
  // Get all AI settings
  async getSettings(): Promise<AISettingsResponse> {
    try {
      const response = await authClient.api.get('/ai-settings');
      // Backend returns { status: 'success', data: {...} }
      return response.data?.data || {};
    } catch (error) {
      // Error fetching AI settings
      return {};
    }
  }

  // Save AI setting for a specific provider
  async saveSetting(data: AISettingData): Promise<boolean> {
    try {
      await authClient.api.post('/ai-settings', data);
      return true;
    } catch (error) {
      // Error saving AI setting
      return false;
    }
  }

  // Test API key
  async testApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await authClient.api.post('/ai-settings/test', { provider, apiKey });
      // Backend returns { status: 'success', valid: true, message: '...' }
      return {
        valid: response.data?.valid || false,
        message: response.data?.message || 'Unknown error'
      };
    } catch (error) {
      // Error testing API key
      return {
        valid: false,
        message: 'Failed to test API key'
      };
    }
  }

  // Delete AI setting
  async deleteSetting(provider: string): Promise<boolean> {
    try {
      await authClient.api.delete(`/ai-settings/${provider}`);
      return true;
    } catch (error) {
      // Error deleting AI setting
      return false;
    }
  }
}

export const aiSettingsApi = new AISettingsApi();