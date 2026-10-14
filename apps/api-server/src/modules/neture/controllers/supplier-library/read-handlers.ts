import { Request, Response } from 'express';
import { NetureLibraryService } from '../../services/neture-library.service.js';
import logger from '../../../../utils/logger.js';
import { mapNetureVisibility } from '@o4o/types';
import { listSupplierContentHandoffTargets } from '../../constants/supplier-content-handoff-targets.js';
import type { SupplierRequest } from './access.js';
export function createSupplierLibraryReadHandlers(
  libraryService: Pick<
    NetureLibraryService,
    'listPublic' | 'listBySupplier' | 'getByIdForSupplier'
  >,
) {
  return {
    listPublic: async (req: Request, res: Response) => {
      try {
        const { category, page, limit } = req.query;
        const result = await libraryService.listPublic({
          category: typeof category === 'string' ? category : undefined,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        });
        // ContentMeta (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1: DB 값 우선)
        if (result.success) {
          result.data.items = result.data.items.map((item: any) => ({
            ...item,
            producer: 'supplier' as const,
            producerRef: item.supplierId,
            visibility: item.visibility ?? mapNetureVisibility(item.isPublic ?? true),
            serviceKey: 'neture' as const,
            contentType: item.contentType ?? 'media',
            metaStatus: 'published' as const,
          }));
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture Library API] Error listing public items:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to list public library items' },
          });
      }
    },
    listOwn: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { category, page, limit } = req.query;
        const result = await libraryService.listBySupplier(supplierId, {
          category: typeof category === 'string' ? category : undefined,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        });
        // ContentMeta (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1: DB 값 우선)
        if (result.success) {
          result.data.items = result.data.items.map((item: any) => ({
            ...item,
            producer: 'supplier' as const,
            producerRef: item.supplierId,
            visibility: item.visibility ?? mapNetureVisibility(item.isPublic ?? false),
            serviceKey: 'neture' as const,
            contentType: item.contentType ?? 'media',
            metaStatus:
              (item.visibility ?? mapNetureVisibility(item.isPublic ?? false)) === 'service'
                ? ('published' as const)
                : ('draft' as const),
          }));
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture Library API] Error listing supplier items:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to list library items' },
          });
      }
    },
    targets: async (_req: Request, res: Response) => {
      res.json({
        success: true,
        data: listSupplierContentHandoffTargets().map(({ key, name, nameKo }) => ({
          key,
          name,
          nameKo,
        })),
      });
    },
    getOwn: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const item = await libraryService.getByIdForSupplier(req.params.id, supplierId);
        if (!item) {
          res
            .status(404)
            .json({
              success: false,
              error: { code: 'ITEM_NOT_FOUND', message: 'Library item not found' },
            });
          return;
        }
        // 목록(GET /library)과 동일한 ContentMeta 파생 (WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1)
        const data = {
          ...item,
          producer: 'supplier' as const,
          producerRef: (item as any).supplierId,
          visibility:
            (item as any).visibility ?? mapNetureVisibility((item as any).isPublic ?? false),
          serviceKey: 'neture' as const,
          contentType: (item as any).contentType ?? 'media',
          metaStatus: (((item as any).visibility ??
            mapNetureVisibility((item as any).isPublic ?? false)) === 'service'
            ? 'published'
            : 'draft') as 'published' | 'draft',
        };
        res.json({ success: true, data });
      } catch (error) {
        logger.error('[Neture Library API] Error fetching library item:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch library item' },
          });
      }
    },
  };
}
