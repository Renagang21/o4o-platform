import type { DataSource } from "typeorm";
import { NeturePharmacyError } from "../constants.js";
export const DEMAND_REASONS = [
  "not-found",
  "not-carried",
  "pharmacist-help",
] as const;
type Executor = Pick<DataSource, "query">;
export class StoreStaffSupportService {
  constructor(private readonly db: Executor) {}
  async products(org: string, search: unknown) {
    const q = typeof search === "string" ? search.trim().slice(0, 80) : "";
    if (!q) return [];
    return this.db.query(
      `WITH products AS (
      SELECT id,'local'::text AS kind,name FROM store_local_products WHERE organization_id=$1 AND is_active=true
      UNION ALL SELECT l.id,'listing'::text AS kind,m.name AS name FROM organization_product_listings l JOIN product_masters m ON m.id=l.master_id WHERE l.organization_id=$1 AND l.is_active=true
    ) SELECT p.*, COALESCE(o.metadata#>>ARRAY['staffSupport','locations',p.kind||':'||p.id::text],'') AS location,
      (SELECT g.public_key FROM store_multilingual_product_content_groups g
        WHERE g.organization_id=$1 AND g.target_kind=p.kind AND g.target_id=p.id
          AND g.status<>'archived' AND g.public_key IS NOT NULL
          AND EXISTS (SELECT 1 FROM store_multilingual_product_content_pages page WHERE page.group_id=g.id AND page.status='published')
        ORDER BY g.updated_at DESC LIMIT 1) AS "publicKey"
      FROM products p JOIN organizations o ON o.id=$1 WHERE p.name ILIKE $2 ORDER BY p.name,p.kind,p.id LIMIT 50`,
      [org, `%${q}%`],
    );
  }
  async location(
    org: string,
    input: { kind?: unknown; id?: unknown; location?: unknown },
  ) {
    if (
      !["local", "listing"].includes(String(input.kind)) ||
      typeof input.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.id,
      ) ||
      typeof input.location !== "string" ||
      input.location.trim().length > 100
    ) {
      throw new NeturePharmacyError(
        400,
        "INVALID_LOCATION",
        "상품과 진열 위치를 확인해 주세요(100자 이하).",
      );
    }
    const table =
      input.kind === "local"
        ? "store_local_products"
        : "organization_product_listings";
    const found = await this.db.query(
      `SELECT id FROM ${table} WHERE id=$1 AND organization_id=$2 AND is_active=true`,
      [input.id, org],
    );
    if (!found.length)
      throw new NeturePharmacyError(
        404,
        "PRODUCT_NOT_FOUND",
        "내 매장 상품을 찾을 수 없습니다.",
      );
    await this.db.query(
      `UPDATE organizations SET metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('staffSupport',
      COALESCE(metadata->'staffSupport','{}'::jsonb)||jsonb_build_object('locations',
      COALESCE(metadata#>'{staffSupport,locations}','{}'::jsonb)||jsonb_build_object($2::text,$3::text))) WHERE id=$1`,
      [org, `${input.kind}:${input.id}`, input.location.trim()],
    );
    return { saved: true };
  }
  async guides(org: string) {
    return this.db.query(
      `SELECT c.id,c.title,c.summary,c.body,sf.name AS "businessName" FROM semi_franchise_contents c
      JOIN semi_franchises sf ON sf.id=c.semi_franchise_id
      JOIN semi_franchise_memberships m ON m.semi_franchise_id=sf.id AND m.organization_id=$1 AND m.status='active'
      WHERE sf.status='active' AND c.status='published' AND c.tags @> '["staff-quick-guide"]'::jsonb
      ORDER BY c.updated_at DESC LIMIT 30`,
      [org],
    );
  }
  async demand(org: string, reason: unknown) {
    if (!DEMAND_REASONS.includes(reason as (typeof DEMAND_REASONS)[number]))
      throw new NeturePharmacyError(
        400,
        "INVALID_DEMAND_REASON",
        "기록할 항목을 선택해 주세요.",
      );
    // One atomic row update: concurrent staff clicks cannot overwrite each other's counts.
    await this.db.query(
      `UPDATE organizations SET metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('staffSupport',
      COALESCE(metadata->'staffSupport','{}'::jsonb)||jsonb_build_object('demandCounts',
      COALESCE(metadata#>'{staffSupport,demandCounts}','{}'::jsonb)||jsonb_build_object(to_char(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM'),
      COALESCE(metadata#>ARRAY['staffSupport','demandCounts',to_char(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM')],'{}'::jsonb)||
      jsonb_build_object($2::text,COALESCE((metadata#>>ARRAY['staffSupport','demandCounts',to_char(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM'),$2::text])::int,0)+1)))) WHERE id=$1`,
      [org, reason],
    );
    return { recorded: true };
  }
  async summary(month: unknown) {
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new NeturePharmacyError(
        400,
        "INVALID_MONTH",
        "조회 월을 확인해 주세요.",
      );
    return this.db.query(
      `SELECT o.id,o.name, o.metadata#>ARRAY['staffSupport','demandCounts',$1] AS counts
      FROM organizations o JOIN neture_pharmacy_memberships p ON p.organization_id=o.id
      WHERE o.metadata#>ARRAY['staffSupport','demandCounts',$1] IS NOT NULL ORDER BY o.name,o.id LIMIT 500`,
      [month],
    );
  }
}
