import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageGlobalContentService } from '../services/global-content.service.js';
import { extractScope, extractUserId } from './signage-helpers.js';
import { ALLOWED_STATUS_TRANSITIONS } from '../dto/index.js';
import type {
  GlobalContentQueryDto,
  ContentSource,
  CreateGlobalPlaylistDto,
  CreateGlobalMediaDto,
  UpdateGlobalPlaylistDto,
  UpdateGlobalMediaDto,
  SignageStatus,
} from '../dto/index.js';

export class SignageGlobalContentController {
  private service: SignageGlobalContentService;

  constructor(dataSource: DataSource) {
    this.service = new SignageGlobalContentService(dataSource);
  }

  // ========== Global Content Read Endpoints ==========

  getGlobalPlaylists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  getGlobalPlaylistsBySource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  getGlobalMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  getGlobalMediaBySource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  createHqPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
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

  createHqMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
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

  transitionHqMediaStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  transitionHqPlaylistStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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

  updateHqPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const { source: _s, scope: _sc, ...safeBody } = req.body;
      const dto: UpdateGlobalPlaylistDto = safeBody;

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

  updateHqMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const { source: _s, scope: _sc, ...safeBody } = req.body;
      const dto: UpdateGlobalMediaDto = safeBody;

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

  createCommunityPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);

      const { source: _s, scope: _sc, organizationId: _oid, serviceKey: _sk, ...safeBody } = req.body;
      const dto: CreateGlobalPlaylistDto = {
        ...safeBody,
        source: 'community',
        scope: 'global',
        status: 'active', // Community content is immediately public
      } as CreateGlobalPlaylistDto & { status: SignageStatus };

      const playlist = await this.service.createGlobalPlaylist(dto, scope, userId);
      res.status(201).json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  createCommunityMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);

      const { source: _s, scope: _sc, organizationId: _oid, serviceKey: _sk, ...safeBody } = req.body;
      const dto: CreateGlobalMediaDto = {
        ...safeBody,
        source: 'community',
        scope: 'global',
        status: 'active', // Community content is immediately public
      } as CreateGlobalMediaDto & { status: SignageStatus };

      const media = await this.service.createGlobalMedia(dto, scope, userId);
      res.status(201).json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  deleteCommunityMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await this.service.deleteCommunityMedia(id, userId, scope);
      if (!result.deleted) {
        const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NOT_OWNER' ? 403 : 400;
        res.status(status).json({ success: false, error: result.code });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  deleteCommunityPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await this.service.deleteCommunityPlaylist(id, userId, scope);
      if (!result.deleted) {
        const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NOT_OWNER' ? 403 : 400;
        res.status(status).json({ success: false, error: result.code });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
