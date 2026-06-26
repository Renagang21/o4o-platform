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
} from './store-public-utils.js';

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

      // Supplier products: 기존 4중 게이트 쿼리 (Commerce Domain — Checkout 진입 가능)
      const supplierResult = await queryTabletVisibleProducts(dataSource, resolved.storeId, resolved.serviceKey, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'sort_order',
        order: (req.query.order as string) || 'asc',
        q: req.query.q as string,
      });

      // Local products: Display Domain only (Checkout 진입 불가)
      // DB UNION 금지, 애플리케이션 레벨 merge
      // WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1: 콘텐츠 블록 필드 포함
      // detail_html, usage_info, caution_info는 목록에서 제외 (상세 조회 시에만)
      const localProducts = await dataSource.query(
        `SELECT id, name, description, summary, thumbnail_url, images, gallery_images,
                category, price_display, badge_type, highlight_flag, sort_order
         FROM store_local_products
         WHERE organization_id = $1 AND is_active = true
         ORDER BY sort_order ASC, name ASC`,
        [resolved.storeId],
      );

      res.json({
        success: true,
        ...supplierResult,
        localProducts,
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

      // 매장의 첫 active tablet row → idle_playlist_items
      const rows = await dataSource.query(
        `SELECT idle_playlist_items
         FROM store_tablets
         WHERE organization_id = $1 AND is_active = true
         ORDER BY created_at ASC
         LIMIT 1`,
        [resolved.storeId],
      );

      const items = Array.isArray(rows?.[0]?.idle_playlist_items)
        ? rows[0].idle_playlist_items
        : [];

      res.json({
        success: true,
        data: { items },
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
              showPrice: true,
              showQr: true,
              showConsultationButton: true,
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

  return router;
}
