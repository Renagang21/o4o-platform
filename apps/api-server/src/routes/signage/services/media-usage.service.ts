/**
 * Signage Media Usage Service — canonical 사용처 계산기
 *
 * WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1
 *
 * 사이니지 미디어 1건이 실제로 사용 중인지 단일 진입점에서 계산한다.
 * 삭제(hard/soft) 가드가 CASCADE 에 기대지 않고 이 결과로 차단하기 위한 SSOT.
 *
 * 계산 범위 (2 direct block paths):
 *   1. HQ 직접 참조 — signage_playlist_items."mediaId" = mediaId (FK onDelete CASCADE)
 *        → 하드 삭제 시 playlist item 이 조용히 사라지므로 사용 중이면 차단.
 *   2. 매장 Full-Copy snapshot — o4o_asset_snapshots.source_asset_id = mediaId (asset_type='signage')
 *        → snapshot 을 store_playlist_items.snapshot_id 가 참조(비-FK)하면 매장 재생 사용 중.
 *        → 이 snapshot 을 지우면 store_playlist_items.snapshot_id 가 dangling 되므로 차단.
 *
 * 차단 사유가 아닌 항목(참고 표시만):
 *   - signage_media_tags (태그) — additive 메타, 삭제 차단 사유 아님.
 *   - signage_forced_content — video_url 독립 복사(미디어 FK 없음) → 원본 삭제 무영향.
 *   - signage_schedules — playlistId 참조(미디어 직접 참조 아님) → playlist 사용처로 이미 커버.
 *
 * 정책: soft-deleted(signage_playlists."deletedAt" IS NOT NULL) 플레이리스트는
 *   재생되지 않으므로 "사용 중" 집계에서 제외(차단 대상 아님).
 */
import type { DataSource } from 'typeorm';

/** DataSource 와 트랜잭션 EntityManager 가 공통으로 노출하는 raw SQL 실행기. */
export interface SqlExecutor {
  query(sql: string, params?: unknown[]): Promise<any>;
}

export interface HqPlaylistUsage {
  playlistId: string;
  playlistName: string;
  itemCount: number;
  status?: string;
  source?: string;
  scope?: string;
}

export interface StorePlaylistUsage {
  storeId: string;
  storeName?: string | null;
  playlistId: string;
  playlistName?: string | null;
  snapshotId: string;
  itemCount: number;
}

export interface MediaUsageResult {
  mediaId: string;
  inUse: boolean;
  directPlaylistUsageCount: number;
  snapshotCount: number; // 이 미디어에서 파생된 전체 snapshot 수 (참조 여부 무관)
  referencedSnapshotCount: number; // store_playlist_items 가 참조 중인 snapshot 수
  storePlaylistUsageCount: number;
  storeCount: number;
  tagCount: number; // 참고용 — 차단 사유 아님
  usages: {
    hqPlaylists: HqPlaylistUsage[];
    storePlaylists: StorePlaylistUsage[];
  };
}

export class SignageMediaUsageService {
  constructor(private dataSource: DataSource) {}

