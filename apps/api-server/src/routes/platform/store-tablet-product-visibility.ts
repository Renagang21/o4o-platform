/**
 * Store Tablet Product Visibility Annotation
 *
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 (축 A)
 *
 * 문제:
 *   Screen Set 편집기의 상품 선택 풀(`GET /product-pool`, `GET /tablets/:id/product-pool`)은
 *   `organization_product_listings.is_active = true` 만 본다. 그러나 공개 태블릿 런타임
 *   (`queryTabletVisibleProducts`)은 그 위에 **4개의 게이트**를 더 요구한다.
 *
 *     ① opl.service_key = ANY(serviceKeys)          — 매장 slug 의 서비스 스코프
 *     ② supplier_product_offers 존재 + is_active    — offer_id IS NULL(취급 등록만) 은 제외
 *        + neture_suppliers.status = 'ACTIVE'
 *     ③ organization_product_channels(active) 연결
 *     ④ organization_channels.channel_type='TABLET' AND status='APPROVED'
 *
 *   그래서 "편집기에서 고를 수 있는 상품"과 "실제 태블릿/미리보기에 나오는 상품"이 달랐다.
 *   매장 경영자에게는 저장은 되는데 화면에 안 나오는 무증상 실패로 보인다.
 *
 * 해결 방향(§4-4 임의 bypass 금지):
 *   런타임 게이트를 **완화하지 않는다**. 대신 풀 응답에 런타임 노출 가능 여부와 사유를
 *   additive 필드로 덧붙여, 편집기가 "노출 불가" 상태와 조치 안내를 보여줄 수 있게 한다.
 *   기존 필드·shape 는 그대로이며, 선택 자체를 막지도 않는다(옵션 B).
 *
 * 신규 테이블·컬럼·migration 0.
 */

import type { DataSource } from 'typeorm';
import { resolveServiceKeys } from './store-public/store-public-utils.js';

export type TabletVisibilityReason =
  /** 런타임 노출 가능 */
  | 'visible'
  /** listing 의 service_key 가 매장 slug 서비스 스코프와 다르다 */
  | 'service_scope_mismatch'
  /** offer 가 없거나(취급 등록만) 비활성 · 공급자 비활성 */
  | 'offer_inactive'
  /** 매장에 TABLET 채널 자체가 없다 */
  | 'no_tablet_channel'
  /** TABLET 채널은 있으나 승인(APPROVED) 상태가 아니다 */
  | 'channel_not_approved'
  /** 승인된 TABLET 채널은 있으나 이 상품이 채널에 연결되지 않았다 */
  | 'not_linked_to_channel';

export interface TabletVisibilityAnnotation {
  /** 공개 태블릿 런타임(`queryTabletVisibleProducts`)에 노출될 수 있는가 */
  tabletVisible: boolean;
  tabletVisibilityReason: TabletVisibilityReason;
}

export interface StoreTabletChannelState {
  /** 매장에 TABLET 채널 row 가 하나라도 있는가 */
  hasTabletChannel: boolean;
  /** APPROVED 상태의 TABLET 채널이 있는가 */
  hasApprovedTabletChannel: boolean;
  /** 대표 상태(진단·안내용) — 없으면 null */
  tabletChannelStatus: string | null;
}

export async function resolveStoreTabletChannelState(
  dataSource: DataSource,
  organizationId: string,
): Promise<StoreTabletChannelState> {
  const rows: Array<{ status: string }> = await dataSource.query(
    `SELECT status FROM organization_channels
      WHERE organization_id = $1 AND channel_type = 'TABLET'`,
    [organizationId],
  );
  const statuses = rows.map((r) => String(r.status || '').toUpperCase());
  return {
    hasTabletChannel: statuses.length > 0,
    hasApprovedTabletChannel: statuses.includes('APPROVED'),
    tabletChannelStatus: statuses.includes('APPROVED') ? 'APPROVED' : (statuses[0] ?? null),
  };
}

/**
 * supplier 상품 풀 rows 에 런타임 노출 여부를 덧붙인다.
 *
 * @param serviceKey 매장 slug 의 service_key(공개 경로와 동일 기준). 내부에서
 *                   `resolveServiceKeys` 로 확장한다(kpa → ['kpa','kpa-society']).
 */
export async function annotateTabletVisibility<T extends { id: string; service_key?: string | null }>(
  dataSource: DataSource,
  organizationId: string,
  serviceKey: string,
  rows: T[],
): Promise<Array<T & TabletVisibilityAnnotation>> {
  if (!rows.length) return [];

  const serviceKeys = resolveServiceKeys(serviceKey);
  const ids = rows.map((r) => r.id);

  const [channelState, flagRows] = await Promise.all([
    resolveStoreTabletChannelState(dataSource, organizationId),
    dataSource.query(
      `SELECT opl.id,
              (opl.service_key = ANY($2::text[]))                                AS service_ok,
              (spo.id IS NOT NULL AND spo.is_active = true
                 AND spo.master_id IS NOT NULL AND s.status = 'ACTIVE')          AS offer_ok,
              EXISTS (
                SELECT 1 FROM organization_product_channels opc
                JOIN organization_channels oc ON oc.id = opc.channel_id
                WHERE opc.product_listing_id = opl.id AND opc.is_active = true
                  AND oc.channel_type = 'TABLET' AND oc.status = 'APPROVED'
              )                                                                  AS linked_approved,
              EXISTS (
                SELECT 1 FROM organization_product_channels opc
                JOIN organization_channels oc ON oc.id = opc.channel_id
                WHERE opc.product_listing_id = opl.id AND opc.is_active = true
                  AND oc.channel_type = 'TABLET'
              )                                                                  AS linked_any
         FROM organization_product_listings opl
         LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         LEFT JOIN neture_suppliers s ON s.id = spo.supplier_id
        WHERE opl.organization_id = $1 AND opl.id = ANY($3::uuid[])`,
      [organizationId, serviceKeys, ids],
    ) as Promise<Array<{
      id: string;
      service_ok: boolean;
      offer_ok: boolean;
      linked_approved: boolean;
      linked_any: boolean;
    }>>,
  ]);

  const byId = new Map(flagRows.map((r) => [String(r.id), r]));

  return rows.map((row) => {
    const f = byId.get(String(row.id));
    let reason: TabletVisibilityReason;
    if (!f) {
      reason = 'not_linked_to_channel';
    } else if (!f.service_ok) {
      reason = 'service_scope_mismatch';
    } else if (!f.offer_ok) {
      reason = 'offer_inactive';
    } else if (f.linked_approved) {
      reason = 'visible';
    } else if (!channelState.hasTabletChannel) {
      reason = 'no_tablet_channel';
    } else if (!channelState.hasApprovedTabletChannel) {
      reason = 'channel_not_approved';
    } else if (!f.linked_any) {
      reason = 'not_linked_to_channel';
    } else {
      // TABLET 채널에 연결돼 있으나 승인 채널 연결이 아니다(다른 채널 row 가 미승인).
      reason = 'channel_not_approved';
    }
    return { ...row, tabletVisible: reason === 'visible', tabletVisibilityReason: reason };
  });
}
