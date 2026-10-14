import { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { NetureService } from '../../neture.service.js';
import {
  SupplierProductImageService,
  isSupplierOwnedImage,
  type ProductImageRow,
} from '../../services/supplier-product-image.service.js';
import { SupplierStatus } from '../../entities/index.js';
export type AuthenticatedRequest = Request & { user?: { id: string; role: string } };
export type SupplierRequest = Request & { supplierId: string };
export const NOT_OWNED = {
  success: false,
  error: 'MASTER_NOT_OWNED',
  message: '이 상품에 대한 권한이 없습니다.',
};
export const IMAGE_NOT_OWNED = {
  success: false,
  error: 'IMAGE_NOT_OWNED',
  message: '내가 등록한 이미지만 수정·삭제할 수 있습니다.',
};
export const CANNOT_REPLACE_PRIMARY = {
  success: false,
  error: 'SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY',
  message: '다른 출처의 대표 이미지는 공급자가 교체할 수 없습니다.',
};
export function createSupplierImageAccess(
  dataSource: DataSource,
  netureService: Pick<NetureService, 'getSupplierByUserId'>,
  imageService: Pick<SupplierProductImageService, 'getImage'>,
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
        currentStatus: supplier.status,
      });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  }
  async function ownsMaster(supplierId: string, masterId: string): Promise<boolean> {
    if (!masterId) return false;
    const rows = await dataSource.query(
      `SELECT 1 FROM supplier_product_offers
        WHERE supplier_id = $1 AND master_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [supplierId, masterId],
    );
    return rows.length > 0;
  }
  async function resolveOwnedImage(
    req: AuthenticatedRequest,
    res: Response,
    imageId: string,
    masterId: string,
  ): Promise<ProductImageRow | null> {
    if (!masterId) {
      res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
      return null;
    }
    if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
      res.status(403).json(NOT_OWNED);
      return null;
    }
    const image = await imageService.getImage(imageId);
    // 요청 body 의 masterId 와 실제 이미지의 master 가 다르면 거부(경로 스푸핑 방지)
    if (!image || image.master_id !== masterId) {
      res.status(403).json(NOT_OWNED);
      return null;
    }
    if (!isSupplierOwnedImage(image, req.user!.id)) {
      // 다른 출처(운영자 · 승격 · 다른 공급자 · source=NULL)는 공급자가 관리하지 않는다.
      res.status(403).json(IMAGE_NOT_OWNED);
      return null;
    }
    return image;
  }
  return { requireActiveSupplier, ownsMaster, resolveOwnedImage };
}
