/**
 * 사이니지 영상 ↔ 제품 연결 HTTP — services/media-product-link.service.ts 의 범위 규칙을 그대로 쓴다.
 * 권한 guard 는 signage.routes.ts 가 건다(매장 = requireSignageStore · 운영자 = requireSignageOperator).
 */
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { extractScope } from './signage-helpers.js';
import { MediaProductLinkError, linkHqMediaProduct, linkStoreMediaProduct, listStoreMediaProducts } from '../services/media-product-link.service.js';

function handle(run: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await run(req) });
    } catch (error) {
      if (error instanceof MediaProductLinkError) {
        res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  };
}

export function createMediaProductLinkHandlers(dataSource: DataSource) {
  return {
    /** GET /media/product-links — 이 매장 영상들의 연결 제품(사본은 원본 연결을 따른다). */
    listStore: handle(req => listStoreMediaProducts(dataSource, extractScope(req))),
    /** PUT /media/:id/product { listingId: uuid | null } — 매장 취급 제품으로만 연결한다. */
    linkStore: handle(req => linkStoreMediaProduct(dataSource, extractScope(req), req.params.id, req.body?.listingId)),
    /** PUT /hq/media/:id/product { productMasterId: uuid | null } — 서비스 공용 영상. */
    linkHq: handle(req => linkHqMediaProduct(dataSource, extractScope(req).serviceKey, req.params.id, req.body?.productMasterId)),
  };
}
