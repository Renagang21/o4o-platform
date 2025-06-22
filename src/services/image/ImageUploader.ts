// src/services/image/ImageUploader.ts
import { SharpProcessor } from './processors/SharpProcessor'
import { LocalStorage } from './storage/LocalStorage'
import { CloudStorage } from './storage/CloudStorage'
import { IMAGE_CONFIG, getConfig } from './config'
import { ProcessedImage, ImageUploadOptions, ImageCategory, ImageSize } from './types'

export class ImageUploader {
  private processor: SharpProcessor
  private localStorage: LocalStorage
  private cloudStorage?: CloudStorage
  private config = getConfig()

  constructor(
    storageBasePath: string = './uploads',
    cloudConfig?: any
  ) {
    this.processor = new SharpProcessor(IMAGE_CONFIG)
    this.localStorage = new LocalStorage(storageBasePath)
    
    if (cloudConfig) {
      this.cloudStorage = new CloudStorage(cloudConfig)
    }
  }

  async uploadAndProcess(
    file: File,
    options: ImageUploadOptions = {}
  ): Promise<ProcessedImage> {
    const { 
      category = 'product', 
      preserveOriginal = true,
      generateWebP = true 
    } = options

    try {
      // 파일 유효성 검사
      await this.validateFile(file)
      
      // 파일을 Buffer로 변환
      const buffer = await this.fileToBuffer(file)
      
      // 메타데이터 추출
      const metadata = await this.processor.getMetadata(buffer)
      
      // 파일명 생성
      const baseFilename = this.generateFilename(file.name)
      
      // 카테고리별 사이즈 설정
      const targetSizes = this.getSizesForCategory(category)
      
      // 이미지 처리
      const processedBuffers = await this.processor.processImage(
        buffer, 
        targetSizes
      )
      
      // 파일 저장
      const variants: Record<string, string> = {}
      
      for (const [sizeName, processedBuffer] of Object.entries(processedBuffers)) {
        const size = targetSizes[sizeName]
        const filename = `${baseFilename}${size.suffix}.${size.format}`
        
        // 로컬 스토리지에 저장
        const localPath = await this.localStorage.saveFile(processedBuffer, filename)
        
        // 클라우드 스토리지에도 저장 (설정된 경우)
        if (this.cloudStorage) {
          const cloudKey = this.cloudStorage.generateKey(filename, category)
          const cloudUrl = await this.cloudStorage.uploadFile(
            processedBuffer, 
            cloudKey, 
            `image/${size.format}`
          )
          variants[sizeName] = cloudUrl
        } else {
          variants[sizeName] = localPath
        }
      }

      return {
        original: variants.original || variants.desktop,
        variants,
        metadata
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      throw new Error(`이미지 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  async uploadMultiple(
    files: File[],
    options: ImageUploadOptions = {}
  ): Promise<ProcessedImage[]> {
    const uploadPromises = files.map(file => this.uploadAndProcess(file, options))
    
    try {
      return await Promise.all(uploadPromises)
    } catch (error) {
      console.error('Multiple upload failed:', error)
      throw new Error('다중 이미지 업로드 중 오류가 발생했습니다.')
    }
  }

  async deleteImage(processedImage: ProcessedImage): Promise<void> {
    try {
      const filePaths = Object.values(processedImage.variants)
      
      // 로컬 파일 삭제
      await this.localStorage.deleteMultipleFiles(filePaths)
      
      // 클라우드 파일 삭제 (설정된 경우)
      if (this.cloudStorage) {
        const keys = filePaths.map(path => path.split('/').pop() || '')
        await this.cloudStorage.deleteMultipleFiles(keys)
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw new Error('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  private async validateFile(file: File): Promise<void> {
    // 파일 크기 검증
    if (file.size > this.config.maxFileSize) {
      throw new Error(`파일 크기가 ${this.config.maxFileSize / 1024 / 1024}MB를 초과합니다.`)
    }
    
    // 파일 형식 검증
    if (!this.config.allowedFormats.includes(file.type)) {
      throw new Error('지원하지 않는 파일 형식입니다.')
    }
    
    // 이미지 유효성 검증
    const buffer = await this.fileToBuffer(file)
    const isValid = await this.processor.validateImage(buffer)
    
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
    
    // 한글 파일명 처리
    const safeName = nameWithoutExt
      .replace(/[^\w\s-]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
      .substring(0, 50) // 길이 제한
    
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
        return allSizes // 모든 사이즈 생성
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

  // 이미지 최적화 (텍스트 이미지에 특화)
  async optimizeForKoreanEcommerce(file: File): Promise<ProcessedImage> {
    const buffer = await this.fileToBuffer(file)
    const optimizedBuffer = await this.processor.optimizeForEcommerce(buffer, {
      preserveText: true,
      maxWidth: 1920,
      quality: 90
    })

    const filename = this.generateFilename(file.name) + '_optimized.webp'
    const filePath = await this.localStorage.saveFile(optimizedBuffer, filename)
    const metadata = await this.processor.getMetadata(optimizedBuffer)

    return {
      original: filePath,
      variants: { optimized: filePath },
      metadata
    }
  }

  // 워터마크 추가
  async addWatermark(
    processedImage: ProcessedImage,
    watermarkPath: string
  ): Promise<ProcessedImage> {
    const newVariants: Record<string, string> = {}

    for (const [variantName, imagePath] of Object.entries(processedImage.variants)) {
      try {
        const buffer = await this.localStorage.getFileBuffer(imagePath)
        const watermarkedBuffer = await this.processor.addWatermark(
          buffer,
          watermarkPath,
          'bottom-right'
        )

        const filename = this.generateFilename('watermarked') + `_${variantName}.jpg`
        const newPath = await this.localStorage.saveFile(watermarkedBuffer, filename)
        newVariants[variantName] = newPath
      } catch (error) {
        console.error(`Failed to add watermark to ${variantName}:`, error)
        newVariants[variantName] = imagePath // 원본 유지
      }
    }

    return {
      ...processedImage,
      variants: newVariants
    }
  }

  // 스토리지 상태 확인
  async getStorageStatus(): Promise<{
    local: { used: number; total: number }
    cloud?: { available: boolean }
  }> {
    const localUsage = await this.localStorage.getDiskUsage()
    
    const status: any = { local: localUsage }
    
    if (this.cloudStorage) {
      try {
        // 클라우드 스토리지 연결 테스트
        await this.cloudStorage.fileExists('test')
        status.cloud = { available: true }
      } catch (error) {
        status.cloud = { available: false }
      }
    }

    return status
  }
}
