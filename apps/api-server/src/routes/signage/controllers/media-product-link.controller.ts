/**
 * 사이니지 영상 ↔ 제품 연결 HTTP — services/media-product-link.service.ts 의 범위 규칙을 그대로 쓴다.
 * 권한 guard 는 signage.routes.ts 가 건다(매장 = requireSignageStore · 운영자 = requireSignageOperator).
 */
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { getSignageServiceKey } from '../../../middleware/signage-role.middleware.js';
import { MediaProductLinkError, linkHqMediaProduct, linkStoreMediaProduct, listStoreMediaProducts } from '../services/media-product-link.service.js';

/**
 * 매장 범위는 guard(requireSignageStore)가 권한을 확인한 매장(req.signageContext)만 쓴다.
 * 요청의 ?organizationId= · body 를 다시 읽지 않는다 — guard 는 X-Organization-Id 헤더를 먼저 보므로,
 * 다시 읽으면 헤더 = 내 매장 · query = 남의 매장으로 남의 영상을 읽고 바꿀 수 있다(PR #1058 Codex P1).
 */
function guardedStoreScope(req: Request): { serviceKey: string; organizationId: string } {
  const ctx = req.signageContext;
  if (!ctx || ctx.role !== 'store' || !ctx.organizationId) {
    throw new MediaProductLinkError('ORGANIZATION_REQUIRED', 403, '매장을 확인할 수 없습니다.');
  }
  return { serviceKey: ctx.serviceKey || getSignageServiceKey(req), organizationId: ctx.organizationId };
}

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
    listStore: handle(req => listStoreMediaProducts(dataSource, guardedStoreScope(req))),
    /** PUT /media/:id/product { listingId: uuid | null } — 매장 취급 제품으로만 연결한다. */
    linkStore: handle(req => linkStoreMediaProduct(dataSource, guardedStoreScope(req), req.params.id, req.body?.listingId)),
    /** PUT /hq/media/:id/product { productMasterId: uuid | null } — 서비스 공용 영상. 서비스는 route param 만(guard 와 같은 출처). */
    linkHq: handle(req => linkHqMediaProduct(dataSource, getSignageServiceKey(req), req.params.id, req.body?.productMasterId)),
  };
}
