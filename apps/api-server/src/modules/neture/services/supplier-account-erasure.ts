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

const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
export function supplierErasureProjection(
  table: ErasureTable,
  alias = "r",
): string {
  const row = `to_jsonb(${alias})`;
  if (
    table.table_name !== "neture_suppliers" ||
    !table.columns.includes("user_id")
  )
    return row;
  const fields = SUPPLIER_PRIVATE_FIELDS.filter((field) =>
    table.columns.includes(field),
  );
  return `(CASE WHEN ${alias}.user_id::text=$1 THEN ${row} - ARRAY[${fields.map((field) => `'${field}'`).join(",")}] ELSE ${row} END)`;
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
  const fields = supplierFiles.filter((field) =>
    supplier?.columns.includes(field),
  );
  if (!fields.length) return [];
  // Supplier onboarding proofs are profile data. Product/other-business proofs
  // keep their explicit native references; never erase another person's document.
  const rows = await db.query(
    `SELECT 1 FROM neture_suppliers s CROSS JOIN LATERAL unnest(ARRAY[${fields.map((field) => `s.${quote(field)}`).join(",")}]) ref(id)
 LEFT JOIN kyc_documents d ON d.id=ref.id WHERE s.user_id=$1 AND ref.id IS NOT NULL
 AND (d.id IS NULL OR (d.user_id IS NOT NULL AND d.user_id<>$1)) LIMIT 1`,
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
  if (!table?.columns.includes("user_id")) return;
  const fields = SUPPLIER_PRIVATE_FIELDS.filter((field) =>
    table.columns.includes(field),
  );
  await db.query(
    `UPDATE neture_suppliers SET ${fields.map((field) => `${quote(field)}=NULL`).join(",")},status='INACTIVE',updated_at=now() WHERE user_id=$1`,
    [userId],
  );
}

/** Storage ownership proof is tied to the current domain link, not merely an uploader. */
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
    `SELECT d.id FROM kyc_documents d JOIN neture_suppliers s ON s.user_id=d.user_id
 WHERE s.user_id=$1 AND s.id::text=$2 AND d.id::text=$3 AND d."fileUrl"=$4
 AND d.id IN (s.business_registration_document_id,s.settlement_bankbook_document_id,s.mail_order_sales_document_id)
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
  // A failed DB save may leave only the tagged object. Its exact producer prefix
  // and current supplier ownership still prove scope; any surviving DB reference
  // is checked separately by the orchestrator before the generation is deleted.
  if (
    !path.startsWith(`neture/suppliers/${metadata.o4o_resource_id}/kyc/`) ||
    !path.endsWith(`/${metadata.o4o_document_id}.pdf`)
  )
    return false;
  const orphan = await db.query(
    `SELECT 1 FROM neture_suppliers s WHERE s.user_id=$1 AND s.id::text=$2
   AND NOT EXISTS(SELECT 1 FROM kyc_documents WHERE "fileUrl"=$3)`,
    [userId, metadata.o4o_resource_id, `gcs://${bucket}/${path}`],
  );
  return orphan.length > 0;
}
