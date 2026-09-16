/**
 * Neture Library Routes
 *
 * 공급자 canonical 콘텐츠 원장(neture_supplier_library_items) CRUD API
 *
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16):
 *   종전 "독립 도메인 — HUB/Signage/CMS 연동 없음" 은 폐기. 이 원장은 Supplier Content 의 단일 원천이며
 *   두 공식 제공 경로(ROLE-WORKSPACE-ARCHITECTURE §2-1)의 Supplier 측 계약이 여기 있다.
 *     - Supplier → Store Hub      : is_public=true 행을 Hub source adapter('supplier-library')가 조회
 *                                   (modules/hub-content/hub-content.service.ts). 별도 발송 없음.
 *     - Supplier → Service Operator: POST /library/:id/handoff { serviceKey } (아래).
 *   불변식: 소유 · 작성 · 수정은 Supplier 만 (producer=supplier). 특정 매장 대상 제공 경로 없음.
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
import { SupplierLibraryHandoffService } from './services/supplier-library-handoff.service.js';
import { listSupplierContentHandoffTargets } from './constants/supplier-content-handoff-targets.js';

const router: ExpressRouter = Router();
const netureService = new NetureService();
const libraryService = new NetureLibraryService(AppDataSource);
const handoffService = new SupplierLibraryHandoffService(AppDataSource);

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
    res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
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
    res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
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
 * GET /library/:id — 내 자료 단건 조회
 *
 * WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1:
 *   수정 화면이 목록(limit 100) 을 훑어 find(id) 하던 구조를 대체한다.
 *   `/library/public` 은 이 라우트보다 앞에 등록되어 있어 shadow 되지 않는다.
 *   read 정책은 목록(GET /library)과 동일하게 requireLinkedSupplier 를 쓴다.
 *   소유권은 service 의 `where: { id, supplierId }` 로 강제되며,
 *   타인 소유·미존재는 모두 404 로 숨긴다(PATCH/DELETE 와 동일 관례).
 */
/**
 * GET /library/handoff-targets — 콘텐츠를 제공할 수 있는 서비스 목록
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 §10: canonical catalog 에서 파생 (임의 키 없음).
 * `/library/:id` 보다 먼저 등록해야 'handoff-targets' 가 id 로 잡히지 않는다.
 */
router.get('/library/handoff-targets', requireAuth, requireLinkedSupplier, async (_req: Request, res: Response) => {
  res.json({ success: true, data: listSupplierContentHandoffTargets().map(({ key, name, nameKo }) => ({ key, name, nameKo })) });
});

router.get('/library/:id', requireAuth, requireLinkedSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const item = await libraryService.getByIdForSupplier(req.params.id, supplierId);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Library item not found' } });
      return;
    }
    // 목록(GET /library)과 동일한 ContentMeta 파생 (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1)
    const data = {
      ...item,
      producer: 'supplier' as const,
      producerRef: (item as any).supplierId,
      visibility: (item as any).visibility ?? mapNetureVisibility((item as any).isPublic ?? false),
      serviceKey: 'neture' as const,
      contentType: (item as any).contentType ?? 'media',
      metaStatus: (((item as any).visibility ?? mapNetureVisibility((item as any).isPublic ?? false)) === 'service'
        ? 'published'
        : 'draft') as 'published' | 'draft',
    };
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture Library API] Error fetching library item:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch library item' } });
  }
});

/**
 * POST /library/:id/handoff — 서비스 운영자에게 제공 (Supplier → Service Operator)
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 §9:
 *   body { serviceKey } · ACTIVE 공급자 · 본인 소유 항목만. 제공 후 Supplier 책임 종료.
 */
router.post('/library/:id/handoff', requireAuth, requireActiveSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const user = (req as AuthenticatedRequest).user!;
    const serviceKey = typeof req.body?.serviceKey === 'string' ? req.body.serviceKey : '';
    const result = await handoffService.handoff(
      supplierId,
      { id: user.id, name: (user as any).name, email: (user as any).email },
      req.params.id,
      serviceKey,
    );
    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('[Neture Library API] Error handing off library item:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to hand off library item' } });
  }
});

/**
 * POST /library — 자료 생성
 */
router.post('/library', requireAuth, requireActiveSupplier, async (req: Request, res: Response) => {
  try {
    const supplierId = (req as SupplierRequest).supplierId;
    const { title, description, fileUrl, fileName, fileSize, mimeType, category, isPublic, contentType, blocks } = req.body;
    const isDocument = contentType === 'document';

    // 입력 검증
    if (!title || typeof title !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_TITLE', message: 'title is required' } });
      return;
    }

    if (isDocument) {
      // document 타입: blocks 필수, file 필드 불필요
      if (!Array.isArray(blocks) || blocks.length === 0) {
        res.status(400).json({ success: false, error: { code: 'MISSING_BLOCKS', message: 'blocks are required for document type' } });
        return;
      }
    } else {
      // media 타입: file 필드 필수
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
    }

    const result = await libraryService.create(supplierId, {
      title: title.slice(0, 200),
      description: description ?? null,
      fileUrl: !isDocument ? fileUrl : '',
      fileName: !isDocument ? fileName.slice(0, 255) : '',
      fileSize: !isDocument ? fileSize : 0,
      mimeType: !isDocument ? mimeType.slice(0, 100) : 'text/html',
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
