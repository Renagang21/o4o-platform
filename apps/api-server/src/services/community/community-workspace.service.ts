import { hasCommunityServiceOperator } from './community-service-operator-access.js';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { getCommunityDefinition, listActiveCommunities } from '../../config/community-catalog.js';
import { resolveCommunityAccess, type CommunityAccessUser } from '../../utils/community-access.resolver.js';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { resolveSemiFranchiseBusinessAccess, resolveSemiFranchiseCommunityAccess } from '../../modules/neture-pharmacy/services/semi-franchise-community-access.js';

type Exec = { query: EntityManager['query'] };

export interface CommunityWorkspace {
  communityKey: string;
  name: string;
  kind: 'independent' | 'semi-franchise';
  /** Business identity for service-owned participant navigation; storage codes stay unchanged. */
  businessKey?: string;
  allowed: boolean;
  canManage: boolean;
  canJoin: boolean;
  membershipStatus: string | null;
  reason: string | null;
  forumStorageCodes: string[];
}

/** Existing pharmacist forums retain their ledger. New spaces use immutable UUIDs (varchar(50)). */
export async function resolveCommunityWorkspace(exec: Exec, user: CommunityAccessUser | null, key: string): Promise<CommunityWorkspace | null> {
  if (typeof key !== 'string' || !key) return null;
  const byBusinessKey = key.startsWith('business:');
  const [sf] = await exec.query(byBusinessKey
    ? 'SELECT id, key, name, status FROM semi_franchises WHERE key = $1'
    : 'SELECT id, key, name, status FROM semi_franchises WHERE community_key = $1', [byBusinessKey ? key.slice('business:'.length) : key]);
  if (byBusinessKey && !sf) return null;
  const eligible = !!user?.id && (await getNetureMainMembershipStatus(exec, user.id)) === 'active';
  if (sf) {
    const access = byBusinessKey
      ? await resolveSemiFranchiseBusinessAccess(exec, user?.id, sf.key)
      : await resolveSemiFranchiseCommunityAccess(exec, user?.id, key);
    const operators = eligible && sf.status === 'active' ? await exec.query(
      `SELECT 1 FROM semi_franchise_operators sfo
       JOIN role_assignments ra ON ra.user_id = sfo.user_id AND ra.is_active = true AND ra.role IN ('neture:operator','neture:admin')
       WHERE sfo.semi_franchise_id = $1 AND sfo.user_id = $2 AND sfo.revoked_at IS NULL`, [sf.id, user!.id],
    ) : [];
    return { communityKey: key, name: sf.name, kind: 'semi-franchise', businessKey: sf.key, allowed: access.allowed,
      canManage: operators.length > 0, canJoin: false, membershipStatus: access.allowed ? 'active' : null,
      reason: access.allowed ? null : user?.id ? 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED' : 'AUTH_REQUIRED',
      forumStorageCodes: [`sf:${sf.id}`] };
  }
  const [community] = await exec.query('SELECT id, name, status FROM communities WHERE slug = $1', [key]);
  const definition = getCommunityDefinition(key);
  if (!community && !definition) return null;
  const [membership] = community && user?.id ? await exec.query(
    'SELECT status, role FROM community_memberships WHERE community_id = $1 AND user_id = $2', [community.id, user.id],
  ) : [];
  const policyAllowed = !definition || resolveCommunityAccess(user, key).allowed;
  const serviceOperator = eligible && community?.status === 'active' && await hasCommunityServiceOperator(exec, user!.id);
  const allowed = serviceOperator || eligible && community?.status === 'active' && membership?.status === 'active' && policyAllowed;
  const [service] = allowed && ['admin', 'operator'].includes(membership?.role) ? await exec.query(
    "SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = 'community' AND status = 'active'", [user!.id],
  ) : [];
  return { communityKey: key, name: community?.name ?? definition!.name, kind: 'independent', allowed: !!allowed,
    canManage: !!serviceOperator || !!service, canJoin: !serviceOperator && eligible && community?.status === 'active' && policyAllowed && !['pending','active','suspended'].includes(membership?.status),
    membershipStatus: membership?.status ?? null,
    reason: allowed ? null : !user?.id ? 'AUTH_REQUIRED' : !eligible ? 'NETURE_MEMBERSHIP_REQUIRED' : 'COMMUNITY_MEMBERSHIP_REQUIRED',
    forumStorageCodes: definition ? [...definition.forumStorageCodes] : community ? [`community:${community.id}`] : [] };
}

export async function listCommunityWorkspaces(exec: Exec, user: CommunityAccessUser | null): Promise<CommunityWorkspace[]> {
  const rows = await exec.query("SELECT slug AS key FROM communities WHERE status = 'active' UNION SELECT COALESCE(NULLIF(community_key, ''), 'business:' || key) AS key FROM semi_franchises WHERE status = 'active'");
  const keys = new Set([...listActiveCommunities().map(c => c.key), ...rows.map(r => r.key)]);
  const result: CommunityWorkspace[] = [];
  for (const key of keys) {
    const workspace = await resolveCommunityWorkspace(exec, user, key);
    if (workspace && (workspace.kind === 'independent' || workspace.allowed)) result.push(workspace);
  }
  return result;
}

/** Board creation is an explicit action by this space's operator; it never grants membership. */
export async function createCommunityBoard(exec: Exec, workspace: CommunityWorkspace, userId: string, input: { name?: unknown; description?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!workspace.allowed || !workspace.canManage) throw new Error('COMMUNITY_OPERATOR_REQUIRED');
  if (!name || name.length > 100) throw new Error('INVALID_BOARD_NAME');
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : '';
  const [profile] = await exec.query('SELECT nickname, name FROM users WHERE id = $1', [userId]);
  const id = randomUUID();
  const [board] = await exec.query(
    `INSERT INTO forum_category_requests (id, name, description, forum_type, status, service_code, requester_id, requester_name, slug, metadata)
     VALUES ($1,$2,$3,'open','completed',$4,$5,$6,$7,$8::jsonb) RETURNING id, name, slug`,
    [id, name, description, workspace.forumStorageCodes[0], userId, profile?.nickname || profile?.name || '운영자',
      `community-${id}`, JSON.stringify({ communityKey: workspace.communityKey })],
  );
  return board;
}
