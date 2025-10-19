"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = void 0;
const redis_service_1 = require("../services/redis.service");
function rateLimitMiddleware(options) {
    const redisService = redis_service_1.RedisService.getInstance();
    return async (req, res, next) => {
        const { windowMs, max, message = 'Too many requests, please try again later.', keyGenerator = (req) => req.ip || 'unknown' } = options;
        const key = `ratelimit:${keyGenerator(req)}:${req.path}`;
        const windowSeconds = Math.floor(windowMs / 1000);
        try {
            // Get current count
            const current = await redisService.get(key);
            const count = current ? parseInt(current) : 0;
            if (count >= max) {
                res.status(429).json({
                    success: false,
                    error: message,
                    retryAfter: windowSeconds,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            // Increment counter
            if (count === 0) {
                // First request in window
                await redisService.set(key, '1', windowSeconds);
            }
            else {
                // Increment existing counter
                await redisService.incrby(key, 1);
            }
            // Add headers
            res.setHeader('X-RateLimit-Limit', max.toString());
            res.setHeader('X-RateLimit-Remaining', (max - count - 1).toString());
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
            next();
        }
        catch (error) {
            // If Redis fails, allow the request but log the error
            // Error log removed
            next();
        }
    };
}
exports.rateLimitMiddleware = rateLimitMiddleware;
//# sourceMappingURL=rateLimit.middleware.js.map