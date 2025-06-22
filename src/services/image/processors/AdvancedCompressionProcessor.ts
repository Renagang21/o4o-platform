// src/services/image/processors/AdvancedCompressionProcessor.ts
import sharp from 'sharp'
import axios from 'axios'
import { ImageProcessingConfig } from '../types'

export interface TinyPNGConfig {
  apiKey: string
  endpoint: string
  maxFileSize: number // bytes
}

export interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  format: string
  processingTime: number
  method: 'sharp' | 'tinypng' | 'squoosh'
}

export interface ProgressiveOptions {
  quality: number
  progressive: boolean
  optimizeScans: boolean
  quantizationTable?: number
}

export class AdvancedCompressionProcessor {
  private config: ImageProcessingConfig
  private tinyPNGConfig?: TinyPNGConfig

  constructor(config: ImageProcessingConfig, tinyPNGConfig?: TinyPNGConfig) {
    this.config = config
    this.tinyPNGConfig = tinyPNGConfig
  }

  /**
   * Progressive JPEG 최적화
   */
  async createProgressiveJPEG(
    buffer: Buffer,
    options: ProgressiveOptions = {
      quality: 90,
      progressive: true,
      optimizeScans: true,
      quantizationTable: 3
    }
  ): Promise<{ buffer: Buffer; result: CompressionResult }> {
    const startTime = performance.now()
    const originalSize = buffer.length

    let pipeline = sharp(buffer)

    // Progressive JPEG 설정
    const jpegOptions: sharp.JpegOptions = {
      quality: options.quality,
      progressive: options.progressive,
      mozjpeg: true, // mozjpeg 엔코더 사용 (더 나은 압축)
    }

    // 스캔 최적화 (mozjpeg 전용)
    if (options.optimizeScans) {
      jpegOptions.optimizeScans = true
    }

    // 양자화 테이블 설정
    if (options.quantizationTable) {
      jpegOptions.quantisationTable = options.quantizationTable
    }

    const compressedBuffer = await pipeline.jpeg(jpegOptions).toBuffer()
    const processingTime = performance.now() - startTime

    const result: CompressionResult = {
      originalSize,
      compressedSize: compressedBuffer.length,
      compressionRatio: ((originalSize - compressedBuffer.length) / originalSize) * 100,
      format: 'jpeg',
      processingTime,
      method: 'sharp'
    }

    return { buffer: compressedBuffer, result }
  }

