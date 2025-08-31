// @ts-nocheck
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../utils/logger';

export interface FileOptimizationResult {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  optimizedPath: string;
  optimizedUrl: string;
  format: string;
  error?: string;
}

export interface BatchOptimizationResult {
  success: boolean;
  totalFiles: number;
  optimizedFiles: number;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalReductionPercentage: number;
  results: FileOptimizationResult[];
  errors: string[];
}

export class FileOptimizationService {
  
  // Default optimization settings for different image types
  private optimizationPresets = {
    web: {
      jpeg: { quality: 85, progressive: true, mozjpeg: true },
      png: { quality: 90, compressionLevel: 9, progressive: true },
      webp: { quality: 85, effort: 6 }
    },
    thumbnail: {
      jpeg: { quality: 75, progressive: true, mozjpeg: true },
      png: { quality: 80, compressionLevel: 9, progressive: true },
      webp: { quality: 75, effort: 6 }
    },
    print: {
      jpeg: { quality: 95, progressive: false, mozjpeg: true },
      png: { quality: 100, compressionLevel: 6, progressive: false },
      webp: { quality: 95, effort: 6 }
    }
  };

  /**
   * Optimize a single image file
   */
  async optimizeImage(
    imagePath: string,
    outputPath: string,
    options: {
      preset?: 'web' | 'thumbnail' | 'print';
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      removeMetadata?: boolean;
    } = {}
  ): Promise<FileOptimizationResult> {
    try {
      if (!fs.existsSync(imagePath)) {
        return {
          success: false,
          originalSize: 0,
          optimizedSize: 0,
          reductionPercentage: 0,
          optimizedPath: '',
          optimizedUrl: '',
          format: '',
          error: 'Source image not found'
        };
      }

      const originalStats = fs.statSync(imagePath);
      const originalMetadata = await sharp(imagePath).metadata();
      
      // Determine output format
      const targetFormat = options.format || this.getOptimalFormat(originalMetadata);
      const preset = options.preset || 'web';
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let sharpInstance = sharp(imagePath);

      // Resize if max dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        sharpInstance = sharpInstance.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Remove metadata if requested
      if (options.removeMetadata !== false) {
        sharpInstance = sharpInstance.withMetadata(false);
      }

      // Apply format-specific optimizations
      const presetSettings = this.optimizationPresets[preset];
      const quality = options.quality || presetSettings[targetFormat]?.quality || 85;

      switch (targetFormat) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality,
            progressive: presetSettings.jpeg.progressive,
            mozjpeg: presetSettings.jpeg.mozjpeg
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality,
            compressionLevel: presetSettings.png.compressionLevel,
            progressive: presetSettings.png.progressive
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality,
            effort: presetSettings.webp.effort
          });
          break;
      }

      // Process and save
      await sharpInstance.toFile(outputPath);

      const optimizedStats = fs.statSync(outputPath);
      const reductionPercentage = Math.round((1 - optimizedStats.size / originalStats.size) * 100);

      logger.info(`Optimized ${path.basename(imagePath)}: ${originalStats.size} → ${optimizedStats.size} bytes (${reductionPercentage}% reduction)`);

      return {
        success: true,
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        reductionPercentage,
        optimizedPath: outputPath,
        optimizedUrl: outputPath.replace(process.cwd(), '').replace(/\\/g, '/'),
        format: targetFormat
      };

    } catch (error) {
      logger.error('Error optimizing image:', error);
      return {
        success: false,
        originalSize: 0,
        optimizedSize: 0,
        reductionPercentage: 0,
        optimizedPath: '',
        optimizedUrl: '',
        format: '',
        error: error.message || 'Failed to optimize image'
      };
    }
  }

  /**
   * Batch optimize multiple images
   */
  async batchOptimizeImages(
    imagePaths: string[],
    outputDirectory: string,
    options: {
      preset?: 'web' | 'thumbnail' | 'print';
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      removeMetadata?: boolean;
      skipExisting?: boolean;
    } = {}
  ): Promise<BatchOptimizationResult> {
    const results: FileOptimizationResult[] = [];
    const errors: string[] = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let optimizedFiles = 0;

    // Ensure output directory exists
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    for (const imagePath of imagePaths) {
      try {
        const filename = path.parse(imagePath).name;
        const targetFormat = options.format || this.getOptimalFormat(await sharp(imagePath).metadata());
        const outputPath = path.join(outputDirectory, `${filename}_optimized.${targetFormat}`);

        // Skip if file exists and skipExisting is true
        if (options.skipExisting && fs.existsSync(outputPath)) {
          logger.info(`Skipping existing file: ${outputPath}`);
          continue;
        }

        const result = await this.optimizeImage(imagePath, outputPath, options);
        results.push(result);

        if (result.success) {
          totalOriginalSize += result.originalSize;
          totalOptimizedSize += result.optimizedSize;
          optimizedFiles++;
        } else {
          errors.push(`${imagePath}: ${result.error}`);
        }

      } catch (error) {
        const errorMsg = `${imagePath}: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Batch optimization error:', errorMsg);
      }
    }

    const totalReductionPercentage = totalOriginalSize > 0 
      ? Math.round((1 - totalOptimizedSize / totalOriginalSize) * 100)
      : 0;

    return {
      success: optimizedFiles > 0,
      totalFiles: imagePaths.length,
      optimizedFiles,
      totalOriginalSize,
      totalOptimizedSize,
      totalReductionPercentage,
      results,
      errors
    };
  }

  /**
   * Generate responsive image sizes
   */
  async generateResponsiveImages(
    imagePath: string,
    outputDirectory: string,
    sizes: { name: string; width: number; height?: number; quality?: number }[] = [
      { name: 'thumbnail', width: 150, height: 150, quality: 75 },
      { name: 'small', width: 300, quality: 80 },
      { name: 'medium', width: 768, quality: 85 },
      { name: 'large', width: 1024, quality: 85 },
      { name: 'xlarge', width: 1920, quality: 90 }
    ]
  ): Promise<{
    success: boolean;
    variants: { [key: string]: string };
    errors: string[];
  }> {
    const variants: { [key: string]: string } = {};
    const errors: string[] = [];

    if (!fs.existsSync(imagePath)) {
      return {
        success: false,
        variants: {},
        errors: ['Source image not found']
      };
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const baseName = path.parse(imagePath).name;
    const originalMetadata = await sharp(imagePath).metadata();

    for (const size of sizes) {
      try {
        const outputPath = path.join(outputDirectory, `${baseName}_${size.name}.jpg`);
        
        let sharpInstance = sharp(imagePath);

        if (size.height) {
          // Fixed dimensions (for thumbnails)
          sharpInstance = sharpInstance.resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          });
        } else {
          // Maintain aspect ratio
          sharpInstance = sharpInstance.resize(size.width, null, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        await sharpInstance
          .jpeg({ 
            quality: size.quality || 85, 
            progressive: true,
            mozjpeg: true 
          })
          .toFile(outputPath);

        variants[size.name] = outputPath.replace(process.cwd(), '').replace(/\\/g, '/');
        
        logger.debug(`Generated ${size.name} variant: ${outputPath}`);

      } catch (error) {
        const errorMsg = `Failed to generate ${size.name} variant: ${error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    return {
      success: Object.keys(variants).length > 0,
      variants,
      errors
    };
  }

  /**
   * Clean up old optimized files
   */
  async cleanupOptimizedFiles(directory: string, olderThanDays: number = 30): Promise<{
    success: boolean;
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedFiles = 0;
    let freedSpace = 0;

    try {
      if (!fs.existsSync(directory)) {
        return { success: true, deletedFiles: 0, freedSpace: 0, errors: [] };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = fs.readdirSync(directory, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(directory, file.name);
          const stats = fs.statSync(filePath);

          if (stats.mtime < cutoffDate && this.isOptimizedFile(file.name)) {
            try {
              freedSpace += stats.size;
              fs.unlinkSync(filePath);
              deletedFiles++;
              logger.debug(`Cleaned up old optimized file: ${filePath}`);
            } catch (error) {
              errors.push(`Failed to delete ${filePath}: ${error.message}`);
            }
          }
        }
      }

      logger.info(`Cleanup complete: ${deletedFiles} files deleted, ${Math.round(freedSpace / 1024 / 1024)}MB freed`);

      return {
        success: true,
        deletedFiles,
        freedSpace,
        errors
      };

    } catch (error) {
      logger.error('Error during cleanup:', error);
      return {
        success: false,
        deletedFiles: 0,
        freedSpace: 0,
        errors: [error.message || 'Unknown cleanup error']
      };
    }
  }

  /**
   * Get file size statistics
   */
  async getOptimizationStats(directory: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    largestFile: { name: string; size: number } | null;
    smallestFile: { name: string; size: number } | null;
    formatDistribution: { [key: string]: number };
  }> {
    try {
      if (!fs.existsSync(directory)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          averageSize: 0,
          largestFile: null,
          smallestFile: null,
          formatDistribution: {}
        };
      }

      const files = fs.readdirSync(directory, { withFileTypes: true });
      const imageFiles = files.filter(file => 
        file.isFile() && this.isImageFile(file.name)
      );

      let totalSize = 0;
      let largestFile: { name: string; size: number } | null = null;
      let smallestFile: { name: string; size: number } | null = null;
      const formatDistribution: { [key: string]: number } = {};

      for (const file of imageFiles) {
        const filePath = path.join(directory, file.name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file.name).toLowerCase();

        totalSize += stats.size;
        formatDistribution[ext] = (formatDistribution[ext] || 0) + 1;

        if (!largestFile || stats.size > largestFile.size) {
          largestFile = { name: file.name, size: stats.size };
        }

        if (!smallestFile || stats.size < smallestFile.size) {
          smallestFile = { name: file.name, size: stats.size };
        }
      }

      return {
        totalFiles: imageFiles.length,
        totalSize,
        averageSize: imageFiles.length > 0 ? Math.round(totalSize / imageFiles.length) : 0,
        largestFile,
        smallestFile,
        formatDistribution
      };

    } catch (error) {
      logger.error('Error getting optimization stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        largestFile: null,
        smallestFile: null,
        formatDistribution: {}
      };
    }
  }

  // Private helper methods

  private getOptimalFormat(metadata: sharp.Metadata): 'jpeg' | 'png' | 'webp' {
    // If image has transparency, use PNG
    if (metadata.hasAlpha) {
      return 'png';
    }
    
    // For photos, use JPEG
    if (metadata.channels && metadata.channels >= 3) {
      return 'jpeg';
    }
    
    // Default to JPEG for web
    return 'jpeg';
  }

  private isOptimizedFile(filename: string): boolean {
    return filename.includes('_optimized') || 
           filename.includes('_resized') || 
           filename.includes('_cropped') ||
           filename.includes('_rotated') ||
           filename.includes('_watermarked');
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }
}

export const fileOptimizationService = new FileOptimizationService();