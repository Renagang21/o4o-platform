"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisService {
    constructor() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            }
        });
        this.redis.on('error', (error) => {
            // Error log removed
        });
        this.redis.on('connect', () => {
            // Redis connected successfully
        });
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    async get(key) {
        try {
            return await this.redis.get(key);
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                await this.redis.setex(key, ttl, value);
            }
            else {
                await this.redis.set(key, value);
            }
            return true;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async del(key) {
        try {
            await this.redis.del(key);
            return true;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async expire(key, seconds) {
        try {
            const result = await this.redis.expire(key, seconds);
            return result === 1;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async hget(key, field) {
        try {
            return await this.redis.hget(key, field);
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    async hset(key, field, value) {
        try {
            await this.redis.hset(key, field, value);
            return true;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async hgetall(key) {
        try {
            return await this.redis.hgetall(key);
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    async incr(key) {
        try {
            return await this.redis.incr(key);
        }
        catch (error) {
            // Error log removed
            return 0;
        }
    }
    async incrby(key, increment) {
        try {
            return await this.redis.incrby(key, increment);
        }
        catch (error) {
            // Error log removed
            return 0;
        }
    }
    async sadd(key, member) {
        try {
            return await this.redis.sadd(key, member);
        }
        catch (error) {
            // Error log removed
            return 0;
        }
    }
    async scard(key) {
        try {
            return await this.redis.scard(key);
        }
        catch (error) {
            // Error log removed
            return 0;
        }
    }
    async flushdb() {
        try {
            await this.redis.flushdb();
        }
        catch (error) {
            // Error log removed
        }
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redis.service.js.map