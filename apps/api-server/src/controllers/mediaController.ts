import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { MediaFile, MediaSize } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
import { User } from '../entities/User';
import { ImageProcessingService } from '../services/imageProcessingService';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export class MediaController {
  private mediaFileRepository = AppDataSource.getRepository(MediaFile);
  private mediaFolderRepository = AppDataSource.getRepository(MediaFolder);
  private userRepository = AppDataSource.getRepository(User);

  // Multer configuration for file uploads
  private upload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = ImageProcessingService.generateUploadPath(
          process.env.UPLOAD_DIR || './uploads'
        );
        await ImageProcessingService.ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Allow images and some document types
      const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });

  // GET /api/admin/media
  async getMediaFiles(req: Request, res: Response) {
    try {
      const {
        page = 1,
        pageSize = 50,
        folderId,
        type,
        search,
        orderBy = 'uploadedAt',
        order = 'desc'
      } = req.query;

      const queryBuilder = this.mediaFileRepository
        .createQueryBuilder('media')
        .leftJoinAndSelect('media.uploader', 'uploader')
        .leftJoinAndSelect('media.folder', 'folder');

      // Apply filters
      if (folderId) {
        queryBuilder.andWhere('media.folderId = :folderId', { folderId });
      }

      if (type) {
        if (type === 'image') {
          queryBuilder.andWhere('media.mimeType LIKE :type', { type: 'image/%' });
        } else if (type === 'document') {
          queryBuilder.andWhere('media.mimeType NOT LIKE :type', { type: 'image/%' });
        }
      }

      if (search) {
        queryBuilder.andWhere(
          '(media.originalName ILIKE :search OR media.altText ILIKE :search OR media.caption ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply ordering
      const validOrderFields = ['originalName', 'uploadedAt', 'size', 'downloads'];
      const orderField = validOrderFields.includes(orderBy as string) ? orderBy as string : 'uploadedAt';
      const orderDirection = order === 'asc' ? 'ASC' : 'DESC';
      
      queryBuilder.orderBy(`media.${orderField}`, orderDirection);

      // Apply pagination
      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      const [mediaFiles, totalItems] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(totalItems / Number(pageSize));

      res.json({
        success: true,
        data: mediaFiles,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems,
          pageSize: Number(pageSize),
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching media files:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media files',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/media/:id
  async getMediaFile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const mediaFile = await this.mediaFileRepository.findOne({
        where: { id },
        relations: ['uploader', 'folder']
      });

      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      // Increment download count for tracking
      await this.mediaFileRepository.update(id, {
        downloads: mediaFile.downloads + 1,
        lastAccessed: new Date()
      });

      res.json({
        success: true,
        data: mediaFile
      });
    } catch (error) {
      console.error('Error fetching media file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/media/upload
  async uploadFiles(req: Request, res: Response) {
    const uploadMiddleware = this.upload.array('files', 10); // Max 10 files

    uploadMiddleware(req as any, res as any, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }

      try {
        const files = req.files as Express.Multer.File[];
        interface AuthRequest extends Request {
          user?: {
            id: string;
          };
        }
        const userId = (req as AuthRequest).user?.id;
        const { folderId } = req.body;

        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No files uploaded'
          });
        }

        const results = [];
        const tempFiles: string[] = [];

        for (const file of files) {
          try {
            tempFiles.push(file.path);

            const isImage = file.mimetype.startsWith('image/');
            let mediaFile: Partial<MediaFile> = {
              id: uuidv4(),
              filename: file.filename,
              originalName: file.originalname,
              url: `/uploads/${path.relative(process.env.UPLOAD_DIR || './uploads', file.path)}`,
              path: file.path,
              mimeType: file.mimetype,
              size: file.size,
              folderId: folderId || null,
              uploadedBy: userId,
              downloads: 0
            };

            if (isImage) {
              // Validate image
              const validation = await ImageProcessingService.validateImage(file.path);
              if (!validation.isValid) {
                results.push({
                  filename: file.originalname,
                  success: false,
                  error: validation.error
                });
                continue;
              }

              // Process image into multiple formats and sizes
              const uploadDir = path.dirname(file.path);
              const processedImages = await ImageProcessingService.processImage({
                originalPath: file.path,
                filename: file.filename,
                uploadPath: uploadDir,
                formats: ['webp', 'avif', 'jpg']
              });

              // Update media file with processed image data
              mediaFile = {
                ...mediaFile,
                width: processedImages.originalDimensions.width,
                height: processedImages.originalDimensions.height,
                sizes: processedImages.sizes,
                formats: processedImages.formats,
                metadata: validation.metadata as unknown as Record<string, unknown>
              };

              // Remove original uploaded file (we have processed versions)
              await fs.unlink(file.path);
            }

            // Save to database
            const savedMediaFile = await this.mediaFileRepository.save(mediaFile);

            // Get complete media file with relations
            const completeMediaFile = await this.mediaFileRepository.findOne({
              where: { id: savedMediaFile.id },
              relations: ['uploader', 'folder']
            });

            results.push({
              filename: file.originalname,
              success: true,
              data: completeMediaFile
            });

          } catch (fileError) {
            console.error(`Error processing file ${file.originalname}:`, fileError);
            results.push({
              filename: file.originalname,
              success: false,
              error: fileError instanceof Error ? fileError.message : 'Processing failed'
            });
          }
        }

        // Clean up any remaining temp files
        await ImageProcessingService.cleanupTempFiles(tempFiles);

        const successCount = results.filter((r: any) => r.success).length;
        const failureCount = results.filter((r: any) => !r.success).length;

        res.status(201).json({
          success: true,
          message: `${successCount} files uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          data: results
        });

      } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload files',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // PUT /api/admin/media/:id
  async updateMediaFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { altText, caption, description, folderId } = req.body;

      const mediaFile = await this.mediaFileRepository.findOne({ where: { id } });
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      await this.mediaFileRepository.update(id, {
        altText,
        caption,
        description,
        folderId
      });

      const updatedMediaFile = await this.mediaFileRepository.findOne({
        where: { id },
        relations: ['uploader', 'folder']
      });

      res.json({
        success: true,
        data: updatedMediaFile,
        message: 'Media file updated successfully'
      });
    } catch (error) {
      console.error('Error updating media file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update media file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/media/:id
  async deleteMediaFile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const mediaFile = await this.mediaFileRepository.findOne({ where: { id } });
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found'
        });
      }

      // Delete physical files
      const filesToDelete: string[] = [];

      if (mediaFile.path) {
        filesToDelete.push(mediaFile.path);
      }

      // Delete all processed image variants
      if (mediaFile.formats) {
        Object.values(mediaFile.formats).forEach((formatSizes: any) => {
          if (formatSizes) {
            Object.values(formatSizes).forEach((size) => {
              const typedSize = size as MediaSize;
              if (typedSize && typedSize.url) {
                const fullPath = path.join(process.env.UPLOAD_DIR || './uploads', typedSize.url.replace('/uploads/', ''));
                filesToDelete.push(fullPath);
              }
            });
          }
        });
      }

      // Delete files from filesystem
      await Promise.all(
        filesToDelete.map(async (filePath) => {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.warn(`Failed to delete file ${filePath}:`, error);
          }
        })
      );

      // Delete from database
      await this.mediaFileRepository.delete(id);

      res.json({
        success: true,
        message: 'Media file deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting media file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete media file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/media/bulk
  async bulkDeleteMediaFiles(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Media file IDs are required'
        });
      }

      const mediaFiles = await this.mediaFileRepository.findByIds(ids);
      const filesToDelete: string[] = [];

      // Collect all files to delete
      mediaFiles.forEach((mediaFile: any) => {
        if (mediaFile.path) {
          filesToDelete.push(mediaFile.path);
        }

        if (mediaFile.formats) {
          Object.values(mediaFile.formats).forEach((formatSizes: any) => {
            if (formatSizes) {
              Object.values(formatSizes).forEach((size) => {
                const typedSize = size as MediaSize;
                if (typedSize && typedSize.url) {
                  const fullPath = path.join(process.env.UPLOAD_DIR || './uploads', typedSize.url.replace('/uploads/', ''));
                  filesToDelete.push(fullPath);
                }
              });
            }
          });
        }
      });

      // Delete files from filesystem
      await Promise.all(
        filesToDelete.map(async (filePath) => {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.warn(`Failed to delete file ${filePath}:`, error);
          }
        })
      );

      // Delete from database
      const result = await this.mediaFileRepository.delete(ids);

      res.json({
        success: true,
        message: `${result.affected || 0} media files deleted successfully`,
        deletedCount: result.affected || 0
      });
    } catch (error) {
      console.error('Error bulk deleting media files:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk delete media files',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/media/folders
  async getMediaFolders(req: Request, res: Response) {
    try {
      const folders = await this.mediaFolderRepository.find({
        relations: ['parent', 'children'],
        order: { name: 'ASC' }
      });

      // Build hierarchical tree
      interface FolderTree extends MediaFolder {
        children: FolderTree[];
      }

      const buildTree = (parentId: string | null): FolderTree[] => {
        return folders
          .filter((folder: any) => folder.parentId === parentId)
          .map((folder: any) => ({
            ...folder,
            children: buildTree(folder.id)
          }));
      };

      const tree = buildTree(null);

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Error fetching media folders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media folders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/media/folders
  async createMediaFolder(req: Request, res: Response) {
    try {
      const { name, parentId } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
      }

      // Generate unique slug
      let slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      let counter = 1;
      let testSlug = slug;
      while (await this.mediaFolderRepository.findOne({ where: { slug: testSlug } })) {
        testSlug = `${slug}-${counter}`;
        counter++;
      }

      const folder = this.mediaFolderRepository.create({
        name: name.trim(),
        slug: testSlug,
        parentId: parentId || null,
        fileCount: 0,
        totalSize: 0
      });

      const savedFolder = await this.mediaFolderRepository.save(folder);

      res.status(201).json({
        success: true,
        data: savedFolder,
        message: 'Folder created successfully'
      });
    } catch (error) {
      console.error('Error creating media folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create media folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/admin/media/folders/:id
  async updateMediaFolder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, parentId } = req.body;

      const folder = await this.mediaFolderRepository.findOne({ where: { id } });
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      const updates: Record<string, unknown> = {};

      if (name && name.trim() !== folder.name) {
        updates.name = name.trim();
      }

      if (parentId !== folder.parentId) {
        // Prevent circular references
        if (parentId === id) {
          return res.status(400).json({
            success: false,
            message: 'Folder cannot be its own parent'
          });
        }
        updates.parentId = parentId || null;
      }

      if (Object.keys(updates).length > 0) {
        await this.mediaFolderRepository.update(id, updates);
      }

      const updatedFolder = await this.mediaFolderRepository.findOne({
        where: { id },
        relations: ['parent', 'children']
      });

      res.json({
        success: true,
        data: updatedFolder,
        message: 'Folder updated successfully'
      });
    } catch (error) {
      console.error('Error updating media folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update media folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/media/folders/:id
  async deleteMediaFolder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const folder = await this.mediaFolderRepository.findOne({
        where: { id },
        relations: ['children']
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // Check if folder has children
      if (folder.children && folder.children.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete folder with subfolders. Please delete or move subfolders first.',
          childCount: folder.children.length
        });
      }

      // Check if folder has files
      const fileCount = await this.mediaFileRepository.count({ where: { folderId: id } });
      if (fileCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete folder with files. Please delete or move files first.',
          fileCount
        });
      }

      await this.mediaFolderRepository.delete(id);

      res.json({
        success: true,
        message: 'Folder deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting media folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete media folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/media/optimize/:id
  async getOptimizedImage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { size = 'medium', format } = req.query;

      const mediaFile = await this.mediaFileRepository.findOne({ where: { id } });
      if (!mediaFile || !mediaFile.formats) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found or not an image'
        });
      }

      // Determine client capabilities from Accept header
      const acceptHeader = req.headers.accept || '';
      const clientSupports = {
        avif: acceptHeader.includes('image/avif'),
        webp: acceptHeader.includes('image/webp')
      };

      // Get optimized URL
      const optimizedUrl = ImageProcessingService.getOptimizedImageUrl(
        mediaFile.formats,
        size as string,
        clientSupports
      );

      if (!optimizedUrl) {
        return res.status(404).json({
          success: false,
          message: 'Optimized image not found'
        });
      }

      // Redirect to the optimized image
      res.redirect(optimizedUrl);
    } catch (error) {
      console.error('Error getting optimized image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get optimized image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}