/**
 * KPA Legal Documents Controller
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3: Phase 3
 *
 * 법률/정책 문서 CRUD + 게시 상태 관리.
 * Admin scope 필수 (operator는 조회만 가능).
 *
 * Endpoints:
 *   GET    /operator/legal/documents          — 목록
 *   GET    /operator/legal/documents/:id      — 단건 조회
 *   POST   /operator/legal/documents          — 등록
 *   PUT    /operator/legal/documents/:id      — 수정
 *   PATCH  /operator/legal/documents/:id/publish — 게시/해제
 *   GET    /legal/documents/published/:type   — 공개 조회 (인증 불필요)
 */

import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import type { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import type { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';

type RequireKpaScope = ReturnType<typeof createMembershipScopeGuard>;

export function createLegalDocumentsController(
  dataSource: DataSource,
  coreRequireAuth: RequestHandler,
  requireKpaScope: RequireKpaScope,
): Router {
  const router = Router();

  // ── Public endpoint (no auth) ──

  /**
   * GET /legal/documents/published/:documentType
   * 현재 게시 중인 문서 조회 (회원가입 페이지 등에서 사용)
   */
  router.get('/legal/documents/published/:documentType', asyncHandler(async (req: Request, res: Response) => {
    const { documentType } = req.params;
    const rows = await dataSource.query(
      `SELECT id, document_type, title, content, published_at, updated_at
       FROM kpa_legal_documents
       WHERE document_type = $1 AND status = 'published'
       ORDER BY published_at DESC
       LIMIT 1`,
      [documentType],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '게시된 문서가 없습니다.' },
      });
    }

    res.json({ success: true, data: rows[0] });
  }));

  // ── Admin endpoints ──
  // Guard: authenticate + kpa:admin scope

  /**
   * GET /operator/legal/documents
   * 문서 목록 조회 (document_type 필터 가능)
   */
  router.get('/operator/legal/documents',
    authenticate,
    requireKpaScope('kpa:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const { document_type, status: docStatus } = req.query;
      const params: any[] = [];
      const conditions: string[] = [];

      if (document_type) {
        params.push(document_type);
        conditions.push(`document_type = $${params.length}`);
      }
      if (docStatus) {
        params.push(docStatus);
        conditions.push(`status = $${params.length}`);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const rows = await dataSource.query(
        `SELECT id, document_type, title, status, published_at, created_by, updated_by, created_at, updated_at
         FROM kpa_legal_documents
         ${whereClause}
         ORDER BY document_type ASC, updated_at DESC`,
        params,
      );

      res.json({ success: true, data: rows });
    }),
  );

  /**
   * GET /operator/legal/documents/:id
   * 단건 조회 (content 포함)
   */
  router.get('/operator/legal/documents/:id',
    authenticate,
    requireKpaScope('kpa:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const rows = await dataSource.query(
        `SELECT * FROM kpa_legal_documents WHERE id = $1`,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' },
        });
      }

      res.json({ success: true, data: rows[0] });
    }),
  );

  /**
   * POST /operator/legal/documents
   * 문서 등록
   */
  router.post('/operator/legal/documents',
    authenticate,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response) => {
      const { document_type, title, content } = req.body;
      const userId = (req as any).user?.id;

      if (!document_type || !title) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'document_type, title은 필수입니다.' },
        });
      }

      const rows = await dataSource.query(
        `INSERT INTO kpa_legal_documents (document_type, title, content, status, created_by, updated_by)
         VALUES ($1, $2, $3, 'draft', $4, $4)
         RETURNING *`,
        [document_type, title, content || '', userId],
      );

      res.status(201).json({ success: true, data: rows[0] });
    }),
  );

  /**
   * PUT /operator/legal/documents/:id
   * 문서 수정
   */
  router.put('/operator/legal/documents/:id',
    authenticate,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { title, content } = req.body;
      const userId = (req as any).user?.id;

      // Check exists
      const existing = await dataSource.query(
        `SELECT id FROM kpa_legal_documents WHERE id = $1`,
        [id],
      );
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' },
        });
      }

      const setClauses: string[] = ['updated_by = $2', 'updated_at = NOW()'];
      const params: any[] = [id, userId];

      if (title !== undefined) {
        params.push(title);
        setClauses.push(`title = $${params.length}`);
      }
      if (content !== undefined) {
        params.push(content);
        setClauses.push(`content = $${params.length}`);
      }

      const rows = await dataSource.query(
        `UPDATE kpa_legal_documents SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        params,
      );

      res.json({ success: true, data: rows[0] });
    }),
  );

  /**
   * PATCH /operator/legal/documents/:id/publish
   * 게시 상태 변경 (publish / unpublish)
   *
   * Body: { action: 'publish' | 'unpublish' }
   *
   * publish 시: 같은 document_type의 기존 published 문서를 draft로 변경 후 현재 문서를 published로 전환.
   */
  router.patch('/operator/legal/documents/:id/publish',
    authenticate,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { action } = req.body;
      const userId = (req as any).user?.id;

      if (!action || !['publish', 'unpublish'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'action은 publish 또는 unpublish여야 합니다.' },
        });
      }

      const existing = await dataSource.query(
        `SELECT id, document_type, status FROM kpa_legal_documents WHERE id = $1`,
        [id],
      );
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' },
        });
      }

      const doc = existing[0];

      if (action === 'publish') {
        // Unpublish any existing published doc of same type
        await dataSource.query(
          `UPDATE kpa_legal_documents
           SET status = 'draft', updated_at = NOW()
           WHERE document_type = $1 AND status = 'published' AND id != $2`,
          [doc.document_type, id],
        );

        // Publish this one
        const rows = await dataSource.query(
          `UPDATE kpa_legal_documents
           SET status = 'published', published_at = NOW(), published_by = $2, updated_by = $2, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, userId],
        );

        return res.json({ success: true, data: rows[0] });
      }

      // unpublish
      const rows = await dataSource.query(
        `UPDATE kpa_legal_documents
         SET status = 'draft', updated_by = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, userId],
      );

      res.json({ success: true, data: rows[0] });
    }),
  );

  return router;
}
