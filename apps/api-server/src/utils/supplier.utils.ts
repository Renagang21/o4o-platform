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

/**
 * neture_suppliers 기반 supplier 연결 확인
 */
export async function resolveSupplier(
  dataSource: DataSource,
  userId: string
): Promise<{ isSupplier: boolean; supplierId: string | null }> {
  const rows = await dataSource.query(
    `SELECT id FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    return { isSupplier: true, supplierId: rows[0].id };
  }
  return { isSupplier: false, supplierId: null };
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
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const { isSupplier, supplierId } = await resolveSupplier(dataSource, user.id);
    if (isSupplier && supplierId) {
      (req as any).supplierId = supplierId;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'SUPPLIER_REQUIRED',
        message: 'Supplier access required',
      },
    });
  };
}
