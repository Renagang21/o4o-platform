/**
 * KPA Steward Controller
 * 조직/공간 단위 운영 책임(Steward) 관리 API
 *
 * WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1
 *
 * Steward는 RBAC role이 아님 - 서비스 내부 배정(assignment)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { KpaSteward, StewardScopeType, KpaMember, OrganizationStore } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';

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

export function createStewardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const stewardRepo = dataSource.getRepository(KpaSteward);
  const memberRepo = dataSource.getRepository(KpaMember);
  const orgRepo = dataSource.getRepository(OrganizationStore);

  /**
   * GET /kpa/stewards
   * Steward 목록 조회 (관리자 전용)
   */
  router.get(
    '/',
    requireAuth,
    requireScope('kpa:admin'),
    [
      query('organization_id').optional().isUUID(),
      query('scope_type').optional().isIn(['organization', 'forum', 'education', 'content']),
      query('active_only').optional().isIn(['true', 'false']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { organization_id, scope_type, active_only } = req.query;

        const qb = stewardRepo
          .createQueryBuilder('steward')
          .leftJoinAndSelect('steward.organization', 'org')
          .leftJoinAndSelect('steward.member', 'member');

        if (organization_id) {
          qb.andWhere('steward.organization_id = :organization_id', { organization_id });
        }

        if (scope_type) {
          qb.andWhere('steward.scope_type = :scope_type', { scope_type });
        }

        if (active_only === 'true') {
          qb.andWhere('steward.is_active = true');
        }

        qb.orderBy('steward.created_at', 'DESC');

        const stewards = await qb.getMany();

        res.json({
          data: stewards,
          total: stewards.length,
        });
      } catch (error: any) {
        console.error('Failed to list stewards:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/stewards/:id
   * Steward 상세 조회
   */
  router.get(
    '/:id',
    requireAuth,
    requireScope('kpa:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const steward = await stewardRepo.findOne({
          where: { id: req.params.id },
          relations: ['organization', 'member'],
        });

        if (!steward) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Steward not found' } });
          return;
        }

        res.json({ data: steward });
      } catch (error: any) {
        console.error('Failed to get steward:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * POST /kpa/stewards
   * Steward 배정 (관리자 전용)
   */
  router.post(
    '/',
    requireAuth,
    requireScope('kpa:admin'),
    [
      body('organization_id').isUUID(),
      body('member_id').isUUID(),
      body('scope_type').isIn(['organization', 'forum', 'education', 'content']),
      body('scope_id').optional().isUUID(),
      body('note').optional().isString().isLength({ max: 500 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { organization_id, member_id, scope_type, scope_id, note } = req.body;

        // 조직 검증
        const org = await orgRepo.findOne({ where: { id: organization_id } });
        if (!org) {
          res.status(400).json({ error: { code: 'INVALID_ORGANIZATION', message: 'Organization not found' } });
          return;
        }

        // 회원 검증 - 해당 조직 소속 여부
        const member = await memberRepo.findOne({
          where: { id: member_id, organization_id, status: 'active' },
        });
        if (!member) {
          res.status(400).json({
            error: {
              code: 'INVALID_MEMBER',
              message: 'Member not found or not an active member of this organization',
            },
          });
          return;
        }

        // 중복 배정 검증 (동일 조직, 동일 scope_type, 동일 scope_id, 활성 상태)
        const existing = await stewardRepo.findOne({
          where: {
            organization_id,
            member_id,
            scope_type: scope_type as StewardScopeType,
            scope_id: scope_id || null,
            is_active: true,
          },
        });
        if (existing) {
          res.status(400).json({
            error: { code: 'DUPLICATE_STEWARD', message: 'This member is already a steward for this scope' },
          });
          return;
        }

        const steward = stewardRepo.create({
          organization_id,
          member_id,
          scope_type: scope_type as StewardScopeType,
          scope_id: scope_id || null,
          note: note || null,
          assigned_by: req.user!.id,
        });

        const saved = await stewardRepo.save(steward);

        // 관계 포함하여 반환
        const result = await stewardRepo.findOne({
          where: { id: saved.id },
          relations: ['organization', 'member'],
        });

        res.status(201).json({ data: result });
      } catch (error: any) {
        console.error('Failed to assign steward:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/stewards/:id/revoke
   * Steward 해제 (관리자 전용)
   */
  router.patch(
    '/:id/revoke',
    requireAuth,
    requireScope('kpa:admin'),
    [
      param('id').isUUID(),
      body('note').optional().isString().isLength({ max: 500 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const steward = await stewardRepo.findOne({
          where: { id: req.params.id, is_active: true },
        });

        if (!steward) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Active steward not found' },
          });
          return;
        }

        steward.is_active = false;
        steward.revoked_by = req.user!.id;
        steward.revoked_at = new Date();
        if (req.body.note) {
          steward.note = req.body.note;
        }

        const saved = await stewardRepo.save(steward);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to revoke steward:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/stewards/by-organization/:organizationId
   * 특정 조직의 Steward 목록 조회
   */
  router.get(
    '/by-organization/:organizationId',
    requireAuth,
    requireScope('kpa:admin'),
    [param('organizationId').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const stewards = await stewardRepo.find({
          where: { organization_id: req.params.organizationId, is_active: true },
          relations: ['member'],
          order: { scope_type: 'ASC', created_at: 'DESC' },
        });

        res.json({ data: stewards });
      } catch (error: any) {
        console.error('Failed to get stewards by organization:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
