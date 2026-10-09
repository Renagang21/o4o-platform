import type { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { isRetiredPharmacyHubOrganization } from '../../../utils/store-organization.resolver.js';

/** Preserve current legacy relationships without reopening a PH-only Store workspace. */
export async function resolveLegacyKpaMemberOrganization(dataSource: DataSource, userId: string): Promise<string | null> {
  const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
  const organizationId = member?.organization_id;
  if (!organizationId || await isRetiredPharmacyHubOrganization(dataSource, organizationId)) return null;
  return organizationId;
}
