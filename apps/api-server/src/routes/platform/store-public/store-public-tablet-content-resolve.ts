/**
 * 공개 태블릿 content_list resolve — block config item → viewer 카드 data
 *
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1
 *   /tablet/screen 이 content_list block 을 이 함수로 resolve 해 카드 배열을 반환한다.
 *   viewer 가 SPD/kpa_store_contents 를 직접 몰라도 되게 서버에서 resolve(참조ID만 통과하는
 *   product_content 의 dormant 실패를 반복하지 않음).
 *
 *   sourceType:
 *     - o4o_product_description : masterId+language → shared_product_descriptions
 *         (description_type='STORE', status='canonical') 를 language 우선 → ko fallback 조회.
 *         ProductMaster 없거나 STORE canonical 없으면 item skip.
 *     - store_content : kpa_store_contents.id → org 일치 + workspace_status≠'archived' 조회.
 *         없거나 타 org 이면 skip.
 *
 *   HTML 안전(§6): 서버는 원문 html 을 전달하되, viewer 는 ContentRenderer(DOMPurify)로만
 *   렌더한다는 계약. 서버가 dangerously 렌더하지 않는다(문자열 전달만).
 */

import type { DataSource } from 'typeorm';
import { parseContentListConfig, type ContentListItem } from '../store-tablet-content-list-block.js';

/** resolve 상한(과도한 카드 방지). config 자체는 100까지 허용하나 공개 렌더는 50 로 제한. */
const RESOLVE_LIMIT = 50;

export interface ContentListCard {
  itemId: string;
  sourceType: 'o4o_product_description' | 'store_content';
  sourceBadge: string;
  title: string;
  summary: string;
  thumbnailUrl: string | null;
  hasDetail: boolean;
  relatedProductName: string | null;
  detail: { html: string };
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * content_list block config → 카드 배열.
 * - 잘못된 config → [] (섹션은 caller 가 items=[] 로 반환).
 * - visible=false / resolve 실패 item → skip.
 * - sortOrder 오름차순.
 */
export async function resolveContentListItems(
  dataSource: DataSource,
  organizationId: string,
  config: unknown,
): Promise<ContentListCard[]> {
  const parsed = parseContentListConfig(config);
  if (!parsed.ok) return [];

  const items = parsed.value.items
    .filter((it) => it.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, RESOLVE_LIMIT);

  const cards: ContentListCard[] = [];
  for (const item of items) {
    try {
      const card =
        item.sourceType === 'o4o_product_description'
          ? await resolveO4oItem(dataSource, item)
          : await resolveStoreItem(dataSource, organizationId, item);
      if (card) cards.push(card);
    } catch {
      // 개별 item resolve 실패는 전체 /screen 을 깨지 않는다 → skip.
    }
  }
  return cards;
}

async function resolveO4oItem(
  dataSource: DataSource,
  item: Extract<ContentListItem, { sourceType: 'o4o_product_description' }>,
): Promise<ContentListCard | null> {
  const rows = await dataSource.query(
    `SELECT pm.name AS "masterName", spd.content AS "content", spd.summary AS "summary"
       FROM product_masters pm
       LEFT JOIN LATERAL (
         SELECT d.content, d.summary
           FROM shared_product_descriptions d
          WHERE d.master_id = pm.id
            AND d.description_type = 'STORE'
            AND d.status = 'canonical'
            AND d.deleted_at IS NULL
          ORDER BY (d.language = $2) DESC, (d.language = 'ko') DESC, d.updated_at DESC
          LIMIT 1
       ) spd ON true
      WHERE pm.id = $1
      LIMIT 1`,
    [item.masterId, item.language],
  );
  const row = rows?.[0];
  if (!row) return null; // ProductMaster 없음
  const html = asString(row.content);
  if (!html.trim()) return null; // STORE canonical 없음 → 설명 없는 카드는 skip
  const masterName = asString(row.masterName);
  return {
    itemId: `o4o:${item.masterId}:${item.language}`,
    sourceType: 'o4o_product_description',
    sourceBadge: 'O4O 표준',
    title: item.displayTitle ?? masterName,
    summary: item.displaySummary ?? asString(row.summary),
    thumbnailUrl: null,
    hasDetail: true,
    relatedProductName: masterName || null,
    detail: { html },
  };
}

async function resolveStoreItem(
  dataSource: DataSource,
  organizationId: string,
  item: Extract<ContentListItem, { sourceType: 'store_content' }>,
): Promise<ContentListCard | null> {
  const rows = await dataSource.query(
    `SELECT title, content_json AS "contentJson", workspace_status AS "workspaceStatus"
       FROM kpa_store_contents
      WHERE id = $1 AND organization_id = $2
      LIMIT 1`,
    [item.contentId, organizationId],
  );
  const row = rows?.[0];
  if (!row) return null; // 없음 / 타 org(=조회 안 됨)
  if (row.workspaceStatus === 'archived') return null; // archived 제외
  const cj = (row.contentJson && typeof row.contentJson === 'object' && !Array.isArray(row.contentJson)
    ? row.contentJson
    : {}) as Record<string, unknown>;
  const html = asString(cj.html) || asString(cj.body);
  const title = item.displayTitle ?? asString(row.title);
  return {
    itemId: `store:${item.contentId}`,
    sourceType: 'store_content',
    sourceBadge: '매장 제작',
    title,
    summary: item.displaySummary ?? asString(cj.summary),
    thumbnailUrl: null,
    hasDetail: !!html.trim(),
    relatedProductName: null,
    detail: { html },
  };
}
