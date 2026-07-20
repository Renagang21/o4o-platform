/**
 * Screen Set → sections 공용 resolver
 *
 * WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1
 *
 * 저장된 store_tablet_screen_sets(+ blocks)를 template-호환 sections 로 resolve 하는 단일 소스.
 * 다음 두 경로가 **동일 로직**으로 렌더 데이터를 만든다(콘텐츠 원본을 복사하지 않는다).
 *   1) 매장 태블릿 공개 runtime  — GET /:slug/tablet/screen   (tabletContext 있음 = full idle/products)
 *   2) 소비자 QR screen_set landing — GET /qr/public/:slug      (tabletContext 없음 = 매장 org 기준)
 *
 * draft preview(POST /screen-sets/preview)는 **미저장 body.blocks** 를 resolve 하므로 screenSetId 기반
 * 이 resolver 를 사용할 수 없다. 대신 동일한 헬퍼(shapeStaticBlock / resolveContentListItems /
 * parseIdleMediaConfig / resolveIdleMediaItems / resolveTemplateKey)와 게이트를 공유한다.
 *
 * 경계/게이트: organization 일치 + deleted_at IS NULL + status <> 'archived'. 미충족 시 null 반환
 * (호출부가 legacy fallback 또는 접근 차단으로 처리). 개별 block 실패는 해당 섹션만 생략(안전).
 */

import type { DataSource } from 'typeorm';
import { queryTabletVisibleProducts, resolveServiceKeys } from './store-public-utils.js';
import { resolveTabletIdleItems } from './store-public-tablet-idle-resolve.js';
import { resolveTemplateKey, shapeStaticBlock } from './store-public-tablet-screen.js';
import { resolveContentListItems } from './store-public-tablet-content-resolve.js';
// WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: content_list 원본 조회는 주입된 adapter 로 위임.
import type { ContentSourceAdapter } from './store-public-tablet-content-source.js';
// WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1: qr_guide URL 을 Screen Set QR(public_qr_slug)로 서버 도출.
import { buildScreenSetQrUrl } from '../store-screen-set-qr.service.js';

export interface ScreenSection {
  blockType: string;
  sortOrder: number;
  data: Record<string, unknown>;
}

/** 물리 태블릿 컨텍스트(공개 runtime 전용). 있으면 idle(operator-common/legacy) + 상품 gate 를 완전 적용. */
export interface ScreenSetTabletContext {
  tabletId: string;
  configured: boolean;
}

export interface ResolveScreenSetInput {
  /** Set 소유 org(경계). runtime=tablet org, QR=qr.organization_id */
  organizationId: string;
  screenSetId: string;
  /** 상품/서비스 스코프 키(store service key). resolveServiceKeys 로 확장. */
  serviceKey: string;
  /** 상품 조회 store id(KPA=organizationId 와 동일). */
  storeId: string;
  /** localProductsEndpoint 용 store slug(없으면 null). */
  storeSlug: string | null;
  /** 있으면 공개 runtime(full idle + 태블릿 gate 상품). 없으면 QR/org 기준(대기영상 custom-only). */
  tabletContext?: ScreenSetTabletContext | null;
  /**
   * product_list 처리:
   *  - 'full' : 태블릿 gate 상품(runtime 기본)
   *  - 'org'  : 매장 org 기준 상품(QR)
   *  - 'skip' : 상품 섹션 생략
   * 기본값: tabletContext 있으면 'full', 없으면 'org'.
   */
  productMode?: 'full' | 'org' | 'skip';
}

export interface ResolvedScreenSet {
  set: { id: string; name: string; templateKey: string };
  sections: ScreenSection[];
}

/**
 * 모바일/QR 미러용 로컬 상품 resolve — /tablet/products 의 local 경로와 동일 기준.
 * 이 Screen Set 이 적용된 태블릿(current_screen_set_id)의 visible local 진열이 있으면 코너별로 제한,
 * 없으면 매장(org) 전체 활성 로컬로 폴백. 반환 형태는 모바일 뷰어 ProductCard 와 호환.
 */
