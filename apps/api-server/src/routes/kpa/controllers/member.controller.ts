/**
 * KPA Member Controller
 * 약사회 회원 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { KpaMember, OrganizationStore, KpaMemberService, KpaAuditLog } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';
import { MembershipApprovalService } from '../../../services/approval/MembershipApprovalService.js';

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
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const serviceRepo = dataSource.getRepository(KpaMemberService);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

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
   * GET /kpa/members/check-license?license_number=xxx
   * 면허번호 중복 확인 (가입 전 실시간 검증용)
   */
  router.get(
    '/check-license',
    [
      query('license_number').isString().notEmpty().trim(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const licenseNumber = (req.query.license_number as string).trim();
        const existing = await memberRepo.findOne({
          where: { license_number: licenseNumber },
        });
        res.json({ available: !existing });
      } catch (error: any) {
        console.error('Failed to check license:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

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
        const licenseNumber = membershipType === 'pharmacist' ? (req.body.license_number || null) : null;

        // 면허번호 중복 체크 (상태 무관 절대 유일)
        if (licenseNumber) {
          const dupLicense = await memberRepo.findOne({
            where: { license_number: licenseNumber },
          });
          if (dupLicense) {
            res.status(409).json({
              error: { code: 'LICENSE_DUPLICATE', message: '이미 등록된 면허번호입니다.' },
            });
            return;
          }
        }

        const member = memberRepo.create({
          user_id: req.user!.id,
          organization_id: req.body.organization_id,
          membership_type: membershipType,
          role: 'member',
          status: 'pending',
          identity_status: 'active',
          license_number: licenseNumber,
          university_name: membershipType === 'student' ? (req.body.university_name || null) : null,
          student_year: membershipType === 'student' ? (req.body.student_year || null) : null,
          pharmacy_name: req.body.pharmacy_name || null,
          pharmacy_address: req.body.pharmacy_address || null,
          activity_type: req.body.activity_type || null,
          fee_category: req.body.fee_category || null,
        });

        const saved = await memberRepo.save(member);

        // WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1: SSOT sync → kpa_pharmacist_profiles
        if (req.body.activity_type) {
          try {
            await dataSource.query(
              `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
               VALUES ($1, $2)
               ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
              [req.user!.id, req.body.activity_type]
            );
          } catch (syncErr) {
            console.error('[SSOT-SYNC] kpa_pharmacist_profiles sync on apply:', syncErr);
          }
        }

        // 서비스별 승인 레코드 생성 (kpa-a: 커뮤니티)
        const svcRecord = serviceRepo.create({
          member_id: saved.id,
          service_key: 'kpa-a',
          status: 'pending',
        });
        await serviceRepo.save(svcRecord);

        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to apply for membership:', error);

        // UNIQUE violation → 409 (race condition 방어)
        if (error.code === '23505' || error.driverError?.code === '23505') {
          const detail = error.detail || error.driverError?.detail || '';
          if (detail.includes('license_number')) {
            res.status(409).json({ error: { code: 'LICENSE_DUPLICATE', message: '이미 등록된 면허번호입니다. 기존 계정으로 로그인해 주세요.' } });
            return;
          }
          if (detail.includes('user_id')) {
            res.status(409).json({ error: { code: 'ALREADY_MEMBER', message: '이미 가입된 회원입니다.' } });
            return;
          }
          res.status(409).json({ error: { code: 'DUPLICATE', message: 'Duplicate entry' } });
          return;
        }

        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to apply for membership' } });
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
          .leftJoinAndSelect('m.user', 'u')
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
      // WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1: rejected 추가
      body('status').isIn(['pending', 'active', 'suspended', 'rejected', 'withdrawn']),
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
        const newStatus = req.body.status;
        member.status = newStatus;

        // identity_status 동기화 (WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1: rejected 추가)
        if (newStatus === 'suspended' || newStatus === 'rejected') {
          member.identity_status = 'suspended';
        } else if (newStatus === 'withdrawn') {
          member.identity_status = 'withdrawn';
        } else if (newStatus === 'active' || newStatus === 'pending') {
          member.identity_status = 'active';
        }

        // 가입 승인 시 joined_at 설정
        if (oldStatus === 'pending' && newStatus === 'active') {
          member.joined_at = new Date();
        }

        const saved = await memberRepo.save(member);

        // ============================================================
        // WO-KPA-A-APPROVAL-RBAC-ALIGNMENT-V1 + WO-KPA-A-ROLE-CLEANUP-V1
        // users.status/isActive via raw SQL (ESM rule compliance)
        // kpa:pharmacist / kpa:student role 할당 제거 — profile 기반 전환
        // ============================================================
        try {
          if (oldStatus === 'pending' && newStatus === 'active') {
            // APPROVAL: Activate user
            await dataSource.query(
              `UPDATE users
               SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $2
               WHERE id = $1`,
              [member.user_id, req.user!.id]
            );
            // WO-KPA-A-ROLE-CLEANUP-V1: Create profile instead of role assignment
            if (member.membership_type === 'student') {
              await dataSource.query(
                `INSERT INTO kpa_student_profiles (user_id, university_name, student_year)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, member.university_name, member.student_year]
              );
            } else {
              await dataSource.query(
                `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, member.license_number, member.activity_type]
              );
            }
          } else if (newStatus === 'suspended' || newStatus === 'rejected') {
            // WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1: rejected도 suspended와 동일하게 membership 중지
            const approvalService = new MembershipApprovalService();
            await approvalService.suspendMembership({
              userId: member.user_id,
              suspendedBy: req.user!.id,
              isPlatformAdmin: false,
              serviceKeys: ['kpa-society'],
            });
          } else if (newStatus === 'withdrawn') {
            // WITHDRAWAL: no role to remove (profile retained for audit)
          } else if (oldStatus === 'suspended' && newStatus === 'active') {
            // WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2: delegate to MembershipApprovalService
            const approvalService = new MembershipApprovalService();
            await approvalService.reactivateMembership({
              userId: member.user_id,
              reactivatedBy: req.user!.id,
              isPlatformAdmin: false,
              serviceKeys: ['kpa-society'],
            });
          }
        } catch (syncError) {
          console.error('[WO-KPA-A-APPROVAL-RBAC-ALIGNMENT-V1] User/profile sync failed:', syncError);
        }

        // 서비스 레코드 동기화 (kpa-a)
        const svcRecord = await serviceRepo.findOne({
          where: { member_id: member.id, service_key: 'kpa-a' },
        });
        if (svcRecord) {
          if (newStatus === 'active') {
            svcRecord.status = 'approved';
            svcRecord.approved_by = req.user!.id;
            svcRecord.approved_at = new Date();
          } else if (newStatus === 'suspended') {
            svcRecord.status = 'suspended';
          } else if (newStatus === 'rejected') {
            svcRecord.status = 'rejected';
          } else if (newStatus === 'pending') {
            svcRecord.status = 'pending';
          }
          // withdrawn: 서비스 레코드 유지하되 상태 변경하지 않음
          if (newStatus !== 'withdrawn') {
            await serviceRepo.save(svcRecord);
          }
        } else if (newStatus !== 'withdrawn') {
          // 서비스 레코드가 없으면 생성 (마이그레이션 이전 회원 대응)
          const newSvc = serviceRepo.create({
            member_id: member.id,
            service_key: 'kpa-a',
            status: newStatus === 'active' ? 'approved' : 'pending',
            approved_by: newStatus === 'active' ? req.user!.id : null,
            approved_at: newStatus === 'active' ? new Date() : null,
          });
          await serviceRepo.save(newSvc);
        }

        // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1: Record audit log
        try {
          await auditRepo.save(auditRepo.create({
            operator_id: req.user!.id,
            operator_role: (req.user!.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
            action_type: 'MEMBER_STATUS_CHANGED' as any,
            target_type: 'member',
            target_id: member.id,
            metadata: { previousStatus: oldStatus, newStatus },
          }));
        } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

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

        // WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1: SSOT sync → kpa_pharmacist_profiles
        if (req.body.activity_type !== undefined) {
          try {
            await dataSource.query(
              `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
               VALUES ($1, $2)
               ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
              [req.user!.id, req.body.activity_type]
            );
          } catch (syncErr) {
            console.error('[SSOT-SYNC] kpa_pharmacist_profiles sync failed:', syncErr);
          }
        }

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

        const oldRole = member.role;
        const newRole = req.body.role;

        // WO-KPA-ROLE-POLICY-ENFORCEMENT-V1: Self-escalation prevention
        if (req.user!.id === member.user_id && newRole === 'admin') {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot assign admin role to yourself' } });
          return;
        }

        member.role = newRole;
        const saved = await memberRepo.save(member);

        // WO-KPA-ROLE-POLICY-ENFORCEMENT-V1 + WO-KPA-A-ROLE-CLEANUP-V1
        // member role은 profile 기반 (role_assignments 없음)
        // operator/admin만 RBAC role 할당
        try {
          const ROLE_MAP: Record<string, string | null> = {
            member: null, // WO-KPA-A-ROLE-CLEANUP-V1: profile 기반, RBAC role 없음
            operator: 'kpa:operator',
            admin: 'kpa:admin',
          };
          const oldRbacRole = ROLE_MAP[oldRole];
          const newRbacRole = ROLE_MAP[newRole];

          if (oldRbacRole && oldRbacRole !== newRbacRole) {
            await roleAssignmentService.removeRole(member.user_id, oldRbacRole);
          }
          if (newRbacRole && oldRbacRole !== newRbacRole) {
            await roleAssignmentService.assignRole({
              userId: member.user_id,
              role: newRbacRole,
              assignedBy: req.user!.id,
            });
          }
        } catch (syncError) {
          console.error('[WO-KPA-ROLE-POLICY-ENFORCEMENT-V1] role_assignments sync failed:', syncError);
        }

        // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1: Record audit log
        try {
          await auditRepo.save(auditRepo.create({
            operator_id: req.user!.id,
            operator_role: (req.user!.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
            action_type: 'MEMBER_ROLE_CHANGED' as any,
            target_type: 'member',
            target_id: member.id,
            metadata: { previousRole: oldRole, newRole },
          }));
        } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to update member role:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // WO-KPA-A-MEMBER-EDIT-AND-DELETE-FLOW-V1
  // ============================================================================

  /**
   * PATCH /kpa/members/:id/info — 운영자용 회원정보 수정
   */
  router.patch(
    '/:id/info',
    requireAuth,
    requireScope('kpa:operator'),
    param('id').isUUID(),
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { id: req.params.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        const { name, membership_type, license_number, pharmacy_name, pharmacy_address, activity_type } = req.body;
        const changes: Record<string, any> = {};

        // kpa_members 필드 업데이트
        if (membership_type && ['pharmacist', 'student'].includes(membership_type)) {
          changes.membership_type = membership_type;
          member.membership_type = membership_type;
        }
        if (license_number !== undefined) { changes.license_number = license_number; member.license_number = license_number; }
        if (pharmacy_name !== undefined) { changes.pharmacy_name = pharmacy_name; member.pharmacy_name = pharmacy_name; }
        if (pharmacy_address !== undefined) { changes.pharmacy_address = pharmacy_address; member.pharmacy_address = pharmacy_address; }
        if (activity_type !== undefined) { changes.activity_type = activity_type; member.activity_type = activity_type; }

        await memberRepo.save(member);

        // users.name 업데이트 (별도)
        if (name && typeof name === 'string' && name.trim()) {
          changes.name = name.trim();
          await dataSource.query(`UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`, [name.trim(), member.user_id]);
        }

        // Audit log
        try {
          await auditRepo.save(auditRepo.create({
            operator_id: (req as any).user?.id,
            operator_role: 'kpa:operator',
            action_type: 'MEMBER_INFO_UPDATED' as any,
            target_type: 'member',
            target_id: member.id,
            metadata: changes,
          }));
        } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

        res.json({ success: true, data: member });
      } catch (error: any) {
        console.error('Failed to update member info:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/members/:id/delete-risk — 삭제 리스크 확인
   */
  router.get(
    '/:id/delete-risk',
    requireAuth,
    requireScope('kpa:operator'),
    param('id').isUUID(),
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { id: req.params.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        // 사용자 정보
        const [userRows] = await Promise.all([
          dataSource.query(`SELECT name, email FROM users WHERE id = $1`, [member.user_id]),
        ]);

        // 영향 데이터 집계
        const [
          serviceCount,
          forumPostCount,
          forumCommentCount,
          approvalRequestCount,
          auditLogCount,
        ] = await Promise.all([
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM kpa_member_services WHERE member_id = $1`, [member.id]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_post WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_comment WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM kpa_approval_requests WHERE requester_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM kpa_operator_audit_logs WHERE target_id = $1`, [member.id]).catch(() => [{ cnt: 0 }]),
        ]);

        const risks = {
          memberServices: serviceCount[0]?.cnt || 0,
          forumPosts: forumPostCount[0]?.cnt || 0,
          forumComments: forumCommentCount[0]?.cnt || 0,
          approvalRequests: approvalRequestCount[0]?.cnt || 0,
          auditLogs: auditLogCount[0]?.cnt || 0,
        };

        const totalImpact = Object.values(risks).reduce((s, v) => s + v, 0);
        const canHardDelete = risks.forumPosts === 0 && risks.forumComments === 0 && risks.auditLogs === 0;

        res.json({
          success: true,
          data: {
            member: {
              id: member.id,
              userId: member.user_id,
              name: userRows[0]?.name || '-',
              email: userRows[0]?.email || '-',
              status: member.status,
              membershipType: member.membership_type,
              role: member.role,
            },
            risks,
            totalImpact,
            canHardDelete,
            message: canHardDelete
              ? '이 회원은 안전하게 삭제할 수 있습니다.'
              : '연결된 데이터가 있어 완전삭제 시 주의가 필요합니다.',
          },
        });
      } catch (error: any) {
        console.error('Failed to check delete risk:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * DELETE /kpa/members/:id — 회원 삭제 (soft: withdrawn 상태 전환 / hard: 데이터 삭제)
   * ?mode=soft (기본) | ?mode=hard
   */
  router.delete(
    '/:id',
    requireAuth,
    requireScope('kpa:admin'),
    param('id').isUUID(),
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const member = await memberRepo.findOne({ where: { id: req.params.id } });
        if (!member) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
          return;
        }

        const mode = req.query.mode === 'hard' ? 'hard' : 'soft';

        if (mode === 'soft') {
          // Soft delete: status → withdrawn
          member.status = 'withdrawn' as any;
          member.identity_status = 'withdrawn' as any;
          await memberRepo.save(member);

          try {
            await auditRepo.save(auditRepo.create({
              operator_id: (req as any).user?.id,
              operator_role: 'kpa:admin',
              action_type: 'MEMBER_STATUS_CHANGED' as any,
              target_type: 'member',
              target_id: member.id,
              metadata: { previousStatus: member.status, newStatus: 'withdrawn', mode: 'soft' },
            }));
          } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

          res.json({ success: true, data: { mode: 'soft', status: 'withdrawn' } });
          return;
        }

        // Hard delete
        // 리스크 확인
        const [forumPosts, forumComments] = await Promise.all([
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_post WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_comment WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
        ]);

        if ((forumPosts[0]?.cnt || 0) > 0 || (forumComments[0]?.cnt || 0) > 0) {
          res.status(409).json({
            success: false,
            error: 'HARD_DELETE_BLOCKED',
            message: `포럼 게시글 ${forumPosts[0]?.cnt}건, 댓글 ${forumComments[0]?.cnt}건이 있어 완전삭제가 불가합니다.`,
          });
          return;
        }

        // Audit log 먼저 기록 (삭제 전)
        try {
          await auditRepo.save(auditRepo.create({
            operator_id: (req as any).user?.id,
            operator_role: 'kpa:admin',
            action_type: 'MEMBER_STATUS_CHANGED' as any,
            target_type: 'member',
            target_id: member.id,
            metadata: { action: 'hard_delete', userId: member.user_id },
          }));
        } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

        // 순서: 프로필 → member_services(CASCADE) → member
        await dataSource.query(`DELETE FROM kpa_pharmacist_profiles WHERE user_id = $1`, [member.user_id]).catch(() => {});
        await dataSource.query(`DELETE FROM kpa_student_profiles WHERE user_id = $1`, [member.user_id]).catch(() => {});
        await memberRepo.remove(member); // CASCADE: kpa_member_services 자동 삭제

        res.json({ success: true, data: { mode: 'hard', deleted: true } });
      } catch (error: any) {
        console.error('Failed to delete member:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
