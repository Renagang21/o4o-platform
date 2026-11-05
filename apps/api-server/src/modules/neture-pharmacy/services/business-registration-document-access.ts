import type { EntityManager } from 'typeorm';

/** Personal uploads become business-owned evidence once attached to a canonical business. */
export async function canReadBusinessRegistrationDocument(
  db: Pick<EntityManager, 'query'>,
  userId: string,
  id: string,
): Promise<boolean> {
  const rows = await db.query(
    `SELECT d.id FROM kyc_documents d WHERE d.id=$2 AND d."documentType"='business_registration'
    AND ((d.user_id=$1
      AND NOT EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text)
      AND NOT EXISTS(SELECT 1 FROM neture_suppliers ns WHERE ns.business_registration_document_id=d.id))
    OR EXISTS(SELECT 1 FROM organizations o JOIN organization_members m ON m.organization_id=o.id
      WHERE m.user_id=$1 AND m.role='owner' AND m.left_at IS NULL
      AND (o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text
        OR EXISTS(SELECT 1 FROM neture_suppliers ns WHERE ns.organization_id=o.id AND ns.business_registration_document_id=d.id))))`,
    [userId, id],
  );
  return rows.length > 0;
}
