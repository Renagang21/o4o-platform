/**
 * NotificationEventHub
 * Phase 15-B: Forum Notification Realtime Layer
 *
 * Memory-based EventEmitter for SSE notification delivery.
 * Manages user subscriptions and event distribution.
 *
 * Design:
 * - Uses Node.js EventEmitter for in-process event handling
 * - Interface designed for future Redis Pub/Sub replacement
 * - Supports multi-tenant (organizationId) filtering
 */

import { EventEmitter } from 'events';
import type { Response } from 'express';
import type { ForumNotification } from '../../entities/ForumNotification.js';

// SSE Client connection info
export interface SSEClient {
  id: string;
  userId: string;
  organizationId?: string;
  res: Response;
  connectedAt: Date;
  lastHeartbeat: Date;
}

// Notification event payload for SSE
export interface NotificationEvent {
  type: 'notification';
  data: {
    id: string;
    notificationType: string;
    message: string;
    postId?: string;
    commentId?: string;
    organizationId?: string;
    actorId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
  };
}

// Heartbeat event
export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: string;
}

// SSE Event types
export type SSEEvent = NotificationEvent | HeartbeatEvent;

/**
 * NotificationEventHub
 *
 * Manages SSE connections and notification event distribution.
 */
class NotificationEventHub extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private userClients: Map<string, Set<string>> = new Map(); // userId -> clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
    this.setMaxListeners(1000); // Support many concurrent connections
    this.startHeartbeat();
  }

  /**
   * Subscribe a client to notifications
   */
  subscribe(
    clientId: string,
    userId: string,
    res: Response,
    organizationId?: string
  ): void {
    const client: SSEClient = {
      id: clientId,
      userId,
      organizationId,
      res,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // Store client
    this.clients.set(clientId, client);

    // Track by userId
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(clientId);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    this.sendEvent(clientId, {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    });

    console.log(`[SSE] Client ${clientId} subscribed for user ${userId}`);

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(clientId);
    });

    res.on('error', () => {
      this.unsubscribe(clientId);
    });
  }

  /**
   * Unsubscribe a client
   */
  unsubscribe(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from userId tracking
    const userClientSet = this.userClients.get(client.userId);
    if (userClientSet) {
      userClientSet.delete(clientId);
      if (userClientSet.size === 0) {
        this.userClients.delete(client.userId);
      }
    }

    // Remove client
    this.clients.delete(clientId);

    console.log(`[SSE] Client ${clientId} unsubscribed`);
  }

  /**
   * Emit a notification event to a specific user
   */
  emitNotification(notification: ForumNotification): void {
    const event: NotificationEvent = {
      type: 'notification',
      data: {
        id: notification.id,
        notificationType: notification.type,
        message: notification.getMessage(),
        postId: notification.postId,
        commentId: notification.commentId,
        organizationId: notification.organizationId,
        actorId: notification.actorId,
        metadata: notification.metadata,
        createdAt: notification.createdAt.toISOString(),
      },
    };

    // Get all clients for this user
    const clientIds = this.userClients.get(notification.userId);
    if (!clientIds || clientIds.size === 0) {
      return; // User not connected
    }

    // Send to all user's clients
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (!client) continue;

      // Organization filter: only send yaksa notifications to matching org
      if (
        notification.organizationId &&
        client.organizationId &&
        notification.organizationId !== client.organizationId
      ) {
        continue;
      }

      this.sendEvent(clientId, event);
    }
  }

  /**
   * Send an event to a specific client
   */
  private sendEvent(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      client.res.write(data);
      client.lastHeartbeat = new Date();
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error);
      this.unsubscribe(clientId);
    }
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeat(): void {
    const event: HeartbeatEvent = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };

    for (const clientId of this.clients.keys()) {
      this.sendEvent(clientId, event);
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clean up stale connections (no heartbeat response in 2 minutes)
   */
  private cleanupStaleConnections(): void {
    const staleThreshold = Date.now() - 120000; // 2 minutes

    for (const [clientId, client] of this.clients) {
      if (client.lastHeartbeat.getTime() < staleThreshold) {
        console.log(`[SSE] Cleaning up stale connection ${clientId}`);
        try {
          client.res.end();
        } catch {
          // Ignore errors on close
        }
        this.unsubscribe(clientId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number;
    uniqueUsers: number;
    clientsByUser: Record<string, number>;
  } {
    const clientsByUser: Record<string, number> = {};
    for (const [userId, clients] of this.userClients) {
      clientsByUser[userId] = clients.size;
    }

    return {
      totalClients: this.clients.size,
      uniqueUsers: this.userClients.size,
      clientsByUser,
    };
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userClients.has(userId) && this.userClients.get(userId)!.size > 0;
  }
}

// Export singleton instance
export const notificationEventHub = new NotificationEventHub();

// Also export class for testing
export { NotificationEventHub };