async function resolveScreenSetLocalProducts(
  dataSource: DataSource,
  organizationId: string,
  screenSetId: string,
): Promise<Array<{ id: string; type: 'local'; name: string; price: number | null; imageUrl: string | null }>> {
  const tabletRows = await dataSource.query(
    `SELECT id FROM store_tablets WHERE current_screen_set_id = $1 AND organization_id = $2 LIMIT 1`,
    [screenSetId, organizationId],
  );
  const tabletId: string | null = tabletRows?.[0]?.id ?? null;

  let rows: any[] = [];
  if (tabletId) {
    rows = await dataSource.query(
      `SELECT lp.id, lp.name, lp.price_display AS "priceDisplay", lp.thumbnail_url AS "thumbnailUrl", disp.sort_order AS "sortOrder"
         FROM store_tablet_displays disp
         JOIN store_local_products lp ON lp.id = disp.product_id AND lp.organization_id = $2 AND lp.is_active = true
        WHERE disp.tablet_id = $1 AND disp.product_type = 'local' AND disp.is_visible = true
        ORDER BY disp.sort_order ASC NULLS LAST, lp.name ASC`,
      [tabletId, organizationId],
    );
  }
  if (rows.length === 0) {
    // 진열 미구성(legacy) → 매장 전체 활성 로컬.
    rows = await dataSource.query(
      `SELECT id, name, price_display AS "priceDisplay", thumbnail_url AS "thumbnailUrl", sort_order AS "sortOrder"
         FROM store_local_products
        WHERE organization_id = $1 AND is_active = true
        ORDER BY sort_order ASC NULLS LAST, name ASC LIMIT 50`,
      [organizationId],
    );
  }
  return rows.map((r) => ({
    id: r.id,
    type: 'local' as const,
    name: r.name,
    price: r.priceDisplay != null ? Number(r.priceDisplay) : null,
    imageUrl: r.thumbnailUrl ?? null,
  }));
}

/**
 * 저장된 Screen Set 을 sections 로 resolve. 경계/삭제/보관 게이트 미충족 시 null.
 */
