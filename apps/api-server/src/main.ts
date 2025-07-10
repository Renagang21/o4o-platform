import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Database connection
import { AppDataSource } from './database/connection';

// 라우트 imports 
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import ecommerceRoutes from './routes/ecommerce';
import cptRoutes from './routes/cpt';
import postCreationRoutes from './routes/post-creation';
import servicesRoutes from './routes/services';
import contentRoutes from './routes/content';

// 환경변수 로드
dotenv.config();
console.log('✅ Environment variables loaded');
console.log('📍 Current directory:', process.cwd());
console.log('🌐 PORT from env:', process.env.PORT);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3011",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const port = process.env.PORT || 4000;
console.log('🚀 Starting server on port:', port);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});


// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false, // React 개발 서버와의 호환성을 위해
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3011",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
const uploadsPath = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(uploadsPath));

// Rate limiting 적용
app.use('/api/', limiter);

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/cpt', cptRoutes);
app.use('/api/post-creation', postCreationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api', contentRoutes);

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    service: 'api-server'
  });
});

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
      content: {
        pages: '/api/admin/pages',
        media: '/api/admin/media',
        templates: '/api/admin/templates',
        customFields: '/api/admin/custom-field-groups'
      }
    },
    frontend: process.env.FRONTEND_URL || 'http://localhost:3011'
  });
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_admin', () => {
    socket.join('admin_notifications');
    console.log('Admin joined notifications room');
  });

  socket.on('new_user_registered', (data) => {
    io.to('admin_notifications').emit('new_registration', {
      message: '새로운 사용자가 등록되었습니다.',
      user: data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 에러 핸들러
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// 404 핸들러 (API 전용)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    requestedPath: req.originalUrl
  });
});

// 서버 시작
const startServer = async () => {
  // 데이터베이스 초기화
  await AppDataSource.initialize();
  console.log('✅ Database connection established');
  
  httpServer.listen(port, () => {
    console.log(`🚀 Neture API Server running on port ${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${port}/api`);
    console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3011'}`);
    console.log('💾 Database: o4o_platform connected successfully');
  });
};

startServer().catch(console.error);

// Export services for other modules
export { RealtimeFeedbackService } from './services/realtimeFeedbackService';
export const realtimeFeedbackService = new (require('./services/realtimeFeedbackService').RealtimeFeedbackService)();
