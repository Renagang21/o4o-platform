/**
 * ProductMasterNote Controller — ProductMaster 내부 운영 메모 (admin)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET    /:id/notes            — 활성 메모 목록
 *   POST   /:id/notes            — 메모 추가(append)
 *   DELETE /:id/notes/:noteId    — soft delete (hard delete 아님)
 *
 * 원칙: ProductMaster 본문/식별자/설명/이미지/후보 **무변경**. product_master_notes 전용 write.
 * 권한: O4O 상품관리 콘솔과 동일 ADMIN 롤셋(설명검토 컨트롤러와 동일).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductMasterNoteService } from '../services/product-master-note.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

const MAX_NOTE_LEN = 4000;

function actorId(req: Request): string | null {
  return (req as { user?: { id?: string } }).user?.id ?? null;
}

export function createProductMasterNoteController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductMasterNoteService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/:id/notes', async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await service.list(req.params.id) });
    } catch (err) {
      logger.error('[product-master-note] list failed:', err);
      res.status(500).json({ success: false, error: '메모 목록 조회에 실패했습니다', code: 'MASTER_NOTE_LIST_FAILED' });
    }
  });

  router.post('/:id/notes', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      if (!actor) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }
      const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
      if (!note) {
        res.status(400).json({ success: false, error: '메모 내용을 입력하세요', code: 'NOTE_EMPTY' });
        return;
      }
      if (note.length > MAX_NOTE_LEN) {
        res.status(400).json({ success: false, error: `메모는 ${MAX_NOTE_LEN}자를 넘을 수 없습니다`, code: 'NOTE_TOO_LONG' });
        return;
      }
      if (!(await service.masterExists(req.params.id))) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }
      const created = await service.add(req.params.id, note, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      logger.error('[product-master-note] add failed:', err);
      res.status(500).json({ success: false, error: '메모 추가에 실패했습니다', code: 'MASTER_NOTE_ADD_FAILED' });
    }
  });

  router.delete('/:id/notes/:noteId', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      if (!actor) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }
      const ok = await service.softDelete(req.params.id, req.params.noteId, actor);
      if (!ok) {
        res.status(404).json({ success: false, error: '메모를 찾을 수 없거나 이미 삭제되었습니다', code: 'NOTE_NOT_FOUND' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      logger.error('[product-master-note] softDelete failed:', err);
      res.status(500).json({ success: false, error: '메모 삭제에 실패했습니다', code: 'MASTER_NOTE_DELETE_FAILED' });
    }
  });

  return router;
}
