import type { DataSource } from 'typeorm';
import { resolveStoreAccess, isStoreOwner, storeOwnerRejection } from './store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization } from './store-member-access.js';
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
  const member = await resolveApprovedStoreMemberOrganization(dataSource, userId, serviceKey, preferred);
  if (member) return { organizationId: member, rejection: null };
  return { organizationId: null, rejection: storeOwnerRejection(owner) ?? {
    status: 403, body: { success: false, code: 'STORE_ACCESS_REQUIRED', error: '선택한 매장의 접근 권한을 확인해 주세요.' },
  } };
}
