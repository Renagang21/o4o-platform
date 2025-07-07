// src/services/image/processors/SharpProcessor.ts
import sharp from 'sharp'
import { ImageSize, ImageProcessingConfig, ImageOptimizationOptions, ImageMetadata } from '../types'

export class SharpProcessor {
  constructor(private config: ImageProcessingConfig) {}

  async processImage(
    buffer: Buffer,
    sizes: Record<string, ImageSize>
  ): Promise<Record<string, Buffer>> {
    const results: Record<string, Buffer> = {}

    for (const [name, size] of Object.entries(sizes)) {
      try {
        let pipeline = sharp(buffer)

        // 리사이징 (원본 크기 유지하려면 width가 0)
        if (size.width > 0) {
          pipeline = pipeline.resize(size.width, size.height, {
            withoutEnlargement: true,
            fit: 'inside'
          })
        }

        // 포맷에 따른 압축 설정
        switch (size.format) {
          case 'webp':
            pipeline = pipeline.webp({
              quality: size.quality,
              effort: this.config.compression.webp.effort
            })
            break
          case 'avif':
            pipeline = pipeline.avif({
              quality: size.quality,
              effort: this.config.compression.avif.effort
            })
            break
          case 'jpg':
            pipeline = pipeline.jpeg({
              quality: size.quality,
              progressive: this.config.compression.jpg.progressive
            })
            break
          default:
            pipeline = pipeline.png({ quality: size.quality })
        }

        results[name] = await pipeline.toBuffer()
      } catch (error) {
        console.error(`Error processing ${name}:`, error)
        throw new Error(`Failed to process image variant: ${name}`)
      }
    }

    return results
  }

  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata()
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: metadata.size || 0,
      aspectRatio: metadata.width && metadata.height 
        ? metadata.width / metadata.height 
        : 1
    }
  }

  async optimizeForEcommerce(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    const { preserveText = true, maxWidth = 1920, quality = 85 } = options

    let pipeline = sharp(buffer)

    // 한국 쇼핑몰 특성: 텍스트가 많은 이미지 최적화
    if (preserveText) {
      // 텍스트 가독성을 위해 높은 품질 유지
      pipeline = pipeline.sharpen({ sigma: 0.5 })
    }

    // 최대 너비 제한
    pipeline = pipeline.resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })

    // WebP로 변환 (텍스트 이미지에 최적)
    return pipeline.webp({ 
      quality, 
      effort: 6,
      nearLossless: preserveText 
    }).toBuffer()
  }

  async createThumbnail(
    buffer: Buffer,
    width: number = 320,
    height: number = 320
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer()
  }

  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata()
      return !!(metadata.width && metadata.height)
    } catch (error) {
      return false
    }
  }

  async convertFormat(
    buffer: Buffer,
    targetFormat: 'webp' | 'avif' | 'jpg' | 'png',
    quality: number = 85
  ): Promise<Buffer> {
    let pipeline = sharp(buffer)

    switch (targetFormat) {
      case 'webp':
        pipeline = pipeline.webp({ quality })
        break
      case 'avif':
        pipeline = pipeline.avif({ quality })
        break
      case 'jpg':
        pipeline = pipeline.jpeg({ quality, progressive: true })
        break
      case 'png':
        pipeline = pipeline.png({ quality })
        break
    }

    return pipeline.toBuffer()
  }

  async addWatermark(
    buffer: Buffer,
    watermarkPath: string,
    position: 'center' | 'bottom-right' | 'bottom-left' = 'bottom-right'
  ): Promise<Buffer> {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata')
    }

    const watermark = sharp(watermarkPath)
      .resize(Math.floor(metadata.width * 0.1)) // 워터마크를 이미지 크기의 10%로 설정
      .png()

    let left = 0
    let top = 0

    switch (position) {
      case 'center':
        left = Math.floor(metadata.width / 2)
        top = Math.floor(metadata.height / 2)
        break
      case 'bottom-right':
        left = Math.floor(metadata.width * 0.85)
        top = Math.floor(metadata.height * 0.85)
        break
      case 'bottom-left':
        left = Math.floor(metadata.width * 0.05)
        top = Math.floor(metadata.height * 0.85)
        break
    }

    return image
      .composite([{ input: await watermark.toBuffer(), left, top }])
      .toBuffer()
  }
}
