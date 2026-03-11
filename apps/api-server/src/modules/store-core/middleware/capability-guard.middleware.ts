/**
 * Store Capability Guard Middleware
 * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
 *
 * Extension 기능 접근 전 매장의 Capability 활성 여부를 확인한다.
 * 비활성이면 403 STORE_CAPABILITY_DISABLED 반환.
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { StoreCapabilityService } from '../services/store-capability.service.js';
import type { StoreCapabilityKey } from '../constants/store-capabilities.js';

/**
 * Capability guard factory
 *
 * @param dataSource - TypeORM DataSource
 * @param capability - 확인할 Capability key
 * @param getOrgId  - request에서 organizationId를 추출하는 함수 (기본: req.params.storeId || req.organizationId)
 */
export function requireStoreCapability(
  dataSource: DataSource,
  capability: StoreCapabilityKey,
  getOrgId?: (req: Request) => string | undefined,
) {
  let svc: StoreCapabilityService | null = null;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!svc) {
        svc = new StoreCapabilityService(dataSource);
      }

      const organizationId = getOrgId
        ? getOrgId(req)
        : (req.params.storeId || (req as any).organizationId);

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID required',
          code: 'MISSING_ORGANIZATION_ID',
        });
        return;
      }

      const enabled = await svc.isEnabled(organizationId, capability);

      if (!enabled) {
        res.status(403).json({
          success: false,
          error: `Store capability '${capability}' is not enabled`,
          code: 'STORE_CAPABILITY_DISABLED',
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`[CapabilityGuard] Error checking ${capability}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify store capability',
      });
    }
  };
}
