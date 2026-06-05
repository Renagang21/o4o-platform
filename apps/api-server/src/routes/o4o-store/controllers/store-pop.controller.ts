/**
 * Store POP Controller
 *
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 * WO-STORE-POP-DIRECT-SOURCE-V1
 * WO-O4O-POP-TEMPLATE-WORKFLOW-V1:
 *   - POST /pharmacy/pop/generate body에 templateId + aiContent 추가
 *   - templateId / aiContent는 모든 popItems에 일괄 적용
 *   - aiContent 제공 시: 각 popItem의 title/description 오버라이드
 *
 * Library 콘텐츠 + QR 코드를 조합하여 POP PDF 자동 생성.
 * 공급자 공개 자료(supplierItemIds)를 StoreLibraryItem 복사 없이 직접 참조 지원.
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   POST /pharmacy/pop/generate       — POP PDF 생성
 *   GET  /pharmacy/pop/source/supplier-items — 공급자 공개 자료 조회
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, In } from 'typeorm';
import { StoreExecutionAsset } from '../../platform/entities/store-execution-asset.entity.js';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { NetureSupplierLibraryItem } from '../../../modules/neture/entities/NetureSupplierLibraryItem.entity.js';
// WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1: 콘텐츠/제작자료(직접 작성·스냅샷)를 POP 입력으로 확장.
//   origin 어휘(@o4o/types/production)와 1:1 매핑되는 테이블에서 organization 격리 조회.
import { KpaStoreContent } from '../../kpa/entities/kpa-store-content.entity.js';
import { AssetSnapshot } from '../../../modules/asset-snapshot/entities/asset-snapshot.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { generatePopPdf } from '../../../services/pop-generator.service.js';
import type { PopGenerateInput, PopAiContent } from '../../../services/pop-generator.service.js';
// WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1: 생성 POP PDF durable 저장(GCS)
import { MediaLibraryService } from '../../../modules/media/services/media-library.service.js';
// WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1: 원본→파생(pop_pdf) 관계 기록
import { recordDerivations } from '../services/store-asset-derivation.service.js';

type AuthMiddleware = RequestHandler;

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr';

// 이미지로 사용 가능한 MIME 타입
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/bmp',
]);

// POP 본문에 넣을 콘텐츠 텍스트 최대 길이(생성기 template 이 추가 truncate 수행).
const POP_BODY_MAX_LEN = 500;

/**
 * WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1
 * HTML/리치 텍스트를 POP 문구용 plain text 로 변환.
 * script/style 제거 → 태그 제거 → 기본 엔티티 디코드 → 공백 정리.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1
 * 콘텐츠 본문(content_json jsonb 또는 html 문자열)에서 POP 문구용 plain text 추출.
 * 다양한 저장 형태(html / body / blocks)를 안전하게 수용한다.
 */
function extractContentText(contentJson: unknown, maxLen = POP_BODY_MAX_LEN): string | null {
  if (!contentJson) return null;
  if (typeof contentJson === 'string') {
    const t = htmlToPlainText(contentJson);
    return t ? t.slice(0, maxLen) : null;
  }
  if (typeof contentJson !== 'object') return null;
  const obj = contentJson as Record<string, any>;

  // 1) html 필드 우선 (RichTextEditor 산출물의 기본 형태)
  if (typeof obj.html === 'string' && obj.html.trim()) {
    const t = htmlToPlainText(obj.html);
    if (t) return t.slice(0, maxLen);
  }
  // 2) 평문 본문 후보
  for (const k of ['body', 'text', 'content', 'description', 'summary']) {
    if (typeof obj[k] === 'string' && obj[k].trim()) {
      const t = htmlToPlainText(obj[k]);
      if (t) return t.slice(0, maxLen);
    }
  }
  // 3) 블록 에디터 형식 (blocks 배열)
  if (Array.isArray(obj.blocks)) {
    const parts: string[] = [];
    for (const b of obj.blocks) {
      if (!b || typeof b !== 'object') continue;
      const bb = b as Record<string, any>;
      const cand = bb.text ?? bb.content ?? bb.data?.text ?? bb.data?.html;
      if (typeof cand === 'string' && cand.trim()) parts.push(htmlToPlainText(cand));
    }
    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) return joined.slice(0, maxLen);
  }
  return null;
}

