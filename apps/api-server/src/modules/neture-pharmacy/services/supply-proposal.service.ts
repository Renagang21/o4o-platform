import { randomUUID } from "node:crypto";
/**
 * 공급 제안 (SPO 하위 복수 제안) — DESIGN §1 R5 · R6 · §3-4
 *
 * - 공급자는 등록 승인된(APPROVED) 자기 제품에 세미프랜차이즈 대상 제안을 여러 개 낼 수 있다(unique 없음).
 * - 승인은 대상 세미프랜차이즈 담당 운영자만(호출 측이 requireOperatorOf 로 범위를 넘긴다).
 * - 제안 가격은 수정하지 않는다 — 종료 후 새 제안. 제안 반려 · 종료는 제품(SPO) 상태에 연쇄하지 않는다.
 */
import type { DataSource, EntityManager } from "typeorm";
import { NeturePharmacyError, rowsOf } from "../constants.js";
import type { SemiFranchiseRow } from "./semi-franchise.service.js";

import { resolveSupplierForUser } from "../../neture/middleware/supplier-context.resolver.js";
import { proposalTerms } from "./proposal-terms.js";

export type ProposalAction = "approve" | "reject" | "end";
const PROPOSAL_TRANSITIONS: Record<
  ProposalAction,
  { from: string[]; to: string }
