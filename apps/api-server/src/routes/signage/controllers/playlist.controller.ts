import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignagePlaylistService } from '../services/playlist.service.js';
import { extractScope, extractUserId } from './signage-helpers.js';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  PlaylistQueryDto,
  CreatePlaylistItemDto,
  UpdatePlaylistItemDto,
  ReorderPlaylistItemsDto,
  BulkCreatePlaylistItemsDto,
} from '../dto/index.js';

export class SignagePlaylistController {
  private service: SignagePlaylistService;

  constructor(dataSource: DataSource) {
    this.service = new SignagePlaylistService(dataSource);
  }

  getPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const dto: CreatePlaylistDto = req.body;

      const playlist = await this.service.createPlaylist(dto, scope, userId);
      res.status(201).json({ data: playlist });
    } catch (error) {
      next(error);
    }
  };

  updatePlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const { source: _s, scope: _sc, ...safeBody } = req.body;
      const dto: UpdatePlaylistDto = safeBody;

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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
      const scope = extractScope(req);
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
}
