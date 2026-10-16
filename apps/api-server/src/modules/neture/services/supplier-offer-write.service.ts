import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SupplierProductOffer, OfferDistributionType, OfferApprovalStatus } from '../entities/index.js';
import { autoExpandPublicProduct } from '../../../utils/auto-listing.utils.js';
import logger from '../../../utils/logger.js';
import { resolveMasterWriteFields } from './master-link-policy.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';
import { assertDrugOfferAllowed, type DrugGateResult } from '../guards/drug-access.guard.js';
import { deriveDistributionType } from './offer-write-policy.js';

/** Existing SupplierOfferWriteService workflows; public callers use NetureOfferService. */
export class SupplierOfferWriteService {
  private _offerRepo?: Repository<SupplierProductOffer>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
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
      const drugUpdateGate = await checkOfferPublicationAccess(offer);
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
      // 그런데 (당시의) createSupplierOffer 는 신규 등록을 항상 isPublic:false + serviceKeys:[] +
      // allowedSellerIds:[] (= PRIVATE, UI 의 "내부 상품") 로 만들었다. 결과적으로 신규 등록 상품은
      // 공급 방식을 설정하기 전까지 가격·설명·재고 등 어떤 정보도 저장할 수 없었다 (실사용 차단).
      //
      // 노출·거래 안전성은 이 게이트가 아니라 소비 경로가 이미 보장한다 —
      // 매장 HUB(pharmacy-products.controller) · 매장 checkout(kpa) ·
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

      const publicationError = validateOfferPublicationChange(offer, updates);
      if (publicationError) return { success: false, error: publicationError };
      const savedOffer = await this.offerRepo.save(offer);

      // WO-O4O-PRODUCT-AUTO-LISTING-STABILIZATION-V1: PUBLIC 전환 시 기존 매장에 자동 Listing 확산
      if (savedOffer.distributionType === OfferDistributionType.PUBLIC
          && savedOffer.approvalStatus === OfferApprovalStatus.APPROVED
          && savedOffer.isActive && !prevIsPublic) {
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
}

function validateOfferPublicationChange(
  offer: SupplierProductOffer,
  updates: { isPublic?: boolean; distributionType?: OfferDistributionType; isActive?: boolean },
): string | null {
  const enabling = updates.isPublic === true || updates.distributionType === OfferDistributionType.PUBLIC || updates.isActive === true;
  if (enabling && offer.approvalStatus !== OfferApprovalStatus.APPROVED) return 'PRODUCT_NOT_APPROVED';
  const hasTargets = offer.isPublic || offer.defaultSupplyEnabled || (offer.serviceKeys?.length ?? 0) > 0;
  if (hasTargets && (!Number.isInteger(offer.priceGeneral) || offer.priceGeneral <= 0)) return 'PRICE_REQUIRED';
  return null;
}

async function checkOfferPublicationAccess(offer: SupplierProductOffer): Promise<DrugGateResult> {
  if (!offer.isPublic && !offer.serviceKeys?.length && !offer.defaultSupplyEnabled) return { allowed: true, isDrug: false };
  return assertDrugOfferAllowed(AppDataSource, {
    action: offer.isPublic ? 'OFFER_PUBLISH' : 'OFFER_UPDATE', masterId: offer.masterId,
    serviceKeys: offer.defaultSupplyEnabled ? [...(offer.serviceKeys || []), 'neture'] : offer.serviceKeys || [],
    isPublic: offer.isPublic,
  });
}
