/**
 * Supplier Utilities
 *
 * WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1
 *
 * neture_suppliers 기반 supplier identity middleware.
 * Pattern: store-owner.utils.ts → createRequireStoreOwner
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import {
  resolveSupplierIdForUser,
  readOrganizationContext,
} from '../modules/neture/middleware/supplier-context.resolver.js';

/**
 * supplier 연결 확인
 * WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1:
 *   `neture_suppliers.user_id LIMIT 1` → canonical resolver(organization_members owner) 재사용.
 */
export async function resolveSupplier(
  dataSource: DataSource,
  userId: string,
  requestedOrganizationId: string | null = null,
): Promise<{ isSupplier: boolean; supplierId: string | null }> {
  const resolved = await resolveSupplierIdForUser(dataSource, userId, requestedOrganizationId);
  return resolved
    ? { isSupplier: true, supplierId: resolved.supplierId }
    : { isSupplier: false, supplierId: null };
}

/**
 * Middleware factory: require linked supplier
 * req.supplierId 주입
 */
export function createRequireSupplier(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { isSupplier, supplierId } = await resolveSupplier(dataSource, user.id, readOrganizationContext(req));
    if (isSupplier && supplierId) {
      (req as any).supplierId = supplierId;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Supplier access required',
      code: 'SUPPLIER_REQUIRED',
    });
  };
}
