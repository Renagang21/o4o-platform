import type { EntityManager } from "typeorm";
/** Fixed ownership predicates. $1 is always the subject UUID; aliases are internal. */
export const PERSONAL_DERIVED: Readonly<Record<string, string>> = {
  // The parent case is private; only physically completed, minimized child receipts follow it.
  // Pending or non-minimized tasks remain visible to the ordinary residual review.
  store_closure_file_tasks:
    "r.case_id IN (SELECT id FROM store_owner_termination_cases WHERE user_id::text=$1 AND status IN ('purge_completed','cancelled')) AND r.state IN ('deleted','already_absent') AND r.object_path=''",
  lms_progress:
    'r."enrollmentId" IN (SELECT id FROM lms_enrollments WHERE "userId"::text=$1)',
  personal_mail_rules:
    "r.account_id IN (SELECT id FROM personal_mail_accounts WHERE user_id::text=$1)",
  personal_mail_messages:
    "r.account_id IN (SELECT id FROM personal_mail_accounts WHERE user_id::text=$1)",
  personal_mail_job_items:
    "r.job_id IN (SELECT id FROM personal_mail_jobs WHERE user_id::text=$1)",
  external_ai_credentials:
    "r.connection_id IN (SELECT id FROM external_ai_connections WHERE user_id::text=$1)",
  external_ai_requests:
    "r.connection_id IN (SELECT id FROM external_ai_connections WHERE user_id::text=$1)",
};
/** An approved business reference, rather than uploader identity, owns a document. */
export const BUSINESS_DOCUMENT = `(EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=r.id::text)

 OR EXISTS(SELECT 1 FROM neture_supplier_regulated_categories c WHERE c.evidence_document_id=r.id))`;
export function personalPredicate(
  table: string,
  fallback: string | undefined,
): string | undefined {
  if (PERSONAL_DERIVED[table]) return PERSONAL_DERIVED[table];
  if (table === "kyc_documents")
    return `r.user_id::text=$1 AND NOT ${BUSINESS_DOCUMENT}`;
  if (table === "assistant_tasks")
    return `r.requested_by_user_id::text=$1 AND r.ownership_scope='USER'`;
  return fallback;
}
export async function removePersonalDerived(
  db: Pick<EntityManager, "query">,
  userId: string,
) {
  // Explicit child-first removal also covers encrypted credentials and provider caches.
  for (const [table, predicate] of Object.entries(PERSONAL_DERIVED))
    await db.query(`DELETE FROM public.${table} r WHERE ${predicate}`, [
      userId,
    ]);
}
