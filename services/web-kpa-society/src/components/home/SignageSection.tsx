/**
 * SignageSection - 디지털 사이니지 미리보기 섹션
 *
 * WO-KPA-HOME-PHASE1-V1: 메인 페이지 사이니지 콘텐츠 요약
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1: 세로 리스트 → 가로 카드 + 썸네일
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { HomeMedia, HomePlaylist } from '../../api/home';
import { getMediaThumbnailUrl } from '@o4o/types/signage';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const scrollStyles = `
  .signage-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .signage-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .signage-scroll::-webkit-scrollbar-thumb {
    background: ${colors.neutral200};
    border-radius: 3px;
  }
  .signage-media-card:hover {
    border-color: ${colors.neutral300};
    box-shadow: ${shadows.md};
  }
  .signage-playlist-card:hover {
    border-color: ${colors.neutral300};
    box-shadow: ${shadows.md};
  }
`;

interface Props {
  prefetchedMedia?: HomeMedia[];
  prefetchedPlaylists?: HomePlaylist[];
  loading?: boolean;
}

export function SignageSection({ prefetchedMedia, prefetchedPlaylists, loading: parentLoading }: Props) {
  const [media, setMedia] = useState<HomeMedia[]>([]);
  const [playlists, setPlaylists] = useState<HomePlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const styleId = 'signage-section-hover-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = scrollStyles;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (prefetchedMedia && prefetchedPlaylists) {
      setMedia(prefetchedMedia);
      setPlaylists(prefetchedPlaylists);
      setLoading(false);
      return;
    }
    homeApi.getSignage(5, 5)
      .then((res) => {
        if (res.data) {
          setMedia(res.data.media || []);
          setPlaylists(res.data.playlists || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedMedia, prefetchedPlaylists]);

  const isLoading = parentLoading ?? loading;
  const hasContent = media.length > 0 || playlists.length > 0;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>디지털 사이니지</h2>
        <Link to="/signage" style={styles.moreLink}>사이니지 콘텐츠 보기 →</Link>
      </div>

      {isLoading ? (
        <div style={styles.card}>
          <p style={styles.empty}>불러오는 중...</p>
        </div>
      ) : !hasContent ? (
        <div style={styles.card}>
          <div style={styles.emptyWrap}>
            <p style={styles.empty}>사이니지 콘텐츠가 준비 중입니다.</p>
            <p style={styles.emptyHint}>디지털 사이니지로 약국을 꾸며보세요.</p>
          </div>
        </div>
      ) : (
        <>
          {/* 동영상 가로 스크롤 */}
          {media.length > 0 && (
            <div>
              <h3 style={styles.subTitle}>동영상</h3>
              <div className="signage-scroll" style={styles.scrollRow}>
                {media.slice(0, 5).map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* 플레이리스트 가로 스크롤 */}
          {playlists.length > 0 && (
            <div style={media.length > 0 ? { marginTop: spacing.lg } : undefined}>
              <h3 style={styles.subTitle}>플레이리스트</h3>
              <div className="signage-scroll" style={styles.scrollRow}>
                {playlists.slice(0, 5).map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MediaCard({ item }: { item: HomeMedia }) {
  const thumbnailUrl = getMediaThumbnailUrl(item);

  return (
    <div className="signage-media-card" style={styles.mediaCard}>
      <div style={styles.thumbnailWrap}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.name}
            style={styles.thumbnail}
            loading="lazy"
          />
        ) : (
          <div style={styles.thumbnailPlaceholder}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        {item.duration != null && item.duration > 0 && (
          <span style={styles.durationBadge}>{formatDuration(item.duration)}</span>
        )}
      </div>
      <p style={styles.mediaCardName}>{item.name}</p>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: HomePlaylist }) {
  return (
    <div className="signage-playlist-card" style={styles.playlistCard}>
      <div style={styles.playlistIconWrap}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </div>
      <p style={styles.playlistCardName}>{playlist.name}</p>
      <p style={styles.playlistCardMeta}>
        {playlist.itemCount}개 항목
        {playlist.totalDuration > 0 && ` · ${formatDuration(playlist.totalDuration)}`}
      </p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  subTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    margin: `0 0 ${spacing.sm}`,
  },
  scrollRow: {
    display: 'flex',
    gap: spacing.md,
    overflowX: 'auto',
    paddingBottom: spacing.sm,
    WebkitOverflowScrolling: 'touch' as any,
  },
  // Media card
  mediaCard: {
    flex: '0 0 180px',
    minWidth: '180px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  thumbnailWrap: {
    position: 'relative',
    width: '100%',
    height: '100px',
    backgroundColor: colors.neutral100,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral400,
  },
  durationBadge: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: colors.white,
    fontSize: '0.6875rem',
    borderRadius: borderRadius.sm,
    fontVariantNumeric: 'tabular-nums',
  },
  mediaCardName: {
    padding: `${spacing.sm}`,
    margin: 0,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Playlist card
  playlistCard: {
    flex: '0 0 180px',
    minWidth: '180px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral100}`,
    padding: spacing.md,
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  playlistIconWrap: {
    color: colors.neutral400,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
  },
  playlistCardName: {
    margin: 0,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  playlistCardMeta: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  // Empty states
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  emptyWrap: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    margin: 0,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: '0.8rem',
    margin: `${spacing.xs} 0 0`,
  },
};
