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
import { SupplierStatus } from './entities/index.js';
import { NetureService } from './neture.service.js';
import { NetureLibraryService } from './services/neture-library.service.js';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { mapNetureVisibility } from '@o4o/types';

const router: ExpressRouter = Router();
const netureService = new NetureService();
const libraryService = new NetureLibraryService(AppDataSource);

// ============================================================================
// Request Types
// ============================================================================

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};

// ============================================================================
// Supplier Middleware (동일 패턴: neture.routes.ts lines 184-225)
// ============================================================================

/**
 * 쓰기 작업용 — ACTIVE 상태만 허용
 */
async function requireActiveSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  if (supplier.status !== SupplierStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
    });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}

/**
 * 읽기 작업용 — 모든 상태 허용 (PENDING 포함)
 */
async function requireLinkedSupplier(req: Request, res: Response, next: () => void): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }
  const supplier = await netureService.getSupplierByUserId(authReq.user.id);
  if (!supplier) {
    res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
    return;
  }
  (req as SupplierRequest).supplierId = supplier.id;
  next();
}

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
    // ContentMeta (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1: DB 값 우선)
    if (result.success) {
      result.data.items = result.data.items.map((item: any) => ({
        ...item,
        producer: 'supplier' as const,
        producerRef: item.supplierId,
        visibility: item.visibility ?? mapNetureVisibility(item.isPublic ?? true),
        serviceKey: 'neture' as const,
        contentType: item.contentType ?? 'media',
        metaStatus: 'published' as const,
      }));
    }
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
    // ContentMeta (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1: DB 값 우선)
    if (result.success) {
      result.data.items = result.data.items.map((item: any) => ({
        ...item,
        producer: 'supplier' as const,
        producerRef: item.supplierId,
        visibility: item.visibility ?? mapNetureVisibility(item.isPublic ?? false),
        serviceKey: 'neture' as const,
        contentType: item.contentType ?? 'media',
        metaStatus: (item.visibility ?? mapNetureVisibility(item.isPublic ?? false)) === 'service' ? 'published' as const : 'draft' as const,
      }));
    }
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
    const { title, description, fileUrl, fileName, fileSize, mimeType, category, isPublic, contentType, blocks } = req.body;

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
      contentType: typeof contentType === 'string' ? contentType.slice(0, 50) : undefined,
      blocks: Array.isArray(blocks) ? blocks : undefined,
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
    const { title, description, fileUrl, fileName, fileSize, mimeType, category, isPublic, contentType, blocks } = req.body;

    const input: Record<string, unknown> = {};
    if (title !== undefined) input.title = String(title).slice(0, 200);
    if (description !== undefined) input.description = description;
    if (fileUrl !== undefined) input.fileUrl = fileUrl;
    if (fileName !== undefined) input.fileName = String(fileName).slice(0, 255);
    if (fileSize !== undefined) input.fileSize = fileSize;
    if (mimeType !== undefined) input.mimeType = String(mimeType).slice(0, 100);
    if (category !== undefined) input.category = category ? String(category).slice(0, 100) : null;
    if (isPublic !== undefined) input.isPublic = isPublic === true;
    if (contentType !== undefined) input.contentType = String(contentType).slice(0, 50);
    if (blocks !== undefined) input.blocks = Array.isArray(blocks) ? blocks : null;

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
