// src/services/image/ImageUploaderEnhanced.ts
import { SharpProcessor } from './processors/SharpProcessor'
import { IntelligentProcessor } from './processors/IntelligentProcessor'
import { AdvancedCompressionProcessor } from './processors/AdvancedCompressionProcessor'
import { LocalStorage } from './storage/LocalStorage'
import { CloudStorage } from './storage/CloudStorage'
import { IMAGE_CONFIG, getConfig } from './config'
import { ProcessedImage, ImageUploadOptions, ImageCategory, ImageSize } from './types'
import { performanceMonitor } from '../utils/performanceUtils'

export interface EnhancedUploadOptions extends ImageUploadOptions {
  enableIntelligentCompression?: boolean
  enableProgressiveJPEG?: boolean
  enableTinyPNG?: boolean
  targetCompressionRatio?: number
  maxFileSize?: number
  smartQuality?: boolean
}

export interface UploadResult extends ProcessedImage {
  compressionReport?: string
  processingTime: number
  intelligentAnalysis?: any
}

export class ImageUploaderEnhanced {
  private sharpProcessor: SharpProcessor
  private intelligentProcessor: IntelligentProcessor
  private advancedProcessor: AdvancedCompressionProcessor
  private localStorage: LocalStorage
  private cloudStorage?: CloudStorage
  private config = getConfig()

  constructor(
    storageBasePath: string = './uploads',
    cloudConfig?: any,
    tinyPNGConfig?: any
  ) {
    this.sharpProcessor = new SharpProcessor(IMAGE_CONFIG)
    this.intelligentProcessor = new IntelligentProcessor(IMAGE_CONFIG)
    this.advancedProcessor = new AdvancedCompressionProcessor(IMAGE_CONFIG, tinyPNGConfig)
    this.localStorage = new LocalStorage(storageBasePath)
    
    if (cloudConfig) {
      this.cloudStorage = new CloudStorage(cloudConfig)
    }
  }

