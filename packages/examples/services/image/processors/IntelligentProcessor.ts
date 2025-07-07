// src/services/image/processors/IntelligentProcessor.ts
import sharp from 'sharp'
import { ImageProcessingConfig, ImageOptimizationOptions, ImageMetadata } from '../types'

export interface TextDetectionResult {
  hasText: boolean
  textDensity: number
  textRegions: Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }>
  recommendedQuality: number
}

export interface CompressionStrategy {
  name: string
  quality: number
  preserveText: boolean
  sharpness: number
  description: string
}

export class IntelligentProcessor {
  private config: ImageProcessingConfig

  constructor(config: ImageProcessingConfig) {
    this.config = config
  }

  /**
   * 이미지 콘텐츠를 분석하여 최적의 압축 전략 결정
   */
  async analyzeImageContent(buffer: Buffer): Promise<TextDetectionResult> {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata')
    }

    // 1. 이미지를 그레이스케일로 변환하여 텍스트 감지 준비
    const grayBuffer = await image
      .resize(Math.min(metadata.width, 800), null, { withoutEnlargement: true })
      .grayscale()
      .toBuffer()

    // 2. 엣지 검출을 통한 텍스트 영역 식별
    const edgeBuffer = await sharp(grayBuffer)
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // 라플라시안 필터
      })
      .toBuffer()

    // 3. 텍스트 밀도 계산
    const textDensity = await this.calculateTextDensity(edgeBuffer)
    
    // 4. 텍스트 영역 감지
    const textRegions = await this.detectTextRegions(edgeBuffer)
    
    // 5. 권장 품질 계산
    const recommendedQuality = this.calculateRecommendedQuality(textDensity, textRegions)

    return {
      hasText: textDensity > 0.15, // 15% 이상이면 텍스트 이미지로 판정
      textDensity,
      textRegions,
      recommendedQuality
    }
  }

  /**
   * 텍스트 밀도 계산 (간단한 엣지 기반 방법)
   */
  private async calculateTextDensity(edgeBuffer: Buffer): Promise<number> {
    const image = sharp(edgeBuffer)
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
    
    let edgePixels = 0
    const totalPixels = info.width * info.height
    const threshold = 30 // 엣지 감지 임계값
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] > threshold) {
        edgePixels++
      }
    }
    
    return edgePixels / totalPixels
  }

  /**
   * 텍스트 영역 감지 (간단한 연결 컴포넌트 분석)
   */
  private async detectTextRegions(edgeBuffer: Buffer): Promise<Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }>> {
    // 실제 구현에서는 더 정교한 OCR 라이브러리 사용 권장 (Tesseract.js 등)
    // 여기서는 간단한 휴리스틱 방법 사용
    
    const image = sharp(edgeBuffer)
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
    
    const regions: Array<{
      x: number
      y: number
      width: number
      height: number
      confidence: number
    }> = []

    // 블록 단위로 텍스트 영역 추정
    const blockSize = 50
    for (let y = 0; y < info.height - blockSize; y += blockSize) {
      for (let x = 0; x < info.width - blockSize; x += blockSize) {
        const density = this.calculateBlockDensity(data, info.width, x, y, blockSize)
        
        if (density > 0.2) { // 20% 이상의 엣지 밀도
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: Math.min(density * 2, 1) // 신뢰도 계산
          })
        }
      }
    }
    
    // 인접한 영역들을 병합
    return this.mergeAdjacentRegions(regions)
  }

  /**
   * 블록 내 엣지 밀도 계산
   */
  private calculateBlockDensity(
    data: Buffer, 
    width: number, 
    startX: number, 
    startY: number, 
    blockSize: number
  ): number {
    let edgePixels = 0
    let totalPixels = 0
    const threshold = 30
    
    for (let y = startY; y < startY + blockSize; y++) {
      for (let x = startX; x < startX + blockSize; x++) {
        const index = y * width + x
        if (index < data.length) {
          totalPixels++
          if (data[index] > threshold) {
            edgePixels++
          }
        }
      }
    }
    
    return totalPixels > 0 ? edgePixels / totalPixels : 0
  }

  /**
   * 인접한 텍스트 영역 병합
   */
  private mergeAdjacentRegions(regions: Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }>): Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }> {
    // 간단한 병합 로직 (실제로는 더 정교한 알고리즘 필요)
    const merged = [...regions]
    const mergeThreshold = 60 // 픽셀 단위 거리
    
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const region1 = merged[i]
        const region2 = merged[j]
        
        const distance = Math.sqrt(
          Math.pow(region1.x - region2.x, 2) + 
          Math.pow(region1.y - region2.y, 2)
        )
        
        if (distance < mergeThreshold) {
          // 두 영역을 병합
          const minX = Math.min(region1.x, region2.x)
          const minY = Math.min(region1.y, region2.y)
          const maxX = Math.max(region1.x + region1.width, region2.x + region2.width)
          const maxY = Math.max(region1.y + region1.height, region2.y + region2.height)
          
          merged[i] = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            confidence: Math.max(region1.confidence, region2.confidence)
          }
          
          merged.splice(j, 1)
          j-- // 인덱스 조정
        }
      }
    }
    
    return merged
  }

  /**
   * 텍스트 분석 결과를 바탕으로 권장 품질 계산
   */
  private calculateRecommendedQuality(
    textDensity: number, 
    textRegions: Array<any>
  ): number {
    // 텍스트 밀도가 높을수록 높은 품질 권장
    if (textDensity > 0.4) {
      return 95 // 매우 높은 텍스트 밀도: 최고 품질
    } else if (textDensity > 0.25) {
      return 88 // 높은 텍스트 밀도: 높은 품질
    } else if (textDensity > 0.15) {
      return 82 // 중간 텍스트 밀도: 중간 품질
    } else {
      return 75 // 낮은 텍스트 밀도: 일반 품질
    }
  }

  /**
   * 압축 전략 결정
   */
  async determineCompressionStrategy(buffer: Buffer): Promise<CompressionStrategy> {
    const analysis = await this.analyzeImageContent(buffer)
    
    if (analysis.textDensity > 0.4) {
      return {
        name: 'text-heavy',
        quality: 95,
        preserveText: true,
        sharpness: 1.2,
        description: '텍스트 중심 이미지 - 최고 품질 유지'
      }
    } else if (analysis.textDensity > 0.25) {
      return {
        name: 'text-moderate',
        quality: 88,
        preserveText: true,
        sharpness: 1.0,
        description: '텍스트 포함 이미지 - 높은 품질'
      }
    } else if (analysis.textDensity > 0.15) {
      return {
        name: 'mixed-content',
        quality: 82,
        preserveText: false,
        sharpness: 0.8,
        description: '혼합 콘텐츠 - 균형잡힌 압축'
      }
    } else {
      return {
        name: 'photo-graphic',
        quality: 75,
        preserveText: false,
        sharpness: 0.6,
        description: '사진 이미지 - 적극적 압축'
      }
    }
  }

  /**
   * 지능형 이미지 최적화
   */
  async intelligentOptimize(
    buffer: Buffer,
    targetWidth?: number,
    options: ImageOptimizationOptions = {}
  ): Promise<{ buffer: Buffer; strategy: CompressionStrategy; analysis: TextDetectionResult }> {
    // 1. 이미지 분석
    const analysis = await this.analyzeImageContent(buffer)
    
    // 2. 압축 전략 결정
    const strategy = await this.determineCompressionStrategy(buffer)
    
    // 3. 최적화 적용
    let pipeline = sharp(buffer)
    
    // 리사이징 (필요한 경우)
    if (targetWidth && targetWidth > 0) {
      pipeline = pipeline.resize(targetWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
    }
    
    // 텍스트 보존을 위한 선명도 조정
    if (strategy.preserveText) {
      pipeline = pipeline.sharpen({
        sigma: strategy.sharpness,
        m1: 1.0,
        m2: 2.0,
        x1: 3.0,
        y2: 15.0,
        y3: 15.0
      })
    }
    
    // 포맷별 최적화
    const optimizedBuffer = await pipeline
      .webp({
        quality: strategy.quality,
        nearLossless: strategy.preserveText,
        effort: strategy.preserveText ? 6 : 4
      })
      .toBuffer()
    
    return {
      buffer: optimizedBuffer,
      strategy,
      analysis
    }
  }

  /**
   * 배치 처리용 지능형 최적화
   */
  async batchIntelligentOptimize(
    images: Array<{ buffer: Buffer; filename: string }>,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<Array<{
    filename: string
    results: Array<{
      size: number
      buffer: Buffer
      strategy: CompressionStrategy
      analysis: TextDetectionResult
    }>
  }>> {
    const results = []
    
    for (const image of images) {
      const imageResults = []
      
      for (const size of sizes) {
        const result = await this.intelligentOptimize(image.buffer, size)
        imageResults.push({
          size,
          ...result
        })
      }
      
      results.push({
        filename: image.filename,
        results: imageResults
      })
    }
    
    return results
  }
}
