import { recordEnrollmentPolicies, type EnrollmentPolicyReference } from '../../policy-acceptance/service-enrollment-policy.service.js';
import { SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS, checkoutOrderServiceSetSql, netureOrderServiceSetSql } from '../constants/fulfillment-service-scope.js';
import { Repository, type EntityManager } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierStatus } from '../entities/index.js';
import { NetureSupplierBusinessService } from './supplier-business.service.js';
import logger from '../../../utils/logger.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { getNetureMainMembershipStatus } from './neture-main-membership.js';
import { organizationOpsService } from '../../organization/services/organization-ops.service.js';
import { notificationService } from '../../../services/NotificationService.js';
import { demoAccountService, DEMO_ACCOUNT_FORBIDDEN_CODE } from '../../../services/auth/demo-account.service.js';

/** Supplier registration and state transitions; existing guards and transaction boundaries are preserved. */
export class NetureSupplierLifecycleService {
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    return this._supplierRepo;
  }

  constructor(private readonly businessService = new NetureSupplierBusinessService()) {}

  // ==================== Supplier Registration & Approval ====================

  async registerSupplier(
    userId: string,
    data: { name: string; slug: string; contactEmail?: string; policyReferences?: EnrollmentPolicyReference[] },
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const name = data.name?.trim();
      if (!name) {
        return { success: false, error: 'MISSING_NAME' };
      }
      const slug = data.slug?.trim().toLowerCase();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return { success: false, error: 'INVALID_SLUG' };
      }
      return await AppDataSource.transaction(async manager => {
        if ((await getNetureMainMembershipStatus(manager, userId)) !== 'active') return { success: false, error: 'NETURE_MEMBERSHIP_REQUIRED' };
        const repo = manager.getRepository(NetureSupplier);
        if (await repo.findOne({ where: { userId }, select: ['id'] })) return { success: false, error: 'USER_ALREADY_HAS_SUPPLIER' };
        if (await repo.findOne({ where: { slug }, select: ['id'] })) return { success: false, error: 'SLUG_ALREADY_EXISTS' };
        const policies = await recordEnrollmentPolicies(manager, userId, 'supplier', data.policyReferences);
        const saved = await repo.save(repo.create({ slug, userId, contactEmail: data.contactEmail || null, status: SupplierStatus.PENDING }));
        const organization = await organizationOpsService.ensureOrganization({ name, code: `neture-${slug}`, type: 'supplier',
          metadata: { serviceKey: 'neture', netureSupplierSlug: slug, applicationPolicies: policies },
          createdByUserId: userId, isActive: false }, manager.queryRunner);
        await organizationOpsService.setOwner(organization.id, userId, manager.queryRunner);
        await manager.query('UPDATE neture_suppliers SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL', [organization.id, saved.id]);
        return { success: true, data: { id: saved.id, name, slug: saved.slug, status: saved.status, createdAt: saved.createdAt } };
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error registering supplier:', error);
      throw error;
    }
  }

  async approveSupplier(
    supplierId: string,
    approvedByUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; missingFields?: string[] }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      if (supplier.status !== SupplierStatus.PENDING) return { success: false, error: 'INVALID_STATUS' };
      if (await this.isDemoSupplier(supplier.userId, supplier.organizationId)) {
        return { success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE };
      }
      // 승인 전제조건 = 신청자의 **현재** Neture 가입 승인. 공급자 승인이 Neture 가입을 대신 승인하지 않는다(CHECK §10 E3).
      if (supplier.userId && (await getNetureMainMembershipStatus(AppDataSource, supplier.userId)) !== 'active') {
        return { success: false, error: 'APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE' };
      }

      // Business registration details and owned evidence precede approval.
      const businessOrganization = await this.businessService.getOrgData(supplier.organizationId);
      if (!supplier.businessRegistrationDocumentId || !businessOrganization?.business_number?.trim() || !businessOrganization?.address?.trim() || !supplier.representativeName?.trim() || !supplier.businessType?.trim() || !supplier.businessItem?.trim()) {
        return { success: false, error: 'BUSINESS_REGISTRATION_REQUIRED' };
      }
      const [proof] = await AppDataSource.query(
        `SELECT id FROM kyc_documents WHERE id = $1 AND user_id = $2
           AND "documentType" = 'business_registration' AND "verificationStatus" IN ('PENDING','VERIFIED')`,
        [supplier.businessRegistrationDocumentId, supplier.userId],
      );
      if (!proof) return { success: false, error: 'BUSINESS_REGISTRATION_REQUIRED' };
      supplier.status = SupplierStatus.ACTIVE;
      supplier.approvedBy = approvedByUserId;
      supplier.approvedAt = new Date();
      await this.supplierRepo.save(supplier);

      if (supplier.userId) {
        // Neture 가입 원장(service_memberships 'neture')은 바꾸지 않는다 — 위 전제조건으로 active 임을 확인했다.
        // Service-scoped supplier role; legacy unprefixed assignments are not newly granted.
        await roleAssignmentService.assignRole({
          userId: supplier.userId, role: 'neture:supplier', assignedBy: approvedByUserId,
        });
        logger.info(`[NetureSupplierService] Role supplier assigned to user ${supplier.userId}`);
      }

      // WO-O4O-NETURE-ORG-DATA-MODEL-V1: ensure org exists + activate
      await this.syncSupplierOrganization(supplier, { isActive: true });
      await this.setOrgActive(supplier, true);

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: read name from org
      const org = await this.businessService.getOrgData(supplier.organizationId);
      logger.info(`[NetureSupplierService] Supplier approved: ${supplierId} by ${approvedByUserId}`);

      // WO-O4O-NETURE-SUPPLIER-GUARD-IA-NOTIFICATION-AND-RESIDUAL-DEFECT-CLOSEOUT-V1 (H):
      // 승인 전이 성공 후 공급자 본인에게 알림(fire-and-forget). 승인으로 supplier 역할을
      // 부여받았으므로 targetUrl 은 guard 통과하는 canonical /supplier/dashboard 로 지정.
      await this.notifySupplierAccount(
        supplier.userId,
        '공급자 승인 완료',
        `${org?.name ? `[${org.name}] ` : ''}공급자 승인이 완료되었습니다. 이제 공급자 공간을 이용할 수 있습니다.`,
        '/supplier/dashboard',
        { supplierId: supplier.id, status: supplier.status },
      );

      return {
        success: true,
        data: { id: supplier.id, name: org?.name ?? '', status: supplier.status, approvedBy: supplier.approvedBy, approvedAt: supplier.approvedAt },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error approving supplier:', error);
      throw error;
    }
  }

  async rejectSupplier(
    supplierId: string,
    rejectedByUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      if (supplier.status !== SupplierStatus.PENDING) return { success: false, error: 'INVALID_STATUS' };
      if (await this.isDemoSupplier(supplier.userId, supplier.organizationId)) {
        return { success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE };
      }

      supplier.status = SupplierStatus.REJECTED;
      supplier.approvedBy = rejectedByUserId;
      supplier.approvedAt = new Date();
      supplier.rejectedReason = reason || null;
      await this.supplierRepo.save(supplier);

      if (supplier.userId) {
        // 공급자 반려는 공급자 원장만 바꾼다 — Neture 가입(service_memberships 'neture')은 그대로 둔다(CHECK §10 E3).
        await roleAssignmentService.removeRole(supplier.userId, 'supplier');
        await roleAssignmentService.removeRole(supplier.userId, 'neture:supplier');
      }

      const org = await this.businessService.getOrgData(supplier.organizationId);
      logger.info(`[NetureSupplierService] Supplier rejected: ${supplierId} by ${rejectedByUserId}`);

      // WO-O4O-NETURE-SUPPLIER-GUARD-IA-NOTIFICATION-AND-RESIDUAL-DEFECT-CLOSEOUT-V1 (H):
      // 반려 전이 성공 후 신청자 본인에게 알림(fire-and-forget). 반려로 supplier 역할이
      // 제거되므로 /supplier/* deep link 는 guard 에서 막힌다 → guard-safe 한 프로필 경로로 이동.
      await this.notifySupplierAccount(
        supplier.userId,
        '공급자 승인 반려',
        reason
          ? `공급자 승인 요청이 반려되었습니다. 사유: ${reason}`
          : '공급자 승인 요청이 반려되었습니다. 정보를 보완한 뒤 다시 신청할 수 있습니다.',
        '/mypage/business-profile',
        { supplierId: supplier.id, status: supplier.status, reason: reason ?? null },
      );

      return {
        success: true,
        data: { id: supplier.id, name: org?.name ?? '', status: supplier.status, rejectedReason: supplier.rejectedReason },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error rejecting supplier:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1:
   * Demo 공급자는 `neture_suppliers.user_id` 가 NULL 일 수 있다 — 연결 user 와 조직 owner 를 함께 본다.
   * 판정 정본은 `demo_accounts.user_id`. 조회 실패는 그대로 올린다(fail-closed).
   */
  private async isDemoSupplier(
    userId: string | null | undefined,
    organizationId: string | null | undefined,
    manager?: EntityManager,
  ): Promise<boolean> {
    return (
      (await demoAccountService.isDemoAccount(userId, manager)) ||
      (await demoAccountService.isDemoOrganization(organizationId, manager))
    );
  }

  /**
   * WO-O4O-NETURE-SUPPLIER-GUARD-IA-NOTIFICATION-AND-RESIDUAL-DEFECT-CLOSEOUT-V1 (H):
   * 공급자 계정 상태전이(승인/반려) 알림 — 단일 수신자(공급자 본인) scope, serviceKey='neture'.
   * canonical notificationService 재사용(SSE emit 포함). 알림 실패가 상태전이 결과에 영향을 주지
   * 않도록 fire-and-forget + try/catch. userId 없으면 no-op.
   */
  private async notifySupplierAccount(
    userId: string | null | undefined,
    title: string,
    message: string,
    targetUrl: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (!userId) return;
    try {
      await notificationService.createNotification({
        userId,
        type: 'custom',
        title,
        message,
        serviceKey: 'neture',
        metadata: { ...metadata, targetUrl },
      });
    } catch (err) {
      logger.warn('[NetureSupplierService] Failed to send supplier account notification', err);
    }
  }

  // WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §6:
  // 활성 공급자 비활성화 = 예외 governance (admin 전용). 진행 주문·미정산·정산 진행 중이면 차단한다.
  // 트랜잭션 안에서 상태를 재확인(FOR UPDATE)하여 동시 요청 시 하나만 성공하고, 부분 성공을 남기지 않는다.
  async deactivateSupplier(
    supplierId: string,
    adminUserId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    guard?: SupplierObligationGuard;
  }> {
    const trimmedReason = (reason ?? '').trim();
    if (!trimmedReason) return { success: false, error: 'REASON_REQUIRED' };

    try {
      return await AppDataSource.transaction(async (manager) => {
        // §8: lock supplier row → 동시 요청 직렬화 + 트랜잭션 내 상태 재확인
        const target = await this.lockSupplierForTransition(supplierId, SupplierStatus.ACTIVE, manager);
        if ('error' in target) return { success: false, error: target.error };
        const locked = target.supplier;

        // §6: 서버 측 주문·정산 재검증 (강제 override 없음)
        const guard = await this.countSupplierObligations(supplierId, manager);
        if (guard.activeOrderCount > 0 || guard.unsettledCount > 0 || guard.settlementInProgressCount > 0) {
          return { success: false, error: 'SUPPLIER_DEACTIVATION_BLOCKED', guard };
        }

        await manager.query(
          `UPDATE neture_suppliers SET status = $2, updated_at = NOW() WHERE id = $1`,
          [supplierId, SupplierStatus.INACTIVE],
        );

        const revokeResult = await manager.query(
          `UPDATE product_approvals
           SET approval_status = 'revoked',
               decided_by = $2::uuid,
               decided_at = NOW(),
               reason = 'Supplier deactivated',
               updated_at = NOW()
           WHERE offer_id IN (
             SELECT id FROM supplier_product_offers WHERE supplier_id = $1
           )
           AND approval_status = 'approved'`,
          [supplierId, adminUserId],
        );
        const revokedCount = revokeResult?.[1] ?? 0;

        await manager.query(
          `UPDATE organization_product_listings
           SET is_active = false, updated_at = NOW()
           WHERE offer_id IN (
             SELECT id FROM supplier_product_offers WHERE supplier_id = $1
           )`,
          [supplierId],
        );

        // 공급자 비활성화는 공급자 원장 · 조직 · role 만 바꾼다 — Neture 가입 원장은 그대로 둔다(CHECK §10 E3).

        if (locked.organization_id) {
          await manager.query(
            `UPDATE organizations SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
            [locked.organization_id],
          );
        }

        // RBAC SSOT (F9): role 쓰기는 roleAssignmentService 를 통해서만. 커밋 성공 후 role 회수.
        // (트랜잭션 롤백 시 role 은 손대지 않아 부분 성공을 남기지 않는다.)
        const org = await this.businessService.getOrgData(locked.organization_id);
        return {
          success: true,
          data: {
            id: supplierId,
            name: org?.name ?? '',
            status: SupplierStatus.INACTIVE,
            previousStatus: SupplierStatus.ACTIVE,
            affectedOrganizationId: locked.organization_id,
            revokedApprovalCount: revokedCount,
            userId: locked.user_id,
            guard,
          },
        };
      }).then(async (result) => {
        if (result.success && result.data?.userId) {
          await roleAssignmentService.removeRole(result.data.userId as string, 'supplier');
          await roleAssignmentService.removeRole(result.data.userId as string, 'neture:supplier');
        }
        if (result.success) {
          logger.info(
            `[NetureSupplierService] Supplier deactivated: ${supplierId} by ${adminUserId} (revoked ${result.data?.revokedApprovalCount} approvals)`,
          );
          // WO-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1:
          // 비활성화 알림 — 커밋 성공 + role 회수 후 fire-and-forget. supplier role 이 제거되어 /supplier/* 는
          // guard 차단되므로 guard-safe 한 /mypage/business-profile 로 안내. 사유 원문은 본문에 넣지 않는다.
          await this.notifySupplierAccount(
            result.data.userId as string | null,
            '공급자 계정이 비활성화되었습니다',
            '계정이 비활성화되어 공급자 기능 이용이 중단되었습니다. 자세한 내용은 사업자 프로필에서 확인해 주세요.',
            '/mypage/business-profile',
            { supplierId, status: SupplierStatus.INACTIVE },
          );
        }
        return result;
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error deactivating supplier:', error);
      throw error;
    }
  }

  // WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §7:
  // 재활성화 (INACTIVE → ACTIVE, admin 전용). 접근 상태만 복구한다:
  // supplier status / organization active / supplier role. (Neture 가입 원장은 복구하지 않는다 — 전제조건으로 확인만)
  // 상품 승인·매장 진열·HUB 게시 등 상거래 상태는 자동 복구하지 않는다(운영자·공급자가 재수행).
  async reactivateSupplier(
    supplierId: string,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const trimmedReason = (reason ?? '').trim();
    if (!trimmedReason) return { success: false, error: 'REASON_REQUIRED' };

    try {
      return await AppDataSource.transaction(async (manager) => {
        // §8: lock + 트랜잭션 내 상태 재확인 (INACTIVE 만 재활성화)
        const target = await this.lockSupplierForTransition(supplierId, SupplierStatus.INACTIVE, manager);
        if ('error' in target) return { success: false, error: target.error };
        const locked = target.supplier;

        // 재활성화 전제조건 = 현재 Neture 가입 승인. Neture 가입 원장은 바꾸지 않는다(CHECK §10 E3).
        if (locked.user_id && (await getNetureMainMembershipStatus(manager, locked.user_id)) !== 'active') {
          return { success: false, error: 'APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE' };
        }

        const [proof] = await manager.query(
          `SELECT d.id FROM neture_suppliers s
             JOIN organizations o ON o.id = s.organization_id
             JOIN kyc_documents d ON d.id = s.business_registration_document_id AND d.user_id = s.user_id
            WHERE s.id = $1 AND d."documentType" = 'business_registration'
              AND d."verificationStatus" IN ('PENDING','VERIFIED')
              AND NULLIF(TRIM(o.business_number), '') IS NOT NULL AND NULLIF(TRIM(o.address), '') IS NOT NULL
              AND NULLIF(TRIM(s.representative_name), '') IS NOT NULL
              AND NULLIF(TRIM(s.business_type), '') IS NOT NULL AND NULLIF(TRIM(s.business_item), '') IS NOT NULL`,
          [supplierId],
        );
        if (!proof) return { success: false, error: 'BUSINESS_REGISTRATION_REQUIRED' };

        await manager.query(
          `UPDATE neture_suppliers SET status = $2, updated_at = NOW() WHERE id = $1`,
          [supplierId, SupplierStatus.ACTIVE],
        );

        if (locked.organization_id) {
          await manager.query(
            `UPDATE organizations SET "isActive" = true, "updatedAt" = NOW() WHERE id = $1`,
            [locked.organization_id],
          );
        }

        const org = await this.businessService.getOrgData(locked.organization_id);
        return {
          success: true,
          data: {
            id: supplierId,
            name: org?.name ?? '',
            status: SupplierStatus.ACTIVE,
            previousStatus: SupplierStatus.INACTIVE,
            affectedOrganizationId: locked.organization_id,
            userId: locked.user_id,
          },
        };
      }).then(async (result) => {
        if (result.success && result.data?.userId) {
          // RBAC SSOT (F9): 커밋 성공 후 supplier role 복구 (assignRole 은 기존 비활성 배정을 재활성화).
          await roleAssignmentService.assignRole({
            userId: result.data.userId as string,
            role: 'neture:supplier',
            assignedBy: adminUserId,
          });
        }
        if (result.success) {
          logger.info(`[NetureSupplierService] Supplier reactivated: ${supplierId} by ${adminUserId}`);
          // WO-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1:
          // 재활성화 알림 — 커밋 성공 + role 복구 후 fire-and-forget. role 이 복구되어 /supplier/dashboard guard 통과.
          await this.notifySupplierAccount(
            result.data.userId as string | null,
            '공급자 계정이 재활성화되었습니다',
            '계정이 재활성화되어 공급자 기능을 다시 이용할 수 있습니다. 상품 승인·매장 진열은 다시 신청해 주세요.',
            '/supplier/dashboard',
            { supplierId, status: SupplierStatus.ACTIVE },
          );
        }
        return result;
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error reactivating supplier:', error);
      throw error;
    }
  }

  /** Both governance transitions recheck the current status and Demo ownership under the same row lock. */
  private async lockSupplierForTransition(
    supplierId: string,
    expectedStatus: SupplierStatus,
    manager: EntityManager,
  ): Promise<{ supplier: { status: string; user_id: string | null; organization_id: string | null } } | { error: string }> {
    const lockedRows: Array<{ status: string; user_id: string | null; organization_id: string | null }> =
      await manager.query(
        `SELECT status, user_id, organization_id FROM neture_suppliers WHERE id = $1 FOR UPDATE`,
        [supplierId],
      );
    const locked = lockedRows[0];
    if (!locked) return { error: 'SUPPLIER_NOT_FOUND' };
    if (locked.status !== expectedStatus) return { error: 'INVALID_STATUS' };
    if (await this.isDemoSupplier(locked.user_id, locked.organization_id, manager)) {
      return { error: DEMO_ACCOUNT_FORBIDDEN_CODE };
    }
    return { supplier: locked };
  }

  // §6: 공급자의 진행 주문·미정산·정산 진행 건수. 비활성화 차단 판단의 단일 근거.
  // 주문 스코프는 공급자 주문 워크스페이스와 동일한 canonical join 을 사용한다.
  private async countSupplierObligations(
    supplierId: string,
    manager: EntityManager,
  ): Promise<SupplierObligationGuard> {
    // neture_orders 비종결(created/pending_payment/paid/preparing/shipped)
    const netureOrderRows: Array<{ c: string }> = await manager.query(
      `SELECT COUNT(DISTINCT o.id)::text AS c
       FROM neture_orders o
       JOIN neture.neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE spo.supplier_id = $1
         AND o.status IN ('created','pending_payment','paid','preparing','shipped')
         AND ${netureOrderServiceSetSql('o', '$2')}`,
      [supplierId, SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS],
    );
    // 결제완료·미브릿지 checkout_orders (워크스페이스가 진행 주문으로 노출)
    const checkoutRows: Array<{ c: string }> = await manager.query(
      `SELECT COUNT(*)::text AS c
       FROM checkout_orders co
       WHERE co."supplierId" = $1
         AND co."paymentStatus" = 'paid'
         AND ${checkoutOrderServiceSetSql('co', '$2')}
         AND NOT EXISTS (
           SELECT 1 FROM neture_orders no2 WHERE no2.metadata->>'checkoutOrderId' = co.id::text
         )`,
      [supplierId, SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS],
    );
    const unsettledRows: Array<{ c: string }> = await manager.query(
      `SELECT COUNT(*)::text AS c FROM neture_settlements
       WHERE supplier_id = $1 AND status IN ('pending','calculated','approved')`,
      [supplierId],
    );
    const inProgressRows: Array<{ c: string }> = await manager.query(
      `SELECT COUNT(*)::text AS c FROM neture_settlements
       WHERE supplier_id = $1 AND status IN ('calculated','approved')`,
      [supplierId],
    );
    const activeOrderCount =
      parseInt(netureOrderRows[0]?.c ?? '0', 10) + parseInt(checkoutRows[0]?.c ?? '0', 10);
    return {
      activeOrderCount,
      unsettledCount: parseInt(unsettledRows[0]?.c ?? '0', 10),
      settlementInProgressCount: parseInt(inProgressRows[0]?.c ?? '0', 10),
    };
  }

  // ==================== Organization Sync (WO-O4O-NETURE-ORG-DATA-MODEL-V1 Phase 2-B) ====================

  /**
   * Ensure an organizations record exists for this supplier.
   * Creates org + organization_members + enrollment as side-effects.
   * Idempotent: skips if already linked.
   *
   * WO-O4O-ORGANIZATION-SERVICE-CENTRALIZATION-V1: organizationOpsService 전환
   */
  private async syncSupplierOrganization(
    supplier: NetureSupplier,
    options?: { isActive?: boolean; name?: string },
  ): Promise<void> {
    const isActive = options?.isActive ?? (supplier.status === SupplierStatus.ACTIVE);
    const orgName = options?.name || supplier.slug;

    try {
      // 1. Ensure org exists
      if (!supplier.organizationId) {
        const orgCode = `neture-${supplier.slug}`;
        const result = await organizationOpsService.ensureOrganization({
          name: orgName,
          code: orgCode,
          type: 'supplier',
          metadata: { serviceKey: 'neture', netureSupplierSlug: supplier.slug },
          createdByUserId: supplier.userId || undefined,
          isActive,
        });

        // Link supplier → organization (domain-specific)
        await AppDataSource.query(
          `UPDATE neture_suppliers SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL`,
          [result.id, supplier.id],
        );
        supplier.organizationId = result.id;
        logger.info(`[NetureSupplierService] Org linked: supplier=${supplier.id} → org=${result.id}`);
      }

      const orgId = supplier.organizationId;

      // 2. Ensure owner member
      //     WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §C:
      //     organization_members(owner) 가 **canonical authorization 관계**다. 생성 실패를 조용히
      //     넘기면 신규 공급자가 로그인해도 진입하지 못한다(운영 3건이 정확히 그 상태).
      if (supplier.userId) {
        try {
          await organizationOpsService.setOwner(orgId, supplier.userId);
        } catch (ownerErr) {
          logger.error(
            `[NetureSupplierService] CANONICAL_OWNER_MEMBERSHIP_FAILED supplier=${supplier.id} org=${orgId}`,
            ownerErr,
          );
          throw ownerErr;
        }
      } else {
        logger.error(
          `[NetureSupplierService] CANONICAL_OWNER_MEMBERSHIP_SKIPPED supplier=${supplier.id} org=${orgId}`,
        );
      }

      // 3. Ensure service enrollment (only when active)
      if (isActive) {
        await organizationOpsService.enrollService({ organizationId: orgId, serviceCode: 'neture' });
      }
    } catch (error) {
      // Non-fatal: log and continue (org sync is a side-effect, must not break core flow)
      logger.warn(`[NetureSupplierService] Org sync failed for supplier ${supplier.id}:`, error);
    }
  }

  /**
   * Set organizations.isActive based on supplier status change.
   */
  private async setOrgActive(supplier: NetureSupplier, isActive: boolean): Promise<void> {
    if (!supplier.organizationId) return;

    try {
      await AppDataSource.query(
        `UPDATE organizations SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [isActive, supplier.organizationId],
      );
    } catch (error) {
      logger.warn(`[NetureSupplierService] Org active sync failed for org ${supplier.organizationId}:`, error);
    }
  }
}

// ==================== Paged Supplier List — pure helper ====================
// WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1
// getAllSuppliers() 의 enriched 결과 위에서 검색·상태필터·정렬·페이지네이션을 수행하는 순수 함수.
// DB 비의존 → 단위 테스트 가능. (count(total)/summary/data 가 동일 배열에서 파생되어 일관성 보장)

// §6: 비활성화 차단 판단 근거 (진행 주문·미정산·정산 진행 건수). 컨트롤러 409 응답 payload.
export interface SupplierObligationGuard {
  activeOrderCount: number;
  unsettledCount: number;
  settlementInProgressCount: number;
}
