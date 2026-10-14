import type { DataSource } from 'typeorm';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization } from '../../../utils/store-member-access.js';

/** Operational slug adapters: approved staff or the owner of this exact store. */
export async function kpaStoreOwnerOwnsStore(dataSource: DataSource, userId: string, storeId: string): Promise<boolean> {
  if ((await resolveApprovedStoreMemberOrganization(dataSource, userId, 'kpa', storeId)) === storeId) return true;
  const owner = await isStoreOwner(dataSource, userId, 'kpa', storeId);
  return owner.isOwner && owner.organizationId === storeId;
}
