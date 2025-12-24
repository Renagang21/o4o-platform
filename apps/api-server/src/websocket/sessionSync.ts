import { Server as SocketServer, Socket } from 'socket.io';
import redisClient from '../config/redis.js';
import { SessionSyncService } from '../services/sessionSyncService.js';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';

interface SessionEventData {
  userId: string;
  event: 'created' | 'removed' | 'logout_all' | 'refreshed';
  sessionId?: string;
  timestamp: number;
}

export class WebSocketSessionSync {
  private io: SocketServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private sessionSubscriber: any;

  constructor(io: SocketServer) {
    this.io = io;
    this.setupRedisSubscriber();
    this.setupSocketHandlers();
  }

  private async setupRedisSubscriber() {
    // Create a separate Redis client for subscribing (required by Redis)
    this.sessionSubscriber = redisClient.client.duplicate();
    await this.sessionSubscriber.connect();

    // Subscribe to session events
    await this.sessionSubscriber.subscribe('session:events', (message: string) => {
      try {
        const data: SessionEventData = JSON.parse(message);
        this.handleSessionEvent(data);
      } catch (error: any) {
        logger.error('Failed to parse session event:', error);
      }
    });

    logger.info('WebSocket session sync initialized');
  }

  private setupSocketHandlers() {
    this.io.on('connection', async (socket: Socket) => {
      // Extract user from socket auth
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        socket.disconnect();
        return;
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userId = decoded.id;

        // Register socket for user
        this.addUserSocket(userId, socket.id);
        socket.data.userId = userId;

        // Join user-specific room
        socket.join(`user:${userId}`);

        // Send current session status
        const sessions = await SessionSyncService.getUserSessions(userId);
        socket.emit('session:status', {
          sessions,
          activeSessions: sessions.length
        });

        // Handle socket events
        socket.on('session:check', async () => {
          const sessions = await SessionSyncService.getUserSessions(userId);
          socket.emit('session:status', {
            sessions,
            activeSessions: sessions.length
          });
        });

        socket.on('session:logout', async (data: { sessionId?: string; allDevices?: boolean }) => {
          if (data.allDevices) {
            await SessionSyncService.logoutAllDevices(userId);
          } else if (data.sessionId) {
            await SessionSyncService.removeSession(userId, data.sessionId);
          }
        });

        socket.on('disconnect', () => {
          this.removeUserSocket(userId, socket.id);
        });

      } catch (error: any) {
        logger.error('Socket authentication failed:', error);
        socket.disconnect();
      }
    });
  }

  private handleSessionEvent(data: SessionEventData) {
    const { userId, event, sessionId, timestamp } = data;

    // Emit to all sockets for this user
    this.io.to(`user:${userId}`).emit('session:event', {
      event,
      sessionId,
      timestamp
    });

    // Handle specific events
    switch (event) {
      case 'logout_all':
        // Force disconnect all sockets for this user
        const userSocketIds = this.userSockets.get(userId);
        if (userSocketIds) {
          userSocketIds.forEach((socketId: any) => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('session:force_logout', { reason: 'All devices logged out' });
              socket.disconnect();
            }
          });
        }
        break;

      case 'removed':
        // Notify specific session removal
        this.io.to(`user:${userId}`).emit('session:removed', { sessionId });
        break;

      case 'created':
        // Notify new session created (login on another device)
        this.io.to(`user:${userId}`).emit('session:created', { sessionId });
        break;

      case 'refreshed':
        // Notify session refreshed
        this.io.to(`user:${userId}`).emit('session:refreshed', { sessionId });
        break;
    }
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Broadcast session event manually (for immediate events)
  public broadcastSessionEvent(userId: string, event: SessionEventData['event'], sessionId?: string) {
    const eventData: SessionEventData = {
      userId,
      event,
      sessionId,
      timestamp: Date.now()
    };

    // Publish to Redis for other servers
    redisClient.client.publish('session:events', JSON.stringify(eventData));
    
    // Handle locally
    this.handleSessionEvent(eventData);
  }

  public async destroy() {
    if (this.sessionSubscriber) {
      await this.sessionSubscriber.unsubscribe('session:events');
      await this.sessionSubscriber.disconnect();
    }
  }
}