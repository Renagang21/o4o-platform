// src/utils/imageUtils.ts

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 이미지 파일인지 확인
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * 지원되는 이미지 형식인지 확인
 */
export function isSupportedImageFormat(file: File): boolean {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/avif'
  ]
  return supportedFormats.includes(file.type)
}

/**
 * 이미지 해상도 계산
 */
export function calculateImageDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight?: number
): { width: number; height: number } {
  if (targetHeight) {
    // 고정 크기
    return { width: targetWidth, height: targetHeight }
  }
  
  // 비율 유지
  const aspectRatio = originalHeight / originalWidth
  return {
    width: targetWidth,
    height: Math.round(targetWidth * aspectRatio)
  }
}

/**
 * 이미지 압축률 계산
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}

/**
 * 디바이스 픽셀 비율 고려한 최적 해상도 계산
 */
export function getOptimalResolution(baseWidth: number): number {
  const dpr = window.devicePixelRatio || 1
  return Math.round(baseWidth * Math.min(dpr, 2)) // 최대 2배까지만
}

/**
 * 이미지 로딩 성능 측정
 */
export class ImagePerformanceTracker {
  private startTime: number
  private endTime?: number
  
  constructor() {
    this.startTime = performance.now()
  }
  
  complete(): number {
    this.endTime = performance.now()
    return this.endTime - this.startTime
  }
  
  getLoadTime(): number | null {
    return this.endTime ? this.endTime - this.startTime : null
  }
}

/**
 * 이미지 지연 로딩을 위한 Intersection Observer 설정
 */
export function createLazyLoadObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  }
  
  return new IntersectionObserver(callback, { ...defaultOptions, ...options })
}

/**
 * 이미지 미리 로딩
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 다중 이미지 미리 로딩
 */
export async function preloadImages(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(preloadImage))
}

/**
 * 이미지 URL에서 확장자 추출
 */
export function getImageExtension(url: string): string {
  const path = url.split('?')[0] // 쿼리 파라미터 제거
  const extension = path.split('.').pop()?.toLowerCase()
  return extension || ''
}

/**
 * WebP 지원 여부 확인
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * AVIF 지원 여부 확인
 */
export function supportsAVIF(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
}

/**
 * 최적의 이미지 형식 결정
 */
export function getBestImageFormat(): 'avif' | 'webp' | 'jpeg' {
  if (supportsAVIF()) return 'avif'
  if (supportsWebP()) return 'webp'
  return 'jpeg'
}

/**
 * 색상 추출 (간단한 평균 색상)
 */
export function extractDominantColor(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): string {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let r = 0, g = 0, b = 0
  const pixelCount = data.length / 4
  
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  
  r = Math.floor(r / pixelCount)
  g = Math.floor(g / pixelCount)
  b = Math.floor(b / pixelCount)
  
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 이미지 blur 효과를 위한 base64 생성
 */
export function generateBlurDataURL(
  width: number = 8,
  height: number = 8,
  color: string = '#f0f0f0'
): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = width
  canvas.height = height
  
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}
