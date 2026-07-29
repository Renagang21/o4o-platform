/**
 * Store Public Tablet Handler — Tablet products + interest requests
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request endpoints
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1: GET /:slug/tablet/idle 추가
 *
 * Endpoints:
 *   GET  /:slug/tablet/products      — Tablet channel products (supplier + local)
 *   POST /:slug/tablet/interest      — Interest request creation (rate-limited)
 *   GET  /:slug/tablet/interest/:id  — Interest request status (kiosk polling)
 *   GET  /:slug/tablet/idle          — Idle playlist items (store 단위 설정)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { TabletInterestRequest, InterestRequestStatus } from '../entities/tablet-interest-request.entity.js';
import { ProductMaster } from '../../../modules/neture/entities/ProductMaster.entity.js';
import { notificationService } from '../../../services/NotificationService.js';
import {
  resolvePublicStore,
  queryTabletVisibleProducts,
  tabletRequestLimiter,
  sanitizePublishableTranslations,
  resolveTabletDisplaySource,
  resolveServiceKeys,
} from './store-public-utils.js';
// WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
//   idle handler(GET /:slug/tablet/idle)는 여전히 resolveTabletIdleItems 를 직접 사용.
import { resolveTabletIdleItems } from './store-public-tablet-idle-resolve.js';
// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1:
//   /tablet/screen 의 blocks→sections 는 공용 resolveScreenSetSections 로 통일(QR landing 과 동일 소스).
//   기존의 resolveTemplateKey/shapeStaticBlock/resolveContentListItems 직접 호출은 resolver 내부로 이동.
import { resolveScreenSetSections } from './store-public-screen-set-resolve.js';
// WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: content_list 원본 조회 기본 Store Adapter 명시 주입.
import { createStoreContentSourceAdapter } from './store-public-tablet-content-source.js';

export function createStorePublicTabletRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  // GET /:slug/tablet/products — TABLET channel products (supplier + local)
  // WO-STORE-LOCAL-PRODUCT-DISPLAY-V1: local products 추가
  //
  // WO-STORE-LOCAL-PRODUCT-HARDENING-V1: Query Separation Guard
  // supplierProducts와 localProducts는 반드시 별도 쿼리로 조회한다.
  // - supplierProducts: 4중 Visibility Gate (product.status + listing.is_active + channel.is_active + channel.status)
  // - localProducts: store_local_products 단순 조회 (is_active only)
  // DB UNION 금지. 애플리케이션 레벨 merge만 허용.
  // localProducts는 Checkout/EcommerceOrder와 무관한 Display Domain이다.
  router.get('/:slug/tablet/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1:
      //   공개 상품 집합의 권위 = first active tablet 의 visible display rows(configured).
      //   없으면 legacy fallback. supplier/local 이 같은 기준을 쓰도록 한 번 산출해 공유.
      // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: optional tabletId query(코너별 태블릿).
      const requestedTabletId = typeof req.query.tabletId === 'string' ? req.query.tabletId : null;
      const displaySource = await resolveTabletDisplaySource(dataSource, resolved.storeId, requestedTabletId);
      const configured = displaySource.configured;
      const firstTabletId = displaySource.tabletId;

      // Supplier products: 기존 4중 게이트 쿼리 (Commerce Domain — Checkout 진입 가능)
      // WO-O4O-KPA-TABLET-SUPPLIER-PRODUCT-SERVICEKEY-ALIGNMENT-V1:
      //   slug service_key('kpa')와 OPL service_key 불일치 방어. B2C 형제 쿼리와 동일한
      //   resolveServiceKeys alias 목록으로 전달(단일키 서비스는 [key] → 동작 불변).
      const supplierResult = await queryTabletVisibleProducts(dataSource, resolved.storeId, resolveServiceKeys(resolved.serviceKey), {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'sort_order',
        order: (req.query.order as string) || 'asc',
        q: req.query.q as string,
        firstTabletId,
        configured,
      });

      // Local products: Display Domain only (Checkout 진입 불가)
      // DB UNION 금지, 애플리케이션 레벨 merge
      // WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1: 콘텐츠 블록 필드 포함
      // usage_info, caution_info는 목록에서 제외.
      // WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1 (범위 E — 정책 C):
      //   detail_html 는 포함한다. 태블릿 상세는 별도 단건 API 없이 이 목록 응답으로 렌더되며,
      //   연결 콘텐츠가 없을 때의 "기본 상품 설명" 이 곧 매장 canonical 설명(detail_html)이다.
      //   (기존에는 짧은 description 만 내려가 상품 상세 설명 화면에 쓴 본문이 태블릿에 반영되지 않았다.)
      // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1:
      //   local 집합도 first active tablet 의 visible display row(disp)로 정합.
      //   - configured: disp 있는 local 만(집합 제한) + 편성 순서(disp.sort_order).
      //   - legacy fallback: active local 전체(+tablet 있으면 disp 로 content attach).
      //   content attach 는 disp.content_id 링크 유효 시에만 → 연결 해제/삭제 시 폴백.
      const localParams: any[] = [resolved.storeId];
      let localDispJoin = '';
      let localContentSelect =
        `NULL AS "selectedContentId", NULL AS "selectedContentTitle", '' AS "selectedContentHtml", NULL AS "selectedContentTranslationsRaw"`;
      let localFilter = '';
      let localOrder = 'ORDER BY lp.sort_order ASC, lp.name ASC';
      if (firstTabletId) {
        localParams.push(firstTabletId); // $2
        localDispJoin = `
         LEFT JOIN store_tablet_displays disp
           ON disp.product_id = lp.id AND disp.product_type = 'local'
           AND disp.tablet_id = $2 AND disp.is_visible = true
         LEFT JOIN kpa_store_content_product_links scl
           ON scl.organization_id = $1 AND scl.content_id = disp.content_id
           AND scl.link_type = 'product_description'
           AND scl.product_source_type = 'local' AND scl.product_source_id = lp.id
         LEFT JOIN kpa_store_contents tc
           ON tc.id = scl.content_id AND tc.organization_id = $1`;
        localContentSelect =
          `tc.id AS "selectedContentId", tc.title AS "selectedContentTitle",
           COALESCE(tc.content_json->>'html', tc.content_json->>'body', '') AS "selectedContentHtml",
           tc.content_json->'translations' AS "selectedContentTranslationsRaw"`;
        if (configured) {
          localFilter = 'AND disp.id IS NOT NULL';
          localOrder = 'ORDER BY disp.sort_order ASC NULLS LAST, lp.name ASC';
        }
      }
      const localProducts = await dataSource.query(
        `SELECT lp.id, lp.name, lp.description, lp.detail_html, lp.summary, lp.thumbnail_url, lp.images, lp.gallery_images,
                lp.category, lp.price_display, lp.badge_type, lp.highlight_flag, lp.sort_order,
                ${localContentSelect}
         FROM store_local_products lp
         ${localDispJoin}
         WHERE lp.organization_id = $1 AND lp.is_active = true
           ${localFilter}
         ${localOrder}`,
        localParams,
      );

      // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
      //   선택 콘텐츠 번역을 게시 가능(검수 완료) locale 만 남기고 status/model 은 제거.
      for (const row of localProducts) {
        row.selectedContentTranslations = sanitizePublishableTranslations(row.selectedContentTranslationsRaw);
        delete row.selectedContentTranslationsRaw;
      }

      res.json({
        success: true,
        ...supplierResult,
        localProducts,
        // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1: 진열 정합 상태(additive, 프론트 필수 아님).
        tabletDisplaySource: configured ? 'configured' : 'legacy_fallback',
        tabletDisplayTabletId: firstTabletId,
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet products' },
      });
    }
  });

  // POST /:slug/tablet/interest — Interest request creation (public, rate-limited)
  // WO-O4O-TABLET-MODULE-V1: 고객이 개별 상품에 관심 표시
  // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: 상품 없는 콘텐츠 상담(QR page CTA) 허용.
  //   masterId 있으면 상품 상담(기존), 없으면 콘텐츠 상담(master_id=NULL, productName fallback).
  router.post('/:slug/tablet/interest', tabletRequestLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const {
        masterId,
        customerName,
        customerNote,
        // QR page 콘텐츠 상담 확장 필드
        productName: bodyProductName,
        source: bodySource,
        qrSlug,
        landingType: bodyLandingType,
        landingTargetId: bodyLandingTargetId,
      } = req.body;

      const source: 'tablet' | 'qr' = bodySource === 'qr' ? 'qr' : 'tablet';

      // WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1: 상담 버튼 OFF 방어.
      //   타블렛 상담 버튼이 꺼진 매장에서는 타블렛 발신 상담 요청을 차단(403).
      //   QR page 콘텐츠 상담(source='qr')은 별도 CTA 흐름이므로 적용하지 않음.
      if (source === 'tablet') {
        const settingsRows = await dataSource.query(
          `SELECT show_consultation_button FROM store_tablet_display_settings WHERE organization_id = $1 LIMIT 1`,
          [resolved.storeId],
        );
        if (settingsRows?.[0] && settingsRows[0].show_consultation_button === false) {
          res.status(403).json({
            success: false,
            error: { code: 'CONSULTATION_DISABLED', message: '이 매장은 현재 타블렛 상담 요청을 받지 않습니다.' },
          });
          return;
        }
      }

      let resolvedMasterId: string | null = null;
      let productName: string;

      if (masterId) {
        if (typeof masterId !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_MASTER_ID', message: '상품 ID가 올바르지 않습니다.' },
          });
          return;
        }
        // Master 존재 확인 (상품 상담)
        const masterRepo = dataSource.getRepository(ProductMaster);
        const master = await masterRepo.findOne({
          where: { id: masterId },
          select: ['id', 'name'],
        });
        if (!master) {
          res.status(404).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다.' },
          });
          return;
        }
        resolvedMasterId = master.id;
        productName = master.name;
      } else {
        // 상품 없는 콘텐츠 상담 (QR page CTA 등) — master_id=NULL, 표시명 fallback
        const trimmed = typeof bodyProductName === 'string' ? bodyProductName.trim() : '';
        productName = (trimmed || 'QR 콘텐츠 상담 요청').slice(0, 255);
      }

      // 관심 요청 생성
      const interestRepo = dataSource.getRepository(TabletInterestRequest);
      const interest = interestRepo.create({
        organizationId: resolved.storeId,
        masterId: resolvedMasterId,
        productName,
        customerName: customerName?.trim() || undefined,
        customerNote: customerNote?.trim() || undefined,
        status: InterestRequestStatus.REQUESTED,
      });

      const saved = await interestRepo.save(interest);

      // WO-O4O-KPA-STORE-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1
      // 상담 요청 생성 시 매장 사용자(경영자/직원)에게 in-app 알림 생성.
      // - 기존엔 알림이 없어 직원이 /store/requests 화면을 5초 polling 으로 직접 봐야 인지 가능했음.
      // - best-effort: 알림 실패가 요청 생성(본 기능)을 막지 않는다.
      // - KPA 한정: 본 handler 는 service-neutral 이나 본 WO 범위는 KPA. GP 는 별도
      //   customer_requests 모델을 사용하므로 의도치 않은 동작 변경을 피하기 위해 'kpa' 만 처리.
      //   GP/KCos parity 는 후속 WO 에서 판단(IR-...-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1).
      if (resolved.serviceKey === 'kpa') {
        try {
          // 대상: 해당 매장(organization)의 owner/admin/manager. 운영자 전체가 아닌 매장 사용자에게만.
          const members: { userId: string }[] = await dataSource.query(
            `SELECT DISTINCT user_id AS "userId"
               FROM organization_members
              WHERE organization_id = $1
                AND role IN ('owner','admin','manager')
                AND left_at IS NULL
              LIMIT 20`,
            [resolved.storeId],
          );

          const productName = saved.productName || '';
          const message = productName
            ? `${productName} 상담 요청이 접수되었습니다.`
            : '매장 상담 요청이 접수되었습니다.';

          await Promise.allSettled(
            members.map((m) =>
              notificationService.createNotification({
                userId: m.userId,
                type: 'store.consultation_requested',
                title: '새 상담 요청이 도착했습니다',
                message,
                // bell 필터는 'kpa-society'(membership/service key) 기준 — slug service_key('kpa')와 다름.
                serviceKey: 'kpa-society',
                organizationId: resolved.storeId,
                metadata: {
                  // WO-O4O-KPA-TABLET-INTEREST-NOTIFICATION-ROUTING-V1:
                  //   타블렛 관심/상담 알림은 현 IA의 타블렛 화면(/store/commerce/tablet-displays)으로 연결.
                  //   '/store/requests'(메뉴에서 제거된 legacy 상담요청 route)를 기본 target 으로 사용하지 않는다.
                  //   온라인 판매(주문) 무관 — 타블렛은 주문 채널이 아니라 매장 내 조회+상담 요청 흐름이다.
                  targetUrl: '/store/commerce/tablet-displays',
                  requestId: saved.id,
                  organizationId: resolved.storeId,
                  storeSlug: req.params.slug,
                  source,
                  targetType: 'tablet_interest_request',
                  productName,
                  // QR page 콘텐츠 상담일 때 출처 컨텍스트 기록 (source 컬럼 미도입 — metadata 로 보존)
                  ...(source === 'qr'
                    ? {
                        qrSlug: qrSlug || null,
                        landingType: bodyLandingType || 'page',
                        landingTargetId: bodyLandingTargetId || null,
                      }
                    : {}),
                },
              }),
            ),
          );
        } catch (notifyError) {
          console.error(
            '[UnifiedStore] consultation request notification failed (best-effort):',
            notifyError,
          );
        }
      }

      res.status(201).json({
        success: true,
        data: {
          requestId: saved.id,
          status: saved.status,
          productName: saved.productName,
          createdAt: saved.createdAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] POST /:slug/tablet/interest error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '관심 요청 생성에 실패했습니다.' },
      });
    }
  });

  // GET /:slug/tablet/interest/:id — Interest request status (public, kiosk polling)
  // WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
  router.get('/:slug/tablet/interest/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const interestRepo = dataSource.getRepository(TabletInterestRequest);
      const request = await interestRepo.findOne({
        where: { id, organizationId: resolved.storeId },
      });

      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'INTEREST_NOT_FOUND', message: '요청을 찾을 수 없습니다.' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: request.id,
          status: request.status,
          productName: request.productName,
          customerName: request.customerName,
          customerNote: request.customerNote,
          createdAt: request.createdAt,
          acknowledgedAt: request.acknowledgedAt,
          completedAt: request.completedAt,
          cancelledAt: request.cancelledAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/interest/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 조회에 실패했습니다.' },
      });
    }
  });

  // GET /:slug/tablet/idle — Idle mode playlist items (store-level setting)
  // WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1
  //
  // 정책:
  // - 현재 device pairing 부재 → kiosk URL 에서 tablet 식별 불가 → 매장 단위 설정
  // - 매장의 첫 active tablet row 의 idle_playlist_items 를 사용
  // - 값이 없으면 빈 배열 반환 (kiosk wrapper 는 placeholder 표시)
  // - 추후 device pairing 도입 시 tablet 별 설정으로 자연스럽게 진화 가능
  //
  // 응답: { success: true, data: { items: IdlePlaylistItem[] } }
  router.get('/:slug/tablet/idle', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1:
      //   optional tabletId query(코너별 태블릿). 유효한 이 매장 active tablet 이면 그 태블릿,
      //   아니면 first active fallback. products endpoint 와 동일 기준(resolveTabletDisplaySource).
      const requestedTabletId = typeof req.query.tabletId === 'string' ? req.query.tabletId : null;
      const displaySource = await resolveTabletDisplaySource(dataSource, resolved.storeId, requestedTabletId);
      const tabletId = displaySource.tabletId;

      // WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1:
      //   현재 태블릿에 적용된 screen set 의 idle_media block 이 있으면 그 config 로 override(dual-read),
      //   없으면 legacy(idle_playlist_items + operator common prepend) 그대로. 저장소는 읽기만.
      let screenSetIdleConfig: unknown = undefined;
      if (tabletId) {
        const t = await dataSource.query(
          `SELECT current_screen_set_id FROM store_tablets WHERE id = $1 LIMIT 1`,
          [tabletId],
        );
        const setId = t?.[0]?.current_screen_set_id;
        if (setId) {
          const blk = await dataSource.query(
            `SELECT b.config
             FROM store_tablet_screen_blocks b
             JOIN store_tablet_screen_sets s ON s.id = b.screen_set_id AND s.origin = 'store' AND s.deleted_at IS NULL
             WHERE b.screen_set_id = $1 AND b.block_type = 'idle_media' AND b.is_visible = true
             ORDER BY b.sort_order ASC LIMIT 1`,
            [setId],
          );
          if (blk?.[0]) screenSetIdleConfig = blk[0].config;
        }
      }

      let items: any[] = [];
      let operatorCommonSource: 'selected' | 'fallback' | null = null;
      if (tabletId) {
        const resolvedIdle = await resolveTabletIdleItems(dataSource, tabletId, resolved.serviceKey, screenSetIdleConfig);
        items = resolvedIdle.items;
        operatorCommonSource = resolvedIdle.operatorCommonSource;
      }

      res.json({
        success: true,
        data: { items },
        // additive: 어느 태블릿 기준인지(디버그/후속). 기존 client 는 data.items 만 사용.
        tabletId,
        tabletSource: displaySource.source,
        operatorCommonSource,
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/idle error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch idle playlist' },
      });
    }
  });

  // GET /:slug/tablet/settings — 매장 전시 설정(공개). 공개 뷰어가 가격/QR/상담버튼/전환시간 반영에 사용.
  // WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1. 행이 없으면 기본값(전부 표시 / 10초).
  router.get('/:slug/tablet/settings', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const rows = await dataSource.query(
        `SELECT show_price, show_qr, show_consultation_button, auto_slide_seconds, idle_slide_seconds
         FROM store_tablet_display_settings WHERE organization_id = $1 LIMIT 1`,
        [resolved.storeId],
      );
      const r = rows?.[0];
      res.json({
        success: true,
        data: r
          ? {
              showPrice: r.show_price,
              showQr: r.show_qr,
              showConsultationButton: r.show_consultation_button,
              autoSlideSeconds: r.auto_slide_seconds,
              idleSlideSeconds: r.idle_slide_seconds,
            }
          : {
              // WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1:
              //   태블릿 V1 = 공용 안내 화면. 상담 요청 버튼 신규 기본값 OFF.
              showPrice: true,
              showQr: true,
              showConsultationButton: false,
              autoSlideSeconds: 10,
              idleSlideSeconds: 10,
            },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/settings error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet settings' },
      });
    }
  });

  // GET /:slug/tablet/screen — 적용된 Screen Set 을 template-compatible renderer 로 구성(공개).
  // WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
  //   current_screen_set_id NULL → { mode:'legacy' }(기존 /products·/idle 경로 사용).
  //   NOT NULL → 유효 검증 후 visible blocks 를 sections 로 구성. block config 불량은 해당 섹션 생략(안전).
  //   template 은 Phase 1 기본 1개(구조만) — template 테이블/컬럼/UI 없음.
  router.get('/:slug/tablet/screen', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const requestedTabletId = typeof req.query.tabletId === 'string' ? req.query.tabletId : null;
      // WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1: 이용자 선택 표시 언어(O4O 1차 7개 언어).
      //   허용값만 통과(그 외/미지정 → undefined → 기존 동작: 저작 item.language). 스키마·DB 변경 없음.
      const VIEWER_LANGS = new Set(['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id']);
      const rawLang = typeof req.query.language === 'string' ? req.query.language.trim().toLowerCase() : '';
      const viewerLanguage = VIEWER_LANGS.has(rawLang) ? rawLang : undefined;
      const displaySource = await resolveTabletDisplaySource(dataSource, resolved.storeId, requestedTabletId);
      const tabletId = displaySource.tabletId;

      let currentSetId: string | null = null;
      let tabletOrg: string | null = null;
      if (tabletId) {
        const t = await dataSource.query(
          `SELECT current_screen_set_id AS "currentSetId", organization_id AS "orgId" FROM store_tablets WHERE id = $1 LIMIT 1`,
          [tabletId],
        );
        currentSetId = t?.[0]?.currentSetId ?? null;
        tabletOrg = t?.[0]?.orgId ?? null;
      }

      // legacy: 적용 세트 없음 → 기존 경로
      if (!tabletId || !currentSetId) {
        res.json({ success: true, data: { mode: 'legacy', tabletId, tabletSource: displaySource.source } });
        return;
      }

      // 적용 세트 유효성(org 일치 + 미삭제 + 미보관) + blocks→sections.
      // WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: 공용 resolveScreenSetSections 로 통일(QR landing 과 동일 소스).
      //   tabletContext 지정 = 기존 공개 runtime 동작 그대로(full idle + 태블릿 gate 상품). 게이트 미충족 시 null → legacy fallback.
      const resolvedSet = await resolveScreenSetSections(dataSource, {
        organizationId: tabletOrg as string,
        screenSetId: currentSetId,
        serviceKey: resolved.serviceKey,
        storeId: resolved.storeId,
        storeSlug: req.params.slug,
        tabletContext: { tabletId, configured: displaySource.configured },
        viewerLanguage,
      }, createStoreContentSourceAdapter(dataSource));
      if (!resolvedSet) {
        res.json({ success: true, data: { mode: 'legacy', tabletId, tabletSource: displaySource.source, note: 'applied screen set unavailable → legacy fallback' } });
        return;
      }

      res.json({
        success: true,
        data: {
          mode: 'screen_set',
          templateKey: resolvedSet.set.templateKey,
          screenSet: { id: resolvedSet.set.id, name: resolvedSet.set.name },
          sections: resolvedSet.sections,
          tabletId,
          tabletSource: displaySource.source,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/screen error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet screen' },
      });
    }
  });

  return router;
}
