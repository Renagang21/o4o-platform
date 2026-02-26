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
  // Sprint 2-3 DTOs
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  CreateTemplateZoneDto,
  UpdateTemplateZoneDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ContentBlockQueryDto,
  CreateLayoutPresetDto,
  UpdateLayoutPresetDto,
  LayoutPresetQueryDto,
  ScheduleCalendarQueryDto,
  AiGenerateRequestDto,
  TemplatePreviewDto,
  PresignedUploadRequestDto,
  // Sprint 2-6 DTOs
  GlobalContentQueryDto,
  ContentSource,
  CreateGlobalPlaylistDto,
  CreateGlobalMediaDto,
  UpdateGlobalPlaylistDto,
  UpdateGlobalMediaDto,
} from '../dto/index.js';
// WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1
import { ALLOWED_STATUS_TRANSITIONS } from '../dto/index.js';
import type { SignageStatus } from '../dto/index.js';

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
   * serviceKey MUST come from route param only (header fallback removed for security)
   * organizationId from query param or header
   */
  private extractScope(req: Request): ScopeFilter {
    const serviceKey = req.params.serviceKey;
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

  // ========== Sprint 2-3: Template Endpoints ==========

  getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const template = await this.service.getTemplate(id, scope);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: TemplateQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as any,
        isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getTemplates(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreateTemplateDto = req.body;

      const template = await this.service.createTemplate(dto, scope, userId);
      res.status(201).json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateTemplateDto = req.body;

      const template = await this.service.updateTemplate(id, dto, scope);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteTemplate(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Template Zone Endpoints ==========

  getTemplateZones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { templateId } = req.params;

      const zones = await this.service.getTemplateZones(templateId, scope);
      res.json({ data: zones });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  addTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { templateId } = req.params;
      const dto: CreateTemplateZoneDto = req.body;

      const zone = await this.service.addTemplateZone(templateId, dto, scope);
      res.status(201).json({ data: zone });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  updateTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { templateId, zoneId } = req.params;
      const dto: UpdateTemplateZoneDto = req.body;

      const zone = await this.service.updateTemplateZone(templateId, zoneId, dto, scope);
      if (!zone) {
        res.status(404).json({ error: 'Template zone not found' });
        return;
      }

      res.json({ data: zone });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  deleteTemplateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { templateId, zoneId } = req.params;

      const success = await this.service.deleteTemplateZone(templateId, zoneId, scope);
      if (!success) {
        res.status(404).json({ error: 'Template zone not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  // ========== Template Preview ==========

  previewTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const dto: TemplatePreviewDto = req.body;

      const preview = await this.service.generateTemplatePreview(dto, scope);
      res.json({ data: preview });
    } catch (error) {
      if ((error as Error).message === 'Template not found') {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      next(error);
    }
  };

  // ========== Content Block Endpoints ==========

  getContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const block = await this.service.getContentBlock(id, scope);
      if (!block) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  getContentBlocks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: ContentBlockQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        blockType: req.query.blockType as string,
        status: req.query.status as any,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getContentBlocks(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreateContentBlockDto = req.body;

      const block = await this.service.createContentBlock(dto, scope, userId);
      res.status(201).json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  updateContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateContentBlockDto = req.body;

      const block = await this.service.updateContentBlock(id, dto, scope);
      if (!block) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.json({ data: block });
    } catch (error) {
      next(error);
    }
  };

  deleteContentBlock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteContentBlock(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Content block not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Layout Preset Endpoints ==========

  getLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const { id } = req.params;

      const preset = await this.service.getLayoutPreset(id, serviceKey);
      if (!preset) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  getLayoutPresets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const query: LayoutPresetQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getLayoutPresets(query, serviceKey);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceKey = req.params.serviceKey;
      const dto: CreateLayoutPresetDto = req.body;

      const preset = await this.service.createLayoutPreset(dto, serviceKey);
      res.status(201).json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  updateLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateLayoutPresetDto = req.body;

      const preset = await this.service.updateLayoutPreset(id, dto);
      if (!preset) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.json({ data: preset });
    } catch (error) {
      next(error);
    }
  };

  deleteLayoutPreset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const success = await this.service.deleteLayoutPreset(id);
      if (!success) {
        res.status(404).json({ error: 'Layout preset not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ========== Media Library ==========

  getMediaLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const mediaType = req.query.mediaType as string;
      const category = req.query.category as string;
      const search = req.query.search as string;

      const library = await this.service.getMediaLibrary(scope, mediaType, category, search);
      res.json({ data: library });
    } catch (error) {
      next(error);
    }
  };

  // ========== Schedule Calendar ==========

  getScheduleCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: ScheduleCalendarQueryDto = {
        channelId: req.query.channelId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      if (!query.startDate || !query.endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const calendar = await this.service.getScheduleCalendar(query, scope);
      res.json({ data: calendar });
    } catch (error) {
      next(error);
    }
  };

  // ========== Presigned Upload ==========

  getPresignedUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const dto: PresignedUploadRequestDto = req.body;

      const result = await this.service.getPresignedUploadUrl(dto, scope);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  // ========== AI Generation ==========

  generateWithAi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: AiGenerateRequestDto = req.body;

      const result = await this.service.generateWithAi(dto, scope, userId);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  // ========== Sprint 2-6: Global Content Endpoints ==========

  /**
   * Get all global playlists (HQ, Supplier, Community)
   */
  getGlobalPlaylists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: GlobalContentQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        source: req.query.source as ContentSource,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getGlobalPlaylists(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get global playlists by source (hq, supplier, community)
   */
  getGlobalPlaylistsBySource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const source = req.params.source as ContentSource;

      if (!['hq', 'supplier', 'community'].includes(source)) {
        res.status(400).json({ error: 'Invalid source. Must be: hq, supplier, or community' });
        return;
      }

      const query: GlobalContentQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        source,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getGlobalPlaylists(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all global media
   */
  getGlobalMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const query: GlobalContentQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        source: req.query.source as ContentSource,
        mediaType: req.query.mediaType as any,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getGlobalMedia(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get global media by source
   */
  getGlobalMediaBySource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const source = req.params.source as ContentSource;

      if (!['hq', 'supplier', 'community'].includes(source)) {
        res.status(400).json({ error: 'Invalid source. Must be: hq, supplier, or community' });
        return;
      }

      const query: GlobalContentQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        source,
        mediaType: req.query.mediaType as any,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getGlobalMedia(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ========== HQ Content Management Endpoints ==========

  /**
   * Create HQ playlist (global scope)
   */
  createHqPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreateGlobalPlaylistDto = {
        ...req.body,
        source: 'hq',
        scope: 'global',
      };

      const playlist = await this.service.createGlobalPlaylist(dto, scope, userId);
      res.status(201).json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create HQ media (global scope)
   */
  createHqMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);
      const dto: CreateGlobalMediaDto = {
        ...req.body,
        source: 'hq',
        scope: 'global',
      };

      const media = await this.service.createGlobalMedia(dto, scope, userId);
      res.status(201).json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Transition HQ media status (WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1)
   * PATCH /api/signage/:serviceKey/hq/media/:id/status
   */
  transitionHqMediaStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const { status } = req.body as { status: SignageStatus };

      if (!status || !ALLOWED_STATUS_TRANSITIONS[status as SignageStatus]) {
        res.status(400).json({ error: `Invalid status: ${status}. Allowed: draft, pending, active, archived` });
        return;
      }

      const media = await this.service.transitionHqMediaStatus(id, status, scope);
      if (!media) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.json({ data: media });
    } catch (error: any) {
      if (error.message?.startsWith('Invalid status transition')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * Transition HQ playlist status (WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1)
   * PATCH /api/signage/:serviceKey/hq/playlists/:id/status
   */
  transitionHqPlaylistStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const { status } = req.body as { status: SignageStatus };

      if (!status || !ALLOWED_STATUS_TRANSITIONS[status as SignageStatus]) {
        res.status(400).json({ error: `Invalid status: ${status}. Allowed: draft, pending, active, archived` });
        return;
      }

      const playlist = await this.service.transitionHqPlaylistStatus(id, status, scope);
      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json({ data: playlist });
    } catch (error: any) {
      if (error.message?.startsWith('Invalid status transition')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * Update HQ playlist
   */
  updateHqPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateGlobalPlaylistDto = req.body;

      const playlist = await this.service.updateGlobalPlaylist(id, dto, scope);
      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update HQ media
   */
  updateHqMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const { id } = req.params;
      const dto: UpdateGlobalMediaDto = req.body;

      const media = await this.service.updateGlobalMedia(id, dto, scope);
      if (!media) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      res.json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  // ========== Community Content Creation Endpoints ==========

  /**
   * Create Community playlist (global scope)
   *
   * WO-O4O-SIGNAGE-COMMUNITY-AUTHORSHIP-PHASE1-V1
   * Strips source/scope/organizationId/serviceKey from body
   * and enforces: source='community', scope='global', organizationId=null
   */
  createCommunityPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);

      // Strip immutable fields from body, enforce community authorship
      const { source: _s, scope: _sc, organizationId: _oid, serviceKey: _sk, ...safeBody } = req.body;
      const dto: CreateGlobalPlaylistDto = {
        ...safeBody,
        source: 'community',
        scope: 'global',
      };

      const playlist = await this.service.createGlobalPlaylist(dto, scope, userId);
      res.status(201).json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create Community media (global scope)
   *
   * WO-O4O-SIGNAGE-COMMUNITY-AUTHORSHIP-PHASE1-V1
   * Strips source/scope/organizationId/serviceKey from body
   * and enforces: source='community', scope='global', organizationId=null
   */
  createCommunityMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = this.extractScope(req);
      const userId = this.extractUserId(req);

      // Strip immutable fields from body, enforce community authorship
      const { source: _s, scope: _sc, organizationId: _oid, serviceKey: _sk, ...safeBody } = req.body;
      const dto: CreateGlobalMediaDto = {
        ...safeBody,
        source: 'community',
        scope: 'global',
      };

      const media = await this.service.createGlobalMedia(dto, scope, userId);
      res.status(201).json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  // ========== Clone Endpoints ==========

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clonePlaylist, cloneMedia removed
}
