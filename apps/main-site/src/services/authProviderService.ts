import { OAuthProvidersResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const authProviderService = {
  /**
   * Get enabled OAuth providers from backend
   */
  async getEnabledProviders(): Promise<OAuthProvidersResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/settings/oauth/providers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch OAuth providers');
      }

      return await response.json();
    } catch (error) {
      // Return default disabled state if API fails
      return {
        providers: {
          google: { enabled: false },
          kakao: { enabled: false },
          naver: { enabled: false }
        }
      };
    }
  }
};