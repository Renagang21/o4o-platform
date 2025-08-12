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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const connection_1 = require("./database/connection");
const logger_1 = __importDefault(require("./utils/logger"));
// 환경 변수 검증
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
    logger_1.default.error('❌ Missing required environment variables:', { missingVars: missingEnvVars });
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
// ==================== 미들웨어 설정 ==================== //
// 보안 헤더 설정
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false
}));
// CORS 설정 (CLAUDE.md 정책 기반)
const corsOptions = {
    origin: function (origin, callback) {
        // 개발 환경에서는 localhost 허용
        if (NODE_ENV === 'development') {
            callback(null, true);
            return;
        }
        // 프로덕션 환경에서는 neture.co.kr 도메인만 허용
        const allowedOrigins = [
            'https://neture.co.kr',
            'https://www.neture.co.kr',
            'https://admin.neture.co.kr',
            'https://partner.neture.co.kr'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true, // 쿠키 포함 요청 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};
app.use((0, cors_1.default)(corsOptions));
// Body 파싱
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 쿠키 파싱
app.use((0, cookie_parser_1.default)());
// 압축
app.use((0, compression_1.default)());
// 요청 로깅 (개발 환경)
if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
        logger_1.default.http(`${req.method} ${req.path}`, {
            timestamp: new Date().toISOString(),
            ip: req.ip
        });
        next();
    });
}
// ==================== 라우트 설정 ==================== //
// API v1 라우터 연결 - disabled, using main.ts instead
// app.use('/api/v1', apiV1Router);
// 루트 엔드포인트
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'O4O Platform API Server',
        version: '1.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        endpoints: {
            api: '/api/v1',
            health: '/health',
            docs: 'https://docs.neture.co.kr/api'
        }
    });
});
// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
    const healthData = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: connection_1.AppDataSource.isInitialized ? 'connected' : 'disconnected',
        environment: NODE_ENV
    };
    res.json(healthData);
});
// 404 핸들러
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});
// 전역 에러 핸들러
app.use((error, req, res, next) => {
    logger_1.default.error('❌ Server Error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    // CORS 에러 처리
    if (error.message === 'Not allowed by CORS policy') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation',
            origin: req.headers.origin
        });
    }
    const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : 500;
    res.status(errorStatus).json({
        success: false,
        message: error.message || 'Internal server error',
        error: NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
    });
});
// ==================== 서버 시작 ==================== //
async function startServer() {
    try {
        // 데이터베이스 연결
        logger_1.default.info('🔗 Initializing database connection...');
        await connection_1.AppDataSource.initialize();
        logger_1.default.info('✅ Database connected successfully');
        // Start scheduled jobs
        const { cleanupLoginAttemptsJob } = await Promise.resolve().then(() => __importStar(require('./jobs/cleanupLoginAttempts')));
        cleanupLoginAttemptsJob.start();
        // 서버 시작
        app.listen(PORT, () => {
            logger_1.default.info('🚀 API Server Information:', {
                environment: NODE_ENV,
                port: PORT,
                database: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
                urls: {
                    base: `http://localhost:${PORT}`,
                    api: `http://localhost:${PORT}/api/v1`,
                    health: `http://localhost:${PORT}/health`
                },
                endpoints: {
                    business: '/api/v1/business/*',
                    admin: '/api/v1/admin/*',
                    partner: '/api/v1/partner/*',
                    internal: '/api/v1/internal/*'
                }
            });
            logger_1.default.info('✨ Server is ready to accept connections');
        });
    }
    catch (error) {
        logger_1.default.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// 서버 시작
startServer();
// 종료 시 정리
process.on('SIGTERM', async () => {
    logger_1.default.info('🛑 SIGTERM received, shutting down gracefully...');
    if (connection_1.AppDataSource.isInitialized) {
        await connection_1.AppDataSource.destroy();
        logger_1.default.info('✅ Database connection closed');
    }
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.default.info('🛑 SIGINT received, shutting down gracefully...');
    if (connection_1.AppDataSource.isInitialized) {
        await connection_1.AppDataSource.destroy();
        logger_1.default.info('✅ Database connection closed');
    }
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=server.js.map