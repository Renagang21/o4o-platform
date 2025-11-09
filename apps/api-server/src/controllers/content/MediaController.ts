import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Media } from '../../entities/Media.js';
import { User } from '../../entities/User.js';
import logger from '../../utils/logger.js';
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
      // Temporarily allow upload without authentication for admin dashboard
      const userId = req.user?.id || null;

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
          const allowedTypes = ['image/', 'application/pdf', 'application/json', 'text/', 'video/', 'audio/', 'application/octet-stream'];
          const isAllowedType = allowedTypes.some(type => file.mimetype.startsWith(type));

          if (!isAllowedType) {
            logger.warn(`Rejected file upload: ${file.originalname} (${file.mimetype})`);
            continue;
          }

          // Additional validation for application/octet-stream
          if (file.mimetype === 'application/octet-stream') {
            const allowedExtensions = ['.json', '.txt', '.md', '.csv', '.log', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov', '.avi', '.mp3', '.wav', '.ogg', '.pdf'];
            const ext = path.extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
              logger.warn(`Rejected octet-stream file with disallowed extension: ${file.originalname}`);
              continue;
            }
          }

          // Determine file category and upload path
          const fileCategory = this.getFileCategory(file.mimetype);
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', fileCategory);
          
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
      const {
        page = 1,
        limit = 20,
        search,
        mimeType,
        type, // Accept 'type' as alias for 'mimeType' (for frontend compatibility)
        folder,
        userId,
        orderBy = 'createdAt',
        order = 'DESC'
      } = req.query;

      // Build where conditions
      const where: any = {};

      // User filter
      if (userId) {
        where.userId = userId;
      }

      // Folder filter
      if (folder) {
        where.folderPath = folder;
      }

      // MIME type filter - accept both 'mimeType' and 'type' parameters
      // Use 'type' if provided, otherwise fall back to 'mimeType'
      // Note: document type filter is handled separately using query builder
      // because it requires OR conditions (text/* OR application/pdf)
      const filterType = type || mimeType;
      let useQueryBuilder = false;
      if (filterType) {
        if (filterType === 'image') {
          // For images, we need to exclude document files that might have been
          // incorrectly uploaded with image-like extensions
          // Use query builder to add NOT LIKE conditions for document extensions
          useQueryBuilder = true;
        } else if (filterType === 'video') {
          where.mimeType = Like('video/%');
        } else if (filterType === 'audio') {
          where.mimeType = Like('audio/%');
        } else if (filterType === 'document') {
          useQueryBuilder = true;
        } else {
          where.mimeType = filterType;
        }
      }

      // Search filter - handled separately since it involves multiple fields
      if (search) {
        // For search, we'll get all records first then filter
        // This is not ideal for large datasets but will work for now
      }

      // Ordering
      const allowedOrderBy = ['createdAt', 'updatedAt', 'filename', 'originalFilename', 'size'];
      const orderByField = allowedOrderBy.includes(orderBy as string) ? orderBy : 'createdAt';
      const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';

      // Get total count and media list
      let total: number;
      let media: Media[];
      const skip = (Number(page) - 1) * Number(limit);

      if (useQueryBuilder) {
        // Use query builder for filters that require complex WHERE conditions
        const queryBuilder = this.mediaRepository.createQueryBuilder('media')
          .leftJoinAndSelect('media.user', 'user'); // Join user for author info

        // Apply type-specific filters
        if (filterType === 'image') {
          // For image type: filter by mimeType AND exclude document extensions
          queryBuilder.where('media.mimeType LIKE :imageType', { imageType: 'image/%' })
            .andWhere('media.filename NOT LIKE :mdExt', { mdExt: '%.md' })
            .andWhere('media.filename NOT LIKE :txtExt', { txtExt: '%.txt' })
            .andWhere('media.filename NOT LIKE :pdfExt', { pdfExt: '%.pdf' });
        } else if (filterType === 'document') {
          // For document type: use OR conditions for various document mimeTypes
          queryBuilder.where('media.mimeType = :pdf', { pdf: 'application/pdf' })
            .orWhere('media.mimeType LIKE :text', { text: 'text/%' })
            .orWhere('media.mimeType LIKE :doc', { doc: '%document%' })
            .orWhere('media.mimeType LIKE :word', { word: '%word%' })
            .orWhere('media.mimeType LIKE :sheet', { sheet: '%sheet%' })
            .orWhere('media.mimeType LIKE :presentation', { presentation: '%presentation%' });
        }

        // Apply other filters
        if (userId) {
          queryBuilder.andWhere('media.userId = :userId', { userId });
        }
        if (folder) {
          queryBuilder.andWhere('media.folderPath = :folder', { folder });
        }

        // Get total count
        total = await queryBuilder.getCount();

        // Get paginated results
        media = await queryBuilder
          .orderBy(`media.${orderByField as string}`, orderDirection as any)
          .skip(skip)
          .take(Number(limit))
          .getMany();
      } else {
        // Use standard find for other types
        total = await this.mediaRepository.count({ where });
        media = await this.mediaRepository.find({
          where,
          relations: ['user'], // Re-enabled to show author info
          order: { [orderByField as string]: orderDirection as any },
          skip,
          take: Number(limit)
        });
      }

      // Filter by search if provided
      let filteredMedia = media;
      if (search) {
        const searchLower = String(search).toLowerCase();
        filteredMedia = media.filter(item => 
          item.filename?.toLowerCase().includes(searchLower) ||
          item.originalFilename?.toLowerCase().includes(searchLower) ||
          item.altText?.toLowerCase().includes(searchLower)
        );
      }

      // Calculate storage stats
      const storageStats = await this.getStorageStats();

      res.json({
        success: true,
        data: {
          media: filteredMedia.map(item => this.formatMediaResponse(item)),
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

      const media = await this.mediaRepository.findOne({
        where: { id }
        // relations: ['user'] // Temporarily disabled due to DB schema issue
      });

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
      const completeMedia = await this.mediaRepository.findOne({
        where: { id: savedMedia.id }
        // relations: ['user'] // Temporarily disabled due to DB schema issue
      });

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
          const filePath = path.join(process.cwd(), 'public', 'uploads', media.folderPath?.substring(1) || '', media.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          // Delete variants
          if (media.variants) {
            for (const [size, url] of Object.entries(media.variants)) {
              const variantPath = path.join(process.cwd(), 'public', 'uploads', url.replace('/uploads/', ''));
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

  // PUT /api/media/:id/content - 미디어 파일 내용 덮어쓰기
  updateMediaContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get uploaded file
      const file = req.file as Express.Multer.File;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      // Get existing media record
      const media = await this.mediaRepository.findOne({ where: { id } });

      if (!media) {
        res.status(404).json({
          success: false,
          error: 'Media not found'
        });
        return;
      }

      // Build file path (keep original filename and location)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', media.folderPath?.substring(1) || '');
      const filePath = path.join(uploadDir, media.filename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Overwrite the existing file
      fs.writeFileSync(filePath, file.buffer);

      // Get updated file stats
      const stats = fs.statSync(filePath);
      let width, height;

      // Update dimensions for images
      if (file.mimetype.startsWith('image/')) {
        try {
          const metadata = await sharp(filePath).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (sharpError) {
          logger.error('Error processing image:', sharpError);
        }
      }

      // Update media record
      media.size = stats.size;
      if (width !== undefined) media.width = width;
      if (height !== undefined) media.height = height;
      media.updatedAt = new Date();

      const savedMedia = await this.mediaRepository.save(media);

      res.json({
        success: true,
        data: {
          media: this.formatMediaResponse(savedMedia)
        }
      });

    } catch (error) {
      logger.error('Error updating media content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update media content'
      });
    }
  };

  // Private helper methods

  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' ||
        mimeType === 'application/json' ||
        mimeType === 'application/octet-stream' ||
        mimeType.startsWith('text/')) return 'documents';
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
        const variantPath = path.join(process.cwd(), 'public', 'uploads', category, variantFileName);

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
      // Use aggregation queries instead of loading all records
      const totalFiles = await this.mediaRepository.count();
      
      // Get total size using query builder for better performance
      const sizeResult = await this.mediaRepository
        .createQueryBuilder('media')
        .select('SUM(media.size)', 'totalSize')
        .getRawOne();
      
      const totalSize = parseInt(sizeResult?.totalSize || '0', 10);
      
      // Get breakdown counts efficiently
      const [images, videos, audio] = await Promise.all([
        this.mediaRepository.count({ where: { mimeType: Like('image/%') } }),
        this.mediaRepository.count({ where: { mimeType: Like('video/%') } }),
        this.mediaRepository.count({ where: { mimeType: Like('audio/%') } })
      ]);
      
      // Documents count using raw query for OR condition
      const documentsResult = await this.mediaRepository
        .createQueryBuilder('media')
        .where('media.mimeType = :pdf', { pdf: 'application/pdf' })
        .orWhere('media.mimeType LIKE :text', { text: 'text/%' })
        .getCount();

      return {
        totalFiles,
        totalSize,
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        breakdown: {
          images,
          videos,
          audio,
          documents: documentsResult
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
      // For now, return empty usage to avoid queryBuilder issues
      // This can be implemented later when the basic functionality works
      return {
        posts: [],
        pages: [],
        totalUsages: 0
      };
    } catch (error) {
      logger.error('Error getting media usage:', error);
      return { posts: [], pages: [], totalUsages: 0 };
    }
  }

  private formatMediaResponse(media: any): any {
    // API server serves static files via express.static at /uploads
    // Use API_BASE_URL since files are served from API server, not webserver
    const baseUrl = process.env.API_BASE_URL || 'https://api.neture.co.kr';

    // Convert relative URLs to absolute URLs
    const makeAbsolute = (url: string | null) => {
      if (!url) return url;
      if (url.startsWith('http')) return url;
      return `${baseUrl}${url}`;
    };

    // Process variants to have absolute URLs
    const processedVariants = media.variants ?
      Object.entries(media.variants).reduce((acc, [key, value]) => {
        acc[key] = makeAbsolute(value as string);
        return acc;
      }, {} as any) : null;

    return {
      id: media.id,
      filename: media.filename,
      originalFilename: media.originalFilename,
      url: makeAbsolute(media.url),
      thumbnailUrl: makeAbsolute(media.thumbnailUrl),
      mimeType: media.mimeType,
      size: media.size,
      sizeFormatted: this.formatFileSize(media.size),
      width: media.width,
      height: media.height,
      altText: media.altText,
      caption: media.caption,
      description: media.description,
      folderPath: media.folderPath,
      variants: processedVariants,
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
