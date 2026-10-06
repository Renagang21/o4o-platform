/**
 * 공급 제안 (SPO 하위 복수 제안) — DESIGN §1 R5 · R6 · §3-4
 *
 * - 공급자는 등록 승인된(APPROVED) 자기 제품에 세미프랜차이즈 대상 제안을 여러 개 낼 수 있다(unique 없음).
 * - 승인은 대상 세미프랜차이즈 담당 운영자만(호출 측이 requireOperatorOf 로 범위를 넘긴다).
 * - 제안 가격은 수정하지 않는다 — 종료 후 새 제안. 제안 반려 · 종료는 제품(SPO) 상태에 연쇄하지 않는다.
 */
import type { DataSource } from 'typeorm';
import { NeturePharmacyError,
  rowsOf,
} from '../constants.js';
import type { SemiFranchiseRow } from './semi-franchise.service.js';

export type ProposalAction = 'approve' | 'reject' | 'end';
const PROPOSAL_TRANSITIONS: Record<ProposalAction, { from: string[]; to: string }> = {
  approve: { from: ['pending'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  end: { from: ['pending', 'approved'], to: 'ended' },
};

export function nextProposalStatus(current: string, action: ProposalAction): string | null {
  const t = PROPOSAL_TRANSITIONS[action];
  return t && t.from.includes(current) ? t.to : null;
}

const PROPOSAL_VIEW = `
  SELECT sp.id, sp.status, sp.unit_price AS "unitPrice", sp.note, sp.reason,
         sp.target_organization_id AS "targetOrganizationId", tgt.name AS "targetOrganizationName",
         sp.created_at AS "createdAt", sp.decided_at AS "decidedAt", sp.ended_at AS "endedAt",
         sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName",
         spo.id AS "offerId", spo.price_general AS "priceGeneral", pm.name AS "productName",
         spo.supplier_id AS "supplierId", COALESCE(so.name, ns.slug) AS "supplierName"
    FROM supply_proposals sp
    JOIN semi_franchises sf ON sf.id = sp.semi_franchise_id
    JOIN supplier_product_offers spo ON spo.id = sp.offer_id
    JOIN product_masters pm ON pm.id = spo.master_id
    JOIN neture_suppliers ns ON ns.id = spo.supplier_id
    LEFT JOIN organizations so ON so.id = ns.organization_id
    LEFT JOIN organizations tgt ON tgt.id = sp.target_organization_id`;

export class SupplyProposalService {
  constructor(private readonly dataSource: DataSource) {}

  async supplierCreate(
    supplierId: string,
    userId: string,
    input: { offerId?: string; semiFranchiseKey?: string; targetOrganizationId?: string | null; unitPrice?: number; note?: string | null },
  ) {
    const unitPrice = Number(input.unitPrice);
    if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
      throw new NeturePharmacyError(400, 'INVALID_PRICE', '공급 가격은 0보다 큰 정수(원)여야 합니다.');
    }
    const [offer] = await this.dataSource.query(
      `SELECT id, approval_status FROM supplier_product_offers
        WHERE id = $1::uuid AND supplier_id = $2::uuid AND deleted_at IS NULL`,
      [input.offerId, supplierId],
    );
    if (!offer) throw new NeturePharmacyError(404, 'OFFER_NOT_FOUND', '공급 제품을 찾을 수 없습니다.');
    if (offer.approval_status !== 'APPROVED') {
      // 제품 등록 승인과 공급 제안 승인은 다른 단계다 — 등록 승인이 먼저다.
      throw new NeturePharmacyError(409, 'PRODUCT_NOT_APPROVED', '제품 등록 승인 후 공급 제안을 낼 수 있습니다.');
    }
    const [sf] = await this.dataSource.query(
      `SELECT id FROM semi_franchises WHERE key = $1 AND status = 'active'`,
      [input.semiFranchiseKey],
    );
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    const target = input.targetOrganizationId || null;
    if (target) {
      const [pharmacy] = await this.dataSource.query(
        `SELECT 1 FROM neture_pharmacy_memberships WHERE organization_id = $1::uuid`,
        [target],
      );
      if (!pharmacy) throw new NeturePharmacyError(400, 'INVALID_TARGET', '대상 약국을 찾을 수 없습니다.');
    }
    const [row] = await this.dataSource.query(
      `INSERT INTO supply_proposals (offer_id, semi_franchise_id, target_organization_id, unit_price, note, status, requested_by)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING id, status`,
      [offer.id, sf.id, target, unitPrice, input.note?.trim()?.slice(0, 1000) || null, userId],
    );
    return row;
  }

  async supplierList(supplierId: string) {
    return this.dataSource.query(`${PROPOSAL_VIEW} WHERE spo.supplier_id = $1::uuid ORDER BY sp.created_at DESC`, [supplierId]);
  }

  async supplierEnd(supplierId: string, proposalId: string) {
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE supply_proposals sp SET status = 'ended', ended_at = NOW(), updated_at = NOW()
         FROM supplier_product_offers spo
        WHERE sp.id = $1::uuid AND spo.id = sp.offer_id AND spo.supplier_id = $2::uuid
          AND sp.status IN ('pending','approved')
      RETURNING sp.id, sp.status`,
      [proposalId, supplierId],
    ));
    if (!rows[0]) throw new NeturePharmacyError(404, 'PROPOSAL_NOT_FOUND', '종료할 수 있는 제안이 없습니다.');
    return rows[0];
  }

  async operatorList(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== 'all' ? status : null;
    return this.dataSource.query(
      `${PROPOSAL_VIEW} WHERE sp.semi_franchise_id = $1 AND ($2::text IS NULL OR sp.status = $2) ORDER BY sp.created_at DESC`,
      [sf.id, s],
    );
  }

  async operatorDecide(sf: SemiFranchiseRow, operatorId: string, proposalId: string, action: ProposalAction, reason?: string | null) {
    return this.dataSource.transaction(async (m) => {
      const [current] = await m.query(
        `SELECT id, status FROM supply_proposals WHERE id = $1::uuid AND semi_franchise_id = $2 FOR UPDATE`,
        [proposalId, sf.id],
      );
      // 다른 세미프랜차이즈의 제안은 처리할 수 없다(존재도 드러내지 않음).
      if (!current) throw new NeturePharmacyError(404, 'PROPOSAL_NOT_FOUND', '제안을 찾을 수 없습니다.');
      const next = nextProposalStatus(current.status, action);
      if (!next) throw new NeturePharmacyError(409, 'INVALID_TRANSITION', `현재 상태(${current.status})에서 처리할 수 없습니다.`);
      const [row] = rowsOf(await m.query(
        `UPDATE supply_proposals
            SET status = $2::text, decided_by = $3, decided_at = NOW(), reason = $4,
                ended_at = CASE WHEN $2::text = 'ended' THEN NOW() ELSE ended_at END, updated_at = NOW()
          WHERE id = $1 RETURNING id, status`,
        [proposalId, next, operatorId, reason?.trim()?.slice(0, 1000) || null],
      ));
      return row;
    });
  }
}
