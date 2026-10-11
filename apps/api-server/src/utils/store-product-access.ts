import type { DataSource } from 'typeorm';
import { resolveStoreAccess } from './store-owner.utils.js';
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
