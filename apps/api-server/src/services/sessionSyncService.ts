import { Redis } from 'ioredis';
import { User } from '../entities/User';
import crypto from 'crypto';

interface SessionData {
  userId: string;
  email: string;
  role: string;
  status: string;
  loginAt: Date;
  expiresAt: Date;
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
   * Create a new session across all apps
   */
  static async createSession(user: User, sessionId: string): Promise<void> {
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      loginAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000)
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
    await this.redis.publish('session:events', JSON.stringify({
      userId: user.id,
      event: 'created',
      sessionId,
      timestamp: Date.now()
    }));
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
    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    await this.redis.srem(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);

    // Publish session removal event
    await this.redis.publish('session:events', JSON.stringify({
      userId,
      event: 'removed',
      sessionId,
      timestamp: Date.now()
    }));
  }

  /**
   * Remove all sessions for a user (logout from all devices)
   */
  static async removeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    // Remove each session
    const pipeline = this.redis.pipeline();
    for (const sessionId of sessions) {
      pipeline.del(`${this.SESSION_PREFIX}${sessionId}`);
    }
    pipeline.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
    await pipeline.exec();

    // Publish logout all event
    await this.redis.publish('session:events', JSON.stringify({
      userId,
      event: 'logout_all',
      sessionCount: sessions.length,
      timestamp: Date.now()
    }));
  }

  /**
   * Get all active sessions for a user with full data
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    const sessions: SessionData[] = [];
    
    for (const sessionId of sessionIds) {
      const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
      if (data) {
        const sessionData = JSON.parse(data) as SessionData;
        // Check if not expired
        if (new Date(sessionData.expiresAt) > new Date()) {
          sessions.push(sessionData);
        } else {
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
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Subscribe to session events
   */
  static subscribeToSessionEvents(
    onSessionCreated: (data: any) => void,
    onSessionRemoved: (data: any) => void,
    onLogoutAll: (data: any) => void
  ): void {
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

export const sessionSyncService = new SessionSyncService();