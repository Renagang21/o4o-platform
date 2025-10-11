// import { api } from './base';
import { ssoConfig } from '@/config/apps.config';

export interface SSOCheckResponse {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions?: string[];
  };
  expiresAt?: string;
}

class SSOService {
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize SSO session checking
   */
  startSessionCheck(onSessionChange?: (authenticated: boolean) => void) {
    if (!ssoConfig.enabled) return;

    // Initial check
    this.checkSession().then((response) => {
      if (onSessionChange) {
        onSessionChange(response.isAuthenticated);
      }
    });

    // Set up periodic checks
    this.checkInterval = setInterval(async () => {
      try {
        const response = await this.checkSession();
        if (onSessionChange) {
          onSessionChange(response.isAuthenticated);
        }
      } catch (error: any) {
    // Error logging - use proper error handler
      }
    }, ssoConfig.sessionCheckInterval);
  }

  /**
   * Stop SSO session checking
   */
  stopSessionCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check SSO session status
   */
  async checkSession(): Promise<SSOCheckResponse> {
    // SSO is disabled, always return unauthenticated
    // This prevents unnecessary API calls to non-existent endpoints
    if (!ssoConfig.enabled) {
      return { isAuthenticated: false };
    }
    
    // For now, return false as SSO endpoint doesn't exist
    // TODO: Implement SSO endpoint in backend when needed
    return { isAuthenticated: false };
    
    // Original code - uncomment when SSO endpoint is implemented
    // try {
    //   const response = await api.get<SSOCheckResponse>(apiEndpoints.auth.ssoCheck);
    //   return response.data;
    // } catch (error: any) {
    //   if (error?.response?.status === 401) {
    //     throw error;
    //   }
    //   return { isAuthenticated: false };
    // }
  }

  /**
   * Set cross-domain auth cookie
   */
  setCrossDomainCookie(token: string) {
    if (!ssoConfig.enabled) return;

    // Set cookie with domain scope
    document.cookie = `${ssoConfig.cookieName}=${token}; domain=${ssoConfig.domain}; path=/; secure; samesite=lax; max-age=86400`;
  }

  /**
   * Clear cross-domain auth cookie
   */
  clearCrossDomainCookie() {
    if (!ssoConfig.enabled) return;

    // Clear cookie
    document.cookie = `${ssoConfig.cookieName}=; domain=${ssoConfig.domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Get auth token from cookie
   */
  getTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === ssoConfig.cookieName) {
        return value;
      }
    }
    return null;
  }

  /**
   * Redirect to app with SSO token
   */
  redirectToApp(app: string, returnPath?: string) {
    const token = this.getTokenFromCookie();
    if (!token) {
    // Removed // console.warn
      return;
    }

    const targetUrl = new URL(app);
    targetUrl.searchParams.set('sso_token', token);
    if (returnPath) {
      targetUrl.searchParams.set('return_path', returnPath);
    }

    window.open(targetUrl.toString() as any, '_blank');
  }
}

export const ssoService = new SSOService();