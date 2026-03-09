/**
 * Neture Library Routes
 *
 * 공급자 전용 자료실 CRUD API
 * 독립 도메인 — HUB/Signage/CMS 연동 없음
 *
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { NetureLibraryService } from './services/neture-library.service.js';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { requireActiveSupplier, requireLinkedSupplier } from './middleware/supplier.middleware.js';
import type { SupplierRequest } from './middleware/types.js';

const router: ExpressRouter = Router();
const libraryService = new NetureLibraryService(AppDataSource);

// ============================================================================
// Public Endpoint (인증 불필요)
// ============================================================================

router.get('/library/public', async (req: Request, res: Response) => {
  try {
    const { category, page, limit } = req.query;
    const result = await libraryService.listPublic({
      category: typeof category === 'string' ? category : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('[Neture Library API] Error listing public items:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list public library items' } });
  }
});

// ============================================================================
// Authenticated Endpoints
// ============================================================================

/**
 * GET /library — 내 자료 목록
 */
router.get('/library', requireAuth, requireLinkedSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { category, page, limit } = req.query;
    const result = await libraryService.listBySupplier(supplierId, {
      category: typeof category === 'string' ? category : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('[Neture Library API] Error listing supplier items:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list library items' } });
  }
});

/**
 * POST /library — 자료 생성
 */
router.post('/library', requireAuth, requireActiveSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { title, description, fileUrl, fileName, fileSize, mimeType, category, isPublic } = req.body;

    // 입력 검증
    if (!title || typeof title !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_TITLE', message: 'title is required' } });
      return;
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_FILE_URL', message: 'fileUrl is required' } });
      return;
    }
    if (!fileName || typeof fileName !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_FILE_NAME', message: 'fileName is required' } });
      return;
    }
    if (fileSize === undefined || fileSize === null || typeof fileSize !== 'number') {
      res.status(400).json({ success: false, error: { code: 'MISSING_FILE_SIZE', message: 'fileSize is required (number)' } });
      return;
    }
    if (!mimeType || typeof mimeType !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_MIME_TYPE', message: 'mimeType is required' } });
      return;
    }

    const result = await libraryService.create(supplierId, {
      title: title.slice(0, 200),
      description: description ?? null,
      fileUrl,
      fileName: fileName.slice(0, 255),
      fileSize,
      mimeType: mimeType.slice(0, 100),
      category: category ? String(category).slice(0, 100) : null,
      isPublic: isPublic === true,
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('[Neture Library API] Error creating item:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create library item' } });
  }
});

/**
 * PATCH /library/:id — 자료 수정
 */
router.patch('/library/:id', requireAuth, requireActiveSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { id } = req.params;
    const { title, description, fileUrl, fileName, fileSize, mimeType, category, isPublic } = req.body;

    const input: Record<string, unknown> = {};
    if (title !== undefined) input.title = String(title).slice(0, 200);
    if (description !== undefined) input.description = description;
    if (fileUrl !== undefined) input.fileUrl = fileUrl;
    if (fileName !== undefined) input.fileName = String(fileName).slice(0, 255);
    if (fileSize !== undefined) input.fileSize = fileSize;
    if (mimeType !== undefined) input.mimeType = String(mimeType).slice(0, 100);
    if (category !== undefined) input.category = category ? String(category).slice(0, 100) : null;
    if (isPublic !== undefined) input.isPublic = isPublic === true;

    if (Object.keys(input).length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'At least one field to update is required' } });
      return;
    }

    const result = await libraryService.update(id, supplierId, input);
    if (!result.success) {
      const errResult = result as { success: false; error: string };
      res.status(404).json({ success: false, error: { code: errResult.error, message: 'Library item not found' } });
      return;
    }
    res.json(result);
  } catch (error) {
    logger.error('[Neture Library API] Error updating item:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update library item' } });
  }
});

/**
 * DELETE /library/:id — 자료 삭제
 */
router.delete('/library/:id', requireAuth, requireActiveSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { id } = req.params;

    const result = await libraryService.delete(id, supplierId);
    if (!result.success) {
      const errResult = result as { success: false; error: string };
      res.status(404).json({ success: false, error: { code: errResult.error, message: 'Library item not found' } });
      return;
    }
    res.json(result);
  } catch (error) {
    logger.error('[Neture Library API] Error deleting item:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete library item' } });
  }
});

export default router;
