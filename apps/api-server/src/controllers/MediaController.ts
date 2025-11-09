import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { MediaFile } from '../entities/MediaFile.js';
import { MediaFolder } from '../entities/MediaFolder.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
// import sharp from 'sharp'; // Optional - for image processing
import crypto from 'crypto';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');

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
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/x-markdown'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

export class MediaController {
  private get mediaRepository(): Repository<MediaFile> {
    return AppDataSource.getRepository(MediaFile);
  }

  private get folderRepository(): Repository<MediaFolder> {
    return AppDataSource.getRepository(MediaFolder);
  }

  /**
   * Upload single file
   */
  uploadSingle: any[] = [
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        const { folderId, altText, caption, description } = req.body;
        const userId = (req as any).user?.id;

        // Generate URL path - just use filename since we're saving to public/uploads/images
        const fileUrl = `/uploads/images/${req.file.filename}`;

        // Get file metadata
        let metadata: any = {
          size: req.file.size,
          originalName: req.file.originalname
        };

        // If it's an image, store image type info (sharp processing disabled for now)
        if (req.file.mimetype.startsWith('image/')) {
          metadata.isImage = true;
          metadata.imageType = req.file.mimetype.split('/')[1];
          // Note: Image processing with sharp can be enabled later
          // by uncommenting the import and adding thumbnail generation
        }

        // Create media file record
        const mediaFile = this.mediaRepository.create({
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          url: fileUrl,
          mimeType: req.file.mimetype,
          size: req.file.size,
          folderId: folderId || null,
          uploadedBy: userId,
          altText: altText,
          caption,
          description,
          metadata
        });

        const savedFile = await this.mediaRepository.save(mediaFile);

        res.json({
          success: true,
          message: 'File uploaded successfully',
          data: savedFile
        });
      } catch (error: any) {
        // Error log removed
        
        // Clean up uploaded file on error
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            // Error log removed
          }
        }

        res.status(500).json({
          success: false,
          message: 'Failed to upload file',
          error: error.message
        });
      }
    }
  ];

  /**
   * Upload multiple files
   */
  uploadMultiple: any[] = [
    upload.array('files', 10),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No files uploaded'
          });
        }

        const { folderId } = req.body;
        const userId = (req as any).user?.id;
        const uploadedFiles = [];

        for (const file of files) {
          const uploadPath = file.path.replace(process.cwd(), '').replace(/\\/g, '/');
          const fileUrl = `/uploads${uploadPath.split('/uploads')[1]}`;

          let metadata: any = {
            size: file.size,
            originalName: file.originalname
          };

          // Store image metadata (sharp processing disabled for now)
          if (file.mimetype.startsWith('image/')) {
            metadata.isImage = true;
            metadata.imageType = file.mimetype.split('/')[1];
          }

          const mediaFile = this.mediaRepository.create({
            filename: file.filename,
            originalName: file.originalname,
            path: uploadPath,
            url: fileUrl,
            mimeType: file.mimetype,
            size: file.size,
            folderId: folderId || null,
            uploadedBy: userId,
            metadata
          });

          const savedFile = await this.mediaRepository.save(mediaFile);
          uploadedFiles.push(savedFile);
        }

        res.json({
          success: true,
          message: `${uploadedFiles.length} files uploaded successfully`,
          data: uploadedFiles
        });
      } catch (error: any) {
        // Error log removed

        // Clean up uploaded files on error
        if (req.files) {
          const files = req.files as Express.Multer.File[];
          for (const file of files) {
            try {
              await fs.unlink(file.path);
            } catch (unlinkError) {
              // Error log removed
            }
          }
        }

        res.status(500).json({
          success: false,
          message: 'Failed to upload files',
          error: error.message
        });
      }
    }
  ];

  /**
   * Get all media files
   */
  getMedia = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 24,
        per_page = 24,  // Support WordPress-style per_page parameter
        type,
        folderId,
        search,
        sortBy = 'uploadedAt',
        sortOrder = 'DESC'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      // Use per_page if provided (WordPress compatibility), otherwise use limit
      const perPageValue = per_page || limit;
      const limitNum = Math.min(1000, Math.max(1, parseInt(perPageValue as string) || 24));
      const skip = (pageNum - 1) * limitNum;

      const queryBuilder = this.mediaRepository.createQueryBuilder('media')
        .leftJoinAndSelect('media.uploader', 'uploader')
        .leftJoinAndSelect('media.folder', 'folder');

      // Apply filters
      if (type) {
        // Use type-specific flags for more accurate filtering
        if (type === 'image') {
          // Filter by mimeType AND exclude common document extensions
          queryBuilder.andWhere(
            '(media.mimeType LIKE :type AND media.filename NOT LIKE :mdExt AND media.filename NOT LIKE :txtExt AND media.filename NOT LIKE :pdfExt)',
            { type: 'image%', mdExt: '%.md', txtExt: '%.txt', pdfExt: '%.pdf' }
          );
        } else if (type === 'video') {
          queryBuilder.andWhere('media.mimeType LIKE :type', { type: 'video%' });
        } else if (type === 'audio') {
          queryBuilder.andWhere('media.mimeType LIKE :type', { type: 'audio%' });
        } else {
          // For other types, use LIKE matching
          queryBuilder.andWhere('media.mimeType LIKE :type', { type: `${type}%` });
        }
      }

      if (folderId) {
        queryBuilder.andWhere('media.folderId = :folderId', { folderId });
      }

      if (search) {
        queryBuilder.andWhere(
          '(media.filename ILIKE :search OR media.originalName ILIKE :search OR media.altText ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply sorting
      queryBuilder.orderBy(`media.${sortBy}`, sortOrder as 'ASC' | 'DESC');

      // Get total count
      const total = await queryBuilder.getCount();

      // Get paginated results
      const media = await queryBuilder
        .skip(skip)
        .take(limitNum)
        .getMany();

      res.json({
        success: true,
        data: media,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      console.error('MediaController.getMedia error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get media by ID
   */
  getMediaById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const media = await this.mediaRepository.findOne({
        where: { id },
        relations: ['folder', 'uploadedBy']
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      res.json({
        success: true,
        data: media
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media',
        error: error.message
      });
    }
  };

  /**
   * Update media
   */
  updateMedia = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { altText, caption, description, folderId } = req.body;

      const media = await this.mediaRepository.findOne({ where: { id } });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      // Update fields
      if (altText !== undefined) media.altText = altText;
      if (caption !== undefined) media.caption = caption;
      if (description !== undefined) media.description = description;
      if (folderId !== undefined) media.folderId = folderId;

      const updatedMedia = await this.mediaRepository.save(media);

      res.json({
        success: true,
        message: 'Media updated successfully',
        data: updatedMedia
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to update media',
        error: error.message
      });
    }
  };

  /**
   * Replace media file (keeps same URL and ID)
   */
  replaceMedia: any[] = [
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        const media = await this.mediaRepository.findOne({ where: { id } });

        if (!media) {
          return res.status(404).json({
            success: false,
            message: 'Media file not found'
          });
        }

        // Delete old physical file
        try {
          const oldFilePath = path.join(process.cwd(), media.path);
          await fs.unlink(oldFilePath);

          // Delete old thumbnails if they exist
          if (media.metadata?.thumbnail) {
            const thumbnailPath = path.join(process.cwd(), media.metadata.thumbnail as string);
            await fs.unlink(thumbnailPath);
          }
          if (media.metadata?.medium) {
            const mediumPath = path.join(process.cwd(), media.metadata.medium as string);
            await fs.unlink(mediumPath);
          }
        } catch (error) {
          // Old file might not exist, continue
        }

        // Save new file with the SAME filename to keep URL consistent
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
        await fs.mkdir(uploadDir, { recursive: true });

        const newFilePath = path.join(uploadDir, media.filename);
        await fs.writeFile(newFilePath, req.file.buffer);

        // Update metadata
        let metadata: any = {
          size: req.file.size,
          originalName: req.file.originalname,
          replacedAt: new Date().toISOString()
        };

        if (req.file.mimetype.startsWith('image/')) {
          metadata.isImage = true;
          metadata.imageType = req.file.mimetype.split('/')[1];
        }

        // Update database record
        media.mimeType = req.file.mimetype;
        media.size = req.file.size;
        media.metadata = metadata;

        const updatedMedia = await this.mediaRepository.save(media);

        res.json({
          success: true,
          message: 'Media file replaced successfully',
          data: updatedMedia
        });
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          try {
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
            const { id } = req.params;
            const media = await this.mediaRepository.findOne({ where: { id } });
            if (media) {
              const filePath = path.join(uploadDir, media.filename);
              await fs.unlink(filePath);
            }
          } catch (unlinkError) {
            // Ignore cleanup errors
          }
        }

        res.status(500).json({
          success: false,
          message: 'Failed to replace media file',
          error: error.message
        });
      }
    }
  ];

  /**
   * Delete media
   */
  deleteMedia = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const media = await this.mediaRepository.findOne({ where: { id } });

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      // Delete physical file
      try {
        const filePath = path.join(process.cwd(), media.path);
        await fs.unlink(filePath);

        // Delete thumbnail if exists
        if (media.metadata?.thumbnail) {
          const thumbnailPath = path.join(process.cwd(), media.metadata.thumbnail as string);
          await fs.unlink(thumbnailPath);
        }

        // Delete medium size if exists
        if (media.metadata?.medium) {
          const mediumPath = path.join(process.cwd(), media.metadata.medium as string);
          await fs.unlink(mediumPath);
        }
      } catch (error) {
        // Error log removed
      }

      // Delete database record
      await this.mediaRepository.delete(id);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to delete media',
        error: error.message
      });
    }
  };

  /**
   * Create folder
   */
  createFolder = async (req: Request, res: Response) => {
    try {
      const { name, parentId } = req.body;
      const userId = (req as any).user?.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
      }

      // Check if folder with same name exists in parent
      const existingFolder = await this.folderRepository.findOne({
        where: {
          name,
          parentId: parentId || null
        }
      });

      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Folder with this name already exists'
        });
      }

      // Create folder slug
      let folderSlug = name.toLowerCase().replace(/[^a-z0-9]/gi, '-');
      
      if (parentId) {
        const parent = await this.folderRepository.findOne({ where: { id: parentId } });
        if (parent) {
          folderSlug = parent.slug + '/' + folderSlug;
        }
      }

      const folder = this.folderRepository.create({
        name,
        slug: folderSlug,
        parentId: parentId || null
      });

      const savedFolder = await this.folderRepository.save(folder);

      res.json({
        success: true,
        message: 'Folder created successfully',
        data: savedFolder
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to create folder',
        error: error.message
      });
    }
  };

  /**
   * Get folders
   */
  getFolders = async (req: Request, res: Response) => {
    try {
      const { parentId } = req.query;

      const queryBuilder = this.folderRepository.createQueryBuilder('folder');

      if (parentId) {
        queryBuilder.where('folder.parentId = :parentId', { parentId });
      } else {
        queryBuilder.where('folder.parentId IS NULL');
      }

      const folders = await queryBuilder
        .orderBy('folder.name', 'ASC')
        .getMany();

      res.json({
        success: true,
        data: folders,
        total: folders.length
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch folders',
        error: error.message
      });
    }
  };

  /**
   * Delete folder
   */
  deleteFolder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if folder has media files
      const mediaCount = await this.mediaRepository.count({ where: { folderId: id } });
      
      if (mediaCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete folder with media files'
        });
      }

      // Check if folder has subfolders
      const subfolderCount = await this.folderRepository.count({ where: { parentId: id } });
      
      if (subfolderCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete folder with subfolders'
        });
      }

      await this.folderRepository.delete(id);

      res.json({
        success: true,
        message: 'Folder deleted successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to delete folder',
        error: error.message
      });
    }
  };
}