import type { EntityManager } from 'typeorm';

type Db = Pick<EntityManager, 'query'>;
export type ErasureTable = { schema_name: string; table_name: string; columns: string[] };
const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';

// Business records stay with the business. Only typed account links and the
// departing supplier's contact/payment profile are removed, never product rows.
const SUPPLIER_PRIVATE_FIELDS = [
  'user_id', 'contact_email', 'contact_phone', 'contact_kakao', 'representative_name',
  'manager_name', 'manager_phone', 'tax_invoice_email', 'settlement_bank_name',
  'settlement_account_number', 'settlement_account_holder', 'settlement_contact_name',
  'settlement_contact_email',
] as const;
const supplierFiles = ['business_registration_document_id', 'settlement_bankbook_document_id', 'mail_order_sales_document_id'];

/** Scan the post-cleanup view. Unclassified text/JSON/files remain visible. */
export function businessErasureProjection(table: ErasureTable, alias = 'r'): string {
  const row = `to_jsonb(${alias})`;
  if (table.schema_name !== 'public') return row;
  if (table.table_name === 'organizations' && table.columns.includes('created_by_user_id')) {
    return `${row} - 'created_by_user_id'`;
  }
  if (table.table_name === 'store_owner_termination_cases') return `${row} - 'requested_by'`;
  if (table.table_name !== 'neture_suppliers' || !table.columns.includes('user_id')) return row;
  const fields = SUPPLIER_PRIVATE_FIELDS.filter(field => table.columns.includes(field));
  return `(CASE WHEN ${alias}.user_id::text=$1 THEN ${row} - ARRAY[${fields.map(field => `'${field}'`).join(',')}] ELSE ${row} END)`;
}

export async function businessErasureReviews(db: Db, userId: string, tables: ErasureTable[]): Promise<string[]> {
  const has = (name: string) => tables.some(table => table.schema_name === 'public' && table.table_name === name);
  const codes: string[] = [];
  const closurePending = has('store_owner_termination_cases')
    ? `(o."isActive"=true OR NOT EXISTS(SELECT 1 FROM store_owner_termination_cases c
        WHERE c.organization_id=o.id AND c.user_id=$1 AND c.status='purge_completed'))`
    : 'true';
  // A former owner is not an owner after a sale. An employee's authorship of
  // business documents never makes the employee the owner of those documents.
  if (has('organizations') && has('organization_members')) {
    const rows = await db.query(`SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id
      WHERE om.user_id=$1 AND om.role IN ('owner','admin','manager') AND om.left_at IS NULL AND o.type='store' AND ${closurePending} LIMIT 1`, [userId]);
    if (rows.length) codes.push('PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED');
  }
  if (has('neture_pharmacy_memberships')) {
    const rows = await db.query(`SELECT 1 FROM neture_pharmacy_memberships p JOIN organizations o ON o.id=p.organization_id
      WHERE p.applicant_user_id=$1 AND p.status IN ('active','suspended','terminated') AND ${closurePending} LIMIT 1`, [userId]);
    if (rows.length && !codes.includes('PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED')) codes.push('PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED');
  }
  if (has('store_owner_termination_cases')) {
    const rows=await db.query(`SELECT 1 FROM store_owner_termination_cases WHERE user_id=$1 AND status NOT IN ('purge_completed','cancelled') LIMIT 1`,[userId]);
    if(rows.length)codes.push('PHARMACY_CLOSURE_INCOMPLETE');
  }
  const supplier = tables.find(table => table.schema_name === 'public' && table.table_name === 'neture_suppliers');
  const fields = supplierFiles.filter(field => supplier?.columns.includes(field));
  if (fields.length) {
    const rows = await db.query(`SELECT 1 FROM neture_suppliers WHERE user_id=$1 AND (${fields.map(field => `${quote(field)} IS NOT NULL`).join(' OR ')}) LIMIT 1`, [userId]);
    if (rows.length) codes.push('SUPPLIER_PRIVATE_FILES_REVIEW_REQUIRED');
  }
  return codes;
}

/** Must run inside the final account-erasure transaction, after business reviews. */
export async function removeBusinessAccountLinks(db: Db, userId: string, tables: ErasureTable[]) {
  for (const table of tables.filter(table => table.schema_name === 'public')) {
    if (table.table_name === 'organizations' && table.columns.includes('created_by_user_id')) {
      await db.query('UPDATE organizations SET created_by_user_id=NULL WHERE created_by_user_id=$1', [userId]);
    }
    if (table.table_name === 'store_owner_termination_cases') await db.query('UPDATE store_owner_termination_cases SET requested_by=NULL WHERE requested_by=$1',[userId]);
    if (table.table_name === 'neture_suppliers' && table.columns.includes('user_id')) {
      const fields = SUPPLIER_PRIVATE_FIELDS.filter(field => table.columns.includes(field));
      // Detach before DELETE users: the legacy FK otherwise cascades the supplier
      // itself, which must remain the identity of its products and transactions.
      await db.query(`UPDATE neture_suppliers SET ${fields.map(field => `${quote(field)}=NULL`).join(',')}, status='INACTIVE',updated_at=now() WHERE user_id=$1`, [userId]);
    }
  }
}
