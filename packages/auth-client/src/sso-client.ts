import { User } from './types.js';

interface SSOConfig {
  apiUrl: string;
  domain?: string;
  checkInterval?: number;
}

export class SSOClient {
  private config: SSOConfig;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private onSessionChange?: (user: User | null) => void;

  constructor(config: SSOConfig) {
    this.config = {
      checkInterval: 30000, // Check every 30 seconds
      ...config
    };
  }

  /**
   * Initialize SSO monitoring
   */
  initialize(onSessionChange?: (user: User | null) => void): void {
    this.onSessionChange = onSessionChange;
    
    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }

    // Start periodic session checks
    this.startSessionMonitoring();

    // Check session immediately
    this.checkSession();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent = (event: StorageEvent): void => { // eslint-disable-line no-undef
    if (event.key === 'sso:logout') {
      // Another tab logged out
      this.handleLogout();
    } else if (event.key === 'sso:login') {
      // Another tab logged in
      this.checkSession();
    }
  };

  /**
   * Start monitoring session status
   */
  private startSessionMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.config.checkInterval!);
  }

  /**
   * Check current session status
   */
  async checkSession(): Promise<User | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        this.onSessionChange?.(user);
        return user;
      } else {
        this.onSessionChange?.(null);
        return null;
      }
    } catch (error) {
      console.error('Session check error:', error);
      this.onSessionChange?.(null);
      return null;
    }
  }

  /**
   * Broadcast login event to other tabs
   */
  broadcastLogin(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sso:login', Date.now().toString());
      localStorage.removeItem('sso:login');
    }
  }

  /**
   * Broadcast logout event to other tabs
   */
  broadcastLogout(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sso:logout', Date.now().toString());
      localStorage.removeItem('sso:logout');
    }
  }

  /**
   * Handle logout from another tab/app
   */
  private handleLogout(): void {
    // Clear any local auth state
    this.onSessionChange?.(null);
    
    // Optionally reload the page
    if (this.config.domain) {
      window.location.href = '/login';
    }
  }

  /**
   * Get session cookie value
   */
  getSessionId(): string | null {
    if (typeof document === 'undefined') return null;
    
    const match = document.cookie.match(/sessionId=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if user has an active session
   */
  hasSession(): boolean {
    return !!this.getSessionId();
  }
}

// Export singleton instance with default config
export const ssoClient = new SSOClient({
  apiUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api/v1'
    : '/api/v1'
});