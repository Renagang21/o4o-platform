import { OAuthProvidersResponse } from '../types/auth';
import { authClient } from '@o4o/auth-client';

export const authProviderService = {
  /**
   * Get enabled OAuth providers from backend
   */
  async getEnabledProviders(): Promise<OAuthProvidersResponse> {
    try {
      const response = await authClient.api.get('/settings/oauth/providers');
      return response.data;
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