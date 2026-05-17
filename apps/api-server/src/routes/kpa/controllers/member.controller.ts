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
// WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1:
//   회원 승인/반려 시 신청자에게 in-app 알림 발송.
import { notificationService } from '../../../services/NotificationService.js';
// WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1:
//   pharmacy_owner 회원 승인 시 자동 매장/owner/role_assignment 생성.
//   pharmacy-request.controller.ts (WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1) 패턴 재사용.
import { organizationOpsService } from '../../../modules/organization/services/organization-ops.service.js';

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
      // WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1: canonical 2유형 + legacy alias만 허용
      body('organization_id').optional().isUUID(),
      body('membership_type').optional().isIn(['pharmacist', 'student', 'pharmacist_member', 'pharmacy_student_member']),
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

        const membershipType = req.body.membership_type || 'pharmacist';
        const isPharmacistType = membershipType === 'pharmacist' || membershipType === 'pharmacist_member';
        const isStudentType = membershipType === 'student' || membershipType === 'pharmacy_student_member';

        // 조직 확인 — 약사/학생 모두 조직 필수
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
          // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
          //   nickname 검색 추가 — operator 가 닉네임으로도 회원을 찾을 수 있도록.
          // WO-O4O-KPA-MEMBER-SEARCH-PHARMACY-BUSINESS-FIELDS-V1:
          //   pharmacy_name + businessInfo.businessNumber / businessName 검색 확장.
          //   businessNumber 는 하이픈 포함/미포함 입력 모두 매칭하기 위해 양쪽에서
          //   숫자만 추출(REGEXP_REPLACE)한 정규화 ILIKE 도 함께 평가한다.
          const searchStr = typeof search === 'string' ? search : String(search);
          const searchPattern = `%${searchStr}%`;
          const digits = searchStr.replace(/\D/g, '');
          const orParts: string[] = [
            `u.name ILIKE $${paramIdx}`,
            `u.email ILIKE $${paramIdx}`,
            `u.nickname ILIKE $${paramIdx}`,
            `km.pharmacy_name ILIKE $${paramIdx}`,
            `(u."businessInfo"->>'businessName') ILIKE $${paramIdx}`,
            `(u."businessInfo"->>'businessNumber') ILIKE $${paramIdx}`,
          ];
          params.push(searchPattern);
          paramIdx++;
          if (digits.length > 0) {
            orParts.push(
              `REGEXP_REPLACE(COALESCE(u."businessInfo"->>'businessNumber', ''), '[^0-9]', '', 'g') ILIKE $${paramIdx}`,
            );
            params.push(`%${digits}%`);
            paramIdx++;
          }
          conditions.push(`(${orParts.join(' OR ')})`);
        }

        const whereClause = conditions.join(' AND ');
        // WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 (Phase 1):
        //   activity_type SSOT = kpa_pharmacist_profiles.activity_type.
        //   kpa_members.activity_type 은 legacy mirror — SSOT 부재 시 fallback 으로만 사용.
        const baseFrom = `
          FROM service_memberships sm
          JOIN users u ON u.id = sm.user_id
          LEFT JOIN kpa_members km ON km.user_id = sm.user_id
          LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
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
               COALESCE(pp.activity_type, km.activity_type) AS activity_type,
               km.fee_category,
               km.sub_role,
               km.university_name,
               km.student_year,
               km.joined_at,
               km.created_at AS km_created_at,
               km.updated_at AS km_updated_at,
               u.name       AS user_name,
               u.email      AS user_email,
               u.nickname   AS user_nickname,
               u."businessInfo" AS user_business_info
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
        const members = (rows as any[]).map((r) => {
          // WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1:
          //   개설약사 가입 시 users.businessInfo 에 저장된 사업자 정보 일부를 운영자에게 노출.
          //   민감 정보(은행/세금 등)는 제외, 회원 승인 판단에 필요한 항목만.
          const businessInfo = (r.user_business_info && typeof r.user_business_info === 'object')
            ? r.user_business_info as Record<string, any>
            : null;
          // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
          //   ceoName canonical ?? representativeName (legacy) fallback.
          //   taxInvoiceEmail canonical ?? taxEmail (legacy) ?? email (legacy overwrite history) fallback.
          //   응답 키도 canonical (ceoName / taxInvoiceEmail) 로 변경.
          // WO-O4O-KPA-MEMBER-EDIT-FORM-CURRENT-VALUE-FIX-V1:
          //   pharmacy_phone 노출 — write path 가 users.businessInfo.metadata.pharmacy_phone
          //   JSONB 이므로 read path 도 동일 위치에서 추출. operator 편집 폼이 현재값을
          //   prefill 할 수 있도록 응답에 포함.
          const metadata = (businessInfo && typeof businessInfo.metadata === 'object' && businessInfo.metadata !== null)
            ? businessInfo.metadata as Record<string, any>
            : null;
          const business_info = businessInfo
            ? {
                businessNumber: businessInfo.businessNumber ?? null,
                businessName: businessInfo.businessName ?? null,
                ceoName: businessInfo.ceoName ?? businessInfo.representativeName ?? null,
                taxInvoiceEmail: businessInfo.taxInvoiceEmail ?? businessInfo.taxEmail ?? businessInfo.email ?? null,
                managerPhone: businessInfo.managerPhone ?? null,
                pharmacy_phone: (metadata?.pharmacy_phone as string | undefined) ?? null,
              }
            : null;
          return {
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
            business_info,
            user: {
              name: r.user_name ?? null,
              email: r.user_email ?? null,
              nickname: r.user_nickname ?? null,
            },
          };
        });

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
            // WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1: 약사/약대생만 처리
            const mType = member.membership_type;
            if (mType === 'student' || mType === 'pharmacy_student_member') {
              await dataSource.query(
                `INSERT INTO kpa_student_profiles (user_id, university_name, student_year)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, member.university_name, member.student_year]
              );
            } else {
              // pharmacist / pharmacist_member
              await dataSource.query(
                `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO NOTHING`,
                [member.user_id, member.license_number, member.activity_type]
              );
            }
            // WO-O4O-KPA-MEMBER-APPROVAL-SM-SYNC-FIX-V1:
            //   canonical service_memberships 동기화 — 누락 시 GET /kpa/members 의
            //   sm.status 기반 필터/카운트가 승인 후에도 'pending' 으로 남아
            //   승인대기 탭에 계속 표시되는 정합성 문제 해소.
            //   WHERE status='pending' 가드로 멱등성 보장 (중복 호출 안전).
            //   approveMembership() 전체 호출 대신 inline UPDATE 만 추가 —
            //   STEP3 role_assignments 부여가 KPA 'profile 기반 RBAC role 최소화'
            //   정책 (WO-KPA-A-ROLE-CLEANUP-V1) 과 충돌하지 않게 분리.
            //   근거: IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1
            await dataSource.query(
              `UPDATE service_memberships
               SET status = 'active', approved_by = $2, approved_at = NOW(), updated_at = NOW()
               WHERE user_id = $1 AND service_key = 'kpa-society' AND status = 'pending'`,
              [member.user_id, req.user!.id]
            );
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
            // WO-O4O-USER-WITHDRAW-LIFECYCLE-V1: canonical withdraw lifecycle
            // service_memberships inactive + role deactivate + kpa_members sync
            const approvalService = new MembershipApprovalService();
            await approvalService.withdrawMembership({
              userId: member.user_id,
              withdrawnBy: req.user!.id,
              isPlatformAdmin: false,
              serviceKeys: ['kpa-society'],
            });
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

        // ============================================================
        // WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1
        //
        // pending → active 승인 + activity_type='pharmacy_owner' 인 회원은
        // 별도 pharmacy_request 없이 다음을 자동 수행:
        //   1) organizations(type='pharmacy') ensureOrganization
        //      code = `kpa-pharm-{businessNumber}` (pharmacy-request 와 동일 규칙)
        //   2) kpa_members.organization_id 보정 (null 인 경우에만 — 분회 연결 보호)
        //   3) organization_members(role='owner') 추가
        //   4) role_assignments('kpa:store_owner') 부여
        //
        // 패턴은 pharmacy-request.controller.ts /:id/approve
        // (WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1) 와 byte-equivalent.
        // 차이점: businessNumber 가 users.businessInfo 에서 옴 (가입 단계 입력).
        //
        // Graceful fallback:
        //   businessNumber 또는 pharmacy_name 이 없으면 skip + warn 만 (회원 승인은 성공).
        //   legacy active+pharmacy_owner 회원이나 데이터 결손 케이스 대응 — 이런 경우
        //   기존 pharmacy_request 흐름으로 복구 가능.
        //
        // 실패 isolation:
        //   자동 활성화 실패는 회원 승인 자체를 실패시키지 않음 (별도 try/catch).
        // ============================================================
        if (
          oldStatus === 'pending' &&
          newStatus === 'active' &&
          member.activity_type === 'pharmacy_owner'
        ) {
          try {
            const [userRow] = await dataSource.query(
              `SELECT "businessInfo" FROM users WHERE id = $1 LIMIT 1`,
              [member.user_id]
            );
            const biz = (userRow?.businessInfo && typeof userRow.businessInfo === 'object')
              ? (userRow.businessInfo as Record<string, any>)
              : {};
            const rawBusinessNumber = typeof biz.businessNumber === 'string' ? biz.businessNumber : '';
            const businessNumberDigits = rawBusinessNumber.replace(/[^0-9]/g, '');
            const pharmacyName = member.pharmacy_name || (typeof biz.businessName === 'string' ? biz.businessName : null);

            if (businessNumberDigits.length === 0 || !pharmacyName) {
              console.warn(
                `[KPA Approval] pharmacy_owner auto-activation skipped — missing businessNumber/pharmacyName for member ${member.id}`,
                {
                  hasBusinessNumber: businessNumberDigits.length > 0,
                  hasPharmacyName: !!pharmacyName,
                }
              );
            } else {
              // 1) organizations ensure (멱등 — code 충돌 시 동일 row 반환)
              const orgCode = `kpa-pharm-${businessNumberDigits}`;
              const orgResult = await organizationOpsService.ensureOrganization({
                name: pharmacyName,
                code: orgCode,
                type: 'pharmacy',
                createdByUserId: member.user_id,
              });

              // 2) kpa_members.organization_id — null 인 경우에만 (분회 연결 보호)
              await dataSource.query(
                `UPDATE kpa_members SET organization_id = $1, updated_at = NOW()
                 WHERE user_id = $2 AND organization_id IS NULL`,
                [orgResult.id, member.user_id]
              );

              // 3) organization_members(owner) — 멱등 (organization_id, user_id) UNIQUE
              await organizationOpsService.addMember({
                organizationId: orgResult.id,
                userId: member.user_id,
                role: 'owner',
                isPrimary: false,
              });

              // 4) role_assignments(kpa:store_owner) — SSOT (role-assignment.service 멱등 upsert)
              await roleAssignmentService.assignRole({
                userId: member.user_id,
                role: 'kpa:store_owner',
                assignedBy: req.user!.id,
              });
            }
          } catch (autoActivationError) {
            // 회원 승인 자체는 성공시킴 — 운영자가 legacy pharmacy_request 흐름으로 복구 가능
            console.error(
              `[KPA Approval] pharmacy_owner auto-activation failed for member ${member.id}:`,
              autoActivationError
            );
          }
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

        // ─────────────────────────────────────────────────────────────────────
        // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1
        // 신청자 in-app 알림: pending→active 승인 / pending→rejected 반려.
        // best-effort — 실패해도 회원 상태 변경은 성공.
        // ─────────────────────────────────────────────────────────────────────
        if (oldStatus === 'pending' && (newStatus === 'active' || newStatus === 'rejected')) {
          try {
            const isApproved = newStatus === 'active';
            const noteRaw = typeof req.body.note === 'string' ? req.body.note.trim() : '';
            await notificationService.createNotification({
              userId: member.user_id,
              type: isApproved ? 'member.registration_approved' : 'member.registration_rejected',
              title: isApproved
                ? 'KPA 회원가입이 승인되었습니다'
                : 'KPA 회원가입이 반려되었습니다',
              message: isApproved
                ? '약사회 커뮤니티 서비스를 이용하실 수 있습니다.'
                : (noteRaw || '가입 신청을 다시 검토해 주세요.'),
              serviceKey: 'kpa-society',
              actorId: req.user!.id,
              metadata: {
                memberId: member.id,
                decision: newStatus,
                targetUrl: isApproved ? '/mypage' : '/mypage',
              },
            });
          } catch (notifyError) {
            console.error(
              `[KPA Notification] Applicant decision notify failed (${oldStatus}→${newStatus}) for member ${member.id}:`,
              notifyError,
            );
          }
        }

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
   *
   * WO-O4O-KPA-OPERATOR-ACTIVITYTYPE-STOREOWNER-REALIGNMENT-V1:
   *   activity_type 변경 시 자동 동기화 (SSOT + store_owner 부여/회수).
   *
   * WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1:
   *   - kpa_members ensure: req.params.id 가 kpa_members.id 또는 service_memberships.id 둘 다
   *     허용. km 미존재 시 skeleton 생성 후 진행 ("Member not found" 회피).
   *   - business_number / pharmacy_phone payload 추가 → users.businessInfo JSONB merge.
   *   - silent skip 제거: pharmacy_owner 부여 보류 시 응답 warnings[] 로 사유 명시.
   */
  router.patch(
    '/:id/info',
    requireAuth,
    requireScope('kpa:operator'),
    param('id').isUUID(),
    body('activity_type').optional().isString().isIn([
      'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
      'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
    ]),
    body('business_number').optional().isString().isLength({ max: 50 }),
    body('pharmacy_phone').optional().isString().isLength({ max: 50 }),
    // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1: nickname 수정 허용
    body('nickname').optional({ nullable: true }).isString().isLength({ max: 50 }),
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
      try {
        // ─── WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1 ───
        //   km.id 또는 sm.id 양쪽 허용 + km 누락 시 skeleton ensure.
        //   GET /kpa/members 가 m.id = km_id ?? sm_id 로 반환하므로 양쪽 모두 도달 가능.
        let member = await memberRepo.findOne({ where: { id: req.params.id } });
        let memberWasEnsured = false;

        if (!member) {
          // req.params.id 가 service_memberships.id 일 수 있음 — fallback 시도
          const smRows = await dataSource.query(
            `SELECT user_id, status, role, created_at
             FROM service_memberships
             WHERE id = $1 AND service_key IN ('kpa-society', 'kpa')
             LIMIT 1`,
            [req.params.id]
          );
          if (smRows.length === 0) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
            return;
          }
          const sm = smRows[0];

          // 동일 user 의 km 존재 여부 재확인 (sm.id 와 km.id 가 다른 경우)
          const existingKm = await memberRepo.findOne({ where: { user_id: sm.user_id } });
          if (existingKm) {
            member = existingKm;
          } else {
            // skeleton 생성 — backfill migration 과 동일 derive 정책
            const profilePresence = await dataSource.query(
              `SELECT
                 EXISTS(SELECT 1 FROM kpa_pharmacist_profiles WHERE user_id = $1) AS has_pp,
                 EXISTS(SELECT 1 FROM kpa_student_profiles WHERE user_id = $1) AS has_sp`,
              [sm.user_id]
            );
            const hasPp = !!profilePresence[0]?.has_pp;
            const hasSp = !!profilePresence[0]?.has_sp;
            const derivedType = hasPp ? 'pharmacist' : hasSp ? 'pharmacy_student_member' : 'pharmacist';
            const safeRole = ['member', 'operator', 'admin'].includes(sm.role) ? sm.role : 'member';
            const safeStatus = sm.status === 'active' ? 'active' : 'pending';
            const joinedAt = sm.status === 'active' ? new Date(sm.created_at) : null;

            // raw SQL INSERT — TypeORM Repository.create 오버로드 타입 회피 + 결과 row 즉시 반환.
            const insertResult = await dataSource.query(
              `INSERT INTO kpa_members
                 (user_id, role, status, identity_status, membership_type, joined_at, created_at, updated_at)
               VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW())
               RETURNING id`,
              [sm.user_id, safeRole, safeStatus, derivedType, joinedAt]
            );
            const insertedId: string | undefined = insertResult?.[0]?.id;
            const ensured = insertedId
              ? await memberRepo.findOne({ where: { id: insertedId } })
              : null;
            if (!ensured) {
              res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to ensure kpa_members skeleton' } });
              return;
            }
            member = ensured;
            memberWasEnsured = true;
          }
        }

        const {
          name, membership_type, license_number, pharmacy_name, pharmacy_address,
          activity_type, business_number, pharmacy_phone, nickname,
        } = req.body;
        const changes: Record<string, any> = {};
        const warnings: string[] = [];
        if (memberWasEnsured) {
          changes._kpa_member_ensured = true;
          warnings.push('KPA 회원 정보(kpa_members)가 누락되어 있어 기본 정보로 자동 생성했습니다.');
        }

        // 변경 전 activity_type 보관 — pharmacy_owner 부여/회수 판정용
        const prevActivityType = member.activity_type ?? null;

        // users.businessInfo 사전 조회 — validation + merge + pharmacy_owner 부여 판정에 모두 사용
        const [userRow] = await dataSource.query(
          `SELECT "businessInfo" FROM users WHERE id = $1 LIMIT 1`,
          [member.user_id]
        );
        const prevBiz: Record<string, any> = (userRow?.businessInfo && typeof userRow.businessInfo === 'object')
          ? { ...(userRow.businessInfo as Record<string, any>) }
          : {};

        // kpa_members 필드 업데이트
        const validMembershipTypes = ['pharmacist', 'student', 'pharmacist_member', 'pharmacy_student_member'];
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

        // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
        //   users.nickname canonical write. '' 입력은 NULL 로 저장 (닉네임 해제).
        if (nickname !== undefined) {
          const next = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : null;
          changes.nickname = next;
          await dataSource.query(
            `UPDATE users SET nickname = $1, "updatedAt" = NOW() WHERE id = $2`,
            [next, member.user_id]
          );
        }

        // ─── WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1 ───
        //   business_number / pharmacy_phone → users.businessInfo JSONB merge (별도 컬럼 없음).
        //   이후 pharmacy_owner 부여 분기에서도 prevBiz 가 갱신된 값을 사용.
        let nextBiz: Record<string, any> | null = null;
        if (business_number !== undefined || pharmacy_phone !== undefined) {
          nextBiz = { ...prevBiz };
          if (business_number !== undefined) {
            nextBiz.businessNumber = business_number;
            changes.business_number = business_number;
          }
          if (pharmacy_phone !== undefined) {
            nextBiz.metadata = { ...((prevBiz.metadata as Record<string, any>) || {}), pharmacy_phone };
            changes.pharmacy_phone = pharmacy_phone;
          }
          await dataSource.query(
            `UPDATE users SET "businessInfo" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
            [JSON.stringify(nextBiz), member.user_id]
          );
          // 갱신값을 prevBiz 에 반영 — 이후 부여 분기에서 사용
          Object.assign(prevBiz, nextBiz);
        }

        // 1) kpa_pharmacist_profiles SSOT sync (activity_type SSOT)
        if (activity_type !== undefined) {
          try {
            await dataSource.query(
              `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
               VALUES ($1, $2)
               ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
              [member.user_id, activity_type]
            );
          } catch (syncErr) {
            console.error('[SSOT-SYNC] kpa_pharmacist_profiles sync failed:', syncErr);
          }
        }

        // 2) pharmacy_owner 회수 — 이전 = pharmacy_owner, 새 != pharmacy_owner
        if (
          activity_type !== undefined
          && prevActivityType === 'pharmacy_owner'
          && activity_type !== 'pharmacy_owner'
        ) {
          try {
            await dataSource.query(
              `UPDATE role_assignments
               SET is_active = false, updated_at = NOW()
               WHERE user_id = $1 AND role = 'kpa:store_owner' AND is_active = true`,
              [member.user_id]
            );
            changes._store_owner_revoked = true;
          } catch (revokeErr) {
            console.error('[KPA Operator] kpa:store_owner revoke failed:', revokeErr);
            warnings.push('매장 운영 권한(store_owner) 회수 중 오류가 발생했습니다. 수동 확인이 필요합니다.');
          }
        }

        // 3) pharmacy_owner 부여 — 이전 != pharmacy_owner, 새 = pharmacy_owner
        //   WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1:
        //     silent skip 제거 — 누락 항목을 warnings 로 명시하여 운영자에게 노출.
        if (
          activity_type === 'pharmacy_owner'
          && prevActivityType !== 'pharmacy_owner'
        ) {
          try {
            const rawBusinessNumber = typeof prevBiz.businessNumber === 'string' ? prevBiz.businessNumber : '';
            const businessNumberDigits = rawBusinessNumber.replace(/[^0-9]/g, '');
            const pName = member.pharmacy_name || (typeof prevBiz.businessName === 'string' ? prevBiz.businessName : null);

            const missing: string[] = [];
            if (businessNumberDigits.length === 0) missing.push('사업자번호');
            if (!pName) missing.push('약국명');

            if (missing.length > 0) {
              const reason = `매장 운영 권한(store_owner) 자동 부여 보류: ${missing.join(' / ')} 입력 후 다시 저장하세요.`;
              console.warn(`[KPA Operator] ${reason} — member ${member.id}`);
              changes._store_owner_activation = `skipped:missing:${missing.join(',')}`;
              warnings.push(reason);
            } else {
              const orgCode = `kpa-pharm-${businessNumberDigits}`;
              const orgResult = await organizationOpsService.ensureOrganization({
                name: pName,
                code: orgCode,
                type: 'pharmacy',
                createdByUserId: member.user_id,
              });
              await dataSource.query(
                `UPDATE kpa_members SET organization_id = $1, updated_at = NOW()
                 WHERE user_id = $2 AND organization_id IS NULL`,
                [orgResult.id, member.user_id]
              );
              await organizationOpsService.addMember({
                organizationId: orgResult.id,
                userId: member.user_id,
                role: 'owner',
                isPrimary: false,
              });
              await roleAssignmentService.assignRole({
                userId: member.user_id,
                role: 'kpa:store_owner',
                assignedBy: (req as any).user?.id,
              });
              changes._store_owner_activated = true;
            }
          } catch (activateErr) {
            console.error('[KPA Operator] pharmacy_owner activation failed:', activateErr);
            changes._store_owner_activation = 'error';
            warnings.push('매장 운영 권한(store_owner) 자동 부여 중 오류가 발생했습니다. 수동 확인이 필요합니다.');
          }
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

        res.json({
          success: true,
          data: member,
          ...(warnings.length > 0 ? { warnings } : {}),
        });
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
          // WO-O4O-USER-WITHDRAW-LIFECYCLE-V1: canonical withdraw lifecycle
          // kpa:operator 이상 허용. 이전 직접 save 패턴 → withdrawMembership() 통합.
          const approvalService = new MembershipApprovalService();
          const result = await approvalService.withdrawMembership({
            userId: member.user_id,
            withdrawnBy: (req as any).user?.id ?? null,
            isPlatformAdmin: false,
            serviceKeys: ['kpa-society'],
          });

          const operatorRole = (req as any).user?.scopes?.includes('kpa:admin') ? 'kpa:admin' : 'kpa:operator';
          try {
            await auditRepo.save(auditRepo.create({
              operator_id: (req as any).user?.id,
              operator_role: operatorRole,
              action_type: 'MEMBER_STATUS_CHANGED' as any,
              target_type: 'member',
              target_id: member.id,
              metadata: {
                previousStatus: member.status,
                newStatus: 'withdrawn',
                mode: 'soft',
                inactivatedMemberships: result?.inactivatedMemberships ?? 0,
                deactivatedRoles: result?.deactivatedRoles ?? [],
              },
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
