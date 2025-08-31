import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../utils/logger';

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,    // 10MB for images
  video: 100 * 1024 * 1024,   // 100MB for videos
  audio: 50 * 1024 * 1024,    // 50MB for audio
  document: 25 * 1024 * 1024, // 25MB for documents
  default: 10 * 1024 * 1024   // 10MB default
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Videos
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm'
];

// File type detection
const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('sheet') || mimeType.includes('presentation')) {
    return 'document';
  }
  return 'other';
};

// Custom file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = `File type ${file.mimetype} is not allowed`;
    return cb(error);
  }

  // Check file size based on type
  const fileType = getFileType(file.mimetype);
  const sizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
  
  // Note: file.size is not available here in multer's fileFilter
  // Size checking is done in the controller after upload
  
  cb(null, true);
};

// Multer configuration using memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: Math.max(...Object.values(FILE_SIZE_LIMITS)), // Set to highest limit
    files: 10 // Maximum 10 files per request
  }
});

// Upload middleware wrapper
export const uploadMiddleware = (fieldName: string = 'files', maxFiles: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.array(fieldName, maxFiles);
    
    uploadHandler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        let errorMessage = 'File upload error';
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            errorMessage = 'File too large';
            break;
          case 'LIMIT_FILE_COUNT':
            errorMessage = 'Too many files';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            errorMessage = err.message || 'Unexpected file type';
            break;
          case 'LIMIT_PART_COUNT':
            errorMessage = 'Too many parts';
            break;
          case 'LIMIT_FIELD_KEY':
            errorMessage = 'Field name too long';
            break;
          case 'LIMIT_FIELD_VALUE':
            errorMessage = 'Field value too long';
            break;
          case 'LIMIT_FIELD_COUNT':
            errorMessage = 'Too many fields';
            break;
        }
        
        logger.warn('File upload error:', {
          error: err.code,
          message: errorMessage,
          field: err.field
        });
        
        return res.status(400).json({
          success: false,
          error: errorMessage,
          code: err.code
        });
      }
      
      if (err) {
        logger.error('Unexpected upload error:', err);
        return res.status(500).json({
          success: false,
          error: 'Upload failed',
          code: 'UPLOAD_ERROR'
        });
      }
      
      // Additional file size validation after upload
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const fileType = getFileType(file.mimetype);
          const sizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
          
          if (file.size > sizeLimit) {
            return res.status(400).json({
              success: false,
              error: `File "${file.originalname}" exceeds size limit for ${fileType} files (${Math.round(sizeLimit / 1024 / 1024)}MB)`,
              code: 'FILE_TOO_LARGE'
            });
          }
        }
      }
      
      next();
    });
  };
};

// Single file upload middleware
export const uploadSingleMiddleware = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        let errorMessage = 'File upload error';
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            errorMessage = 'File too large';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            errorMessage = err.message || 'Unexpected file type';
            break;
        }
        
        logger.warn('Single file upload error:', {
          error: err.code,
          message: errorMessage
        });
        
        return res.status(400).json({
          success: false,
          error: errorMessage,
          code: err.code
        });
      }
      
      if (err) {
        logger.error('Unexpected single file upload error:', err);
        return res.status(500).json({
          success: false,
          error: 'Upload failed',
          code: 'UPLOAD_ERROR'
        });
      }
      
      // Additional file size validation
      const file = req.file as Express.Multer.File;
      if (file) {
        const fileType = getFileType(file.mimetype);
        const sizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
        
        if (file.size > sizeLimit) {
          return res.status(400).json({
            success: false,
            error: `File exceeds size limit for ${fileType} files (${Math.round(sizeLimit / 1024 / 1024)}MB)`,
            code: 'FILE_TOO_LARGE'
          });
        }
      }
      
      next();
    });
  };
};

// Utility function to ensure upload directories exist
export const ensureUploadDirectories = () => {
  const baseUploadDir = path.join(process.cwd(), 'uploads');
  const categories = ['images', 'videos', 'audio', 'documents', 'others'];
  
  try {
    // Create base upload directory
    if (!fs.existsSync(baseUploadDir)) {
      fs.mkdirSync(baseUploadDir, { recursive: true });
      logger.info('Created base upload directory:', baseUploadDir);
    }
    
    // Create category subdirectories
    categories.forEach(category => {
      const categoryDir = path.join(baseUploadDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
        logger.info(`Created upload directory: ${categoryDir}`);
      }
    });
    
  } catch (error) {
    logger.error('Error ensuring upload directories:', error);
    throw error;
  }
};

// Utility function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  const fileType = getFileType(file.mimetype);
  const sizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
  
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileType,
    sizeLimit,
    isWithinLimit: file.size <= sizeLimit,
    sizeLimitMB: Math.round(sizeLimit / 1024 / 1024)
  };
};

// Cleanup function for temporary files
export const cleanupTempFiles = (files: Express.Multer.File[]) => {
  files.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.debug(`Cleaned up temp file: ${file.path}`);
      } catch (error) {
        logger.warn(`Failed to cleanup temp file ${file.path}:`, error);
      }
    }
  });
};

// Get upload statistics
export const getUploadStats = () => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const categories = ['images', 'videos', 'audio', 'documents', 'others'];
    
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byCategory: {}
    };
    
    categories.forEach(category => {
      const categoryDir = path.join(uploadDir, category);
      if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir);
        let categorySize = 0;
        
        files.forEach(file => {
          const filePath = path.join(categoryDir, file);
          if (fs.lstatSync(filePath).isFile()) {
            const size = fs.statSync(filePath).size;
            categorySize += size;
            stats.totalSize += size;
            stats.totalFiles++;
          }
        });
        
        stats.byCategory[category] = {
          fileCount: files.length,
          totalSize: categorySize,
          totalSizeMB: Math.round(categorySize / 1024 / 1024 * 100) / 100
        };
      } else {
        stats.byCategory[category] = {
          fileCount: 0,
          totalSize: 0,
          totalSizeMB: 0
        };
      }
    });
    
    return {
      ...stats,
      totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100
    };
  } catch (error) {
    logger.error('Error getting upload stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      totalSizeMB: 0,
      byCategory: {}
    };
  }
};

export { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS, getFileType };