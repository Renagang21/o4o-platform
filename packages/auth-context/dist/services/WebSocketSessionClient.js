import io from 'socket.io-client';
export class WebSocketSessionClient {
    constructor(apiUrl, checkInterval = 30000 // 30 seconds default
    ) {
        this.apiUrl = apiUrl;
        this.checkInterval = checkInterval;
        this.socket = null;
        this.sessionCheckInterval = null;
    }
    /**
     * Connect to WebSocket server with authentication
     */
    connect(token, callbacks) {
        if (this.socket?.connected) {
            return;
        }
        // Token is passed directly to socket.io auth, no need to store it
        if (callbacks?.onSessionEvent) {
            this.onSessionEvent = callbacks.onSessionEvent;
        }
        if (callbacks?.onForceLogout) {
            this.onForceLogout = callbacks.onForceLogout;
        }
        // Extract base URL for socket connection
        const baseUrl = this.apiUrl.replace('/api/v1', '');
        this.socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        this.setupEventListeners();
        this.startSessionCheck();
    }
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
    /**
     * Setup WebSocket event listeners
     */
    setupEventListeners() {
        if (!this.socket)
            return;
        // Connection events
        this.socket.on('connect', () => {
            // console.log('[Session Sync] Connected to WebSocket');
            this.checkSession(); // Check session immediately on connect
        });
        this.socket.on('disconnect', (_reason) => {
            // console.log('[Session Sync] Disconnected:', reason);
        });
        this.socket.on('connect_error', (error) => {
            console.error('[Session Sync] Connection error:', error.message);
        });
        // Session events
        this.socket.on('session:status', (_data) => {
            // console.log('[Session Sync] Session status:', data);
        });
        this.socket.on('session:event', (event) => {
            // console.log('[Session Sync] Session event:', event);
            if (this.onSessionEvent) {
                this.onSessionEvent(event);
            }
        });
        this.socket.on('session:created', (data) => {
            // console.log('[Session Sync] New session created:', data.sessionId);
            if (this.onSessionEvent) {
                this.onSessionEvent({
                    event: 'created',
                    sessionId: data.sessionId,
                    timestamp: Date.now()
                });
            }
        });
        this.socket.on('session:removed', (data) => {
            // console.log('[Session Sync] Session removed:', data.sessionId);
            if (this.onSessionEvent) {
                this.onSessionEvent({
                    event: 'removed',
                    sessionId: data.sessionId,
                    timestamp: Date.now()
                });
            }
        });
        this.socket.on('session:refreshed', (data) => {
            // console.log('[Session Sync] Session refreshed:', data.sessionId);
            if (this.onSessionEvent) {
                this.onSessionEvent({
                    event: 'refreshed',
                    sessionId: data.sessionId,
                    timestamp: Date.now()
                });
            }
        });
        this.socket.on('session:force_logout', (data) => {
            // console.log('[Session Sync] Force logout:', data.reason);
            if (this.onForceLogout) {
                this.onForceLogout(data.reason);
            }
        });
    }
    /**
     * Start periodic session checking
     */
    startSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        // Check session periodically
        this.sessionCheckInterval = setInterval(() => {
            this.checkSession();
        }, this.checkInterval);
    }
    /**
     * Check current session status
     */
    checkSession() {
        if (this.socket?.connected) {
            this.socket.emit('session:check');
        }
    }
    /**
     * Logout from current session
     */
    logoutSession(sessionId) {
        if (this.socket?.connected) {
            this.socket.emit('session:logout', { sessionId });
        }
    }
    /**
     * Logout from all devices
     */
    logoutAllDevices() {
        if (this.socket?.connected) {
            this.socket.emit('session:logout', { allDevices: true });
        }
    }
    /**
     * Update authentication token (e.g., after refresh)
     */
    updateToken(newToken) {
        if (this.socket) {
            // Reconnect with new token
            this.disconnect();
            this.connect(newToken);
        }
    }
    /**
     * Get connection status
     */
    isConnected() {
        return this.socket?.connected || false;
    }
}
