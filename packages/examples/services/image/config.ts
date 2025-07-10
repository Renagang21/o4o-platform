// src/services/image/config.ts (업데이트됨)
import { ImageProcessingConfig } from './types'

export const IMAGE_CONFIG: ImageProcessingConfig = {
  sizes: {
    thumbnail: {
      width: 320,
      quality: parseInt(process.env.DEFAULT_WEBP_QUALITY || '75'),
      suffix: '@thumb',
      format: 'webp'
    },
    mobile: {
      width: 640,
      quality: parseInt(process.env.DEFAULT_WEBP_QUALITY || '80'),
      suffix: '@mobile',
      format: 'webp'
    },
    tablet: {
      width: 1024,
      quality: parseInt(process.env.DEFAULT_WEBP_QUALITY || '85'),
      suffix: '@tablet',
      format: 'webp'
    },
    desktop: {
      width: 1920,
      quality: parseInt(process.env.DEFAULT_WEBP_QUALITY || '90'),
      suffix: '@desktop',
      format: 'webp'
    },
    original: {
      width: 0, // 원본 크기 유지
      quality: parseInt(process.env.DEFAULT_JPEG_QUALITY || '95'),
      suffix: '@original',
      format: 'jpg'
    }
  },
  formats: ['webp', 'avif', 'jpg'],
  quality: {
    thumbnail: parseInt(process.env.DEFAULT_WEBP_QUALITY || '75'),
    mobile: parseInt(process.env.DEFAULT_WEBP_QUALITY || '80'),
    desktop: parseInt(process.env.DEFAULT_WEBP_QUALITY || '90'),
    original: parseInt(process.env.DEFAULT_JPEG_QUALITY || '95')
  },
  compression: {
    webp: { 
      quality: parseInt(process.env.DEFAULT_WEBP_QUALITY || '85'), 
      effort: 6 
    },
    avif: { 
      quality: parseInt(process.env.DEFAULT_AVIF_QUALITY || '80'), 
      effort: 9 
    },
    jpg: { 
      quality: parseInt(process.env.DEFAULT_JPEG_QUALITY || '90'), 
      progressive: process.env.ENABLE_PROGRESSIVE_JPEG === 'true' 
    }
  }
}

// 환경별 설정
export const ENVIRONMENT_CONFIG = {
  development: {
    uploadPath: './uploads',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    enableDebugLogs: true,
    enableIntelligentCompression: process.env.ENABLE_INTELLIGENT_COMPRESSION === 'true',
    enableProgressiveJPEG: process.env.ENABLE_PROGRESSIVE_JPEG === 'true',
    enableBlurPlaceholder: process.env.ENABLE_BLUR_PLACEHOLDER === 'true'
  },
  production: {
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    enableDebugLogs: false,
    enableIntelligentCompression: process.env.ENABLE_INTELLIGENT_COMPRESSION === 'true',
    enableProgressiveJPEG: process.env.ENABLE_PROGRESSIVE_JPEG === 'true',
    enableBlurPlaceholder: process.env.ENABLE_BLUR_PLACEHOLDER === 'true'
  }
}

export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development'
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG]
}

// TinyPNG 설정
export const TINYPNG_CONFIG = {
  apiKey: process.env.TINYPNG_API_KEY || '',
  endpoint: process.env.TINYPNG_ENDPOINT || 'https://api.tinify.com/shrink',
  maxFileSize: parseInt(process.env.TINYPNG_MAX_FILE_SIZE || '5242880'), // 5MB
  enabled: !!process.env.TINYPNG_API_KEY
}

// 성능 최적화 설정
export const PERFORMANCE_CONFIG = {
  // 네트워크 상태별 이미지 품질
  networkOptimization: {
    '2g': {
      defaultVariant: 'thumbnail',
      quality: 60
    },
    '3g': {
      defaultVariant: 'mobile',
      quality: 75
    },
    '4g': {
      defaultVariant: 'desktop',
      quality: 90
    },
    'wifi': {
      defaultVariant: 'original',
      quality: 95
    }
  },
  
  // 텍스트 감지 임계값
  textDensityThreshold: parseFloat(process.env.TEXT_DENSITY_THRESHOLD || '0.15'),
  
  // 캐싱 설정
  cache: {
    maxAge: 31536000, // 1년
    staleWhileRevalidate: 86400 // 1일
  },
  
  // 지연 로딩 설정
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1
  },
  
  // 압축 전략별 품질 설정
  compressionStrategies: {
    'text-heavy': {
      quality: 95,
      preserveText: true,
      sharpness: 1.2
    },
    'text-moderate': {
      quality: 88,
      preserveText: true,
      sharpness: 1.0
    },
    'mixed-content': {
      quality: 82,
      preserveText: false,
      sharpness: 0.8
    },
    'photo-graphic': {
      quality: 75,
      preserveText: false,
      sharpness: 0.6
    }
  }
}

// 개발용 디버그 설정
export const DEBUG_CONFIG = {
  logCompressionResults: process.env.NODE_ENV === 'development',
  logPerformanceMetrics: process.env.NODE_ENV === 'development',
  enableDetailedErrorLogging: true,
  saveOriginalForComparison: process.env.NODE_ENV === 'development'
}
