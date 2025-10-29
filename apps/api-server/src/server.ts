import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AppDataSource } from './database/connection';
import logger from './utils/logger';

// 환경 변수 검증
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter((varName: any) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('❌ Missing required environment variables:', { missingVars: missingEnvVars });
  process.exit(1);
}

const app: express.Application = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== 미들웨어 설정 ==================== //

// 보안 헤더 설정
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  frameguard: false // Disable X-Frame-Options for iframe preview support
}));

// CORS 설정 (CLAUDE.md 정책 기반)
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
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
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // 쿠키 포함 요청 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Body 파싱 (미디어 업로드 지원을 위해 50MB로 통일)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 쿠키 파싱
app.use(cookieParser() as any);

// 압축
app.use(compression() as any);

// 요청 로깅 (개발 환경)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.http(`${req.method} ${req.path}`, { 
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
    database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
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
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('❌ Server Error:', { 
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
    logger.info('🔗 Initializing database connection...');
    await AppDataSource.initialize();
    logger.info('✅ Database connected successfully');

    // Start scheduled jobs
    const { cleanupLoginAttemptsJob } = await import('./jobs/cleanupLoginAttempts.js');
    cleanupLoginAttemptsJob.start();

    // 서버 시작
    app.listen(PORT, () => {
      logger.info('🚀 API Server Information:', {
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
      logger.info('✨ Server is ready to accept connections');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

// 종료 시 정리
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('✅ Database connection closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('✅ Database connection closed');
  }
  
  process.exit(0);
});

export default app;