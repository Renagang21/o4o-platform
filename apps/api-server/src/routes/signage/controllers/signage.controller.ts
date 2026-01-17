import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageService } from '../services/signage.service.js';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  PlaylistQueryDto,
  CreatePlaylistItemDto,
  UpdatePlaylistItemDto,
  ReorderPlaylistItemsDto,
  BulkCreatePlaylistItemsDto,
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
  ScopeFilter,
} from '../dto/index.js';

/**
 * Signage Controller
 *
 * HTTP endpoint handlers for Signage Core APIs.
 * Handles request parsing, validation, and response formatting.
 */
export class SignageController {
  private service: SignageService;

  constructor(dataSource: DataSource) {
    this.service = new SignageService(dataSource);
  }

  /**
   * Extract scope filter from request
   * serviceKey is from route param, organizationId from headers/query
   */
  private extractScope(req: Request): ScopeFilter {
    const serviceKey = req.params.serviceKey || req.headers['x-service-key'] as string;
    const organizationId = req.query.organizationId as string || req.headers['x-organization-id'] as string;

    if (!serviceKey) {
      throw new Error('Service key is required');
    }

    return {
      serviceKey,
      organizationId: organizationId || undefined,
    };
  }

  /**
   * Extract user ID from request (assumes auth middleware sets req.user)
   */
  private extractUserId(req: Request): string | undefined {
    return (req as any).user?.id || (req as any).user?.userId;
  }

  // ========== Playlist Endpoints ==========

  getPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const playlist = await this.service.getPlaylist(id, scope);
      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  getPlaylists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: PlaylistQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as any,
        isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getPlaylists(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreatePlaylistDto = req.body;

      const playlist = await this.service.createPlaylist(dto, scope, userId);
      res.status(201).json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  updatePlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdatePlaylistDto = req.body;

      const playlist = await this.service.updatePlaylist(id, dto, scope);
      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  deletePlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const success = await this.service.deletePlaylist(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Playlist Item Endpoints ==========

  getPlaylistItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId } = req.params;

      const items = await this.service.getPlaylistItems(playlistId, scope);
      res.json({ data: items });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  addPlaylistItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId } = req.params;
      const dto: CreatePlaylistItemDto = req.body;

      const item = await this.service.addPlaylistItem(playlistId, dto, scope);
      res.status(201).json({ data: item });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Playlist not found' || message === 'Media not found') {
        res.status(404).json({ error: message });
        return;
      }
      next(error);
    }
  };

  addPlaylistItemsBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId } = req.params;
      const dto: BulkCreatePlaylistItemsDto = req.body;

      const items = await this.service.addPlaylistItemsBulk(playlistId, dto, scope);
      res.status(201).json({ data: items });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  updatePlaylistItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId, itemId } = req.params;
      const dto: UpdatePlaylistItemDto = req.body;

      const item = await this.service.updatePlaylistItem(playlistId, itemId, dto, scope);
      if (!item) {
        res.status(404).json({ error: 'Playlist item not found' });
        return;
      }

      res.json({ data: item });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  deletePlaylistItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId, itemId } = req.params;

      const success = await this.service.deletePlaylistItem(playlistId, itemId, scope);
      if (!success) {
        res.status(404).json({ error: 'Playlist item not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  reorderPlaylistItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { playlistId } = req.params;
      const dto: ReorderPlaylistItemsDto = req.body;

      const items = await this.service.reorderPlaylistItems(playlistId, dto, scope);
      res.json({ data: items });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  // ========== Media Endpoints ==========

  getMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const media = await this.service.getMedia(id, scope);
      if (!media) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  getMediaList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: MediaQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        mediaType: req.query.mediaType as any,
        sourceType: req.query.sourceType as any,
        status: req.query.status as any,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getMediaList(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreateMediaDto = req.body;

      const media = await this.service.createMedia(dto, scope, userId);
      res.status(201).json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  updateMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateMediaDto = req.body;

      const media = await this.service.updateMedia(id, dto, scope);
      if (!media) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  deleteMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteMedia(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Schedule Endpoints ==========

  getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const schedule = await this.service.getSchedule(id, scope);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ data: schedule });
    } catch (error) {
      next(error);
    }
  };

  getSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: ScheduleQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        channelId: req.query.channelId as string,
        playlistId: req.query.playlistId as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getSchedules(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const dto: CreateScheduleDto = req.body;

      const schedule = await this.service.createSchedule(dto, scope);
      res.status(201).json({ data: schedule });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  updateSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateScheduleDto = req.body;

      const schedule = await this.service.updateSchedule(id, dto, scope);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ data: schedule });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  deleteSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteSchedule(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Active Content Resolution ==========

  resolveActiveContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const channelId = req.query.channelId as string || null;
      const currentTime = req.query.currentTime ? new Date(req.query.currentTime as string) : undefined;

      const content = await this.service.resolveActiveContent(channelId, scope, currentTime);
      res.json({ data: content });
    } catch (error) {
      next(error);
    }
  };
}
