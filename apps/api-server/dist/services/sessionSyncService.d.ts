import { Redis } from 'ioredis';
import { User } from '../entities/User';
interface SessionData {
    userId: string;
    email: string;
    role: string;
    status: string;
    loginAt: Date;
    expiresAt: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    lastActivity?: Date;
}
interface DeviceInfo {
    userAgent: string;
    platform?: string;
    browser?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
}
interface SessionEvent {
    userId: string;
    event: 'created' | 'removed' | 'logout_all' | 'updated';
    sessionId?: string;
    sessionCount?: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}
export declare class SessionSyncService {
    private static redis;
    private static readonly SESSION_PREFIX;
    private static readonly USER_SESSIONS_PREFIX;
    private static readonly SESSION_TTL;
    /**
     * Logout from all devices (alias)
     */
    static logoutAllDevices(userId: string): Promise<void>;
    static initialize(redisClient: Redis): void;
    /**
     * Create a new session across all apps
     */
    static createSession(user: User, sessionId: string, metadata?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<void>;
    /**
     * Get session data without validation (alias for validateSession)
     */
    static getSession(sessionId: string): Promise<SessionData | null>;
    /**
     * Validate session across apps
     */
    static validateSession(sessionId: string): Promise<SessionData | null>;
    /**
     * Remove a single session
     */
    static removeSession(sessionId: string, userId: string): Promise<void>;
    /**
     * Remove all sessions for a user (logout from all devices)
     */
    static removeAllUserSessions(userId: string): Promise<void>;
    /**
     * Get all active sessions for a user with full data
     */
    static getUserSessions(userId: string): Promise<SessionData[]>;
    /**
     * Generate secure session ID
     */
    static generateSessionId(): string;
    /**
     * Parse device info from user agent
     */
    private static parseDeviceInfo;
    /**
     * Update session activity
     */
    static updateSessionActivity(sessionId: string): Promise<void>;
    /**
     * Get active session count for a user
     */
    static getActiveSessionCount(userId: string): Promise<number>;
    /**
     * Check for concurrent sessions
     */
    static checkConcurrentSessions(userId: string, maxSessions?: number): Promise<{
        allowed: boolean;
        currentCount: number;
        maxAllowed: number;
    }>;
    /**
     * Remove oldest session if limit exceeded
     */
    static enforceSessionLimit(userId: string, maxSessions?: number): Promise<void>;
    /**
     * Subscribe to session events
     */
    static subscribeToSessionEvents(onSessionCreated: (data: SessionEvent) => void, onSessionRemoved: (data: SessionEvent) => void, onLogoutAll: (data: SessionEvent) => void): void;
}
export declare const sessionSyncService: SessionSyncService;
export {};
//# sourceMappingURL=sessionSyncService.d.ts.map