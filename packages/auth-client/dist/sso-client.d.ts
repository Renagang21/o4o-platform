import { User } from './types';
interface SSOConfig {
    apiUrl: string;
    domain?: string;
    checkInterval?: number;
}
export declare class SSOClient {
    private config;
    private checkInterval;
    private onSessionChange?;
    constructor(config: SSOConfig);
    /**
     * Initialize SSO monitoring
     */
    initialize(onSessionChange?: (user: User | null) => void): void;
    /**
     * Clean up resources
     */
    destroy(): void;
    /**
     * Handle storage events from other tabs
     */
    private handleStorageEvent;
    /**
     * Start monitoring session status
     */
    private startSessionMonitoring;
    /**
     * Check current session status
     */
    checkSession(): Promise<User | null>;
    /**
     * Broadcast login event to other tabs
     */
    broadcastLogin(): void;
    /**
     * Broadcast logout event to other tabs
     */
    broadcastLogout(): void;
    /**
     * Handle logout from another tab/app
     */
    private handleLogout;
    /**
     * Get session cookie value
     */
    getSessionId(): string | null;
    /**
     * Check if user has an active session
     */
    hasSession(): boolean;
}
export declare const ssoClient: SSOClient;
export {};
//# sourceMappingURL=sso-client.d.ts.map