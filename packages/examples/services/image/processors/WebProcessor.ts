// src/services/image/processors/WebProcessor.ts
import { ImageOptimizationOptions, ImageMetadata } from '../types'

export class WebProcessor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor() {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context not supported')
    }
    this.ctx = context
  }

  async processImage(
    file: File,
    targetWidth: number,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            targetWidth
          )

          this.canvas.width = width
          this.canvas.height = height

          // 이미지 그리기
          this.ctx.drawImage(img, 0, 0, width, height)

          // Blob으로 변환
          this.canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob'))
              }
            },
            'image/webp',
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  async getMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1],
          size: file.size,
          aspectRatio: img.width / img.height
        })
        URL.revokeObjectURL(img.src)
      }

      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image for metadata'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  async createThumbnail(
    file: File,
    size: number = 320
  ): Promise<Blob> {
    return this.processImage(file, size, 0.7)
  }

  async optimizeForWeb(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
    const { maxWidth = 1920, quality = 85 } = options
    return this.processImage(file, maxWidth, quality / 100)
  }

  async convertToWebP(
    file: File,
    quality: number = 0.8
  ): Promise<Blob> {
    const metadata = await this.getMetadata(file)
    return this.processImage(file, metadata.width, quality)
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number
  ): { width: number; height: number } {
    if (originalWidth <= targetWidth) {
      return { width: originalWidth, height: originalHeight }
    }

    const aspectRatio = originalHeight / originalWidth
    return {
      width: targetWidth,
      height: Math.round(targetWidth * aspectRatio)
    }
  }

  async validateImage(file: File): Promise<boolean> {
    try {
      await this.getMetadata(file)
      return true
    } catch (error) {
      return false
    }
  }

  async compressImage(
    file: File,
    compressionLevel: number = 0.8
  ): Promise<Blob> {
    const metadata = await this.getMetadata(file)
    
    // 압축 레벨에 따라 크기 조정
    let targetWidth = metadata.width
    if (compressionLevel < 0.5) {
      targetWidth = Math.floor(metadata.width * 0.7)
    } else if (compressionLevel < 0.8) {
      targetWidth = Math.floor(metadata.width * 0.85)
    }

    return this.processImage(file, targetWidth, compressionLevel)
  }

  // 이미지 미리보기 생성
  createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string)
        } else {
          reject(new Error('Failed to create preview'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    })
  }

  // 메모리 정리
  dispose(): void {
    this.canvas.width = 0
    this.canvas.height = 0
  }
}
