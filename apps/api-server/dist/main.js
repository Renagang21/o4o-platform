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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.RealtimeFeedbackService = void 0;
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
// 환경변수 검증
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = require("connect-redis");
const passport_1 = __importDefault(require("./config/passport"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("./utils/logger"));
// Database connection
const connection_1 = require("./database/connection");
const sessionSyncService_1 = require("./services/sessionSyncService");
const sessionSync_1 = require("./websocket/sessionSync");
const errorHandler_1 = require("./middleware/errorHandler");
const performanceMonitor_1 = require("./middleware/performanceMonitor");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const crowdfundingSchedule_1 = require("./schedules/crowdfundingSchedule");
// Monitoring services
const BackupService_1 = require("./services/BackupService");
const ErrorAlertService_1 = require("./services/ErrorAlertService");
// Email service
const email_service_1 = require("./services/email.service");
// 라우트 imports 
const auth_1 = __importDefault(require("./routes/auth"));
const auth_v2_1 = __importDefault(require("./routes/auth-v2"));
const social_auth_1 = __importDefault(require("./routes/social-auth"));
const user_1 = __importDefault(require("./routes/user"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const ecommerce_1 = __importDefault(require("./routes/ecommerce"));
const cpt_1 = __importDefault(require("./routes/cpt"));
const post_creation_1 = __importDefault(require("./routes/post-creation"));
const services_1 = __importDefault(require("./routes/services"));
const signage_1 = __importDefault(require("./routes/signage"));
const content_1 = __importDefault(require("./routes/content"));
const public_1 = __importDefault(require("./routes/public"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const email_auth_routes_1 = __importDefault(require("./routes/email-auth.routes"));
const crowdfundingRoutes_1 = __importDefault(require("./routes/crowdfundingRoutes"));
const forum_1 = __importDefault(require("./routes/forum"));
const linked_accounts_1 = __importDefault(require("./routes/linked-accounts"));
const account_linking_routes_1 = __importDefault(require("./routes/account-linking.routes"));
const unified_auth_routes_1 = __importDefault(require("./routes/unified-auth.routes"));
const vendor_1 = __importDefault(require("./routes/vendor"));
const forms_1 = __importDefault(require("./routes/forms"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const posts_1 = __importDefault(require("./routes/posts"));
const reusable_blocks_routes_1 = __importDefault(require("./routes/reusable-blocks.routes"));
const block_patterns_routes_1 = __importDefault(require("./routes/block-patterns.routes"));
const template_parts_routes_1 = __importDefault(require("./routes/template-parts.routes"));
const categories_1 = __importDefault(require("./routes/categories"));
const custom_post_types_1 = __importDefault(require("./routes/custom-post-types"));
const menus_1 = __importDefault(require("./routes/menus"));
// Import v1 API routes
const content_routes_1 = __importDefault(require("./routes/v1/content.routes"));
const platform_routes_1 = __importDefault(require("./routes/v1/platform.routes"));
const ecommerce_routes_1 = __importDefault(require("./routes/v1/ecommerce.routes"));
const forum_routes_1 = __importDefault(require("./routes/v1/forum.routes"));
const admin_routes_1 = __importDefault(require("./routes/v1/admin.routes"));
const media_routes_1 = __importDefault(require("./routes/v1/media.routes"));
const theme_routes_1 = __importDefault(require("./routes/v1/theme.routes"));
const apps_routes_1 = __importDefault(require("./routes/v1/apps.routes"));
const coupon_routes_1 = __importDefault(require("./routes/v1/coupon.routes"));
const export_routes_1 = __importDefault(require("./routes/v1/export.routes"));
const shipping_routes_1 = __importDefault(require("./routes/v1/shipping.routes"));
const dropshipping_routes_1 = __importDefault(require("./routes/v1/dropshipping.routes"));
const product_variation_routes_1 = __importDefault(require("./routes/v1/product-variation.routes"));
const toss_payments_routes_1 = __importDefault(require("./routes/v1/toss-payments.routes"));
// 중복 제거 - 이미 상단에서 로드됨
const app = (0, express_1.default)();
// IMPORTANT: Set trust proxy IMMEDIATELY after creating the app
// This must be done before any middleware that uses req.ip
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true);
}
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
                // Production domains
                "https://neture.co.kr",
                "https://www.neture.co.kr",
                "https://admin.neture.co.kr",
                "https://shop.neture.co.kr",
                "https://forum.neture.co.kr",
                "https://signage.neture.co.kr",
                "https://funding.neture.co.kr",
                "https://auth.neture.co.kr"
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
const port = process.env.PORT || 4000;
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
    max: 300, // 최대 300 요청 (public endpoints need more)
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
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // React 개발 서버와의 호환성을 위해
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
const corsOptions = {
    origin: function (origin, callback) {
        // Get allowed origins from environment variable
        const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [];
        const allowedOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3011",
            "http://localhost:3000", // main-site
            "http://localhost:3001", // admin dashboard
            "http://localhost:3002", // ecommerce
            "http://localhost:3003", // crowdfunding
            // Web server IPs
            "http://13.125.144.8:3000", // web server main-site
            "http://13.125.144.8:3001", // web server admin-dashboard
            // Production domains
            "https://neture.co.kr",
            "https://www.neture.co.kr",
            "https://admin.neture.co.kr",
            "https://shop.neture.co.kr",
            "https://forum.neture.co.kr",
            "https://signage.neture.co.kr",
            "https://funding.neture.co.kr",
            "https://auth.neture.co.kr",
            "https://api.neture.co.kr", // API server itself
            // Add environment-defined origins
            ...envOrigins
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
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
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};
// Apply CORS before any other middleware
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests explicitly
app.options('*', (0, cors_1.default)(corsOptions));
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
    secret: process.env.SESSION_SECRET || 'o4o-platform-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.COOKIE_DOMAIN || undefined, // Enable cross-subdomain cookies
        sameSite: 'lax'
    }
};
// Use Redis store in production
if (process.env.NODE_ENV === 'production') {
    const sessionRedisClient = new ioredis_1.default({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    });
    sessionConfig.store = new connect_redis_1.RedisStore({
        client: sessionRedisClient,
        prefix: 'sess:'
    });
}
// Session middleware for passport (required for OAuth)
app.use((0, express_session_1.default)(sessionConfig));
// Initialize passport
app.use(passport_1.default.initialize());
// Static file serving for uploads
const uploadsPath = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express_1.default.static(uploadsPath));
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
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        service: 'api-server'
    });
});
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
app.use('/api/public', publicLimiter);
// API 라우트 - auth routes MUST be before general rate limiter
// IMPORTANT: Basic auth routes must come FIRST before any other auth-related routes
app.use('/api/auth', auth_1.default);
app.use('/api/v1/auth', auth_1.default); // v1 compatibility - this MUST be the first /api/v1/auth route
// Other specialized auth routes come AFTER basic auth
app.use('/api/v1/auth/v2', auth_v2_1.default); // Cookie-based auth routes
app.use('/api/v1/accounts', linked_accounts_1.default); // Linked accounts routes (moved to avoid conflict)
app.use('/api/v1/social', social_auth_1.default); // Social auth routes (moved to avoid conflict)
// Apply standard rate limiting to authenticated endpoints
app.use('/api/', limiter);
// Protected API routes (after rate limiter)
app.use('/api/users', user_1.default);
app.use('/api/v1/users', users_routes_1.default); // New user management routes
app.use('/api/admin', admin_1.default);
app.use('/api/ecommerce', ecommerce_1.default);
app.use('/api/cpt', cpt_1.default);
app.use('/api/post-creation', post_creation_1.default);
app.use('/api/services', services_1.default);
app.use('/api/signage', signage_1.default);
app.use('/api/crowdfunding', crowdfundingRoutes_1.default);
app.use('/api/forum', forum_1.default);
app.use('/api/public', public_1.default); // Public routes (no auth required)
app.use('/api/v1/sessions', sessions_1.default); // Session management routes
// Direct public endpoints for main site
app.get('/api/posts', publicLimiter, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'published';
        const orderBy = req.query.orderBy || 'createdAt';
        const order = req.query.order || 'DESC';
        const offset = (page - 1) * limit;
        // For now, return mock data until we have proper posts entity
        const mockPosts = [
            {
                id: '1',
                title: 'Neture 플랫폼 출시',
                slug: 'neture-platform-launch',
                excerpt: 'O4O 비즈니스를 위한 통합 플랫폼이 출시되었습니다.',
                content: '<p>Neture 플랫폼이 공식 출시되었습니다...</p>',
                status: 'published',
                author: {
                    id: '1',
                    name: 'Admin',
                    avatar: null
                },
                featuredImage: null,
                categories: ['공지사항'],
                tags: ['플랫폼', '출시'],
                publishedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        res.json({
            data: mockPosts,
            pagination: {
                current: page,
                total: 1,
                count: limit,
                totalItems: 1
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts'
        });
    }
});
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/settings', settings_routes_1.default);
// Email settings routes
const email_settings_routes_1 = __importDefault(require("./routes/email-settings.routes"));
const smtp_routes_1 = __importDefault(require("./routes/v1/smtp.routes"));
app.use('/api/v1/settings', email_settings_routes_1.default);
app.use('/api/v1/smtp', smtp_routes_1.default); // SMTP management routes
app.use('/api/auth', email_auth_routes_1.default);
app.use('/api/auth/accounts', account_linking_routes_1.default); // Account linking routes
app.use('/api/auth/unified', unified_auth_routes_1.default); // Unified auth routes
app.use('/api/vendor', vendor_1.default); // Vendor management routes
app.use('/api/forms', forms_1.default); // Form builder routes
app.use('/api/v1/monitoring', monitoring_1.default); // Monitoring routes
app.use('/api/posts', posts_1.default); // Posts routes (WordPress-compatible)
app.use('/api/reusable-blocks', reusable_blocks_routes_1.default); // Reusable blocks routes (WordPress-compatible)
app.use('/api/block-patterns', block_patterns_routes_1.default); // Block patterns routes (WordPress-compatible)
app.use('/api/template-parts', template_parts_routes_1.default); // Template parts routes (WordPress FSE)
app.use('/api/content', content_1.default); // Content routes - moved to specific path to avoid conflicts
// V1 API routes (new standardized endpoints)
app.use('/api/v1/posts', posts_1.default); // Posts routes (WordPress-compatible)
app.use('/api/v1/categories', categories_1.default); // Categories routes (fixed)
app.use('/api/v1/custom-post-types', custom_post_types_1.default); // Custom post types (fixed)
app.use('/api/v1/menus', menus_1.default); // Menus routes
app.use('/api/v1/content', content_routes_1.default);
app.use('/api/v1/platform', platform_routes_1.default);
app.use('/api/v1/ecommerce', ecommerce_routes_1.default);
app.use('/api/v1/forum', forum_routes_1.default);
app.use('/api/v1/media', media_routes_1.default);
app.use('/api/v1/apps', apps_routes_1.default);
app.use('/api/v1/coupons', coupon_routes_1.default);
app.use('/api/v1/themes', theme_routes_1.default);
app.use('/api/v1/export', export_routes_1.default);
app.use('/api/v1/shipping', shipping_routes_1.default);
app.use('/api/v1/dropshipping', dropshipping_routes_1.default);
app.use('/api/v1', product_variation_routes_1.default); // 상품 변형 라우트
app.use('/api/v1', toss_payments_routes_1.default); // 토스페이먼츠 결제 라우트
// Admin routes with correct paths
app.use('/api/admin', admin_routes_1.default);
app.use('/api/admin', admin_1.default); // Add original admin routes for backwards compatibility
app.use('/api/settings', settingsRoutes_1.default);
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
app.use(errorHandler_1.errorHandler);
// 404 핸들러 (API 전용)
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        requestedPath: req.originalUrl
    });
});
// Swagger documentation
const swagger_enhanced_1 = require("./config/swagger-enhanced");
// Setup Swagger API documentation
(0, swagger_enhanced_1.setupSwagger)(app);
// 서버 시작
const startServer = async () => {
    try {
        // 데이터베이스 초기화 전 상태 확인
        if (connection_1.AppDataSource.isInitialized) {
        }
        else {
            // 환경변수 재확인
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                username: process.env.DB_USERNAME || 'postgres',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'o4o_platform'
            };
            //   ...dbConfig,
            //   password: dbConfig.password ? '***' : 'NOT SET'
            // });
            // 데이터베이스 초기화
            await connection_1.AppDataSource.initialize();
            // 마이그레이션 실행 (프로덕션 환경)
            if (process.env.NODE_ENV === 'production') {
                try {
                    await connection_1.AppDataSource.runMigrations();
                }
                catch (migrationError) {
                }
            }
            // Initialize monitoring services
            try {
                await BackupService_1.backupService.initialize();
                await ErrorAlertService_1.errorAlertService.initialize();
            }
            catch (serviceError) {
                console.error('⚠️  Failed to initialize monitoring services:', serviceError);
            }
            // Initialize tracking updater job
            try {
                const { trackingUpdaterJob } = await Promise.resolve().then(() => __importStar(require('./jobs/trackingUpdater')));
                trackingUpdaterJob.start();
                logger_1.default.info('Tracking updater job started');
            }
            catch (jobError) {
                console.error('⚠️  Failed to start tracking updater job:', jobError);
            }
            // Initialize email service (graceful, non-blocking)
            try {
                await email_service_1.emailService.initialize();
                const status = email_service_1.emailService.getServiceStatus();
                if (status.available) {
                    logger_1.default.info('Email service initialized successfully');
                }
                else if (status.enabled && !status.available) {
                    logger_1.default.warn('Email service enabled but not available (check SMTP config)');
                }
                else {
                    logger_1.default.info('Email service disabled');
                }
            }
            catch (emailError) {
                logger_1.default.error('Failed to initialize email service:', {
                    error: emailError.message || emailError,
                    hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
                });
                // Don't throw - let the app continue without email
            }
        }
    }
    catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        // 프로덕션에서는 종료, 개발에서는 계속 실행
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
    // Redis 초기화
    let webSocketSessionSync = null;
    try {
        const redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        });
        redisClient.on('connect', () => {
        });
        redisClient.on('error', (err) => {
        });
        // Initialize SessionSyncService
        sessionSyncService_1.SessionSyncService.initialize(redisClient);
        // Initialize WebSocket session sync if enabled
        if (process.env.SESSION_SYNC_ENABLED === 'true') {
            webSocketSessionSync = new sessionSync_1.WebSocketSessionSync(io);
        }
        // Start crowdfunding schedules
        (0, crowdfundingSchedule_1.startCrowdfundingSchedules)();
    }
    catch (redisError) {
    }
    httpServer.listen(port, () => {
    });
};
startServer().catch(console.error);
// Export services for other modules
var realtimeFeedbackService_1 = require("./services/realtimeFeedbackService");
Object.defineProperty(exports, "RealtimeFeedbackService", { enumerable: true, get: function () { return realtimeFeedbackService_1.RealtimeFeedbackService; } });
// Note: realtimeFeedbackService should be initialized after server starts, not here
//# sourceMappingURL=main.js.map