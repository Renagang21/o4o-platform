import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Media } from '../../entities/Media';
import { User } from '../../entities/User';
import logger from '../../utils/logger';
import { Like } from 'typeorm';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

export class MediaController {
  private get mediaRepository() {
    return AppDataSource.getRepository(Media);
  }
  
  private get userRepository() {
    return AppDataSource.getRepository(User);
  }

  // POST /api/media/upload - 파일 업로드
  uploadMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
        return;
      }

      const uploadedMedia = [];

      for (const file of files) {
        try {
          // Validate file type
          const allowedTypes = ['image/', 'application/pdf', 'text/', 'video/', 'audio/'];
          const isAllowedType = allowedTypes.some(type => file.mimetype.startsWith(type));

          if (!isAllowedType) {
            logger.warn(`Rejected file upload: ${file.originalname} (${file.mimetype})`);
            continue;
          }

          // Determine file category and upload path
          const fileCategory = this.getFileCategory(file.mimetype);
          const uploadDir = path.join(process.cwd(), 'uploads', fileCategory);
          
          // Ensure upload directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Generate unique filename
          const fileExtension = path.extname(file.originalname);
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
          const filePath = path.join(uploadDir, fileName);

          // Save file
          fs.writeFileSync(filePath, file.buffer);

          // Get file stats
          const stats = fs.statSync(filePath);
          let width, height;

          // Generate thumbnails for images
          let variants = {};
          if (file.mimetype.startsWith('image/')) {
            try {
              const metadata = await sharp(filePath).metadata();
              width = metadata.width;
              height = metadata.height;

              // Generate image variants
              variants = await this.generateImageVariants(filePath, fileName, fileCategory);
            } catch (sharpError) {
              logger.error('Error processing image:', sharpError);
            }
          }

          // Create media record
          const media = this.mediaRepository.create({
            filename: fileName,
            originalFilename: file.originalname,
            url: `/uploads/${fileCategory}/${fileName}`,
            thumbnailUrl: (variants as any).thumbnail || null,
            mimeType: file.mimetype,
            size: stats.size,
            width,
            height,
            folderPath: `/${fileCategory}`,
            userId,
            variants: Object.keys(variants).length > 0 ? variants : null
          });

          const savedMedia = await this.mediaRepository.save(media);
          uploadedMedia.push(this.formatMediaResponse(savedMedia));

        } catch (fileError) {
          logger.error(`Error processing file ${file.originalname}:`, fileError);
          continue;
        }
      }

      if (uploadedMedia.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid files were uploaded'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          media: uploadedMedia,
          uploadedCount: uploadedMedia.length,
          totalFiles: files.length
        }
      });

    } catch (error) {
      logger.error('Error uploading media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload media'
      });
    }
  };

  // GET /api/media - 미디어 목록
  getMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      // Debug: Check if AppDataSource is initialized
      if (!AppDataSource.isInitialized) {
        logger.error('AppDataSource is not initialized');
        res.status(500).json({
          success: false,
          error: 'Database not initialized'
        });
        return;
      }
      
      logger.info('AppDataSource is initialized, proceeding with query');
      const {
        page = 1,
        limit = 20,
        search,
        mimeType,
        folder,
        userId,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const queryBuilder = this.mediaRepository
        .createQueryBuilder('media')
        .leftJoinAndSelect('media.user', 'user');

      // Search filter
      if (search) {
        queryBuilder.andWhere(
          '(media.filename ILIKE :search OR media.originalFilename ILIKE :search OR media.altText ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // MIME type filter
      if (mimeType) {
        if (mimeType === 'image') {
          queryBuilder.andWhere('media.mimeType LIKE :mimeType', { mimeType: 'image/%' });
        } else if (mimeType === 'video') {
          queryBuilder.andWhere('media.mimeType LIKE :mimeType', { mimeType: 'video/%' });
        } else if (mimeType === 'audio') {
          queryBuilder.andWhere('media.mimeType LIKE :mimeType', { mimeType: 'audio/%' });
        } else if (mimeType === 'document') {
          queryBuilder.andWhere(
            '(media.mimeType LIKE :pdf OR media.mimeType LIKE :doc OR media.mimeType LIKE :text)',
            { pdf: 'application/pdf', doc: 'application/%', text: 'text/%' }
          );
        } else {
          queryBuilder.andWhere('media.mimeType = :mimeType', { mimeType });
        }
      }

      // Folder filter
      if (folder) {
        queryBuilder.andWhere('media.folderPath = :folder', { folder });
      }

      // User filter
      if (userId) {
        queryBuilder.andWhere('media.userId = :userId', { userId });
      }

      // Ordering
      const allowedOrderBy = ['created_at', 'updated_at', 'filename', 'originalFilename', 'size'];
      const orderByField = allowedOrderBy.includes(orderBy as string) ? orderBy : 'created_at';
      const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';
      
      queryBuilder.orderBy(`media.${orderByField}`, orderDirection);

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [media, total] = await queryBuilder.getManyAndCount();

      // Calculate storage stats
      const storageStats = await this.getStorageStats();

      res.json({
        success: true,
        data: {
          media: media.map(item => this.formatMediaResponse(item)),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          },
          stats: storageStats
        }
      });

    } catch (error) {
      logger.error('Error getting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve media'
      });
    }
  };

  // GET /api/media/:id - 미디어 상세
  getMediaById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const media = await this.mediaRepository
        .createQueryBuilder('media')
        .leftJoinAndSelect('media.user', 'user')
        .where('media.id = :id', { id })
        .getOne();

      if (!media) {
        res.status(404).json({
          success: false,
          error: 'Media not found'
        });
        return;
      }

      // Get usage information (where this media is used)
      const usage = await this.getMediaUsage(id);

      res.json({
        success: true,
        data: {
          media: this.formatMediaResponse(media),
          usage
        }
      });

    } catch (error) {
      logger.error('Error getting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve media'
      });
    }
  };

  // PUT /api/media/:id - 미디어 정보 수정
  updateMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        altText,
        caption,
        description,
        folderPath
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const media = await this.mediaRepository.findOne({ where: { id } });

      if (!media) {
        res.status(404).json({
          success: false,
          error: 'Media not found'
        });
        return;
      }

      // Update media properties
      if (altText !== undefined) media.altText = altText;
      if (caption !== undefined) media.caption = caption;
      if (description !== undefined) media.description = description;
      if (folderPath !== undefined) media.folderPath = folderPath;

      media.updatedAt = new Date();

      const savedMedia = await this.mediaRepository.save(media);

      // Load complete media with relations
      const completeMedia = await this.mediaRepository
        .createQueryBuilder('media')
        .leftJoinAndSelect('media.user', 'user')
        .where('media.id = :id', { id: savedMedia.id })
        .getOne();

      res.json({
        success: true,
        data: {
          media: this.formatMediaResponse(completeMedia!)
        }
      });

    } catch (error) {
      logger.error('Error updating media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update media'
      });
    }
  };

  // DELETE /api/media/:id - 미디어 삭제
  deleteMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { deleteFiles = true } = req.query;

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const media = await this.mediaRepository.findOne({ where: { id } });

      if (!media) {
        res.status(404).json({
          success: false,
          error: 'Media not found'
        });
        return;
      }

      // Check if media is in use
      const usage = await this.getMediaUsage(id);
      if (usage.posts.length > 0 || usage.pages.length > 0) {
        res.status(409).json({
          success: false,
          error: 'Media is currently in use and cannot be deleted',
          data: { usage }
        });
        return;
      }

      // Delete physical files if requested
      if (deleteFiles === 'true') {
        try {
          const filePath = path.join(process.cwd(), 'uploads', media.folderPath?.substring(1) || '', media.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          // Delete variants
          if (media.variants) {
            for (const [size, url] of Object.entries(media.variants)) {
              const variantPath = path.join(process.cwd(), 'uploads', url.replace('/uploads/', ''));
              if (fs.existsSync(variantPath)) {
                fs.unlinkSync(variantPath);
              }
            }
          }
        } catch (fileError) {
          logger.error('Error deleting physical files:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      await this.mediaRepository.remove(media);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete media'
      });
    }
  };

  // Private helper methods

  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'documents';
    return 'others';
  }

  private async generateImageVariants(
    originalPath: string, 
    fileName: string, 
    category: string
  ): Promise<Record<string, string>> {
    const variants = {};
    const baseName = path.parse(fileName).name;
    const extension = path.parse(fileName).ext;

    const sizes = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 300, height: 300 },
      medium: { width: 768, height: 768 },
      large: { width: 1024, height: 1024 }
    };

    try {
      for (const [sizeName, dimensions] of Object.entries(sizes)) {
        const variantFileName = `${baseName}-${sizeName}${extension}`;
        const variantPath = path.join(process.cwd(), 'uploads', category, variantFileName);

        await sharp(originalPath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(variantPath);

        variants[sizeName] = `/uploads/${category}/${variantFileName}`;
      }
    } catch (error) {
      logger.error('Error generating image variants:', error);
    }

    return variants;
  }

  private async getStorageStats() {
    try {
      const stats = await this.mediaRepository
        .createQueryBuilder('media')
        .select([
          'COUNT(*) as totalFiles',
          'SUM(media.size) as totalSize',
          'COUNT(CASE WHEN media.mimeType LIKE \'image/%\' THEN 1 END) as imageCount',
          'COUNT(CASE WHEN media.mimeType LIKE \'video/%\' THEN 1 END) as videoCount',
          'COUNT(CASE WHEN media.mimeType LIKE \'audio/%\' THEN 1 END) as audioCount',
          'COUNT(CASE WHEN media.mimeType = \'application/pdf\' OR media.mimeType LIKE \'text/%\' THEN 1 END) as documentCount'
        ])
        .getRawOne();

      return {
        totalFiles: parseInt(stats.totalFiles) || 0,
        totalSize: parseInt(stats.totalSize) || 0,
        totalSizeMB: Math.round((parseInt(stats.totalSize) || 0) / 1024 / 1024 * 100) / 100,
        breakdown: {
          images: parseInt(stats.imageCount) || 0,
          videos: parseInt(stats.videoCount) || 0,
          audio: parseInt(stats.audioCount) || 0,
          documents: parseInt(stats.documentCount) || 0
        }
      };
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: 0,
        breakdown: { images: 0, videos: 0, audio: 0, documents: 0 }
      };
    }
  }

  private async getMediaUsage(mediaId: string) {
    // This is a simplified version - in a real implementation,
    // you'd need to scan post/page content for media references
    
    try {
      const postRepository = AppDataSource.getRepository('Post');
      const pageRepository = AppDataSource.getRepository('Page');

      // Find posts that reference this media
      const posts = await postRepository
        .createQueryBuilder('post')
        .where('post.content::text LIKE :mediaId OR post.featuredImage = :mediaUrl', {
          mediaId: `%${mediaId}%`,
          mediaUrl: `/uploads/%/${mediaId}%`
        })
        .select(['post.id', 'post.title', 'post.slug'])
        .getMany();

      // Find pages that reference this media
      const pages = await pageRepository
        .createQueryBuilder('page')
        .where('page.content::text LIKE :mediaId', {
          mediaId: `%${mediaId}%`
        })
        .select(['page.id', 'page.title', 'page.slug'])
        .getMany();

      return {
        posts: posts || [],
        pages: pages || [],
        totalUsages: (posts?.length || 0) + (pages?.length || 0)
      };
    } catch (error) {
      logger.error('Error getting media usage:', error);
      return { posts: [], pages: [], totalUsages: 0 };
    }
  }

  private formatMediaResponse(media: any): any {
    return {
      id: media.id,
      filename: media.filename,
      originalFilename: media.originalFilename,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      mimeType: media.mimeType,
      size: media.size,
      sizeFormatted: this.formatFileSize(media.size),
      width: media.width,
      height: media.height,
      altText: media.altText,
      caption: media.caption,
      description: media.description,
      folderPath: media.folderPath,
      variants: media.variants,
      uploadedBy: media.user ? {
        id: media.user.id,
        name: media.user.name,
        email: media.user.email
      } : null,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      isImage: media.mimeType?.startsWith('image/') || false,
      isVideo: media.mimeType?.startsWith('video/') || false,
      isAudio: media.mimeType?.startsWith('audio/') || false,
      isDocument: media.mimeType === 'application/pdf' || media.mimeType?.startsWith('text/') || false
    };
  }

  private formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}