import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../types/auth.js';
import type { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { readPreferredStoreOrganizationId } from '../../../utils/store-organization.resolver.js';
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

/** Preserve the controllers' existing missing-user response in one place. */
export function readContentUserId(req: Request, res: Response): string | null {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }
  return userId;
}

export async function requireContentOrganization(
  dataSource: DataSource,
  userId: string,
  req: Request,
  res: Response,
  code = 'NO_ORG',
  message = 'No organization membership',
): Promise<string | null> {
  const organizationId = await resolveKpaContentOrganization(dataSource, userId, readPreferredStoreOrganizationId(req));
  if (!organizationId) res.status(403).json({ success: false, error: { code, message } });
  return organizationId;
}

export function sendEmptyContentPage(res: Response): void {
  res.json({ success: true, data: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
}
