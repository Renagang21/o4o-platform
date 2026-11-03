import type { EntityManager } from "typeorm";
import type { ErasureTable } from "../../../services/privacy/account-business-data.js";
const SUPPLIER_PRIVATE_FIELDS = [
  "user_id",
  "contact_email",
  "contact_phone",
  "contact_kakao",
  "representative_name",
  "manager_name",
  "manager_phone",
  "tax_invoice_email",
  "settlement_bank_name",
  "settlement_account_number",
  "settlement_account_holder",
  "settlement_contact_name",
  "settlement_contact_email",
  "business_registration_document_id",
  "settlement_bankbook_document_id",
  "mail_order_sales_document_id",
] as const;
const supplierFiles = [
  "business_registration_document_id",
  "settlement_bankbook_document_id",
  "mail_order_sales_document_id",
];
// Same canonical relationship as supplier-context.resolver. No legacy user_id fallback,
// arbitrary LIMIT 1 supplier selection, or writer/uploader-based business ownership.
const OWNER = `EXISTS(SELECT 1 FROM organization_members om JOIN organizations org ON org.id=om.organization_id
 WHERE om.organization_id=s.organization_id AND om.user_id::text=$1 AND om.role='owner' AND om.left_at IS NULL AND org.type='supplier')`;
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
export async function ownedSupplierIds(
  db: Pick<EntityManager, "query">,
  userId: string,
): Promise<string[]> {
  return (
    await db.query(`SELECT s.id FROM neture_suppliers s WHERE ${OWNER}`, [
      userId,
    ])
  ).map((row: { id: string }) => row.id);
}
export function supplierErasureProjection(
  table: ErasureTable,
  alias = "r",
): string {
  const row = `to_jsonb(${alias})`;
  if (table.schema_name !== "public") return row;
  if (table.table_name === "organizations")
    return `(CASE WHEN EXISTS(SELECT 1 FROM neture_suppliers s WHERE s.organization_id=${alias}.id AND ${OWNER})
 THEN jsonb_set(${row},'{metadata,businessProfile}',COALESCE(${alias}.metadata->'businessProfile','{}'::jsonb)-'managerEmail') ELSE ${row} END)`;
  if (
    table.table_name !== "neture_suppliers" ||
    !table.columns.includes("organization_id")
  )
    return row;
  const fields = SUPPLIER_PRIVATE_FIELDS.filter((field) =>
    table.columns.includes(field),
  );
  return `(CASE WHEN ${OWNER.replaceAll("s.", alias + ".")} THEN ${row}-ARRAY[${fields.map((field) => `'${field}'`).join(",")}] ELSE ${row} END)`;
}
export async function reviewSupplierErasure(
  db: Pick<EntityManager, "query">,
  userId: string,
  tables: ErasureTable[],
) {
  const supplier = tables.find(
    (table) =>
      table.schema_name === "public" && table.table_name === "neture_suppliers",
  );
  if (!supplier?.columns.includes("organization_id")) return [];
  const coowners = await db.query(
    `SELECT 1 FROM neture_suppliers s WHERE ${OWNER} AND EXISTS(SELECT 1 FROM organization_members peer WHERE peer.organization_id=s.organization_id AND peer.user_id::text<>$1 AND peer.role='owner' AND peer.left_at IS NULL)`,
    [userId],
  );
  if (coowners.length) return ["SUPPLIER_OWNER_DISPOSITION_REVIEW_REQUIRED"];
  const conflictingLegacy=await db.query(`SELECT 1 FROM neture_suppliers s WHERE ${OWNER} AND s.user_id IS NOT NULL AND s.user_id::text<>$1`,[userId]);
  if(conflictingLegacy.length)return ["SUPPLIER_OWNER_DISPOSITION_REVIEW_REQUIRED"];
  const fields = supplierFiles.filter((field) =>
    supplier.columns.includes(field),
  );
  if (!fields.length) return [];
  const rows = await db.query(
    `SELECT 1 FROM neture_suppliers s CROSS JOIN LATERAL unnest(ARRAY[${fields.map((field) => `s.${q(field)}`).join(",")}]) ref(id)
 LEFT JOIN kyc_documents d ON d.id=ref.id WHERE ${OWNER} AND ref.id IS NOT NULL
 AND (d.id IS NULL OR (d.user_id IS NOT NULL AND d.user_id::text<>$1)) LIMIT 1`,
    [userId],
  );
  return rows.length ? ["SUPPLIER_PRIVATE_FILES_REVIEW_REQUIRED"] : [];
}
export async function detachSupplierAccount(
  db: Pick<EntityManager, "query">,
  userId: string,
  tables: ErasureTable[],
) {
  const table = tables.find(
    (table) =>
      table.schema_name === "public" && table.table_name === "neture_suppliers",
  );
  if (!table?.columns.includes("organization_id")) return;
  await db.query(
    `UPDATE organizations o SET metadata=jsonb_set(metadata,'{businessProfile}',(metadata->'businessProfile')-'managerEmail')
 WHERE jsonb_typeof(metadata->'businessProfile')='object' AND EXISTS(SELECT 1 FROM neture_suppliers s WHERE s.organization_id=o.id AND ${OWNER})`,
    [userId],
  );
  const fields = SUPPLIER_PRIVATE_FIELDS.filter((field) =>
    table.columns.includes(field),
  );
  await db.query(
    `UPDATE neture_suppliers s SET ${fields.map((field) => `${q(field)}=NULL`).join(",")},status='INACTIVE',updated_at=now() WHERE ${OWNER}`,
    [userId],
  );
}
/** Current canonical supplier ownership + document/resource proof; never just an uploader. */
export async function mayEraseSupplierProfileFile(
  db: Pick<EntityManager, "query">,
  userId: string,
  bucket: string,
  path: string,
  metadata: Record<string, unknown>,
) {
  if (
    metadata.o4o_resource_kind !== "supplier" ||
    metadata.o4o_asset_purpose !== "business" ||
    typeof metadata.o4o_resource_id !== "string" ||
    typeof metadata.o4o_document_id !== "string"
  )
    return false;
  const rows = await db.query(
    `SELECT d.id FROM kyc_documents d JOIN neture_suppliers s ON d.id IN(s.business_registration_document_id,s.settlement_bankbook_document_id,s.mail_order_sales_document_id)
 WHERE ${OWNER} AND (d.user_id IS NULL OR d.user_id::text=$1) AND s.id::text=$2 AND d.id::text=$3 AND d."fileUrl"=$4
 AND NOT EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text)
 AND NOT EXISTS(SELECT 1 FROM neture_supplier_regulated_categories c WHERE c.evidence_document_id=d.id)
 AND NOT EXISTS(SELECT 1 FROM neture_suppliers other WHERE other.id<>s.id AND d.id IN(other.business_registration_document_id,other.settlement_bankbook_document_id,other.mail_order_sales_document_id))`,
    [
      userId,
      metadata.o4o_resource_id,
      metadata.o4o_document_id,
      `gcs://${bucket}/${path}`,
    ],
  );
  if (rows.length) return true;
  if (
    !path.startsWith(`neture/suppliers/${metadata.o4o_resource_id}/kyc/`) ||
    !path.endsWith(`/${metadata.o4o_document_id}.pdf`)
  )
    return false;
  return (
    (
      await db.query(
        `SELECT 1 FROM neture_suppliers s WHERE ${OWNER} AND s.id::text=$2
 AND NOT EXISTS(SELECT 1 FROM kyc_documents WHERE "fileUrl"=$3)`,
        [userId, metadata.o4o_resource_id, `gcs://${bucket}/${path}`],
      )
    ).length > 0
  );
}
