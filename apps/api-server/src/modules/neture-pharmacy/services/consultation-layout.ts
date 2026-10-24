import type { DataSource } from "typeorm";
import { NeturePharmacyError } from "../constants.js";

export type ConsultationLayout = "standard" | "large";
function layout(value: unknown): ConsultationLayout {
  if (value === undefined || value === null) return "standard";
  if (value === "standard" || value === "large") return value;
  throw new NeturePharmacyError(
    503,
    "CONSULTATION_LAYOUT_UNAVAILABLE",
    "상담 화면 구성을 확인하지 못했습니다.",
  );
}

export class ConsultationLayoutService {
  constructor(private readonly db: Pick<DataSource, "query">) {}
  async read(organizationId: string) {
    const [row] = await this.db.query(
      `SELECT o.id, o.name, o.metadata->>'consultationLayout' AS layout
      FROM organizations o JOIN neture_pharmacy_memberships m ON m.organization_id=o.id
      WHERE o.id=$1 AND m.status='active'`,
      [organizationId],
    );
    if (!row)
      throw new NeturePharmacyError(
        404,
        "PHARMACY_NOT_FOUND",
        "약국을 확인하지 못했습니다.",
      );
    return {
      organizationId: row.id,
      name: row.name,
      operatingType: layout(row.layout),
    };
  }
  async list(query: Record<string, unknown>) {
    const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
    const page = Number(query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000)
      throw new NeturePharmacyError(
        400,
        "INVALID_PAGE",
        "페이지를 확인해 주세요.",
      );
    const params = [q ? `%${q}%` : null, 20, (page - 1) * 20];
    const items = await this.db.query(
      `SELECT o.id, m.pharmacy_name AS name, o.metadata->>'consultationLayout' AS layout
      FROM organizations o JOIN neture_pharmacy_memberships m ON m.organization_id=o.id
      WHERE m.status='active' AND ($1::text IS NULL OR m.pharmacy_name ILIKE $1)
      ORDER BY m.pharmacy_name, o.id LIMIT $2 OFFSET $3`,
      params,
    );
    const [count] = await this.db.query(
      `SELECT count(*)::int AS total FROM neture_pharmacy_memberships
      WHERE status='active' AND ($1::text IS NULL OR pharmacy_name ILIKE $1)`,
      [params[0]],
    );
    return {
      items: items.map((r: { id: string; name: string; layout: unknown }) => ({
        organizationId: r.id,
        name: r.name,
        operatingType: layout(r.layout),
      })),
      total: count.total,
      page,
    };
  }
  async save(organizationId: string, value: unknown) {
    if (!["large", "standard"].includes(String(value)))
      throw new NeturePharmacyError(
        400,
        "INVALID_LAYOUT",
        "화면 구성을 선택해 주세요.",
      );
    const [row] = await this.db.query(
      `WITH updated AS (UPDATE organizations o SET metadata=jsonb_set(COALESCE(o.metadata,'{}'::jsonb),'{consultationLayout}',to_jsonb($2::text))
      WHERE o.id=$1 AND EXISTS(SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id=o.id AND m.status='active') RETURNING o.id) SELECT id FROM updated`,
      [organizationId, value],
    );
    if (!row)
      throw new NeturePharmacyError(
        404,
        "PHARMACY_NOT_FOUND",
        "약국을 확인하지 못했습니다.",
      );
    return this.read(organizationId);
  }
}