> = {
  approve: { from: ["pending"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
  end: { from: ["pending", "approved"], to: "ended" },
};

export function nextProposalStatus(
  current: string,
  action: ProposalAction,
): string | null {
  const t = PROPOSAL_TRANSITIONS[action];
  return t && t.from.includes(current) ? t.to : null;
}

const PROPOSAL_VIEW = `
  SELECT sp.id, sp.status, sp.unit_price AS "unitPrice", sp.note, sp.reason,
         sp.target_organization_id AS "targetOrganizationId", tgt.name AS "targetOrganizationName",
         sp.created_at AS "createdAt", sp.decided_at AS "decidedAt", sp.ended_at AS "endedAt",
         sp.decided_by AS "decidedBy", sp.ended_by AS "endedBy", sp.end_reason AS "endReason", sp.terms_snapshot AS "termsSnapshot",
         decision_actor.name AS "decidedByName", end_actor.name AS "endedByName",
         sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName",
         spo.id AS "offerId", spo.price_general AS "priceGeneral", pm.name AS "productName",
         spo.supplier_id AS "supplierId", COALESCE(so.name, ns.slug) AS "supplierName",
         pm.specification AS "productSpecification", pm.manufacturer_name AS "productManufacturer",
         pm.barcode AS "productBarcode", spo.business_short_description AS "productSummary",
         spo.business_detail_description AS "productDescription",
         ns.base_shipping_fee AS "baseShippingFee", ns.free_shipping_threshold AS "freeShippingThreshold"
    FROM supply_proposals sp
    JOIN semi_franchises sf ON sf.id = sp.semi_franchise_id
    JOIN supplier_product_offers spo ON spo.id = sp.offer_id
    JOIN product_masters pm ON pm.id = spo.master_id
    JOIN neture_suppliers ns ON ns.id = spo.supplier_id
    LEFT JOIN organizations so ON so.id = ns.organization_id
    LEFT JOIN organizations tgt ON tgt.id = sp.target_organization_id
    LEFT JOIN users decision_actor ON decision_actor.id = sp.decided_by
    LEFT JOIN users end_actor ON end_actor.id = sp.ended_by`;

async function assertTargetMembership(m: Pick<EntityManager, 'query'>, businessId: string, target: string | null) {
  if (!target) return;
  const [member] = await m.query(`SELECT sfm.id FROM semi_franchise_memberships sfm
    JOIN neture_pharmacy_memberships npm ON npm.organization_id=sfm.organization_id AND npm.status='active'
    WHERE sfm.semi_franchise_id=$1 AND sfm.organization_id=$2::uuid AND sfm.status='active'
    FOR SHARE OF sfm,npm`, [businessId, target]);
  if (!member) throw new NeturePharmacyError(409, 'TARGET_MEMBERSHIP_REQUIRED', '대상 약국이 이 협업체의 승인된 회원이 아닙니다. 가입 상태를 확인한 뒤 다시 요청해 주세요.');
}

export class SupplyProposalService {
  constructor(private readonly dataSource: DataSource) {}

  async supplierCreate(
    supplierId: string,
    userId: string,
    input: {
      offerId?: string;
      semiFranchiseKey?: string;
      targetOrganizationId?: string | null;
      unitPrice?: number;
      note?: string | null;
      terms?: unknown;
      requestId?: string;
    },
  ) {
    const unitPrice = Number(input.unitPrice);
    if (
      !Number.isInteger(unitPrice) ||
      unitPrice <= 0 ||
      unitPrice > 2147483647
    ) {
      throw new NeturePharmacyError(
        400,
        "INVALID_PRICE",
        "공급 가격은 0보다 큰 정수(원)여야 합니다.",
      );
    }
    const requestId = input.requestId ?? randomUUID();
    if (
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId,
      )
    ) {
      throw new NeturePharmacyError(
        400,
        "INVALID_REQUEST_ID",
        "요청 식별자가 올바르지 않습니다.",
      );
    }
    return this.dataSource.transaction(async (m) => {
      // Existing proposal primary key doubles as a durable retry key. No new ledger/schema.
      await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `supplier-proposal:${requestId.toLowerCase()}`,
      ]);
      const [existing] = await m.query(
        `SELECT sp.*, spo.supplier_id, sf.key AS business_key
           FROM supply_proposals sp JOIN supplier_product_offers spo ON spo.id = sp.offer_id
           JOIN semi_franchises sf ON sf.id = sp.semi_franchise_id WHERE sp.id = $1::uuid`,
        [requestId],
      );
      if (existing) {
        const terms =
          input.terms === undefined
            ? existing.terms_snapshot
            : proposalTerms(input.terms, {});
        const sameTerms = [
          "version",
          "baseShippingFee",
          "freeShippingThreshold",
          "minOrderAmount",
        ].every(
          (key) =>
            existing.terms_snapshot?.[key] ===
            terms?.[key as keyof typeof terms],
        );
        if (
          existing.supplier_id !== supplierId ||
          existing.requested_by !== userId ||
          existing.offer_id !== input.offerId ||
          existing.business_key !== input.semiFranchiseKey ||
          existing.target_organization_id !==
            (input.targetOrganizationId || null) ||
          existing.unit_price !== unitPrice ||
          existing.note !== (input.note?.trim()?.slice(0, 1000) || null) ||
          !sameTerms
        ) {
          throw new NeturePharmacyError(
            409,
            "PROPOSAL_REQUEST_CONFLICT",
            "이미 사용한 요청입니다. 기존 접수 내용을 확인한 후 새 초안을 작성하세요.",
          );
        }
        return { id: existing.id, status: existing.status, reused: true };
      }
      const [offer] = await m.query(
        `SELECT spo.id, spo.approval_status, ns.base_shipping_fee, ns.free_shipping_threshold
         FROM supplier_product_offers spo JOIN neture_suppliers ns ON ns.id = spo.supplier_id
        WHERE spo.id = $1::uuid AND spo.supplier_id = $2::uuid AND spo.deleted_at IS NULL`,
        [input.offerId, supplierId],
      );
      if (!offer)
        throw new NeturePharmacyError(
          404,
          "OFFER_NOT_FOUND",
          "공급 제품을 찾을 수 없습니다.",
        );
      if (offer.approval_status !== "APPROVED") {
        // 제품 등록 승인과 공급 제안 승인은 다른 단계다 — 등록 승인이 먼저다.
        throw new NeturePharmacyError(
          409,
          "PRODUCT_NOT_APPROVED",
          "제품 등록 승인 후 공급 제안을 낼 수 있습니다.",
        );
      }
      const [sf] = await m.query(
        `SELECT id FROM semi_franchises WHERE key = $1 AND status = 'active' FOR SHARE`,
        [input.semiFranchiseKey],
      );
      if (!sf)
        throw new NeturePharmacyError(
          404,
          "SEMI_FRANCHISE_NOT_FOUND",
          "세미프랜차이즈를 찾을 수 없습니다.",
        );
      const target = input.targetOrganizationId || null;
      if (target) {
        const [pharmacy] = await m.query(
          `SELECT 1 FROM neture_pharmacy_memberships WHERE organization_id = $1::uuid`,
          [target],
        );
        if (!pharmacy)
          throw new NeturePharmacyError(
            400,
            "INVALID_TARGET",
            "대상 약국을 찾을 수 없습니다.",
          );
      }
      await assertTargetMembership(m, sf.id, target);
      const terms = proposalTerms(input.terms, {
        baseShippingFee: offer.base_shipping_fee,
        freeShippingThreshold: offer.free_shipping_threshold,
      });
      const [row] = await m.query(
        `INSERT INTO supply_proposals (id, offer_id, semi_franchise_id, target_organization_id, unit_price, note, status, requested_by, terms_snapshot)
       VALUES ($8::uuid, $1, $2, $3, $4, $5, 'pending', $6, $7::jsonb) RETURNING id, status`,
        [
          offer.id,
          sf.id,
          target,
          unitPrice,
          input.note?.trim()?.slice(0, 1000) || null,
          userId,
          JSON.stringify(terms),
          requestId,
        ],
      );
      return { ...row, reused: false };
    });
  }

  async supplierList(supplierId: string) {
    return this.dataSource.query(
      `${PROPOSAL_VIEW} WHERE spo.supplier_id = $1::uuid ORDER BY sp.created_at DESC`,
      [supplierId],
    );
  }

  async supplierEnd(supplierId: string, proposalId: string, userId: string) {
    const rows = rowsOf(
      await this.dataSource.query(
        `UPDATE supply_proposals sp SET status = 'ended', ended_at = NOW(), ended_by = $3::uuid, updated_at = NOW()
         FROM supplier_product_offers spo
        WHERE sp.id = $1::uuid AND spo.id = sp.offer_id AND spo.supplier_id = $2::uuid
          AND sp.status IN ('pending','approved')
      RETURNING sp.id, sp.status`,
        [proposalId, supplierId, userId],
      ),
    );
    if (!rows[0])
      throw new NeturePharmacyError(
        404,
        "PROPOSAL_NOT_FOUND",
        "종료할 수 있는 제안이 없습니다.",
      );
    return rows[0];
  }

  async operatorList(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== "all" ? status : null;
    return this.dataSource.query(
      `${PROPOSAL_VIEW} WHERE sp.semi_franchise_id = $1 AND ($2::text IS NULL OR sp.status = $2) ORDER BY sp.created_at DESC`,
      [sf.id, s],
    );
  }

  async operatorDecide(
    sf: SemiFranchiseRow,
    operatorId: string,
    proposalId: string,
    action: ProposalAction,
    reason?: string | null,
  ) {
    return this.dataSource.transaction(async (m) => {
      const [current] = await m.query(
        `SELECT sp.id, sp.status, sp.requested_by, sp.target_organization_id,
                spo.supplier_id, ns.organization_id AS supplier_organization_id
           FROM supply_proposals sp JOIN supplier_product_offers spo ON spo.id = sp.offer_id
           JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          WHERE sp.id = $1::uuid AND sp.semi_franchise_id = $2 FOR UPDATE OF sp`,
        [proposalId, sf.id],
      );
      // 다른 세미프랜차이즈의 제안은 처리할 수 없다(존재도 드러내지 않음).
      if (!current)
        throw new NeturePharmacyError(
          404,
          "PROPOSAL_NOT_FOUND",
          "제안을 찾을 수 없습니다.",
        );
      if (action === "approve") {
        const [active] = await m.query(`SELECT id FROM semi_franchises WHERE id=$1 AND status='active' FOR SHARE`, [sf.id]);
        if (!active) throw new NeturePharmacyError(409, 'BUSINESS_NOT_ACTIVE', '운영 중인 협업체에서만 공급을 승인할 수 있습니다.');
        await assertTargetMembership(m, sf.id, current.target_organization_id);
        // Use the canonical resolver, including its observable legacy fallback, rather than a second identity path.
        const supplier =
          current.requested_by === operatorId
            ? null
            : await resolveSupplierForUser(
                this.dataSource,
                operatorId,
                current.supplier_organization_id,
              );
        if (
          current.requested_by === operatorId ||
          (supplier?.kind === "resolved" &&
            supplier.supplierId === current.supplier_id)
        ) {
          throw new NeturePharmacyError(
            403,
            "SELF_APPROVAL_FORBIDDEN",
            "자신이 요청했거나 공급 업무를 담당하는 공급자의 제안은 승인할 수 없습니다.",
          );
        }
      }
      const next = nextProposalStatus(current.status, action);
      if (!next)
        throw new NeturePharmacyError(
          409,
          "INVALID_TRANSITION",
          `현재 상태(${current.status})에서 처리할 수 없습니다.`,
        );
      const [row] = rowsOf(
        await m.query(
          `UPDATE supply_proposals
            SET status = $2::text,
                decided_by = CASE WHEN $2::text = 'ended' THEN decided_by ELSE $3::uuid END,
                decided_at = CASE WHEN $2::text = 'ended' THEN decided_at ELSE NOW() END,
                reason = CASE WHEN $2::text = 'ended' THEN reason ELSE $4 END,
                ended_by = CASE WHEN $2::text = 'ended' THEN $3::uuid ELSE ended_by END,
                end_reason = CASE WHEN $2::text = 'ended' THEN $4 ELSE end_reason END,
                ended_at = CASE WHEN $2::text = 'ended' THEN NOW() ELSE ended_at END, updated_at = NOW()
          WHERE id = $1 RETURNING id, status`,
          [
            proposalId,
            next,
            operatorId,
            reason?.trim()?.slice(0, 1000) || null,
          ],
        ),
      );
      return row;
    });
  }
}
