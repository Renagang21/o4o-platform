import type { QueryRunner } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import { filterApprovalEligibleServiceKeys, isApprovalEligibleServiceKey } from '../constants/approval-service-keys.js';
import { assertDrugOfferAllowed } from '../guards/drug-access.guard.js';
import { deriveDistributionType } from './offer-write-policy.js';
import { autoExpandPublicProduct } from '../../../utils/auto-listing.utils.js';

export interface SupplierPublicationInput {
  isPublic?: boolean;
  serviceKeys?: string[];
  defaultSupplyEnabled?: boolean;
  priceGeneral?: number;
  servicePrices?: Array<{ serviceKey: string; unitPrice: number }>;
}

export interface SupplierPublicationState {
  isPublic: boolean;
  serviceKeys: string[];
  defaultSupplyEnabled: boolean;
  priceGeneral: number;
  distributionType: ReturnType<typeof deriveDistributionType>;
  serviceApprovals: Array<{ serviceKey: string; status: string; reason: string | null }>;
}

/** 진단 결과는 내부에 유지하고 HTTP handler가 공개 상태만 선택한다. */
export type SupplierPublicationResult =
  | { success: true; data: SupplierPublicationState & Record<string, unknown>; error?: never }
  | { success: false; error: string; data?: never };

/** 제품 등록 승인과 독립된 일반 공급 게시. 이벤트 원장은 변경하지 않는다. */
export class SupplierOfferDistributionService {
  async updateDistribution(
    offerId: string,
    supplierId: string,
    userId: string,
    input: SupplierPublicationInput,
  ): Promise<SupplierPublicationResult> {
    const validationError = validatePublicationInput(input);
    if (validationError) return { success: false, error: validationError };
    const q = AppDataSource.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      const [offer] = await q.query(
        `SELECT id, supplier_id, is_public, service_keys, master_id, default_supply_enabled,
                approval_status, is_active, price_general
           FROM supplier_product_offers WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [offerId],
      );
      if (!offer) return await abort('OFFER_NOT_FOUND');
      if (offer.supplier_id !== supplierId) return await abort('NOT_OWNED');
      const currentKeys: string[] = offer.service_keys || [];
      // 타 경로 소유 키를 조용히 삭제하지 않는다.
      const preserved = currentKeys.filter(k => !isApprovalEligibleServiceKey(k));
      const currentEligible = filterApprovalEligibleServiceKeys(currentKeys);
      const nextEligible = input.serviceKeys === undefined ? currentEligible : filterApprovalEligibleServiceKeys(input.serviceKeys);
      const nextKeys = [...new Set([...nextEligible, ...preserved])];
      const nextPublic = input.isPublic ?? offer.is_public;
      const nextDefault = input.defaultSupplyEnabled ?? offer.default_supply_enabled;
      const nextPrice = input.priceGeneral ?? Number(offer.price_general);
      const permissionError = await this.publicationPermissionError(q, offer, nextPublic, nextDefault, nextKeys, nextPrice);
      if (permissionError) return await abort(permissionError);
      const added = nextEligible.filter(k => !currentEligible.includes(k));
      const removed = currentEligible.filter(k => !nextEligible.includes(k));
      const nextDist = deriveDistributionType(nextPublic, nextKeys);
      await q.query(
        `UPDATE supplier_product_offers
            SET service_keys = $2::text[], is_public = $3, distribution_type = $4,
                default_supply_enabled = $5, price_general = $6, updated_at = NOW()
          WHERE id = $1`, [offerId, nextKeys, nextPublic, nextDist, nextDefault, nextPrice],
      );
      // 공급 중단은 가격을 삭제하지 않는다. 입력한 서비스 가격만 upsert한다.
      await this.savePublicationPrices(q, offerId, input.servicePrices ?? []);
      const approvals = new OfferServiceApprovalService(AppDataSource);
      const removedResult = removed.length ? await approvals.cancelServiceApprovals(offerId, removed, q) : { cancelledServiceKeys: [], deactivatedListings: 0 };
      const addedResult = nextEligible.length ? await approvals.createPendingApprovals(offerId, nextEligible, q) : { insertedServiceKeys: [], resubmittedServiceKeys: [] };
      if (nextPublic && !offer.is_public) await autoExpandPublicProduct(q, offerId, offer.master_id);
      // 승인 요약 재계산은 제품 등록 승인이나 이벤트를 바꾸지 않는다.
      const sync = await approvals.syncOfferFromServiceApprovals(offerId, userId, q);
      const serviceApprovals = await q.query(
        `SELECT service_key AS "serviceKey", approval_status AS status, reason FROM offer_service_approvals WHERE offer_id = $1`, [offerId],
      );
      await q.commitTransaction();
      return { success: true, data: { isPublic: nextPublic, serviceKeys: nextKeys, defaultSupplyEnabled: nextDefault, priceGeneral: nextPrice, distributionType: nextDist, added, removed, addedResult, removedResult, sync, serviceApprovals } };
    } catch (error) {
      await q.rollbackTransaction();
      throw error;
    } finally {
      await q.release();
    }
    async function abort(error: string): Promise<{ success: false; error: string }> {
      await q.rollbackTransaction();
      return { success: false, error };
    }
  }
  private async publicationPermissionError(q: QueryRunner, offer: { approval_status: string; is_active: boolean; master_id: string }, nextPublic: boolean, nextDefault: boolean, nextKeys: string[], nextPrice: number): Promise<string | null> {
    if (!nextPublic && !nextDefault && nextKeys.length === 0) return null;
    if (offer.approval_status !== 'APPROVED') return 'PRODUCT_NOT_APPROVED';
    if (!offer.is_active) return 'PRODUCT_INACTIVE';
    if (!Number.isInteger(nextPrice) || nextPrice <= 0) return 'PRICE_REQUIRED';
    const gate = await assertDrugOfferAllowed(q, {
      action: nextPublic ? 'OFFER_PUBLISH' : 'OFFER_UPDATE', masterId: offer.master_id,
      serviceKeys: nextDefault ? [...nextKeys, 'neture'] : nextKeys, isPublic: nextPublic,
    });
    return gate.allowed ? null : gate.code!;
  }

  private async savePublicationPrices(q: QueryRunner, offerId: string, prices: NonNullable<SupplierPublicationInput['servicePrices']>): Promise<void> {
    for (const price of prices) {
      await q.query(
        `INSERT INTO offer_service_prices (offer_id, service_key, unit_price, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (offer_id, service_key) DO UPDATE SET unit_price = EXCLUDED.unit_price, updated_at = NOW()`,
        [offerId, price.serviceKey, price.unitPrice],
      );
    }
  }

}

export function validatePublicationInput(input: SupplierPublicationInput): string | null {
  for (const value of [input.isPublic, input.defaultSupplyEnabled]) {
    if (value !== undefined && typeof value !== 'boolean') return 'INVALID_PUBLICATION';
  }
  if (input.serviceKeys !== undefined && (!Array.isArray(input.serviceKeys) || input.serviceKeys.some(k => typeof k !== 'string'))) return 'INVALID_SERVICE_KEYS';
  if (input.priceGeneral !== undefined && (!Number.isInteger(input.priceGeneral) || input.priceGeneral < 0)) return 'INVALID_PRICE';
  return input.servicePrices === undefined ? null : validatePublicationPrices(input.servicePrices);
}

function validatePublicationPrices(prices: SupplierPublicationInput['servicePrices']): string | null {
    if (!Array.isArray(prices)) return 'INVALID_PRICES';
    const keys = new Set<string>();
    for (const price of prices) {
      if (!price || !isApprovalEligibleServiceKey(price.serviceKey) || keys.has(price.serviceKey) || !Number.isInteger(price.unitPrice) || price.unitPrice <= 0) return 'INVALID_PRICES';
      keys.add(price.serviceKey);
    }

  return null;
}
