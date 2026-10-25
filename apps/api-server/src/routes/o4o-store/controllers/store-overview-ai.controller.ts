import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { AiExtensionError } from '@o4o/ai-core';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization } from '../../../utils/store-member-access.js';
import { explainStoreOverview } from '../../../services/ai-extensions/dashboard-overview.service.js';

/** Mounted behind the existing store workspace guard; all scope is server-derived. */
export function createStoreOverviewAiHandler(db: DataSource, serviceKey?: StoreOwnerServiceKey) {
  return async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Cache-Control', 'private, no-store');
    const actorId = req.user?.id, organizationId = req.organizationId;
    if (!actorId || !organizationId) { res.status(403).json({ success: false, errorCode: 'ACCESS_DENIED' }); return; }
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) {
      res.status(400).json({ success: false, code: 'INVALID_INPUT' }); return;
    }
    const authorize = async () => {
      if (await resolveApprovedStoreMemberOrganization(db, actorId, serviceKey, organizationId) === organizationId) return true;
      const owner = await isStoreOwner(db, actorId, serviceKey, organizationId);
      return owner.isOwner && owner.organizationId === organizationId;
    };
    try {
      const data = await explainStoreOverview(db, { actorId, organizationId, serviceId: serviceKey, authorize });
      res.json({ success: true, data });
    } catch (error) {
      const code = error instanceof AiExtensionError ? error.code : 'AI_UNAVAILABLE';
      const status = code === 'ACCESS_DENIED' ? 403 : code === 'QUOTA_EXCEEDED' ? 429 : 503;
      res.status(status).json({ success: false, code, errorCode: code });
    }
  };
}