  /**
   * 미디어 1건의 사용처를 계산한다. (read-only)
   * inUse = 직접 HQ playlist 사용 OR 매장 snapshot 참조 사용.
   *
   * @param exec 선택적 SQL 실행기. 삭제 트랜잭션 내부에서 재검사할 때
   *   트랜잭션 EntityManager 를 넘겨 동일 트랜잭션·락 컨텍스트에서 계산한다.
   *   미지정 시 DataSource 로 실행(단순 조회).
   */
  async computeUsage(mediaId: string, exec?: SqlExecutor): Promise<MediaUsageResult> {
    const db: SqlExecutor = exec ?? this.dataSource;
    // 1. HQ 직접 참조 (비-삭제 playlist 만 blocking usage 로 집계)
    const hqRows: Array<{
      playlist_id: string;
      playlist_name: string;
      status: string;
      source: string;
      scope: string;
      item_count: string | number;
    }> = await db.query(
      `SELECT pi."playlistId"    AS playlist_id,
              p.name             AS playlist_name,
              p.status           AS status,
              p.source           AS source,
              p.scope            AS scope,
              COUNT(*)::int      AS item_count
         FROM signage_playlist_items pi
         JOIN signage_playlists p
           ON p.id = pi."playlistId" AND p."deletedAt" IS NULL
        WHERE pi."mediaId" = $1
        GROUP BY pi."playlistId", p.name, p.status, p.source, p.scope
        ORDER BY p.name`,
      [mediaId],
    );

    const hqPlaylists: HqPlaylistUsage[] = hqRows.map((r) => ({
      playlistId: r.playlist_id,
      playlistName: r.playlist_name,
      itemCount: Number(r.item_count),
      status: r.status,
      source: r.source,
      scope: r.scope,
    }));

    // 2. 매장 Full-Copy snapshot 참조 (store_playlist_items 가 참조 중인 것만 blocking)
    const storeRows: Array<{
      store_id: string;
      store_name: string | null;
      playlist_id: string;
      playlist_name: string | null;
      snapshot_id: string;
      item_count: string | number;
    }> = await db.query(
      `SELECT s.organization_id  AS store_id,
              o.name             AS store_name,
              spi.playlist_id    AS playlist_id,
              sp.name            AS playlist_name,
              spi.snapshot_id    AS snapshot_id,
              COUNT(*)::int      AS item_count
         FROM o4o_asset_snapshots s
         JOIN store_playlist_items spi ON spi.snapshot_id = s.id
         JOIN store_playlists sp       ON sp.id = spi.playlist_id
         LEFT JOIN organizations o     ON o.id = s.organization_id
        WHERE s.source_asset_id = $1 AND s.asset_type = 'signage'
        GROUP BY s.organization_id, o.name, spi.playlist_id, sp.name, spi.snapshot_id
        ORDER BY sp.name`,
      [mediaId],
    );

    const storePlaylists: StorePlaylistUsage[] = storeRows.map((r) => ({
      storeId: r.store_id,
      storeName: r.store_name,
      playlistId: r.playlist_id,
      playlistName: r.playlist_name,
      snapshotId: r.snapshot_id,
      itemCount: Number(r.item_count),
    }));

    // snapshot 전체 수 (참조 여부 무관) — orphan snapshot 정리 판단용
    const snapCountRows: Array<{ cnt: string | number }> = await db.query(
      `SELECT COUNT(*)::int AS cnt
         FROM o4o_asset_snapshots
        WHERE source_asset_id = $1 AND asset_type = 'signage'`,
      [mediaId],
    );
    const snapshotCount = Number(snapCountRows?.[0]?.cnt ?? 0);

    // 태그 수 (참고용, 차단 사유 아님).
    //   태그는 signage_media.tags(text[] 배열) 컬럼에 저장된다.
    //   (별도 signage_media_tags 테이블은 migration 20260417100000 에서 DROP 됨)
    const tagCountRows: Array<{ cnt: string | number }> = await db.query(
      `SELECT COALESCE(array_length(tags, 1), 0)::int AS cnt
         FROM signage_media WHERE id = $1`,
      [mediaId],
    );
    const tagCount = Number(tagCountRows?.[0]?.cnt ?? 0);

    const referencedSnapshotIds = new Set(storePlaylists.map((s) => s.snapshotId));
    const storeIds = new Set(storePlaylists.map((s) => s.storeId));
    const storePlaylistIds = new Set(storePlaylists.map((s) => s.playlistId));

    const directPlaylistUsageCount = hqPlaylists.length;
    const storePlaylistUsageCount = storePlaylistIds.size;

    const inUse = directPlaylistUsageCount > 0 || referencedSnapshotIds.size > 0;

    return {
      mediaId,
      inUse,
      directPlaylistUsageCount,
      snapshotCount,
      referencedSnapshotCount: referencedSnapshotIds.size,
      storePlaylistUsageCount,
      storeCount: storeIds.size,
      tagCount,
      usages: { hqPlaylists, storePlaylists },
    };
  }

  /** 409 응답에 실을 요약 카운트. */
  static toSummary(usage: MediaUsageResult): {
    hqPlaylists: number;
    storePlaylists: number;
    stores: number;
  } {
    return {
      hqPlaylists: usage.directPlaylistUsageCount,
      storePlaylists: usage.storePlaylistUsageCount,
      stores: usage.storeCount,
    };
  }
}
