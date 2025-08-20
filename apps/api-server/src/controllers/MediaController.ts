import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { MediaFile } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
// import sharp from 'sharp'; // Optional - for image processing
import crypto from 'crypto';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'));
    
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
      'text/csv'
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

        // Generate URL path
        const uploadPath = req.file.path.replace(process.cwd(), '').replace(/\\/g, '/');
        const fileUrl = `/uploads${uploadPath.split('/uploads')[1]}`;

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
          path: uploadPath,
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
        console.error('Error uploading file:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
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
        console.error('Error uploading files:', error);

        // Clean up uploaded files on error
        if (req.files) {
          const files = req.files as Express.Multer.File[];
          for (const file of files) {
            try {
              await fs.unlink(file.path);
            } catch (unlinkError) {
              console.error('Error deleting file:', unlinkError);
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
        type,
        folderId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const queryBuilder = this.mediaRepository.createQueryBuilder('media');

      // Apply filters
      if (type) {
        queryBuilder.andWhere('media.mimeType LIKE :type', { type: `${type}%` });
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
      console.error('Error fetching media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media',
        error: error.message
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
      console.error('Error fetching media:', error);
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
      console.error('Error updating media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update media',
        error: error.message
      });
    }
  };

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
        console.error('Error deleting physical file:', error);
      }

      // Delete database record
      await this.mediaRepository.delete(id);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting media:', error);
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
      console.error('Error creating folder:', error);
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
      console.error('Error fetching folders:', error);
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
      console.error('Error deleting folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete folder',
        error: error.message
      });
    }
  };
}