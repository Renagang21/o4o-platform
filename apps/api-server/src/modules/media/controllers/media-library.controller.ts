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

      const service = new MediaLibraryService(dataSource);
      const asset = await service.upload(
        { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
        userId,
        serviceKey,
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
      const assetType = req.query.assetType as string | undefined;

      const service = new MediaLibraryService(dataSource);
      const result = await service.list({ page, limit, assetType });

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

  return router;
}
