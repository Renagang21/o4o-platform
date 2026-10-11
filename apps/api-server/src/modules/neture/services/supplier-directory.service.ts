import { SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS, checkoutOrderServiceSetSql, netureOrderServiceSetSql } from '../constants/fulfillment-service-scope.js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierStatus, ContactVisibility } from '../entities/index.js';
import { NetureSupplierBusinessService } from './supplier-business.service.js';
import logger from '../../../utils/logger.js';
import { listOwnedSupplierIds } from '../middleware/supplier-context.resolver.js';

/** Public and operator supplier read models, including existing contact visibility and masking rules. */
export class NetureSupplierDirectoryService {
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    return this._supplierRepo;
  }

  constructor(private readonly businessService = new NetureSupplierBusinessService()) {}

  // ==================== Supplier Queries ====================

  async getPendingSuppliers(): Promise<Array<{ id: string; name: string; slug: string; contactEmail: string | null; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date }>> {
    try {
      const suppliers = await this.supplierRepo.find({
        where: { status: SupplierStatus.PENDING },
        order: { createdAt: 'ASC' },
      });

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.businessService.getOrgDataBatch(orgIds);

      const userStatusMap = await this.getSupplierUserStatuses(suppliers);

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
    const orgMap = await this.businessService.getOrgDataBatch(orgIds);

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
      const orgMap = await this.businessService.getOrgDataBatch(orgIds);

      const userStatusMap = await this.getSupplierUserStatuses(suppliers);

      return suppliers.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        const missing = this.businessService.getMissingProfileFields(s);
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
      const orgMap = await this.businessService.getOrgDataBatch(orgIds);

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
      const org = await this.businessService.getOrgData(supplier.organizationId);

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

  private async getSupplierUserStatuses(suppliers: NetureSupplier[]) {
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
    return userStatusMap;
  }

  private maskAccountNumber(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return value;
    const suffix = digits.slice(-4);
    return `${value.slice(0, Math.max(0, value.length - suffix.length)).replace(/\d/g, '*')}${suffix}`;
  }
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

