// @ts-nocheck
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { AppDataSource } from '../database/connection';
import { Media } from '../entities/Media';
import logger from '../utils/logger';

export interface ImageEditOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  angle?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  watermarkPath?: string;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkOpacity?: number;
}

export interface ImageEditResult {
  success: boolean;
  originalPath: string;
  editedPath: string;
  editedUrl: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  error?: string;
}

export class ImageProcessingService {
  private mediaRepository = AppDataSource.getRepository(Media);

  /**
   * Initialize folder structure for edited images
   */
  async initializeFolders(): Promise<void> {
    const basePath = path.join(process.cwd(), 'uploads');
    const folders = [
      'images/originals',
      'images/edited',
      'images/thumbnails',
      'images/watermarks'
    ];

    for (const folder of folders) {
      const fullPath = path.join(basePath, folder);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        logger.info(`Created folder: ${fullPath}`);
      }
    }
  }

  /**
   * Resize image
   */
  async resizeImage(
    mediaId: string, 
    width: number, 
    height: number, 
    options: { maintainAspectRatio?: boolean; quality?: number } = {}
  ): Promise<ImageEditResult> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          originalPath: '',
          editedPath: '',
          editedUrl: '',
          metadata: { width: 0, height: 0, format: '', size: 0 },
          error: 'Media not found or not an image'
        };
      }

      const originalPath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const editedFileName = `${path.parse(media.filename).name}_resized_${width}x${height}${path.extname(media.filename)}`;
      const editedPath = path.join(process.cwd(), 'uploads', 'images', 'edited', editedFileName);

      let sharpInstance = sharp(originalPath);

      if (options.maintainAspectRatio) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      } else {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: 'fill'
        });
      }

      // Apply quality if specified
      if (options.quality) {
        if (media.mimeType === 'image/jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
        } else if (media.mimeType === 'image/png') {
          sharpInstance = sharpInstance.png({ quality: options.quality });
        } else if (media.mimeType === 'image/webp') {
          sharpInstance = sharpInstance.webp({ quality: options.quality });
        }
      }

      await sharpInstance.toFile(editedPath);

      // Get metadata of edited image
      const metadata = await sharp(editedPath).metadata();
      const stats = fs.statSync(editedPath);

      return {
        success: true,
        originalPath,
        editedPath,
        editedUrl: `/uploads/images/edited/${editedFileName}`,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          size: stats.size
        }
      };

    } catch (error) {
      logger.error('Error resizing image:', error);
      return {
        success: false,
        originalPath: '',
        editedPath: '',
        editedUrl: '',
        metadata: { width: 0, height: 0, format: '', size: 0 },
        error: error.message || 'Failed to resize image'
      };
    }
  }

  /**
   * Crop image
   */
  async cropImage(
    mediaId: string, 
    x: number, 
    y: number, 
    width: number, 
    height: number,
    options: { quality?: number } = {}
  ): Promise<ImageEditResult> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          originalPath: '',
          editedPath: '',
          editedUrl: '',
          metadata: { width: 0, height: 0, format: '', size: 0 },
          error: 'Media not found or not an image'
        };
      }

      const originalPath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const editedFileName = `${path.parse(media.filename).name}_cropped_${x}x${y}_${width}x${height}${path.extname(media.filename)}`;
      const editedPath = path.join(process.cwd(), 'uploads', 'images', 'edited', editedFileName);

      let sharpInstance = sharp(originalPath)
        .extract({
          left: Math.max(0, x),
          top: Math.max(0, y),
          width: width,
          height: height
        });

      // Apply quality if specified
      if (options.quality) {
        if (media.mimeType === 'image/jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
        } else if (media.mimeType === 'image/png') {
          sharpInstance = sharpInstance.png({ quality: options.quality });
        } else if (media.mimeType === 'image/webp') {
          sharpInstance = sharpInstance.webp({ quality: options.quality });
        }
      }

      await sharpInstance.toFile(editedPath);

      const metadata = await sharp(editedPath).metadata();
      const stats = fs.statSync(editedPath);

      return {
        success: true,
        originalPath,
        editedPath,
        editedUrl: `/uploads/images/edited/${editedFileName}`,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          size: stats.size
        }
      };

    } catch (error) {
      logger.error('Error cropping image:', error);
      return {
        success: false,
        originalPath: '',
        editedPath: '',
        editedUrl: '',
        metadata: { width: 0, height: 0, format: '', size: 0 },
        error: error.message || 'Failed to crop image'
      };
    }
  }

  /**
   * Rotate image
   */
  async rotateImage(
    mediaId: string, 
    angle: number,
    options: { backgroundColor?: string; quality?: number } = {}
  ): Promise<ImageEditResult> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          originalPath: '',
          editedPath: '',
          editedUrl: '',
          metadata: { width: 0, height: 0, format: '', size: 0 },
          error: 'Media not found or not an image'
        };
      }

      const originalPath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const editedFileName = `${path.parse(media.filename).name}_rotated_${angle}${path.extname(media.filename)}`;
      const editedPath = path.join(process.cwd(), 'uploads', 'images', 'edited', editedFileName);

      let sharpInstance = sharp(originalPath)
        .rotate(angle, {
          background: options.backgroundColor || { r: 255, g: 255, b: 255, alpha: 0 }
        });

      // Apply quality if specified
      if (options.quality) {
        if (media.mimeType === 'image/jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
        } else if (media.mimeType === 'image/png') {
          sharpInstance = sharpInstance.png({ quality: options.quality });
        } else if (media.mimeType === 'image/webp') {
          sharpInstance = sharpInstance.webp({ quality: options.quality });
        }
      }

      await sharpInstance.toFile(editedPath);

      const metadata = await sharp(editedPath).metadata();
      const stats = fs.statSync(editedPath);

      return {
        success: true,
        originalPath,
        editedPath,
        editedUrl: `/uploads/images/edited/${editedFileName}`,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          size: stats.size
        }
      };

    } catch (error) {
      logger.error('Error rotating image:', error);
      return {
        success: false,
        originalPath: '',
        editedPath: '',
        editedUrl: '',
        metadata: { width: 0, height: 0, format: '', size: 0 },
        error: error.message || 'Failed to rotate image'
      };
    }
  }

  /**
   * Add watermark to image
   */
  async addWatermark(
    mediaId: string,
    watermarkText: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'bottom-right',
    options: { opacity?: number; fontSize?: number; color?: string; quality?: number } = {}
  ): Promise<ImageEditResult> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          originalPath: '',
          editedPath: '',
          editedUrl: '',
          metadata: { width: 0, height: 0, format: '', size: 0 },
          error: 'Media not found or not an image'
        };
      }

      const originalPath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const editedFileName = `${path.parse(media.filename).name}_watermarked${path.extname(media.filename)}`;
      const editedPath = path.join(process.cwd(), 'uploads', 'images', 'edited', editedFileName);

      // Get original image metadata
      const originalMetadata = await sharp(originalPath).metadata();
      const imageWidth = originalMetadata.width || 800;
      const imageHeight = originalMetadata.height || 600;

      // Create text watermark as SVG
      const fontSize = options.fontSize || Math.max(20, Math.min(imageWidth, imageHeight) * 0.04);
      const color = options.color || 'rgba(255,255,255,0.8)';
      
      // Calculate text position
      let x, y;
      const padding = 20;
      
      switch (position) {
        case 'top-left':
          x = padding;
          y = fontSize + padding;
          break;
        case 'top-right':
          x = imageWidth - (watermarkText.length * fontSize * 0.6) - padding;
          y = fontSize + padding;
          break;
        case 'bottom-left':
          x = padding;
          y = imageHeight - padding;
          break;
        case 'bottom-right':
          x = imageWidth - (watermarkText.length * fontSize * 0.6) - padding;
          y = imageHeight - padding;
          break;
        case 'center':
          x = (imageWidth - (watermarkText.length * fontSize * 0.6)) / 2;
          y = imageHeight / 2;
          break;
        default:
          x = imageWidth - (watermarkText.length * fontSize * 0.6) - padding;
          y = imageHeight - padding;
      }

      const svgWatermark = `
        <svg width="${imageWidth}" height="${imageHeight}">
          <text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                fill="${color}" opacity="${options.opacity || 0.7}">${watermarkText}</text>
        </svg>
      `;

      let sharpInstance = sharp(originalPath)
        .composite([{
          input: Buffer.from(svgWatermark),
          blend: 'over'
        }]);

      // Apply quality if specified
      if (options.quality) {
        if (media.mimeType === 'image/jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
        } else if (media.mimeType === 'image/png') {
          sharpInstance = sharpInstance.png({ quality: options.quality });
        } else if (media.mimeType === 'image/webp') {
          sharpInstance = sharpInstance.webp({ quality: options.quality });
        }
      }

      await sharpInstance.toFile(editedPath);

      const metadata = await sharp(editedPath).metadata();
      const stats = fs.statSync(editedPath);

      return {
        success: true,
        originalPath,
        editedPath,
        editedUrl: `/uploads/images/edited/${editedFileName}`,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          size: stats.size
        }
      };

    } catch (error) {
      logger.error('Error adding watermark:', error);
      return {
        success: false,
        originalPath: '',
        editedPath: '',
        editedUrl: '',
        metadata: { width: 0, height: 0, format: '', size: 0 },
        error: error.message || 'Failed to add watermark'
      };
    }
  }

  /**
   * Optimize image (compress and convert format)
   */
  async optimizeImage(
    mediaId: string,
    options: {
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      removeMetadata?: boolean;
      progressive?: boolean;
    } = {}
  ): Promise<ImageEditResult> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          originalPath: '',
          editedPath: '',
          editedUrl: '',
          metadata: { width: 0, height: 0, format: '', size: 0 },
          error: 'Media not found or not an image'
        };
      }

      const originalPath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const format = options.format || 'jpeg';
      const quality = options.quality || 85;
      const editedFileName = `${path.parse(media.filename).name}_optimized.${format}`;
      const editedPath = path.join(process.cwd(), 'uploads', 'images', 'edited', editedFileName);

      let sharpInstance = sharp(originalPath);

      // Remove metadata if requested
      if (options.removeMetadata) {
        sharpInstance = sharpInstance.withMetadata(false);
      }

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality,
            progressive: options.progressive || true,
            mozjpeg: true
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality,
            progressive: options.progressive || true,
            compressionLevel: 9
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality,
            effort: 6
          });
          break;
      }

      await sharpInstance.toFile(editedPath);

      const metadata = await sharp(editedPath).metadata();
      const stats = fs.statSync(editedPath);
      const originalStats = fs.statSync(originalPath);

      logger.info(`Image optimization: ${originalStats.size} → ${stats.size} bytes (${Math.round((1 - stats.size / originalStats.size) * 100)}% reduction)`);

      return {
        success: true,
        originalPath,
        editedPath,
        editedUrl: `/uploads/images/edited/${editedFileName}`,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: format,
          size: stats.size
        }
      };

    } catch (error) {
      logger.error('Error optimizing image:', error);
      return {
        success: false,
        originalPath: '',
        editedPath: '',
        editedUrl: '',
        metadata: { width: 0, height: 0, format: '', size: 0 },
        error: error.message || 'Failed to optimize image'
      };
    }
  }

  /**
   * Get image metadata and analysis
   */
  async getImageAnalysis(mediaId: string): Promise<{
    success: boolean;
    metadata?: {
      width: number;
      height: number;
      format: string;
      size: number;
      channels: number;
      hasAlpha: boolean;
      colorspace: string;
      density?: number;
    };
    recommendations?: string[];
    error?: string;
  }> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
      
      if (!media || !media.mimeType?.startsWith('image/')) {
        return {
          success: false,
          error: 'Media not found or not an image'
        };
      }

      const imagePath = path.join(process.cwd(), 'uploads', media.url.replace('/uploads/', ''));
      const metadata = await sharp(imagePath).metadata();
      const stats = fs.statSync(imagePath);

      const recommendations: string[] = [];

      // Generate optimization recommendations
      if (stats.size > 2 * 1024 * 1024) { // > 2MB
        recommendations.push('Consider optimizing this large image to reduce file size');
      }

      if ((metadata.width || 0) > 2000 || (metadata.height || 0) > 2000) {
        recommendations.push('Consider resizing this high-resolution image for web use');
      }

      if (metadata.format === 'png' && !metadata.hasAlpha) {
        recommendations.push('Convert to JPEG for better compression (no transparency needed)');
      }

      if (metadata.format === 'jpeg' && (metadata.width || 0) < 500 && (metadata.height || 0) < 500) {
        recommendations.push('Consider using PNG for small images with sharp edges');
      }

      return {
        success: true,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || '',
          size: stats.size,
          channels: metadata.channels || 0,
          hasAlpha: metadata.hasAlpha || false,
          colorspace: metadata.space || '',
          density: metadata.density
        },
        recommendations
      };

    } catch (error) {
      logger.error('Error analyzing image:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze image'
      };
    }
  }
}

export const imageProcessingService = new ImageProcessingService();