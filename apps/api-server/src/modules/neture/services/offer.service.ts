import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NetureSupplier,
  SupplierProductOffer,
  OfferDistributionType,
  OfferApprovalStatus,
  SupplierStatus,
} from '../entities/index.js';
import { autoExpandPublicProduct } from '../../../utils/auto-listing.utils.js';
import logger from '../../../utils/logger.js';
import { ProductCategory } from '../entities/index.js';
import { ProductImportCommonService } from './product-import-common.service.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import type { NetureCatalogService } from './catalog.service.js';
// WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1: 기존 master 비파괴 연결 계약
import { resolveMasterWriteFields } from './master-link-policy.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';
import { filterApprovalEligibleServiceKeys, isApprovalEligibleServiceKey } from '../constants/approval-service-keys.js';
// WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1: 품목군 등록 가능 상태 gate
import {
  SupplierRegulatedCategoryService,
  resolveRegulatedCategoryFromProduct,
} from './supplier-regulated-category.service.js';
// WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1: 약국 대상 서비스 정책(DB) 참조
import { ServiceAudienceService } from './service-audience.service.js';
import { assertDrugOfferAllowed } from '../guards/drug-access.guard.js';

/**
 * WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1
 * isPublic + serviceKeys → distributionType 파생 (하위호환)
 */
function deriveDistributionType(isPublic: boolean, serviceKeys: string[]): OfferDistributionType {
  if (isPublic) return OfferDistributionType.PUBLIC;
  if (serviceKeys.length > 0) return OfferDistributionType.SERVICE;
  return OfferDistributionType.PRIVATE;
}

/**
 * WO-NETURE-REGULATORY-POLICY-ENFORCEMENT-V1: 허용 규제 유형 (코드 레벨 enum, DB VARCHAR 유지)
 */
const REGULATORY_TYPES = ['DRUG', 'HEALTH_FUNCTIONAL', 'QUASI_DRUG', 'COSMETIC', 'GENERAL'] as const;
type RegulatoryType = (typeof REGULATORY_TYPES)[number];

/** 한글 입력 → 영문 코드 매핑 (하위호환) */
const REGULATORY_TYPE_ALIAS: Record<string, RegulatoryType> = {
  '의약품': 'DRUG',
  '건강기능식품': 'HEALTH_FUNCTIONAL',
  '의약외품': 'QUASI_DRUG',
  '화장품': 'COSMETIC',
  '일반': 'GENERAL',
};

function resolveRegulatoryType(raw?: string): RegulatoryType | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if ((REGULATORY_TYPES as readonly string[]).includes(trimmed)) return trimmed as RegulatoryType;
  return REGULATORY_TYPE_ALIAS[trimmed] || null;
}

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품(의약품/건강기능식품/의약외품 등)은 약국 전용 서비스에만 연결될 수 있다.
 *
 * 약국 대상 서비스 판정은 DB 정책(service_audience_policies)을 SSOT 로 사용한다.
 *  - WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1 에서 admin 설정 소스 도입.
 *  - WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1 에서 본 함수가 ServiceAudienceService 를 참조하도록 전환
 *    (기존 하드코딩 ['glycopharm','kpa-society'] 는 ServiceAudienceService 의 fallback 으로 이전됨).
 *  - 카테고리 정의 / 규제 판정 기준(isRegulated) 자체는 변경하지 않는다.
 */

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품 permit 게이트 공통 헬퍼.
 * 기존 두 분기(승인 / 등록)의 동작을 그대로 유지하며 단일 진입점으로 흡수.
 *
 * - 'approval': 승인 시점 — DB 조회된 mfds_permit_number 부재 시 PERMIT_REQUIRED_FOR_APPROVAL
 * - 'registration': 등록 시점 — master MFDS 미검증 + 입력 허가번호 부재 시 PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED
 */
function assertRegulatedPermit(args: {
  isRegulated: boolean;
  mfdsPermitNumber: string | null | undefined;
  isMfdsVerified?: boolean;
  mode: 'approval' | 'registration';
}): OfferErrorCode | null {
  if (!args.isRegulated) return null;
  if (args.mode === 'approval') {
    return args.mfdsPermitNumber ? null : OfferErrorCode.PERMIT_REQUIRED_FOR_APPROVAL;
  }
  // registration
  if (!args.isMfdsVerified && !args.mfdsPermitNumber) {
    return OfferErrorCode.PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED;
  }
  return null;
}

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품의 service_keys가 약국 전용 서비스의 부분집합인지 검증.
 * 위반 시 OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE 반환.
 *
 * - 규제 상품 아님 → no-op
 * - service_keys 비어있음 → 본 WO에서는 강제하지 않음 (no-op)
 * - service_keys에 비-약국 서비스 1개라도 포함 → 거부
 */
function assertPharmacyOnlyServiceKeys(
  isPharmacyAudienceService: (serviceKey: string) => boolean,
  isRegulated: boolean,
  serviceKeys: string[] | null | undefined,
): OfferErrorCode | null {
  if (!isRegulated) return null;
  if (!serviceKeys || serviceKeys.length === 0) return null;
  const violating = serviceKeys.filter((k) => !isPharmacyAudienceService(k));
  if (violating.length > 0) {
    return OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE;
  }
  return null;
}

/**
 * NetureOfferService
 *
 * Offer CRUD, approval/rejection, supplier products, operator supply dashboard.
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1).
 */
export class NetureOfferService {
  // Lazy repositories
  private _offerRepo?: Repository<SupplierProductOffer>;
  private _supplierRepo?: Repository<NetureSupplier>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  constructor(private readonly catalogService: NetureCatalogService) {}

  // ==================== Admin: Product Management (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1) ====================

