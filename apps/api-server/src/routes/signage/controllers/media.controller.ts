import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageMediaService } from '../services/media.service.js';
import type { MediaUsageResult } from '../services/media-usage.service.js';
import { extractScope, extractUserId } from './signage-helpers.js';
import type {
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
} from '../dto/index.js';

export class SignageMediaController {
  private service: SignageMediaService;

  constructor(dataSource: DataSource) {
    this.service = new SignageMediaService(dataSource);
  }

  /** 409 응답용 사용처 요약 페이로드 (WO Scope 4). */
  static toUsagePayload(usage: MediaUsageResult) {
    return {
      hqPlaylists: usage.directPlaylistUsageCount,
      storePlaylists: usage.storePlaylistUsageCount,
      stores: usage.storeCount,
      detail: usage.usages,
    };
  }

  getMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
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
      const scope = extractScope(req);
      const query: MediaQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        mediaType: req.query.mediaType as any,
        sourceType: req.query.sourceType as any,
        status: req.query.status as any,
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
      const scope = extractScope(req);
      const userId = extractUserId(req);
      const dto: CreateMediaDto = req.body;

      const media = await this.service.createMedia(dto, scope, userId);
      res.status(201).json({ data: media });
    } catch (error) {
      next(error);
    }
  };

  updateMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const { source: _s, scope: _sc, ...safeBody } = req.body;
      const dto: UpdateMediaDto = safeBody;

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
      const scope = extractScope(req);
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

  /**
   * 미디어 사용처 조회
   * WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 3)
   */
  getMediaUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const usage = await this.service.getMediaUsage(id, scope);
      if (!usage) {
        res.status(404).json({ success: false, error: 'Media not found', code: 'MEDIA_NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: usage });
    } catch (error) {
      next(error);
    }
  };

  /**
   * WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
   * + WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 4/5):
   *   사용 중이면 409 SIGNAGE_MEDIA_IN_USE — 아무것도 삭제하지 않고 사용처 요약 반환.
   */
  hardDeleteMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const result = await this.service.hardDeleteMedia(id, scope);
      if (result.code === 'SIGNAGE_MEDIA_IN_USE') {
        res.status(409).json({
          success: false,
          code: 'SIGNAGE_MEDIA_IN_USE',
          error: '사용 중인 사이니지 미디어는 삭제할 수 없습니다. 먼저 모든 사용처에서 연결을 제거하세요.',
          usage: result.usage ? SignageMediaController.toUsagePayload(result.usage) : undefined,
        });
        return;
      }
      if (!result.deleted) {
        res.status(404).json({ success: false, error: 'Media not found', code: result.code || 'MEDIA_NOT_FOUND' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getMediaLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const mediaType = req.query.mediaType as string;
      const search = req.query.search as string;

      const library = await this.service.getMediaLibrary(scope, mediaType, undefined, search);
      res.json({ data: library });
    } catch (error) {
      next(error);
    }
  };
}
