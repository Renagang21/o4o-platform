/**
 * GlycoPharm Organization Resolution — Single Source of Truth
 *
 * WO-ORG-RESOLUTION-UNIFICATION-V1
 *
 * All GlycoPharm-scoped queries MUST use this function to resolve
 * the authenticated user's pharmacy (organization).
 *
 * Policy:
 * - Must be enrolled in glycopharm service
 * - Must be active organization
 * - Must be created by the authenticated user
 * - Returns single organization ID (owner model)
 *
 * Future: when multi-pharmacist support is needed,
 * change internal query to use organization_members table.
 * External callers remain unchanged.
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';

export async function resolveGlycopharmPharmacyId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const result = await dataSource.query(
    `SELECT o.id
     FROM organizations o
     JOIN organization_service_enrollments ose
       ON ose.organization_id = o.id
      AND ose.service_code = 'glycopharm'
     WHERE o.created_by_user_id = $1
       AND o."isActive" = true
     LIMIT 1`,
    [userId],
  );

  const pharmacyId = result?.length > 0 ? result[0].id : null;
  logger.info('[resolveGlycopharmPharmacyId] userId=%s → pharmacyId=%s', userId, pharmacyId);
  return pharmacyId;
}
