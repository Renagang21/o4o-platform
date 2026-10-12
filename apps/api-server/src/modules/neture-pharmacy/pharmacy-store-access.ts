import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { createRequireStoreWorkspaceAccess } from '../../utils/store-workspace-access.js';
import { requireNetureMainMembership } from '../../middleware/neture-main-membership.middleware.js';

/** Staff act for an approved pharmacy; personal Neture membership remains an owner prerequisite. */
export function createPharmacyStoreAccess(dataSource: DataSource): RequestHandler {
  const workspace = createRequireStoreWorkspaceAccess(dataSource, 'kpa');
  const mainAccess = requireNetureMainMembership(dataSource);
  return (req, res, next) => workspace(req, res, error => {
    if (error) return next(error);
    if (req.authContext?.memberRole === 'staff') return next();
    return mainAccess(req, res, next);
  });
}
