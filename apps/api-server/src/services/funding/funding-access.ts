import type { EntityManager, DataSource } from 'typeorm';
import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { resolveSupplierForUser } from '../../modules/neture/middleware/supplier-context.resolver.js';
import { fundingForumSlug, fundingOwnerContext, fundingWasApproved } from './funding-review.js';

export async function hasFundingOperator(exec: Pick<EntityManager, 'query'>, userId: string): Promise<boolean> {
  const platform = await exec.query(`SELECT 1 FROM role_assignments ra JOIN users u ON u.id = ra.user_id
    WHERE ra.user_id = $1 AND ra.role = 'platform:super_admin' AND ra.is_active = true AND u.status IN ('active', 'approved') AND u."isActive" = true AND u."isEmailVerified" = true
      AND ra.valid_from <= CURRENT_TIMESTAMP AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP) LIMIT 1`, [userId]);
  if (platform.length) return true;
  if (await getNetureMainMembershipStatus(exec, userId) !== 'active') return false;
  const rows = await exec.query(
    `SELECT 1 FROM role_assignments ra JOIN service_memberships sm ON sm.user_id = ra.user_id
       AND sm.service_key = 'funding' AND sm.status = 'active'
     WHERE ra.user_id = $1 AND ra.is_active = true AND ra.valid_from <= CURRENT_TIMESTAMP
       AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)
       AND ra.role IN ('funding:admin', 'funding:operator') LIMIT 1`, [userId]);
  return rows.length > 0;
}

export async function isFundingCreator(ds: DataSource, trial: MarketTrial, userId: string): Promise<boolean> {
  if (trial.supplierId !== userId || await getNetureMainMembershipStatus(ds, userId) !== 'active') return false;
  const origin = fundingOwnerContext(trial);
  const resolved = await resolveSupplierForUser(ds, userId, origin?.supplierOrganizationId ?? null);
  // Historical records belong to the recorded creator user, with no organization binding.
  // Verify eligibility without choosing or assigning an arbitrary supplier organization.
  if (!origin && resolved.kind === 'context_required') return resolved.candidates.some(c => c.status === 'ACTIVE');
  return resolved.kind === 'resolved' && resolved.status === 'ACTIVE' &&
    (!origin?.supplierAccountId || resolved.supplierId === origin.supplierAccountId);
}

/** Trial scope is resolved from the server ledger, never from body/query roles. */
export async function resolveFundingAccess(ds: DataSource, trialId: string, userId?: string) {
  const trial = await ds.getRepository(MarketTrial).findOne({ where: { id: trialId } });
  if (!trial || !userId) return null;
  const operator = await hasFundingOperator(ds, userId);
  if (!operator && await getNetureMainMembershipStatus(ds, userId) !== 'active') return null;
  const creator = await isFundingCreator(ds, trial, userId);
  const participant = (await ds.query(`SELECT id FROM market_trial_participants WHERE "marketTrialId" = $1 AND "participantId" = $2 LIMIT 1`, [trialId, userId])).length > 0;
  const [forum] = await ds.query(`SELECT id, slug FROM forum_category_requests WHERE slug = $1 AND service_code = $2 AND status = 'completed' LIMIT 1`, [fundingForumSlug(trialId), `funding:${trialId}`]);
  const member = forum && (await ds.query(`SELECT 1 FROM forum_category_members WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`, [forum.id, userId])).length > 0;
  const launched = fundingWasApproved(trial) && trial.status !== TrialStatus.DRAFT && trial.status !== TrialStatus.SUBMITTED;
  return { trial, forum: forum ?? null, creator, operator, participant, member: !!member,
    canManage: creator, canModerate: creator || operator, canRead: launched && (creator || operator || (participant && member)),
    canWrite: launched && trial.status !== TrialStatus.CLOSED && (creator || operator || (participant && member)) };
}
