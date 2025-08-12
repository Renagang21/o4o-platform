"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionSyncService = exports.SessionSyncService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SessionSyncService {
    /**
     * Logout from all devices (alias)
     */
    static async logoutAllDevices(userId) {
        return this.removeAllUserSessions(userId);
    }
    static initialize(redisClient) {
        this.redis = redisClient;
    }
    /**
     * Create a new session across all apps
     */
    static async createSession(user, sessionId, metadata) {
        const sessionData = {
            userId: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            loginAt: new Date(),
            expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000),
            ipAddress: metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress,
            lastActivity: new Date(),
            deviceInfo: (metadata === null || metadata === void 0 ? void 0 : metadata.userAgent) ? this.parseDeviceInfo(metadata.userAgent) : undefined
        };
        // Store session data
        await this.redis.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL, JSON.stringify(sessionData));
        // Add session to user's session list
        await this.redis.sadd(`${this.USER_SESSIONS_PREFIX}${user.id}`, sessionId);
        await this.redis.expire(`${this.USER_SESSIONS_PREFIX}${user.id}`, this.SESSION_TTL);
        // Publish session creation event
        const event = {
            userId: user.id,
            event: 'created',
            sessionId,
            timestamp: Date.now(),
            metadata: { ipAddress: metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress }
        };
        await this.redis.publish('session:events', JSON.stringify(event));
    }
    /**
     * Get session data without validation (alias for validateSession)
     */
    static async getSession(sessionId) {
        return this.validateSession(sessionId);
    }
    /**
     * Validate session across apps
     */
    static async validateSession(sessionId) {
        const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
        if (!data) {
            return null;
        }
        const sessionData = JSON.parse(data);
        // Check if session is expired
        if (new Date(sessionData.expiresAt) < new Date()) {
            await this.removeSession(sessionId, sessionData.userId);
            return null;
        }
        return sessionData;
    }
    /**
     * Remove a single session
     */
    static async removeSession(sessionId, userId) {
        await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
        await this.redis.srem(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);
        // Publish session removal event
        const event = {
            userId,
            event: 'removed',
            sessionId,
            timestamp: Date.now()
        };
        await this.redis.publish('session:events', JSON.stringify(event));
    }
    /**
     * Remove all sessions for a user (logout from all devices)
     */
    static async removeAllUserSessions(userId) {
        const sessions = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
        // Remove each session
        const pipeline = this.redis.pipeline();
        for (const sessionId of sessions) {
            pipeline.del(`${this.SESSION_PREFIX}${sessionId}`);
        }
        pipeline.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
        await pipeline.exec();
        // Publish logout all event
        const event = {
            userId,
            event: 'logout_all',
            sessionCount: sessions.length,
            timestamp: Date.now()
        };
        await this.redis.publish('session:events', JSON.stringify(event));
    }
    /**
     * Get all active sessions for a user with full data
     */
    static async getUserSessions(userId) {
        const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
            if (data) {
                const sessionData = JSON.parse(data);
                // Check if not expired
                if (new Date(sessionData.expiresAt) > new Date()) {
                    sessions.push(sessionData);
                }
                else {
                    // Clean up expired session
                    await this.removeSession(sessionId, userId);
                }
            }
        }
        return sessions;
    }
    /**
     * Generate secure session ID
     */
    static generateSessionId() {
        return crypto_1.default.randomBytes(32).toString('base64url');
    }
    /**
     * Parse device info from user agent
     */
    static parseDeviceInfo(userAgent) {
        const deviceInfo = { userAgent };
        // Simple device type detection
        if (/mobile/i.test(userAgent)) {
            deviceInfo.deviceType = 'mobile';
        }
        else if (/tablet/i.test(userAgent)) {
            deviceInfo.deviceType = 'tablet';
        }
        else {
            deviceInfo.deviceType = 'desktop';
        }
        // Browser detection
        if (/chrome/i.test(userAgent)) {
            deviceInfo.browser = 'Chrome';
        }
        else if (/safari/i.test(userAgent)) {
            deviceInfo.browser = 'Safari';
        }
        else if (/firefox/i.test(userAgent)) {
            deviceInfo.browser = 'Firefox';
        }
        // Platform detection
        if (/windows/i.test(userAgent)) {
            deviceInfo.platform = 'Windows';
        }
        else if (/mac/i.test(userAgent)) {
            deviceInfo.platform = 'macOS';
        }
        else if (/linux/i.test(userAgent)) {
            deviceInfo.platform = 'Linux';
        }
        else if (/android/i.test(userAgent)) {
            deviceInfo.platform = 'Android';
        }
        else if (/ios|iphone|ipad/i.test(userAgent)) {
            deviceInfo.platform = 'iOS';
        }
        return deviceInfo;
    }
    /**
     * Update session activity
     */
    static async updateSessionActivity(sessionId) {
        const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
        if (!data)
            return;
        const sessionData = JSON.parse(data);
        sessionData.lastActivity = new Date();
        await this.redis.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL, JSON.stringify(sessionData));
    }
    /**
     * Get active session count for a user
     */
    static async getActiveSessionCount(userId) {
        const sessions = await this.getUserSessions(userId);
        return sessions.length;
    }
    /**
     * Check for concurrent sessions
     */
    static async checkConcurrentSessions(userId, maxSessions = 5) {
        const currentCount = await this.getActiveSessionCount(userId);
        return {
            allowed: currentCount < maxSessions,
            currentCount,
            maxAllowed: maxSessions
        };
    }
    /**
     * Remove oldest session if limit exceeded
     */
    static async enforceSessionLimit(userId, maxSessions = 5) {
        const sessions = await this.getUserSessions(userId);
        if (sessions.length >= maxSessions) {
            // Sort by login time and remove oldest
            const sortedSessions = sessions.sort((a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime());
            const sessionsToRemove = sessions.length - maxSessions + 1;
            for (let i = 0; i < sessionsToRemove; i++) {
                const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
                if (sessionIds.length > 0) {
                    await this.removeSession(sessionIds[0], userId);
                }
            }
        }
    }
    /**
     * Subscribe to session events
     */
    static subscribeToSessionEvents(onSessionCreated, onSessionRemoved, onLogoutAll) {
        const subscriber = this.redis.duplicate();
        subscriber.subscribe('session:events');
        subscriber.on('message', (channel, message) => {
            if (channel === 'session:events') {
                const data = JSON.parse(message);
                switch (data.event) {
                    case 'created':
                        onSessionCreated(data);
                        break;
                    case 'removed':
                        onSessionRemoved(data);
                        break;
                    case 'logout_all':
                        onLogoutAll(data);
                        break;
                }
            }
        });
    }
}
exports.SessionSyncService = SessionSyncService;
SessionSyncService.SESSION_PREFIX = 'session:';
SessionSyncService.USER_SESSIONS_PREFIX = 'user_sessions:';
SessionSyncService.SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
exports.sessionSyncService = new SessionSyncService();
//# sourceMappingURL=sessionSyncService.js.map