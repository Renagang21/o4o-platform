import { Request, Response } from 'express';
import { SupplierStatus } from '../../entities/index.js';
import { NetureService } from '../../neture.service.js';
export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};
export type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};
export function createSupplierLibraryAccess(
  netureService: Pick<NetureService, 'getSupplierByUserId'>,
) {
  async function requireActiveSupplier(
    req: Request,
    res: Response,
    next: () => void,
  ): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      return;
    }
    const supplier = await netureService.getSupplierByUserId(authReq.user.id);
    if (!supplier) {
      res
        .status(403)
        .json({
          success: false,
          error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' },
        });
      return;
    }
    if (supplier.status !== SupplierStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_ACTIVE',
          message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.`,
        },
      });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  }
  async function requireLinkedSupplier(
    req: Request,
    res: Response,
    next: () => void,
  ): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      return;
    }
    const supplier = await netureService.getSupplierByUserId(authReq.user.id);
    if (!supplier) {
      res
        .status(403)
        .json({
          success: false,
          error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' },
        });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  }
  return { requireActiveSupplier, requireLinkedSupplier };
}
