// src/utils/blurUtils.ts
import { ProcessedImage } from '../services/image/types'

/**
 * 이미지의 dominant color를 추출하여 blur placeholder 생성
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
  
  // 그라디언트 효과로 더 자연스러운 placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, adjustBrightness(color, -10))
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * 색상 밝기 조절 함수
 */
function adjustBrightness(color: string, amount: number): string {
  const usePound = color[0] === '#'
  const col = usePound ? color.slice(1) : color
  
  const num = parseInt(col, 16)
  const r = (num >> 16) + amount
  const g = (num >> 8 & 0x00FF) + amount
  const b = (num & 0x0000FF) + amount
  
  return (usePound ? '#' : '') + (
    0x1000000 + 
    (r < 255 ? r < 1 ? 0 : r : 255) * 0x10000 +
    (g < 255 ? g < 1 ? 0 : g : 255) * 0x100 +
    (b < 255 ? b < 1 ? 0 : b : 255)
  ).toString(16).slice(1)
}

/**
 * 이미지에서 dominant color 추출
 */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let r = 0, g = 0, b = 0
      const pixelCount = data.length / 4
      
      // 픽셀 샘플링으로 성능 최적화 (매 4번째 픽셀만 분석)
      for (let i = 0; i < data.length; i += 16) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }
      
      const sampledPixels = pixelCount / 4
      r = Math.floor(r / sampledPixels)
      g = Math.floor(g / sampledPixels)
      b = Math.floor(b / sampledPixels)
      
      resolve(`rgb(${r}, ${g}, ${b})`)
    }
    
    img.onerror = () => resolve('#f0f0f0') // 기본 색상
    img.src = imageUrl
  })
}

/**
 * 서버에서 blur hash 생성 (BlurHash 라이브러리 대안)
 */
export function createSimpleBlurHash(
  width: number,
  height: number,
  colors: string[]
): string {
  // 간단한 blur hash 구현 (실제로는 BlurHash 라이브러리 사용 권장)
  const colorData = colors.slice(0, 9).join(',')
  return `blur:${width}x${height}:${btoa(colorData)}`
}

/**
 * blur hash를 이미지 URL로 변환
 */
export function blurHashToDataURL(blurHash: string): string {
  try {
    const [_, dimensions, encodedColors] = blurHash.split(':')
    const [width, height] = dimensions.split('x').map(Number)
    const colors = atob(encodedColors).split(',')
    
    return generateBlurDataURL(width, height, colors[0] || '#f0f0f0')
  } catch (error) {
    return generateBlurDataURL(8, 8, '#f0f0f0')
  }
}

/**
 * 이미지 로딩 시 blur effect 관리
 */
export class BlurManager {
  private static instance: BlurManager
  private blurCache = new Map<string, string>()

  static getInstance(): BlurManager {
    if (!BlurManager.instance) {
      BlurManager.instance = new BlurManager()
    }
    return BlurManager.instance
  }

  async getBlurPlaceholder(imageUrl: string): Promise<string> {
    // 캐시에서 확인
    if (this.blurCache.has(imageUrl)) {
      return this.blurCache.get(imageUrl)!
    }

    try {
      // dominant color 추출하여 blur placeholder 생성
      const dominantColor = await extractDominantColor(imageUrl)
      const blurDataURL = generateBlurDataURL(16, 16, dominantColor)
      
      // 캐시에 저장
      this.blurCache.set(imageUrl, blurDataURL)
      return blurDataURL
    } catch (error) {
      // 실패 시 기본 blur placeholder
      const defaultBlur = generateBlurDataURL(16, 16, '#e5e7eb')
      this.blurCache.set(imageUrl, defaultBlur)
      return defaultBlur
    }
  }

  clearCache(): void {
    this.blurCache.clear()
  }

  getCacheSize(): number {
    return this.blurCache.size
  }
}
