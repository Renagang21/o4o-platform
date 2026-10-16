import type { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SupplierProductOffer, OfferApprovalStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';
import { SupplierRegulatedCategoryService, resolveRegulatedCategoryFromProduct } from './supplier-regulated-category.service.js';
import { assertRegulatedPermit } from './offer-write-policy.js';

/** Existing OfferLifecycleService workflows; public callers use NetureOfferService. */
export class OfferLifecycleService {
  private _offerRepo?: Repository<SupplierProductOffer>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }

  /**
   * POST /admin/products/:id/approve — 상품 승인
   * 제품 등록 승인만 기록한다. 서비스 게시 승인과 활성 listing은 별도다.
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

      // 제품 등록 승인만 기록한다. 서비스 승인·게시 선택·listing 생성은 별도 업무다.
      await AppDataSource.query(
        `UPDATE supplier_product_offers
            SET approval_status = 'APPROVED', is_active = true, registration_rejection_reason = NULL,
                default_supply_enabled = false, is_public = false, updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL`,
        [offerId],
      );
      logger.info(`[NetureOfferService] Product registration approved: ${offerId} by ${adminUserId}; publication unchanged to off`);
      return {
        success: true,
        data: { id: offer.id, masterId: offer.masterId, isActive: true, approvalStatus: OfferApprovalStatus.APPROVED, autoListedCount: 0 },
      };
    } catch (error) {
      logger.error('[NetureOfferService] Error approving offer:', error);
      throw error;
    }
  }

  /**
   * POST /admin/products/:id/reject — 상품 반려
   * 제품 자체 반려는 모든 기존 노출을 차단한다. 서비스별 반려는 별도 scoped 경로다.
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

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE supplier_product_offers
              SET approval_status = 'REJECTED', is_active = false,
                  default_supply_enabled = false, is_public = false, registration_rejection_reason = $2, updated_at = NOW()
            WHERE id = $1`, [offerId, reason?.trim() || null],
        );
        await queryRunner.query(
          `UPDATE offer_service_approvals SET approval_status = 'rejected', decided_by = $2,
                  decided_at = NOW(), reason = $3, updated_at = NOW()
            WHERE offer_id = $1 AND approval_status != 'cancelled'`, [offerId, adminUserId, reason || null],
        );
        await queryRunner.query(
          `UPDATE product_approvals SET approval_status = 'revoked', decided_by = $2::uuid,
                  decided_at = NOW(), reason = $3, updated_at = NOW()
            WHERE offer_id = $1 AND approval_status = 'approved'`, [offerId, adminUserId, reason || 'Product registration rejected'],
        );
        await queryRunner.query(
          `UPDATE organization_product_listings SET is_active = false, updated_at = NOW() WHERE offer_id = $1`, [offerId],
        );
        await queryRunner.commitTransaction();
        return { success: true, data: { id: offer.id, masterId: offer.masterId, isActive: false, approvalStatus: OfferApprovalStatus.REJECTED } };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('[NetureOfferService] Error rejecting offer:', error);
      throw error;
    }
  }

  // ==================== Supplier: Submit for Approval (WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1) ====================

  /** 반려된 자기 제품의 등록 재검토 요청. 서비스 게시 요청은 distribution API가 맡는다. */
  async submitForApproval(
    supplierId: string,
    offerIds: string[],
  ): Promise<{
    submitted: number;
    skipped: Array<{ id: string; reason: string }>;
    errors: Array<{ id: string; error: string }>;
  }> {
    const result = {
      submitted: 0,
      skipped: [] as Array<{ id: string; reason: string }>,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // 소유권 + 저장된 정책 + 제품 분류값(품목군 gate) 일괄 조회
    const ownedRows: Array<{
      id: string;
      service_keys: string[];
      approval_status: string;
      regulatory_type: string | null;
      is_regulated: boolean | null;
      category_name: string | null;
      category_slug: string | null;
    }> = await AppDataSource.query(
      `SELECT o.id, o.service_keys, o.approval_status, m.regulatory_type, c.is_regulated, c.name AS category_name, c.slug AS category_slug
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

        if (ownedRow.approval_status !== 'REJECTED') {
          result.skipped.push({ id: offerId, reason: 'ALREADY_REQUESTED_OR_DECIDED' });
          continue;
        }
        const changed = await AppDataSource.query(
          `UPDATE supplier_product_offers SET approval_status = 'PENDING', is_active = false,
                  is_public = false, default_supply_enabled = false, updated_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND approval_status = 'REJECTED' AND deleted_at IS NULL RETURNING id`,
          [offerId, supplierId],
        );
        if (changed.length) result.submitted++;
        else result.skipped.push({ id: offerId, reason: 'ALREADY_REQUESTED_OR_DECIDED' });
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
}
