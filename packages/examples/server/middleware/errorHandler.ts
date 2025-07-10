// src/server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'

export interface CustomError extends Error {
  status?: number
  code?: string
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Multer 에러 처리
  if (error.message === 'File too large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: '파일 크기가 너무 큽니다.',
      code: 'FILE_TOO_LARGE'
    })
  }

  if (error.message.includes('지원하지 않는 파일 형식')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message,
      code: 'UNSUPPORTED_FILE_TYPE'
    })
  }

  // Sharp 에러 처리
  if (error.message.includes('Input file is missing') || 
      error.message.includes('Input buffer contains unsupported image format')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: '유효하지 않은 이미지 파일입니다.',
      code: 'INVALID_IMAGE'
    })
  }

  // 파일 시스템 에러 처리
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      error: 'Not Found',
      message: '파일을 찾을 수 없습니다.',
      code: 'FILE_NOT_FOUND'
    })
  }

  if (error.code === 'ENOSPC') {
    return res.status(507).json({
      error: 'Insufficient Storage',
      message: '저장 공간이 부족합니다.',
      code: 'INSUFFICIENT_STORAGE'
    })
  }

  // 기본 에러 처리
  const status = error.status || 500
  const message = status === 500 ? '서버 내부 오류가 발생했습니다.' : error.message

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : 'Error',
    message,
    code: error.code || 'UNKNOWN_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
}
