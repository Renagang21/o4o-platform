/**
 * KPA Organization Controller
 * 약사회 조직 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { OrganizationStore, OrganizationChannel } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';
import { autoListPublicProductsForOrg } from '../../../utils/auto-listing.utils.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
    });
    return;
  }
  next();
};

export function createOrganizationController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);

  /**
   * GET /kpa/organizations
   * 조직 목록 조회
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, parent_id, active_only } = req.query;

      const qb = orgRepo.createQueryBuilder('org');

      if (type) {
        qb.andWhere('org.type = :type', { type });
      }

      if (parent_id) {
        qb.andWhere('org.parentId = :parent_id', { parent_id });
      } else if (parent_id === 'null') {
        qb.andWhere('org.parentId IS NULL');
      }

      if (active_only === 'true') {
        qb.andWhere('org.isActive = true');
      }

      qb.orderBy('org.type', 'ASC').addOrderBy('org.name', 'ASC');

      const organizations = await qb.getMany();

      res.json({
        data: organizations,
        total: organizations.length,
      });
    } catch (error: any) {
      console.error('Failed to list organizations:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  /**
   * GET /kpa/organizations/:id
   * 조직 상세 조회
   */
  router.get(
    '/:id',
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const org = await orgRepo.findOne({
          where: { id: req.params.id },
          relations: ['parent', 'children'],
        });

        if (!org) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
          return;
        }

        res.json({ data: org });
      } catch (error: any) {
        console.error('Failed to get organization:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * POST /kpa/organizations
   * 조직 생성 (관리자 전용)
   */
  router.post(
    '/',
    requireAuth,
    requireScope('kpa:admin'),
    [
      body('name').isString().notEmpty().isLength({ min: 2, max: 200 }),
      body('type').isIn(['association', 'branch', 'group']),
      body('parent_id').optional().isUUID(),
      body('description').optional().isString(),
      body('address').optional().isString(),
      body('phone').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        // 상위 조직 검증
        let parentOrg: OrganizationStore | null = null;
        if (req.body.parent_id) {
          parentOrg = await orgRepo.findOne({ where: { id: req.body.parent_id } });
          if (!parentOrg) {
            res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'Parent organization not found' } });
            return;
          }
        }

        // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1: organizations 테이블 필수 필드 생성
        const nameSlug = req.body.name.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
        const code = `kpa-${nameSlug}-${Date.now()}`.substring(0, 100);
        const path = parentOrg ? `${parentOrg.path}.${nameSlug}` : nameSlug;
        const level = parentOrg ? parentOrg.level + 1 : 0;

        const org = orgRepo.create({
          name: req.body.name,
          code,
          type: req.body.type,
          parentId: req.body.parent_id || null,
          path,
          level,
          description: req.body.description || null,
          address: req.body.address || null,
          phone: req.body.phone ? req.body.phone.replace(/\D/g, '') : null,
        });

        const saved = await orgRepo.save(org);

        // WO-STORE-CHANNEL-BASE-RIGHT-ACTIVATION-V1:
        // Auto-seed base-right channels (B2C, KIOSK) for new organizations.
        try {
          const channelRepo = dataSource.getRepository(OrganizationChannel);
          const BASE_CHANNELS: Array<'B2C' | 'KIOSK'> = ['B2C', 'KIOSK'];
          const now = new Date();

          for (const channelType of BASE_CHANNELS) {
            const exists = await channelRepo.findOne({
              where: { organization_id: saved.id, channel_type: channelType },
            });
            if (!exists) {
              await channelRepo.save(channelRepo.create({
                organization_id: saved.id,
                channel_type: channelType,
                status: 'APPROVED',
                approved_at: now,
              }));
            }
          }
        } catch (seedErr: any) {
          console.warn('[OrgCreate] Failed to seed base channels:', seedErr.message);
        }

        // WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1: Tier 1 자동 확산
        autoListPublicProductsForOrg(dataSource, saved.id, 'kpa')
          .then((count) => { if (count > 0) console.warn(`[OrgCreate] Auto-listed ${count} PUBLIC products for org ${saved.id}`); })
          .catch((err) => console.warn('[OrgCreate] Auto-listing failed:', err));

        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to create organization:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/organizations/:id
   * 조직 수정 (관리자 전용)
   */
  router.patch(
    '/:id',
    requireAuth,
    requireScope('kpa:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ min: 2, max: 200 }),
      body('description').optional().isString(),
      body('address').optional().isString(),
      body('phone').optional().isString(),
      body('is_active').optional().isBoolean(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const org = await orgRepo.findOne({ where: { id: req.params.id } });
        if (!org) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
          return;
        }

        if (req.body.name !== undefined) org.name = req.body.name;
        if (req.body.description !== undefined) org.description = req.body.description;
        if (req.body.address !== undefined) org.address = req.body.address;
        if (req.body.phone !== undefined) org.phone = req.body.phone ? req.body.phone.replace(/\D/g, '') : req.body.phone;
        if (req.body.is_active !== undefined) org.isActive = req.body.is_active;

        const saved = await orgRepo.save(org);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update organization:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
