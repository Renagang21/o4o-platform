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
import { parseIdleMediaConfig, resolveIdleMediaItems } from '../store-tablet-idle-block.js';

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
 * 저장된 Screen Set 을 sections 로 resolve. 경계/삭제/보관 게이트 미충족 시 null.
 */
export async function resolveScreenSetSections(
  dataSource: DataSource,
  input: ResolveScreenSetInput,
): Promise<ResolvedScreenSet | null> {
  const setRows = await dataSource.query(
    `SELECT id, name, status, template_key AS "templateKey" FROM store_tablet_screen_sets
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
          // 태블릿 없음(QR/org): custom_media 만 완전 resolve(legacy/operator 소스 빈 배열). 대기영상 미러 상위에서 제외.
          const parsed = parseIdleMediaConfig(b.config);
          if (parsed.ok) {
            const resolved = resolveIdleMediaItems(parsed.value, { legacyIdlePlaylist: [], operatorCommon: [] });
            const items = resolved.map((it) => ({ type: it.mediaType, url: it.url, ...(it.durationMs !== undefined ? { durationMs: it.durationMs } : {}) }));
            if (items.length > 0) sections.push({ blockType: 'idle_media', sortOrder: b.sortOrder, data: { items } });
          }
        }
      } else if (b.blockType === 'product_list') {
        if (productMode === 'skip') continue;
        const supplierResult: any = await queryTabletVisibleProducts(dataSource, input.storeId, resolveServiceKeys(input.serviceKey), {
          page: 1, limit: 50, sort: 'sort_order', order: 'asc',
          firstTabletId: tabletContext?.tabletId ?? null,
          configured: tabletContext?.configured ?? false,
        });
        sections.push({
          blockType: 'product_list',
          sortOrder: b.sortOrder,
          data: {
            products: supplierResult?.data ?? [],
            localProductsEndpoint: input.storeSlug ? `/${input.storeSlug}/tablet/products` : null,
          },
        });
      } else if (b.blockType === 'product_content') {
        const cfg = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? b.config : {};
        sections.push({ blockType: 'product_content', sortOrder: b.sortOrder, data: { productRef: cfg.productRef ?? null, contentId: cfg.contentId ?? null } });
      } else if (b.blockType === 'content_list') {
        const cards = await resolveContentListItems(dataSource, input.storeId, b.config);
        sections.push({ blockType: 'content_list', sortOrder: b.sortOrder, data: { items: cards } });
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