  /**
   * TinyPNG API를 이용한 고급 압축
   */
  async compressWithTinyPNG(buffer: Buffer): Promise<{ buffer: Buffer; result: CompressionResult }> {
    if (!this.tinyPNGConfig) {
      throw new Error('TinyPNG configuration not provided')
    }

    const startTime = performance.now()
    const originalSize = buffer.length

    try {
      // 파일 크기 체크
      if (originalSize > this.tinyPNGConfig.maxFileSize) {
        throw new Error(`File size ${originalSize} exceeds TinyPNG limit ${this.tinyPNGConfig.maxFileSize}`)
      }

      // TinyPNG API 호출
      const response = await axios.post(
        this.tinyPNGConfig.endpoint,
        buffer,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${this.tinyPNGConfig.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/octet-stream'
          },
          maxContentLength: this.tinyPNGConfig.maxFileSize,
          timeout: 30000 // 30초 타임아웃
        }
      )

      // 압축된 이미지 다운로드
      const compressedResponse = await axios.get(response.data.output.url, {
        responseType: 'arraybuffer',
        timeout: 30000
      })

      const compressedBuffer = Buffer.from(compressedResponse.data)
      const processingTime = performance.now() - startTime

      const result: CompressionResult = {
        originalSize,
        compressedSize: compressedBuffer.length,
        compressionRatio: ((originalSize - compressedBuffer.length) / originalSize) * 100,
        format: 'png', // TinyPNG는 주로 PNG 최적화
        processingTime,
        method: 'tinypng'
      }

      return { buffer: compressedBuffer, result }

    } catch (error) {
      console.error('TinyPNG compression failed:', error)
      // 실패 시 Sharp로 폴백
      return this.createProgressiveJPEG(buffer, { quality: 85, progressive: true, optimizeScans: true })
    }
  }

  /**
   * 다중 압축 방법 비교 및 최적 선택
   */
  async findOptimalCompression(
    buffer: Buffer,
    targetSizeReduction: number = 0.5 // 50% 크기 감소 목표
  ): Promise<{
    best: { buffer: Buffer; result: CompressionResult }
    alternatives: Array<{ buffer: Buffer; result: CompressionResult }>
  }> {
    const methods: Array<() => Promise<{ buffer: Buffer; result: CompressionResult }>> = []

    // 1. Progressive JPEG (높은 품질)
    methods.push(() => this.createProgressiveJPEG(buffer, {
      quality: 92,
      progressive: true,
      optimizeScans: true
    }))

    // 2. Progressive JPEG (균형)
    methods.push(() => this.createProgressiveJPEG(buffer, {
      quality: 82,
      progressive: true,
      optimizeScans: true
    }))

    // 3. Progressive JPEG (낮은 품질)
    methods.push(() => this.createProgressiveJPEG(buffer, {
      quality: 72,
      progressive: true,
      optimizeScans: true
    }))

    // 4. WebP 압축
    methods.push(() => this.createWebP(buffer, { quality: 85, effort: 6 }))

    // 5. TinyPNG (설정된 경우)
    if (this.tinyPNGConfig) {
      methods.push(() => this.compressWithTinyPNG(buffer))
    }

    // 모든 방법 실행
    const results = await Promise.allSettled(methods.map(method => method()))
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{ buffer: Buffer; result: CompressionResult }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)

    if (successfulResults.length === 0) {
      throw new Error('All compression methods failed')
    }

    // 목표 크기 감소율에 가장 가까운 결과 찾기
    const targetCompressionRatio = targetSizeReduction * 100
    let bestResult = successfulResults[0]
    let bestScore = Math.abs(bestResult.result.compressionRatio - targetCompressionRatio)

    for (const result of successfulResults) {
      const score = Math.abs(result.result.compressionRatio - targetCompressionRatio)
      
      // 압축률이 목표에 가깝고, 처리 시간이 합리적인 것 선택
      if (score < bestScore || (score === bestScore && result.result.processingTime < bestResult.result.processingTime)) {
        bestResult = result
        bestScore = score
      }
    }

    return {
      best: bestResult,
      alternatives: successfulResults.filter(result => result !== bestResult)
    }
  }

  /**
   * WebP 고급 압축
   */
  private async createWebP(
    buffer: Buffer,
    options: { quality: number; effort: number }
  ): Promise<{ buffer: Buffer; result: CompressionResult }> {
    const startTime = performance.now()
    const originalSize = buffer.length

    const compressedBuffer = await sharp(buffer)
      .webp({
        quality: options.quality,
        effort: options.effort,
        nearLossless: false,
        smartSubsample: true
      })
      .toBuffer()

    const processingTime = performance.now() - startTime

    const result: CompressionResult = {
      originalSize,
      compressedSize: compressedBuffer.length,
      compressionRatio: ((originalSize - compressedBuffer.length) / originalSize) * 100,
      format: 'webp',
      processingTime,
      method: 'sharp'
    }

    return { buffer: compressedBuffer, result }
  }

  /**
   * 스마트 압축 (이미지 내용에 따라 최적 방법 선택)
   */
  async smartCompress(
    buffer: Buffer,
    options: {
      maxSize?: number // 최대 파일 크기 (bytes)
      targetQuality?: number // 목표 품질 (0-100)
      allowLossy?: boolean // 손실 압축 허용 여부
    } = {}
  ): Promise<{ buffer: Buffer; result: CompressionResult }> {
    const { maxSize, targetQuality = 85, allowLossy = true } = options

    // 이미지 메타데이터 분석
    const metadata = await sharp(buffer).metadata()
    const isTransparent = metadata.hasAlpha || metadata.channels === 4

    let bestResult: { buffer: Buffer; result: CompressionResult }

    if (isTransparent && !allowLossy) {
      // 투명도가 있고 무손실 압축만 허용하는 경우
      bestResult = await this.createLosslessPNG(buffer)
    } else {
      // 일반적인 경우: 최적 압축 방법 찾기
      const optimal = await this.findOptimalCompression(buffer, 0.4) // 40% 압축 목표
      bestResult = optimal.best
    }

    // 최대 크기 제한 확인
    if (maxSize && bestResult.buffer.length > maxSize) {
      // 더 강한 압축 시도
      let quality = targetQuality - 10
      while (quality > 30 && bestResult.buffer.length > maxSize) {
        const compressed = await this.createProgressiveJPEG(buffer, {
          quality,
          progressive: true,
          optimizeScans: true
        })
        
        if (compressed.buffer.length <= maxSize) {
          bestResult = compressed
          break
        }
        
        quality -= 10
      }
    }

    return bestResult
  }

  /**
   * 무손실 PNG 압축
   */
  private async createLosslessPNG(buffer: Buffer): Promise<{ buffer: Buffer; result: CompressionResult }> {
    const startTime = performance.now()
    const originalSize = buffer.length

    const compressedBuffer = await sharp(buffer)
      .png({
        compressionLevel: 9,
        progressive: true,
        palette: true // 팔레트 최적화
      })
      .toBuffer()

    const processingTime = performance.now() - startTime

    const result: CompressionResult = {
      originalSize,
      compressedSize: compressedBuffer.length,
      compressionRatio: ((originalSize - compressedBuffer.length) / originalSize) * 100,
      format: 'png',
      processingTime,
      method: 'sharp'
    }

    return { buffer: compressedBuffer, result }
  }

  /**
   * 압축 결과 비교 및 리포트 생성
   */
  generateCompressionReport(results: CompressionResult[]): string {
    let report = '📊 압축 성능 비교 리포트\n'
    report += '=' .repeat(40) + '\n\n'

    results.forEach((result, index) => {
      report += `${index + 1}. ${result.method.toUpperCase()} - ${result.format.toUpperCase()}\n`
      report += `   원본 크기: ${(result.originalSize / 1024).toFixed(2)} KB\n`
      report += `   압축 크기: ${(result.compressedSize / 1024).toFixed(2)} KB\n`
      report += `   압축률: ${result.compressionRatio.toFixed(1)}%\n`
      report += `   처리 시간: ${result.processingTime.toFixed(2)}ms\n\n`
    })

    // 최고 성능 방법 추천
    const bestBySize = results.reduce((best, current) => 
      current.compressionRatio > best.compressionRatio ? current : best
    )
    const bestBySpeed = results.reduce((best, current) => 
      current.processingTime < best.processingTime ? current : best
    )

    report += '🏆 추천 방법\n'
    report += `   최고 압축률: ${bestBySize.method} (${bestBySize.compressionRatio.toFixed(1)}%)\n`
    report += `   최고 속도: ${bestBySpeed.method} (${bestBySpeed.processingTime.toFixed(2)}ms)\n`

    return report
  }
}
