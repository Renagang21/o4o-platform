import type { DataSource } from "typeorm";

/** Historical supplier-account binding wins over the legacy user-owner fallback. */
export async function listSupplierActiveFundings(
  db: DataSource,
  supplierId: string,
) {
  const rows = await db.query(
    `SELECT t.id,t.title,t.status,t."fundingEndAt",t."currentParticipants" FROM market_trials t
      WHERE t.status IN ('submitted','recruiting','development','outcome_confirming','fulfilled')
      AND (t."statusHistory" @> jsonb_build_array(jsonb_build_object('supplierAccountId',$1::text)) OR (NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(t."statusHistory",'[]'::jsonb)) e WHERE e ? 'supplierAccountId') AND t."supplierId" IN (
        SELECT s.user_id FROM neture_suppliers s WHERE s.id=$1::uuid UNION
        SELECT om.user_id FROM neture_suppliers s JOIN organization_members om ON om.organization_id=s.organization_id AND om.role='owner' AND om.left_at IS NULL WHERE s.id=$1::uuid)))
      ORDER BY t."createdAt" DESC LIMIT 101`,
    [supplierId],
  );
  return { items: rows.slice(0, 100), hasMore: rows.length > 100 };
}
