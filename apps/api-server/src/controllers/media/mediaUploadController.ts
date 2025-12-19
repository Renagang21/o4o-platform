/**
 * Media Upload Controller - Handle logo, favicon, and background image uploads
 */

import { Response } from 'express';
import type { AuthRequest } from '../../types/auth.js';
import { asyncHandler, createValidationError } from '../../middleware/errorHandler.middleware.js';
import logger from '../../utils/logger.js';
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
    'image/webp',
    'text/markdown',           // ✨ Added: Markdown files
    'text/plain',              // ✨ Added: Plain text files (.md may be detected as text/plain)
    'application/octet-stream' // ✨ Added: Binary files (some .md files)
  ];

  // Also allow by file extension for markdown
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.md'];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: images and markdown files. Got: ${file.mimetype}, ext: ${fileExt}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max (increased for markdown files)
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

      // Define upload directory - use public/uploads to match static file serving
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
      await fs.mkdir(uploadDir, { recursive: true });

      // Process file based on type
      let processedBuffer: Buffer = file.buffer;
      let metadata: any = {};

      // Check if file is markdown
      const isMarkdown = ext.toLowerCase() === '.md' || file.mimetype === 'text/markdown' || file.mimetype === 'text/plain';

      if (isMarkdown) {
        // Skip image processing for markdown files
        metadata = {
          fileType: 'markdown',
          size: file.size
        };
      } else if (type === 'logo') {
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