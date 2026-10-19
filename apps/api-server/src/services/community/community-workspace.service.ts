import { hasBusinessOperatorAccess } from '../../modules/neture-pharmacy/services/business-operator-access.js';
import { readCommunityServiceMembership } from './community-service-membership.js';
import { hasCommunityServiceOperator } from './community-service-operator-access.js';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { type CommunityAccessUser } from '../../utils/community-access.resolver.js';
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
  /** Independent community state; business/catalog adapters have no community row. */
  communityStatus: string | null;
  reason: string | null;
  forumStorageCodes: string[];
}

/** Existing pharmacist forums retain their ledger. New spaces use immutable UUIDs (varchar(50)). */
export async function resolveCommunityWorkspace(exec: Exec, user: CommunityAccessUser | null, key: string): Promise<CommunityWorkspace | null> {
  if (typeof key !== 'string' || !key) return null;
  if (key === 'community') {
    const member = user?.id ? await readCommunityServiceMembership(exec, user.id) : null;
    const allowed = member?.eligible === true && member.status === 'active';
    return { communityKey: 'community', name: '커뮤니티', kind: 'independent', allowed,
      canManage: allowed && await hasCommunityServiceOperator(exec, user!.id!),
      canJoin: member?.eligible === true && (!member.status || member.status === 'rejected'),
      membershipStatus: member?.status ?? null, communityStatus: 'active',
      reason: allowed ? null : !user?.id ? 'AUTH_REQUIRED' : !member?.eligible ? 'ACCOUNT_NOT_ACTIVE' : 'COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED',
      forumStorageCodes: ['community'] };
  }
  // Retired entities must not reappear through catalog fallback or existing DB rows.
  if (['pharmacy', 'cosmetics', 'o4o-general'].includes(key)) return null;
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
    const canManage = !!user?.id && sf.status === 'active' && (access.operator === true || (eligible && await hasBusinessOperatorAccess(exec, user.id, sf.id)));
    return { communityKey: key, name: sf.name, kind: 'semi-franchise', businessKey: sf.key, allowed: access.allowed,
      canManage, canJoin: false, membershipStatus: access.allowed ? 'active' : null, communityStatus: null,
      reason: access.allowed ? null : user?.id ? 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED' : 'AUTH_REQUIRED',
      forumStorageCodes: [`sf:${sf.id}`] };
  }
  return null;
}

export async function listCommunityWorkspaces(exec: Exec, user: CommunityAccessUser | null): Promise<CommunityWorkspace[]> {
  return [(await resolveCommunityWorkspace(exec, user, 'community'))!];
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
