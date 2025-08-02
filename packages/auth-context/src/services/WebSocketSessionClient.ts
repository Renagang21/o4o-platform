import io from 'socket.io-client';

interface Socket {
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  disconnect(): void;
  connected: boolean;
}

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

export class WebSocketSessionClient {
  private socket: Socket | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private onSessionEvent?: (event: SessionEvent) => void;
  private onForceLogout?: (reason: string) => void;

  constructor(
    private apiUrl: string,
    private checkInterval: number = 30000 // 30 seconds default
  ) {}

  /**
   * Connect to WebSocket server with authentication
   */
  connect(token: string, callbacks?: {
    onSessionEvent?: (event: SessionEvent) => void;
    onForceLogout?: (reason: string) => void;
  }) {
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
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      // console.log('[Session Sync] Connected to WebSocket');
      this.checkSession(); // Check session immediately on connect
    });

    this.socket.on('disconnect', (reason: string) => {
      // console.log('[Session Sync] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Session Sync] Connection error:', error.message);
    });

    // Session events
    this.socket.on('session:status', (data: SessionStatus) => {
      // console.log('[Session Sync] Session status:', data);
    });

    this.socket.on('session:event', (event: SessionEvent) => {
      // console.log('[Session Sync] Session event:', event);
      if (this.onSessionEvent) {
        this.onSessionEvent(event);
      }
    });

    this.socket.on('session:created', (data: { sessionId: string }) => {
      // console.log('[Session Sync] New session created:', data.sessionId);
      if (this.onSessionEvent) {
        this.onSessionEvent({
          event: 'created',
          sessionId: data.sessionId,
          timestamp: Date.now()
        });
      }
    });

    this.socket.on('session:removed', (data: { sessionId: string }) => {
      // console.log('[Session Sync] Session removed:', data.sessionId);
      if (this.onSessionEvent) {
        this.onSessionEvent({
          event: 'removed',
          sessionId: data.sessionId,
          timestamp: Date.now()
        });
      }
    });

    this.socket.on('session:refreshed', (data: { sessionId: string }) => {
      // console.log('[Session Sync] Session refreshed:', data.sessionId);
      if (this.onSessionEvent) {
        this.onSessionEvent({
          event: 'refreshed',
          sessionId: data.sessionId,
          timestamp: Date.now()
        });
      }
    });

    this.socket.on('session:force_logout', (data: { reason: string }) => {
      // console.log('[Session Sync] Force logout:', data.reason);
      if (this.onForceLogout) {
        this.onForceLogout(data.reason);
      }
    });
  }

  /**
   * Start periodic session checking
   */
  private startSessionCheck() {
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
  logoutSession(sessionId: string) {
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
  updateToken(newToken: string) {
    if (this.socket) {
      // Reconnect with new token
      this.disconnect();
      this.connect(newToken);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}