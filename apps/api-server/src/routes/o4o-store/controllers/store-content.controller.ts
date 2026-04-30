/**
 * Store Content Controller — 매장 전용 콘텐츠 편집
 *
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1
 *
 * Core(o4o_asset_snapshots) immutable. 매장이 복제된 콘텐츠를
 * kpa_store_contents 테이블에서 독립 편집.
 *
 * Endpoints:
 *   GET /store-contents               — 내 매장 콘텐츠 목록 (share_status 포함)
 *   GET /store-contents/:snapshotId   — 편집용 콘텐츠 조회 (store 우선, fallback snapshot)
 *   PUT /store-contents/:snapshotId   — 편집 저장 (upsert)
 *   POST /store-contents/:id/share-to-hub — HUB 공유 요청 생성
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { KpaStoreContent } from '../../kpa/entities/kpa-store-content.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = import('express').RequestHandler;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

export function createStoreContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * GET /store-contents
   *
   * 내 매장 전체 콘텐츠 목록 (share_status 포함).
   * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1
   */
  router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const contents = await repo.find({
          where: { organization_id: organizationId },
          order: { updated_at: 'DESC' },
        });

        res.json({
          success: true,
          data: contents.map((c) => ({
            id: c.id,
            snapshotId: c.snapshot_id,
            title: c.title,
            updatedAt: c.updated_at,
            shareStatus: c.share_status,
            sharedAt: c.shared_at,
            sharedRequestId: c.shared_request_id,
          })),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-contents/:id/share-to-hub
   *
   * HUB 공유 요청 생성.
   * - share_status null or rejected 인 경우만 요청 가능
   * - kpa_approval_requests(entity_type='store_share_to_hub') + share_status='pending' 원자 처리
   * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1
   */
  router.post(
    '/:id/share-to-hub',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const { id } = req.params;
        if (!UUID_RE.test(id)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid content ID' } });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = await repo.findOne({
          where: { id, organization_id: organizationId },
        });

        if (!content) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
          return;
        }

        // 중복 방지
        if (content.share_status === 'pending') {
          res.status(409).json({ success: false, error: { code: 'ALREADY_PENDING', message: '이미 승인 요청 중입니다.' } });
          return;
        }
        if (content.share_status === 'approved') {
          res.status(409).json({ success: false, error: { code: 'ALREADY_APPROVED', message: '이미 HUB에 공유 중입니다.' } });
          return;
        }

        const requesterName: string = authReq.user?.name || authReq.user?.email || '매장 경영자';
        const requesterEmail: string | null = authReq.user?.email || null;

        // 트랜잭션: kpa_approval_requests 생성 + share_status='pending'
        const qr = dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
          const [{ ar_id }] = await qr.query(
            `INSERT INTO kpa_approval_requests
               (entity_type, organization_id, payload, status,
                requester_id, requester_name, requester_email,
                submitted_at, created_at, updated_at)
             VALUES
               ('store_share_to_hub', $1, $2, 'pending',
                $3, $4, $5,
                NOW(), NOW(), NOW())
             RETURNING id AS ar_id`,
            [
              organizationId,
              JSON.stringify({ storeContentId: id, title: content.title }),
              userId,
              requesterName,
              requesterEmail,
            ],
          );

          await qr.query(
            `UPDATE kpa_store_contents
             SET share_status = 'pending', shared_request_id = $1
             WHERE id = $2`,
            [ar_id, id],
          );

          await qr.commitTransaction();

          res.status(201).json({
            success: true,
            data: {
              approvalRequestId: ar_id,
              storeContentId: id,
              shareStatus: 'pending',
            },
          });
        } catch (err) {
          await qr.rollbackTransaction();
          throw err;
        } finally {
          await qr.release();
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * GET /store-contents/:snapshotId
   *
   * Returns editable content for a snapshot.
   * Priority: kpa_store_contents > o4o_asset_snapshots
   *
   * Response includes `source` field: 'store' | 'snapshot'
   */
  router.get(
    '/:snapshotId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const { snapshotId } = req.params;

        // Try store content first
        const storeContentRepo = dataSource.getRepository(KpaStoreContent);
        const storeContent = await storeContentRepo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (storeContent) {
          res.json({
            success: true,
            data: {
              snapshotId,
              organizationId,
              title: storeContent.title,
              contentJson: storeContent.content_json,
              source: 'store' as const,
              updatedAt: storeContent.updated_at,
              updatedBy: storeContent.updated_by,
            },
          });
          return;
        }

        // Fallback to snapshot (seed)
        const snapResult = await dataSource.query(
          `SELECT id, title, content_json, organization_id
           FROM o4o_asset_snapshots
           WHERE id = $1 AND organization_id = $2
           LIMIT 1`,
          [snapshotId, organizationId],
        );

        if (!snapResult.length) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found' } });
          return;
        }

        res.json({
          success: true,
          data: {
            snapshotId,
            organizationId,
            title: snapResult[0].title,
            contentJson: snapResult[0].content_json,
            source: 'snapshot' as const,
            updatedAt: null,
            updatedBy: null,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * PUT /store-contents/:snapshotId
   *
   * Upsert store content.
   * - Row 없으면 INSERT (snapshot 기반 seed)
   * - Row 있으면 UPDATE
   *
   * Body: { title: string, contentJson: object }
   */
  router.put(
    '/:snapshotId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const organizationId = await resolveOrgId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const { snapshotId } = req.params;
        const { title, contentJson } = req.body as {
          title?: string;
          contentJson?: Record<string, unknown>;
        };

        if (!title || !contentJson) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'title and contentJson are required' },
          });
          return;
        }

        // Verify snapshot exists and belongs to this org
        const snapCheck = await dataSource.query(
          `SELECT id FROM o4o_asset_snapshots WHERE id = $1 AND organization_id = $2 LIMIT 1`,
          [snapshotId, organizationId],
        );
        if (!snapCheck.length) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found for this organization' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        let content = await repo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (content) {
          content.title = title;
          content.content_json = contentJson;
          content.updated_by = userId;
          content = await repo.save(content);
        } else {
          content = repo.create({
            snapshot_id: snapshotId,
            organization_id: organizationId,
            title,
            content_json: contentJson,
            updated_by: userId,
          });
          content = await repo.save(content);
        }

        res.json({
          success: true,
          data: {
            snapshotId,
            organizationId,
            title: content.title,
            contentJson: content.content_json,
            source: 'store' as const,
            updatedAt: content.updated_at,
            updatedBy: content.updated_by,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  return router;
}
