/**
 * KPA Member Controller
 * 약사회 회원 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { KpaMember, KpaOrganization } from '../entities/index.js';
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

export function createMemberController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const memberRepo = dataSource.getRepository(KpaMember);
  const orgRepo = dataSource.getRepository(KpaOrganization);

  /**
   * GET /kpa/members/me
   * 내 회원 정보 조회
   */
  router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const member = await memberRepo.findOne({
        where: { user_id: req.user!.id },
        relations: ['organization'],
      });

      if (!member) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }

      res.json({ data: member });
    } catch (error: any) {
      console.error('Failed to get member info:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  /**
   * POST /kpa/members/apply
   * 회원 가입 신청
   */
  router.post(
    '/apply',
    requireAuth,
    [
      body('organization_id').isUUID(),
      body('membership_type').optional().isIn(['pharmacist', 'student']),
      body('license_number').optional().isString().isLength({ max: 100 }),
      body('university_name').optional().isString().isLength({ max: 200 }),
      body('student_year').optional().isInt({ min: 1, max: 6 }),
      body('pharmacy_name').optional().isString().isLength({ max: 200 }),
      body('pharmacy_address').optional().isString().isLength({ max: 300 }),
      body('activity_type').optional().isString().isIn([
        'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
        'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
      ]),
      body('fee_category').optional().isString().isIn([
        'A1_pharmacy_owner', 'A2_pharma_manager', 'B1_pharmacy_employee',
        'B2_pharma_company_employee', 'C1_hospital', 'C2_admin_edu_research', 'D_fee_exempted',
      ]),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        // 이미 가입된 회원인지 확인
        const existing = await memberRepo.findOne({
          where: { user_id: req.user!.id },
        });

        if (existing) {
          res.status(409).json({
            error: { code: 'ALREADY_MEMBER', message: 'Already a member or pending application exists' },
          });
          return;
        }

        // 조직 확인
        const org = await orgRepo.findOne({ where: { id: req.body.organization_id } });
        if (!org) {
          res.status(400).json({ error: { code: 'INVALID_ORG', message: 'Organization not found' } });
          return;
        }

        const membershipType = req.body.membership_type || 'pharmacist';

        const member = memberRepo.create({
          user_id: req.user!.id,
          organization_id: req.body.organization_id,
          membership_type: membershipType,
          role: 'member',
          status: 'pending',
          license_number: membershipType === 'pharmacist' ? (req.body.license_number || null) : null,
          university_name: membershipType === 'student' ? (req.body.university_name || null) : null,
          student_year: membershipType === 'student' ? (req.body.student_year || null) : null,
          pharmacy_name: req.body.pharmacy_name || null,
          pharmacy_address: req.body.pharmacy_address || null,
          activity_type: req.body.activity_type || null,
          fee_category: req.body.fee_category || null,
        });

        const saved = await memberRepo.save(member);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to apply for membership:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/members
   * 회원 목록 조회 (관리자/운영자 전용)
   */
  router.get(
    '/',
    requireAuth,
    requireScope('kpa:operator'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { organization_id, status, role, page = '1', limit = '20' } = req.query;

        const qb = memberRepo.createQueryBuilder('m')
          .leftJoinAndSelect('m.organization', 'org');

        if (organization_id) {
          qb.andWhere('m.organization_id = :organization_id', { organization_id });
        }

        if (status) {
          qb.andWhere('m.status = :status', { status });
        }

        if (role) {
          qb.andWhere('m.role = :role', { role });
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        qb.orderBy('m.created_at', 'DESC')
          .skip((pageNum - 1) * limitNum)
          .take(limitNum);

        const [members, total] = await qb.getManyAndCount();

        res.json({
          data: members,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        });
      } catch (error: any) {
        console.error('Failed to list members:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/members/:id/status
   * 회원 상태 변경 (관리자/운영자 전용)
   */
  router.patch(
    '/:id/status',
    requireAuth,
    requireScope('kpa:operator'),
    [
      param('id').isUUID(),
      body('status').isIn(['pending', 'active', 'suspended', 'withdrawn']),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { id: req.params.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        const oldStatus = member.status;
        member.status = req.body.status;

        // 가입 승인 시 joined_at 설정
        if (oldStatus === 'pending' && req.body.status === 'active') {
          member.joined_at = new Date();
        }

        const saved = await memberRepo.save(member);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update member status:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/members/me/profession
   * 내 직능 정보 업데이트 (Phase 5: 신고서 기반)
   */
  router.patch(
    '/me/profession',
    requireAuth,
    [
      body('activity_type').optional().isString().isIn([
        'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
        'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
      ]),
      body('fee_category').optional().isString().isIn([
        'A1_pharmacy_owner', 'A2_pharma_manager', 'B1_pharmacy_employee',
        'B2_pharma_company_employee', 'C1_hospital', 'C2_admin_edu_research', 'D_fee_exempted',
      ]),
      body('pharmacy_name').optional().isString().isLength({ max: 200 }),
      body('pharmacy_address').optional().isString().isLength({ max: 300 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { user_id: req.user!.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        if (req.body.activity_type !== undefined) member.activity_type = req.body.activity_type;
        if (req.body.fee_category !== undefined) member.fee_category = req.body.fee_category;
        if (req.body.pharmacy_name !== undefined) member.pharmacy_name = req.body.pharmacy_name || null;
        if (req.body.pharmacy_address !== undefined) member.pharmacy_address = req.body.pharmacy_address || null;

        const saved = await memberRepo.save(member);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update profession info:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/members/:id/role
   * 회원 역할 변경 (관리자 전용)
   */
  router.patch(
    '/:id/role',
    requireAuth,
    requireScope('kpa:admin'),
    [
      param('id').isUUID(),
      body('role').isIn(['member', 'operator', 'admin']),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { id: req.params.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        member.role = req.body.role;
        const saved = await memberRepo.save(member);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update member role:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
