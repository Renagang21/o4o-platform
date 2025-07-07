// src/server/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import { imageRoutes } from './routes/imageRoutes'
import { partnerRoutes } from '../partner/routes/partnerRoutes'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { initializeDatabase, closeDatabase } from '../partner/database/connection'

const app = express()
const PORT = process.env.PORT || 3001

// Partner 데이터베이스 초기화
initializeDatabase().catch(console.error);

// 미들웨어 설정
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(compression())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 요청 로깅
app.use(requestLogger)

// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  maxAge: '1y', // 1년 캐시
  etag: true,
  lastModified: true
}))

// Partner 프론트엔드 정적 파일 서빙
app.use('/partner', express.static(path.join(__dirname, '../partner/frontend'), {
  maxAge: '1d',
  etag: true
}))

// API 라우트
app.use('/api/images', imageRoutes)
app.use('/api/partner', partnerRoutes)

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    features: ['image-optimization', 'partner-marketing']
  })
})

// Partner 시스템 메인 페이지
app.get('/partner', (req, res) => {
  res.sendFile(path.join(__dirname, '../partner/frontend/index.html'))
})

// Partner 대시보드 페이지
app.get('/partner/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../partner/frontend/dashboard.html'))
})

// Partner 신청 페이지
app.get('/partner/apply', (req, res) => {
  res.sendFile(path.join(__dirname, '../partner/frontend/apply.html'))
})

// 관리자 페이지
app.get('/admin/partner', (req, res) => {
  res.sendFile(path.join(__dirname, '../partner/frontend/admin.html'))
})

// 에러 핸들링
app.use(errorHandler)

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '요청한 리소스를 찾을 수 없습니다.'
  })
})

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 o4o 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다.`)
  console.log(`📁 업로드 디렉토리: ${path.join(__dirname, '../../uploads')}`)
  console.log(`🤝 Partner 시스템: http://localhost:${PORT}/partner`)
  console.log(`👨‍💼 관리자 페이지: http://localhost:${PORT}/admin/partner`)
  console.log(`🌍 프론트엔드 URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM 시그널을 받았습니다. 서버를 종료합니다...')
  await closeDatabase()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT 시그널을 받았습니다. 서버를 종료합니다...')
  await closeDatabase()
  process.exit(0)
})
