/**
 * 이용 가능 판정 — 단일 SQL (DESIGN §4 SSOT)
 *
 * "이 약국 조직이 지금 이용 · 주문할 수 있는 공급 옵션" 을 4개 경로(default · proposal · event · recruitment)로
 * 한 번에 판정한다. 목록 · 검색 · 상세 · 장바구니 담기 · 주문 확정이 모두 이 CTE 를 쓴다 — 메뉴 숨김으로 대신하지 않는다.
 *
 * 과거 축(kpa-society membership · offer_service_approvals · distribution_type · allowed_seller_ids)은
 * 여기서 읽지 않는다(대체, 누적 아님).
 *
 * $1 = 약국 조직 id. 호출자가 매장 게이트(내 매장(약국) 신청 active)를 먼저 통과시켰어야 한다.
 */
import { DEFAULT_SEMI_FRANCHISE_KEY, SEMI_FRANCHISE_EVENT_SERVICE_KEY, type SupplyKind } from '../constants.js';
import { semiFranchiseAccessKeyFor } from '../../../common/auth/service-login-eligibility.policy.js';

type Exec = { query: (sql: string, params?: unknown[]) => Promise<any[]> };

export interface SupplyOption {
  kind: SupplyKind;
  /** default = SPO id · proposal = supply_proposals.id · event = OPL id · recruitment = seller_recruitments.id */
  optionId: string;
  offerId: string;
  masterId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  semiFranchiseKey: string;
  semiFranchiseName: string;
  paymentReceiverKey: string | null;
  unitPrice: number;
  targetOrganizationId: string | null;
  note: string | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perStoreLimit: number | null;
  perOrderLimit: number | null;
  trackInventory: boolean;
  availableStock: number | null;
  baseShippingFee: number | null;
  freeShippingThreshold: number | null;
}

