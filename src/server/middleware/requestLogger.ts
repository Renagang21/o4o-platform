// src/server/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  // 응답이 완료되었을 때 로그 출력
  res.on('finish', () => {
    const duration = Date.now() - start
    const { method, url, ip } = req
    const { statusCode } = res
    
    // 상태 코드에 따른 색상 설정 (콘솔용)
    const getStatusColor = (status: number) => {
      if (status >= 500) return '\x1b[31m' // 빨간색
      if (status >= 400) return '\x1b[33m' // 노란색
      if (status >= 300) return '\x1b[36m' // 청록색
      if (status >= 200) return '\x1b[32m' // 초록색
      return '\x1b[0m' // 기본색
    }
    
    const statusColor = getStatusColor(statusCode)
    const resetColor = '\x1b[0m'
    
    console.log(
      `${new Date().toISOString()} | ` +
      `${method.padEnd(6)} | ` +
      `${statusColor}${statusCode}${resetColor} | ` +
      `${duration.toString().padStart(4)}ms | ` +
      `${ip.padEnd(15)} | ` +
      `${url}`
    )
    
    // 느린 요청 경고 (2초 이상)
    if (duration > 2000) {
      console.warn(`⚠️  느린 요청 감지: ${method} ${url} - ${duration}ms`)
    }
    
    // 에러 상태 코드 상세 로깅
    if (statusCode >= 400) {
      console.error(`❌ 에러 응답: ${method} ${url} - Status: ${statusCode}`)
    }
  })
  
  next()
}

// 이미지 업로드 전용 로거
export const imageUploadLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/upload')) {
    const fileInfo = req.file || req.files
    
    if (fileInfo) {
      if (Array.isArray(fileInfo)) {
        console.log(`📤 다중 이미지 업로드 시작: ${fileInfo.length}개 파일`)
        fileInfo.forEach((file, index) => {
          console.log(`   [${index + 1}] ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        })
      } else {
        console.log(`📤 이미지 업로드 시작: ${fileInfo.originalname} (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB)`)
      }
    }
  }
  
  next()
}
