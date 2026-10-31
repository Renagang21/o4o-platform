import type { DataSource } from 'typeorm';
import { resolveStoreAccess, isStoreOwner, storeOwnerRejection } from './store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization, findApprovedStoreMemberCandidates } from './store-member-access.js';
import type { StoreOwnerServiceKey } from './store-organization.resolver.js';

/** Product requests must not use another store when an explicit selection is ignored. */
export async function resolveStoreProductAccess(
  dataSource: DataSource,
  userId: string,
  userRoles: string[],
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<string | null> {
  const organizationId = await resolveStoreAccess(
    dataSource, userId, userRoles, serviceKey, preferredOrganizationId,
  );
  if (preferredOrganizationId && organizationId !== preferredOrganizationId) return null;
  return organizationId;
}

/** Keep the rejection reason: a denied owner must not look like an empty inventory. */
export async function resolveStoreProductAccessResult(
  dataSource: DataSource, userId: string, serviceKey?: StoreOwnerServiceKey, preferred?: string | null,
) {
  const owner = await isStoreOwner(dataSource, userId, serviceKey, preferred);
  if (owner.isOwner && owner.organizationId && (!preferred || owner.organizationId === preferred))
    return { organizationId: owner.organizationId, rejection: null };
  const candidates = await findApprovedStoreMemberCandidates(dataSource, userId, serviceKey);
  const member = preferred ? candidates.find(item => item.organizationId === preferred)?.organizationId
    : candidates.length === 1 ? candidates[0].organizationId : null;
  if (member) return { organizationId: member, rejection: null };
  const rejection = storeOwnerRejection(owner);
  if (rejection && rejection.body.code !== 'STORE_OWNER_REQUIRED') return { organizationId: null, rejection };
  if (!preferred && candidates.length > 1) return { organizationId: null, rejection: {
    status: 409, body: { success: false, code: 'AMBIGUOUS_STORE_CONNECTION', error: '연결된 매장이 여러 개입니다. 이용할 매장을 선택해 주세요.' },
  } };
  return { organizationId: null, rejection: { status: 403, body: { success: false,
    code: preferred ? 'STORE_SELECTION_ACCESS_REQUIRED' : 'STORE_CONNECTION_REQUIRED',
    error: preferred ? '선택한 매장의 소속·승인·접근 권한을 확인한 뒤 다시 선택해 주세요.'
      : '이용 가능한 매장 연결과 소속·승인 상태를 My Home에서 확인해 주세요.',
  } } };
}
