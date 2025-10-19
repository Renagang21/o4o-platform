"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
// Create Redis client with configuration
exports.redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
});
// Create a separate Redis client for subscriptions
exports.redisSub = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
});
// Handle connection events
exports.redis.on('connect', () => {
});
exports.redis.on('error', (err) => {
    // Error log removed
});
exports.redisSub.on('connect', () => {
});
exports.redisSub.on('error', (err) => {
    // Error log removed
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await exports.redis.quit();
    await exports.redisSub.quit();
});
exports.default = exports.redis;
//# sourceMappingURL=redis.js.map