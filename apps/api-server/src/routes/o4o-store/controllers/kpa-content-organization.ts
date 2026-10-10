import type { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

/** Keep store selection separate from the legacy KPA member organization. */
export async function resolveKpaContentAccess(
  dataSource: DataSource,
  userId: string,
  preferredOrganizationId?: string | null,
) {
  const access = await isStoreOwner(dataSource, userId, 'kpa', preferredOrganizationId);
  if (access.resolution.status === 'ambiguous'
    || (preferredOrganizationId && access.organizationId !== preferredOrganizationId)) {
    return { ...access, isOwner: false, organizationId: null };
  }
  return access;
}

export async function resolveKpaContentOrganization(
  dataSource: DataSource,
  userId: string,
  preferredOrganizationId?: string | null,
): Promise<string | null> {
  const access = await resolveKpaContentAccess(dataSource, userId, preferredOrganizationId);
  if (access.organizationId) return access.organizationId;
  // Explicit or ambiguous store requests must never fall back to an association.
  if (preferredOrganizationId || access.resolution.status !== 'none') return null;
  const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}
