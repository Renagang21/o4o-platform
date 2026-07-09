/**
 * MediaLibraryController — WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1
 *
 * 공용 미디어 라이브러리 API: 업로드 + 목록 조회 + 단건 조회.
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { MediaLibraryService } from '../services/media-library.service.js';
import logger from '../../../utils/logger.js';

export function createMediaLibraryRouter(dataSource: DataSource): Router {
  const router = Router();

  /**
   * POST /media-library/upload
   * 공용 미디어 라이브러리 업로드 (동의 필수)
   */
  router.post('/media-library/upload', authenticate, uploadSingleMiddleware('file'), async (req: any, res: Response) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        res.status(400).json({ success: false, error: 'File is required' });
        return;
      }

      // 동의 체크 필수
      const consent = req.body?.consent;
      if (consent !== 'true' && consent !== true) {
        res.status(400).json({
          success: false,
          error: '공용 미디어 라이브러리 등록에 동의해야 합니다.',
          code: 'CONSENT_REQUIRED',
        });
        return;
      }

      const userId = req.user?.id;
      const serviceKey = req.body?.serviceKey || null;
      const folder = req.body?.folder || 'general';

      const service = new MediaLibraryService(dataSource);
      const asset = await service.upload(
        { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
        userId,
        serviceKey,
        folder,
      );

      logger.info(`[MediaLibrary] Upload success: ${asset.id} by ${userId}`);
      res.status(201).json({ success: true, data: asset });
    } catch (error: any) {
      logger.error('[MediaLibrary] Upload error:', error);
      res.status(500).json({ success: false, error: error.message || 'Upload failed' });
    }
  });

  /**
   * GET /media-library
   * 공용 라이브러리 목록 조회
   */
  router.get('/media-library', authenticate, async (req: any, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      // WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1: type(=asset_type) 는 type/assetType 둘 다 허용(alias)
      const assetType = (req.query.type as string) || (req.query.assetType as string) || undefined;
      const folder = req.query.folder as string | undefined;
      const q = req.query.q as string | undefined;
      const language = req.query.language as string | undefined;
      const source = req.query.source as string | undefined;
      const usageType = req.query.usageType as string | undefined;
      const status = req.query.status as string | undefined;

      const service = new MediaLibraryService(dataSource);
      const result = await service.list({ page, limit, assetType, folder, q, language, source, usageType, status });

      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('[MediaLibrary] List error:', error);
      res.status(500).json({ success: false, error: 'Failed to list media assets' });
    }
  });

  /**
   * GET /media-library/:id
   * 단건 조회
   */
  router.get('/media-library/:id', authenticate, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const service = new MediaLibraryService(dataSource);
      const asset = await service.getById(id);

      if (!asset) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

      res.json({ success: true, data: asset });
    } catch (error: any) {
      logger.error('[MediaLibrary] Get error:', error);
      res.status(500).json({ success: false, error: 'Failed to get media asset' });
    }
  });

  /**
   * PATCH /media-library/:id/folder
   * 폴더 이동 (운영자 전용)
   */
  router.patch('/media-library/:id/folder', authenticate, async (req: any, res: Response) => {
    try {
      const roles: string[] = req.user?.roles || [];
      const isOperator = roles.some((r: string) =>
        r.includes('admin') || r.includes('operator') || r.includes('super_admin')
      );
      if (!isOperator) {
        res.status(403).json({ success: false, error: 'Operator access required' });
        return;
      }

      const { id } = req.params;
      const { folder } = req.body;
      if (!folder || typeof folder !== 'string') {
        res.status(400).json({ success: false, error: 'folder is required' });
        return;
      }

      const service = new MediaLibraryService(dataSource);
      const asset = await service.moveToFolder(id, folder);
      res.json({ success: true, data: asset });
    } catch (error: any) {
      logger.error('[MediaLibrary] Move folder error:', error);
      if (error.message === 'Asset not found') {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to move asset' });
    }
  });

  /**
   * PATCH /media-library/:id/metadata
   * Content Resource 메타데이터 수정 (운영자 전용) — WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1
   *   title/description/tags/keywords/language/source/usage_type/status/memo/is_library_public 만 수정.
   *   url/gcs_path/file_name/original_name(파일 속성)은 절대 변경하지 않음.
   */
  router.patch('/media-library/:id/metadata', authenticate, async (req: any, res: Response) => {
    try {
      const roles: string[] = req.user?.roles || [];
      const isOperator = roles.some((r: string) =>
        r.includes('admin') || r.includes('operator') || r.includes('super_admin')
      );
      if (!isOperator) {
        res.status(403).json({ success: false, error: 'Operator access required' });
        return;
      }

      const { id } = req.params;
      const b = req.body ?? {};
      // 파일 속성 차단: 화이트리스트 필드만 추출(url/gcs_path/file_name/original_name 등은 무시)
      const patch = {
        title: b.title,
        description: b.description,
        tags: Array.isArray(b.tags) ? b.tags : undefined,
        keywords: Array.isArray(b.keywords) ? b.keywords : undefined,
        language: b.language,
        source: b.source,
        usageType: b.usageType,
        status: b.status,
        memo: b.memo,
        isLibraryPublic: typeof b.isLibraryPublic === 'boolean' ? b.isLibraryPublic : undefined,
      };

      const service = new MediaLibraryService(dataSource);
      const asset = await service.updateMetadata(id, patch, req.user?.id ?? null);
      res.json({ success: true, data: asset });
    } catch (error: any) {
      logger.error('[MediaLibrary] Update metadata error:', error);
      if (error.message === 'Asset not found') {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to update metadata' });
    }
  });

  /**
   * DELETE /media-library/:id
   * 자산 삭제 (운영자 전용)
   */
  router.delete('/media-library/:id', authenticate, async (req: any, res: Response) => {
    try {
      const roles: string[] = req.user?.roles || [];
      const isOperator = roles.some((r: string) =>
        r.includes('admin') || r.includes('operator') || r.includes('super_admin')
      );
      if (!isOperator) {
        res.status(403).json({ success: false, error: 'Operator access required' });
        return;
      }

      const { id } = req.params;
      const service = new MediaLibraryService(dataSource);
      await service.deleteAsset(id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[MediaLibrary] Delete error:', error);
      if (error.message === 'Asset not found') {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to delete asset' });
    }
  });

  return router;
}
