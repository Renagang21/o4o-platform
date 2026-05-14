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
import { emailService } from '../../../services/email.service.js';

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
      body('organization_id').optional().isUUID(),
      body('membership_type').optional().isIn(['pharmacist', 'student', 'pharmacist_member', 'pharmacy_student_member', 'external_expert', 'supplier_staff']),
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
      body('sub_role').optional().isString().isLength({ max: 100 }),
      body('institution_name').optional().isString().isLength({ max: 200 }),
      body('institution_type').optional().isString().isLength({ max: 100 }),
      body('department').optional().isString().isLength({ max: 200 }),
      body('qualification').optional().isString().isLength({ max: 200 }),
      body('qualification_type').optional().isString().isLength({ max: 100 }),
      body('company_name').optional().isString().isLength({ max: 200 }),
      body('company_type').optional().isString().isLength({ max: 100 }),
      body('job_title').optional().isString().isLength({ max: 100 }),
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

        const membershipType = req.body.membership_type || 'pharmacist';
        const isPharmacistType = membershipType === 'pharmacist' || membershipType === 'pharmacist_member';
        const isStudentType = membershipType === 'student' || membershipType === 'pharmacy_student_member';
        const isExternalExpert = membershipType === 'external_expert';
        const isSupplierStaff = membershipType === 'supplier_staff';

        // 조직 확인 — 약사/학생 타입은 조직 필수, 외부전문가/업체직원은 선택
        let organizationId: string | null = req.body.organization_id || null;
        if (organizationId) {
          const org = await orgRepo.findOne({ where: { id: organizationId } });
          if (!org) {
            res.status(400).json({ error: { code: 'INVALID_ORG', message: 'Organization not found' } });
            return;
          }
        } else if (isPharmacistType || isStudentType) {
          res.status(400).json({ error: { code: 'MISSING_ORG', message: 'organization_id is required for this membership type' } });
          return;
        }

        const licenseNumber = isPharmacistType ? (req.body.license_number || null) : null;

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

        const memberData: Partial<KpaMember> = {
          user_id: req.user!.id,
          organization_id: organizationId,
          membership_type: membershipType,
          sub_role: req.body.sub_role || null,
          role: 'member',
          status: 'pending',
          identity_status: 'active',
          license_number: licenseNumber,
          university_name: isStudentType ? (req.body.university_name || null) : null,
          student_year: isStudentType ? (req.body.student_year || null) : null,
          pharmacy_name: isPharmacistType ? (req.body.pharmacy_name || null) : null,
          pharmacy_address: isPharmacistType ? (req.body.pharmacy_address || null) : null,
          activity_type: req.body.activity_type || null,
          fee_category: req.body.fee_category || null,
        };
        const member = memberRepo.create(memberData);

        const saved: KpaMember = await memberRepo.save(member);

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

        // WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1: profile insert for new member types
        if (isExternalExpert && req.body.sub_role) {
          try {
            await dataSource.query(
              `INSERT INTO kpa_external_expert_profiles
               (user_id, expert_domain, institution_name, institution_type, department, qualification, qualification_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (user_id) DO NOTHING`,
              [
                req.user!.id,
                req.body.sub_role,
                req.body.institution_name || null,
                req.body.institution_type || null,
                req.body.department || null,
                req.body.qualification || null,
                req.body.qualification_type || null,
              ]
            );
          } catch (profileErr) {
            console.error('[PROFILE-SYNC] kpa_external_expert_profiles sync on apply:', profileErr);
          }
        }

        if (isSupplierStaff && req.body.company_name) {
          try {
            await dataSource.query(
              `INSERT INTO kpa_supplier_staff_profiles
               (user_id, company_name, company_type, job_title, department)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO NOTHING`,
              [
                req.user!.id,
                req.body.company_name,
                req.body.company_type || 'other',
                req.body.job_title || null,
                req.body.department || null,
              ]
            );
          } catch (profileErr) {
            console.error('[PROFILE-SYNC] kpa_supplier_staff_profiles sync on apply:', profileErr);
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
   *
   * WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1:
   *   canonical source = service_memberships (회원 존재 여부)
   *   kpa_members = LEFT JOIN (KPA 도메인 프로필/확장 데이터)
   *
   *   변경 전: kpa_members 단독 조회 (2건 노출)
   *   변경 후: service_memberships 기준 (실제 가입 신청자 전체 노출)
   */
  router.get(
    '/',
    requireAuth,
    requireScope('kpa:operator'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { organization_id, status, role, search, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        const offset = (pageNum - 1) * limitNum;

        const conditions: string[] = [`sm.service_key IN ('kpa-society', 'kpa')`];
        const params: any[] = [];
        let paramIdx = 1;

        if (status) {
          conditions.push(`sm.status = $${paramIdx++}`);
          params.push(status);
        }
        if (role) {
          conditions.push(`km.role = $${paramIdx++}`);
          params.push(role);
        }
        if (organization_id) {
          conditions.push(`km.organization_id = $${paramIdx++}`);
          params.push(organization_id);
        }
        if (search) {
          conditions.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
          params.push(`%${search}%`);
          paramIdx++;
        }

        const whereClause = conditions.join(' AND ');
        const baseFrom = `
          FROM service_memberships sm
          JOIN users u ON u.id = sm.user_id
          LEFT JOIN kpa_members km ON km.user_id = sm.user_id
          WHERE ${whereClause}
        `;

        const [countResult, rows] = await Promise.all([
          dataSource.query<Array<{ total: number }>>(
            `SELECT COUNT(*)::int AS total ${baseFrom}`,
            params,
          ),
          dataSource.query(
            `SELECT
               sm.id        AS sm_id,
               sm.user_id,
               sm.service_key,
               sm.status    AS status,
               sm.created_at AS sm_created_at,
               km.id        AS km_id,
               km.organization_id,
               km.role,
               km.status    AS kpa_status,
               km.membership_type,
               km.license_number,
               km.pharmacy_name,
               km.pharmacy_address,
               km.activity_type,
               km.fee_category,
               km.sub_role,
               km.university_name,
               km.student_year,
               km.joined_at,
               km.created_at AS km_created_at,
               km.updated_at AS km_updated_at,
               u.name       AS user_name,
               u.email      AS user_email
             ${baseFrom}
             ORDER BY sm.created_at DESC
             LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
            [...params, limitNum, offset],
          ),
        ]);

        const total = countResult[0]?.total ?? 0;

        // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1:
        //   id = km_id (kpa_members 있을 때) | sm_id (없을 때) — 항상 유효한 UUID
        //   has_kpa_member = true/false — UI에서 "KPA 프로필 없음" 표시 + 액션 비활성화
        const members = (rows as any[]).map((r) => ({
          id: r.km_id ?? r.sm_id,
          sm_id: r.sm_id,
          user_id: r.user_id,
          has_kpa_member: !!r.km_id,
          status: r.status,
          kpa_status: r.kpa_status ?? null,
          organization_id: r.organization_id ?? null,
          role: r.role ?? null,
          membership_type: r.membership_type ?? null,
          license_number: r.license_number ?? null,
          pharmacy_name: r.pharmacy_name ?? null,
          pharmacy_address: r.pharmacy_address ?? null,
          activity_type: r.activity_type ?? null,
          fee_category: r.fee_category ?? null,
          sub_role: r.sub_role ?? null,
          university_name: r.university_name ?? null,
          student_year: r.student_year ?? null,
          joined_at: r.joined_at ?? null,
          created_at: r.sm_created_at,
          updated_at: r.km_updated_at ?? r.sm_created_at,
          service_key: r.service_key,
          user: {
            name: r.user_name ?? null,
            email: r.user_email ?? null,
          },
        }));

        // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
        //   role_assignments 의 active role 을 user_id 별 batch 조회 후 attach.
        const userIds = members.map((m) => m.user_id).filter((id): id is string => Boolean(id));
        const capabilityMap = new Map<string, string[]>();
        if (userIds.length > 0) {
          const raRows = await dataSource.query(
            `SELECT user_id, role FROM role_assignments WHERE user_id = ANY($1::uuid[]) AND is_active = true`,
            [userIds],
          );
          for (const row of raRows as Array<{ user_id: string; role: string }>) {
            if (!row.user_id || !row.role) continue;
            const list = capabilityMap.get(row.user_id) ?? [];
            list.push(row.role);
            capabilityMap.set(row.user_id, list);
          }
        }
        for (const m of members) {
          (m as any).capabilities = capabilityMap.get(m.user_id) ?? [];
        }

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
            // WO-KPA-A-ROLE-CLEANUP-V1 + WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1: Create profile per membership type
            const mType = member.membership_type;
            if (mType === 'student' || mType === 'pharmacy_student_member') {
              await dataSource.query(
                `INSERT INTO kpa_student_profiles (user_id, university_name, student_year)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, member.university_name, member.student_year]
              );
            } else if (mType === 'external_expert') {
              // Profile should already exist from registration; this is a safety-net insert only
              const expertDomain = (member as any).sub_role || 'general';
              await dataSource.query(
                `INSERT INTO kpa_external_expert_profiles (user_id, expert_domain)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, expertDomain]
              );
            } else if (mType === 'supplier_staff') {
              // Profile should already exist from registration; this is a safety-net insert only
              // Look up existing profile first to avoid overwriting with poor fallback data
              const [existingProfile] = await dataSource.query(
                `SELECT company_name FROM kpa_supplier_staff_profiles WHERE user_id = $1 LIMIT 1`,
                [member.user_id]
              );
              if (!existingProfile) {
                await dataSource.query(
                  `INSERT INTO kpa_supplier_staff_profiles (user_id, company_name, company_type)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (user_id) DO NOTHING`,
                  [member.user_id, 'Unknown', 'other']
                );
              }
            } else {
              // pharmacist / pharmacist_member
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

        // WO-O4O-KPA-MEMBER-APPROVAL-EMAIL-CONNECT-V1: 상태 전환 이메일 알림 (non-blocking)
        if (oldStatus !== newStatus) {
          try {
            const [appUser] = await dataSource.query(
              `SELECT email, name FROM users WHERE id = $1 LIMIT 1`,
              [member.user_id]
            );
            const recipientEmail: string | undefined = appUser?.email;
            const recipientName: string = appUser?.name || appUser?.email || '회원';
            const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

            if (recipientEmail && emailService.isServiceAvailable()) {
              if (oldStatus === 'pending' && newStatus === 'active') {
                await emailService.sendUserApprovalEmail(recipientEmail, {
                  userName: recipientName,
                  userEmail: recipientEmail,
                  userRole: 'KPA 약사회 회원',
                  approvalDate: decidedAt,
                });
                console.error(`[KPA Email] Approval sent to ${recipientEmail} (member: ${member.id})`);
              } else if (oldStatus === 'pending' && newStatus === 'rejected') {
                await emailService.sendUserRejectionEmail(recipientEmail, {
                  userName: recipientName,
                  rejectReason: (req.body.note as string | undefined)?.trim() || '가입 심사에서 승인되지 않았습니다.',
                });
                console.error(`[KPA Email] Rejection sent to ${recipientEmail} (member: ${member.id})`);
              } else if (newStatus === 'suspended') {
                await emailService.sendAccountSuspensionEmail(recipientEmail, {
                  userName: recipientName,
                  suspendReason: (req.body.note as string | undefined)?.trim() || '운영 정책에 따라 계정이 정지되었습니다.',
                  suspendedDate: decidedAt,
                });
                console.error(`[KPA Email] Suspension sent to ${recipientEmail} (member: ${member.id})`);
              } else if (oldStatus === 'suspended' && newStatus === 'active') {
                await emailService.sendAccountReactivationEmail(recipientEmail, {
                  userName: recipientName,
                  reactivatedDate: decidedAt,
                });
                console.error(`[KPA Email] Reactivation sent to ${recipientEmail} (member: ${member.id})`);
              }
            }
          } catch (emailError) {
            console.error(`[KPA Email] Failed to send status change email (${oldStatus}→${newStatus}) for member ${member.id}:`, emailError);
          }
        }

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
        const validMembershipTypes = ['pharmacist', 'student', 'pharmacist_member', 'pharmacy_student_member', 'external_expert', 'supplier_staff'];
        if (membership_type && validMembershipTypes.includes(membership_type)) {
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
        // WO-O4O-KPA-MEMBER-HARDDELETE-ADMIN-FOR-MISREGISTRATION-V1:
        //   - canHardDelete: operator 관점 (포럼 게시글/댓글/감사로그 모두 0 인 경우)
        //   - hasActivityData: 실제 활동 데이터 존재 여부 (포럼 게시글/댓글만 — 감사 로그는 제외)
        //     admin 은 hasActivityData=true 여도 강한 경고와 함께 완전삭제 가능
        const canHardDelete = risks.forumPosts === 0 && risks.forumComments === 0 && risks.auditLogs === 0;
        const hasActivityData = risks.forumPosts > 0 || risks.forumComments > 0;

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
            hasActivityData,
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
    requireScope('kpa:operator'),   // soft delete는 operator 허용; hard delete는 아래에서 admin 체크
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
          // Soft delete: status → withdrawn (kpa:operator 이상 허용)
          member.status = 'withdrawn' as any;
          member.identity_status = 'withdrawn' as any;
          await memberRepo.save(member);

          const operatorRole = (req as any).user?.scopes?.includes('kpa:admin') ? 'kpa:admin' : 'kpa:operator';
          try {
            await auditRepo.save(auditRepo.create({
              operator_id: (req as any).user?.id,
              operator_role: operatorRole,
              action_type: 'MEMBER_STATUS_CHANGED' as any,
              target_type: 'member',
              target_id: member.id,
              metadata: { previousStatus: member.status, newStatus: 'withdrawn', mode: 'soft' },
            }));
          } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

          res.json({ success: true, data: { mode: 'soft', status: 'withdrawn' } });
          return;
        }

        // Hard delete: kpa:admin 전용 — 인라인 admin 체크
        // WO-O4O-KPA-ADMIN-HARDDELETE-SCOPE-FIX-V1:
        //   기존 코드는 JWT scopes 배열에서 리터럴 'kpa:admin' 만 검사했으나, scopes 는
        //   deriveUserScopes() 가 생성하는 권한 문자열(`kpa:admin:access` 등) 배열이라
        //   바운드 'kpa:admin' 은 절대 포함되지 않아 admin 도 403 차단되는 버그.
        //
        //   canonical 출처(role_assignments → JWT.roles)를 우선 검사하고,
        //   JWT.memberships(=kpa_members.role) 의 'admin' 도 함께 인정한다. 이는
        //   프론트 AdminAuthGuard 의 `user.roles.includes('kpa:admin') || user.membershipRole === 'admin'`
        //   판정과 1:1 정렬된다.
        //
        //   security-core 의 requireScope('kpa:admin') 미들웨어도 동일하게 roles 기반
        //   판정을 사용하므로 이 인라인 체크는 그 결과와 일치한다.
        const reqUser = (req as any).user;
        const userRoles: string[] = reqUser?.roles ?? [];
        const userScopes: string[] = reqUser?.scopes ?? [];
        const memberships: Array<{ serviceKey: string; role?: string }> =
          Array.isArray(reqUser?.memberships) ? reqUser.memberships : [];
        const hasAdminRole = userRoles.includes('kpa:admin');
        // 방어적: 향후 scopes 에 리터럴 'kpa:admin' 이 들어올 수 있을 경우도 허용
        const hasAdminScope = userScopes.includes('kpa:admin');
        const hasAdminMembership = memberships.some(
          (m) => (m.serviceKey === 'kpa-society' || m.serviceKey === 'kpa') && m.role === 'admin',
        );
        if (!hasAdminRole && !hasAdminScope && !hasAdminMembership) {
          res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: '완전삭제는 관리자(kpa:admin) 권한이 필요합니다.',
          });
          return;
        }

        // WO-O4O-KPA-MEMBER-HARDDELETE-ADMIN-FOR-MISREGISTRATION-V1
        //   잘못 가입한 약사 회원은 면허번호 unique 제약으로 재가입이 막힌다.
        //   admin 은 포럼 게시글/댓글이 있어도 완전삭제 가능해야 한다.
        //   기존 forum_post/forum_comment 카운트 기반 409 차단을 제거.
        //   사용자 측 강한 경고(DeleteRiskModal) + 명시적 confirm 으로 보호.
        //
        // 영향 데이터 — 감사 로그 (삭제 전 / 후 분석 가능)
        const [forumPosts, forumComments] = await Promise.all([
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_post WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
          dataSource.query(`SELECT COUNT(*)::int AS cnt FROM forum_comment WHERE author_id = $1`, [member.user_id]).catch(() => [{ cnt: 0 }]),
        ]);
        const forumPostCnt = forumPosts[0]?.cnt || 0;
        const forumCommentCnt = forumComments[0]?.cnt || 0;

        // Audit log 먼저 기록 (삭제 전)
        try {
          await auditRepo.save(auditRepo.create({
            operator_id: (req as any).user?.id,
            operator_role: 'kpa:admin',
            action_type: 'MEMBER_STATUS_CHANGED' as any,
            target_type: 'member',
            target_id: member.id,
            metadata: {
              action: 'hard_delete',
              userId: member.user_id,
              membershipType: member.membership_type,
              licenseNumberCleared: !!member.license_number,
              forumPosts: forumPostCnt,
              forumComments: forumCommentCnt,
            },
          }));
        } catch (e) { console.error('[KPA AuditLog] Failed:', e); }

        // 순서: 프로필 → memberships/roles → member_services(CASCADE) → member → user
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(`DELETE FROM kpa_pharmacist_profiles WHERE user_id = $1`, [member.user_id]);
          await queryRunner.query(`DELETE FROM kpa_student_profiles WHERE user_id = $1`, [member.user_id]);
          await queryRunner.query(`DELETE FROM kpa_external_expert_profiles WHERE user_id = $1`, [member.user_id]);
          await queryRunner.query(`DELETE FROM kpa_supplier_staff_profiles WHERE user_id = $1`, [member.user_id]);
          await queryRunner.query(`DELETE FROM service_memberships WHERE user_id = $1`, [member.user_id]);
          await queryRunner.query(`DELETE FROM role_assignments WHERE user_id = $1`, [member.user_id]);
          await memberRepo.remove(member); // CASCADE: kpa_member_services 자동 삭제
          await queryRunner.query(`DELETE FROM users WHERE id = $1`, [member.user_id]);
          await queryRunner.commitTransaction();
        } catch (txError: any) {
          await queryRunner.rollbackTransaction();
          console.error('Hard delete transaction failed:', txError);
          res.status(500).json({ error: { code: 'DELETE_FAILED', message: txError.message } });
          return;
        } finally {
          await queryRunner.release();
        }

        res.json({ success: true, data: { mode: 'hard', deleted: true } });
      } catch (error: any) {
        console.error('Failed to delete member:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