export async function resolveScreenSetSections(
  dataSource: DataSource,
  input: ResolveScreenSetInput,
  // WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: content_list 원본 조회 adapter(호출부가 명시 주입).
  //   화면 구성(블록 정렬·상품·idle·QR)은 이 resolver 가 유지. 원본 조회만 adapter 경계로 분리.
  contentSource: ContentSourceAdapter,
): Promise<ResolvedScreenSet | null> {
  const setRows = await dataSource.query(
    `SELECT id, name, status, template_key AS "templateKey", public_qr_slug AS "publicQrSlug"
     FROM store_tablet_screen_sets
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL AND status <> 'archived' LIMIT 1`,
    [input.screenSetId, input.organizationId],
  );
  const set = setRows?.[0];
  if (!set) return null;

  const blocks = await dataSource.query(
    `SELECT block_type AS "blockType", sort_order AS "sortOrder", config
     FROM store_tablet_screen_blocks
     WHERE screen_set_id = $1 AND is_visible = true
     ORDER BY sort_order ASC`,
    [set.id],
  );

  const templateKey = resolveTemplateKey(set);
  const tabletContext = input.tabletContext ?? null;
  const productMode = input.productMode ?? (tabletContext ? 'full' : 'org');

  const sections: ScreenSection[] = [];
  for (const b of blocks) {
    try {
      if (b.blockType === 'idle_media') {
        if (tabletContext) {
          // 공개 runtime: operator-common/legacy playlist 포함 완전 resolve(태블릿 저장소 기준).
          const r = await resolveTabletIdleItems(dataSource, tabletContext.tabletId, input.serviceKey, b.config);
          sections.push({ blockType: 'idle_media', sortOrder: b.sortOrder, data: { items: r.items, operatorCommonSource: r.operatorCommonSource } });
        } else {
          // WO-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1 §5: QR/모바일은 '태블릿 대기화면'을 첫 콘텐츠로 보여주지 않는다.
          //   대기화면은 무조작 태블릿 전용 개념 — 휴대전화로 QR 을 열면 코너 안내·상품·추가 콘텐츠를 바로 봐야 한다.
          //   따라서 tabletContext 없는 경로에서는 idle_media 섹션을 내보내지 않는다(프론트도 idle-first 렌더 제거).
          continue;
        }
      } else if (b.blockType === 'product_list') {
        if (productMode === 'skip') continue;
        // WO-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1 §5: QR/모바일도 태블릿과 상품 parity.
        //   태블릿은 supplier 를 코너 진열(store_tablet_displays)로 제한(configured=true)하는데,
        //   QR(tabletContext 없음)은 그동안 configured=false → org 전체 supplier 라 상품이 더 많았다.
        //   여기서 current_screen_set_id 로 이 Screen Set 의 코너 태블릿을 도출해 supplier 도 진열로 제한한다(local 과 동일 기준).
        let supplierTabletId: string | null = tabletContext?.tabletId ?? null;
        let supplierConfigured: boolean = tabletContext?.configured ?? false;
        if (!tabletContext) {
          const tRows = await dataSource.query(
            `SELECT id FROM store_tablets WHERE current_screen_set_id = $1 AND organization_id = $2 LIMIT 1`,
            [input.screenSetId, input.organizationId],
          );
          const tId: string | null = tRows?.[0]?.id ?? null;
          if (tId) {
            const cnt = await dataSource.query(
              `SELECT COUNT(*)::int AS c FROM store_tablet_displays WHERE tablet_id = $1 AND is_visible = true`,
              [tId],
            );
            supplierTabletId = tId;
            supplierConfigured = Number(cnt?.[0]?.c || 0) > 0;
          }
        }
        const supplierResult: any = await queryTabletVisibleProducts(dataSource, input.storeId, resolveServiceKeys(input.serviceKey), {
          page: 1, limit: 50, sort: 'sort_order', order: 'asc',
          firstTabletId: supplierTabletId,
          configured: supplierConfigured,
        });
        let products: any[] = supplierResult?.data ?? [];
        // QR 모바일 미러는 section.products 만 소비하고 /tablet/products(로컬)를 재조회하지 않는다.
        //   태블릿 kiosk 는 section.products 를 쓰지 않고 fetchProducts(/tablet/products, supplier+local)로 상품을 그린다.
        //   → tabletContext 없는(모바일/QR) 경로에서만 로컬 상품을 section 에 포함해 태블릿과 상품 parity 를 맞춘다.
        //   (태블릿 runtime 경로는 기존과 동일하게 supplier 만 — kiosk 미소비라 무영향.)
        if (!tabletContext) {
          const locals = await resolveScreenSetLocalProducts(dataSource, input.organizationId, input.screenSetId);
          products = [...products, ...locals];
        }
        sections.push({
          blockType: 'product_list',
          sortOrder: b.sortOrder,
          data: {
            products,
            localProductsEndpoint: input.storeSlug ? `/${input.storeSlug}/tablet/products` : null,
          },
        });
      } else if (b.blockType === 'product_content') {
        const cfg = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? b.config : {};
        sections.push({ blockType: 'product_content', sortOrder: b.sortOrder, data: { productRef: cfg.productRef ?? null, contentId: cfg.contentId ?? null } });
      } else if (b.blockType === 'content_list') {
        const cards = await resolveContentListItems(contentSource, input.storeId, b.config);
        sections.push({ blockType: 'content_list', sortOrder: b.sortOrder, data: { items: cards } });
      } else if (b.blockType === 'qr_guide') {
        // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1 §5:
        //   qr_guide URL 은 config 자유 입력값에 의존하지 않고 Screen Set QR(public_qr_slug)로 **서버 도출**.
        //   slug 없으면 임의 URL 을 쓰지 않는다(url=''). label(안내 문구)만 config 유지.
        //   블록이 존재하면 노출(라벨 없어도 자동 URL 있으면 렌더). label·url 둘 다 없으면 생략.
        const cfg = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? (b.config as Record<string, unknown>) : {};
        const label = typeof cfg.label === 'string' ? cfg.label : '';
        const url = set.publicQrSlug ? buildScreenSetQrUrl(input.serviceKey, set.publicQrSlug) : '';
        if (label || url) sections.push({ blockType: 'qr_guide', sortOrder: b.sortOrder, data: { label, url } });
      } else {
        const data = shapeStaticBlock(b.blockType, b.config);
        if (data) sections.push({ blockType: b.blockType, sortOrder: b.sortOrder, data });
      }
    } catch (blockErr) {
      console.error(`[ScreenSetResolve] block(${b.blockType}) resolve error:`, blockErr);
      // 해당 block 생략(안전 fallback)
    }
  }

  return { set: { id: set.id, name: set.name, templateKey }, sections };
}
