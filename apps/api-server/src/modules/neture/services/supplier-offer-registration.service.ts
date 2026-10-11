import type { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierProductOffer, OfferDistributionType, OfferApprovalStatus, SupplierStatus, ProductCategory, ProductMaster } from '../entities/index.js';
import logger from '../../../utils/logger.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';
import { filterApprovalEligibleServiceKeys } from '../constants/approval-service-keys.js';
import { ServiceAudienceService } from './service-audience.service.js';
import { assertDrugOfferAllowed } from '../guards/drug-access.guard.js';
import { canonicalizeRegulatoryType } from '../promotion/adapters/supplier/supplier-regulatory-type.js';
import { deriveDistributionType, assertRegulatedPermit, assertPharmacyOnlyServiceKeys } from './offer-write-policy.js';


/**
 * WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1
 * POST /supplier/products/from-master 의 body 계약.
 *  - 허용: masterId + Offer 영역 필드만.
 *  - 금지: ProductMaster 기준정보/identity 필드 (기존 Master 가 SSOT — 공급자 입력으로 덮어쓰지 않는다).
 *  - supplierId 는 requireActiveSupplier 가 확정한 값만 쓴다 (body 주입 거부).
 */
const FROM_MASTER_ALLOWED_KEYS = new Set([
  'masterId',
  'priceGeneral', 'priceGold', 'pricePlatinum', 'consumerReferencePrice',
  'consumerShortDescription', 'consumerDetailDescription',
  'stockQuantity', 'isFeatured', 'isPublic', 'distributionType', 'serviceKeys',
]);
const FROM_MASTER_FORBIDDEN_MASTER_KEYS = new Set([
  'barcode', 'name', 'manufacturerName', 'regulatoryType', 'regulatoryName', 'mfdsPermitNumber',
  'categoryId', 'brandName', 'brandId', 'specification', 'originCountry', 'tags', 'manualData',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateOfferFromExistingMasterInput {
  masterId: string;
  priceGeneral?: number;
  priceGold?: number | null;
  pricePlatinum?: number | null;
  consumerReferencePrice?: number | null;
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  stockQuantity?: number | string | null;
  isFeatured?: boolean;
  isPublic?: boolean;
  distributionType?: OfferDistributionType;
  serviceKeys?: string[];
}
/** Existing SupplierOfferRegistrationService workflows; public callers use NetureOfferService. */
export class SupplierOfferRegistrationService {
  private _offerRepo?: Repository<SupplierProductOffer>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  // ==================== (은퇴) createSupplierOffer / validateCreateInput / resolveProductMetadata ====================
  //
  // WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.3 (P3 은퇴)
  //   공급자 Offer 경로에서 barcode/name 기반 resolveOrCreateMaster() 경유 · 신규 Master updateProductMaster() ·
  //   공급자 입력 permit 판정 · 카테고리/브랜드 해석 · 브랜드 생성(resolveBrandId) 을 모두 제거했다.
  //   공급자 Offer 는 ProductMaster 에 INSERT/UPDATE 하지 않는다. Master 생성은 Candidate → Promotion Core 만 담당한다.
  //   남은 공급자 Offer 생성 경로 = createSupplierOfferFromExistingMaster() → persistOfferForResolvedMaster() 뿐.
  //   CatalogService.resolveOrCreateMaster() 자체는 Admin/system 경로(catalog-import-resolver · admin.controller ·
  //   product-master-create.controller · neture.service resolveOrCreateMaster 위임)가 계속 쓰므로 삭제하지 않는다.

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

  // ==================== Offer persistence primitive (Master identity 확정 이후) ====================

  /**
   * WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1
   *
   * Master identity 가 **이미 확정된** 뒤의 중립적 Offer persistence.
   * 공급자 Offer 생성의 유일한 persistence 원형이다 — 호출자는 createSupplierOfferFromExistingMaster 뿐
   * (레거시 createSupplierOffer 는 WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 로 은퇴).
   *
   * 맡는 것(순서·코드·로그 불변):
   *   slug/serviceKeys 정제 → 규제 상품 약국 전용 검사 → DRUG gate → Offer 구성 →
   *   (supplier, master) 중복 사전검사 → save + 23505 fallback → service approval 생성 → 응답.
   *
   * 맡지 않는 것: Master resolve/create · 입력 검증 · permit 판정 · ProductMaster write.
   * ProductMaster / ProductIdentifier / ProductCandidate 에는 어떤 write 도 하지 않는다.
   *
   * 신규 Master 가 필요한 등록은 이 파일이 아니라 Candidate(POST /supplier/product-candidates) → Promotion Core 로 간다.
   */
  private async persistOfferForResolvedMaster(
    supplierId: string,
    input: {
      masterId: string;
      /** slug 생성용 — 기존 계약: master.barcode ?? master.id */
      masterBarcode: string;
      /** 카테고리 기반 규제 상품 여부(기존 is_regulated 축) */
      isRegulated: boolean;
      /** 알고 있으면 전달 — DRUG gate 가 master 를 재조회하지 않는다. 없으면 gate 가 masterId 로 조회(기존 동작) */
      regulatoryType?: string | null;
      stockQuantity: number;
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      serviceKeys?: string[];
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      isFeatured?: boolean;
    },
  ) {
    const { masterId, masterBarcode, isRegulated } = input;

    // slug + offer entity
    const slug = `${masterBarcode}-${supplierId.slice(0, 8)}-${Date.now()}`;

    // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리
    //
    // serviceKeys 는 등록 서비스 목록(allowlist)으로 검증되지 않으므로, 유통 축을 뒤집는
    // 값은 여기서 입력 단계에 걸러낸다. 'neture' 는 PUBLIC 축이고 'glucoseview' 는 폐지된
    // 서비스 키다 — 둘 중 하나라도 통과하면 deriveDistributionType 이 offer 를
    // SERVICE 유통으로 잘못 판정한다.
    const filteredServiceKeys = (input.serviceKeys || []).filter((k) => k !== 'neture' && k !== 'glucoseview');

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
    const resolvedIsPublic = input.isPublic ?? (input.distributionType === OfferDistributionType.PUBLIC);

    // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1:
    // 의약품 판정 SSOT = product_masters.regulatory_type='DRUG'.
    // 위 is_regulated 축은 실측상 DRUG 를 전혀 커버하지 못하므로(카테고리 미연결 100%)
    // DRUG 축 게이트를 별도로 적용한다. 빈 serviceKeys·PUBLIC 전환도 여기서 거부된다.
    const drugCreateGate = await assertDrugOfferAllowed(AppDataSource, {
      action: 'OFFER_CREATE',
      masterId,
      regulatoryType: input.regulatoryType,
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
      priceGeneral: input.priceGeneral ?? 0,
      priceGold: input.priceGold ?? null,
      pricePlatinum: input.pricePlatinum ?? null,
      consumerReferencePrice: input.consumerReferencePrice ?? null,
      stockQuantity: input.stockQuantity,
      consumerShortDescription: input.consumerShortDescription ?? null,
      consumerDetailDescription: input.consumerDetailDescription ?? null,
      businessShortDescription: null,
      businessDetailDescription: null,
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured: input.isFeatured ?? false,
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
    const approvalKeys = filterApprovalEligibleServiceKeys(input.serviceKeys);
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
  }

  // ==================== createSupplierOfferFromExistingMaster (WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1) ====================

  /**
   * POST /supplier/products/from-master — 검증된 기존 ProductMaster 에 Offer 직접 연결
   *
   *   ProductMaster 선택 → masterId → 서버 재검증 → SupplierProductOffer
   *
   * - Master 를 재추론하지 않는다 (resolveOrCreateMaster 미경유 · barcode/name 재탐색 0).
   * - ProductMaster / ProductIdentifier / ProductCandidate write 0. 생성되는 것은 Offer(+service approval)뿐.
   * - 규제 정보는 기존 Master 가 SSOT — 공급자에게 regulatoryType/mfdsPermitNumber 를 다시 받지 않는다.
   * - 레거시 POST /supplier/products(barcode/name → Master 재추론)는 은퇴했다. 공급자가 masterId 로 Offer 를 만드는 곳은 여기뿐.
   * - DRUG gate(assertDrugOfferAllowed) · Offer 유일성 계약은 persistOfferForResolvedMaster 가 기존 그대로 적용한다.
   *
   * @param rawBody 요청 body 원문 — 허용 키 검사를 여기서 한다(라우트가 아니라 서비스 계약).
   */
  async createSupplierOfferFromExistingMaster(supplierId: string, rawBody: Record<string, unknown>) {
    try {
      const body = (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)) ? rawBody : {};

      // 1. body 키 계약 — supplierId 주입 · Master 기준정보 · 허용 목록 밖 키 거부
      if ('supplierId' in body) {
        return { success: false as const, error: OfferErrorCode.SUPPLIER_ID_NOT_ALLOWED, message: 'supplierId 는 요청 본문으로 받지 않습니다.' };
      }
      const masterFields = Object.keys(body).filter((k) => FROM_MASTER_FORBIDDEN_MASTER_KEYS.has(k));
      if (masterFields.length > 0) {
        return {
          success: false as const,
          error: OfferErrorCode.MASTER_FIELD_NOT_ALLOWED,
          message: `기존 제품 연결에서는 제품 기준정보를 받지 않습니다: ${masterFields.join(', ')}`,
        };
      }
      const unknownFields = Object.keys(body).filter((k) => !FROM_MASTER_ALLOWED_KEYS.has(k));
      if (unknownFields.length > 0) {
        return { success: false as const, error: OfferErrorCode.UNSUPPORTED_FIELD, message: `허용되지 않는 필드: ${unknownFields.join(', ')}` };
      }
      const input = body as unknown as CreateOfferFromExistingMasterInput;

      // 2. masterId 형식
      if (typeof input.masterId !== 'string' || !UUID_RE.test(input.masterId.trim())) {
        return { success: false as const, error: OfferErrorCode.INVALID_MASTER_ID, message: 'masterId 형식이 올바르지 않습니다.' };
      }
      const masterId = input.masterId.trim();

      // 3. 공개 유통 설명 요건 · 공급자 상태 (기존 등록 경로와 동일 계약)
      const isPublic = input.isPublic ?? (input.distributionType === OfferDistributionType.PUBLIC);
      if (isPublic && !input.consumerShortDescription?.trim()) {
        return { success: false as const, error: OfferErrorCode.PUBLIC_REQUIRES_DESCRIPTION };
      }
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId }, select: ['id', 'status'] });
      if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
        return { success: false as const, error: OfferErrorCode.SUPPLIER_NOT_ACTIVE };
      }

      // 4. Master 서버 재조회 — 클라이언트(Product Library)가 ACTIVE 만 보여주더라도 write 는 다시 확인한다
      const master = await AppDataSource.getRepository(ProductMaster).findOne({
        where: { id: masterId },
        select: ['id', 'status', 'regulatoryType', 'categoryId', 'isMfdsVerified', 'mfdsPermitNumber', 'barcode'],
      });
      if (!master) {
        return { success: false as const, error: OfferErrorCode.MASTER_NOT_FOUND, message: '선택한 제품을 찾을 수 없습니다.' };
      }
      if (master.status !== 'ACTIVE') {
        return {
          success: false as const,
          error: OfferErrorCode.MASTER_NOT_ACTIVE,
          message: `이 제품은 현재 연결할 수 없는 상태입니다 (${master.status}).`,
        };
      }
      const canonicalRegulatoryType = canonicalizeRegulatoryType(master.regulatoryType);
      if (!canonicalRegulatoryType) {
        return {
          success: false as const,
          error: OfferErrorCode.MASTER_REGULATORY_TYPE_UNSUPPORTED,
          message: '이 제품의 규제 분류를 확인할 수 없어 연결할 수 없습니다. 운영자에게 문의해 주세요.',
        };
      }

      // 5. 규제 상품 permit — Master 값만 사용 (공급자 입력 없음). 기존 is_regulated 축 = 카테고리 기준.
      let isRegulated = false;
      if (master.categoryId) {
        const category = await AppDataSource.getRepository(ProductCategory).findOne({ where: { id: master.categoryId } });
        isRegulated = category?.isRegulated ?? false;
      }
      const permitError = assertRegulatedPermit({
        isRegulated,
        mfdsPermitNumber: master.mfdsPermitNumber,
        isMfdsVerified: master.isMfdsVerified,
        mode: 'registration',
      });
      if (permitError) {
        return {
          success: false as const,
          error: permitError,
          message: '규제 상품은 MFDS 검증이 없고 허가번호도 없는 경우 연결할 수 없습니다. 제품 기준정보 보강은 운영자 경로로 진행됩니다.',
        };
      }

      // 6. 공통 persistence (DRUG gate · 중복 · save · approval) — 공급자 Offer 의 유일한 persistence primitive
      const rawStock = input.stockQuantity;
      const parsedStock = rawStock != null && rawStock !== '' ? Number(rawStock) : 0;
      return await this.persistOfferForResolvedMaster(supplierId, {
        masterId: master.id,
        masterBarcode: master.barcode || master.id,
        isRegulated,
        regulatoryType: canonicalRegulatoryType,
        stockQuantity: Number.isFinite(parsedStock) ? parsedStock : 0,
        isPublic: input.isPublic,
        distributionType: input.distributionType,
        serviceKeys: Array.isArray(input.serviceKeys) ? input.serviceKeys : [],
        priceGeneral: input.priceGeneral,
        priceGold: input.priceGold,
        pricePlatinum: input.pricePlatinum,
        consumerReferencePrice: input.consumerReferencePrice,
        consumerShortDescription: input.consumerShortDescription,
        consumerDetailDescription: input.consumerDetailDescription,
        isFeatured: input.isFeatured,
      });
    } catch (error) {
      logger.error('[NetureOfferService] Error creating supplier offer from existing master:', error);
      throw error;
    }
  }
}
