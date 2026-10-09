/**
 * 세미프랜차이즈 취급매장 모집 — DESIGN §3-6
 *
 * - 원장은 기존 seller_recruitments / seller_recruitment_applications 그대로(+ semi_franchise_id · supply_unit_price ·
 *   applicant_organization_id). 공통 Program 테이블을 만들지 않는다(Supplier Domain §6).
 * - 운영자 조건 승인(exposure_status)은 대상 세미프랜차이즈 담당 운영자만, 한 번만.
 * - 참여 단위 = 약국 조직. 공급자 참여 승인(기존 approveApplication — 세미프랜차이즈 모집은 사용자 단위 bridge 생략) 후
 *   그 약국은 모집 공급가로 바로 주문한다(supply-access SSOT 의 recruitment 경로).
 */
import type { DataSource } from 'typeorm';
import { NeturePharmacyError, NETURE_PHARMACY_SERVICE_KEY, DEFAULT_SEMI_FRANCHISE_KEY,
  rowsOf,
} from '../constants.js';
import type { SemiFranchiseRow } from './semi-franchise.service.js';
import { recruitmentTargetMatch, recruitmentAvailable } from './recruitment-target.js';

const RECRUITMENT_VIEW = `
  SELECT sr.id, sr.product_id AS "masterId", sr.product_name AS "productName", sr.seller_name AS "supplierName",
         sr.supply_unit_price AS "supplyUnitPrice", sr.consumer_price AS "consumerPrice",
         sr.status::text AS status, sr.exposure_status::text AS "exposureStatus", sr.exposure_review_note AS "exposureReviewNote",
         sr.created_at AS "createdAt", sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName"
    FROM seller_recruitments sr
    JOIN semi_franchises sf ON ${recruitmentTargetMatch()}`;

export class SemiFranchiseRecruitmentService {
  constructor(private readonly dataSource: DataSource) {}

  /** 공급자 — 등록 승인된 자기 제품으로 세미프랜차이즈 모집 생성(세미프랜차이즈별 1건). */
  async supplierCreate(
    supplierUserId: string,
    supplierIds: string[],
    input: { masterId?: string; semiFranchiseKey?: string; supplyUnitPrice?: number; consumerPrice?: number },
  ) {
    const supplyUnitPrice = Number(input.supplyUnitPrice);
    if (!Number.isInteger(supplyUnitPrice) || supplyUnitPrice <= 0) {
      throw new NeturePharmacyError(400, 'INVALID_PRICE', '모집 공급가는 0보다 큰 정수(원)여야 합니다.');
    }
    const [offer] = await this.dataSource.query(
      `SELECT spo.id, pm.name AS product_name, pm.manufacturer_name AS manufacturer, org.name AS seller_name
         FROM supplier_product_offers spo
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN organizations org ON org.id = ns.organization_id
        WHERE spo.master_id = $1::uuid AND ns.id = ANY($2::uuid[]) AND spo.deleted_at IS NULL
          AND spo.approval_status = 'APPROVED'`,
      [input.masterId, supplierIds],
    );
    if (!offer) throw new NeturePharmacyError(404, 'OFFER_NOT_FOUND', '등록 승인된 공급 제품을 찾을 수 없습니다.');
    const [sf] = await this.dataSource.query(
      `SELECT id, name FROM semi_franchises WHERE key = $1 AND status = 'active'`,
      [input.semiFranchiseKey?.trim() || DEFAULT_SEMI_FRANCHISE_KEY],
    );
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    const [dup] = await this.dataSource.query(
      `SELECT 1 FROM seller_recruitments sr
         JOIN semi_franchises sf ON ${recruitmentTargetMatch()}
        WHERE sr.product_id = $1 AND sr.seller_id = $2 AND sf.id = $3`,
      [input.masterId, supplierUserId, sf.id],
    );
    if (dup) throw new NeturePharmacyError(409, 'RECRUITMENT_ALREADY_EXISTS', '이 세미프랜차이즈에 이미 모집이 있습니다.');
    const consumerPrice = Number.isFinite(Number(input.consumerPrice)) ? Math.max(0, Number(input.consumerPrice)) : 0;
    const [row] = await this.dataSource.query(
      `INSERT INTO seller_recruitments
         (product_id, product_name, manufacturer, consumer_price, commission_rate, seller_id, seller_name,
          service_name, service_id, status, exposure_status, semi_franchise_id, supply_unit_price)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'recruiting', 'pending', $9, $10)
       RETURNING id, status::text AS status, exposure_status::text AS "exposureStatus"`,
      [
        input.masterId, offer.product_name, offer.manufacturer, consumerPrice, supplierUserId,
        offer.seller_name || '공급자', sf.name, NETURE_PHARMACY_SERVICE_KEY, sf.id, supplyUnitPrice,
      ],
    );
    return row;
  }

  async supplierList(supplierUserId: string) {
    return this.dataSource.query(
      `${RECRUITMENT_VIEW} WHERE sr.seller_id = $1 ORDER BY sr.created_at DESC`,
      [supplierUserId],
    );
  }

