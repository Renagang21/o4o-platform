// src/services/image/types.ts

export interface ImageSize {
  width: number
  height?: number
  quality: number
  suffix: string
  format?: 'webp' | 'avif' | 'jpg' | 'png'
}

export interface ImageProcessingConfig {
  sizes: Record<string, ImageSize>
  formats: string[]
  quality: {
    thumbnail: number
    mobile: number
    desktop: number
    original: number
  }
  compression: {
    webp: { quality: number; effort: number }
    avif: { quality: number; effort: number }
    jpg: { quality: number; progressive: boolean }
  }
}

export interface ProcessedImage {
  original: string
  variants: Record<string, string>
  metadata: {
    width: number
    height: number
    format: string
    size: number
    aspectRatio: number
  }
}

export interface ImageUploadOptions {
  category?: 'product' | 'thumbnail' | 'detail'
  preserveOriginal?: boolean
  generateWebP?: boolean
}

export interface ImageOptimizationOptions {
  preserveText?: boolean
  maxWidth?: number
  quality?: number
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  aspectRatio: number
}

export type ImageCategory = 'product' | 'thumbnail' | 'detail'
export type ImageFormat = 'webp' | 'avif' | 'jpg' | 'png'
export type ImageQuality = 'low' | 'medium' | 'high' | 'original'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface ImageError {
  code: string
  message: string
  details?: any
}