export function createStorePopController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1:
  //   serviceKey 지정 시 해당 서비스의 store_owner role 만 통과 (cross-service leakage 차단).
  //   미지정 시 기존 동작 유지 (back-compat).
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const libraryRepo = dataSource.getRepository(StoreExecutionAsset);
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const supplierLibraryRepo = dataSource.getRepository(NetureSupplierLibraryItem);
  // WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1: 콘텐츠/제작자료 source resolver 용 repo
  const directContentRepo = dataSource.getRepository(KpaStoreContent);
  const snapshotRepo = dataSource.getRepository(AssetSnapshot);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);

  // ─── GET /pharmacy/pop/source/supplier-items — 공급자 공개 자료 목록 ──
  router.get(
    '/pharmacy/pop/source/supplier-items',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await supplierLibraryRepo.find({
        where: { isPublic: true },
        order: { createdAt: 'DESC' },
        take: 100,
      });

      res.json({
        success: true,
        data: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          fileUrl: item.fileUrl,
          mimeType: item.mimeType,
          category: item.category,
          supplierId: item.supplierId,
        })),
      });
    }),
  );

  // ─── POST /pharmacy/pop/generate — POP PDF 생성 ──────────────
  router.post(
    '/pharmacy/pop/generate',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const {
        libraryItemIds, supplierItemIds, qrId, layout,
        // WO-O4O-POP-TEMPLATE-WORKFLOW-V1
        templateId,
        aiContent,
        // WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1: opt-in 저장
        save,
        title,
        // WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1: 콘텐츠/제작자료 입력 확장.
        //   origin 어휘와 1:1 매핑 — direct=kpa_store_contents / snapshot=o4o_asset_snapshots.
        //   (execution-asset 형 제작자료는 기존 libraryItemIds 로 자연 분기.)
        directContentItemIds,
        snapshotItemIds,
      } = req.body as {
        libraryItemIds?: string[];
        supplierItemIds?: string[];
        qrId?: string;
        layout?: string;
        templateId?: string;
        aiContent?: PopAiContent;
        save?: boolean;
        title?: string;
        directContentItemIds?: string[];
        snapshotItemIds?: string[];
      };

      const hasLibraryItems = Array.isArray(libraryItemIds) && libraryItemIds.length > 0;
      const hasSupplierItems = Array.isArray(supplierItemIds) && supplierItemIds.length > 0;
      const hasDirectContent = Array.isArray(directContentItemIds) && directContentItemIds.length > 0;
      const hasSnapshotItems = Array.isArray(snapshotItemIds) && snapshotItemIds.length > 0;

      // 최소 1개 소스 필요
      if (!hasLibraryItems && !hasSupplierItems && !hasDirectContent && !hasSnapshotItems) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'libraryItemIds / supplierItemIds / directContentItemIds / snapshotItemIds 중 하나 이상 필요합니다.',
          },
        });
        return;
      }

      // 총 아이템 수 제한
      const totalCount =
        (libraryItemIds?.length ?? 0) +
        (supplierItemIds?.length ?? 0) +
        (directContentItemIds?.length ?? 0) +
        (snapshotItemIds?.length ?? 0);
      if (totalCount > 8) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'POP 아이템은 최대 8개입니다.' },
        });
        return;
      }

      const validLayout = layout === 'A5' ? 'A5' : 'A4';
      const popItems: PopGenerateInput[] = [];

      // ── 매장 Library items 조회 (organizationId boundary) ────
      if (hasLibraryItems) {
        const libraryItems = await libraryRepo.find({
          where: { id: In(libraryItemIds), organizationId, isActive: true },
        });
        for (const item of libraryItems) {
          // WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1:
          //   생성형 콘텐츠 제작자료(assetType=content, html_content 보유, fileUrl 없음)도
          //   본문 텍스트를 POP 문구로 반영. 파일형 자산은 기존과 동일(description 우선).
          const description =
            item.description || extractContentText(item.htmlContent) || null;
          popItems.push({
            title: item.title,
            description,
            imageUrl: item.fileUrl || null,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
            // WO-O4O-POP-TEMPLATE-WORKFLOW-V1
            templateId: templateId || undefined,
            aiContent: aiContent || undefined,
          });
        }
      }

      // ── 직접 작성 콘텐츠 (origin=direct → kpa_store_contents) ──
      //   organization_id 격리 조회. content_json → POP 문구 plain text 추출.
      if (hasDirectContent) {
        const directItems = await directContentRepo.find({
          where: { id: In(directContentItemIds!), organization_id: organizationId },
        });
        for (const item of directItems) {
          popItems.push({
            title: item.title,
            description: extractContentText(item.content_json),
            imageUrl: null,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
            templateId: templateId || undefined,
            aiContent: aiContent || undefined,
          });
        }
      }

      // ── 가져온 콘텐츠 스냅샷 (origin=snapshot → o4o_asset_snapshots) ──
      //   organization_id 격리 조회. content_json → POP 문구 plain text 추출.
      if (hasSnapshotItems) {
        const snapshotItems = await snapshotRepo.find({
          where: { id: In(snapshotItemIds!), organizationId },
        });
        for (const item of snapshotItems) {
          popItems.push({
            title: item.title,
            description: extractContentText(item.contentJson),
            imageUrl: null,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
            templateId: templateId || undefined,
            aiContent: aiContent || undefined,
          });
        }
      }

      // ── 공급자 공개 자료 직접 참조 (is_public = true만 허용) ─
      if (hasSupplierItems) {
        const supplierItems = await supplierLibraryRepo.find({
          where: { id: In(supplierItemIds), isPublic: true },
        });
        for (const item of supplierItems) {
          // 이미지 MIME 타입만 imageUrl로 사용, 비이미지는 null (제목+설명만 표시)
          const imageUrl = IMAGE_MIME_TYPES.has(item.mimeType) ? item.fileUrl : null;
          popItems.push({
            title: item.title,
            description: item.description || null,
            imageUrl,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
            // WO-O4O-POP-TEMPLATE-WORKFLOW-V1
            templateId: templateId || undefined,
            aiContent: aiContent || undefined,
          });
        }
      }

      if (popItems.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'ITEMS_NOT_FOUND', message: '유효한 자료를 찾을 수 없습니다.' },
        });
        return;
      }

      // QR 코드 조회 (선택사항) — 모든 아이템에 동일 QR 적용
      let qrUrl: string | null = null;
      if (qrId) {
        const qr = await qrRepo.findOne({ where: { id: qrId, organizationId } });
        if (qr) {
          qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;
        }
      }
      if (qrUrl) {
        for (const item of popItems) {
          item.qrUrl = qrUrl;
          item.qrLabel = 'QR 스캔';
        }
      }

      const pdfBuffer = await generatePopPdf(popItems);

      // WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1:
      // opt-in 저장 — 생성 PDF 를 GCS durable 업로드 후 store_execution_assets
      // (file / generated / pop) 로 보관 → "매장 제작 자료" 에 자동 노출 + 재출력.
      // save 미지정 시 기존 blob 응답 유지(back-compat, 기존 호출 회귀 0).
      if (save) {
        const userId = (req as any).authContext?.userId || (req as any).user?.id;
        const assetTitle =
          typeof title === 'string' && title.trim()
            ? title.trim().slice(0, 300)
            : `${popItems[0]?.title ?? 'POP'} POP`;

        const mediaService = new MediaLibraryService(dataSource);
        const media = await mediaService.upload(
          {
            buffer: pdfBuffer,
            originalname: `${assetTitle}.pdf`,
            mimetype: 'application/pdf',
            size: pdfBuffer.length,
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
          fileSize: media.fileSize ?? pdfBuffer.length,
          mimeType: 'application/pdf',
          category: 'pop',
          assetType: 'file',
          usageType: 'pop',
          sourceType: 'generated',
          isActive: true,
        });
        await assetRepo.save(asset);

        // WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1:
        //   원본(직접작성/스냅샷/라이브러리) → 파생(pop_pdf) 관계 best-effort 기록.
        //   관계 기록 실패는 POP 생성/저장 응답을 막지 않는다(보조 트래킹).
        //   supplierItemIds 는 org-owned source 가 아니므로 제외.
        try {
          const derivationSources = [
            ...(directContentItemIds ?? []).map((id) => ({ kind: 'content_direct', id })),
            ...(snapshotItemIds ?? []).map((id) => ({ kind: 'content_snapshot', id })),
            ...(libraryItemIds ?? []).map((id) => ({ kind: 'store_execution_asset', id })),
          ];
          if (derivationSources.length > 0) {
            await recordDerivations(dataSource, {
              serviceKey: serviceKey ?? 'kpa',
              organizationId,
              createdBy: userId ?? null,
              derivedKind: 'pop_pdf',
              derivedId: asset.id,
              derivedTitle: asset.title,
              sources: derivationSources,
            });
          }
        } catch (derivationErr) {
          console.error('[store-pop] derivation record failed (non-blocking)', derivationErr);
        }

        res.json({
          success: true,
          data: { assetId: asset.id, fileUrl: media.url, title: asset.title },
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pop-print.pdf"');
      res.send(pdfBuffer);
    }),
  );

  return router;
}
