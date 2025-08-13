"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayConfig = void 0;
exports.validateConfig = validateConfig;
var dotenv_1 = require("dotenv");
var path_1 = require("path");
var url_1 = require("url");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// Load environment variables
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.gatewayConfig = {
    port: parseInt(process.env.GATEWAY_PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    // Service Registry
    services: {
        auth: {
            name: 'Authentication Service',
            url: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        },
        user: {
            name: 'User Service',
            url: process.env.USER_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        },
        ecommerce: {
            name: 'E-commerce Service',
            url: process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        },
        content: {
            name: 'Content Service',
            url: process.env.CONTENT_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        },
        signage: {
            name: 'Digital Signage Service',
            url: process.env.SIGNAGE_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        },
        crowdfunding: {
            name: 'Crowdfunding Service',
            url: process.env.CROWDFUNDING_SERVICE_URL || 'http://localhost:4000',
            healthCheck: '/api/health',
            timeout: 10000,
            retries: 3
        }
    },
    // Route Definitions
    routes: [
        // Auth Routes (public)
        { path: '/api/v1/auth/login', service: 'auth', methods: ['POST'], auth: false },
        { path: '/api/v1/auth/register', service: 'auth', methods: ['POST'], auth: false },
        { path: '/api/v1/auth/refresh', service: 'auth', methods: ['POST'], auth: false },
        { path: '/api/v1/auth/forgot-password', service: 'auth', methods: ['POST'], auth: false },
        { path: '/api/v1/auth/reset-password', service: 'auth', methods: ['POST'], auth: false },
        { path: '/api/v1/auth/google', service: 'auth', methods: ['GET'], auth: false },
        { path: '/api/v1/auth/kakao', service: 'auth', methods: ['GET'], auth: false },
        { path: '/api/v1/auth/naver', service: 'auth', methods: ['GET'], auth: false },
        // Auth Routes (protected)
        { path: '/api/v1/auth/logout', service: 'auth', methods: ['POST'], auth: true },
        { path: '/api/v1/auth/logout-all', service: 'auth', methods: ['POST'], auth: true },
        { path: '/api/v1/auth/me', service: 'auth', methods: ['GET'], auth: true },
        { path: '/api/v1/auth/sessions', service: 'auth', methods: ['GET'], auth: true },
        { path: '/api/v1/auth/linked-accounts', service: 'auth', methods: ['GET'], auth: true },
        // User Routes
        { path: '/api/v1/users', service: 'user', methods: ['GET'], auth: true },
        { path: '/api/v1/users/:id', service: 'user', methods: ['GET', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/users/profile', service: 'user', methods: ['GET', 'PUT'], auth: true },
        // E-commerce Routes
        { path: '/api/v1/products', service: 'ecommerce', methods: ['GET'], auth: false },
        { path: '/api/v1/products/:id', service: 'ecommerce', methods: ['GET'], auth: false },
        { path: '/api/v1/products', service: 'ecommerce', methods: ['POST', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/cart', service: 'ecommerce', methods: ['GET', 'POST', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/orders', service: 'ecommerce', methods: ['GET', 'POST'], auth: true },
        { path: '/api/v1/orders/:id', service: 'ecommerce', methods: ['GET', 'PUT'], auth: true },
        // Content Routes
        { path: '/api/v1/posts', service: 'content', methods: ['GET'], auth: false },
        { path: '/api/v1/posts/:id', service: 'content', methods: ['GET'], auth: false },
        { path: '/api/v1/posts', service: 'content', methods: ['POST', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/pages', service: 'content', methods: ['GET'], auth: false },
        { path: '/api/v1/pages/:id', service: 'content', methods: ['GET'], auth: false },
        { path: '/api/v1/pages', service: 'content', methods: ['POST', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/media', service: 'content', methods: ['GET', 'POST', 'DELETE'], auth: true },
        // Digital Signage Routes
        { path: '/api/v1/displays', service: 'signage', auth: true },
        { path: '/api/v1/playlists', service: 'signage', auth: true },
        { path: '/api/v1/schedules', service: 'signage', auth: true },
        // Crowdfunding Routes
        { path: '/api/v1/campaigns', service: 'crowdfunding', methods: ['GET'], auth: false },
        { path: '/api/v1/campaigns/:id', service: 'crowdfunding', methods: ['GET'], auth: false },
        { path: '/api/v1/campaigns', service: 'crowdfunding', methods: ['POST', 'PUT', 'DELETE'], auth: true },
        { path: '/api/v1/campaigns/:id/pledge', service: 'crowdfunding', methods: ['POST'], auth: true },
        // Admin Routes (all require auth)
        { path: '/api/v1/admin/*', service: 'auth', auth: true }
    ],
    // CORS Configuration
    cors: {
        origins: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3001', // admin dashboard
            'http://localhost:3002', // e-commerce
            'http://localhost:3003', // crowdfunding
            'https://neture.co.kr',
            'https://admin.neture.co.kr',
            'https://shop.neture.co.kr'
        ],
        credentials: true
    },
    // Global Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100')
    },
    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    },
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret'
    },
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE
    },
    // Metrics Configuration
    metrics: {
        enabled: process.env.ENABLE_METRICS === 'true',
        path: '/metrics'
    }
};
// Validate configuration
function validateConfig() {
    if (!exports.gatewayConfig.jwt.secret || exports.gatewayConfig.jwt.secret === 'your-jwt-secret') {
        throw new Error('JWT_SECRET must be set in environment variables');
    }
    // Validate service URLs
    Object.entries(exports.gatewayConfig.services).forEach(function (_a) {
        var name = _a[0], service = _a[1];
        try {
            new URL(service.url);
        }
        catch (_b) {
            throw new Error("Invalid URL for service ".concat(name, ": ").concat(service.url));
        }
    });
}
