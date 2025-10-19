"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.RealtimeFeedbackService = void 0;
// Sprint 3: Initialize OpenTelemetry before any other imports
const telemetry_1 = require("./utils/telemetry");
const telemetrySDK = (0, telemetry_1.initTelemetry)();
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 환경변수 로드 (우선순위: .env.production > .env.development > .env)
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'development'
        ? '.env.development'
        : '.env';
// Try multiple paths for .env file
const possiblePaths = [
    path_1.default.resolve(__dirname, '..', envFile), // apps/api-server/.env
    path_1.default.resolve(__dirname, '..', '.env'), // apps/api-server/.env (fallback)
    path_1.default.resolve(process.cwd(), envFile), // Current working directory
    path_1.default.resolve(process.cwd(), '.env'), // Current working directory (fallback)
];
let envLoaded = false;
for (const envPath of possiblePaths) {
    try {
        const result = dotenv_1.default.config({ path: envPath });
        if (!result.error) {
            envLoaded = true;
            break;
        }
    }
    catch (error) {
        // Continue to next path
    }
}
if (!envLoaded) {
    // Warning: No .env file found, using system environment variables
}
// 환경변수 검증 - 새로운 검증기 사용
const env_validator_1 = require("./utils/env-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = require("connect-redis");
const passportDynamic_1 = __importStar(require("./config/passportDynamic"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("./utils/logger"));
// Database connection
const connection_1 = require("./database/connection");
const database_checker_1 = require("./utils/database-checker");
const Post_1 = require("./entities/Post");
const sessionSyncService_1 = require("./services/sessionSyncService");
const sessionSync_1 = require("./websocket/sessionSync");
const error_handler_1 = require("./middleware/error-handler");
const performanceMonitor_1 = require("./middleware/performanceMonitor");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const auth_1 = require("./middleware/auth");
// import { startInventorySchedules } from './schedules/inventorySchedule'; // Disabled: unnecessary complex feature
// Monitoring services
const BackupService_1 = require("./services/BackupService");
const ErrorAlertService_1 = require("./services/ErrorAlertService");
// Email service - import moved to runtime to avoid blocking
// 라우트 imports 
const auth_2 = __importDefault(require("./routes/auth"));
const auth_v2_1 = __importDefault(require("./routes/auth-v2"));
const social_auth_1 = __importDefault(require("./routes/social-auth"));
const user_1 = __importDefault(require("./routes/user"));
const users_routes_1 = __importDefault(require("./routes/v1/users.routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const settingsRoutes_1 = __importDefault(require("./routes/ecommerce/settingsRoutes"));
const cpt_1 = __importDefault(require("./routes/cpt"));
const post_creation_1 = __importDefault(require("./routes/post-creation"));
const services_1 = __importDefault(require("./routes/services"));
const signage_1 = __importDefault(require("./routes/signage"));
const content_1 = __importDefault(require("./routes/content"));
const index_1 = __importDefault(require("./routes/content/index"));
const public_1 = __importDefault(require("./routes/public"));
const settingsRoutes_2 = __importDefault(require("./routes/settingsRoutes"));
const email_auth_routes_1 = __importDefault(require("./routes/email-auth.routes"));
const forum_1 = __importDefault(require("./routes/forum"));
const linked_accounts_1 = __importDefault(require("./routes/linked-accounts"));
const account_linking_routes_1 = __importDefault(require("./routes/account-linking.routes"));
const unified_auth_routes_1 = __importDefault(require("./routes/unified-auth.routes"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const forms_1 = __importDefault(require("./routes/forms"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const reusable_blocks_routes_1 = __importDefault(require("./routes/reusable-blocks.routes"));
const block_patterns_routes_1 = __importDefault(require("./routes/block-patterns.routes"));
const ai_shortcodes_1 = __importDefault(require("./routes/ai-shortcodes"));
const ai_blocks_1 = __importDefault(require("./routes/ai-blocks"));
const ai_proxy_1 = __importDefault(require("./routes/ai-proxy"));
const ai_schema_1 = __importDefault(require("./routes/ai-schema"));
const template_parts_routes_1 = __importDefault(require("./routes/template-parts.routes"));
const categories_1 = __importDefault(require("./routes/categories"));
const menus_1 = __importDefault(require("./routes/menus"));
const menu_items_1 = __importDefault(require("./routes/menu-items"));
// Import v1 API routes
const content_routes_1 = __importDefault(require("./routes/v1/content.routes"));
const platform_routes_1 = __importDefault(require("./routes/v1/platform.routes"));
const forum_routes_1 = __importDefault(require("./routes/v1/forum.routes"));
const admin_routes_1 = __importDefault(require("./routes/v1/admin.routes"));
const media_routes_1 = __importDefault(require("./routes/v1/media.routes"));
const theme_routes_1 = __importDefault(require("./routes/v1/theme.routes"));
const apps_routes_1 = __importDefault(require("./routes/v1/apps.routes"));
const plugins_routes_1 = __importDefault(require("./routes/v1/plugins.routes"));
const health_1 = __importDefault(require("./routes/health"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const settings_routes_1 = __importDefault(require("./routes/v1/settings.routes"));
const customizer_routes_1 = __importDefault(require("./routes/v1/customizer.routes"));
const gallery_routes_1 = __importDefault(require("./routes/gallery.routes"));
const acf_routes_1 = __importDefault(require("./routes/v1/acf.routes"));
const pages_routes_1 = __importDefault(require("./routes/v1/pages.routes"));
const preview_1 = __importDefault(require("./routes/preview"));
const approval_routes_1 = __importDefault(require("./routes/v1/approval.routes"));
const ai_settings_routes_1 = __importDefault(require("./routes/v1/ai-settings.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
// 중복 제거 - 이미 상단에서 로드됨
const app = (0, express_1.default)();
// IMPORTANT: Set trust proxy IMMEDIATELY after creating the app
// This must be done before any middleware that uses req.ip
// Enable for both development and production since we're behind nginx proxy
app.set('trust proxy', true);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            const allowedOrigins = [
                process.env.FRONTEND_URL || "http://localhost:3011",
                "http://localhost:3000", // main-site
                "http://localhost:3001", // admin dashboard
                "http://localhost:3002", // ecommerce
                "http://localhost:3003", // crowdfunding
                "http://localhost:5173", // vite dev server - main site
                "http://localhost:5174", // vite dev server - admin dashboard
                "http://localhost:5175", // vite dev server - ecommerce
                "http://localhost:5176", // vite dev server - crowdfunding
                "http://localhost:5177", // vite dev server - signage
                // Web server IPs
                "http://13.125.144.8:3000", // web server main-site
                "http://13.125.144.8:3001", // web server admin-dashboard
                "http://13.125.144.8", // web server direct IP
                "https://13.125.144.8", // web server direct IP (https)
                // Production domains
                "https://neture.co.kr",
                "https://www.neture.co.kr",
                "https://admin.neture.co.kr",
                "http://admin.neture.co.kr", // Allow both http and https for admin
                "https://shop.neture.co.kr",
                "https://forum.neture.co.kr",
                "https://signage.neture.co.kr",
                "https://funding.neture.co.kr",
                "https://auth.neture.co.kr",
                "https://api.neture.co.kr",
                "http://api.neture.co.kr"
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});
exports.io = io;
const port = env_validator_1.env.getNumber('PORT', 4000);
// Rate limiting for authenticated endpoints
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100 요청
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use custom key generator for proxy environments
    keyGenerator: (req) => {
        // In production with proxy, use X-Forwarded-For
        if (process.env.NODE_ENV === 'production') {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                // Get the first IP in the chain (original client IP)
                return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
            }
        }
        return req.ip || 'unknown';
    },
    // Skip localhost
    skip: (req) => {
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
// More lenient rate limiting for public endpoints
const publicLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15분
    max: 1000, // 최대 1000 요청 (increased for bulk operations)
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (process.env.NODE_ENV === 'production') {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
            }
        }
        return req.ip || 'unknown';
    },
    skip: (req) => {
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
// 미들웨어 설정
// Sprint 2 - P3: Restore Helmet security headers
app.use((0, helmet_1.default)({
    // Enable Content Security Policy with sensible defaults
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for React
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
            imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from any HTTPS source
            connectSrc: ["'self'", "https:", "http:"], // Allow API connections
            fontSrc: ["'self'", "data:", "https:"], // Allow fonts
            objectSrc: ["'none'"], // Block plugins
            mediaSrc: ["'self'", "https:", "http:"], // Allow media
            frameSrc: ["'self'"], // Allow same-origin frames only (preview overrides this)
            frameAncestors: ["'none'"], // Default: no framing (preview overrides this per route)
        },
    },
    // Enable frameguard with DENY by default (preview route overrides this)
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access to resources
    crossOriginEmbedderPolicy: false, // Disable COEP to allow loading cross-origin resources
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Safer than false
}));
// Enable compression for all responses
app.use((0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // Don't compress responses if this header is present
            return false;
        }
        // Use compression filter function
        return compression_1.default.filter(req, res);
    },
    level: 6, // Compression level (0-9, where 9 is best compression but slowest)
}));
// CORS configuration for multiple origins
// Sprint 2 - P3: Stricter CORS whitelist
const corsOptions = {
    origin: function (origin, callback) {
        // Get allowed origins from environment variable
        const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [];
        // Development origins (localhost)
        const devOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3011",
            "http://localhost:3000", // main-site
            "http://localhost:3001", // admin dashboard
            "http://localhost:3002", // ecommerce
            "http://localhost:3003", // crowdfunding
            "http://localhost:5173", // vite dev server - main site
            "http://localhost:5174", // vite dev server - admin dashboard
            "http://localhost:5175", // vite dev server - ecommerce
            "http://localhost:5176", // vite dev server - crowdfunding
            "http://localhost:5177", // vite dev server - signage
        ];
        // IP-based origins (development/staging only)
        const ipOrigins = process.env.NODE_ENV !== 'production' ? [
            "http://13.125.144.8:3000",
            "http://13.125.144.8:3001",
            "http://13.125.144.8",
            "https://13.125.144.8",
        ] : [];
        // Production domains (explicit subdomain whitelist)
        const prodOrigins = [
            "https://neture.co.kr",
            "https://www.neture.co.kr",
            "https://admin.neture.co.kr",
            "https://shop.neture.co.kr",
            "https://forum.neture.co.kr",
            "https://signage.neture.co.kr",
            "https://funding.neture.co.kr",
            "https://auth.neture.co.kr",
            "https://api.neture.co.kr",
        ];
        const allowedOrigins = [
            ...devOrigins,
            ...ipOrigins,
            ...prodOrigins,
            ...envOrigins
        ];
        // Allow requests without origin header (for proxied requests from nginx)
        // In production, nginx proxy may not pass Origin header for same-domain requests
        if (!origin) {
            callback(null, true);
            return;
        }
        // Debug logging in development
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_CORS === 'true') {
            logger_1.default.debug(`[CORS] Request from origin: ${origin}`);
            logger_1.default.debug(`[CORS] Allowed: ${allowedOrigins.includes(origin)}`);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger_1.default.warn(`[CORS] Blocked origin: ${origin}`);
            logger_1.default.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};
// Apply CORS before any other middleware
app.use((0, cors_1.default)(corsOptions));
// Explicit OPTIONS request handler for better preflight support
app.options('*', (0, cors_1.default)(corsOptions));
// Serve static files for uploads (EARLY in middleware chain)
// Static file serving with CORS headers for images
// Use project root for uploads in both dev and production
// Files are uploaded to project root /public/uploads
const projectRoot = path_1.default.resolve(__dirname, '../../../');
const staticUploadsPath = path_1.default.join(projectRoot, 'public', 'uploads');
// Add CORS headers for static files
app.use('/uploads', (req, res, next) => {
    // Set CORS headers for all upload requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    // Cache control for images
    res.header('Cache-Control', 'public, max-age=604800, immutable');
    next();
});
// Primary static path
app.use('/uploads', express_1.default.static(staticUploadsPath, {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Additional headers for specific file types
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/' + path.split('.').pop());
        }
    }
}));
// Fallback static path for apps/api-server/public/uploads (for compatibility)
const fallbackUploadsPath = path_1.default.join(__dirname, '../public', 'uploads');
if (fallbackUploadsPath !== staticUploadsPath) {
    app.use('/uploads', express_1.default.static(fallbackUploadsPath, {
        maxAge: '7d',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
            if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
                res.setHeader('Content-Type', 'image/' + path.split('.').pop());
            }
        }
    }));
}
// Add performance monitoring middleware early in the chain
app.use(performanceMonitor_1.performanceMonitor);
// Security middleware
app.use(securityMiddleware_1.securityMiddleware);
app.use(securityMiddleware_1.sqlInjectionDetection);
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Configure session store
let sessionConfig = {
    secret: env_validator_1.env.getString('SESSION_SECRET', 'o4o-platform-session-secret'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env_validator_1.env.isProduction(),
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: env_validator_1.env.getString('COOKIE_DOMAIN', undefined), // Enable cross-subdomain cookies
        sameSite: 'lax'
    }
};
// Use Redis store conditionally (production + REDIS_ENABLED)
const redisEnabled = env_validator_1.env.getString('REDIS_ENABLED', 'false') !== 'false' && env_validator_1.env.isProduction();
if (redisEnabled) {
    try {
        const sessionRedisClient = new ioredis_1.default({
            host: env_validator_1.env.getString('REDIS_HOST', 'localhost'),
            port: env_validator_1.env.getNumber('REDIS_PORT', 6379),
            password: env_validator_1.env.getString('REDIS_PASSWORD', undefined),
            lazyConnect: true, // 지연 연결로 에러 방지
            maxRetriesPerRequest: 3,
            connectTimeout: 5000
        });
        sessionConfig.store = new connect_redis_1.RedisStore({
            client: sessionRedisClient,
            prefix: 'sess:'
        });
        logger_1.default.info('Redis session store configured');
    }
    catch (redisError) {
        logger_1.default.warn('Redis session store configuration failed, using memory store:', redisError);
    }
}
else {
    logger_1.default.info('Redis disabled, using memory session store');
}
// Session middleware for passport (required for OAuth)
app.use((0, express_session_1.default)(sessionConfig));
// Initialize passport
app.use(passportDynamic_1.default.initialize());
// Remove duplicate static file serving - already configured above
// Settings API rate limiter - very lenient for admin operations
const settingsLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15분
    max: 2000, // 최대 2000 요청 (설정은 자주 읽고 쓰기 때문)
    message: {
        error: 'Too many settings requests',
        code: 'SETTINGS_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (process.env.NODE_ENV === 'production') {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
            }
        }
        return req.ip || 'unknown';
    },
    skip: (req) => {
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
// Special rate limit for SSO check endpoint (more lenient to prevent 429 errors)
const ssoCheckLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15분
    max: 500, // 최대 500 요청 (SSO 체크는 자주 발생)
    message: {
        error: 'Too many SSO check requests',
        code: 'SSO_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (process.env.NODE_ENV === 'production') {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                // Get the first IP in the chain (original client IP)
                return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
            }
        }
        return req.ip || 'unknown';
    },
    skip: (req) => {
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
// 헬스체크 엔드포인트 (rate limit 전에 위치해야 함)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        service: 'api-server'
    });
});
// Use the health router for comprehensive health checks
app.use('/api/health', health_1.default);
// Sprint 4: Prometheus metrics endpoint
app.use('/metrics', metrics_1.default);
// Additional health endpoints for specific services
app.get('/api/auth/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'auth',
        timestamp: new Date().toISOString()
    });
});
app.get('/api/ecommerce/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ecommerce',
        timestamp: new Date().toISOString()
    });
});
// Apply rate limiting to specific endpoints
app.use('/api/v1/accounts/sso/check', ssoCheckLimiter);
app.use('/accounts/sso/check', ssoCheckLimiter); // Direct route for frontend
// Public permalink endpoint - must be before general public route handlers
app.get('/api/public/permalink-settings', async (req, res) => {
    try {
        // Return default permalink settings
        res.json({
            success: true,
            data: {
                structure: '/%postname%/',
                categoryBase: 'category',
                tagBase: 'tag',
                removeStopWords: false,
                maxUrlLength: 75,
                autoFlushRules: true,
                enableSeoWarnings: true
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get permalink settings'
        });
    }
});
app.use('/api/public', publicLimiter);
// Direct frontend routes (without /api prefix)
app.use('/accounts', linked_accounts_1.default);
app.use('/settings', settingsRoutes_2.default);
app.use('/v1/content', content_routes_1.default);
// API 라우트 - auth routes MUST be before general rate limiter
// IMPORTANT: Basic auth routes must come FIRST before any other auth-related routes
app.use('/api/auth', auth_2.default);
// V1 auth routes with more specific paths to avoid conflicts
app.use('/api/v1/auth/cookie', auth_v2_1.default); // Cookie-based auth routes (moved to specific sub-path)
app.use('/api/v1/auth', auth_2.default); // v1 compatibility - JWT-based auth routes
app.use('/api/v1/accounts', linked_accounts_1.default); // Linked accounts routes (moved to avoid conflict)
app.use('/api/v1/social', social_auth_1.default); // Social auth routes (moved to avoid conflict)
// Settings routes with lenient rate limiting (BEFORE general rate limiter)
// Public endpoint for roles - no authentication required
app.get('/api/v1/users/roles', (req, res) => {
    const { UserRoleController } = require('./controllers/v1/userRole.controller');
    return UserRoleController.getRoles(req, res);
});
// Consolidated settings routes - removed duplicates
app.use('/api/v1/settings', settingsLimiter, settings_routes_1.default);
app.use('/api/v1/customizer', settingsLimiter, customizer_routes_1.default); // Customizer API routes
app.use('/api/customizer', settingsLimiter, customizer_routes_1.default); // Customizer API routes (no v1 prefix for frontend compatibility)
app.use('/api/settings', settingsLimiter, settingsRoutes_2.default); // Primary settings route
// Removed duplicate: app.use('/api/settings', settingsLimiter, oauthSettingsRoutes);
app.use('/settings', settingsLimiter, settingsRoutes_2.default); // Backward compatibility
// Apply standard rate limiting to authenticated endpoints (exclude public routes)
// Note: Public routes (/api/public) should not have rate limiting
// Non-existent routes should return 404, not 401
// Lenient rate limiting for user permissions endpoint (frequently called on login)
const userPermissionsLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15분
    max: 500, // 최대 500 요청 (permissions는 자주 호출됨)
    message: {
        error: 'Too many permission requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (process.env.NODE_ENV === 'production') {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
            }
        }
        return req.ip || 'unknown';
    },
    skip: (req) => {
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
// Protected API routes (with individual rate limiting)
app.use('/api/users', limiter, user_1.default);
app.use('/api/v1/users', userPermissionsLimiter, users_routes_1.default); // V1 user management routes - more lenient for permissions
app.use('/v1/users', userPermissionsLimiter, users_routes_1.default); // V1 user management routes (backward compatibility)
app.use('/api/admin', limiter, admin_1.default);
app.use('/ecommerce', settingsRoutes_1.default); // Direct ecommerce settings route
app.use('/api/cpt', limiter, cpt_1.default);
app.use('/api/v1/cpt', limiter, cpt_1.default); // V1 compatibility for CPT routes
app.use('/api/post-creation', limiter, post_creation_1.default);
app.use('/api/services', limiter, services_1.default);
app.use('/api/signage', limiter, signage_1.default);
app.use('/api/forum', limiter, forum_1.default);
app.use('/api/public', public_1.default); // Public routes (no auth required)
// Compatibility: expose public routes under v1 prefix for frontend consistency
app.use('/api/v1/public', public_1.default);
app.use('/api/v1/sessions', limiter, sessions_1.default); // Session management routes
// AI Shortcodes API (public access for AI page generation)
app.use('/api/ai/shortcodes', publicLimiter, ai_shortcodes_1.default);
// AI Blocks API (SSOT for AI page generation)
app.use('/api/ai/blocks', publicLimiter, ai_blocks_1.default);
// AI Schema API (JSON Schema for AI output validation)
app.use('/api/ai/schema', publicLimiter, ai_schema_1.default);
// AI Proxy API (server-side LLM proxy with security)
app.use('/api/ai', limiter, ai_proxy_1.default);
// AI Settings API (admin only)
app.use('/api/v1/ai-settings', limiter, ai_settings_routes_1.default);
// Categories routes (public access) - moved to avoid duplication
// Gutenberg Content Management Routes
const posts_1 = __importDefault(require("./routes/api/posts"));
const pages_1 = __importDefault(require("./routes/api/pages"));
const categories_2 = __importDefault(require("./routes/api/categories"));
const tags_1 = __importDefault(require("./routes/api/tags"));
// Canonical posts API - Apply publicLimiter for read operations
app.use('/api/posts', publicLimiter, posts_1.default);
app.use('/api/pages', publicLimiter, pages_1.default);
app.use('/api/categories', publicLimiter, categories_2.default); // Primary categories API
app.use('/api/tags', publicLimiter, tags_1.default);
// ACF routes
const acf_1 = __importDefault(require("./routes/acf"));
app.use('/api/acf', acf_1.default); // Mount ACF routes at /api/acf for proper API access
// API v1 compatibility for media routes
app.use('/api/v1/media/folders', (req, res, next) => {
    req.url = '/folders';
    (0, acf_1.default)(req, res, next);
});
// Dashboard endpoints with real data
const dashboardController_1 = require("./controllers/dashboardController");
app.get('/ecommerce/dashboard/stats', dashboardController_1.DashboardController.getEcommerceStats);
app.get('/api/users/stats', dashboardController_1.DashboardController.getUserStats);
app.get('/api/admin/notifications', dashboardController_1.DashboardController.getNotifications);
app.get('/api/admin/activities', dashboardController_1.DashboardController.getActivities);
app.get('/api/system/health', dashboardController_1.DashboardController.getSystemHealth);
app.get('/api/admin/stats', dashboardController_1.DashboardController.getContentStats);
app.get('/api/dashboard/overview', dashboardController_1.DashboardController.getDashboardOverview);
// Add publish endpoint directly at /api/posts level
app.post('/api/posts/:id/publish', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if database is connected
        if (!connection_1.AppDataSource.isInitialized) {
            logger_1.default.error('Database not initialized');
            return res.status(503).json({
                error: { code: 'DB_NOT_READY', message: 'Database connection not available' }
            });
        }
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const post = await postRepository.findOne({
            where: { id },
            relations: ['author', 'categories', 'tags']
        });
        if (!post) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Post not found' }
            });
        }
        post.status = 'publish';
        post.published_at = new Date();
        const updatedPost = await postRepository.save(post);
        return res.json({
            success: true,
            data: updatedPost
        });
    }
    catch (error) {
        logger_1.default.error('Error publishing post:', error);
        return res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to publish post', details: error.message }
        });
    }
});
// Direct public endpoints for main site
// COMMENTED OUT: Duplicate route definition - using postsApiRoutes from line 558 instead
// app.get('/api/posts', publicLimiter, async (req, res) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const status = req.query.status as string || 'published';
//     const orderBy = req.query.orderBy as string || 'createdAt';
//     const order = req.query.order as string || 'DESC';
//     const offset = (page - 1) * limit;
//
//     // For now, return mock data until we have proper posts entity
//     const mockPosts = [
//       {
//         id: '1',
//         title: 'Neture 플랫폼 출시',
//         slug: 'neture-platform-launch',
//         excerpt: 'O4O 비즈니스를 위한 통합 플랫폼이 출시되었습니다.',
//         content: '<p>Neture 플랫폼이 공식 출시되었습니다...</p>',
//         status: 'published',
//         author: {
//           id: '1',
//           name: 'Admin',
//           avatar: null
//         },
//         featuredImage: null,
//         categories: ['공지사항'],
//         tags: ['플랫폼', '출시'],
//         publishedAt: new Date().toISOString(),
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString()
//       }
//     ];
//
//     res.json({
//       data: mockPosts,
//       pagination: {
//         current: page,
//         total: 1,
//         count: limit,
//         totalItems: 1
//       }
//     });
//   } catch (error) {
//     logger.error('Error fetching posts:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch posts'
//     });
//   }
// });
// OAuth routes must be registered BEFORE general settings routes
// Settings routes moved before rate limiter
// Email settings routes
const email_settings_routes_1 = __importDefault(require("./routes/email-settings.routes"));
const smtp_routes_1 = __importDefault(require("./routes/v1/smtp.routes"));
app.use('/api/v1/email', email_settings_routes_1.default);
app.use('/api/v1/smtp', smtp_routes_1.default); // SMTP management routes
app.use('/api/auth/email', email_auth_routes_1.default); // Email-specific auth routes (moved to sub-path)
app.use('/api/auth/accounts', account_linking_routes_1.default); // Account linking routes
app.use('/api/auth/unified', unified_auth_routes_1.default); // Unified auth routes
app.use('/api/inventory', inventory_1.default); // Inventory management routes
app.use('/api/forms', forms_1.default); // Form builder routes
app.use('/api/v1/monitoring', monitoring_1.default); // Monitoring routes v1
app.use('/api/monitoring', monitoring_1.default); // Monitoring routes (primary API path)
// Removed duplicate mount to ensure a single canonical router for /api/posts
app.use('/api/reusable-blocks', reusable_blocks_routes_1.default); // Reusable blocks routes (WordPress-compatible)
app.use('/api/block-patterns', block_patterns_routes_1.default); // Block patterns routes (WordPress-compatible)
app.use('/api/template-parts', template_parts_routes_1.default); // Template parts routes (WordPress FSE)
app.use('/api/v1/template-parts', template_parts_routes_1.default); // V1 compatibility for template parts
app.use('/api/preview', publicLimiter, preview_1.default); // Preview routes for theme customization
app.use('/api/content', content_1.default); // Content routes - moved to specific path to avoid conflicts
app.use('/api/cms', index_1.default); // New CMS routes (Posts, Pages, Media with full features)
// V1 API routes (new standardized endpoints)
// Removed v1 posts duplicate mounting to avoid policy conflicts
app.use('/api/v1/categories', categories_1.default); // Categories routes v1
// Dropshipping CPT Routes
const dropshipping_routes_1 = __importDefault(require("./routes/cpt/dropshipping.routes"));
app.use('/api/v1/dropshipping', dropshipping_routes_1.default); // Dropshipping CPT API routes
// Partner (Affiliate) Routes
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
app.use('/api/v1/dropshipping/partner', partner_routes_1.default); // Partner/Affiliate API routes
// Admin Management Routes
const admin_routes_2 = __importDefault(require("./routes/admin.routes"));
app.use('/api/v1/approval/admin', admin_routes_2.default); // Admin approval management routes (moved to sub-path)
// Approval Workflow Routes (법률 준수)
app.use('/api/v1/approval', approval_routes_1.default); // Approval workflow for pricing changes (primary approval route)
// Migration Routes
const migration_routes_1 = __importDefault(require("./routes/migration.routes"));
app.use('/api/v1/migration', migration_routes_1.default); // Migration and system initialization routes
// Tag routes
const tagRoutes_1 = __importDefault(require("./routes/content/tagRoutes"));
app.use('/api', tagRoutes_1.default); // Tags at /api/tags (mounted at specific paths in the router)
// AI routes - Removed duplicate (using v1/ai-settings.routes.ts instead)
app.use('/api/v1/menus', menus_1.default); // Menus routes
app.use('/api/menus', menus_1.default); // Menus routes (no v1 prefix for frontend compatibility)
app.use('/api/v1/menu-items', menu_items_1.default); // Menu items routes
// Advanced menu features (Phase 2)
const menu_advanced_1 = __importDefault(require("./routes/menu-advanced"));
app.use('/api/v1/menus-advanced', menu_advanced_1.default); // Advanced menu APIs
// Menu Phase 3 features (Caching, Analytics, Widgets)
const menu_phase3_1 = __importDefault(require("./routes/menu-phase3"));
app.use('/api/v1/menus-phase3', menu_phase3_1.default); // Phase 3 menu APIs
app.use('/api/media/gallery', gallery_routes_1.default); // Gallery-specific routes (PUBLIC ACCESS)
app.use('/api/media', gallery_routes_1.default); // Standard media routes for gallery block (PUBLIC ACCESS)
app.use('/api/v1/content', content_routes_1.default);
app.use('/api/v1/platform', platform_routes_1.default);
app.use('/api/v1/forum', forum_routes_1.default);
app.use('/api/v1/media', media_routes_1.default); // V1 media routes (AUTHENTICATED ACCESS)
app.use('/api/v1/pages', pages_routes_1.default); // V1 pages API with full authentication
// Preview proxy routes (for X-Frame-Options bypass)
const preview_routes_1 = __importDefault(require("./routes/v1/preview.routes"));
app.use('/api/v1/preview', preview_routes_1.default); // Preview proxy routes
app.use('/api/v1/apps', apps_routes_1.default);
app.use('/api/v1/apps/plugins', plugins_routes_1.default);
app.use('/api/v1/themes', theme_routes_1.default);
// import dropshippingV1Routes from './routes/v1/dropshipping.routes'; // Already imported above
app.use('/v1/settings', settings_routes_1.default); // 설정 라우트 - 자동 배포 재테스트
app.use('/api/v1/acf', acf_routes_1.default); // ACF v1 라우트
// Development routes removed for production deployment
// Admin routes with correct paths
app.use('/api/v1/admin', admin_routes_1.default); // V1 admin routes with clear versioning
// Settings routes already registered above
// Order management routes
app.use('/api/orders', orders_routes_1.default); // Order management API
// Dropshipping admin routes
const dropshipping_routes_2 = __importDefault(require("./routes/admin/dropshipping.routes"));
app.use('/api/admin/dropshipping', limiter, dropshipping_routes_2.default);
// Forum admin routes
const forum_routes_2 = __importDefault(require("./routes/admin/forum.routes"));
app.use('/api/admin/forum', limiter, forum_routes_2.default);
// User admin routes
const users_routes_2 = __importDefault(require("./routes/admin/users.routes"));
app.use('/api/admin/users', limiter, users_routes_2.default);
// Supplier admin routes
const suppliers_routes_1 = __importDefault(require("./routes/admin/suppliers.routes"));
app.use('/api/admin/suppliers', limiter, suppliers_routes_1.default);
// Dropshipping API routes
const products_1 = __importDefault(require("./routes/products"));
const partners_1 = __importDefault(require("./routes/partners"));
const seller_products_1 = __importDefault(require("./routes/seller-products"));
app.use('/api/products', products_1.default); // Product management API
app.use('/api/partners', partners_1.default); // Partner management API
app.use('/api/seller-products', seller_products_1.default); // Seller product management API
// 루트 접근 시 API 서버임을 알림
app.get('/', (req, res) => {
    res.json({
        message: 'Neture API Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            users: '/api/users',
            admin: '/api/admin',
            ecommerce: '/api/ecommerce',
            orders: '/api/orders',
            cpt: '/api/cpt',
            postCreation: '/api/post-creation',
            services: '/api/services',
            signage: '/api/signage',
            content: {
                pages: '/api/admin/pages',
                media: '/api/admin/media',
                templates: '/api/admin/templates',
                customFields: '/api/admin/custom-field-groups'
            },
            forms: '/api/forms'
        },
        frontend: process.env.FRONTEND_URL || 'http://localhost:3011'
    });
});
// Socket.IO 연결 처리 (기존 기능 유지)
io.on('connection', (socket) => {
    socket.on('join_admin', () => {
        socket.join('admin_notifications');
    });
    socket.on('new_user_registered', (data) => {
        io.to('admin_notifications').emit('new_registration', {
            message: '새로운 사용자가 등록되었습니다.',
            user: data,
            timestamp: new Date().toISOString()
        });
    });
    socket.on('disconnect', () => {
    });
});
// 중앙화된 에러 핸들러 (모든 라우트 뒤에 위치해야 함)
app.use(error_handler_1.errorHandler);
// 404 핸들러 (API 전용) - 새로운 핸들러 사용
app.use('*', error_handler_1.notFoundHandler);
// Swagger documentation
const swagger_enhanced_1 = require("./config/swagger-enhanced");
// Setup Swagger API documentation
logger_1.default.info('Setting up Swagger documentation...');
try {
    (0, swagger_enhanced_1.setupSwagger)(app);
    logger_1.default.info('Swagger documentation setup completed');
}
catch (swaggerError) {
    logger_1.default.error('Swagger setup failed:', swaggerError);
}
// 서버 시작
const startServer = async () => {
    logger_1.default.info('Starting server...');
    // Initialize dynamic Passport strategies
    try {
        await (0, passportDynamic_1.initializePassport)();
        logger_1.default.info('✅ Dynamic Passport strategies initialized');
    }
    catch (passportError) {
        logger_1.default.error('Failed to initialize Passport strategies:', passportError);
    }
    try {
        logger_1.default.info('Checking database initialization status...');
        // 데이터베이스 초기화 전 상태 확인
        if (connection_1.AppDataSource.isInitialized) {
            logger_1.default.info('Database already initialized');
        }
        else {
            // 환경변수 재확인 - 검증기 사용
            const dbConfig = {
                host: env_validator_1.env.getString('DB_HOST'),
                port: env_validator_1.env.getNumber('DB_PORT'),
                username: env_validator_1.env.getString('DB_USERNAME'),
                password: env_validator_1.env.getString('DB_PASSWORD'),
                database: env_validator_1.env.getString('DB_NAME')
            };
            logger_1.default.info('Database configuration:', {
                ...dbConfig,
                password: dbConfig.password ? '***' : 'NOT SET'
            });
            // 데이터베이스 초기화 (재시도 로직 포함)
            logger_1.default.info('Attempting database connection...');
            let dbConnected = false;
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    logger_1.default.info(`Database connection attempt ${attempt}/${maxRetries}`);
                    const dbConnectionPromise = connection_1.AppDataSource.initialize();
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Database connection timeout')), 10000); // 타임아웃 연장
                    });
                    await Promise.race([dbConnectionPromise, timeoutPromise]);
                    logger_1.default.info('Database connection successful');
                    dbConnected = true;
                    break;
                }
                catch (connectionError) {
                    logger_1.default.warn(`Database connection attempt ${attempt} failed:`, connectionError);
                    if (attempt < maxRetries) {
                        logger_1.default.info(`Retrying in 2 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            if (!dbConnected) {
                const errorMessage = 'Failed to connect to database after multiple attempts';
                logger_1.default.error(errorMessage);
                if (process.env.NODE_ENV === 'development') {
                    logger_1.default.warn('Continuing without database in development mode');
                }
                else {
                    throw new Error(errorMessage);
                }
            }
            // 데이터베이스 헬스 체크
            if (connection_1.AppDataSource.isInitialized) {
                const dbChecker = new database_checker_1.DatabaseChecker(connection_1.AppDataSource);
                const healthCheck = await dbChecker.performHealthCheck();
                if (!healthCheck.healthy) {
                    logger_1.default.error('Database health check failed', healthCheck.details);
                    if (env_validator_1.env.isProduction()) {
                        throw new Error('Database health check failed');
                    }
                }
            }
            // 마이그레이션 실행 (프로덕션 환경, DB 연결된 경우만)
            if (env_validator_1.env.isProduction() && connection_1.AppDataSource.isInitialized) {
                try {
                    await connection_1.AppDataSource.runMigrations();
                }
                catch (migrationError) {
                    logger_1.default.warn('Migration error (non-critical):', migrationError);
                }
            }
            // Initialize monitoring services - skip in development
            if (env_validator_1.env.isProduction()) {
                try {
                    await BackupService_1.backupService.initialize();
                    await ErrorAlertService_1.errorAlertService.initialize();
                }
                catch (serviceError) {
                    logger_1.default.warn('Monitoring services initialization failed (non-critical)');
                }
            }
            // Initialize tracking updater job
            try {
                logger_1.default.info('Tracking updater job started');
            }
            catch (jobError) {
                // Error log removed
            }
            // Initialize upload directories  
            logger_1.default.info('Initializing upload directories...');
            try {
                const { ensureUploadDirectories } = await Promise.resolve().then(() => __importStar(require('./middleware/upload.middleware')));
                ensureUploadDirectories();
                logger_1.default.info('Upload directories initialized successfully');
            }
            catch (uploadError) {
                logger_1.default.error('Failed to initialize upload directories:', uploadError);
                // Don't throw - directories might already exist
            }
            // Initialize email service (graceful, non-blocking)
            logger_1.default.info('Initializing email service...');
            try {
                const { emailService } = await Promise.resolve().then(() => __importStar(require('./services/email.service')));
                await emailService.initialize();
                const status = emailService.getServiceStatus();
                if (status.available) {
                    logger_1.default.info('Email service initialized successfully');
                }
                else if (status.enabled && !status.available) {
                    logger_1.default.warn('Email service enabled but not available (check SMTP config)');
                }
            }
            catch (emailError) {
                logger_1.default.error('Failed to initialize email service:', {
                    error: emailError.message || emailError,
                    hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
                });
                // Don't throw - let the app continue without email
            }
            logger_1.default.info('Email service initialization completed');
        }
    }
    catch (dbError) {
        // Error log removed
        // 프로덕션에서는 종료, 개발에서는 계속 실행
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
    // Redis 초기화 (조건부)
    let webSocketSessionSync = null;
    if (redisEnabled) {
        try {
            logger_1.default.info('Initializing Redis connection...');
            const redisClient = new ioredis_1.default({
                host: env_validator_1.env.getString('REDIS_HOST', 'localhost'),
                port: env_validator_1.env.getNumber('REDIS_PORT', 6379),
                password: env_validator_1.env.getString('REDIS_PASSWORD', undefined),
                lazyConnect: true,
                maxRetriesPerRequest: 3,
                connectTimeout: 5000
            });
            redisClient.on('connect', () => {
                logger_1.default.info('Redis connected successfully');
            });
            redisClient.on('error', (err) => {
                logger_1.default.warn('Redis connection error (non-critical):', err);
            });
            // Initialize SessionSyncService
            sessionSyncService_1.SessionSyncService.initialize(redisClient);
            // Initialize WebSocket session sync if enabled
            if (env_validator_1.env.getString('SESSION_SYNC_ENABLED', 'false') === 'true') {
                webSocketSessionSync = new sessionSync_1.WebSocketSessionSync(io);
                logger_1.default.info('WebSocket session sync initialized');
            }
            logger_1.default.info('Redis initialization completed');
        }
        catch (redisError) {
            logger_1.default.warn('Redis initialization failed (non-critical), continuing without Redis:', redisError);
        }
    }
    else {
        logger_1.default.info('Redis disabled, skipping Redis initialization');
    }
    // Start scheduled jobs
    try {
        // startCrowdfundingSchedules();
        // startInventorySchedules(); // Disabled: unnecessary complex feature per CLAUDE.md
        logger_1.default.info('Scheduled jobs started');
    }
    catch (scheduleError) {
        logger_1.default.warn('Failed to start some scheduled jobs (non-critical):', scheduleError);
    }
    // Sprint 2 - P2: Start AI job worker (BullMQ)
    try {
        await Promise.resolve().then(() => __importStar(require('./workers/ai-job.worker')));
        logger_1.default.info('✅ AI job worker started (BullMQ)');
    }
    catch (workerError) {
        logger_1.default.error('Failed to start AI job worker:', workerError);
        // Non-critical: server can still start without worker
    }
    // Initialize image processing folders
    try {
        const { imageProcessingService } = await Promise.resolve().then(() => __importStar(require('./services/image-processing.service')));
        await imageProcessingService.initializeFolders();
        logger_1.default.info('✅ Image processing folders initialized');
    }
    catch (folderError) {
        logger_1.default.warn('Failed to initialize image processing folders:', folderError);
    }
    // Bind to IPv4 explicitly (0.0.0.0) to avoid IPv6 issues
    const host = env_validator_1.env.getString('HOST', '0.0.0.0');
    httpServer.listen(port, host, () => {
        logger_1.default.info(`🚀 API Server running on ${host}:${port}`);
    });
};
startServer().catch((error) => {
    logger_1.default.error('Failed to start server:', error);
    process.exit(1);
});
// Export services for other modules
var realtimeFeedbackService_1 = require("./services/realtimeFeedbackService");
Object.defineProperty(exports, "RealtimeFeedbackService", { enumerable: true, get: function () { return realtimeFeedbackService_1.RealtimeFeedbackService; } });
// Note: realtimeFeedbackService should be initialized after server starts, not here
//# sourceMappingURL=main.js.map