const ACCESS_CTE = `
  my_sf AS (
    SELECT sf.id, sf.key, sf.name, sf.organization_id, sf.payment_receiver_key
      FROM semi_franchise_memberships sfm
      JOIN semi_franchises sf ON sf.id = sfm.semi_franchise_id AND sf.status = 'active'
     WHERE sfm.organization_id = $1 AND sfm.status = 'active'
  ),
  base AS (
    SELECT spo.id AS offer_id, spo.master_id, spo.supplier_id, spo.price_general, spo.service_keys,
           spo.track_inventory, spo.stock_quantity, spo.reserved_quantity,
           pm.name AS product_name, COALESCE(so.name, ns.slug) AS supplier_name,
           ns.base_shipping_fee, ns.free_shipping_threshold, ns.user_id AS supplier_user_id
      FROM supplier_product_offers spo
      JOIN product_masters pm ON pm.id = spo.master_id AND COALESCE(pm.status, 'ACTIVE') = 'ACTIVE'
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id AND ns.status = 'ACTIVE'
      LEFT JOIN organizations so ON so.id = ns.organization_id
     WHERE spo.is_active = true AND spo.deleted_at IS NULL AND spo.approval_status = 'APPROVED'
  ),
  options AS (
    -- (1) 공급처 미지정 승인 제품 = pharmacy 기본 공급만
    SELECT 'default'::text AS kind, b.offer_id AS option_id, b.*, sf.key AS sf_key, sf.name AS sf_name,
           sf.payment_receiver_key, b.price_general AS unit_price, NULL::uuid AS target_organization_id,
           NULL::text AS note, NULL::timestamp AS start_at, NULL::timestamp AS end_at,
           NULL::int AS total_quantity, NULL::int AS per_store_limit, NULL::int AS per_order_limit
      FROM base b JOIN my_sf sf ON sf.key = '${DEFAULT_SEMI_FRANCHISE_KEY}'
     WHERE cardinality(COALESCE(b.service_keys, '{}'::text[])) = 0
    UNION ALL
    -- (2) 명시적 공급 제안 — 대상 세미프랜차이즈 운영자 승인 ∧ 그 세미프랜차이즈 가입 ∧ (대상 약국이면 이 약국)
    SELECT 'proposal', sp.id, b.*, sf.key, sf.name, sf.payment_receiver_key, sp.unit_price,
           sp.target_organization_id, sp.note, NULL, NULL, NULL, NULL, NULL
      FROM supply_proposals sp
      JOIN base b ON b.offer_id = sp.offer_id
      JOIN my_sf sf ON sf.id = sp.semi_franchise_id
     WHERE sp.status = 'approved' AND (sp.target_organization_id IS NULL OR sp.target_organization_id = $1)
    UNION ALL
    -- (3) 세미프랜차이즈 이벤트 — 운영 조직 = 세미프랜차이즈, 담당 운영자 승인 · 기간 내
    SELECT 'event', opl.id, b.*, sf.key, sf.name, sf.payment_receiver_key, ROUND(opl.event_price)::int,
           NULL, NULL, opl.start_at, opl.end_at, opl.total_quantity, opl.per_store_limit, opl.per_order_limit
      FROM organization_product_listings opl
      JOIN base b ON b.offer_id = opl.offer_id
      JOIN my_sf sf ON sf.organization_id = opl.organization_id
     WHERE opl.service_key = '${SEMI_FRANCHISE_EVENT_SERVICE_KEY}' AND opl.source_type = 'event-offer'
       AND opl.status = 'approved' AND opl.is_active = true AND opl.event_price IS NOT NULL
       AND (opl.start_at IS NULL OR NOW() >= opl.start_at) AND (opl.end_at IS NULL OR NOW() <= opl.end_at)
    UNION ALL
    -- (4) 취급매장 모집 — 조건 승인 · 모집 중 · 이 약국 조직의 참여 승인
    SELECT 'recruitment', sr.id, b.*, sf.key, sf.name, sf.payment_receiver_key, sr.supply_unit_price,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL
      FROM seller_recruitments sr
      JOIN my_sf sf ON sf.id = sr.semi_franchise_id
      JOIN base b ON b.master_id::text = sr.product_id AND b.supplier_user_id::text = sr.seller_id
      JOIN seller_recruitment_applications sra
        ON sra.recruitment_id = sr.id AND sra.applicant_organization_id = $1 AND sra.status = 'approved'
     WHERE sr.exposure_status = 'approved' AND sr.status = 'recruiting' AND sr.supply_unit_price IS NOT NULL
  )`;

const SELECT_OPTION = `
  SELECT o.kind, o.option_id AS "optionId", o.offer_id AS "offerId", o.master_id AS "masterId",
         o.product_name AS "productName", o.supplier_id AS "supplierId", o.supplier_name AS "supplierName",
         o.sf_key AS "semiFranchiseKey", o.sf_name AS "semiFranchiseName", o.payment_receiver_key AS "paymentReceiverKey",
         o.unit_price AS "unitPrice", o.target_organization_id AS "targetOrganizationId", o.note,
         o.start_at AS "startAt", o.end_at AS "endAt", o.total_quantity AS "totalQuantity",
         o.per_store_limit AS "perStoreLimit", o.per_order_limit AS "perOrderLimit",
         o.track_inventory AS "trackInventory",
         CASE WHEN o.track_inventory THEN o.stock_quantity - o.reserved_quantity END AS "availableStock",
         o.base_shipping_fee AS "baseShippingFee", o.free_shipping_threshold AS "freeShippingThreshold"
    FROM options o`;

function normalize(row: any): SupplyOption {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...row,
    unitPrice: Number(row.unitPrice),
    totalQuantity: num(row.totalQuantity),
    perStoreLimit: num(row.perStoreLimit),
    perOrderLimit: num(row.perOrderLimit),
    availableStock: num(row.availableStock),
    baseShippingFee: num(row.baseShippingFee),
    freeShippingThreshold: num(row.freeShippingThreshold),
  };
}

export interface SupplyOptionFilter {
  /** all · default · proposal · event · recruitment · sf:<key> */
  source?: string;
  q?: string;
  page?: number;
  limit?: number;
}

