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
import logger from './logger.js';
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

    let resolved: Awaited<ReturnType<typeof resolveSupplier>>;
    try {
      resolved = await resolveSupplier(dataSource, user.id, readOrganizationContext(req));
    } catch (err) {
      // Express 4 는 async middleware reject 를 잡지 않는다 — 응답 없이 멈추거나 운영 인스턴스 종료로 이어진다.
      // 일시 오류를 '공급자 아님(403)'으로 바꾸지 않고 503 으로 알린다.
      logger.error('[SupplierUtils] requireSupplier supplier context lookup failed', { error: (err as Error)?.message });
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: '공급자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.',
          code: 'SUPPLIER_CONTEXT_UNAVAILABLE',
        });
      }
      return;
    }
    const { isSupplier, supplierId } = resolved;
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
