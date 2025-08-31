import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { RedisService } from '../../../services/redis.service';

export interface AffiliateEvent {
  type: 'click' | 'conversion' | 'commission_approved' | 'payout_processed' | 'notification';
  timestamp: Date;
  data: {
    affiliateId: string;
    amount?: number;
    referralCode?: string;
    orderId?: string;
    metadata?: any;
  };
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  affiliateId?: string;
  role?: string;
}

export class AffiliateSocketManager {
  private io: SocketIOServer;
  private redisService: RedisService;
  private connectedClients: Map<string, Set<string>>; // affiliateId -> socketIds

  constructor(httpServer: HTTPServer) {
    this.redisService = RedisService.getInstance();
    this.connectedClients = new Map();

    // Initialize Socket.IO with CORS configuration
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        
        socket.userId = decoded.id;
        socket.affiliateId = decoded.affiliateId;
        socket.role = decoded.role;

        // Store connection info in Redis
        await this.storeConnection(socket.id, decoded.id, decoded.affiliateId);

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      console.log(`Client connected: ${socket.id}, User: ${socket.userId}, Role: ${socket.role}`);

      // Join appropriate rooms based on role
      if (socket.role === 'admin') {
        socket.join('affiliate:admin');
        socket.join('affiliate:analytics');
      }

      if (socket.affiliateId) {
        socket.join(`affiliate:${socket.affiliateId}`);
        this.addClientConnection(socket.affiliateId, socket.id);
      }

      // Handle room subscriptions
      socket.on('subscribe', async (data: { room: string }) => {
        if (this.canJoinRoom(socket, data.room)) {
          socket.join(data.room);
          socket.emit('subscribed', { room: data.room });
        } else {
          socket.emit('error', { message: 'Unauthorized to join room' });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data: { room: string }) => {
        socket.leave(data.room);
        socket.emit('unsubscribed', { room: data.room });
      });

      // Handle real-time analytics requests
      socket.on('get:realtime:stats', async () => {
        if (socket.affiliateId) {
          const stats = await this.getRealtimeStats(socket.affiliateId);
          socket.emit('realtime:stats', stats);
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        if (socket.affiliateId) {
          this.removeClientConnection(socket.affiliateId, socket.id);
        }

        await this.removeConnection(socket.id);
      });

      // Send initial connection success
      socket.emit('connected', {
        socketId: socket.id,
        userId: socket.userId,
        affiliateId: socket.affiliateId,
        role: socket.role
      });
    });
  }

  /**
   * Emit click event
   */
  public async emitClick(affiliateId: string, clickData: any): Promise<void> {
    const event: AffiliateEvent = {
      type: 'click',
      timestamp: new Date(),
      data: {
        affiliateId,
        referralCode: clickData.referralCode,
        metadata: {
          source: clickData.source,
          device: clickData.device,
          country: clickData.country,
          landingUrl: clickData.landingUrl
        }
      }
    };

    // Emit to affiliate's room
    this.io.to(`affiliate:${affiliateId}`).emit('event', event);
    
    // Emit to admin room
    this.io.to('affiliate:admin').emit('event', event);

    // Update real-time stats
    await this.updateRealtimeStats(affiliateId, 'click');
  }

  /**
   * Emit conversion event
   */
  public async emitConversion(affiliateId: string, conversionData: any): Promise<void> {
    const event: AffiliateEvent = {
      type: 'conversion',
      timestamp: new Date(),
      data: {
        affiliateId,
        amount: conversionData.amount,
        orderId: conversionData.orderId,
        metadata: {
          productIds: conversionData.productIds,
          conversionType: conversionData.conversionType
        }
      }
    };

    this.io.to(`affiliate:${affiliateId}`).emit('event', event);
    this.io.to('affiliate:admin').emit('event', event);
    this.io.to('affiliate:analytics').emit('analytics:conversion', event);

    await this.updateRealtimeStats(affiliateId, 'conversion', conversionData.amount);
  }

  /**
   * Emit commission approved event
   */
  public async emitCommissionApproved(affiliateId: string, commission: any): Promise<void> {
    const event: AffiliateEvent = {
      type: 'commission_approved',
      timestamp: new Date(),
      data: {
        affiliateId,
        amount: commission.amount,
        orderId: commission.orderId,
        metadata: {
          commissionId: commission.id,
          approvedBy: commission.approvedBy
        }
      }
    };

    this.io.to(`affiliate:${affiliateId}`).emit('event', event);
    this.io.to('affiliate:admin').emit('event', event);

    // Send push notification if client is not connected
    if (!this.isClientConnected(affiliateId)) {
      await this.queuePushNotification(affiliateId, event);
    }
  }