/** 접근 집합을 먼저 만든 뒤 출처 탭 · 검색으로 거른다(DESIGN §4). */
export async function listSupplyOptions(
  exec: Exec,
  organizationId: string,
  filter: SupplyOptionFilter = {},
): Promise<{ items: SupplyOption[]; total: number }> {
  const source = (filter.source ?? 'all').trim();
  const kind = (['default', 'proposal', 'event', 'recruitment'] as const).find((k) => k === source) ?? null;
  const sfKey = source.startsWith('sf:') ? source.slice(3) : null;
  const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
  const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
  const offset = (Math.max(Number(filter.page) || 1, 1) - 1) * limit;
  const where = `WHERE ($2::text IS NULL OR o.kind = $2) AND ($3::text IS NULL OR o.sf_key = $3)
                   AND ($4::text IS NULL OR o.product_name ILIKE $4 OR o.supplier_name ILIKE $4)`;

  const rows = await exec.query(
    `WITH ${ACCESS_CTE} ${SELECT_OPTION} ${where}
      ORDER BY o.product_name, o.kind, o.unit_price, o.option_id
      LIMIT $5 OFFSET $6`,
    [organizationId, kind, sfKey, q, limit, offset],
  );
  const [{ count }] = await exec.query(
    `WITH ${ACCESS_CTE} SELECT count(*)::int AS count FROM options o ${where}`,
    [organizationId, kind, sfKey, q],
  );
  return { items: rows.map(normalize), total: count };
}

/** 단건 판정 — 상세 · 장바구니 담기 · 주문 확정. 이용할 수 없으면 null(존재를 드러내지 않는다). */
export async function getSupplyOption(
  exec: Exec,
  organizationId: string,
  kind: SupplyKind,
  optionId: string,
): Promise<SupplyOption | null> {
  const rows = await exec.query(
    `WITH ${ACCESS_CTE} ${SELECT_OPTION} WHERE o.kind = $2 AND o.option_id = $3::uuid LIMIT 1`,
    [organizationId, kind, optionId],
  );
  return rows[0] ? normalize(rows[0]) : null;
}

/** 이 약국 조직이 가입(active)한 세미프랜차이즈 key 집합 — 커뮤니티 · 화면 분기용. */
export async function listActiveSemiFranchiseKeys(exec: Exec, organizationId: string): Promise<string[]> {
  const rows = await exec.query(
    `SELECT sf.key
       FROM semi_franchise_memberships sfm
       JOIN semi_franchises sf ON sf.id = sfm.semi_franchise_id AND sf.status = 'active'
      WHERE sfm.organization_id = $1 AND sfm.status = 'active'
      ORDER BY sf.key`,
    [organizationId],
  );
  return rows.map((r: { key: string }) => r.key);
}

/**
 * 세미프랜차이즈 서비스 마운트(카탈로그 `semiFranchiseAccessKey` — 현재 kpa-society → 'pharmacy')에서
 * 이 약국 조직이 **공급 상품**을 이용 · 주문할 수 있는지 — CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 D1.
 *
 * 위 ACCESS_CTE 와 같은 규칙: 공급 경로는 모두 가입 세미프랜차이즈(`my_sf`)를 요구하고, 공급처 미지정 제품도
 * pharmacy 기본 공급이다 — distribution_type(PUBLIC 포함)으로 면제하지 않는다.
 * 공급 상품 항목에만 쓴다(약국 자체 제품 · 콘텐츠 · 신청 이력에는 쓰지 않는다).
 * 세미프랜차이즈 서비스가 아닌 마운트(k-cosmetics 등)는 판정 대상이 아니다(true).
 */
export async function hasServiceSemiFranchiseSupplyAccess(
  exec: Exec,
  serviceKey: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<boolean> {
  const semiFranchiseKey = semiFranchiseAccessKeyFor(serviceKey);
  if (!semiFranchiseKey) return true;
  if (!organizationId) return false;
  return (await listActiveSemiFranchiseKeys(exec, organizationId)).includes(semiFranchiseKey);
}
