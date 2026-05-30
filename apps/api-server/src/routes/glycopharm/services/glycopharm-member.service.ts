/**
 * GlycopharmMemberService
 *
 * WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
 * 약사 회원 가입 신청 → 운영자 승인/거절 → 역할 부여 흐름
 *
 * WO-O4O-GLYCOPHARM-PHARMACY-OWNER-APPROVAL-FLOW-ENROLLMENT-CREATION-FIX-V1:
 *   본 service 의 pharmacy_owner 승인은 기존에 service_memberships + role_assignments
 *   (glycopharm:pharmacist + glycopharm:store_owner) 만 생성하고 organizations /
 *   organization_service_enrollments / organization_members 는 생성하지 않아,
 *   backend pharmacy-context middleware 및 store-hub guard 가 요구하는 4-tier 정합성을 충족하지 못함.
 *   (선행 IR: docs/investigations/IR-O4O-GLYCOPHARM-STORE-PAGE-INTERNAL-API-AUTH-AND-COCKPIT-AUDIT-V1.md)
 *
 *   approveMember 의 pharmacy_owner 분기에서 organizationOpsService.ensureOrganizationWithOwnerAndService
 *   를 호출하여 organization + owner + 'glycopharm' enrollment 를 idempotent 하게 생성하도록 보강.
 *   기존 호출 측 입력(organizationId 또는 pharmacyName)에 따라 분기.
 */