  /**
   * Emit payout processed event
   */
  public async emitPayoutProcessed(affiliateId: string, payout: any): Promise<void> {
    const event: AffiliateEvent = {
      type: 'payout_processed',
      timestamp: new Date(),
      data: {
        affiliateId,
        amount: payout.amount,
        metadata: {
          payoutId: payout.id,
          paymentMethod: payout.paymentMethod,
          transactionId: payout.transactionId
        }
      }
    };

    this.io.to(`affiliate:${affiliateId}`).emit('event', event);
    this.io.to('affiliate:admin').emit('event', event);

    if (!this.isClientConnected(affiliateId)) {
      await this.queuePushNotification(affiliateId, event);
    }
  }

  /**
   * Broadcast to admin room
   */
  public broadcastToAdmin(eventType: string, data: any): void {
    this.io.to('affiliate:admin').emit(eventType, data);
  }

  /**
   * Send analytics update
   */
  public sendAnalyticsUpdate(data: any): void {
    this.io.to('affiliate:analytics').emit('analytics:update', data);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get affiliate's connected sockets
   */
  public getAffiliateConnections(affiliateId: string): Set<string> {
    return this.connectedClients.get(affiliateId) || new Set();
  }

  // Private helper methods

  private canJoinRoom(socket: AuthenticatedSocket, room: string): boolean {
    // Admin can join any room
    if (socket.role === 'admin') return true;

    // Affiliate can only join their own room
    if (room.startsWith('affiliate:') && room === `affiliate:${socket.affiliateId}`) {
      return true;
    }

    return false;
  }

  private async storeConnection(socketId: string, userId: string, affiliateId?: string): Promise<void> {
    const connectionData = {
      socketId,
      userId,
      affiliateId,
      connectedAt: new Date().toISOString()
    };

    await this.redisService.set(
      `socket:${socketId}`,
      JSON.stringify(connectionData),
      3600 // 1 hour TTL
    );
  }

  private async removeConnection(socketId: string): Promise<void> {
    await this.redisService.del(`socket:${socketId}`);
  }

  private addClientConnection(affiliateId: string, socketId: string): void {
    if (!this.connectedClients.has(affiliateId)) {
      this.connectedClients.set(affiliateId, new Set());
    }
    this.connectedClients.get(affiliateId)!.add(socketId);
  }

  private removeClientConnection(affiliateId: string, socketId: string): void {
    const connections = this.connectedClients.get(affiliateId);
    if (connections) {
      connections.delete(socketId);
      if (connections.size === 0) {
        this.connectedClients.delete(affiliateId);
      }
    }
  }

  private isClientConnected(affiliateId: string): boolean {
    const connections = this.connectedClients.get(affiliateId);
    return connections ? connections.size > 0 : false;
  }

  private async updateRealtimeStats(affiliateId: string, type: string, amount?: number): Promise<void> {
    const key = `realtime:stats:${affiliateId}`;
    const stats = await this.redisService.hgetall(key) || {};

    const today = new Date().toISOString().split('T')[0];
    
    if (type === 'click') {
      stats[`clicks:${today}`] = (parseInt(stats[`clicks:${today}`] || '0') + 1).toString();
      stats.totalClicks = (parseInt(stats.totalClicks || '0') + 1).toString();
    } else if (type === 'conversion') {
      stats[`conversions:${today}`] = (parseInt(stats[`conversions:${today}`] || '0') + 1).toString();
      stats.totalConversions = (parseInt(stats.totalConversions || '0') + 1).toString();
      if (amount) {
        stats[`revenue:${today}`] = (parseFloat(stats[`revenue:${today}`] || '0') + amount).toString();
        stats.totalRevenue = (parseFloat(stats.totalRevenue || '0') + amount).toString();
      }
    }

    for (const [field, value] of Object.entries(stats)) {
      await this.redisService.hset(key, field, value);
    }

    await this.redisService.expire(key, 86400); // 24 hours TTL
  }

  private async getRealtimeStats(affiliateId: string): Promise<any> {
    const key = `realtime:stats:${affiliateId}`;
    const stats = await this.redisService.hgetall(key) || {};
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      today: {
        clicks: parseInt(stats[`clicks:${today}`] || '0'),
        conversions: parseInt(stats[`conversions:${today}`] || '0'),
        revenue: parseFloat(stats[`revenue:${today}`] || '0')
      },
      total: {
        clicks: parseInt(stats.totalClicks || '0'),
        conversions: parseInt(stats.totalConversions || '0'),
        revenue: parseFloat(stats.totalRevenue || '0')
      }
    };
  }

  private async queuePushNotification(affiliateId: string, event: AffiliateEvent): Promise<void> {
    // Queue for push notification service (implement based on your push service)
    const notificationKey = `push:queue:${affiliateId}`;
    await this.redisService.set(
      notificationKey,
      JSON.stringify(event),
      3600 // 1 hour TTL
    );
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds to keep connections alive
    setInterval(() => {
      this.io.emit('heartbeat', { timestamp: new Date() });
    }, 30000);
  }
}