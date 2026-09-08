/**
 * 공개 태블릿 idle 항목 resolve (legacy + screen-set idle_media 통합)
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
 *   - screenSetIdleConfig 미지정(legacy) → 기존 동작 그대로: idle_playlist_items + operator common prepend.
 *   - 지정(screen-set idle_media block) → parseIdleMediaConfig + resolveIdleMediaItems(dual-read)로 override.
 *   기존 store_tablets.idle_playlist_items / operator selection 저장소는 **읽기만**(변경 없음).
 *
 * WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1 §7 — idle 단일 계약
 *   이 함수가 idle 의 **유일한 resolve 지점**이다(`/:slug/tablet/idle` 와 screen-set resolver 가 모두 경유).
 *   남아 있던 "이중 구조"는 저장소가 둘이라는 뜻이 아니라 **같은 의미의 두 경로가 다른 결과**를 냈다는 뜻이었다:
 *     config 없음               → [operator common, ...legacy playlist]
 *     config source=legacy_...  → [...legacy playlist]           ← operator common 유실
 *   §7 에서 두 경로를 일치시켰다. 소스별 계약은 아래 한 표로 고정한다.
 *
 *     source                | 기준 목록                    | operator common
 *     ----------------------|------------------------------|----------------------------
 *     (config 없음)         | store_tablets.idle_playlist  | prepend
 *     legacy_idle_playlist  | store_tablets.idle_playlist  | prepend (§7 에서 정렬)
 *     operator_common       | operator common              | 그 자체가 목록 (prepend 안 함)
 *     custom_media          | block config.items           | prepend 안 함 (명시 선택 존중)
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
      // WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1 §7 — idle 이중 구조 비대칭 해소
      //
      //   `source='legacy_idle_playlist'` 는 "이 태블릿의 기존 대기 재생목록을 쓴다" 는 뜻이지
      //   "운영자 공통 영상을 뺀다" 는 뜻이 아니다. 그런데 기존 구현은 이 경우 base 를
      //   legacy 목록으로만 채워 **운영자 공통 prepend 를 조용히 잃었다** — 아래 4)번
      //   legacy 경로(config 없음)가 `[operatorItem, ...legacyItems]` 인 것과 어긋난다.
      //   같은 의미의 두 경로가 다른 결과를 내던 것이 이 축의 "이중 구조"였다.
      //
      //   여기서 두 경로의 결과를 일치시킨다. `operator_common` / `custom_media` 는
      //   운영자·매장이 **명시 선택**한 소스이므로 prepend 대상이 아니다(중복 방지).
      //   프로덕션 실측(2026-09-08): tablet_idle 강제 콘텐츠 0건 → 현재 관측 변화 없음.
      const prependOperator =
        parsed.value.source === 'legacy_idle_playlist' && operatorItem !== null;
      const items = prependOperator
        ? [operatorItem, ...resolved.map(toViewerItem)]
        : resolved.map(toViewerItem);
      return {
        items,
        operatorCommonSource:
          (parsed.value.source === 'operator_common' || prependOperator) && operatorItem
            ? operatorCommonSource
            : null,
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
