import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { AppDataSource } from '../database/connection';
import { SignageContent, ContentStatus } from '../entities/SignageContent';
import { Store } from '../entities/Store';
import { StorePlaylist } from '../entities/StorePlaylist';
import { PlaylistItem } from '../entities/PlaylistItem';
import { SignageSchedule } from '../entities/SignageSchedule';
import { ScreenTemplate } from '../entities/ScreenTemplate';
import { ContentUsageLog } from '../entities/ContentUsageLog';
import { User } from '../entities/User';
import { In, Like } from 'typeorm';

export class SignageController {
  private contentRepository = AppDataSource.getRepository(SignageContent);
  private storeRepository = AppDataSource.getRepository(Store);
  private playlistRepository = AppDataSource.getRepository(StorePlaylist);
  private playlistItemRepository = AppDataSource.getRepository(PlaylistItem);
  private scheduleRepository = AppDataSource.getRepository(SignageSchedule);
  private templateRepository = AppDataSource.getRepository(ScreenTemplate);
  private logRepository = AppDataSource.getRepository(ContentUsageLog);
  private userRepository = AppDataSource.getRepository(User);

  // Content Management
  async getContents(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        search,
        createdBy,
        isPublic
      } = req.query;

      const user = (req as AuthRequest).user as unknown as User;
      const skip = (Number(page) - 1) * Number(limit);

      const queryBuilder = this.contentRepository
        .createQueryBuilder('content')
        .leftJoinAndSelect('content.creator', 'creator')
        .leftJoinAndSelect('content.approver', 'approver');

      // Role-based filtering
      if (user.role !== 'admin') {
        if (user.role === 'customer') {
          queryBuilder.andWhere('content.status = :status AND content.isPublic = true', { status: 'approved' });
        } else {
          queryBuilder.andWhere(
            '(content.createdBy = :userId OR (content.status = :status AND content.isPublic = true))',
            { userId: user.id, status: 'approved' }
          );
        }
      }

      // Apply filters
      if (status) {
        queryBuilder.andWhere('content.status = :status', { status });
      }
      if (type) {
        queryBuilder.andWhere('content.type = :type', { type });
      }
      if (search) {
        queryBuilder.andWhere(
          '(content.title ILIKE :search OR content.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }
      if (createdBy && user.role === 'admin') {
        queryBuilder.andWhere('content.createdBy = :createdBy', { createdBy });
      }
      if (isPublic !== undefined) {
        queryBuilder.andWhere('content.isPublic = :isPublic', { isPublic: isPublic === 'true' });
      }

      const [contents, total] = await queryBuilder
        .orderBy('content.createdAt', 'DESC')
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      res.json({
        success: true,
        data: {
          contents,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch contents' }
      });
    }
  }

  async getContentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as unknown as User;

      const content = await this.contentRepository.findOne({
        where: { id },
        relations: ['creator', 'approver']
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' }
        });
      }

