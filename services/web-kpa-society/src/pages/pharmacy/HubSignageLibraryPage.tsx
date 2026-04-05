/**
 * HubSignageLibraryPage - 플랫폼 사이니지 라이브러리
 *
 * WO-O4O-HUB-SIGNAGE-INTEGRATION-V1
 *
 * Hub 공용공간에서 플랫폼이 제공하는 사이니지 미디어/플레이리스트를 탐색하고
 * "내 매장에 추가" 버튼으로 Asset Snapshot Copy를 실행하는 페이지.
 *
 * 전이 패턴 (CMS와 동일):
 *   /hub/signage 탐색
 *     → assetSnapshotApi.copy({ assetType: 'signage' })
 *     → o4o_asset_snapshots
 *     → /store/content?tab=signage 에서 관리
 *
 * 데이터 소스:
 *   - publicContentApi.listMedia()     : 공개 미디어 목록
 *   - publicContentApi.listPlaylists() : 공개 플레이리스트 목록
 *   - assetSnapshotApi.copy()          : 내 매장에 복사
 *
 * ❌ globalContentApi.cloneMedia/clonePlaylist 사용 금지
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본 (signage_media, signage_playlists)
 * 2. Store = snapshot 조합 (o4o_asset_snapshots → store_playlist_items)
 * 3. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로만 사용
 * 4. Playlist가 유일한 재생 단위 (store_playlists)
 * 5. 공개 렌더링: /public/signage?playlist=:id
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';
import { HUB_PRODUCER_TABS, type HubProducer } from '@o4o/hub-exploration-core';
import { HUB_PRODUCER_LABELS } from '@o4o/types/hub-content';
import { colors, borderRadius } from '../../styles/theme';

// ============================================
// 필터 정의
// ============================================

type ViewTab = 'media' | 'playlist';
type SourceFilter = 'all' | HubProducer;

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'media', label: '미디어' },
  { key: 'playlist', label: '플레이리스트' },
];

const PAGE_LIMIT = 20;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// ============================================
// 컴포넌트
// ============================================

export function HubSignageLibraryPage() {
  const [viewTab, setViewTab] = useState<ViewTab>('media');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Media state
  const [allMedia, setAllMedia] = useState<HubContentItemResponse[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Playlist state
  const [allPlaylists, setAllPlaylists] = useState<HubContentItemResponse[]>([]);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistLoading, setPlaylistLoading] = useState(true);

  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch media (HUB 통합 API)
  const fetchMedia = useCallback(async (page: number) => {
    setMediaLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: 'kpa-society',
        sourceDomain: 'signage-media',
        page,
        limit: PAGE_LIMIT,
      });
      if (res.success) {
        setAllMedia(res.data || []);
        setMediaTotal(res.pagination?.total || 0);
      } else {
        setAllMedia([]);
        setMediaTotal(0);
      }
    } catch {
      setError('미디어 목록을 불러오지 못했습니다.');
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Fetch playlists (HUB 통합 API)
  const fetchPlaylists = useCallback(async (page: number) => {
    setPlaylistLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: 'kpa-society',
        sourceDomain: 'signage-playlist',
        page,
        limit: PAGE_LIMIT,
      });
      if (res.success) {
        setAllPlaylists(res.data || []);
        setPlaylistTotal(res.pagination?.total || 0);
      } else {
        setAllPlaylists([]);
        setPlaylistTotal(0);
      }
    } catch {
      setError('플레이리스트 목록을 불러오지 못했습니다.');
    } finally {
      setPlaylistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia(mediaPage);
  }, [fetchMedia, mediaPage]);

  useEffect(() => {
    fetchPlaylists(playlistPage);
  }, [fetchPlaylists, playlistPage]);

  // Producer filtering (서버가 producer 필드를 제공 — 역매핑 불필요)
  const filteredMedia = useMemo(() => {
    if (sourceFilter === 'all') return allMedia;
    return allMedia.filter(m => m.producer === sourceFilter);
  }, [allMedia, sourceFilter]);

  const filteredPlaylists = useMemo(() => {
    if (sourceFilter === 'all') return allPlaylists;
    return allPlaylists.filter(p => p.producer === sourceFilter);
  }, [allPlaylists, sourceFilter]);

  // Counts for tabs
  const mediaTotalFiltered = sourceFilter === 'all' ? mediaTotal : filteredMedia.length;
  const playlistTotalFiltered = sourceFilter === 'all' ? playlistTotal : filteredPlaylists.length;

  // Copy handler (Asset Snapshot Copy — CMS와 동일 패턴)
  const handleCopy = async (sourceAssetId: string, name: string) => {
    if (copyingId) return;
    setCopyingId(sourceAssetId);
    setToast(null);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId,
        assetType: 'signage',
      });
      setToast({ type: 'success', message: `"${name}" 이(가) 내 매장에 추가되었습니다.` });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('DUPLICATE') || msg.includes('already')) {
        setToast({ type: 'error', message: '이미 매장에 추가된 항목입니다.' });
      } else {
        setToast({ type: 'error', message: '매장 추가에 실패했습니다.' });
      }
    } finally {
      setCopyingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleViewTabChange = (tab: ViewTab) => {
    setViewTab(tab);
  };

  const handleSourceChange = (source: SourceFilter) => {
    setSourceFilter(source);
  };

  const isLoading = viewTab === 'media' ? mediaLoading : playlistLoading;
  const mediaTotalPages = Math.max(1, Math.ceil(mediaTotal / PAGE_LIMIT));
  const playlistTotalPages = Math.max(1, Math.ceil(playlistTotal / PAGE_LIMIT));

  return (
    <div style={styles.container}>
      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>플랫폼 사이니지</h1>
        <p style={styles.heroDesc}>
          디지털 사이니지 미디어와 플레이리스트를 탐색하고 내 매장에 추가합니다.
        </p>
      </header>

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* View Tabs (미디어 / 플레이리스트) */}
      <div style={styles.viewTabBar}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleViewTabChange(tab.key)}
            style={{
              ...styles.viewTab,
              ...(viewTab === tab.key ? styles.viewTabActive : {}),
            }}
          >
            {tab.label}
            <span style={styles.viewTabCount}>
              {tab.key === 'media' ? mediaTotalFiltered : playlistTotalFiltered}
            </span>
          </button>
        ))}
      </div>

      {/* Source Filters (HUB 통합 Producer 탭) */}
      <div style={styles.filterBar}>
        {HUB_PRODUCER_TABS.map(f => (
          <button
            key={f.key}
            onClick={() => handleSourceChange(f.key as SourceFilter)}
            style={{
              ...styles.filterTab,
              ...(sourceFilter === f.key ? styles.filterTabActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button
            onClick={() => viewTab === 'media' ? fetchMedia(mediaPage) : fetchPlaylists(playlistPage)}
            style={styles.retryButton}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Content */}
      {!error && isLoading ? (
        <div style={styles.emptyState}>목록을 불러오는 중...</div>
      ) : !error && viewTab === 'media' ? (
        filteredMedia.length === 0 ? (
          <div style={styles.emptyState}>
            {sourceFilter === 'all'
              ? '현재 제공되는 사이니지 미디어가 없습니다.'
              : `"${HUB_PRODUCER_TABS.find(f => f.key === sourceFilter)?.label}" 출처의 미디어가 없습니다.`}
          </div>
        ) : (
          <>
            <div style={styles.resultCount}>
              미디어 {mediaTotalFiltered}건
            </div>
            {/* Simple list (no video thumbnail preview) */}
            <div style={styles.listContainer}>
              {filteredMedia.map(media => {
                const isCopying = copyingId === media.id;
                const producerLabel = media.producer ? HUB_PRODUCER_LABELS[media.producer] : '';
                const mediaTypeLabel = media.mediaType
                  ? (SIGNAGE_MEDIA_TYPE_LABELS[media.mediaType as keyof typeof SIGNAGE_MEDIA_TYPE_LABELS] || media.mediaType)
                  : '';

                return (
                  <div key={media.id} style={styles.listRow}>
                    <div style={styles.listIcon}>🖥️</div>
                    <div style={styles.listContent}>
                      <div style={styles.listTitleRow}>
                        <span style={styles.listTitle}>{media.title}</span>
                        <div style={styles.listBadges}>
                          {mediaTypeLabel && (
                            <span style={styles.mediaTypeBadge}>{mediaTypeLabel}</span>
                          )}
                          {producerLabel && (
                            <span style={styles.sourceBadge}>{producerLabel}</span>
                          )}
                        </div>
                      </div>
                      <div style={styles.listMeta}>
                        {media.duration != null && media.duration > 0 && (
                          <span>{formatDuration(media.duration)}</span>
                        )}
                        <span>{new Date(media.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(media.id, media.title)}
                      disabled={isCopying}
                      style={{
                        ...styles.copyButton,
                        opacity: isCopying ? 0.6 : 1,
                        cursor: isCopying ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {isCopying ? '추가 중...' : '내 매장에 추가'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {mediaTotalPages > 1 && sourceFilter === 'all' && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setMediaPage(p => Math.max(1, p - 1))}
                  disabled={mediaPage <= 1}
                  style={{
                    ...styles.pageButton,
                    opacity: mediaPage <= 1 ? 0.4 : 1,
                    cursor: mediaPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  &laquo; 이전
                </button>
                <span style={styles.pageInfo}>{mediaPage} / {mediaTotalPages}</span>
                <button
                  onClick={() => setMediaPage(p => p + 1)}
                  disabled={mediaPage >= mediaTotalPages}
                  style={{
                    ...styles.pageButton,
                    opacity: mediaPage >= mediaTotalPages ? 0.4 : 1,
                    cursor: mediaPage >= mediaTotalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  다음 &raquo;
                </button>
              </div>
            )}
          </>
        )
      ) : !error && viewTab === 'playlist' ? (
        filteredPlaylists.length === 0 ? (
          <div style={styles.emptyState}>
            {sourceFilter === 'all'
              ? '현재 제공되는 플레이리스트가 없습니다.'
              : `"${HUB_PRODUCER_TABS.find(f => f.key === sourceFilter)?.label}" 출처의 플레이리스트가 없습니다.`}
          </div>
        ) : (
          <>
            <div style={styles.resultCount}>
              플레이리스트 {playlistTotalFiltered}건
            </div>
            {/* Simple list (no thumbnail preview) */}
            <div style={styles.listContainer}>
              {filteredPlaylists.map(pl => {
                const isCopying = copyingId === pl.id;
                const producerLabel = pl.producer ? HUB_PRODUCER_LABELS[pl.producer] : '';

                return (
                  <div key={pl.id} style={styles.listRow}>
                    <div style={styles.listIcon}>📋</div>
                    <div style={styles.listContent}>
                      <div style={styles.listTitleRow}>
                        <span style={styles.listTitle}>{pl.title}</span>
                        <div style={styles.listBadges}>
                          <span style={styles.playlistBadge}>플레이리스트</span>
                          {producerLabel && (
                            <span style={styles.sourceBadge}>{producerLabel}</span>
                          )}
                        </div>
                      </div>
                      {pl.description && (
                        <p style={styles.listDesc}>{pl.description}</p>
                      )}
                      <div style={styles.listMeta}>
                        <span>{pl.itemCount ?? 0}개 항목</span>
                        {(pl.totalDuration ?? 0) > 0 && (
                          <span> · {formatDuration(pl.totalDuration!)}</span>
                        )}
                        <span>{new Date(pl.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(pl.id, pl.title)}
                      disabled={isCopying}
                      style={{
                        ...styles.copyButton,
                        opacity: isCopying ? 0.6 : 1,
                        cursor: isCopying ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {isCopying ? '추가 중...' : '내 매장에 추가'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {playlistTotalPages > 1 && sourceFilter === 'all' && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setPlaylistPage(p => Math.max(1, p - 1))}
                  disabled={playlistPage <= 1}
                  style={{
                    ...styles.pageButton,
                    opacity: playlistPage <= 1 ? 0.4 : 1,
                    cursor: playlistPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  &laquo; 이전
                </button>
                <span style={styles.pageInfo}>{playlistPage} / {playlistTotalPages}</span>
                <button
                  onClick={() => setPlaylistPage(p => p + 1)}
                  disabled={playlistPage >= playlistTotalPages}
                  style={{
                    ...styles.pageButton,
                    opacity: playlistPage >= playlistTotalPages ? 0.4 : 1,
                    cursor: playlistPage >= playlistTotalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  다음 &raquo;
                </button>
              </div>
            )}
          </>
        )
      ) : null}

      {/* Guide notice */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          추가된 사이니지 자산은{' '}
          <Link to="/store/content?tab=signage" style={{ color: colors.primary }}>내 매장 &gt; 자산 관리 &gt; 사이니지</Link>
          에서 게시 상태를 관리할 수 있습니다.
        </span>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },

  // Breadcrumb
  breadcrumb: {
    marginBottom: '16px',
  },
  breadcrumbLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },

  // Hero
  hero: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  heroDesc: {
    margin: '8px 0 0',
    fontSize: '0.95rem',
    color: colors.neutral500,
  },

  // Toast
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.875rem',
    marginBottom: '16px',
  },

  // View tabs (media / playlist)
  viewTabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
    borderBottom: `2px solid ${colors.neutral200}`,
  },
  viewTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  viewTabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
    fontWeight: 600,
  },
  viewTabCount: {
    fontSize: '0.75rem',
    padding: '1px 6px',
    backgroundColor: colors.neutral100,
    borderRadius: '10px',
    color: colors.neutral500,
  },

  // Source filter
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: '#fff',
  },

  // Result count
  resultCount: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: '12px',
  },

  // List view (replaces card grid — no video thumbnail preview)
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    marginBottom: '24px',
    backgroundColor: colors.neutral200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    border: `1px solid ${colors.neutral200}`,
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    backgroundColor: colors.white,
  },
  listIcon: {
    fontSize: '20px',
    flexShrink: 0,
    width: '32px',
    textAlign: 'center' as const,
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  listTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  listTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: colors.neutral900,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  listDesc: {
    margin: '4px 0 0',
    fontSize: '0.8125rem',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  mediaTypeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '4px',
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
  },
  playlistBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '4px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '0.625rem',
    fontWeight: 500,
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  copyButton: {
    padding: '5px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    transition: 'opacity 0.15s',
  },

  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  pageButton: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },

  // Empty / Error
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '0.9rem',
    color: colors.neutral400,
  },
  errorState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#dc2626',
    fontSize: '0.9rem',
  },
  retryButton: {
    marginTop: '12px',
    padding: '6px 16px',
    fontSize: '0.8125rem',
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
    marginTop: '24px',
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
