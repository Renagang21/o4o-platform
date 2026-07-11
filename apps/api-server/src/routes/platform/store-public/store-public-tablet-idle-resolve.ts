/**
 * 공개 태블릿 idle 항목 resolve (legacy + screen-set idle_media 통합)
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
 *   - screenSetIdleConfig 미지정(legacy) → 기존 동작 그대로: idle_playlist_items + operator common prepend.
 *   - 지정(screen-set idle_media block) → parseIdleMediaConfig + resolveIdleMediaItems(dual-read)로 override.
 *   기존 store_tablets.idle_playlist_items / operator selection 저장소는 **읽기만**(변경 없음).
 */
import type { DataSource } from 'typeorm';
import { parseIdleMediaConfig, resolveIdleMediaItems, type IdleMediaItem } from '../store-tablet-idle-block.js';
import { resolveServiceKeys } from './store-public-utils.js';

/** 뷰어 항목 {type,url,durationMs,...} ↔ IdleMediaItem {mediaType,url,durationMs} */
function toMediaItem(v: any): IdleMediaItem {
  const item: IdleMediaItem = { mediaType: v?.type, url: String(v?.url ?? '') };
  if (typeof v?.durationMs === 'number') item.durationMs = v.durationMs;
  return item;
}
function toViewerItem(m: IdleMediaItem): any {
  const out: any = { type: m.mediaType, url: m.url };
  if (m.durationMs !== undefined) out.durationMs = m.durationMs;
  return out;
}

export interface ResolvedTabletIdle {
  items: any[];
  operatorCommonSource: 'selected' | 'fallback' | null;
}

/**
 * @param screenSetIdleConfig  screen-set idle_media block config. undefined 이면 legacy 경로(불변).
 */
export async function resolveTabletIdleItems(
  dataSource: DataSource,
  tabletId: string,
  serviceKey: string,
  screenSetIdleConfig?: unknown,
): Promise<ResolvedTabletIdle> {
  // 1) 기존 매장 대기 재생목록 (읽기)
  const rows = await dataSource.query(
    `SELECT idle_playlist_items FROM store_tablets WHERE id = $1 LIMIT 1`,
    [tabletId],
  );
  const legacyItems: any[] = Array.isArray(rows?.[0]?.idle_playlist_items) ? rows[0].idle_playlist_items : [];

  // 2) 운영자 공통 영상(선택 → deterministic fallback) — 기존 정책 그대로 (읽기)
  const svcKeys = resolveServiceKeys(serviceKey);
  let picked: any = null;
  let operatorCommonSource: 'selected' | 'fallback' | null = null;
  const sel = await dataSource.query(
    `SELECT fc.id, fc.video_url AS "videoUrl", fc.source_type AS "sourceType",
            fc.tablet_duration_seconds AS "tabletDurationSeconds"
     FROM store_tablet_operator_idle_selections s
     JOIN signage_forced_content fc ON fc.id = s.forced_content_id
     WHERE s.tablet_id = $1 AND s.cleared_at IS NULL
       AND fc.service_key = ANY($2) AND fc.is_active = true AND fc.deleted_at IS NULL
       AND fc.target_surface IN ('tablet_idle','both')
       AND NOW() BETWEEN fc.start_at AND fc.end_at
     LIMIT 1`,
    [tabletId, svcKeys],
  );
  if (sel?.[0]) { picked = sel[0]; operatorCommonSource = 'selected'; }
  else {
    const cands = await dataSource.query(
      `SELECT fc.id, fc.video_url AS "videoUrl", fc.source_type AS "sourceType",
              fc.tablet_duration_seconds AS "tabletDurationSeconds"
       FROM signage_forced_content fc
       WHERE fc.service_key = ANY($1) AND fc.is_active = true AND fc.deleted_at IS NULL
         AND fc.target_surface IN ('tablet_idle','both')
         AND NOW() BETWEEN fc.start_at AND fc.end_at
       ORDER BY fc.id ASC`,
      [svcKeys],
    );
    if (cands.length > 0) {
      const seed = `${tabletId}:${new Date().toISOString().slice(0, 10)}`;
      let h = 0;
      for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
      picked = cands[h % cands.length];
      operatorCommonSource = 'fallback';
    }
  }
  const operatorItem =
    picked && (picked.sourceType === 'youtube' || picked.sourceType === 'vimeo')
      ? {
          type: picked.sourceType,
          url: picked.videoUrl,
          durationMs: picked.tabletDurationSeconds ? Number(picked.tabletDurationSeconds) * 1000 : 30000,
          source: 'operator_common',
          forcedContentId: picked.id,
          isOperatorCommon: true,
        }
      : null;

  // 3) screen-set idle_media override (있으면) — dual-read resolver
  if (screenSetIdleConfig !== undefined) {
    const parsed = parseIdleMediaConfig(screenSetIdleConfig);
    if (parsed.ok) {
      const resolved = resolveIdleMediaItems(parsed.value, {
        legacyIdlePlaylist: legacyItems.map(toMediaItem),
        operatorCommon: operatorItem ? [toMediaItem(operatorItem)] : [],
      });
      return {
        items: resolved.map(toViewerItem),
        operatorCommonSource: parsed.value.source === 'operator_common' && operatorItem ? operatorCommonSource : null,
      };
    }
    // parse 실패 → legacy 로 안전 폴백
  }

  // 4) legacy: operator common prepend (기존 동작 그대로)
  return {
    items: operatorItem ? [operatorItem, ...legacyItems] : legacyItems,
    operatorCommonSource,
  };
}
