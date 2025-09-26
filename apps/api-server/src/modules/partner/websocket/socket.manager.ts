import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { RedisService } from '../../../services/redis.service';

export interface PartnerEvent {
  type: 'click' | 'conversion' | 'commission_approved' | 'payout_processed' | 'notification';
  timestamp: Date;
  data: {
    partnerId: string;
    amount?: number;
    referralCode?: string;
    orderId?: string;
    metadata?: any;
  };
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  partnerId?: string;
  role?: string;
}

export class PartnerSocketManager {
  private io: SocketIOServer;
  private redisService: RedisService;
  private connectedClients: Map<string, Set<string>>; // partnerId -> socketIds

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
        socket.partnerId = decoded.partnerId;
        socket.role = decoded.role;

        // Store connection info in Redis
        await this.storeConnection(socket.id, decoded.id, decoded.partnerId);

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
      // Client connected - tracking socket connection

      // Join appropriate rooms based on role
      if (socket.role === 'admin') {
        socket.join('partner:admin');
        socket.join('partner:analytics');
      }

      if (socket.partnerId) {
        socket.join(`partner:${socket.partnerId}`);
        this.addClientConnection(socket.partnerId, socket.id);
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
        if (socket.partnerId) {
          const stats = await this.getRealtimeStats(socket.partnerId);
          socket.emit('realtime:stats', stats);
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        // Client disconnected - cleaning up connection
        
        if (socket.partnerId) {
          this.removeClientConnection(socket.partnerId, socket.id);
        }

        await this.removeConnection(socket.id);
      });

      // Send initial connection success
      socket.emit('connected', {
        socketId: socket.id,
        userId: socket.userId,
        partnerId: socket.partnerId,
        role: socket.role
      });
    });
  }

  /**
   * Emit click event
   */
  public async emitClick(partnerId: string, clickData: any): Promise<void> {
    const event: PartnerEvent = {
      type: 'click',
      timestamp: new Date(),
      data: {
        partnerId,
        referralCode: clickData.referralCode,
        metadata: {
          source: clickData.source,
          device: clickData.device,
          country: clickData.country,
          landingUrl: clickData.landingUrl
        }
      }
    };

    // Emit to partner's room
    this.io.to(`partner:${partnerId}`).emit('event', event);
    
    // Emit to admin room
    this.io.to('partner:admin').emit('event', event);

    // Update real-time stats
    await this.updateRealtimeStats(partnerId, 'click');
  }

  /**
   * Emit conversion event
   */
  public async emitConversion(partnerId: string, conversionData: any): Promise<void> {
    const event: PartnerEvent = {
      type: 'conversion',
      timestamp: new Date(),
      data: {
        partnerId,
        amount: conversionData.amount,
        orderId: conversionData.orderId,
        metadata: {
          productIds: conversionData.productIds,
          conversionType: conversionData.conversionType
        }
      }
    };

    this.io.to(`partner:${partnerId}`).emit('event', event);
    this.io.to('partner:admin').emit('event', event);
    this.io.to('partner:analytics').emit('analytics:conversion', event);

    await this.updateRealtimeStats(partnerId, 'conversion', conversionData.amount);
  }

  /**
   * Emit commission approved event
   */
  public async emitCommissionApproved(partnerId: string, commission: any): Promise<void> {
    const event: PartnerEvent = {
      type: 'commission_approved',
      timestamp: new Date(),
      data: {
        partnerId,
        amount: commission.amount,
        orderId: commission.orderId,
        metadata: {
          commissionId: commission.id,
          approvedBy: commission.approvedBy
        }
      }
    };

    this.io.to(`partner:${partnerId}`).emit('event', event);
    this.io.to('partner:admin').emit('event', event);

    // Send push notification if client is not connected
    if (!this.isClientConnected(partnerId)) {
      await this.queuePushNotification(partnerId, event);
    }
  }

  /**
   * Emit payout processed event
   */
  public async emitPayoutProcessed(partnerId: string, payout: any): Promise<void> {
    const event: PartnerEvent = {
      type: 'payout_processed',
      timestamp: new Date(),
      data: {
        partnerId,
        amount: payout.amount,
        metadata: {
          payoutId: payout.id,
          paymentMethod: payout.paymentMethod,
          transactionId: payout.transactionId
        }
      }
    };

    this.io.to(`partner:${partnerId}`).emit('event', event);
    this.io.to('partner:admin').emit('event', event);

    if (!this.isClientConnected(partnerId)) {
      await this.queuePushNotification(partnerId, event);
    }
  }

  /**
   * Broadcast to admin room
   */
  public broadcastToAdmin(eventType: string, data: any): void {
    this.io.to('partner:admin').emit(eventType, data);
  }

  /**
   * Send analytics update
   */
  public sendAnalyticsUpdate(data: any): void {
    this.io.to('partner:analytics').emit('analytics:update', data);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get partner's connected sockets
   */
  public getPartnerConnections(partnerId: string): Set<string> {
    return this.connectedClients.get(partnerId) || new Set();
  }

  // Private helper methods

  private canJoinRoom(socket: AuthenticatedSocket, room: string): boolean {
    // Admin can join any room
    if (socket.role === 'admin') return true;

    // Partner can only join their own room
    if (room.startsWith('partner:') && room === `partner:${socket.partnerId}`) {
      return true;
    }

    return false;
  }

  private async storeConnection(socketId: string, userId: string, partnerId?: string): Promise<void> {
    const connectionData = {
      socketId,
      userId,
      partnerId,
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

  private addClientConnection(partnerId: string, socketId: string): void {
    if (!this.connectedClients.has(partnerId)) {
      this.connectedClients.set(partnerId, new Set());
    }
    this.connectedClients.get(partnerId)!.add(socketId);
  }

  private removeClientConnection(partnerId: string, socketId: string): void {
    const connections = this.connectedClients.get(partnerId);
    if (connections) {
      connections.delete(socketId);
      if (connections.size === 0) {
        this.connectedClients.delete(partnerId);
      }
    }
  }

  private isClientConnected(partnerId: string): boolean {
    const connections = this.connectedClients.get(partnerId);
    return connections ? connections.size > 0 : false;
  }

  private async updateRealtimeStats(partnerId: string, type: string, amount?: number): Promise<void> {
    const key = `realtime:stats:${partnerId}`;
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

  private async getRealtimeStats(partnerId: string): Promise<any> {
    const key = `realtime:stats:${partnerId}`;
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

  private async queuePushNotification(partnerId: string, event: PartnerEvent): Promise<void> {
    // Queue for push notification service (implement based on your push service)
    const notificationKey = `push:queue:${partnerId}`;
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