export interface SessionEvent {
    event: 'created' | 'removed' | 'logout_all' | 'refreshed';
    sessionId?: string;
    timestamp: number;
}
export interface SessionStatus {
    sessions: Array<{
        userId: string;
        email: string;
        role: string;
        status: string;
        loginAt: Date;
        expiresAt: Date;
    }>;
    activeSessions: number;
}
export declare class WebSocketSessionClient {
    private apiUrl;
    private checkInterval;
    private socket;
    private sessionCheckInterval;
    private onSessionEvent?;
    private onForceLogout?;
    constructor(apiUrl: string, checkInterval?: number);
    /**
     * Connect to WebSocket server with authentication
     */
    connect(token: string, callbacks?: {
        onSessionEvent?: (event: SessionEvent) => void;
        onForceLogout?: (reason: string) => void;
    }): void;
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void;
    /**
     * Setup WebSocket event listeners
     */
    private setupEventListeners;
    /**
     * Start periodic session checking
     */
    private startSessionCheck;
    /**
     * Check current session status
     */
    checkSession(): void;
    /**
     * Logout from current session
     */
    logoutSession(sessionId: string): void;
    /**
     * Logout from all devices
     */
    logoutAllDevices(): void;
    /**
     * Update authentication token (e.g., after refresh)
     */
    updateToken(newToken: string): void;
    /**
     * Get connection status
     */
    isConnected(): boolean;
}
//# sourceMappingURL=WebSocketSessionClient.d.ts.map