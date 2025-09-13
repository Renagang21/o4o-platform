/**
 * Media Upload Controller - Handle logo, favicon, and background image uploads
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { asyncHandler, createValidationError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import crypto from 'crypto';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/x-icon',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

export class MediaUploadController {
  /**
   * Upload media file (logo, favicon, background)
   */
  static uploadMedia = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const file = req.file;
    const { type = 'general' } = req.body;

    if (!file) {
      throw createValidationError('No file uploaded');
    }

    try {
      // Generate unique filename
      const hash = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `${type}_${timestamp}_${hash}${ext}`;

      // Define upload directory
      const uploadDir = path.join(process.cwd(), 'uploads', type);
      await fs.mkdir(uploadDir, { recursive: true });

      // Process image based on type
      let processedBuffer: Buffer = file.buffer;
      let metadata: any = {};

      if (type === 'logo') {
        // Resize logo to reasonable dimensions
        const processed = await sharp(file.buffer)
          .resize(400, 200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
        processedBuffer = processed;
        
        const info = await sharp(processedBuffer).metadata();
        metadata = { width: info.width, height: info.height };
        
      } else if (type === 'favicon') {
        // Create multiple favicon sizes
        const sizes = [16, 32, 48];
        const favicons = [];
        
        for (const size of sizes) {
          const resized = await sharp(file.buffer)
            .resize(size, size)
            .toBuffer();
          
          const sizedFilename = `favicon_${size}x${size}_${timestamp}_${hash}.png`;
          const sizedPath = path.join(uploadDir, sizedFilename);
          await fs.writeFile(sizedPath, resized);
          
          favicons.push({
            size: `${size}x${size}`,
            url: `/uploads/${type}/${sizedFilename}`
          });
        }
        
        metadata = { favicons };
        
      } else if (type === 'background') {
        // Optimize background image
        const processed = await sharp(file.buffer)
          .resize(1920, 1080, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        processedBuffer = processed;
        
        const info = await sharp(processedBuffer).metadata();
        metadata = { width: info.width, height: info.height };
      }

      // Save processed file
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, processedBuffer);

      // Generate URL
      const url = `/uploads/${type}/${filename}`;

      // Save to database (mock)
      const mediaRecord = {
        id: `media_${timestamp}`,
        userId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: processedBuffer.length,
        type,
        url,
        metadata,
        createdAt: new Date()
      };

      logger.info('Media uploaded successfully', { 
        userId, 
        type, 
        filename,
        size: processedBuffer.length 
      });

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: mediaRecord.id,
          url: mediaRecord.url,
          filename: mediaRecord.filename,
          type: mediaRecord.type,
          metadata: mediaRecord.metadata
        }
      });
    } catch (error) {
      logger.error('Media upload error', { error, userId, type });
      throw createValidationError('Failed to upload file');
    }
  });

  /**
   * Delete media file
   */
  static deleteMedia = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { mediaId } = req.params;

    // TODO: Verify ownership and delete file
    
    logger.info('Media deleted', { userId, mediaId });
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  });

  /**
   * Get user's media library
   */
  static getMediaLibrary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { type, page = 1, limit = 20 } = req.query;

    // TODO: Fetch from database
    const media = [
      {
        id: 'media_1',
        url: '/uploads/logo/example.png',
        filename: 'example.png',
        type: 'logo',
        createdAt: new Date()
      }
    ];

    logger.info('Media library fetched', { userId, type });
    
    res.json({
      success: true,
      data: media,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: media.length
      }
    });
  });
}

export default MediaUploadController;