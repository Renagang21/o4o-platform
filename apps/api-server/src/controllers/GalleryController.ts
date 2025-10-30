import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { MediaFile } from '../entities/MediaFile.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import crypto from 'crypto';

// Configure multer for gallery image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'gallery', new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'));
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error: any) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files for gallery
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
    }
  }
});

export class GalleryController {
  private get mediaRepository(): Repository<MediaFile> {
    return AppDataSource.getRepository(MediaFile);
  }

  /**
   * Generate image thumbnails and variants
   */
  private async generateImageVariants(imagePath: string, filename: string): Promise<any> {
    const variants: any = {};
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'gallery');
    
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 300, height: 300 },
      { name: 'medium', width: 768, height: 768 },
      { name: 'large', width: 1024, height: 1024 }
    ];

    for (const size of sizes) {
      try {
        const variantDir = path.join(baseDir, size.name);
        await fs.mkdir(variantDir, { recursive: true });
        
        const variantFilename = `${size.name}-${filename}`;
        const variantPath = path.join(variantDir, variantFilename);
        
        await sharp(imagePath)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toFile(variantPath);
        
        variants[size.name] = `/uploads/gallery/${size.name}/${variantFilename}`;
      } catch (error) {
        // Error log removed
      }
    }

    return variants;
  }

  /**
   * Upload images for gallery
   */
  uploadGalleryImages: any[] = [
    upload.array('files', 10), // Allow up to 10 images at once
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No files uploaded'
          });
        }

        const { folder } = req.body;
        const userId = (req as any).user?.id;
        const uploadedImages = [];

        for (const file of files) {
          // Get image dimensions
          let dimensions = { width: 0, height: 0 };
          try {
            const metadata = await sharp(file.path).metadata();
            dimensions = { width: metadata.width || 0, height: metadata.height || 0 };
          } catch (error) {
            // Error log removed
          }

          // Generate thumbnails and variants
          const variants = await this.generateImageVariants(file.path, file.filename);

          // Generate URL path
          const uploadPath = file.path.replace(process.cwd() + '/public', '').replace(/\\/g, '/');
          const fileUrl = uploadPath;
          const thumbnailUrl = variants.thumbnail || fileUrl;

          // Create media file entity
          const mediaFile = new MediaFile();
          mediaFile.filename = file.filename;
          mediaFile.originalName = file.originalname;
          mediaFile.url = fileUrl;
          mediaFile.mimeType = file.mimetype;
          mediaFile.size = file.size;
          mediaFile.width = dimensions.width;
          mediaFile.height = dimensions.height;
          mediaFile.uploadedBy = userId;
          mediaFile.metadata = {
            thumbnailUrl,
            variants
          };

          if (folder) {
            mediaFile.folderId = folder;
          }

          const savedFile = await this.mediaRepository.save(mediaFile);

          uploadedImages.push({
            id: savedFile.id,
            url: savedFile.url,
            thumbnailUrl,
            filename: savedFile.filename,
            size: savedFile.size,
            width: dimensions.width,
            height: dimensions.height,
            mimeType: savedFile.mimeType,
            alt: savedFile.altText || '',
            caption: savedFile.caption || '',
            uploadedAt: savedFile.uploadedAt
          });
        }

        res.json({
          success: true,
          data: uploadedImages
        });
      } catch (error: any) {
        // Error log removed
        res.status(500).json({
          success: false,
          error: 'Failed to upload gallery images',
          message: error.message
        });
      }
    }
  ];

  /**
   * Get gallery images with pagination
   */
  async getGalleryImages(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        folder = '',
        sortBy = 'uploadedAt',
        order = 'DESC'
      } = req.query;

      const queryBuilder = this.mediaRepository.createQueryBuilder('media');
      
      // Filter only images by MIME type
      queryBuilder.where('media.mimeType LIKE :imageType', { imageType: 'image/%' });

      // Apply search filter
      if (search) {
        queryBuilder.andWhere(
          '(media.filename LIKE :search OR media.altText LIKE :search OR media.caption LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply folder filter
      if (folder) {
        queryBuilder.andWhere('media.folderId = :folder', { folder });
      }

      // Apply sorting
      const validSortFields = ['uploadedAt', 'filename', 'size'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'uploadedAt';
      const sortOrder = (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`media.${sortField}`, sortOrder);

      // Apply pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      queryBuilder.skip(skip).take(limitNum);

      // Execute query
      const [items, total] = await queryBuilder.getManyAndCount();

      // Format response
      const formattedItems = items.map(item => {
        const metadata = item.metadata as any || {};
        return {
          id: item.id,
          url: item.url,
          thumbnailUrl: metadata.thumbnailUrl || item.url,
          filename: item.filename,
          width: metadata.width || 0,
          height: metadata.height || 0,
          size: item.size,
          alt: item.altText || '',
          caption: item.caption || ''
        };
      });

      res.json({
        success: true,
        data: {
          items: formattedItems,
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gallery images',
        message: error.message
      });
    }
  }

  /**
   * Update image metadata (alt text, caption)
   */
  async updateGalleryImage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { alt, caption, description } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media ID format. Expected UUID.',
          code: 'INVALID_UUID'
        });
      }

      const mediaFile = await this.mediaRepository.findOne({ where: { id } });

      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }

      // Update fields if provided
      if (alt !== undefined) mediaFile.altText = alt;
      if (caption !== undefined) mediaFile.caption = caption;
      if (description !== undefined) mediaFile.description = description;

      const updatedFile = await this.mediaRepository.save(mediaFile);

      res.json({
        success: true,
        data: {
          id: updatedFile.id,
          alt: updatedFile.altText,
          caption: updatedFile.caption,
          description: updatedFile.description,
          updatedAt: updatedFile.updatedAt
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update image',
        message: error.message
      });
    }
  }

  /**
   * Delete gallery image
   */
  async deleteGalleryImage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media ID format. Expected UUID.',
          code: 'INVALID_UUID'
        });
      }

      const mediaFile = await this.mediaRepository.findOne({ where: { id } });

      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }

      // Check permissions (only uploader or admin can delete)
      if (mediaFile.uploadedBy !== userId && (req as any).user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Permission denied'
        });
      }

      // Delete physical files
      try {
        const filePath = path.join(process.cwd(), 'public', mediaFile.url);
        await fs.unlink(filePath).catch(() => {});

        // Delete variants if they exist
        const metadata = mediaFile.metadata as any;
        if (metadata?.variants) {
          for (const variant of Object.values(metadata.variants)) {
            if (variant) {
              const variantPath = path.join(process.cwd(), 'public', variant as string);
              await fs.unlink(variantPath).catch(() => {});
            }
          }
        }
      } catch (error) {
        // Error log removed
      }

      // Delete from database
      await this.mediaRepository.remove(mediaFile);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to delete image',
        message: error.message
      });
    }
  }
}