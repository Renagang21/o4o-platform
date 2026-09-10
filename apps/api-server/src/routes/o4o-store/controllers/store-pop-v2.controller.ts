/**
 * Store POP V2 Controller (공통 Core — 서비스별 본체 복제 없음)
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md §4-3
 *
 *          공통 POP V2 Core (이 파일)
 *                  ↑
 *          KPA adapter / PH adapter  — mount 만 다르다
 *
 * 기존 `store-pop.controller.ts` (POST /pharmacy/pop/generate) 는 건드리지 않는다.
 * 과거 산출물(store_execution_assets usage_type='pop') 도 그대로 둔다 — V2 는 append 만 한다.
 *
 * 경계: 모든 라우트가 requireAuth + requireStoreOwner 를 거치며
 *       organization_id 없이 조회하는 경로가 없다 (Boundary Guard Rule 1·3).
 */

import { Router, type Request, type Response, type RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { getService } from '../../../config/service-catalog.js';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { StoreExecutionAsset } from '../../platform/entities/store-execution-asset.entity.js';
import { MediaLibraryService } from '../../../modules/media/services/media-library.service.js';
import { recordDerivations } from '../services/store-asset-derivation.service.js';
import type { PopV2SourceOrigin } from '../entities/store-pop-document.entity.js';
import {
  PopV2ValidationError,
  createPopDocument,
  duplicatePopDocument,
  getPopDocument,
  listPopDocuments,
  markPopDocumentRendered,
  setPopDocumentArchived,
  updatePopDocument,
  type PopV2DocumentInput,
} from '../../../services/store/pop-v2-document.service.js';
import {
  listStoreContentSources,
  resolveContentPopSource,
  resolveProductPopSource,
} from '../../../services/store/pop-v2-source.service.js';
import { renderPopV2, type PopV2RenderModel } from '../../../services/store/pop-v2-renderer.service.js';

type AuthMiddleware = RequestHandler;

// 기존 store-pop.controller 와 동일 정책 — 도메인 출처는 service-catalog 단일 SSOT.
const POP_SERVICE_TO_CATALOG_KEY: Record<StoreOwnerServiceKey, string> = {
  kpa: 'kpa-society',
  cosmetics: 'k-cosmetics',
  'pharmacy-hub': 'pharmacy-hub',
  'cafe24-b2b': 'cafe24-b2b',
};

function storePublicOrigin(serviceKey?: StoreOwnerServiceKey): string {
  const catalogKey = serviceKey ? POP_SERVICE_TO_CATALOG_KEY[serviceKey] : 'kpa-society';
  const domain = getService(catalogKey)?.domain;
  return `https://${domain || 'kpa-society.co.kr'}`;
}

/**
 * V2 source origin → 기존 provenance 어휘(STORE_ASSET_SOURCE_KINDS).
 * 화이트리스트에 없는 origin(spd / listing / store_pop)은 기록하지 않는다 —
 * 공통 카탈로그에 신규 어휘를 추가하는 것은 공유 계약 변경이므로 이번 범위 밖이다.
 */
const DERIVATION_SOURCE_KIND: Partial<Record<PopV2SourceOrigin, string>> = {
  direct: 'content_direct',
  snapshot: 'content_snapshot',
  library: 'store_execution_asset',
  local: 'store_local_product',
};

function toDocumentInput(body: any): PopV2DocumentInput {
  return {
    title: String(body?.title ?? ''),
    popKind: body?.popKind,
    contentType: body?.contentType ?? null,
    sources: Array.isArray(body?.sources) ? body.sources : [],
    fields: body?.fields ?? {},
    templateId: String(body?.templateId ?? ''),
    layout: body?.layout,
    qrCodeId: body?.qrCodeId ?? null,
    status: body?.status,
  };
}

function sendValidationError(res: Response, err: unknown): boolean {
  if (err instanceof PopV2ValidationError) {
    res.status(400).json({ success: false, error: err.message, code: err.code });
    return true;
  }
  return false;
}

export function createStorePopV2Controller(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const requireStoreOwner = createRequireStoreOwner(dataSource, serviceKey);
  const guards = [requireAuth, requireStoreOwner];

  const orgOf = (req: Request): string => (req as any).organizationId;
  const userOf = (req: Request): string | null =>
    (req as any).authContext?.userId || (req as any).user?.id || null;

  // ── 소스 조회 ─────────────────────────────────────────────────────────────
  //   원본 원장을 **읽기만** 한다 (I2 원본 불변).

  /** 상품 기반 POP 의 기본 콘텐츠 결정 — product-linked content → STORE canonical → 상품 기본정보 */
  router.get(
    '/sources/product/:productId',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const sourceType = req.query.sourceType === 'local' ? 'local' : 'listing';
      const resolved = await resolveProductPopSource(
        dataSource,
        orgOf(req),
        sourceType,
        req.params.productId,
      );
      if (!resolved) {
        res.status(404).json({
          success: false,
          error: 'POP 으로 만들 수 있는 상품 콘텐츠를 찾지 못했습니다.',
          code: 'POP_PRODUCT_SOURCE_NOT_FOUND',
        });
        return;
      }
      res.json({ success: true, data: resolved });
    }),
  );

  /** 일반 "내 매장 콘텐츠" 후보 목록 */
  router.get(
    '/sources/contents',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = orgOf(req);
      const items = await listStoreContentSources(dataSource, organizationId, {
        // Store Ops 축에서 매장 조직 id 가 곧 store id 다 (Boundary Policy §7).
        storeId: organizationId,
        limit: Number(req.query.limit) || 100,
      });
      res.json({ success: true, data: items });
    }),
  );

  /** 선택한 콘텐츠 1건을 POP 필드 초안으로 변환 */
  router.get(
    '/sources/content/:origin/:id',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = orgOf(req);
      const resolved = await resolveContentPopSource(
        dataSource,
        organizationId,
        req.params.origin as PopV2SourceOrigin,
        req.params.id,
        organizationId,
      );
      if (!resolved) {
        res.status(404).json({
          success: false,
          error: '콘텐츠를 찾지 못했습니다.',
          code: 'POP_CONTENT_SOURCE_NOT_FOUND',
        });
        return;
      }
      res.json({ success: true, data: resolved });
    }),
  );

  // ── POP Document CRUD ────────────────────────────────────────────────────

  router.get(
    '/',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const status = req.query.status as any;
      const docs = await listPopDocuments(dataSource, orgOf(req), {
        status,
        limit: Number(req.query.limit) || 100,
      });
      res.json({ success: true, data: docs });
    }),
  );

  router.post(
    '/',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const doc = await createPopDocument(dataSource, {
          organizationId: orgOf(req),
          serviceKey: serviceKey ?? 'kpa',
          createdBy: userOf(req),
          input: toDocumentInput(req.body),
        });
        res.status(201).json({ success: true, data: doc });
      } catch (err) {
        if (!sendValidationError(res, err)) throw err;
      }
    }),
  );

  router.get(
    '/:id',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const doc = await getPopDocument(dataSource, orgOf(req), req.params.id);
      if (!doc) {
        res.status(404).json({ success: false, error: 'POP 을 찾지 못했습니다.', code: 'POP_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: doc });
    }),
  );

  router.put(
    '/:id',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const doc = await updatePopDocument(
          dataSource,
          orgOf(req),
          req.params.id,
          toDocumentInput(req.body),
        );
        if (!doc) {
          res.status(404).json({ success: false, error: 'POP 을 찾지 못했습니다.', code: 'POP_NOT_FOUND' });
          return;
        }
        res.json({ success: true, data: doc });
      } catch (err) {
        if (!sendValidationError(res, err)) throw err;
      }
    }),
  );

  router.post(
    '/:id/duplicate',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const doc = await duplicatePopDocument(dataSource, orgOf(req), req.params.id, userOf(req));
      if (!doc) {
        res.status(404).json({ success: false, error: 'POP 을 찾지 못했습니다.', code: 'POP_NOT_FOUND' });
        return;
      }
      res.status(201).json({ success: true, data: doc });
    }),
  );

  /** 보관 / 복원 — 삭제가 아니다. */
  router.patch(
    '/:id/archive',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const archived = req.body?.archived !== false;
      const doc = await setPopDocumentArchived(dataSource, orgOf(req), req.params.id, archived);
      if (!doc) {
        res.status(404).json({ success: false, error: 'POP 을 찾지 못했습니다.', code: 'POP_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: doc });
    }),
  );

  // ── 출력 (PDF / PNG) ─────────────────────────────────────────────────────

  router.post(
    '/:id/render',
    ...guards,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = orgOf(req);
      const doc = await getPopDocument(dataSource, organizationId, req.params.id);
      if (!doc) {
        res.status(404).json({ success: false, error: 'POP 을 찾지 못했습니다.', code: 'POP_NOT_FOUND' });
        return;
      }

      const format = req.body?.format === 'png' ? 'png' : 'pdf';

      // QR 선택 삽입 — 지면에 QR 을 넣는 것일 뿐 매장 배치(Placement)와 동일시하지 않는다.
      let qrUrl: string | null = null;
      if (doc.qrCodeId) {
        const qr = await dataSource
          .getRepository(StoreQrCode)
          .findOne({ where: { id: doc.qrCodeId, organizationId } });
        if (qr?.slug) qrUrl = `${storePublicOrigin(serviceKey)}/qr/${qr.slug}`;
      }

      const model: PopV2RenderModel = {
        title: doc.fields?.title || doc.title,
        bullets: doc.fields?.bullets ?? [],
        shortText: doc.fields?.shortText ?? '',
        longText: doc.fields?.longText ?? '',
        imageUrl: doc.fields?.imageUrl ?? null,
        qrUrl,
        qrLabel: qrUrl ? 'QR 스캔' : null,
        layout: doc.layout,
        templateId: doc.templateId,
      };

      const { buffer, mimeType, extension } = await renderPopV2(model, format);

      // I3 Output-Append-Only — 산출물은 기존 원장에 append 한다. 덮어쓰지 않는다.
      const assetTitle = `${doc.title}`.slice(0, 300);
      const userId = userOf(req);
      const media = await new MediaLibraryService(dataSource).upload(
        {
          buffer,
          originalname: `${assetTitle}.${extension}`,
          mimetype: mimeType,
          size: buffer.length,
        },
        userId,
        serviceKey,
        'pop',
      );

      const assetRepo = dataSource.getRepository(StoreExecutionAsset);
      const asset = assetRepo.create({
        organizationId,
        title: assetTitle,
        description: 'POP 제작 결과',
        fileUrl: media.url,
        fileName: media.fileName,
        fileSize: media.fileSize ?? buffer.length,
        mimeType,
        category: 'pop',
        assetType: 'file',
        usageType: 'pop',
        sourceType: 'generated',
        isActive: true,
      });
      await assetRepo.save(asset);

      await markPopDocumentRendered(dataSource, organizationId, doc.id, asset.id);

      // provenance 기록 실패는 출력 응답을 막지 않는다(보조 트래킹).
      try {
        const sources = (doc.sources ?? [])
          .map((s) => ({ kind: DERIVATION_SOURCE_KIND[s.origin] as string, id: s.id, title: s.title ?? null }))
          .filter((s) => !!s.kind);
        if (sources.length > 0) {
          await recordDerivations(dataSource, {
            serviceKey: serviceKey ?? 'kpa',
            organizationId,
            createdBy: userId,
            derivedKind: 'pop_pdf',
            derivedId: asset.id,
            derivedTitle: asset.title,
            sources,
          });
        }
      } catch (derivationErr) {
        console.error('[store-pop-v2] derivation record failed (non-blocking)', derivationErr);
      }

      res.json({
        success: true,
        data: {
          format,
          fileUrl: media.url,
          fileName: media.fileName,
          assetId: asset.id,
        },
      });
    }),
  );

  return router;
}