  /**
   * GET /admin/products/pending — 승인 대기 상품 목록
   */
  async getPendingProducts(): Promise<Array<{ id: string; supplierName: string; supplierId: string; distributionType: OfferDistributionType; createdAt: Date; approvalStatus: OfferApprovalStatus }>> {
    try {
      const offers = await this.offerRepo.find({
        where: { approvalStatus: OfferApprovalStatus.PENDING },
        relations: ['supplier', 'master'],
        order: { createdAt: 'ASC' },
      });

      const orgNameMap = await this.getOrgNameMap(offers.map((o) => o.supplier).filter(Boolean));

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.name || '',
        supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
        supplierId: o.supplierId,
        isPublic: o.isPublic,
        distributionType: o.distributionType,
        createdAt: o.createdAt,
        approvalStatus: o.approvalStatus,
      }));
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching pending offers:', error);
      throw error;
    }
  }

  /**
   * POST /admin/products/:id/approve — 상품 승인
   * WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1:
   *   Admin 승인 = 모든 service approvals → approved → 파생 sync
   *   직접 offer.approvalStatus 변경 제거 → service approval SSOT
   */
  async approveProduct(
    offerId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const offer = await this.offerRepo.findOne({ where: { id: offerId } });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }
      // 멱등: 이미 승인된 offer → 기존 데이터 반환
      if (offer.approvalStatus === OfferApprovalStatus.APPROVED) {
        return {
          success: true,
          data: { id: offer.id, masterId: offer.masterId, isActive: offer.isActive, approvalStatus: offer.approvalStatus, autoListedCount: 0 },
        };
      }

      // WO-NETURE-REGULATORY-POLICY-ENFORCEMENT-V1: 규제 상품 permit 게이트
      // WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1: 공통 헬퍼(assertRegulatedPermit)로 흡수 — 동작 변경 없음
      const masterForApproval: Array<{
        mfds_permit_number: string | null;
        category_id: string | null;
        is_regulated: boolean | null;
      }> = await AppDataSource.query(
        `SELECT pm.mfds_permit_number, pm.category_id, pc.is_regulated
         FROM product_masters pm
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         WHERE pm.id = $1`,
        [offer.masterId],
      );
      if (masterForApproval.length > 0) {
        const permitError = assertRegulatedPermit({
          isRegulated: !!masterForApproval[0].is_regulated,
          mfdsPermitNumber: masterForApproval[0].mfds_permit_number,
          mode: 'approval',
        });
        if (permitError) {
          return { success: false, error: permitError };
        }
      }

      // WO-NETURE-APPROVAL-SYSTEM-FINALIZATION-V1:
      // Admin override = service approvals 보장 + 일괄 approved → 파생 sync
      const approvalService = new OfferServiceApprovalService(AppDataSource);
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        // 1. service approvals 없으면 생성 (bulk import 등으로 누락된 경우)
        const existingApprovals: Array<{ id: string }> = await queryRunner.query(
          `SELECT id FROM offer_service_approvals WHERE offer_id = $1`,
          [offerId],
        );
        if (existingApprovals.length === 0) {
          const keys = offer.serviceKeys?.length ? offer.serviceKeys : [];
          const uniqueKeys = [...new Set(keys)];
          if (uniqueKeys.length > 0) {
            const values = uniqueKeys.map((_, i) => `($1, $${i + 2}, 'pending', NOW(), NOW())`).join(', ');
            await queryRunner.query(
              `INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
               VALUES ${values}
               ON CONFLICT (offer_id, service_key) DO NOTHING`,
              [offerId, ...uniqueKeys],
            );
          }
        }

        // 2. 모든 service approvals를 approved로 일괄 변경
        await queryRunner.query(
          `UPDATE offer_service_approvals
           SET approval_status = 'approved', decided_by = $2, decided_at = NOW(), updated_at = NOW()
           WHERE offer_id = $1 AND approval_status != 'approved'`,
          [offerId, adminUserId],
        );

        // 3. 파생 sync → offer 상태 + is_active + auto-expand
        const syncResult = await approvalService.syncOfferFromServiceApprovals(offerId, adminUserId, queryRunner);

        await queryRunner.commitTransaction();

        logger.info(`[NetureOfferService] Offer approved via service approvals: ${offerId} by ${adminUserId} (sync: ${syncResult.previousStatus}→${syncResult.derivedStatus}, autoListed: ${syncResult.autoListedCount})`);

        return {
          success: true,
          data: {
            id: offer.id,
            masterId: offer.masterId,
            isActive: true,
            approvalStatus: syncResult.derivedStatus,
            autoListedCount: syncResult.autoListedCount,
          },
        };
      } catch (txError) {
        await queryRunner.rollbackTransaction();
        throw txError;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('[NetureOfferService] Error approving offer:', error);
      throw error;
    }
  }

  /**
   * POST /admin/offers/bulk-approve — 일괄 승인
   * WO-O4O-NETURE-BULK-IMPORT-INTEGRATION-V1
   */
  async approveProducts(
    offerIds: string[],
    adminUserId: string,
  ): Promise<{ approved: string[]; failed: Array<{ id: string; error: string }> }> {
    const approved: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const offerId of offerIds) {
      try {
        const result = await this.approveProduct(offerId, adminUserId);
        if (result.success) {
          approved.push(offerId);
        } else {
          failed.push({ id: offerId, error: result.error || 'UNKNOWN' });
        }
      } catch (err) {
        failed.push({ id: offerId, error: (err as Error).message || 'UNKNOWN' });
      }
    }

    return { approved, failed };
  }

  /**
   * POST /admin/products/:id/reject — 상품 반려
   * WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1:
   *   Admin 반려 = 모든 service approvals → rejected → 파생 sync (cascade 포함)
   *   직접 offer.approvalStatus 변경 제거 → service approval SSOT
   */
  async rejectProduct(
    offerId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const offer = await this.offerRepo.findOne({ where: { id: offerId } });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }
      // 멱등: 이미 거절된 offer → 기존 데이터 반환
      if (offer.approvalStatus === OfferApprovalStatus.REJECTED) {
        return {
          success: true,
          data: { id: offer.id, masterId: offer.masterId, isActive: offer.isActive, approvalStatus: offer.approvalStatus },
        };
      }

      // WO-NETURE-APPROVAL-SYSTEM-FINALIZATION-V1:
      // Admin override reject = service approvals 보장 + 일괄 rejected → 파생 sync + cascade
      const approvalService = new OfferServiceApprovalService(AppDataSource);
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        // 1. service approvals 없으면 생성 (bulk import 등으로 누락된 경우)
        const existingApprovals: Array<{ id: string }> = await queryRunner.query(
          `SELECT id FROM offer_service_approvals WHERE offer_id = $1`,
          [offerId],
        );
        if (existingApprovals.length === 0) {
          const keys = offer.serviceKeys?.length ? offer.serviceKeys : [];
          const uniqueKeys = [...new Set(keys)];
          if (uniqueKeys.length > 0) {
            const values = uniqueKeys.map((_, i) => `($1, $${i + 2}, 'pending', NOW(), NOW())`).join(', ');
            await queryRunner.query(
              `INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
               VALUES ${values}
               ON CONFLICT (offer_id, service_key) DO NOTHING`,
              [offerId, ...uniqueKeys],
            );
          }
        }

        // 2. 모든 service approvals를 rejected로 일괄 변경
        await queryRunner.query(
          `UPDATE offer_service_approvals
           SET approval_status = 'rejected', decided_by = $2, decided_at = NOW(),
               reason = $3, updated_at = NOW()
           WHERE offer_id = $1 AND approval_status != 'rejected'`,
          [offerId, adminUserId, reason || 'Offer rejected by admin'],
        );

        // 3. 파생 sync → offer 상태 + cascade (product_approvals revoke + listings 비활성화)
        const syncResult = await approvalService.syncOfferFromServiceApprovals(offerId, adminUserId, queryRunner);

        await queryRunner.commitTransaction();

        logger.info(`[NetureOfferService] Offer rejected via service approvals: ${offerId} by ${adminUserId} (sync: ${syncResult.previousStatus}→${syncResult.derivedStatus})`);

        return {
          success: true,
          data: { id: offer.id, masterId: offer.masterId, isActive: false, approvalStatus: syncResult.derivedStatus },
        };
      } catch (txError) {
        await queryRunner.rollbackTransaction();
        throw txError;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('[NetureOfferService] Error rejecting offer:', error);
      throw error;
    }
  }

  // ==================== Supplier: Submit for Approval (WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1) ====================

  /**
   * POST /supplier/products/submit-approval
   * 선택된 offer들에 대해 서비스별 pending 승인 레코드를 생성한다.
   *
   * WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1:
   * 승인 요청 시 offer에 저장된 serviceKeys를 사용 (프론트에서 별도 선택 없음)
   *
   * WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
   * - submitted는 **실제로 pending 행이 최소 1개 이상 INSERT된 offer 수**만 집계
   * - INSERT가 한 건도 발생하지 않은 offer(정책상 대상 key 없음, 이미 pending/approved 존재 등)는 skipped에 reason과 함께 기록
   * - 소유권 없음, DB 예외는 errors에 error code로 기록
   * - 승인 대상 serviceKey 정책은 `filterApprovalEligibleServiceKeys`(SSOT)를 통해서만 결정
   */
  async submitForApproval(
    supplierId: string,
    offerIds: string[],
  ): Promise<{
    submitted: number;
    skipped: Array<{ id: string; reason: string }>;
    errors: Array<{ id: string; error: string }>;
  }> {
    const approvalService = new OfferServiceApprovalService(AppDataSource);
    const result = {
      submitted: 0,
      skipped: [] as Array<{ id: string; reason: string }>,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // 소유권 + 저장된 정책 + 제품 분류값(품목군 gate) 일괄 조회
    const ownedRows: Array<{
      id: string;
      service_keys: string[];
      regulatory_type: string | null;
      is_regulated: boolean | null;
      category_name: string | null;
      category_slug: string | null;
    }> = await AppDataSource.query(
      `SELECT o.id, o.service_keys, m.regulatory_type, c.is_regulated, c.name AS category_name, c.slug AS category_slug
       FROM supplier_product_offers o
       JOIN product_masters m ON m.id = o.master_id
       LEFT JOIN product_categories c ON c.id = m.category_id
       WHERE o.id = ANY($1) AND o.supplier_id = $2 AND o.deleted_at IS NULL`,
      [offerIds, supplierId],
    );
    const ownedMap = new Map(ownedRows.map((r) => [r.id, r]));

    // WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1:
    // 승인요청 시점에 공급자 품목군이 approved 인지 확인 (생성/draft 는 허용, 승인요청만 gate).
    const regulatedCategoryService = new SupplierRegulatedCategoryService(AppDataSource);
    const categoryStatusMap = await regulatedCategoryService.getStatusMap(supplierId);

    // WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1:
    // 규제 상품은 약국 대상 서비스에만 연결 가능 — 방어적 재확인(생성 시 차단되나 수동 변경 대비).
    const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();

    // WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1:
    // 선진입 후보완 — 사업자등록증 PDF 미제출이어도 상품 승인요청은 허용한다(하드블록 제거).
    // 미제출은 운영자 공급자 승인 화면의 '판매 전 필요' badge(D2)로 surface되며,
    // 판매 가능/운영자 최종 승인 전까지 보완한다.

    for (const offerId of offerIds) {
      const ownedRow = ownedMap.get(offerId);
      if (!ownedRow) {
        result.errors.push({ id: offerId, error: 'NOT_OWNED' });
        continue;
      }

      try {
        // 품목군 등록 가능 상태 gate
        const resolvedCategory = resolveRegulatedCategoryFromProduct({
          regulatoryType: ownedRow.regulatory_type,
          categoryName: ownedRow.category_name,
          categorySlug: ownedRow.category_slug,
        });
        const gate = regulatedCategoryService.evaluateGate(resolvedCategory, categoryStatusMap);
        if (!gate.allowed) {
          result.skipped.push({ id: offerId, reason: gate.reasonCode || 'SUPPLIER_CATEGORY_NOT_APPROVED' });
          continue;
        }

        // 정책 필터: 승인 대상 서비스 키만 추출 (SSOT)
        const eligibleKeys = filterApprovalEligibleServiceKeys(ownedRow.service_keys || []);

        if (eligibleKeys.length === 0) {
          // offer의 service_keys가 비어 있거나, 모두 정책상 승인 대상 아님 (예: neture only)
          result.skipped.push({ id: offerId, reason: 'NO_ELIGIBLE_SERVICE_KEYS' });
          continue;
        }

        // 규제 상품(의약품 등) → 약국 대상 서비스에만 연결 가능
        if (ownedRow.is_regulated && eligibleKeys.some((k) => !isPharmacyAudience(k))) {
          result.skipped.push({ id: offerId, reason: 'DRUG_SERVICE_NOT_PHARMACY_AUDIENCE' });
          continue;
        }

        const { insertedServiceKeys, resubmittedServiceKeys } = await approvalService.createPendingApprovals(
          offerId,
          eligibleKeys,
        );

        if (insertedServiceKeys.length + resubmittedServiceKeys.length > 0) {
          // WO-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1:
          // 반려(rejected) 행이 pending 으로 reset 된 경우, offer 파생 상태(REJECTED)도
          // PENDING 으로 되돌려 운영자 승인 큐에 다시 노출되게 한다.
          // sync 의 PENDING 분기는 offer.approval_status 만 갱신하며, listings 재활성화나
          // 판매 가능 전환은 하지 않는다(판매 가능은 운영자 approved 이후에만).
          // 이미 APPROVED 인 offer 는 derived 가 동일해 changed=false 로 early-return 된다.
          if (resubmittedServiceKeys.length > 0) {
            await approvalService.syncOfferFromServiceApprovals(offerId, supplierId, AppDataSource);
          }
          // 하나라도 신규 INSERT 또는 rejected→pending reset 이 발생했으면 submitted 로 집계
          result.submitted++;
        } else {
          // 모든 eligible key 가 이미 pending/approved (WHERE 가드로 reset 제외)
          result.skipped.push({ id: offerId, reason: 'ALREADY_REQUESTED_OR_DECIDED' });
        }
      } catch (error) {
        logger.error(`[NetureOfferService] submitForApproval failed for ${offerId}:`, error);
        result.errors.push({ id: offerId, error: 'INTERNAL_ERROR' });
      }
    }

    logger.info(
      `[NetureOfferService] submitForApproval: requested=${offerIds.length}, submitted=${result.submitted}, skipped=${result.skipped.length}, errors=${result.errors.length}`,
    );
    return result;
  }

  /**
   * GET /admin/products — 전체 상품 목록 (필터)
   */
  async getAllProducts(
    filters?: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus },
  ) {
    try {
      const where: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus } = {};
      if (filters?.supplierId) where.supplierId = filters.supplierId;
      if (filters?.distributionType) where.distributionType = filters.distributionType;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;
      if (filters?.approvalStatus) where.approvalStatus = filters.approvalStatus;

      const offers = await this.offerRepo.find({
        where,
        relations: ['supplier', 'master'],
        order: { createdAt: 'DESC' },
      });

      const orgNameMap = await this.getOrgNameMap(offers.map((o) => o.supplier).filter(Boolean));

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.name || '',
        supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
        supplierId: o.supplierId,
        isPublic: o.isPublic,
        distributionType: o.distributionType,
        isActive: o.isActive,
        approvalStatus: o.approvalStatus,
        priceGeneral: o.priceGeneral,
        priceGold: o.priceGold,
        pricePlatinum: o.pricePlatinum,
        consumerReferencePrice: o.consumerReferencePrice,
        consumerShortDescription: o.consumerShortDescription,
        consumerDetailDescription: o.consumerDetailDescription,
        businessShortDescription: o.businessShortDescription,
        businessDetailDescription: o.businessDetailDescription,
        createdAt: o.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching all offers:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
   *
   * getAllProducts 의 pagination/search/sort 지원 변형.
   * 기존 getAllProducts(array 반환)은 operator 측 소비처(operator-product-approval.controller)가
   * 있어 그대로 유지하고, admin list 표준화를 위한 신규 진입점만 additive 로 추가한다.
   *
   * - page/limit 미전달 시: 전량 반환(legacy 동작 보존). pagination meta 는 controller 에서 전체 기준 구성.
   * - page/limit 전달 시: skip/take 적용 (limit 상한 100).
   * - search: master.name ILIKE. supplierName 은 organizations enrichment 값이라 V1 검색 제외.
   * - sortBy: whitelist 외 값은 createdAt fallback. sortOrder 비정상값은 DESC fallback.
   * - relations 는 to-one 만 join 하므로 getManyAndCount 의 total 이 정확하다.
   */
  async getAllProductsPaged(options?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
    approvalStatus?: OfferApprovalStatus;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
    try {
      // sortBy whitelist — DB 컬럼만 허용 (supplierName/category 는 enrichment/relation 이라 V1 제외)
      const SORT_WHITELIST: Record<string, string> = {
        createdAt: 'offer.createdAt',
        approvalStatus: 'offer.approvalStatus',
        distributionType: 'offer.distributionType',
        priceGeneral: 'offer.priceGeneral',
        isActive: 'offer.isActive',
      };

      const qb = this.offerRepo
        .createQueryBuilder('offer')
        .leftJoinAndSelect('offer.supplier', 'supplier')
        .leftJoinAndSelect('offer.master', 'master')
        .leftJoinAndSelect('master.category', 'category');

      if (options?.supplierId) qb.andWhere('offer.supplierId = :supplierId', { supplierId: options.supplierId });
      if (options?.distributionType) qb.andWhere('offer.distributionType = :distributionType', { distributionType: options.distributionType });
      if (options?.isActive !== undefined) qb.andWhere('offer.isActive = :isActive', { isActive: options.isActive });
      if (options?.approvalStatus) qb.andWhere('offer.approvalStatus = :approvalStatus', { approvalStatus: options.approvalStatus });

      const search = options?.search?.trim();
      if (search) qb.andWhere('master.name ILIKE :search', { search: `%${search}%` });

      const sortColumn = (options?.sortBy && SORT_WHITELIST[options.sortBy]) || SORT_WHITELIST.createdAt;
      const sortDir: 'ASC' | 'DESC' = String(options?.sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(sortColumn, sortDir);

      // page/limit 전달 시에만 pagination 적용 (legacy 전량 조회 보존)
      if (options?.page !== undefined || options?.limit !== undefined) {
        const page = Math.max(1, Math.floor(options?.page ?? 1));
        const limit = Math.min(100, Math.max(1, Math.floor(options?.limit ?? 20)));
        qb.skip((page - 1) * limit).take(limit);
      }

      const [offers, total] = await qb.getManyAndCount();

      const orgNameMap = await this.getOrgNameMap(offers.map((o) => o.supplier).filter(Boolean) as NetureSupplier[]);

      const items = offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.name || '',
        // WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1: field contract 정합 (additive)
        //   frontend AdminProduct 는 marketingName/category 를 기대 — master.name / master.category.name 로 매핑.
        marketingName: o.master?.name || '',
        category: o.master?.category?.name || null,
        supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
        supplierId: o.supplierId,
        isPublic: o.isPublic,
        distributionType: o.distributionType,
        isActive: o.isActive,
        approvalStatus: o.approvalStatus,
        priceGeneral: o.priceGeneral,
        priceGold: o.priceGold,
        pricePlatinum: o.pricePlatinum,
        consumerReferencePrice: o.consumerReferencePrice,
        consumerShortDescription: o.consumerShortDescription,
        consumerDetailDescription: o.consumerDetailDescription,
        businessShortDescription: o.businessShortDescription,
        businessDetailDescription: o.businessDetailDescription,
        createdAt: o.createdAt,
      }));

      return { items, total };
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching paged offers:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
   *
   * 승인 상태별 전체 집계 — pagination 도입 후 client 전량 집계(KPI 4카드) 대체용.
   * 공통 필터(supplierId/distributionType/isActive)만 수용하고, 전체 approvalStatus 기준으로 집계한다.
   */
  async getProductsSummary(filters?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
  }): Promise<{ total: number; pending: number; approved: number; rejected: number }> {
    try {
      const qb = this.offerRepo
        .createQueryBuilder('offer')
        .select('offer.approvalStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('offer.approvalStatus');

      if (filters?.supplierId) qb.andWhere('offer.supplierId = :supplierId', { supplierId: filters.supplierId });
      if (filters?.distributionType) qb.andWhere('offer.distributionType = :distributionType', { distributionType: filters.distributionType });
      if (filters?.isActive !== undefined) qb.andWhere('offer.isActive = :isActive', { isActive: filters.isActive });

      const rows: Array<{ status: string; count: string }> = await qb.getRawMany();

      const summary = { total: 0, pending: 0, approved: 0, rejected: 0 };
      for (const r of rows) {
        const n = parseInt(r.count, 10) || 0;
        summary.total += n;
        if (r.status === OfferApprovalStatus.PENDING) summary.pending = n;
        else if (r.status === OfferApprovalStatus.APPROVED) summary.approved = n;
        else if (r.status === OfferApprovalStatus.REJECTED) summary.rejected = n;
      }
      return summary;
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching products summary:', error);
      throw error;
    }
  }

  // ==================== Supplier Products ====================

  /**
   * GET /supplier/products - 공급자의 제품 목록
   */
  async getSupplierProducts(supplierId: string) {
    try {
      const offers = await this.offerRepo.find({
        where: { supplierId },
        relations: ['master', 'master.category', 'master.brand'],
        order: { createdAt: 'DESC' },
      });

      // v2 product_approvals — offer_id 기준
      const pendingCountRows: Array<{ offer_id: string; cnt: number }> = await AppDataSource.query(
        `SELECT pa.offer_id, COUNT(*)::int AS cnt
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'pending'
         GROUP BY pa.offer_id`,
        [supplierId],
      );
      const pendingMap = new Map(pendingCountRows.map((r) => [r.offer_id, r.cnt]));

      const serviceCountRows: Array<{ offer_id: string; cnt: number }> = await AppDataSource.query(
        `SELECT pa.offer_id, COUNT(DISTINCT pa.service_key)::int AS cnt
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
         GROUP BY pa.offer_id`,
        [supplierId],
      );
      const serviceMap = new Map(serviceCountRows.map((r) => [r.offer_id, r.cnt]));

      // Primary images for each master
      const masterIds = offers.map((o) => o.masterId).filter(Boolean);
      const imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const imageRows: Array<{ master_id: string; image_url: string }> = await AppDataSource.query(
          `SELECT master_id, image_url FROM product_images WHERE is_primary = true AND master_id = ANY($1::uuid[])`,
          [masterIds],
        );
        for (const row of imageRows) {
          imageMap.set(row.master_id, row.image_url);
        }
      }

      return offers.map((o) => {
        const activeServiceCount = serviceMap.get(o.id) || 0;
        const pendingRequestCount = pendingMap.get(o.id) || 0;
        const productName = o.master?.name || o.master?.regulatoryName || '';

        const purpose = NetureOfferService.derivePurpose(o.isActive, activeServiceCount);

        return {
          id: o.id,
          masterId: o.masterId,
          name: productName,
          masterName: productName,
          category: o.master?.category?.name || '',
          isActive: o.isActive,
          purpose,
          distributionType: o.distributionType,
          allowedSellerIds: o.allowedSellerIds,
          approvalStatus: o.approvalStatus,
          priceGeneral: o.priceGeneral,
          priceGold: o.priceGold,
          pricePlatinum: o.pricePlatinum,
          consumerReferencePrice: o.consumerReferencePrice,
          // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
          consumerShortDescription: o.consumerShortDescription,
          consumerDetailDescription: o.consumerDetailDescription,
          businessShortDescription: o.businessShortDescription,
          businessDetailDescription: o.businessDetailDescription,
          pendingRequestCount,
          activeServiceCount,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          barcode: o.master?.barcode || '',
          brandName: o.master?.brand?.name || o.master?.brandName || null,
          categoryName: o.master?.category?.name || null,
          specification: o.master?.specification || null,
          // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: additional Master fields
          originCountry: o.master?.originCountry || null,
          tags: o.master?.tags || [],
          categoryId: o.master?.categoryId || null,
          brandId: o.master?.brandId || null,
          primaryImageUrl: imageMap.get(o.masterId) || null,
        };
      });
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching supplier offers:', error);
      throw error;
    }
  }

  /**
   * POST /supplier/products - 공급자 Offer 생성
   *
   * WO-NETURE-LAYER2-MASTER-PIPELINE-ENFORCEMENT-V1
   * masterId 외부 주입 금지 — barcode 기반 resolveOrCreateMaster() 강제 경유
   */
  // ==================== createSupplierOffer sub-methods (Phase3A) ====================

  /** 입력 검증: 바코드 생성, 유통타입 검증, 보안 체크, 공급자 상태 */
  private async validateCreateInput(
    data: { barcode?: string; isPublic?: boolean; distributionType?: OfferDistributionType; serviceKeys?: string[]; consumerShortDescription?: string | null },
    supplierId: string,
  ): Promise<{ success: false; error: string; message?: string } | { success: true; data: { barcode: string } }> {
    // WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1:
    //   바코드 미입력 시 합성 내부코드(200…)를 만들지 않는다. 빈 값으로 전달하면
    //   resolveOrCreateMaster 가 barcode=NULL 로 Master 를 생성한다(정체성=UUID).
    const barcode = data.barcode?.trim() || '';

    // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리 검증
    // isPublic과 serviceKeys는 독립적 — 동시 설정 가능
    const isPublic = data.isPublic ?? (data.distributionType === OfferDistributionType.PUBLIC);
    if (isPublic && !data.consumerShortDescription?.trim()) {
      return { success: false, error: 'PUBLIC_REQUIRES_DESCRIPTION' };
    }

    if ('masterId' in (data as any)) {
      return { success: false, error: 'MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED' };
    }

    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId }, select: ['id', 'status'] });
    if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    return { success: true, data: { barcode } };
  }

  /** 카테고리/규제/브랜드 해석 → Master 파이프라인 → 확장 필드 적용 */
  private async resolveProductMetadata(
    rawManualData: Record<string, any> | undefined,
    barcode: string,
    name: string,
    categoryId: string | null,
    brandName: string | undefined,
  ): Promise<{ success: false; error: string; message?: string } | { success: true; data: { masterId: string; masterBarcode: string; manualData: Record<string, any>; isRegulated: boolean; masterCreated: boolean } }> {
    const resolvedCategoryId: string | null = categoryId || rawManualData?.categoryId || null;
    let isRegulated = false;
    if (resolvedCategoryId) {
      const categoryRepo = AppDataSource.getRepository(ProductCategory);
      const category = await categoryRepo.findOne({ where: { id: resolvedCategoryId } });
      if (!category) return { success: false, error: 'INVALID_CATEGORY' };
      isRegulated = category.isRegulated;
    }

    const manualData = { ...rawManualData };
    const resolvedName = name || manualData.name || '';

    if (isRegulated) {
      if (!manualData.regulatoryType || !manualData.regulatoryName) {
        return { success: false, error: 'REGULATED_FIELDS_REQUIRED' };
      }
      const resolved = resolveRegulatoryType(manualData.regulatoryType);
      if (!resolved) {
        return { success: false, error: 'INVALID_REGULATORY_TYPE', message: `허용 규제 유형: ${REGULATORY_TYPES.join(', ')}` };
      }
      manualData.regulatoryType = resolved;
    } else {
      const resolved = resolveRegulatoryType(manualData.regulatoryType);
      manualData.regulatoryType = resolved || 'GENERAL';
      manualData.regulatoryName = manualData.regulatoryName || resolvedName || 'UNKNOWN';
    }
    if (resolvedName) manualData.name = resolvedName;

    let resolvedBrandId: string | null = manualData.brandId || null;
    if (!resolvedBrandId && brandName?.trim()) {
      const importCommon = new ProductImportCommonService(AppDataSource);
      resolvedBrandId = await importCommon.resolveBrandId(AppDataSource.manager, brandName.trim(), manualData.manufacturerName);
    }
    if (resolvedCategoryId) manualData.categoryId = resolvedCategoryId;
    if (resolvedBrandId) manualData.brandId = resolvedBrandId;

    const masterResult = await this.catalogService.resolveOrCreateMaster(barcode, manualData);
    if (!masterResult.success || !masterResult.data) {
      return { success: false, error: masterResult.error || 'MASTER_RESOLVE_FAILED' };
    }

    // WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1: 공통 헬퍼(assertRegulatedPermit)로 흡수 — 동작 변경 없음
    const registrationPermitError = assertRegulatedPermit({
      isRegulated,
      mfdsPermitNumber: manualData.mfdsPermitNumber,
      isMfdsVerified: masterResult.data.isMfdsVerified,
      mode: 'registration',
    });
    if (registrationPermitError) {
      return { success: false, error: registrationPermitError, message: '규제 상품은 MFDS 검증이 없는 경우 허가번호가 필수입니다.' };
    }

    // WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1
    //   기존 ProductMaster 에 연결하는 경우 공급자 입력으로 기준정보를 덮어쓰지 않는다.
    //   확장 필드는 이번 요청이 master 를 실제로 생성한 경우(신규 등록)에만 적용한다.
    //   제품군 예외 없음 — DRUG / HEALTH_FUNCTIONAL / QUASI_DRUG / MEDICAL_DEVICE / COSMETIC / GENERAL 동일.
    const linkDecision = resolveMasterWriteFields(masterResult.created, manualData);
    if (Object.keys(linkDecision.masterFieldUpdates).length > 0) {
      await this.catalogService.updateProductMaster(masterResult.data.id, linkDecision.masterFieldUpdates);
    } else if (linkDecision.ignoredFields.length > 0) {
      logger.info(
        `[NetureOfferService] Existing master ${masterResult.data.id} linked without modification ` +
          `(ignored supplier fields: ${linkDecision.ignoredFields.join(', ')})`,
      );
    }

    return {
      success: true,
      data: {
        masterId: masterResult.data.id,
        masterBarcode: masterResult.data.barcode || masterResult.data.id,
        manualData,
        isRegulated,
        masterCreated: linkDecision.mode === 'new',
      },
    };
  }

  // ==================== createSupplierOffer (orchestrator) ====================

  /**
   * POST /supplier/products — 공급자 상품 등록
   *
   * masterId 외부 주입 금지 — barcode 기반 resolveOrCreateMaster() 강제 경유
   */
  /**
   * WO-O4O-SUPPLIER-PRODUCT-OFFER-DUPLICATE-ERROR-CONTRACT-V1
   *
   * (supplier, master) 중복 등록을 업무 오류로 변환한다.
   * soft-delete 된 Offer 도 unique 슬롯을 점유하므로 `withDeleted` 로 함께 조회하고,
   * 사용자가 취할 조치가 다르므로 두 코드를 구분한다.
   *   - 살아있는 Offer 존재 → OFFER_ALREADY_EXISTS (이미 등록된 공급 상품)
   *   - 휴지통 Offer 존재   → OFFER_IN_RECYCLE_BIN (복원하거나 완전 삭제 후 등록)
   * 중복이 없으면 null.
   */
  private async findDuplicateOffer(
    supplierId: string,
    masterId: string,
  ): Promise<{ success: false; error: string; message: string } | null> {
    const existing = await this.offerRepo.findOne({
      where: { supplierId, masterId },
      withDeleted: true,
      select: { id: true, deletedAt: true },
    });
    if (!existing) return null;

    return existing.deletedAt
      ? {
          success: false,
          error: 'OFFER_IN_RECYCLE_BIN',
          message:
            '이 상품은 휴지통에 있습니다. 새로 등록하지 말고 휴지통에서 복원하거나 완전 삭제 후 등록해 주세요.',
        }
      : {
          success: false,
          error: 'OFFER_ALREADY_EXISTS',
          message: '이미 등록된 공급 상품입니다. 기존 상품을 수정해 주세요.',
        };
  }

  /**
   * unique violation(23505) 중 **(supplier, master) 제약** 인 경우에만 업무 오류로 변환한다.
   * 같은 테이블의 slug UNIQUE 등 다른 제약 위반을 중복 등록으로 오인하지 않는다.
   */
  private asOfferDuplicateViolation(
    err: unknown,
  ): { success: false; error: string; message: string } | null {
    const e = err as { code?: string; constraint?: string; driverError?: { code?: string; constraint?: string } };
    const code = e?.code ?? e?.driverError?.code;
    const constraint = e?.constraint ?? e?.driverError?.constraint;
    if (code !== '23505' || constraint !== 'uq_supplier_product_offers_master_supplier') {
      return null;
    }
    return {
      success: false,
      error: 'OFFER_ALREADY_EXISTS',
      message: '이미 등록된 공급 상품입니다. 기존 상품을 수정해 주세요.',
    };
  }

  async createSupplierOffer(
    supplierId: string,
    data: {
      barcode?: string;
      name?: string;
      categoryId?: string;
      brandName?: string;
      manualData?: {
        regulatoryType?: string;
        regulatoryName?: string;
        manufacturerName?: string;
        name?: string;
        mfdsPermitNumber?: string | null;
        categoryId?: string | null;
        brandId?: string | null;
        specification?: string | null;
        originCountry?: string | null;
        tags?: string[];
        stockQty?: number | string | null;
      };
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      serviceKeys?: string[];
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured?: boolean;
    }
  ) {
    try {
      const validation = await this.validateCreateInput(data, supplierId);
      if ('error' in validation) return { success: false, error: validation.error, message: validation.message };
      const { barcode } = validation.data;

      const name = data.name || data.manualData?.name || '';
      const categoryId = data.categoryId || data.manualData?.categoryId || null;

      const metadata = await this.resolveProductMetadata(data.manualData, barcode, name, categoryId, data.brandName);
      if ('error' in metadata) return { success: false, error: metadata.error, message: metadata.message };

      const { masterId, masterBarcode, manualData, isRegulated } = metadata.data;

      // slug + stockQty + offer entity
      const slug = `${masterBarcode}-${supplierId.slice(0, 8)}-${Date.now()}`;
      const resolvedStockQty = manualData.stockQty != null ? Number(manualData.stockQty) : 0;

      // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리
      //
      // serviceKeys 는 등록 서비스 목록(allowlist)으로 검증되지 않으므로, 유통 축을 뒤집는
      // 값은 여기서 입력 단계에 걸러낸다. 'neture' 는 PUBLIC 축이고 'glucoseview' 는 폐지된
      // 서비스 키다 — 둘 중 하나라도 통과하면 deriveDistributionType 이 offer 를
      // SERVICE 유통으로 잘못 판정한다.
      const filteredServiceKeys = (data.serviceKeys || []).filter((k) => k !== 'neture' && k !== 'glucoseview');

      // WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1 / WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1:
      // 규제 상품은 약국 대상 서비스(service_audience_policies)에만 연결 가능
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      const pharmacyServiceError = assertPharmacyOnlyServiceKeys(isPharmacyAudience, isRegulated, filteredServiceKeys);
      if (pharmacyServiceError) {
        return {
          success: false,
          error: pharmacyServiceError,
          message: '규제 상품은 약국 전용 서비스에만 연결할 수 있습니다.',
        };
      }
      const resolvedIsPublic = data.isPublic ?? (data.distributionType === OfferDistributionType.PUBLIC);

      // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1:
      // 의약품 판정 SSOT = product_masters.regulatory_type='DRUG'.
      // 위 is_regulated 축은 실측상 DRUG 를 전혀 커버하지 못하므로(카테고리 미연결 100%)
      // DRUG 축 게이트를 별도로 적용한다. 빈 serviceKeys·PUBLIC 전환도 여기서 거부된다.
      const drugCreateGate = await assertDrugOfferAllowed(AppDataSource, {
        action: 'OFFER_CREATE',
        masterId,
        serviceKeys: filteredServiceKeys,
        isPublic: resolvedIsPublic,
      });
      if (!drugCreateGate.allowed) {
        logger.warn(
          `[NetureOfferService] DRUG OFFER_CREATE denied: supplier=${supplierId}, master=${masterId}, keys=[${filteredServiceKeys.join(',')}], isPublic=${resolvedIsPublic}, code=${drugCreateGate.code}`,
        );
        return { success: false, error: drugCreateGate.code!, message: drugCreateGate.message };
      }

      const offer = this.offerRepo.create({
        supplierId,
        masterId,
        slug,
        isPublic: resolvedIsPublic,
        distributionType: deriveDistributionType(resolvedIsPublic, filteredServiceKeys),
        isActive: false,
        approvalStatus: OfferApprovalStatus.PENDING,
        allowedSellerIds: [],
        serviceKeys: filteredServiceKeys,
        priceGeneral: data.priceGeneral ?? 0,
        priceGold: data.priceGold ?? null,
        pricePlatinum: data.pricePlatinum ?? null,
        consumerReferencePrice: data.consumerReferencePrice ?? null,
        stockQuantity: resolvedStockQty,
        consumerShortDescription: data.consumerShortDescription ?? null,
        consumerDetailDescription: data.consumerDetailDescription ?? null,
        businessShortDescription: null,
        businessDetailDescription: null,
        // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
        isFeatured: data.isFeatured ?? false,
      });

      // WO-O4O-SUPPLIER-PRODUCT-OFFER-DUPLICATE-ERROR-CONTRACT-V1:
      //   Offer 는 (supplier_id, master_id) 당 1행이다
      //   (DB 제약 uq_supplier_product_offers_master_supplier — 유지가 정답.
      //    근거: CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1).
      //   기존에는 사전 검사 없이 save() 로 직행해 재등록 시 23505 가 그대로 터졌고,
      //   컨트롤러의 포괄 catch 에 걸려 일반 500 으로 노출됐다(전역 duplicate key → 409
      //   변환기는 이 경로에 도달하지 않는다).
      //   soft-delete 행도 슬롯을 계속 점유하므로(휴지통 복원 정책) withDeleted 로 함께 조회해
      //   "이미 등록됨" 과 "휴지통에 있음" 을 구분한다.
      const duplicate = await this.findDuplicateOffer(supplierId, masterId);
      if (duplicate) return duplicate;

      let savedOffer: SupplierProductOffer;
      try {
        savedOffer = await this.offerRepo.save(offer);
      } catch (err: unknown) {
        // 사전 검사와 INSERT 사이의 경쟁 상태 대비 fallback.
        // 반드시 해당 제약일 때만 변환한다 — 이 테이블에는 slug UNIQUE 도 있다.
        const dup = this.asOfferDuplicateViolation(err);
        if (dup) {
          logger.warn(
            `[NetureOfferService] Duplicate offer race for supplier ${supplierId} / master ${masterId}`,
          );
          return (await this.findDuplicateOffer(supplierId, masterId)) ?? dup;
        }
        throw err;
      }
      logger.info(`[NetureOfferService] Created offer ${savedOffer.id} by supplier ${supplierId} for master ${masterId} (PENDING approval)`);

      // WO-NETURE-REMOVE-NETURE-FROM-SERVICE-SELECTION-AND-APPROVAL-V1:
      // Neture는 기본 운영 공간이므로 service approval 대상 아님
      // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
      // 승인 대상 서비스 키 정책은 filterApprovalEligibleServiceKeys(SSOT) 통해서만 결정
      const approvalService = new OfferServiceApprovalService(AppDataSource);
      const approvalKeys = filterApprovalEligibleServiceKeys(data.serviceKeys);
      if (approvalKeys.length > 0) {
        await approvalService.createPendingApprovals(savedOffer.id, approvalKeys);
      }

      return {
        success: true,
        data: {
          id: savedOffer.id,
          masterId: savedOffer.masterId,
          isActive: savedOffer.isActive,
          isPublic: savedOffer.isPublic,
          approvalStatus: savedOffer.approvalStatus,
          distributionType: savedOffer.distributionType,
          allowedSellerIds: savedOffer.allowedSellerIds,
          priceGeneral: savedOffer.priceGeneral,
          priceGold: savedOffer.priceGold,
          pricePlatinum: savedOffer.pricePlatinum,
          consumerReferencePrice: savedOffer.consumerReferencePrice,
          createdAt: savedOffer.createdAt,
        },
      };
    } catch (error) {
      logger.error('[NetureOfferService] Error creating supplier offer:', error);
      throw error;
    }
  }

  /**
   * PATCH /supplier/products/:id - Offer 상태 업데이트
   *
   * 허용: isActive, distributionType, allowedSellerIds, 가격 필드
   */
  async updateSupplierOffer(
    offerId: string,
    supplierId: string,
    updates: {
      isActive?: boolean;
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      name?: string;
      // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level fields
      categoryId?: string | null;
      brandId?: string | null;
      specification?: string | null;
      originCountry?: string | null;
      tags?: string[];
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured?: boolean;
    }
  ) {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId, supplierId },
      });

      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      // WO-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1:
      //   PRIVATE + allowedSellerIds:[] 게이트를 "요청이 실제로 유통 축을 건드렸는가" 로 좁히기 위해
      //   변경 전 상태를 캡처한다. 아래 §PRIVATE 게이트 참조.
      const prevIsPublic = offer.isPublic;
      const prevIsActive = offer.isActive;
      const prevSellerIdCount = offer.allowedSellerIds?.length ?? 0;

      if (updates.isActive !== undefined) {
        offer.isActive = updates.isActive;
      }

      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      if (updates.isFeatured !== undefined) {
        offer.isFeatured = updates.isFeatured;
      }

      // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리
      if (updates.isPublic !== undefined) {
        offer.isPublic = updates.isPublic;
      }

      if (updates.distributionType !== undefined && updates.isPublic === undefined) {
        // 레거시 호환: distributionType만 전달된 경우 isPublic 동기화
        offer.isPublic = updates.distributionType === OfferDistributionType.PUBLIC;
      }

      // distributionType 파생 (isPublic + serviceKeys 기반)
      offer.distributionType = deriveDistributionType(offer.isPublic, offer.serviceKeys || []);

      // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1:
      // 본 경로는 기존에 의약품 게이트가 전혀 없었고, isPublic=true 전환 시 아래에서
      // autoExpandPublicProduct 로 전 서비스 확산까지 유발했다 (선행 감사 P0).
      // 저장 직전에 최종 상태(isPublic + serviceKeys)를 기준으로 판정한다.
      const drugUpdateGate = await assertDrugOfferAllowed(AppDataSource, {
        action: offer.isPublic ? 'OFFER_PUBLISH' : 'OFFER_UPDATE',
        masterId: offer.masterId,
        serviceKeys: offer.serviceKeys || [],
        isPublic: offer.isPublic,
      });
      if (!drugUpdateGate.allowed) {
        logger.warn(
          `[NetureOfferService] DRUG offer update denied: offer=${offerId}, supplier=${supplierId}, master=${offer.masterId}, isPublic=${offer.isPublic}, code=${drugUpdateGate.code}`,
        );
        return { success: false, error: drugUpdateGate.code!, message: drugUpdateGate.message };
      }

      if (updates.allowedSellerIds !== undefined) {
        offer.allowedSellerIds = updates.allowedSellerIds;
      }

      if (updates.priceGeneral !== undefined) {
        offer.priceGeneral = updates.priceGeneral;
      }
      if (updates.priceGold !== undefined) {
        offer.priceGold = updates.priceGold;
      }
      if (updates.pricePlatinum !== undefined) {
        offer.pricePlatinum = updates.pricePlatinum;
      }
      if (updates.consumerReferencePrice !== undefined) {
        offer.consumerReferencePrice = updates.consumerReferencePrice;
      }
      if (updates.stockQuantity !== undefined) {
        offer.stockQuantity = updates.stockQuantity;
      }

      if (updates.consumerShortDescription !== undefined) {
        offer.consumerShortDescription = updates.consumerShortDescription;
      }
      if (updates.consumerDetailDescription !== undefined) {
        offer.consumerDetailDescription = updates.consumerDetailDescription;
      }

      // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level field updates (consolidated)
      // WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1:
      //   offer 수정 시점의 master 는 **항상 기존 master** 다(이 요청이 만들지 않았다).
      //   공급자 offer 수정은 공급 조건 수정이지 master 편집이 아니므로 기준정보를 쓰지 않는다.
      //   ProductMaster 기준정보 수정은 운영자/관리자 경로(/api/v1/admin/o4o-product-db/*)가 담당한다.
      const updateDecision = resolveMasterWriteFields(false, updates as Record<string, unknown>);
      if (updateDecision.ignoredFields.length > 0) {
        logger.info(
          `[NetureOfferService] Offer ${offerId} update did not modify master ${offer.masterId} ` +
            `(ignored supplier fields: ${updateDecision.ignoredFields.join(', ')})`,
        );
      }

      // §PRIVATE 게이트 — WO-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1
      //
      // 이전 구현은 "PRIVATE + sellerIds 비어있음" 이면 **모든** 수정을 거부했다.
      // 그런데 createSupplierOffer 는 신규 등록을 항상 isPublic:false + serviceKeys:[] +
      // allowedSellerIds:[] (= PRIVATE, UI 의 "내부 상품") 로 만든다. 결과적으로 신규 등록 상품은
      // 공급 방식을 설정하기 전까지 가격·설명·재고 등 어떤 정보도 저장할 수 없었다 (실사용 차단).
      //
      // 노출·거래 안전성은 이 게이트가 아니라 소비 경로가 이미 보장한다 —
      // 매장 HUB(pharmacy-products.controller) · 매장 checkout(kpa/glycopharm) ·
      // 파트너 조달(seller.service · neture-b2b-cart-checkout) 이 모두
      // `distribution_type <> 'PRIVATE' OR $x = ANY(allowed_seller_ids)` 로 필터하므로
      // allowedSellerIds 가 비어 있는 PRIVATE offer 는 어디에도 노출되지 않고 주문도 되지 않는다.
      //
      // 따라서 게이트는 **유통 축을 실제로 바꾸거나 상품을 활성화하는 요청**에만 적용한다.
      // 순수 정보 수정(가격·설명·재고·대표 노출)은 통과시킨다.
      const distributionChanged =
        offer.isPublic !== prevIsPublic ||
        (offer.allowedSellerIds?.length ?? 0) !== prevSellerIdCount;
      const activating = offer.isActive === true && prevIsActive === false;

      if ((distributionChanged || activating) &&
          offer.distributionType === OfferDistributionType.PRIVATE &&
          (!offer.allowedSellerIds || offer.allowedSellerIds.length === 0)) {
        return { success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' };
      }

      const savedOffer = await this.offerRepo.save(offer);

      // WO-O4O-PRODUCT-AUTO-LISTING-STABILIZATION-V1: PUBLIC 전환 시 기존 매장에 자동 Listing 확산
      if (savedOffer.distributionType === OfferDistributionType.PUBLIC
          && savedOffer.approvalStatus === OfferApprovalStatus.APPROVED
          && savedOffer.isActive) {
        autoExpandPublicProduct(AppDataSource, savedOffer.id, savedOffer.masterId)
          .then((count) => logger.info(`[NetureOfferService] Auto-expanded ${count} listings for offer ${savedOffer.id} master ${savedOffer.masterId} (PUBLIC transition)`))
          .catch((err) => logger.warn(`[NetureOfferService] Auto-expand failed for offer ${savedOffer.id} master ${savedOffer.masterId}:`, err));
      }

      logger.info(`[NetureOfferService] Updated offer ${offerId} by supplier ${supplierId}`);

      return {
        success: true,
        data: {
          id: savedOffer.id,
          isActive: savedOffer.isActive,
          isPublic: savedOffer.isPublic,
          distributionType: savedOffer.distributionType,
          allowedSellerIds: savedOffer.allowedSellerIds,
          priceGeneral: savedOffer.priceGeneral,
          priceGold: savedOffer.priceGold,
          pricePlatinum: savedOffer.pricePlatinum,
          consumerReferencePrice: savedOffer.consumerReferencePrice,
          updatedAt: savedOffer.updatedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureOfferService] Error updating supplier offer:', error);
      throw error;
    }
  }

  // ==================== 공급 방식 변경 (WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1) ====================

  /**
   * 공급 방식(전체 공개 여부 + 서비스 대상) 정식 변경.
   *   - serviceKeys diff: 추가 → pending 생성/재심사, 제거 → 'cancelled' 전환 + 해당 listing 비활성.
   *   - offer.service_keys / is_public / distribution_type 갱신 후 파생 상태 재동기화.
   *   - PUBLIC 은 승인 무관(게이트 예외). 가격은 이번 경로에서 변경하지 않음(별도 편집).
   *   - 트랜잭션으로 일괄 처리.
   * @param userId 공급자 user id (sync 의 decidedBy actor — 운영자 액션 아님)
   */
  async updateDistribution(
    offerId: string,
    supplierId: string,
    userId: string,
    input: { isPublic?: boolean; serviceKeys?: string[] },
  ): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
    const [offer] = await AppDataSource.query(
      `SELECT id, supplier_id, is_public, service_keys, master_id FROM supplier_product_offers WHERE id = $1 AND deleted_at IS NULL`,
      [offerId],
    );
    if (!offer) return { success: false, error: 'OFFER_NOT_FOUND' };
    if (offer.supplier_id !== supplierId) return { success: false, error: 'NOT_OWNED' };

    const currentKeys: string[] = offer.service_keys || [];
    // WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1:
    //   이 경로는 **승인 대상 키(SSOT) 3개만 책임진다**. 그 밖의 키
    //   (pharmacy-hub / neture 등)는 다른 경로가 소유하므로 그대로 보존한다.
    //
    //   이전 구현은 nextKeys = filterApprovalEligibleServiceKeys(input.serviceKeys) 였다.
    //   승인 대상이 아닌 키는 입력에 담겨 있든 없든 전부 탈락 → 공급자가 유통 화면을
    //   한 번 저장하면 pharmacy-hub / neture 가 조용히 삭제되었다.
    //
    //   approval 생성·취소 diff 는 여전히 승인 대상 키에서만 계산하므로
    //   기존 3개 서비스의 승인·listing 거동은 변하지 않는다.
    const preservedKeys = currentKeys.filter((k) => !isApprovalEligibleServiceKey(k));
    const currentEligible = filterApprovalEligibleServiceKeys(currentKeys);
    const nextEligible = input.serviceKeys !== undefined
      ? filterApprovalEligibleServiceKeys(input.serviceKeys)
      : currentEligible;
    const nextKeys = Array.from(new Set([...nextEligible, ...preservedKeys]));
    const nextIsPublic = input.isPublic !== undefined ? !!input.isPublic : !!offer.is_public;

    const added = nextEligible.filter((k) => !currentEligible.includes(k));
    const removed = currentEligible.filter((k) => !nextEligible.includes(k));
    const nextDist = deriveDistributionType(nextIsPublic, nextKeys);

    // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1:
    // 본 경로는 serviceKeys 와 is_public 을 모두 바꾸지만 의약품 게이트가 없었다.
    // 최종 상태(nextKeys + nextIsPublic) 기준으로 판정한다.
    const drugDistGate = await assertDrugOfferAllowed(AppDataSource, {
      action: nextIsPublic ? 'OFFER_PUBLISH' : 'OFFER_UPDATE',
      masterId: offer.master_id,
      serviceKeys: nextKeys,
      isPublic: nextIsPublic,
    });
    if (!drugDistGate.allowed) {
      logger.warn(
        `[NetureOfferService] DRUG updateDistribution denied: offer=${offerId}, supplier=${supplierId}, master=${offer.master_id}, keys=[${nextKeys.join(',')}], isPublic=${nextIsPublic}, code=${drugDistGate.code}`,
      );
      return { success: false, error: drugDistGate.code! };
    }

    const approvalService = new OfferServiceApprovalService(AppDataSource);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1. offer 갱신 (service_keys / is_public / distribution_type)
      await queryRunner.query(
        `UPDATE supplier_product_offers
         SET service_keys = $2::text[], is_public = $3, distribution_type = $4, updated_at = NOW()
         WHERE id = $1`,
        [offerId, nextKeys, nextIsPublic, nextDist],
      );

      // 2. 제거된 서비스 → cancelled + listing 비활성 (삭제 금지)
      let removedResult = { cancelledServiceKeys: [] as string[], deactivatedListings: 0 };
      if (removed.length) {
        removedResult = await approvalService.cancelServiceApprovals(offerId, removed, queryRunner);
      }

      // 3. 추가된 서비스 → pending 생성/재심사 (cancelled/rejected → pending)
      let addedResult = { insertedServiceKeys: [] as string[], resubmittedServiceKeys: [] as string[] };
      if (added.length) {
        addedResult = await approvalService.createPendingApprovals(offerId, added, queryRunner);
      }

      // 4. 파생 상태 재동기화 (cancelled 제외 규칙 반영)
      const sync = await approvalService.syncOfferFromServiceApprovals(offerId, userId, queryRunner);

      await queryRunner.commitTransaction();
      logger.info(`[NetureOfferService] updateDistribution offer ${offerId}: +[${added.join(',')}] -[${removed.join(',')}] isPublic=${nextIsPublic} dist=${nextDist}`);
      return {
        success: true,
        data: {
          isPublic: nextIsPublic,
          serviceKeys: nextKeys,
          distributionType: nextDist,
          added,
          removed,
          addedResult,
          removedResult,
          sync,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`[NetureOfferService] updateDistribution failed for ${offerId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== 단일 서비스 제공 토글 (WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1) ====================

  /**
   * 특정 서비스 1개에 대한 제공 시작/중지 — `service_keys` 에서 그 키만 멱등 추가/제거한다.
   *
   * updateDistribution 과의 관계:
   *   updateDistribution 은 **승인 대상 3키(glycopharm/kpa-society/k-cosmetics)** 를 책임진다.
   *   승인 큐·listing 캐스케이드가 그 3키에만 존재하기 때문이다.
   *   이 메서드는 **승인 대상이 아닌 키**(pharmacy-hub 등)를 담당한다 — 승인 레코드를
   *   만들지 않고 즉시 제공을 시작/중지한다. 유통 관리 기능을 복제하지 않으려고
   *   소유권 검증·distribution_type 파생·서비스별 가격을 모두 기존 규칙으로 재사용한다.
   *
   * 불변식:
   *   - 다른 서비스 키는 절대 건드리지 않는다 (대상 키 1개만 add/remove).
   *   - offer_service_approvals / organization_product_listings / product_approvals 미변경.
   *   - ProductMaster · 공통 가격(price_general) 미변경.
   *   - Offer 삭제 없음.
   *
   * 규제 상품 게이트: 대상 서비스가 `service_audience_policies.is_pharmacy_target_service`
   *   가 아니면 규제 상품 연결을 거부한다 (createSupplierOffer / submitForApproval 와 동일 술어).
   */
  async setServiceDelivery(
    offerId: string,
    supplierId: string,
    serviceKey: string,
    input: { enabled: boolean; unitPrice?: number | null },
  ): Promise<{ success: boolean; error?: string; message?: string; data?: Record<string, unknown> }> {
    if (isApprovalEligibleServiceKey(serviceKey)) {
      // 승인 대상 키는 승인 큐를 거쳐야 한다 — 이 경로로 우회시키지 않는다.
      return { success: false, error: 'SERVICE_KEY_REQUIRES_APPROVAL_FLOW' };
    }

    const [row]: Array<{
      id: string;
      supplier_id: string;
      is_public: boolean;
      service_keys: string[] | null;
      is_regulated: boolean | null;
      master_id: string;
      regulatory_type: string | null;
    }> = await AppDataSource.query(
      `SELECT o.id, o.supplier_id, o.is_public, o.service_keys, pc.is_regulated,
              o.master_id, pm.regulatory_type
         FROM supplier_product_offers o
         JOIN product_masters pm ON pm.id = o.master_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
        WHERE o.id = $1 AND o.deleted_at IS NULL`,
      [offerId],
    );
    if (!row) return { success: false, error: 'OFFER_NOT_FOUND' };
    if (row.supplier_id !== supplierId) return { success: false, error: 'NOT_OWNED' };

    const currentKeys: string[] = row.service_keys || [];
    const alreadyOn = currentKeys.includes(serviceKey);

    if (input.enabled && !!row.is_regulated) {
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      if (!isPharmacyAudience(serviceKey)) {
        return {
          success: false,
          error: OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE,
          message: '규제 상품은 약국 전용 서비스에만 연결할 수 있습니다.',
        };
      }
    }

    // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1:
    // 위 is_regulated 축은 실측상 DRUG 를 전혀 커버하지 못한다(카테고리 미연결 100%).
    // DRUG SSOT(regulatory_type) 기준으로 다시 판정한다. 제공 중지(enabled=false)는 막지 않는다.
    if (input.enabled) {
      const drugDeliveryGate = await assertDrugOfferAllowed(AppDataSource, {
        action: 'OFFER_UPDATE',
        masterId: row.master_id,
        regulatoryType: row.regulatory_type,
        serviceKeys: [serviceKey],
        isPublic: false, // 본 경로는 is_public 을 바꾸지 않는다
      });
      if (!drugDeliveryGate.allowed) {
        logger.warn(
          `[NetureOfferService] DRUG setServiceDelivery denied: offer=${offerId}, master=${row.master_id}, service=${serviceKey}, code=${drugDeliveryGate.code}`,
        );
        return { success: false, error: drugDeliveryGate.code!, message: drugDeliveryGate.message };
      }
    }

    const nextKeys = input.enabled
      ? (alreadyOn ? currentKeys : [...currentKeys, serviceKey])
      : currentKeys.filter((k) => k !== serviceKey);
    // distribution_type 은 (is_public, service_keys) 파생값이다. updateSupplierOffer 가
    // 모든 공급자 편집에서 같은 규칙으로 재계산하므로, 여기서도 함께 맞춰 중간 불일치를 없앤다.
    const nextDist = deriveDistributionType(!!row.is_public, nextKeys);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE supplier_product_offers
            SET service_keys = $2::text[], distribution_type = $3, updated_at = NOW()
          WHERE id = $1`,
        [offerId, nextKeys, nextDist],
      );

      // 서비스별 공급가 — 값이 오면 upsert. 제공 중지 시 가격 행은 지우지 않는다
      // (재개 시 이전 단가 보존. 노출은 service_keys 로만 결정되므로 잔존 행은 무해하다).
      let priceApplied: number | null = null;
      if (input.unitPrice !== undefined && input.unitPrice !== null) {
        const price = Math.max(0, Math.trunc(Number(input.unitPrice)));
        if (!Number.isFinite(price)) return { success: false, error: 'INVALID_UNIT_PRICE' };
        await queryRunner.query(
          `INSERT INTO offer_service_prices (offer_id, service_key, unit_price, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (offer_id, service_key)
           DO UPDATE SET unit_price = EXCLUDED.unit_price, updated_at = NOW()`,
          [offerId, serviceKey, price],
        );
        priceApplied = price;
      }

      await queryRunner.commitTransaction();
      logger.info(
        `[NetureOfferService] setServiceDelivery offer ${offerId} ${serviceKey}=${input.enabled} dist=${nextDist} price=${priceApplied ?? 'unchanged'}`,
      );
      return {
        success: true,
        data: {
          offerId,
          serviceKey,
          enabled: input.enabled,
          changed: alreadyOn !== input.enabled,
          serviceKeys: nextKeys,
          distributionType: nextDist,
          unitPrice: priceApplied,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`[NetureOfferService] setServiceDelivery failed for ${offerId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== B2B Content (WO-NETURE-B2B-CONTENT-MANAGEMENT-V1) ====================

  async updateBusinessContent(
    offerId: string,
    supplierId: string,
    updates: {
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
    },
  ) {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId, supplierId },
      });

      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      if (updates.businessShortDescription !== undefined) {
        offer.businessShortDescription = updates.businessShortDescription;
      }
      if (updates.businessDetailDescription !== undefined) {
        offer.businessDetailDescription = updates.businessDetailDescription;
      }

      const saved = await this.offerRepo.save(offer);
      logger.info(`[NetureOfferService] Updated business content for offer ${offerId} by supplier ${supplierId}`);

      return {
        success: true,
        data: {
          id: saved.id,
          businessShortDescription: saved.businessShortDescription,
          businessDetailDescription: saved.businessDetailDescription,
          updatedAt: saved.updatedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureOfferService] Error updating business content:', error);
      throw error;
    }
  }

  // ==================== Paginated Supplier Products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1) ====================

  // WO-NETURE-COMPLETENESS-V2: 10-item × 10pts inline score (Offer + Master fields)
  private static readonly COMPLETENESS_EXPR = `(
    CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 10 ELSE 0 END
    + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL) THEN 10 ELSE 0 END
    + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.distribution_type IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN pm.category_id IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN pm.brand_id IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN pm.tags IS NOT NULL AND jsonb_array_length(pm.tags) > 0 THEN 10 ELSE 0 END
    + CASE WHEN spo.business_short_description IS NOT NULL AND spo.business_short_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.business_detail_description IS NOT NULL AND spo.business_detail_description != '' THEN 10 ELSE 0 END
  )`;

  /** Phase 3B: offer 상태로부터 purpose 파생 */
  private static derivePurpose(
    isActive: boolean,
    activeServiceCount: number,
  ): 'ACTIVE_SALES' | 'APPLICATION' | 'CATALOG' {
    if (isActive && activeServiceCount > 0) return 'ACTIVE_SALES';
    if (isActive) return 'APPLICATION';
    return 'CATALOG';
  }

  /** Phase 3B: approvalStatus + completenessScore로부터 completenessStatus 파생 */
  private static deriveCompletenessStatus(
    approvalStatus: string,
    completenessScore: number,
  ): 'APPROVED' | 'READY' | 'INCOMPLETE' | 'DRAFT' {
    if (approvalStatus === 'approved') return 'APPROVED';
    if (completenessScore >= 70) return 'READY';
    if (completenessScore > 0) return 'INCOMPLETE';
    return 'DRAFT';
  }

  /** Phase 3A: WHERE 조건 + 페이징/정렬 파라미터 빌드 */
  private buildPaginatedWhereClause(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      sort?: string;
      order?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
      serviceApprovalStatus?: string;
    },
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const offset = (page - 1) * limit;
    const keyword = options.keyword?.trim() || '';
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const validSortFields: Record<string, string> = {
      createdAt: 'spo.created_at',
      priceGeneral: 'spo.price_general',
      name: 'pm.name',
      completeness: NetureOfferService.COMPLETENESS_EXPR,
    };
    const sortField = validSortFields[options.sort || ''] || 'spo.created_at';

    // Build WHERE conditions (soft 삭제 제외)
    const conditions: string[] = ['spo.supplier_id = $1', 'spo.deleted_at IS NULL'];
    const params: any[] = [supplierId];
    let idx = 2;

    if (keyword) {
      conditions.push(`(pm.name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx})`);
      params.push(`%${keyword}%`);
      idx++;
    }
    if (options.distributionType) {
      conditions.push(`spo.distribution_type = $${idx}`);
      params.push(options.distributionType);
      idx++;
    }
    if (options.isActive === 'true' || options.isActive === 'false') {
      conditions.push(`spo.is_active = $${idx}`);
      params.push(options.isActive === 'true');
      idx++;
    }
    if (options.hasImage === 'true') {
      conditions.push(`EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL)`);
    } else if (options.hasImage === 'false') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL)`);
    }
    if (options.hasDescription === 'true') {
      conditions.push(`spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != ''`);
    } else if (options.hasDescription === 'false') {
      conditions.push(`(spo.consumer_short_description IS NULL OR spo.consumer_short_description = '')`);
    }
    if (options.barcodeSource) {
      conditions.push(`pm.barcode_source = $${idx}`);
      params.push(options.barcodeSource);
      idx++;
    }
    if (options.completenessStatus === 'DRAFT') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} = 0`);
    } else if (options.completenessStatus === 'INCOMPLETE') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} > 0 AND ${NetureOfferService.COMPLETENESS_EXPR} < 70`);
    } else if (options.completenessStatus === 'READY') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} >= 70`);
    }

    // WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1: service approval status filter
    if (options.serviceApprovalStatus === 'unrequested') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)`);
    } else if (options.serviceApprovalStatus === 'pending') {
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`);
    } else if (options.serviceApprovalStatus === 'approved') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')`);
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)`);
    } else if (options.serviceApprovalStatus === 'rejected') {
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected')`);
    }

    const where = conditions.join(' AND ');

    return { page, limit, offset, sortField, sortOrder, where, params, idx };
  }

  /** Phase 3A: 페이지네이션 쿼리 결과 행 → DTO 매핑 (purpose + completenessStatus 파생) */
  private mapPaginatedRow(r: any) {
    return {
      ...r,
      purpose: NetureOfferService.derivePurpose(r.isActive, r.activeServiceCount),
      completenessStatus: NetureOfferService.deriveCompletenessStatus(r.approvalStatus, r.completenessScore || 0),
    };
  }

  async getSupplierProductsPaginated(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      sort?: string;
      order?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
      serviceApprovalStatus?: string;
    } = {},
  ) {
    const q = this.buildPaginatedWhereClause(supplierId, options);

    const [countResult, rows] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE ${q.where}`,
        q.params,
      ),
      AppDataSource.query(
        `SELECT
           spo.id, spo.master_id AS "masterId", spo.is_active AS "isActive",
           spo.is_public AS "isPublic",
           spo.is_featured AS "isFeatured",
           spo.distribution_type AS "distributionType",
           spo.allowed_seller_ids AS "allowedSellerIds",
           spo.approval_status AS "approvalStatus",
           spo.price_general AS "priceGeneral",
           spo.price_gold AS "priceGold",
           spo.price_platinum AS "pricePlatinum",
           spo.consumer_reference_price AS "consumerReferencePrice",
           spo.consumer_short_description AS "consumerShortDescription",
           spo.consumer_detail_description AS "consumerDetailDescription",
           spo.business_short_description AS "businessShortDescription",
           spo.business_detail_description AS "businessDetailDescription",
           spo.service_keys AS "serviceKeys",
           spo.stock_quantity AS "stockQuantity",
           spo.created_at AS "createdAt",
           spo.updated_at AS "updatedAt",
           pm.tags,
           pm.name AS "masterName",
           pm.barcode,
           pm.specification,
           pm.origin_country AS "originCountry",
           pm.category_id AS "categoryId",
           pm.brand_id AS "brandId",
           pm.regulatory_type AS "regulatoryType",
           pm.drug_category AS "drugCategory",
           pm.regulatory_name AS "regulatoryName",
           pm.mfds_permit_number AS "mfdsPermitNumber",
           pm.manufacturer_name AS "manufacturerName",
           COALESCE(pm.name, pm.regulatory_name, '') AS name,
           pc.name AS "categoryName",
           COALESCE(b.name, pm.brand_name) AS "brandName",
           pi_img.image_url AS "primaryImageUrl",
           COALESCE(pending.cnt, 0)::int AS "pendingRequestCount",
           COALESCE(active.cnt, 0)::int AS "activeServiceCount",
           svc_appr.approvals AS "serviceApprovals",
           kpa_review.status AS "kpaReviewStatus",
           kpa_review.reason AS "kpaReviewReason",
           ${NetureOfferService.COMPLETENESS_EXPR} AS "completenessScore"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         LEFT JOIN brands b ON b.id = pm.brand_id
         LEFT JOIN LATERAL (
           SELECT image_url FROM product_images
           WHERE master_id = pm.id AND is_primary = true LIMIT 1
         ) pi_img ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS cnt FROM product_approvals
           WHERE offer_id = spo.id AND approval_type = 'private' AND approval_status = 'pending'
         ) pending ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT service_key)::int AS cnt FROM product_approvals
           WHERE offer_id = spo.id AND approval_type = 'private' AND approval_status = 'approved'
         ) active ON true
         LEFT JOIN LATERAL (
           SELECT COALESCE(json_agg(json_build_object('serviceKey', osa.service_key, 'status', osa.approval_status, 'reason', osa.reason)), '[]'::json) AS approvals
           FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ) svc_appr ON true
         LEFT JOIN LATERAL (
           SELECT pa.approval_status AS status, pa.reason
           FROM product_approvals pa
           WHERE pa.offer_id = spo.id AND pa.service_key = 'kpa-society' AND pa.approval_type = 'service'
           LIMIT 1
         ) kpa_review ON true
         WHERE ${q.where}
         ORDER BY pm.id, ${q.sortField} ${q.sortOrder}
         LIMIT $${q.idx} OFFSET $${q.idx + 1}`,
        [...q.params, q.limit, q.offset],
      ),
    ]);

    const total = countResult[0]?.total || 0;
    const data = rows.map((r: any) => this.mapPaginatedRow(r));

    return {
      data,
      pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  }

  // ==================== Approval Tab Counts (WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1) ====================

  // WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1:
  // total = unrequested + pending + approved + rejected
  /**
   * 공급자 상품 승인 상태별 카운트.
   *
   * WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
   * 탭 카운트도 rows 쿼리와 동일한 보조 필터(검색어/이미지/설명/바코드/완성도 등)를
   * 적용하도록 수정. serviceApprovalStatus는 제외 — 5개 탭을 한 쿼리로 모두 계산.
   */
  async getSupplierProductApprovalCounts(
    supplierId: string,
    options: {
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
    } = {},
  ) {
    // serviceApprovalStatus는 카운트 계산에 사용하지 않음 (FILTER로 5개 동시 집계)
    const q = this.buildPaginatedWhereClause(supplierId, {
      ...options,
      serviceApprovalStatus: undefined,
    });

    const rows: Array<{ total: number; unrequested: number; pending: number; approved: number; rejected: number }> = await AppDataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ))::int AS unrequested,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM offer_service_approvals osa
           WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
         ))::int AS pending,
         COUNT(*) FILTER (WHERE
           NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')
           AND EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
         )::int AS approved,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM offer_service_approvals osa
           WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected'
         ))::int AS rejected
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE ${q.where}`,
      q.params,
    );
    return rows[0] || { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
  }

  // ==================== Batch Update (WO-NETURE-SUPPLIER-EXCEL-LIST-V1) ====================

  async batchUpdateSupplierOffers(
    supplierId: string,
    updates: Array<{
      offerId: string;
      isActive?: boolean;
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
    }>,
  ) {
    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of updates) {
      try {
        const result = await this.updateSupplierOffer(item.offerId, supplierId, {
          isActive: item.isActive,
          isPublic: item.isPublic,
          distributionType: item.distributionType,
          priceGeneral: item.priceGeneral,
          consumerReferencePrice: item.consumerReferencePrice,
          stockQuantity: item.stockQuantity,
        });
        if (result.success) {
          updated.push(item.offerId);
        } else {
          failed.push({ id: item.offerId, error: result.error || 'UNKNOWN' });
        }
      } catch (err) {
        failed.push({ id: item.offerId, error: (err as Error).message });
      }
    }

    return { updated, failed };
  }

  // ==================== Operator Batch Toggle Active ====================

  async batchToggleOfferActive(
    offerIds: string[],
    isActive: boolean,
  ): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const offerId of offerIds) {
      try {
        const offer = await this.offerRepo.findOne({ where: { id: offerId } });
        if (!offer) {
          failed.push({ id: offerId, error: 'PRODUCT_NOT_FOUND' });
          continue;
        }
        offer.isActive = isActive;
        await this.offerRepo.save(offer);
        updated.push(offerId);
      } catch (err) {
        failed.push({ id: offerId, error: (err as Error).message });
      }
    }

    return { updated, failed };
  }

  // ==================== Bulk Delete (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1) ====================

  /**
   * WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1:
   * 공급자 삭제를 **soft delete** 로 정합화한다.
   *
   * 이전 계약(hard delete)의 문제:
   *   - `supplier_product_offers` 를 참조하는 FK 5개가 전부 ON DELETE CASCADE 다
   *     (organization_product_listings / service_products / offer_service_approvals /
   *      product_approvals / offer_service_prices).
   *     즉 공급자의 일괄 삭제 한 번이 **매장 진열과 운영자 승인 이력까지** 함께 지웠고 복구가 불가능했다.
   *   - 운영자 정책은 이미 soft delete + 휴지통 + 복원이며(operator-product-cleanup.controller),
   *     hard delete 는 "휴지통에 있고 활성 listing/service_products 가 없는 건"만 허용한다.
   *   - 공급자 목록 조회(buildPaginatedWhereClause)는 이미 `spo.deleted_at IS NULL` 을 전제하고 있었다.
   *     삭제 동작만 계약에서 벗어나 있었다.
   *
   * 새 계약: 운영자 hard-delete 와 **같은 가드**를 적용하고, 통과분은 soft delete 한다.
   *   → 운영자 휴지통에 나타나고 복원 가능하며, `is_active=false` + `deleted_at` 로 노출도 끊긴다.
   */
  async bulkDeleteOffers(
    supplierId: string,
    offerIds: string[],
    deletedBy?: string,
  ): Promise<{ deleted: number; failed: Array<{ id: string; error: string }> }> {
    // findBy 는 @DeleteDateColumn 덕분에 이미 철회된 행을 제외한다 → 재삭제는 NOT_FOUND_OR_NOT_OWNED.
    const offers = await this.offerRepo.find({
      where: { id: In(offerIds), supplierId },
    });

    const foundIds = new Set(offers.map((o) => o.id));
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of offerIds) {
      if (!foundIds.has(id)) {
        failed.push({ id, error: 'NOT_FOUND_OR_NOT_OWNED' });
      }
    }

    let deleted = 0;
    for (const offer of offers) {
      try {
        // 가드: 매장에 살아있는 진열/서비스 상품이 있으면 지우지 않는다.
        // soft delete 라도 `opl.is_active` 만 보고 `spo.deleted_at` 은 안 보는 소비 경로가 있어
        // 유령 상품이 남는다. 운영자 hard-delete 가드와 동일한 조건이다.
        const [listings, serviceProducts] = await Promise.all([
          AppDataSource.query(
            `SELECT COUNT(*)::int AS cnt FROM organization_product_listings WHERE offer_id = $1 AND is_active = true`,
            [offer.id],
          ),
          AppDataSource.query(
            `SELECT COUNT(*)::int AS cnt FROM service_products WHERE offer_id = $1`,
            [offer.id],
          ),
        ]);
        if (listings[0]?.cnt > 0) {
          failed.push({ id: offer.id, error: OfferErrorCode.HAS_ACTIVE_LISTINGS });
          continue;
        }
        if (serviceProducts[0]?.cnt > 0) {
          failed.push({ id: offer.id, error: OfferErrorCode.HAS_SERVICE_PRODUCTS });
          continue;
        }

        // 운영자 휴지통이 읽는 컬럼(deleted_by / delete_reason)까지 함께 채운다.
        await this.offerRepo.update(offer.id, {
          isActive: false,
          deletedBy: deletedBy ?? null,
          deleteReason: 'SUPPLIER_DELETE',
        });
        await this.offerRepo.softDelete(offer.id);
        deleted++;
      } catch (err) {
        failed.push({ id: offer.id, error: (err as Error).message });
      }
    }

    logger.info(`[OfferService] bulkDeleteOffers(soft): supplier=${supplierId}, requested=${offerIds.length}, deleted=${deleted}, failed=${failed.length}`);
    return { deleted, failed };
  }

  // ==================== Operator Supply Dashboard ====================

  async getOperatorSupplyProducts(operatorUserId: string) {
    try {
      // 1. 활성 PUBLIC + SERVICE Offer 조회 (Tier 1 + Tier 2)
      const allOffers = await this.offerRepo.find({
        where: { isActive: true, distributionType: In([OfferDistributionType.PUBLIC, OfferDistributionType.SERVICE]) },
        relations: ['supplier', 'master'],
        order: { createdAt: 'DESC' },
      });

      // Supplier ACTIVE 검증 (Tier 공통)
      const activeOffers = allOffers.filter((o) => o.supplier?.status === SupplierStatus.ACTIVE);

      // v2 product_approvals — offer_id 기준
      const myApprovals: Array<{ offer_id: string; supplier_id: string; status: string; id: string; reason: string | null }> = await AppDataSource.query(
        `SELECT pa.offer_id, spo.supplier_id, pa.approval_status AS status, pa.id, pa.reason
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE pa.organization_id = $1 AND pa.approval_type IN ('private', 'service')`,
        [operatorUserId],
      );

      // offerId → 가장 관련성 높은 요청 상태 매핑
      const requestMap = new Map<string, { status: string; requestId: string; rejectReason?: string }>();
      for (const req of myApprovals) {
        const key = `${req.supplier_id}:${req.offer_id}`;
        const existing = requestMap.get(key);
        if (!existing ||
            req.status === 'pending' ||
            req.status === 'approved') {
          requestMap.set(key, {
            status: req.status,
            requestId: req.id,
            rejectReason: req.reason || undefined,
          });
        }
      }

      // 머지하여 반환
      // 이미지 조회 (masterId → primaryImageUrl)
      const masterIds = [...new Set(activeOffers.map((o) => o.masterId).filter(Boolean))];
      const imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const images: Array<{ master_id: string; image_url: string }> = await AppDataSource.query(
          `SELECT master_id, image_url FROM product_images WHERE master_id = ANY($1) AND is_primary = true`,
          [masterIds],
        );
        for (const img of images) imageMap.set(img.master_id, img.image_url);
      }

      // 카테고리 조회
      const categoryIds = [...new Set(activeOffers.map((o) => o.master?.categoryId).filter(Boolean))];
      const categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const cats: Array<{ id: string; name: string }> = await AppDataSource.query(
          `SELECT id, name FROM product_categories WHERE id = ANY($1)`,
          [categoryIds],
        );
        for (const c of cats) categoryMap.set(c.id, c.name);
      }

      const orgNameMap = await this.getOrgNameMap(activeOffers.map((o) => o.supplier).filter(Boolean));
      return activeOffers.map((o) => {
        const key = `${o.supplierId}:${o.id}`;
        const request = requestMap.get(key);
        return {
          id: o.id,
          masterId: o.masterId,
          name: o.master?.name || o.master?.regulatoryName || '',
          distributionType: o.distributionType,
          supplierId: o.supplierId,
          supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
          supplyStatus: request?.status || 'available',
          requestId: request?.requestId || null,
          rejectReason: request?.rejectReason || null,
          priceGeneral: o.priceGeneral ?? null,
          consumerReferencePrice: o.consumerReferencePrice ?? null,
          approvalStatus: o.approvalStatus || null,
          barcode: o.master?.barcode || null,
          specification: o.master?.specification || null,
          category: o.master?.categoryId ? categoryMap.get(o.master.categoryId) || null : null,
          primaryImageUrl: imageMap.get(o.masterId) || null,
        };
      });
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching operator supply products:', error);
      throw error;
    }
  }

  // ==================== Operator All-Offers View ====================

  /**
   * WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1
   * 전체 등록 상품 조회 (isActive/distributionType 필터 없음)
   * 운영자가 플랫폼에 등록된 모든 offer를 모니터링하기 위한 용도
   */
  async getAllRegisteredOffers(options: {
    page?: number;
    limit?: number;
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    approvalStatus?: string;
    category?: string;
    regulatoryType?: string;
    sort?: string;
    order?: string;
  } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const offset = (page - 1) * limit;
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const validSortFields: Record<string, string> = {
      createdAt: 'spo.created_at',
      priceGeneral: 'spo.price_general',
      name: 'pm.name',
    };
    const sortField = validSortFields[options.sort || ''] || 'spo.created_at';

    // WHERE 조건 (deleted_at IS NULL 만 기본)
    const conditions: string[] = ['spo.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (options.keyword?.trim()) {
      conditions.push(`(pm.name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx} OR o.name ILIKE $${idx})`);
      params.push(`%${options.keyword.trim()}%`);
      idx++;
    }
    if (options.distributionType) {
      conditions.push(`spo.distribution_type = $${idx}`);
      params.push(options.distributionType);
      idx++;
    }
    if (options.isActive === 'true' || options.isActive === 'false') {
      conditions.push(`spo.is_active = $${idx}`);
      params.push(options.isActive === 'true');
      idx++;
    }
    // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
    // 승인 상태 필터도 SSOT(offer_service_approvals) 기준으로 통일.
    // 기존 spo.approval_status는 submit 경로가 갱신하지 않아 실제 상태와 다를 수 있음.
    if (options.approvalStatus === 'PENDING') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`,
      );
    } else if (options.approvalStatus === 'APPROVED') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
         AND NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')`,
      );
    } else if (options.approvalStatus === 'REJECTED') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected')
         AND NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`,
      );
    }
    if (options.category?.trim()) {
      conditions.push(`pc.name ILIKE $${idx}`);
      params.push(`%${options.category.trim()}%`);
      idx++;
    }
    if (options.regulatoryType) {
      conditions.push(`pm.regulatory_type = $${idx}`);
      params.push(options.regulatoryType);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [countResult, rows, kpiResult] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         WHERE ${where}`,
        params,
      ),
      AppDataSource.query(
        `SELECT
           spo.id, spo.master_id AS "masterId",
           spo.is_active AS "isActive",
           spo.distribution_type AS "distributionType",
           spo.approval_status AS "approvalStatus",
           spo.price_general AS "priceGeneral",
           spo.consumer_reference_price AS "consumerReferencePrice",
           spo.supplier_id AS "supplierId",
           spo.created_at AS "createdAt",
           spo.consumer_short_description AS "consumerShortDescription",
           spo.consumer_detail_description AS "consumerDetailDescription",
           spo.business_short_description AS "businessShortDescription",
           spo.business_detail_description AS "businessDetailDescription",
           pm.tags,
           COALESCE(pm.name, pm.regulatory_name, '') AS name,
           pm.barcode,
           pm.specification,
           pm.category_id AS "categoryId",
           pc.name AS "categoryName",
           pm.regulatory_type AS "regulatoryType",
           pm.drug_category AS "drugCategory",
           COALESCE(b.name, pm.brand_name) AS "brandName",
           o.name AS "supplierName",
           ns.status AS "supplierStatus",
           pi_img.image_url AS "primaryImageUrl",
           svc_appr.approvals AS "serviceApprovals"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         LEFT JOIN brands b ON b.id = pm.brand_id
         LEFT JOIN LATERAL (
           SELECT image_url FROM product_images
           WHERE master_id = pm.id AND is_primary = true LIMIT 1
         ) pi_img ON true
         LEFT JOIN LATERAL (
           SELECT COALESCE(json_agg(json_build_object('id', osa.id, 'serviceKey', osa.service_key, 'status', osa.approval_status)), '[]'::json) AS approvals
           FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ) svc_appr ON true
         WHERE ${where}
         ORDER BY ${sortField} ${sortOrder}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      // KPI 집계 (필터 무관 전체 대상)
      // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
      // 승인 KPI는 SSOT인 offer_service_approvals 테이블을 기준으로 집계해야 한다.
      // 기존 spo.approval_status는 파생 필드이며 submit 경로가 갱신하지 않아 stale 상태.
      // 정의:
      //   approvalPending  = 서비스 승인 레코드 중 하나라도 pending 인 offer 수
      //   approvalApproved = offer의 모든 서비스 승인 레코드가 approved (1건 이상 존재)인 offer 수
      //   approvalRejected = 서비스 승인 레코드 중 하나라도 rejected 이면서 pending 은 없는 offer 수
      //   approvalNone     = offer_service_approvals 레코드가 하나도 없는 offer 수 (참고 — 현재 KPI 카드에는 미노출)
      AppDataSource.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE spo.is_active = true)::int AS active,
           COUNT(*) FILTER (WHERE spo.is_active = false)::int AS inactive,
           COUNT(*) FILTER (WHERE spo.distribution_type = 'PUBLIC')::int AS "distPublic",
           COUNT(*) FILTER (WHERE spo.distribution_type = 'SERVICE')::int AS "distService",
           COUNT(*) FILTER (WHERE spo.distribution_type = 'PRIVATE')::int AS "distPrivate",
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM offer_service_approvals osa
             WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
           ))::int AS "approvalPending",
           COUNT(*) FILTER (WHERE
             EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
             AND NOT EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved'
             )
           )::int AS "approvalApproved",
           COUNT(*) FILTER (WHERE
             EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected'
             )
             AND NOT EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
             )
           )::int AS "approvalRejected"
         FROM supplier_product_offers spo
         WHERE spo.deleted_at IS NULL`,
      ),
    ]);

    const total = countResult[0]?.total || 0;
    const kpi = kpiResult[0] || {};

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpi: {
        total: kpi.total || 0,
        active: kpi.active || 0,
        inactive: kpi.inactive || 0,
        distPublic: kpi.distPublic || 0,
        distService: kpi.distService || 0,
        distPrivate: kpi.distPrivate || 0,
        approvalPending: kpi.approvalPending || 0,
        approvalApproved: kpi.approvalApproved || 0,
        approvalRejected: kpi.approvalRejected || 0,
      },
    };
  }

  // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-C: batch org name lookup
  private async getOrgNameMap(suppliers: NetureSupplier[]): Promise<Map<string, string>> {
    const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
    const map = new Map<string, string>();
    if (orgIds.length === 0) return map;
    try {
      const rows: Array<{ id: string; name: string }> = await AppDataSource.query(
        `SELECT id, name FROM organizations WHERE id = ANY($1)`,
        [orgIds],
      );
      for (const r of rows) map.set(r.id, r.name);
    } catch { /* non-fatal */ }
    return map;
  }
}