import type { DataSource } from 'typeorm';
import { GlycopharmMember } from '../entities/glycopharm-member.entity.js';
import { RoleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';
// WO-O4O-GLYCOPHARM-MEMBERSHIP-APPROVAL-NOTIFICATION-V1: 승인/거절 in-app 알림
import { notificationService } from '../../../services/NotificationService.js';
// WO-O4O-GLYCOPHARM-PHARMACY-OWNER-APPROVAL-FLOW-ENROLLMENT-CREATION-FIX-V1
import { organizationOpsService } from '../../../modules/organization/services/organization-ops.service.js';

export interface ApplyMemberDto {
  subRole: 'pharmacy_owner' | 'staff_pharmacist';
  licenseNumber?: string;
  organizationId?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
}

export class GlycopharmMemberService {
  private roleAssignmentService: RoleAssignmentService;

  constructor(private dataSource: DataSource) {
    this.roleAssignmentService = new RoleAssignmentService();
  }

  private get repo() {
    return this.dataSource.getRepository(GlycopharmMember);
  }

  /**
   * 가입 신청: pending 상태로 glycopharm_members 생성
   */
  async applyMembership(userId: string, dto: ApplyMemberDto): Promise<GlycopharmMember> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      const err = new Error('ALREADY_APPLIED') as any;
      err.code = 'ALREADY_APPLIED';
      throw err;
    }

    if (dto.subRole === 'pharmacy_owner' && !dto.organizationId && !dto.pharmacyName) {
      const err = new Error('PHARMACY_INFO_REQUIRED') as any;
      err.code = 'PHARMACY_INFO_REQUIRED';
      throw err;
    }

    const member = this.repo.create({
      userId,
      membershipType: 'pharmacist',
      subRole: dto.subRole,
      organizationId: dto.organizationId ?? null,
      status: 'pending',
      metadata: {
        licenseNumber: dto.licenseNumber,
        pharmacyName: dto.pharmacyName,
        pharmacyAddress: dto.pharmacyAddress,
      },
    });

    const saved = await this.repo.save(member);

    // sync service_memberships so operator pending tab shows this application
    await this.dataSource.query(
      `INSERT INTO service_memberships (id, user_id, service_key, status, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'glycopharm', 'pending', 'pharmacist', NOW(), NOW())
       ON CONFLICT (user_id, service_key) DO UPDATE SET status = 'pending', updated_at = NOW()`,
      [userId],
    );

    return saved;
  }

  /**
   * 운영자 승인: status=approved + glycopharm:pharmacist 역할 부여
   */
  async approveMember(memberId: string, operatorId: string): Promise<GlycopharmMember> {
    const member = await this.repo.findOne({ where: { id: memberId } });
    if (!member) {
      const err = new Error('NOT_FOUND') as any;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (member.status !== 'pending') {
      const err = new Error('NOT_PENDING') as any;
      err.code = 'NOT_PENDING';
      throw err;
    }

    member.status = 'approved';
    member.approvedBy = operatorId;
    member.approvedAt = new Date();
    member.rejectionReason = null;
    await this.repo.save(member);

    // WO-O4O-GLYCOPHARM-APPROVED-MEMBER-LOGIN-MEMBERSHIP-FIX-V1:
    // plain UPDATE → UPSERT: service_memberships 행이 없을 때 UPDATE 0 rows silent fail 방지.
    // (약국경영자 경로 admin.controller.ts 와 동일 패턴)
    await this.dataSource.query(
      `INSERT INTO service_memberships (user_id, service_key, status, role, approved_by, approved_at, created_at, updated_at)
       VALUES ($1, 'glycopharm', 'active', 'pharmacist', $2, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, service_key) DO UPDATE
         SET status = 'active',
             approved_by = COALESCE(service_memberships.approved_by, EXCLUDED.approved_by),
             approved_at = COALESCE(service_memberships.approved_at, EXCLUDED.approved_at),
             updated_at = NOW()`,
      [member.userId, operatorId],
    );

    // 역할 부여: glycopharm:pharmacist
    await this.roleAssignmentService.assignRole({
      userId: member.userId,
      role: 'glycopharm:pharmacist',
      assignedBy: operatorId,
    });

    // WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1: pharmacy_owner → glycopharm:store_owner
    // WO-O4O-GLYCOPHARM-PHARMACY-OWNER-APPROVAL-FLOW-ENROLLMENT-CREATION-FIX-V1:
    //   role 부여만으로는 backend 4-tier 정합 불충족 (pharmacy-context middleware 가 organization +
    //   organization_service_enrollments.glycopharm 을 요구). organization/enrollment/owner 동시 생성.
    if (member.subRole === 'pharmacy_owner') {
      // ─── 4-tier 정합 보강: organization + owner + enrollment ───
      // 입력 분기: applyMembership 에서 organizationId(기존 조직 연결) 또는 pharmacyName(신규 조직 생성) 중 하나가 보장됨.
      // 둘 다 실패하면 기존 동작과 동일하게 role 만 부여하고 best-effort 경고 로깅.
      try {
        if (member.organizationId) {
          // 기존 조직: enrollment + owner 만 보강 (멱등)
          await organizationOpsService.enrollService({
            organizationId: member.organizationId,
            serviceCode: 'glycopharm',
          });
          await organizationOpsService.setOwner(member.organizationId, member.userId);
        } else {
          // 신규 조직: ensureOrganization + setOwner + enrollService 한꺼번에 (canonical helper)
          const meta = (member.metadata ?? {}) as Record<string, unknown>;
          const pharmacyName = typeof meta.pharmacyName === 'string' ? meta.pharmacyName : null;
          if (pharmacyName) {
            // code 패턴: 사용자 UUID 의 첫 12 hex (deterministic → 재실행 시 ensureOrganization 의 ON CONFLICT (code) 동일 row 반환)
            const orgCode = `gp-pharm-${member.userId.replace(/-/g, '').substring(0, 12)}`;
            await organizationOpsService.ensureOrganizationWithOwnerAndService(
              {
                name: pharmacyName,
                code: orgCode,
                type: 'pharmacy',
                createdByUserId: member.userId,
                metadata:
                  typeof meta.pharmacyAddress === 'string'
                    ? { address: meta.pharmacyAddress }
                    : undefined,
              },
              member.userId,
              'glycopharm',
            );
          } else {
            console.warn(
              `[GlycopharmMember] pharmacy_owner approval ${member.id} has neither organizationId nor metadata.pharmacyName — ` +
                'organization/enrollment not created. (applyMembership 의 PHARMACY_INFO_REQUIRED 검사가 우회된 비정상 케이스)',
            );
          }
        }
      } catch (orgError) {
        // organization/enrollment 생성 실패는 비차단 — role 부여는 계속 수행하여 부분 정합이라도 보장.
        // 실패 사후 추적용 로그 (재시도 또는 manual recovery 가능).
        console.error(
          `[GlycopharmMember] organization/enrollment provisioning failed for pharmacy_owner ${member.id}:`,
          orgError,
        );
      }

      // role 부여 (기존 동작 유지)
      await this.roleAssignmentService.assignRole({
        userId: member.userId,
        role: 'glycopharm:store_owner',
        assignedBy: operatorId,
      });
    }

    // WO-O4O-GLYCOPHARM-MEMBERSHIP-APPROVAL-NOTIFICATION-V1: 승인 in-app 알림 (best-effort)
    try {
      await notificationService.createNotification({
        userId: member.userId,
        type: 'member.registration_approved',
        title: 'GlycoPharm 가입 승인 완료',
        message: 'GlycoPharm 서비스 가입이 승인되었습니다.',
        serviceKey: 'glycopharm',
        actorId: operatorId,
        metadata: {
          memberId: member.id,
          targetUrl: '/mypage',
        },
      });
    } catch (notifyError) {
      console.warn('[GlycoPharm Notification] Approval notify failed (best-effort):', notifyError);
    }

    return member;
  }

  /**
   * 운영자 거절: status=rejected + rejection_reason 저장
   */
  async rejectMember(memberId: string, operatorId: string, reason?: string): Promise<GlycopharmMember> {
    const member = await this.repo.findOne({ where: { id: memberId } });
    if (!member) {
      const err = new Error('NOT_FOUND') as any;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (member.status !== 'pending') {
      const err = new Error('NOT_PENDING') as any;
      err.code = 'NOT_PENDING';
      throw err;
    }

    member.status = 'rejected';
    member.rejectionReason = reason ?? null;
    await this.repo.save(member);

    // sync service_memberships status to rejected
    await this.dataSource.query(
      `UPDATE service_memberships SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
       WHERE user_id = $1 AND service_key = 'glycopharm'`,
      [member.userId, reason ?? null],
    );

    // WO-O4O-GLYCOPHARM-MEMBERSHIP-APPROVAL-NOTIFICATION-V1: 거절 in-app 알림 (best-effort)
    try {
      await notificationService.createNotification({
        userId: member.userId,
        type: 'member.registration_rejected',
        title: 'GlycoPharm 가입 신청 반려',
        message: 'GlycoPharm 서비스 가입 신청이 반려되었습니다. 자세한 내용은 마이페이지에서 확인해 주세요.',
        serviceKey: 'glycopharm',
        actorId: operatorId,
        metadata: {
          memberId: member.id,
          rejectionReason: reason ?? null,
          targetUrl: '/mypage',
        },
      });
    } catch (notifyError) {
      console.warn('[GlycoPharm Notification] Rejection notify failed (best-effort):', notifyError);
    }

    return member;
  }

  /**
   * 현재 사용자 신청 상태 조회
   */
  async getMyMembership(userId: string): Promise<GlycopharmMember | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /**
   * 운영자용 회원 목록 조회
   */
  async listMembers(opts: {
    status?: string;
    subRole?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: GlycopharmMember[]; total: number; page: number; totalPages: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;

    const qb = this.repo.createQueryBuilder('m');
    if (opts.status) qb.andWhere('m.status = :status', { status: opts.status });
    if (opts.subRole) qb.andWhere('m.sub_role = :subRole', { subRole: opts.subRole });
    qb.orderBy('m.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