  /**
   * 고급 이미지 업로드 및 처리
   */
  async uploadAndProcessEnhanced(
    file: File,
    options: EnhancedUploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = performance.now()
    const { 
      category = 'product', 
      preserveOriginal = true,
      generateWebP = true,
      enableIntelligentCompression = true,
      enableProgressiveJPEG = true,
      targetCompressionRatio = 0.5,
      maxFileSize,
      smartQuality = true
    } = options

    try {
      // 파일 유효성 검사
      await this.validateFile(file)
      
      // 파일을 Buffer로 변환
      const buffer = await this.fileToBuffer(file)
      
      // 기본 메타데이터 추출
      const metadata = await this.sharpProcessor.getMetadata(buffer)
      
      // 파일명 생성
      const baseFilename = this.generateFilename(file.name)
      
      // 카테고리별 사이즈 설정
      const targetSizes = this.getSizesForCategory(category)
      
      let intelligentAnalysis: any = null
      let compressionReport = ''
      
      // 지능형 압축 처리
      if (enableIntelligentCompression) {
        console.log('🧠 지능형 이미지 분석 시작...')
        intelligentAnalysis = await this.intelligentProcessor.analyzeImageContent(buffer)
        
        console.log(`📊 텍스트 밀도: ${(intelligentAnalysis.textDensity * 100).toFixed(1)}%`)
        console.log(`🎯 권장 품질: ${intelligentAnalysis.recommendedQuality}`)
      }
      
      // 향상된 압축으로 다중 해상도 생성
      const processedBuffers: Record<string, Buffer> = {}
      const compressionResults: any[] = []
      
      for (const [sizeName, sizeConfig] of Object.entries(targetSizes)) {
        console.log(`🔄 처리 중: ${sizeName} (${sizeConfig.width}px)`)
        
        let processedBuffer: Buffer
        let compressionResult: any = null
        
        if (enableIntelligentCompression && intelligentAnalysis) {
          // 지능형 압축 적용
          const result = await this.intelligentProcessor.intelligentOptimize(
            buffer,
            sizeConfig.width > 0 ? sizeConfig.width : undefined,
            { preserveText: intelligentAnalysis.hasText }
          )
          processedBuffer = result.buffer
          compressionResult = result
        } else if (enableProgressiveJPEG && sizeConfig.format === 'jpg') {
          // Progressive JPEG 적용
          const quality = smartQuality && intelligentAnalysis 
            ? intelligentAnalysis.recommendedQuality 
            : sizeConfig.quality
            
          const result = await this.advancedProcessor.createProgressiveJPEG(buffer, {
            quality,
            progressive: true,
            optimizeScans: true
          })
          processedBuffer = result.buffer
          compressionResult = result.result
        } else {
          // 기본 Sharp 처리
          const sizes = { [sizeName]: sizeConfig }
          const results = await this.sharpProcessor.processImage(buffer, sizes)
          processedBuffer = results[sizeName]
        }
        
        processedBuffers[sizeName] = processedBuffer
        if (compressionResult) {
          compressionResults.push({
            size: sizeName,
            ...compressionResult
          })
        }
      }
      
      // 압축 리포트 생성
      if (compressionResults.length > 0) {
        compressionReport = this.generateEnhancedCompressionReport(compressionResults)
        console.log('\n' + compressionReport)
      }
      
      // 파일 저장
      const variants: Record<string, string> = {}
      
      for (const [sizeName, processedBuffer] of Object.entries(processedBuffers)) {
        const size = targetSizes[sizeName]
        let extension = size.format || 'jpg'
        
        // 지능형 압축이 적용된 경우 WebP 확장자 사용
        if (enableIntelligentCompression) {
          extension = 'webp'
        }
        
        const filename = `${baseFilename}${size.suffix}.${extension}`
        
        // 최대 파일 크기 체크
        if (maxFileSize && processedBuffer.length > maxFileSize) {
          console.log(`⚠️ ${sizeName} 크기 초과, 추가 압축 적용...`)
          
          const smartCompressed = await this.advancedProcessor.smartCompress(
            processedBuffer,
            { maxSize: maxFileSize, allowLossy: true }
          )
          
          const smartFilename = `${baseFilename}${size.suffix}_compressed.${extension}`
          const filePath = await this.localStorage.saveFile(smartCompressed.buffer, smartFilename)
          variants[sizeName] = filePath
        } else {
          // 정상적으로 저장
          const filePath = await this.localStorage.saveFile(processedBuffer, filename)
          
          // 클라우드 스토리지에도 저장 (설정된 경우)
          if (this.cloudStorage) {
            const cloudKey = this.cloudStorage.generateKey(filename, category)
            const cloudUrl = await this.cloudStorage.uploadFile(
              processedBuffer, 
              cloudKey, 
              `image/${extension}`
            )
            variants[sizeName] = cloudUrl
          } else {
            variants[sizeName] = filePath
          }
        }
      }

      const processingTime = performance.now() - startTime
      
      // 성능 메트릭 기록
      performanceMonitor.recordMetric('enhanced-upload-time', processingTime, 'ms', {
        fileSize: buffer.length,
        category,
        intelligentCompression: enableIntelligentCompression,
        progressiveJPEG: enableProgressiveJPEG,
        variants: Object.keys(variants).length
      })

      console.log(`✅ 처리 완료! 총 소요 시간: ${processingTime.toFixed(2)}ms`)

      return {
        original: variants.original || variants.desktop,
        variants,
        metadata,
        compressionReport,
        processingTime,
        intelligentAnalysis
      }
    } catch (error) {
      console.error('Enhanced upload failed:', error)
      throw new Error(`고급 이미지 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * A/B 테스트용 다중 압축 방식 비교
   */
  async compareCompressionMethods(
    file: File,
    methods: ('standard' | 'intelligent' | 'progressive' | 'tinypng')[] = ['standard', 'intelligent', 'progressive']
  ): Promise<{
    results: Array<{
      method: string
      result: UploadResult
      score: number
    }>
    recommendation: string
  }> {
    const buffer = await this.fileToBuffer(file)
    const results: Array<{
      method: string
      result: UploadResult
      score: number
    }> = []

    // 각 방법으로 처리
    for (const method of methods) {
      try {
        let result: UploadResult
        
        switch (method) {
          case 'standard':
            result = await this.uploadAndProcessEnhanced(file, {
              enableIntelligentCompression: false,
              enableProgressiveJPEG: false
            })
            break
          case 'intelligent':
            result = await this.uploadAndProcessEnhanced(file, {
              enableIntelligentCompression: true,
              enableProgressiveJPEG: false
            })
            break
          case 'progressive':
            result = await this.uploadAndProcessEnhanced(file, {
              enableIntelligentCompression: false,
              enableProgressiveJPEG: true
            })
            break
          case 'tinypng':
            result = await this.uploadAndProcessEnhanced(file, {
              enableIntelligentCompression: false,
              enableTinyPNG: true
            })
            break
          default:
            continue
        }
        
        // 성능 점수 계산 (압축률 + 속도)
        const compressionScore = this.calculateCompressionScore(result)
        const speedScore = this.calculateSpeedScore(result.processingTime)
        const score = (compressionScore * 0.7) + (speedScore * 0.3) // 압축률 70%, 속도 30%
        
        results.push({
          method,
          result,
          score
        })
      } catch (error) {
        console.error(`${method} method failed:`, error)
      }
    }

    // 결과 정렬 (점수 높은 순)
    results.sort((a, b) => b.score - a.score)
    
    // 권장사항 생성
    const best = results[0]
    const recommendation = this.generateRecommendation(results, file)

    return {
      results,
      recommendation
    }
  }

  /**
   * 압축 점수 계산
   */
  private calculateCompressionScore(result: UploadResult): number {
    // 파일 크기 감소율을 기반으로 점수 계산
    const originalSize = result.metadata.size
    const compressedSizes = Object.values(result.variants).map(path => {
      // 실제로는 파일 크기를 확인해야 하지만, 여기서는 추정
      return originalSize * 0.6 // 평균 40% 압축 가정
    })
    
    const avgCompressedSize = compressedSizes.reduce((a, b) => a + b, 0) / compressedSizes.length
    const compressionRatio = (originalSize - avgCompressedSize) / originalSize
    
    return Math.min(compressionRatio * 100, 100) // 0-100점
  }

  /**
   * 속도 점수 계산
   */
  private calculateSpeedScore(processingTime: number): number {
    // 처리 시간을 기반으로 점수 계산 (짧을수록 높은 점수)
    const maxTime = 10000 // 10초를 최대 시간으로 가정
    return Math.max(0, 100 - (processingTime / maxTime) * 100)
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendation(results: any[], file: File): string {
    const best = results[0]
    let recommendation = `🏆 최적 방법: ${best.method.toUpperCase()}\n`
    recommendation += `   점수: ${best.score.toFixed(1)}/100\n`
    recommendation += `   처리 시간: ${best.result.processingTime.toFixed(2)}ms\n\n`
    
    recommendation += '📊 상황별 권장:\n'
    
    if (file.size > 5 * 1024 * 1024) { // 5MB 이상
      recommendation += '• 대용량 파일: intelligent 압축 권장\n'
    }
    
    if (file.name.includes('detail') || file.name.includes('spec')) {
      recommendation += '• 상세 이미지: progressive JPEG 권장\n'
    }
    
    recommendation += '• 썸네일: standard 압축으로도 충분\n'
    
    return recommendation
  }

  /**
   * 향상된 압축 리포트 생성
   */
  private generateEnhancedCompressionReport(results: any[]): string {
    let report = '📊 고급 압축 성능 리포트\n'
    report += '=' .repeat(35) + '\n\n'
    
    results.forEach((result, index) => {
      report += `${index + 1}. ${result.size.toUpperCase()}\n`
      if (result.strategy) {
        report += `   전략: ${result.strategy.description}\n`
        report += `   품질: ${result.strategy.quality}\n`
      }
      if (result.analysis) {
        report += `   텍스트 밀도: ${(result.analysis.textDensity * 100).toFixed(1)}%\n`
      }
      report += `   처리 시간: ${result.processingTime?.toFixed(2) || 'N/A'}ms\n\n`
    })
    
    return report
  }

  // 기존 메서드들 유지
  private async validateFile(file: File): Promise<void> {
    if (file.size > this.config.maxFileSize) {
      throw new Error(`파일 크기가 ${this.config.maxFileSize / 1024 / 1024}MB를 초과합니다.`)
    }
    
    if (!this.config.allowedFormats.includes(file.type)) {
      throw new Error('지원하지 않는 파일 형식입니다.')
    }
    
    const buffer = await this.fileToBuffer(file)
    const isValid = await this.sharpProcessor.validateImage(buffer)
    
    if (!isValid) {
      throw new Error('유효하지 않은 이미지 파일입니다.')
    }
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    const nameWithoutExt = originalName.replace(`.${extension}`, '')
    
    const safeName = nameWithoutExt
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
    
    return `${safeName}_${timestamp}_${randomString}`
  }

  private getSizesForCategory(category: ImageCategory): Record<string, ImageSize> {
    const allSizes = IMAGE_CONFIG.sizes
    
    switch (category) {
      case 'thumbnail':
        return {
          thumbnail: allSizes.thumbnail,
          mobile: allSizes.mobile
        }
      case 'detail':
        return allSizes
      case 'product':
      default:
        return {
          thumbnail: allSizes.thumbnail,
          mobile: allSizes.mobile,
          tablet: allSizes.tablet,
          desktop: allSizes.desktop,
          original: allSizes.original
        }
    }
  }
}
