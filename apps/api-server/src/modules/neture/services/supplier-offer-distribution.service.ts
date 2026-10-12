import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';
import { filterApprovalEligibleServiceKeys, isApprovalEligibleServiceKey } from '../constants/approval-service-keys.js';
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

}
