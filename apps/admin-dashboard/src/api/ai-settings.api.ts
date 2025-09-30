import { API_BASE_URL } from '@/config';

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
  private baseUrl = `${API_BASE_URL}/api/v1/ai-settings`;

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get all AI settings
  async getSettings(): Promise<AISettingsResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI settings');
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      return {};
    }
  }

  // Save AI setting for a specific provider
  async saveSetting(data: AISettingData): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save AI setting');
      }

      return true;
    } catch (error) {
      console.error('Error saving AI setting:', error);
      return false;
    }
  }

  // Test API key
  async testApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ provider, apiKey })
      });

      if (!response.ok) {
        throw new Error('Failed to test API key');
      }

      const result = await response.json();
      return {
        valid: result.valid || false,
        message: result.message || 'Unknown error'
      };
    } catch (error) {
      console.error('Error testing API key:', error);
      return {
        valid: false,
        message: 'Failed to test API key'
      };
    }
  }

  // Delete AI setting
  async deleteSetting(provider: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${provider}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete AI setting');
      }

      return true;
    } catch (error) {
      console.error('Error deleting AI setting:', error);
      return false;
    }
  }
}

export const aiSettingsApi = new AISettingsApi();