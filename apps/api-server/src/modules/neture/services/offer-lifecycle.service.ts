import type { Repository, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SupplierProductOffer, OfferApprovalStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import { filterApprovalEligibleServiceKeys } from '../constants/approval-service-keys.js';
import { SupplierRegulatedCategoryService, resolveRegulatedCategoryFromProduct } from './supplier-regulated-category.service.js';
import { ServiceAudienceService } from './service-audience.service.js';
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
        // 기존 승인 원장 조회/누락 행 생성은 단일 transaction helper로 공유한다.
        const hasServiceApprovals = await this.ensureServiceApprovals(offerId, offer.serviceKeys, queryRunner);
        if (!hasServiceApprovals) {
          // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §3-3):
          //   공급처를 지정하지 않은 제품은 서비스 승인(OSA) 행이 없어 파생 sync 로는 APPROVED 가 될 수 없었다.
          //   이 경우 운영자 승인 = **제품 등록 승인**을 직접 기록한다(pharmacy 기본 공급 대상).
          //   세미프랜차이즈별 공급 승인은 supply_proposals 가 따로 맡는다. OSA 행이 있는 제품은 기존 파생 규칙 그대로.
          await queryRunner.query(
            `UPDATE supplier_product_offers
                SET approval_status = 'APPROVED', is_active = true, updated_at = NOW()
              WHERE id = $1`,
            [offerId],
          );
          await queryRunner.commitTransaction();
          logger.info(`[NetureOfferService] Offer registration approved (no designated supply target): ${offerId} by ${adminUserId}`);
          return {
            success: true,
            data: { id: offer.id, masterId: offer.masterId, isActive: true, approvalStatus: OfferApprovalStatus.APPROVED, autoListedCount: 0 },
          };
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
        // 기존 승인 원장 조회/누락 행 생성은 단일 transaction helper로 공유한다.
        const hasServiceApprovals = await this.ensureServiceApprovals(offerId, offer.serviceKeys, queryRunner);
        if (!hasServiceApprovals) {
          // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §3-3): approveProduct 의 공급처 미지정 분기와 짝.
          //   OSA 행이 없으면 파생 sync 가 PENDING 을 돌려주므로 제품 등록 반려를 직접 기록하고,
          //   파생 REJECTED 와 같은 cascade(product_approvals revoke · listings 비활성)를 적용한다.
          //   (offer 에 반려 사유 컬럼은 없다 — 사유는 product_approvals · 로그에 남는다.)
          await queryRunner.query(
            `UPDATE supplier_product_offers
                SET approval_status = 'REJECTED', is_active = false, updated_at = NOW()
              WHERE id = $1`,
            [offerId],
          );
          await queryRunner.query(
            `UPDATE product_approvals
                SET approval_status = 'revoked', decided_by = $2::uuid, decided_at = NOW(),
                    reason = $3, updated_at = NOW()
              WHERE offer_id = $1 AND approval_status = 'approved'`,
            [offerId, adminUserId, reason || 'Offer rejected by admin'],
          );
          await queryRunner.query(
            `UPDATE organization_product_listings SET is_active = false, updated_at = NOW() WHERE offer_id = $1`,
            [offerId],
          );
          await queryRunner.commitTransaction();
          logger.info(`[NetureOfferService] Offer registration rejected (no designated supply target): ${offerId} by ${adminUserId} (reason: ${reason || '-'})`);
          return {
            success: true,
            data: { id: offer.id, masterId: offer.masterId, isActive: false, approvalStatus: OfferApprovalStatus.REJECTED },
          };
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

  /** Existing operator override preparation; false means targetless registration. */
  private async ensureServiceApprovals(
    offerId: string,
    serviceKeys: string[] | null | undefined,
    queryRunner: QueryRunner,
  ): Promise<boolean> {
    const existingApprovals: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM offer_service_approvals WHERE offer_id = $1`,
      [offerId],
    );
    if (existingApprovals.length > 0) return true;
    const keys = serviceKeys?.length ? serviceKeys : [];
    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length === 0) return false;
    const values = uniqueKeys.map((_, i) => `($1, ${i + 2}, 'pending', NOW(), NOW())`).join(', ');
    await queryRunner.query(
      `INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
             VALUES ${values}
             ON CONFLICT (offer_id, service_key) DO NOTHING`,
      [offerId, ...uniqueKeys],
    );
    return true;
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
