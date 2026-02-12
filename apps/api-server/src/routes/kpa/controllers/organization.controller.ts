/**
 * KPA Organization Controller
 * 약사회 조직 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { KpaOrganization, KpaOrganizationType } from '../entities/index.js';
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

export function createOrganizationController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(KpaOrganization);

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
        qb.andWhere('org.parent_id = :parent_id', { parent_id });
      } else if (parent_id === 'null') {
        qb.andWhere('org.parent_id IS NULL');
      }

      if (active_only === 'true') {
        qb.andWhere('org.is_active = true');
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
        if (req.body.parent_id) {
          const parent = await orgRepo.findOne({ where: { id: req.body.parent_id } });
          if (!parent) {
            res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'Parent organization not found' } });
            return;
          }
        }

        const org = orgRepo.create({
          name: req.body.name,
          type: req.body.type as KpaOrganizationType,
          parent_id: req.body.parent_id || null,
          description: req.body.description || null,
          address: req.body.address || null,
          phone: req.body.phone ? req.body.phone.replace(/\D/g, '') : null,
        });

        const saved = await orgRepo.save(org);
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
        if (req.body.is_active !== undefined) org.is_active = req.body.is_active;

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