      // Check access permissions
      if (user.role !== 'admin' && content.createdBy !== user.id) {
        if (user.role === 'customer' && (!content.isPublic || content.status !== 'approved')) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied' }
          });
        }
      }

      res.json({ success: true, data: content });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content' }
      });
    }
  }

  async createContent(req: Request, res: Response) {
    try {
      const { title, description, type, url, tags, isPublic } = req.body;
      const user = (req as AuthRequest).user as unknown as User;

      // Validate user role
      if (!['business', 'affiliate', 'manager', 'admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
        });
      }

      // Extract video ID from URL
      let videoId = null;
      if (type === 'youtube') {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        videoId = match ? match[1] : null;
      } else if (type === 'vimeo') {
        const match = url.match(/vimeo\.com\/(\d+)/);
        videoId = match ? match[1] : null;
      }

      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid video URL format' }
        });
      }

      const content = this.contentRepository.create({
        title,
        description,
        type,
        url,
        videoId,
        tags,
        isPublic: isPublic || false,
        createdBy: user.id,
        status: user.role === 'admin' || user.role === 'manager' ? ContentStatus.APPROVED : ContentStatus.PENDING
      });

      if (content.status === ContentStatus.APPROVED) {
        content.approvedBy = user.id;
        content.approvedAt = new Date();
      }

      const savedContent = await this.contentRepository.save(content);

      res.status(201).json({
        success: true,
        message: content.status === 'approved' 
          ? 'Content created and approved successfully'
          : 'Content created successfully. Approval pending.',
        data: savedContent
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create content' }
      });
    }
  }

  async updateContent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as unknown as User;

      const content = await this.contentRepository.findOne({ where: { id } });
      if (!content) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' }
        });
      }

      // Check permissions
      if (user.role !== 'admin' && content.createdBy !== user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.createdBy;
      delete updateData.videoId;

      await this.contentRepository.update(id, updateData);
      const updatedContent = await this.contentRepository.findOne({
        where: { id },
        relations: ['creator', 'approver']
      });

      res.json({ success: true, data: updatedContent });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update content' }
      });
    }
  }

  async deleteContent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as unknown as User;

      const content = await this.contentRepository.findOne({ where: { id } });
      if (!content) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' }
        });
      }

      if (user.role !== 'admin' && content.createdBy !== user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      await this.contentRepository.remove(content);
      res.json({ success: true, message: 'Content deleted successfully' });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content' }
      });
    }
  }

  async approveRejectContent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      const user = (req as AuthRequest).user as unknown as User;

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const content = await this.contentRepository.findOne({ where: { id } });
      if (!content) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' }
        });
      }

      if (action === 'approve') {
        content.status = ContentStatus.APPROVED;
        content.approvedBy = user.id;
        content.approvedAt = new Date();
      } else if (action === 'reject') {
        content.status = ContentStatus.REJECTED;
        content.rejectedReason = reason;
      }

      const updatedContent = await this.contentRepository.save(content);
      res.json({ success: true, data: updatedContent });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process approval' }
      });
    }
  }

  // Store Management
  async getStores(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user as unknown as User;
      let stores;

      if (user.role === 'admin') {
        stores = await this.storeRepository.find({
          relations: ['manager']
        });
      } else if (user.role === 'manager') {
        stores = await this.storeRepository.find({
          where: { managerId: user.id },
          relations: ['manager']
        });
      } else {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      res.json({ success: true, data: { stores } });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stores' }
      });
    }
  }

  async createStore(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user as unknown as User;
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const store = this.storeRepository.create(req.body);
      const savedStore = await this.storeRepository.save(store);

      res.status(201).json({ success: true, data: savedStore });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create store' }
      });
    }
  }

  async updateStore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as unknown as User;

      const store = await this.storeRepository.findOne({ where: { id } });
      if (!store) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Store not found' }
        });
      }

      if (user.role !== 'admin' && store.managerId !== user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.managerId; // Prevent changing manager

      await this.storeRepository.update(id, updateData);
      const updatedStore = await this.storeRepository.findOne({
        where: { id },
        relations: ['manager']
      });

      res.json({ success: true, data: updatedStore });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update store' }
      });
    }
  }

  async deleteStore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as unknown as User;

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const store = await this.storeRepository.findOne({ where: { id } });
      if (!store) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Store not found' }
        });
      }

      await this.storeRepository.remove(store);
      res.json({ success: true, message: 'Store deleted successfully' });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete store' }
      });
    }
  }

  // Placeholder methods for remaining endpoints
  async getStorePlaylists(req: Request, res: Response) {
    res.json({ success: true, data: { playlists: [] } });
  }

  async createPlaylist(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async updatePlaylist(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async deletePlaylist(req: Request, res: Response) {
    res.json({ success: true, message: 'Playlist deleted' });
  }

  async getPlaylistItems(req: Request, res: Response) {
    res.json({ success: true, data: { items: [] } });
  }

  async addPlaylistItem(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async updatePlaylistItem(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async deletePlaylistItem(req: Request, res: Response) {
    res.json({ success: true, message: 'Item deleted' });
  }

  async reorderPlaylistItems(req: Request, res: Response) {
    res.json({ success: true, message: 'Items reordered' });
  }

  async getStoreSchedules(req: Request, res: Response) {
    res.json({ success: true, data: { schedules: [] } });
  }

  async createSchedule(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async updateSchedule(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async deleteSchedule(req: Request, res: Response) {
    res.json({ success: true, message: 'Schedule deleted' });
  }

  async getActiveSchedule(req: Request, res: Response) {
    res.json({ success: true, data: { activeSchedule: null } });
  }

  async getTemplates(req: Request, res: Response) {
    res.json({ success: true, data: { templates: [] } });
  }

  async createTemplate(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async updateTemplate(req: Request, res: Response) {
    res.json({ success: true, data: {} });
  }

  async deleteTemplate(req: Request, res: Response) {
    res.json({ success: true, message: 'Template deleted' });
  }

  async getContentUsageAnalytics(req: Request, res: Response) {
    res.json({ success: true, data: { totalPlays: 0, totalDuration: 0, averagePlayDuration: 0, topContents: [] } });
  }

  async getStorePerformanceAnalytics(req: Request, res: Response) {
    res.json({ success: true, data: [] });
  }

  async getPlaybackStatus(req: Request, res: Response) {
    res.json({ success: true, data: { isPlaying: false } });
  }

  async changePlaybackContent(req: Request, res: Response) {
    res.json({ success: true, message: 'Playback changed' });
  }

  async controlPlayback(req: Request, res: Response) {
    res.json({ success: true, message: 'Playback controlled' });
  }
}