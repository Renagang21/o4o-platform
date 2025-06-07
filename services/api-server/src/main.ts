import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Database connection
import { initializeDatabase } from './database/connection';

// 라우트 imports
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import servicesRoutes from './routes/services';

// 환경변수 로드
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const port = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 로그인 전용 Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 로그인 시도
  message: {
    error: 'Too many login attempts',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  }
});

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false, // React 개발 서버와의 호환성을 위해
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting 적용
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', servicesRoutes);

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
      admin: '/api/admin',
      services: '/api/services'
    },
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173'
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
  await initializeDatabase();
  
  httpServer.listen(port, () => {
    console.log(`🚀 Neture API Server running on port ${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${port}/api`);
    console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
};

startServer().catch(console.error);