  async operatorList(sf: SemiFranchiseRow, exposureStatus?: string) {
    const s = exposureStatus && exposureStatus !== 'all' ? exposureStatus : null;
    return this.dataSource.query(
      `${RECRUITMENT_VIEW} WHERE sf.id = $1 AND ($2::text IS NULL OR sr.exposure_status::text = $2)
       ORDER BY sr.created_at DESC`,
      [sf.id, s],
    );
  }

  /** 조건 승인 · 반려 — 대기 중인 조건만, 한 번(승인된 조건을 다시 승인하지 않는다). */
  async operatorDecide(sf: SemiFranchiseRow, operatorId: string, recruitmentId: string, action: 'approve' | 'reject', note?: string | null) {
    const target = action === 'approve' ? 'approved' : 'rejected';
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE seller_recruitments
          SET exposure_status = $3::seller_recruitment_exposure_status_enum, exposure_reviewed_at = NOW(),
              exposure_reviewed_by = $4, exposure_review_note = $5, updated_at = NOW()
        WHERE id = $1::uuid AND exposure_status = 'pending'
          AND EXISTS (SELECT 1 FROM semi_franchises sf
            WHERE sf.id = $2 AND ${recruitmentTargetMatch('seller_recruitments', 'sf')})
      RETURNING id, exposure_status::text AS "exposureStatus"`,
      [recruitmentId, sf.id, target, operatorId, note?.trim()?.slice(0, 1000) || null],
    ));
    if (!rows[0]) throw new NeturePharmacyError(409, 'INVALID_TRANSITION', '대기 중인 모집 조건이 아닙니다.');
    return rows[0];
  }

  /** 약국 — 일반 공개 및 가입한 세미프랜차이즈의 모집 + 내 약국의 참여 상태 */
  async pharmacyBrowse(organizationId: string) {
    return this.dataSource.query(
      `SELECT sr.id, sr.product_name AS "productName", sr.seller_name AS "supplierName",
              sr.supply_unit_price AS "supplyUnitPrice", sr.consumer_price AS "consumerPrice", sr.created_at AS "createdAt",
              sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName",
              sra.id AS "applicationId", sra.status::text AS "applicationStatus"
         FROM seller_recruitments sr
         LEFT JOIN semi_franchises sf ON ${recruitmentTargetMatch()} AND sf.status = 'active'
         LEFT JOIN semi_franchise_memberships sfm
           ON sfm.semi_franchise_id = sf.id AND sfm.organization_id = $1 AND sfm.status = 'active'
         LEFT JOIN seller_recruitment_applications sra
           ON sra.recruitment_id = sr.id AND sra.applicant_organization_id = $1
        WHERE ${recruitmentAvailable()} AND sr.status = 'recruiting'
        ORDER BY sr.created_at DESC`,
      [organizationId],
    );
  }

  /** 약국 조직 단위 참여 신청 */
  async pharmacyApply(organizationId: string, userId: string, recruitmentId: string) {
    return this.dataSource.transaction(async (m) => {
      const [rec] = await m.query(
        `SELECT sr.id FROM seller_recruitments sr
           LEFT JOIN semi_franchises sf ON ${recruitmentTargetMatch()} AND sf.status = 'active'
           LEFT JOIN semi_franchise_memberships sfm
             ON sfm.semi_franchise_id = sf.id AND sfm.organization_id = $2 AND sfm.status = 'active'
          WHERE sr.id = $1::uuid AND ${recruitmentAvailable()} AND sr.status = 'recruiting'`,
        [recruitmentId, organizationId],
      );
      if (!rec) throw new NeturePharmacyError(404, 'RECRUITMENT_NOT_AVAILABLE', '참여할 수 있는 모집이 아닙니다.');
      const [existing] = await m.query(
        `SELECT id, status::text AS status FROM seller_recruitment_applications
          WHERE recruitment_id = $1 AND applicant_organization_id = $2 FOR UPDATE`,
        [rec.id, organizationId],
      );
      if (existing) {
        if (existing.status === 'pending' || existing.status === 'approved') {
          throw new NeturePharmacyError(409, 'DUPLICATE_APPLICATION', '이미 참여 신청한 모집입니다.');
        }
        const [row] = rowsOf(await m.query(
          `UPDATE seller_recruitment_applications
              SET status = 'pending', applicant_id = $2, applied_at = NOW(), decided_at = NULL, decided_by = NULL,
                  reason = NULL, updated_at = NOW()
            WHERE id = $1 RETURNING id, status::text AS status`,
          [existing.id, userId],
        ));
        return row;
      }
      const [org] = await m.query(`SELECT name FROM organizations WHERE id = $1`, [organizationId]);
      const [row] = await m.query(
        `INSERT INTO seller_recruitment_applications (recruitment_id, applicant_id, applicant_name, applicant_organization_id, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING id, status::text AS status`,
        [rec.id, userId, org?.name ?? null, organizationId],
      );
      return row;
    });
  }
}
