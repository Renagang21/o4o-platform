/**
 * NotificationEventHub
 * Phase 15-B: Forum Notification Realtime Layer
 * WO-O4O-NOTIFICATION-CORE-BASELINE-V1: generalized for platform-wide use
 *
 * Memory-based EventEmitter for SSE notification delivery.
 * Manages user subscriptions and event distribution.
 *
 * Design:
 * - Uses Node.js EventEmitter for in-process event handling
 * - Interface designed for future Redis Pub/Sub replacement
 * - Supports multi-tenant filtering by serviceKey + organizationId
 * - Hub takes a plain payload object — NO entity coupling.
 *   Callers (forum / core / future domains) adapt their entity into
 *   NotificationEmitPayload before emit.
 */

import { EventEmitter } from 'events';
import type { Response } from 'express';
import logger from '../../utils/logger.js';

// SSE Client connection info
export interface SSEClient {
  id: string;
  userId: string;
  serviceKey?: string;
  organizationId?: string;
  res: Response;
  connectedAt: Date;
  lastHeartbeat: Date;
}

// Plain emit payload — entity-agnostic.
// Forum and Core notifications both reduce to this shape before being emitted.
export interface NotificationEmitPayload {
  id: string;
  userId: string;
  type: string;
  title?: string;
  message: string;
  serviceKey?: string;
  organizationId?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Notification event payload for SSE
export interface NotificationEvent {
  type: 'notification';
  data: {
    id: string;
    notificationType: string;
    title?: string;
    message: string;
    serviceKey?: string;
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
   *
   * Backwards-compatible signature: positional `organizationId` is preserved for
   * existing callers (forum.notifications.routes.ts). New callers should pass
   * the options object form to also include `serviceKey`.
   */
  subscribe(
    clientId: string,
    userId: string,
    res: Response,
    organizationIdOrOptions?: string | { serviceKey?: string; organizationId?: string }
  ): void {
    const opts =
      typeof organizationIdOrOptions === 'string' || organizationIdOrOptions === undefined
        ? { organizationId: organizationIdOrOptions as string | undefined }
        : organizationIdOrOptions;

    const client: SSEClient = {
      id: clientId,
      userId,
      serviceKey: opts.serviceKey,
      organizationId: opts.organizationId,
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

    logger.debug(`[SSE] Client ${clientId} subscribed for user ${userId}`);

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

    logger.debug(`[SSE] Client ${clientId} unsubscribed`);
  }

  /**
   * Emit a notification event to a specific user.
   *
   * Accepts a plain payload — entity-agnostic. Forum and Core call sites
   * adapt their own entity into NotificationEmitPayload before invoking.
   */
  emitNotification(payload: NotificationEmitPayload): void {
    const event: NotificationEvent = {
      type: 'notification',
      data: {
        id: payload.id,
        notificationType: payload.type,
        title: payload.title,
        message: payload.message,
        serviceKey: payload.serviceKey,
        organizationId: payload.organizationId,
        actorId: payload.actorId,
        metadata: payload.metadata,
        createdAt: payload.createdAt.toISOString(),
      },
    };

    // Get all clients for this user
    const clientIds = this.userClients.get(payload.userId);
    if (!clientIds || clientIds.size === 0) {
      return; // User not connected
    }

    // Send to all user's clients
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (!client) continue;

      // serviceKey filter: only deliver to clients subscribed to the same service
      // (or to clients that did not narrow by serviceKey — they receive everything)
      if (
        payload.serviceKey &&
        client.serviceKey &&
        payload.serviceKey !== client.serviceKey
      ) {
        continue;
      }

      // Organization filter: only send tenant-scoped notifications to matching org
      if (
        payload.organizationId &&
        client.organizationId &&
        payload.organizationId !== client.organizationId
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
        logger.debug(`[SSE] Cleaning up stale connection ${clientId}`);
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
