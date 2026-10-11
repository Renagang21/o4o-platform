import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';
import { filterApprovalEligibleServiceKeys, isApprovalEligibleServiceKey } from '../constants/approval-service-keys.js';
import { isSupplierOptinServiceKey } from '../constants/supplier-optin-services.js';
import { ServiceAudienceService } from './service-audience.service.js';
import { assertDrugOfferAllowed } from '../guards/drug-access.guard.js';
import { deriveDistributionType } from './offer-write-policy.js';

/** Existing SupplierOfferDistributionService workflows; public callers use NetureOfferService. */
export class SupplierOfferDistributionService {

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
    //   이 경로는 **승인 대상 키(SSOT) 2개만 책임진다**. 그 밖의 키
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
   *   updateDistribution 은 **승인 대상 2키(kpa-society/k-cosmetics)** 를 책임진다.
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
   *   가 아니면 규제 상품 연결을 거부한다 (createSupplierOfferFromExistingMaster / submitForApproval 와 동일 술어).
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

    // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §16-5 결정):
    //   공급자 opt-in 은 폐지 — 새 제공 시작을 받지 않는다(일반가 = 기본 공급, 별도 단가 = 공급 제안).
    //   제공 중인 상품의 단가 변경 · 제공 중지는 기존 PH 주문 처리 동안 유지한다.
    if (input.enabled && !alreadyOn && isSupplierOptinServiceKey(serviceKey)) {
      return {
        success: false,
        error: 'SUPPLIER_OPTIN_RETIRED',
        message:
          '서비스 직접 제공은 종료되었습니다. 일반 공급은 제품 등록 승인(Neture 약국 기본 공급), 별도 단가는 공급 제안으로 신청해 주세요.',
      };
    }
    //   service_keys 가 비면 Neture 약국 기본 공급으로 판정된다(supply-access). opt-in 키만 남은 상품에서
    //   키를 지우면 운영자 승인 없이 공급 범위가 넓어지므로 막는다 — 공급을 멈추려면 상품을 비활성으로 바꾼다.
    if (!input.enabled && alreadyOn && currentKeys.every((k) => k === serviceKey)) {
      return {
        success: false,
        error: 'OPTIN_STOP_WOULD_EXPOSE_DEFAULT_SUPPLY',
        message:
          '이 상품은 다른 공급 경로가 없어 제공을 중지하면 Neture 약국 기본 공급으로 노출됩니다. 공급을 멈추려면 제품 목록에서 상품을 비활성으로 바꿔 주세요.',
      };
    }

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
}
