"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketSessionSync = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const sessionSyncService_1 = require("../services/sessionSyncService");
const logger_1 = __importDefault(require("../utils/logger"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketSessionSync {
    constructor(io) {
        this.userSockets = new Map(); // userId -> socketIds
        this.io = io;
        this.setupRedisSubscriber();
        this.setupSocketHandlers();
    }
    async setupRedisSubscriber() {
        // Create a separate Redis client for subscribing (required by Redis)
        this.sessionSubscriber = redis_1.default.duplicate();
        await this.sessionSubscriber.connect();
        // Subscribe to session events
        await this.sessionSubscriber.subscribe('session:events', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleSessionEvent(data);
            }
            catch (error) {
                logger_1.default.error('Failed to parse session event:', error);
            }
        });
        logger_1.default.info('WebSocket session sync initialized');
    }
    setupSocketHandlers() {
        this.io.on('connection', async (socket) => {
            var _a, _b, _c;
            // Extract user from socket auth
            const token = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) || ((_c = (_b = socket.handshake.headers) === null || _b === void 0 ? void 0 : _b.authorization) === null || _c === void 0 ? void 0 : _c.replace('Bearer ', ''));
            if (!token) {
                socket.disconnect();
                return;
            }
            try {
                // Verify JWT token
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                // Register socket for user
                this.addUserSocket(userId, socket.id);
                socket.data.userId = userId;
                // Join user-specific room
                socket.join(`user:${userId}`);
                // Send current session status
                const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
                socket.emit('session:status', {
                    sessions,
                    activeSessions: sessions.length
                });
                // Handle socket events
                socket.on('session:check', async () => {
                    const sessions = await sessionSyncService_1.SessionSyncService.getUserSessions(userId);
                    socket.emit('session:status', {
                        sessions,
                        activeSessions: sessions.length
                    });
                });
                socket.on('session:logout', async (data) => {
                    if (data.allDevices) {
                        await sessionSyncService_1.SessionSyncService.logoutAllDevices(userId);
                    }
                    else if (data.sessionId) {
                        await sessionSyncService_1.SessionSyncService.removeSession(userId, data.sessionId);
                    }
                });
                socket.on('disconnect', () => {
                    this.removeUserSocket(userId, socket.id);
                });
            }
            catch (error) {
                logger_1.default.error('Socket authentication failed:', error);
                socket.disconnect();
            }
        });
    }
    handleSessionEvent(data) {
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
                    userSocketIds.forEach((socketId) => {
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
    addUserSocket(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socketId);
    }
    removeUserSocket(userId, socketId) {
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }
    // Broadcast session event manually (for immediate events)
    broadcastSessionEvent(userId, event, sessionId) {
        const eventData = {
            userId,
            event,
            sessionId,
            timestamp: Date.now()
        };
        // Publish to Redis for other servers
        redis_1.default.publish('session:events', JSON.stringify(eventData));
        // Handle locally
        this.handleSessionEvent(eventData);
    }
    async destroy() {
        if (this.sessionSubscriber) {
            await this.sessionSubscriber.unsubscribe('session:events');
            await this.sessionSubscriber.disconnect();
        }
    }
}
exports.WebSocketSessionSync = WebSocketSessionSync;
//# sourceMappingURL=sessionSync.js.map