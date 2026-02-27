import { Redis } from 'ioredis';
import { User } from '../entities/User.js';
import crypto from 'crypto';

interface SessionData {
  userId: string;
  email: string;
  roles?: string[];
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

export class SessionSyncService {
  private static redis: Redis;
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
  
  /**
   * Logout from all devices (alias)
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    return this.removeAllUserSessions(userId);
  }

  static initialize(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Check if Redis is available
   */
  private static isRedisAvailable(): boolean {
    return !!this.redis;
  }

  /**
   * Create a new session across all apps
   */
  static async createSession(
    user: User,
    sessionId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    if (!this.isRedisAvailable()) return;

    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      status: user.status,
      loginAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000),
      ipAddress: metadata?.ipAddress,
      lastActivity: new Date(),
      deviceInfo: metadata?.userAgent ? this.parseDeviceInfo(metadata.userAgent) : undefined
    };

    // Store session data
    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TTL,
      JSON.stringify(sessionData)
    );

    // Add session to user's session list
    await this.redis.sadd(`${this.USER_SESSIONS_PREFIX}${user.id}`, sessionId);
    await this.redis.expire(`${this.USER_SESSIONS_PREFIX}${user.id}`, this.SESSION_TTL);

    // Publish session creation event
    const event: SessionEvent = {
      userId: user.id,
      event: 'created',
      sessionId,
      timestamp: Date.now(),
      metadata: { ipAddress: metadata?.ipAddress }
    };
    await this.redis.publish('session:events', JSON.stringify(event));
  }

  /**
   * Get session data without validation (alias for validateSession)
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    return this.validateSession(sessionId);
  }

  /**
   * Validate session across apps
   */
  static async validateSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    
    if (!data) {
      return null;
    }

    const sessionData = JSON.parse(data) as SessionData;
    
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
  static async removeSession(sessionId: string, userId: string): Promise<void> {
    if (!this.isRedisAvailable()) return;

    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    await this.redis.srem(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);

    // Publish session removal event
    const event: SessionEvent = {
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
  static async removeAllUserSessions(userId: string): Promise<void> {
    if (!this.isRedisAvailable()) return;

    const sessions = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    // Remove each session
    const pipeline = this.redis.pipeline();
    for (const sessionId of sessions) {
      pipeline.del(`${this.SESSION_PREFIX}${sessionId}`);
    }
    pipeline.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
    await pipeline.exec();

    // Publish logout all event
    const event: SessionEvent = {
      userId,
      event: 'logout_all',
      sessionCount: sessions.length,
      timestamp: Date.now()
    };
    await this.redis.publish('session:events', JSON.stringify(event));
  }

  /**
   * Get all active sessions for a user with full data
   * Optimized: Uses mget instead of N individual get calls
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    if (!this.isRedisAvailable()) return [];

    const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    if (sessionIds.length === 0) return [];

    // Use mget to fetch all sessions in a single Redis call (N+1 → 1)
    const sessionKeys = sessionIds.map(id => `${this.SESSION_PREFIX}${id}`);
    const sessionDataArray = await this.redis.mget(...sessionKeys);

    const sessions: SessionData[] = [];
    const expiredSessionIds: string[] = [];
    const now = new Date();

    for (let i = 0; i < sessionDataArray.length; i++) {
      const data = sessionDataArray[i];
      if (data) {
        const sessionData = JSON.parse(data) as SessionData;
        if (new Date(sessionData.expiresAt) > now) {
          sessions.push(sessionData);
        } else {
          expiredSessionIds.push(sessionIds[i]);
        }
      }
    }

    // Clean up expired sessions in background (non-blocking)
    if (expiredSessionIds.length > 0) {
      Promise.all(expiredSessionIds.map(id => this.removeSession(id, userId))).catch(err =>
        console.warn('Failed to clean up expired sessions:', err)
      );
    }

    return sessions;
  }

  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Parse device info from user agent
   */
  private static parseDeviceInfo(userAgent: string): DeviceInfo {
    const deviceInfo: DeviceInfo = { userAgent };
    
    // Simple device type detection
    if (/mobile/i.test(userAgent)) {
      deviceInfo.deviceType = 'mobile';
    } else if (/tablet/i.test(userAgent)) {
      deviceInfo.deviceType = 'tablet';
    } else {
      deviceInfo.deviceType = 'desktop';
    }
    
    // Browser detection
    if (/chrome/i.test(userAgent)) {
      deviceInfo.browser = 'Chrome';
    } else if (/safari/i.test(userAgent)) {
      deviceInfo.browser = 'Safari';
    } else if (/firefox/i.test(userAgent)) {
      deviceInfo.browser = 'Firefox';
    }
    
    // Platform detection
    if (/windows/i.test(userAgent)) {
      deviceInfo.platform = 'Windows';
    } else if (/mac/i.test(userAgent)) {
      deviceInfo.platform = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      deviceInfo.platform = 'Linux';
    } else if (/android/i.test(userAgent)) {
      deviceInfo.platform = 'Android';
    } else if (/ios|iphone|ipad/i.test(userAgent)) {
      deviceInfo.platform = 'iOS';
    }
    
    return deviceInfo;
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (!data) return;
    
    const sessionData = JSON.parse(data) as SessionData;
    sessionData.lastActivity = new Date();
    
    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TTL,
      JSON.stringify(sessionData)
    );
  }

  /**
   * Get active session count for a user
   */
  static async getActiveSessionCount(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    return sessions.length;
  }

  /**
   * Check for concurrent sessions
   */
  static async checkConcurrentSessions(userId: string, maxSessions: number = 5): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
  }> {
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
  static async enforceSessionLimit(userId: string, maxSessions: number = 5): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    if (sessions.length >= maxSessions) {
      // Sort by login time and remove oldest
      const sortedSessions = sessions.sort((a, b) => 
        new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
      );
      
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
  static subscribeToSessionEvents(
    onSessionCreated: (data: SessionEvent) => void,
    onSessionRemoved: (data: SessionEvent) => void,
    onLogoutAll: (data: SessionEvent) => void
  ): void {
    const subscriber = this.redis.duplicate();
    
    subscriber.subscribe('session:events');
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'session:events') {
        const data = JSON.parse(message) as SessionEvent;
        
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

export const sessionSyncService = new SessionSyncService();