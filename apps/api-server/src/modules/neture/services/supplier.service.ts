// WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
import { SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS, checkoutOrderServiceSetSql, netureOrderServiceSetSql } from '../constants/fulfillment-service-scope.js';
import { Repository } from 'typeorm';
import { NetureSupplierBusinessService } from './supplier-business.service.js';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NetureSupplier,
  SupplierStatus,
  ContactVisibility,
} from '../entities/index.js';
import logger from '../../../utils/logger.js';
import { listOwnedSupplierIds, resolveSupplierIdForUser } from '../middleware/supplier-context.resolver.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { getNetureMainMembershipStatus } from './neture-main-membership.js';
import { organizationOpsService } from '../../organization/services/organization-ops.service.js';
import { notificationService } from '../../../services/NotificationService.js';
import { demoAccountService, DEMO_ACCOUNT_FORBIDDEN_CODE } from '../../../services/auth/demo-account.service.js';
// WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1: json 컬럼 안전 부분 갱신

export { SupplierProfileFieldUnsupportedError } from './supplier-business.service.js';


/**
 * NetureSupplierService
 *
 * All Supplier-related methods extracted from NetureService.
 * (WO-O4O-NETURE-SERVICE-SPLIT-V1)
 */
export class NetureSupplierService {
  // Lazy repositories
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private _businessService?: NetureSupplierBusinessService;

  private get businessService(): NetureSupplierBusinessService {
    if (!this._businessService) this._businessService = new NetureSupplierBusinessService();
    return this._businessService;
  }

  // ==================== Supplier Identity ====================

  // WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1:
  //   이 두 getter 는 Content Library · 상품 이미지 · hub-trigger 의 guard 가 쓴다. `where: { userId }`
  //   (legacy pointer) 대신 API guard 와 같은 canonical resolver 로 공급자를 찾는다.
  //   후보 N 개면 null(임의 선택 0) — 호출부는 기존 NO_SUPPLIER 계약을 유지한다.
  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    try {
      const resolved = await resolveSupplierIdForUser(AppDataSource, userId);
      return resolved?.supplierId ?? null;
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    try {
      const resolved = await resolveSupplierIdForUser(AppDataSource, userId);
      if (!resolved) return null;
      return await this.supplierRepo.findOne({
        where: { id: resolved.supplierId },
        relations: ['offers'],
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  // ==================== Supplier Registration & Approval ====================

  async registerSupplier(
    userId: string,
    data: { name: string; slug: string; contactEmail?: string },
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
      // 신청 자격 = Neture 가입 승인(active). 공급자 신청 · 승인은 Neture 원장을 바꾸지 않는다(CHECK §10 E2 · E3).
      if ((await getNetureMainMembershipStatus(AppDataSource, userId)) !== 'active') {
        return { success: false, error: 'NETURE_MEMBERSHIP_REQUIRED' };
      }
      const existingByUser = await this.supplierRepo.findOne({ where: { userId }, select: ['id'] });
      if (existingByUser) {
        return { success: false, error: 'USER_ALREADY_HAS_SUPPLIER' };
      }
      const existingBySlug = await this.supplierRepo.findOne({ where: { slug }, select: ['id'] });
      if (existingBySlug) {
        return { success: false, error: 'SLUG_ALREADY_EXISTS' };
      }
      const supplier = this.supplierRepo.create({
        slug, userId,
        contactEmail: data.contactEmail || null,
        status: SupplierStatus.PENDING,
      });
      const saved = await this.supplierRepo.save(supplier);
      logger.info(`[NetureSupplierService] Supplier registered: ${saved.id} (PENDING) by user ${userId}`);

      // WO-O4O-NETURE-ORG-DATA-MODEL-V1: create org (isActive=false for PENDING)
      await this.syncSupplierOrganization(saved, { isActive: false, name });

      return {
        success: true,
        data: { id: saved.id, name, slug: saved.slug, status: saved.status, createdAt: saved.createdAt },
      };
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
      const businessOrganization = await this.getOrgData(supplier.organizationId);
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
      const org = await this.getOrgData(supplier.organizationId);
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

      const org = await this.getOrgData(supplier.organizationId);
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

  // ==================== Supplier Queries ====================

  async getPendingSuppliers(): Promise<Array<{ id: string; name: string; slug: string; contactEmail: string | null; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date }>> {
    try {
      const suppliers = await this.supplierRepo.find({
        where: { status: SupplierStatus.PENDING },
        order: { createdAt: 'ASC' },
      });

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT u.id, u.status, u.email FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        return {
          id: s.id, name: org?.name ?? '', slug: s.slug,
          contactEmail: s.contactEmail || null,
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          createdAt: s.createdAt,
        };
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching pending suppliers:', error);
      throw error;
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
        const lockedRows: Array<{ status: string; user_id: string | null; organization_id: string | null }> =
          await manager.query(
            `SELECT status, user_id, organization_id FROM neture_suppliers WHERE id = $1 FOR UPDATE`,
            [supplierId],
          );
        const locked = lockedRows[0];
        if (!locked) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
        if (locked.status !== SupplierStatus.ACTIVE) return { success: false, error: 'INVALID_STATUS' };
        if (await this.isDemoSupplier(locked.user_id, locked.organization_id, manager)) {
          return { success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE };
        }

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
        const org = await this.getOrgData(locked.organization_id);
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
        const lockedRows: Array<{ status: string; user_id: string | null; organization_id: string | null }> =
          await manager.query(
            `SELECT status, user_id, organization_id FROM neture_suppliers WHERE id = $1 FOR UPDATE`,
            [supplierId],
          );
        const locked = lockedRows[0];
        if (!locked) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
        if (locked.status !== SupplierStatus.INACTIVE) return { success: false, error: 'INVALID_STATUS' };
        if (await this.isDemoSupplier(locked.user_id, locked.organization_id, manager)) {
          return { success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE };
        }
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

        const org = await this.getOrgData(locked.organization_id);
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

  // WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §5:
  // admin 상태 관리(governance) 목록 — ACTIVE / INACTIVE 만 대상. PENDING/REJECTED 제외.
  // 각 행에 최근 상태 변경(일시·변경자·사유)과 진행 주문·미정산 건수를 함께 제공한다.
  async getGovernanceSuppliers(): Promise<GovernanceSupplierRow[]> {
    const suppliers = await this.supplierRepo.find({
      where: [{ status: SupplierStatus.ACTIVE }, { status: SupplierStatus.INACTIVE }],
      order: { updatedAt: 'DESC' },
    });
    if (suppliers.length === 0) return [];

    const ids = suppliers.map((s) => s.id);
    const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
    const orgMap = await this.getOrgDataBatch(orgIds);

    // 최근 상태 변경 로그 (deactivate/reactivate/approve). 변경자 이름/이메일 enrich.
    const lastChangeMap = new Map<string, { at: string; byUserId: string | null; byName: string | null; reason: string | null }>();
    try {
      const rows: Array<{ supplier_id: string; created_at: string; user_id: string | null; reason: string | null; actor_name: string | null; actor_email: string | null }> =
        await AppDataSource.query(
          `SELECT DISTINCT ON (al.meta->>'supplierId')
                  al.meta->>'supplierId' AS supplier_id,
                  al.created_at,
                  al.user_id,
                  al.meta->>'reason' AS reason,
                  u.name AS actor_name,
                  u.email AS actor_email
           FROM action_logs al
           LEFT JOIN users u ON u.id = al.user_id
           WHERE al.action_key IN ('neture.admin.supplier_deactivate','neture.admin.supplier_reactivate','neture.admin.supplier_approve')
             AND al.meta->>'supplierId' = ANY($1::text[])
           ORDER BY al.meta->>'supplierId', al.created_at DESC`,
          [ids],
        );
      for (const r of rows) {
        lastChangeMap.set(r.supplier_id, {
          at: r.created_at,
          byUserId: r.user_id,
          byName: r.actor_name || r.actor_email || null,
          reason: r.reason,
        });
      }
    } catch (error) {
      logger.warn('[NetureSupplierService] Governance last-change enrich failed:', error);
    }

    // 진행 주문·미정산 집계 (set-based, supplier 단위)
    const activeOrderMap = new Map<string, number>();
    const unsettledMap = new Map<string, number>();
    try {
      const netureRows: Array<{ sid: string; c: string }> = await AppDataSource.query(
        `SELECT spo.supplier_id::text AS sid, COUNT(DISTINCT o.id)::text AS c
         FROM neture_orders o
         JOIN neture.neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = ANY($1::uuid[])
           AND o.status IN ('created','pending_payment','paid','preparing','shipped')
           AND ${netureOrderServiceSetSql('o', '$2')}
         GROUP BY spo.supplier_id`,
        [ids, SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS],
      );
      for (const r of netureRows) activeOrderMap.set(r.sid, parseInt(r.c, 10));

      const checkoutRows: Array<{ sid: string; c: string }> = await AppDataSource.query(
        `SELECT co."supplierId" AS sid, COUNT(*)::text AS c
         FROM checkout_orders co
         WHERE co."supplierId" = ANY($1::text[])
           AND co."paymentStatus" = 'paid'
           AND ${checkoutOrderServiceSetSql('co', '$2')}
           AND NOT EXISTS (
             SELECT 1 FROM neture_orders no2 WHERE no2.metadata->>'checkoutOrderId' = co.id::text
           )
         GROUP BY co."supplierId"`,
        [ids, SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS],
      );
      for (const r of checkoutRows) {
        activeOrderMap.set(r.sid, (activeOrderMap.get(r.sid) ?? 0) + parseInt(r.c, 10));
      }

      const settleRows: Array<{ sid: string; c: string }> = await AppDataSource.query(
        `SELECT supplier_id::text AS sid, COUNT(*)::text AS c FROM neture_settlements
         WHERE supplier_id = ANY($1::uuid[]) AND status IN ('pending','calculated','approved')
         GROUP BY supplier_id`,
        [ids],
      );
      for (const r of settleRows) unsettledMap.set(r.sid, parseInt(r.c, 10));
    } catch (error) {
      logger.warn('[NetureSupplierService] Governance obligation aggregate failed:', error);
    }

    return suppliers.map((s) => {
      const org = s.organizationId ? orgMap.get(s.organizationId) : null;
      const lastChange = lastChangeMap.get(s.id) ?? null;
      const activeOrderCount = activeOrderMap.get(s.id) ?? 0;
      const unsettledCount = unsettledMap.get(s.id) ?? 0;
      return {
        id: s.id,
        name: org?.name ?? s.slug,
        status: s.status,
        lastStatusChangedAt: lastChange?.at ?? null,
        lastChangedBy: lastChange?.byName ?? null,
        lastChangeReason: lastChange?.reason ?? null,
        activeOrderCount,
        unsettledCount,
        hasActiveOrders: activeOrderCount > 0,
        hasUnsettled: unsettledCount > 0,
        createdAt: s.createdAt,
      };
    });
  }

  async getAllSuppliers(
    filters?: { status?: SupplierStatus },
  ): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    status: SupplierStatus;
    contactEmail: string;
    userId: string;
    identityStatus: string | null;
    userEmail: string | null;
    representativeName: string | null;
    businessNumber: string | null;
    taxInvoiceEmail: string | null;
    businessRegistrationDocumentId: string | null;
    settlementBankName: string | null;
    settlementAccountNumberMasked: string | null;
    settlementAccountHolder: string | null;
    settlementBankbookDocumentId: string | null;
    settlementContactName: string | null;
    settlementContactEmail: string | null;
    mailOrderSalesStatus: string | null;
    mailOrderSalesRegistrationNumber: string | null;
    mailOrderSalesDocumentId: string | null;
    // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
    // 프로필 완성 상태의 단일 권위 — 승인과 무관한 정보성 필드. 프론트 재계산 금지.
    managerName: string | null;
    managerPhone: string | null;
    profileComplete: boolean;
    missingProfileFields: string[];
    /** @deprecated profileComplete 사용 (승인 게이트 아님) */
    activationReady: boolean;
    /** @deprecated missingProfileFields 사용 (승인 게이트 아님) */
    missingActivationFields: string[];
    createdAt: Date;
    updatedAt: Date;
  }>> {
    try {
      const where: { status?: SupplierStatus } = {};
      if (filters?.status) where.status = filters.status;

      const suppliers = await this.supplierRepo.find({ where, order: { createdAt: 'DESC' } });

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT u.id, u.status, u.email FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        const missing = this.getMissingProfileFields(s);
        return {
          id: s.id, name: org?.name ?? '', slug: s.slug, status: s.status,
          contactEmail: s.contactEmail || '',
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          representativeName: s.representativeName || null,
          businessNumber: org?.business_number ?? null,
          taxInvoiceEmail: s.taxInvoiceEmail || null,
          businessRegistrationDocumentId: s.businessRegistrationDocumentId || null,
          settlementBankName: s.settlementBankName || null,
          settlementAccountNumberMasked: this.maskAccountNumber(s.settlementAccountNumber || null),
          settlementAccountHolder: s.settlementAccountHolder || null,
          settlementBankbookDocumentId: s.settlementBankbookDocumentId || null,
          settlementContactName: s.settlementContactName || null,
          settlementContactEmail: s.settlementContactEmail || null,
          mailOrderSalesStatus: s.mailOrderSalesStatus || null,
          mailOrderSalesRegistrationNumber: s.mailOrderSalesRegistrationNumber || null,
          mailOrderSalesDocumentId: s.mailOrderSalesDocumentId || null,
          // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1
          managerName: s.managerName || null,
          managerPhone: s.managerPhone || null,
          profileComplete: missing.length === 0,
          missingProfileFields: missing,
          // deprecated 호환 별칭 (승인 게이트 아님)
          activationReady: missing.length === 0,
          missingActivationFields: missing,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching all suppliers:', error);
      throw error;
    }
  }

  // ==================== Paged Supplier List ====================
  // WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1
  // 검색 대상 중 name·businessNumber 는 organization 스토어에서 enrich 되므로(cross-domain SQL JOIN 금지),
  // 기존 getAllSuppliers() 의 enriched 결과 위에서 검색·정렬·페이지네이션을 수행한다(applySupplierListQuery).
  // 기존 배열 endpoint(getAllSuppliers)는 그대로 유지(회원 관리 화면 호환 — 회귀 방지).
  async getAllSuppliersPaged(params?: SupplierListQueryParams) {
    const all = await this.getAllSuppliers();
    return applySupplierListQuery(all, params);
  }

  // ==================== Public Supplier List & Detail ====================

  async getSuppliers(filters?: { category?: string; status?: SupplierStatus }) {
    try {
      const query = this.supplierRepo
        .createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.offers', 'products');
      if (filters?.category) {
        query.andWhere('supplier.category = :category', { category: filters.category });
      }
      if (filters?.status) {
        query.andWhere('supplier.status = :status', { status: filters.status });
      } else {
        query.andWhere('supplier.status = :status', { status: SupplierStatus.ACTIVE });
      }
      query.orderBy('supplier.createdAt', 'DESC');
      const suppliers = await query.getMany();

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const results = await Promise.all(
        suppliers.map(async (supplier) => {
          const org = supplier.organizationId ? orgMap.get(supplier.organizationId) : null;
          const trustSignals = await this.computeTrustSignals(supplier.id, supplier);
          return {
            id: supplier.id, slug: supplier.slug, name: org?.name ?? '',
            logo: supplier.logoUrl, category: supplier.category,
            shortDescription: supplier.shortDescription,
            productCount: supplier.offers?.length || 0,
            trustSignals,
          };
        })
      );
      return results;
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching suppliers:', error);
      throw error;
    }
  }

  /** viewer(조직) 가 이 공급자의 PRIVATE 공급 승인을 받은 거래처인가 — Legacy Partner 와 무관(ContactVisibility.PARTNERS = 승인 거래처) */
  async hasApprovedPrivateSupply(supplierId: string, viewerId: string): Promise<boolean> {
    try {
      const [{ count }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.organization_id = $2
           AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
        [supplierId, viewerId],
      );
      return count > 0;
    } catch (error) {
      logger.error('[NetureSupplierService] Error checking approved private supply:', error);
      return false;
    }
  }

  async getSupplierBySlug(slug: string, viewerId?: string | null) {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { slug, status: SupplierStatus.ACTIVE },
        relations: ['offers'],
      });
      if (!supplier) return null;

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: org-primary read for name
      const org = await this.getOrgData(supplier.organizationId);

      // WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1: 소유자 판정 = canonical 관계
      //   (organization_members owner). `supplier.userId === viewerId` 는 legacy pointer 비교였다.
      const isOwner = !!viewerId && (await listOwnedSupplierIds(AppDataSource, viewerId)).includes(supplier.id);
      const isApprovedBuyer = !!viewerId && !isOwner
        ? await this.hasApprovedPrivateSupply(supplier.id, viewerId)
        : false;
      const contact = this.filterContactInfo(supplier, viewerId || null, isApprovedBuyer, isOwner);
      const contactHints = this.computeContactHints(supplier, isApprovedBuyer, isOwner);
      const trustSignals = await this.computeTrustSignals(supplier.id, supplier);

      return {
        id: supplier.id, slug: supplier.slug, name: org?.name ?? '',
        logo: supplier.logoUrl, category: supplier.category,
        shortDescription: supplier.shortDescription,
        description: supplier.description,
        products: supplier.offers.map((p) => ({
          id: p.id, name: p.master?.name || '',
          category: p.master?.brandName || '', description: '',
        })),
        pricingPolicy: supplier.pricingPolicy,
        moq: supplier.moq,
        shippingPolicy: {
          standard: supplier.shippingStandard,
          island: supplier.shippingIsland,
          mountain: supplier.shippingMountain,
        },
        // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
        orderCondition: {
          minOrderAmount: supplier.minOrderAmount ?? null,
          minOrderSurcharge: supplier.minOrderSurcharge ?? null,
          note: supplier.orderConditionNote ?? null,
        },
        contact, contactHints, trustSignals,
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching supplier by slug:', error);
      throw error;
    }
  }

  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  async getSupplierOrderCondition(supplierId: string) {
    return this.businessService.getSupplierOrderCondition(supplierId);
  }

  async getSupplierProfile(supplierId: string) {
    return this.businessService.getSupplierProfile(supplierId);
  }

  async updateSupplierProfile(
    supplierId: string,
    data: Parameters<NetureSupplierBusinessService['updateSupplierProfile']>[1],
  ) {
    return this.businessService.updateSupplierProfile(supplierId, data);
  }

  // ==================== Private Helpers ====================

  private async computeTrustSignals(supplierId: string, supplier: NetureSupplier) {
    const publicContacts = [
      supplier.contactEmail && supplier.contactEmailVisibility === ContactVisibility.PUBLIC,
      supplier.contactPhone && supplier.contactPhoneVisibility === ContactVisibility.PUBLIC,
      supplier.contactWebsite && supplier.contactWebsiteVisibility === ContactVisibility.PUBLIC,
      supplier.contactKakao && supplier.contactKakaoVisibility === ContactVisibility.PUBLIC,
    ].filter(Boolean).length;

    const [{ count: approvedCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
      [supplierId],
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [{ count: recentCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.created_at >= $2`,
      [supplierId, thirtyDaysAgo],
    );

    return {
      contactCompleteness: publicContacts,
      hasApprovedBuyers: approvedCount > 0,
      recentActivity: recentCount > 0,
    };
  }

  private filterContactInfo(
    supplier: NetureSupplier,
    viewerId: string | null,
    isApprovedBuyer: boolean,
    isOwner: boolean,
  ) {
    const canView = (visibility: ContactVisibility): boolean => {
      if (isOwner) return true;
      if (!viewerId) return false;
      if (visibility === ContactVisibility.PUBLIC) return true;
      if (visibility === ContactVisibility.PARTNERS) return isApprovedBuyer;
      return false;
    };
    return {
      email: canView(supplier.contactEmailVisibility) ? (supplier.contactEmail || null) : null,
      phone: canView(supplier.contactPhoneVisibility) ? (supplier.contactPhone || null) : null,
      website: canView(supplier.contactWebsiteVisibility) ? (supplier.contactWebsite || null) : null,
      kakao: canView(supplier.contactKakaoVisibility) ? (supplier.contactKakao || null) : null,
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

  // ==================== Organization Read Helpers (WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1) ====================

  /**
   * Fetch canonical business fields from organizations table.
   * Returns null if organizationId is null or query fails (supplier fallback).
   */
  private async getOrgData(organizationId: string | null) {
    return this.businessService.getOrgData(organizationId);
  }

  private async getOrgDataBatch(organizationIds: string[]) {
    return this.businessService.getOrgDataBatch(organizationIds);
  }

  private computeContactHints(
    supplier: NetureSupplier,
    isApprovedBuyer: boolean,
    isOwner: boolean,
  ) {
    type ContactHint = 'available' | 'approved_buyer_exclusive' | 'not_registered' | 'private' | 'approved_buyers_only';
    const getHint = (value: string | null | undefined, visibility: ContactVisibility): ContactHint => {
      if (isOwner) return value ? 'available' : 'not_registered';
      if (!value) return 'not_registered';
      if (visibility === ContactVisibility.PUBLIC) return 'available';
      if (visibility === ContactVisibility.PARTNERS) return isApprovedBuyer ? 'approved_buyer_exclusive' : 'approved_buyers_only';
      return 'private';
    };
    return {
      email: getHint(supplier.contactEmail, supplier.contactEmailVisibility),
      phone: getHint(supplier.contactPhone, supplier.contactPhoneVisibility),
      website: getHint(supplier.contactWebsite, supplier.contactWebsiteVisibility),
      kakao: getHint(supplier.contactKakao, supplier.contactKakaoVisibility),
    };
  }

  private maskAccountNumber(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return value;
    const suffix = digits.slice(-4);
    return `${value.slice(0, Math.max(0, value.length - suffix.length)).replace(/\d/g, '*')}${suffix}`;
  }

  // WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1:
  // 단일 무거운 onboarding 게이트 → 단계별 분리.
  //   IR-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-AUDIT-V1: 서류·정산 6항목은 정산/상품/주문
  //   로직에서 미소비(컴플라이언스 보관용)이므로 ACTIVE 게이트에서 제거하고 판매전/정산전으로 이동.

  /**
   * WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
   * 프로필 완성 판정(정보성) — 승인(ACTIVE 전환)을 차단하지 않는다.
   * 승인 후 보완 안내(모달·배너·운영자 '정보 미완료' 표시)에만 사용.
   */
  private getMissingProfileFields(supplier: NetureSupplier): string[] {
    return this.businessService.getMissingProfileFields(supplier);
  }

  /** 판매 가능 전(상품 승인요청) 필수 — 사업자등록증 PDF. */
  getMissingSaleFields(supplier: NetureSupplier): string[] {
    const missing: string[] = [];
    if (!supplier.businessRegistrationDocumentId) missing.push('businessRegistrationDocument');
    return missing;
  }

  /** 정산 전 필수 — 정산 계좌/통장사본 + 세금계산서 이메일. */
  getMissingSettlementFields(supplier: NetureSupplier): string[] {
    const missing: string[] = [];
    if (!supplier.settlementBankName?.trim()) missing.push('settlementBankName');
    if (!supplier.settlementAccountNumber?.trim()) missing.push('settlementAccountNumber');
    if (!supplier.settlementAccountHolder?.trim()) missing.push('settlementAccountHolder');
    if (!supplier.settlementBankbookDocumentId) missing.push('settlementBankbookDocument');
    if (!supplier.taxInvoiceEmail?.trim()) {
      missing.push('taxInvoiceEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.taxInvoiceEmail)) {
      missing.push('validTaxInvoiceEmail');
    }
    return missing;
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

// §5: admin 상태 관리 목록 행 (ACTIVE/INACTIVE 전용).
export interface GovernanceSupplierRow {
  id: string;
  name: string;
  status: SupplierStatus;
  lastStatusChangedAt: string | null;
  lastChangedBy: string | null;
  lastChangeReason: string | null;
  activeOrderCount: number;
  unsettledCount: number;
  hasActiveOrders: boolean;
  hasUnsettled: boolean;
  createdAt: Date;
}

export interface SupplierListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierStatus;
  sortBy?: 'createdAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/** applySupplierListQuery 가 사용하는 최소 필드 — 검색/정렬/집계 대상. */
export interface SupplierListItemLike {
  status: SupplierStatus | string;
  name: string;
  contactEmail?: string | null;
  userEmail?: string | null;
  businessNumber?: string | null;
  representativeName?: string | null;
  createdAt: Date | string;
}

export function applySupplierListQuery<T extends SupplierListItemLike>(
  all: T[],
  params?: SupplierListQueryParams,
): {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: { total: number; pending: number; active: number; rejected: number; inactive: number };
} {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params?.limit ?? 20)));
  const sortBy = params?.sortBy ?? 'createdAt';
  const sortOrder = params?.sortOrder ?? 'desc';

  // 검색: 공급자명 / 이메일(연락·계정) / 사업자번호 / 대표자명
  const term = (params?.search ?? '').trim().toLowerCase();
  const searched = term
    ? all.filter((s) =>
        [s.name, s.contactEmail, s.userEmail, s.businessNumber, s.representativeName].some((v) =>
          (v ?? '').toLowerCase().includes(term),
        ),
      )
    : all;

  // summary: 검색 기준(상태 필터 무관) 전체 상태 집계
  const summary = {
    total: searched.length,
    pending: searched.filter((s) => s.status === SupplierStatus.PENDING).length,
    active: searched.filter((s) => s.status === SupplierStatus.ACTIVE).length,
    rejected: searched.filter((s) => s.status === SupplierStatus.REJECTED).length,
    inactive: searched.filter((s) => s.status === SupplierStatus.INACTIVE).length,
  };

  const filtered = params?.status ? searched.filter((s) => s.status === params.status) : searched;

  const dir = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '', 'ko');
    else if (sortBy === 'status') cmp = String(a.status).localeCompare(String(b.status));
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return cmp * dir;
  });

  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    summary,
  };
}
