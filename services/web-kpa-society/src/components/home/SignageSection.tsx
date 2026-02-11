/**
 * SignageSection - 디지털 사이니지 미리보기 섹션
 *
 * WO-KPA-HOME-PHASE1-V1: 메인 페이지 사이니지 콘텐츠 요약
 * homeApi.getSignage() → signage_media + signage_playlists 표시
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { HomeMedia, HomePlaylist } from '../../api/home';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';
import { getMediaThumbnailUrl } from '@o4o/types/signage';
import { PlaceholderImage } from '../common';

// CSS for hover effects + responsive grid (inline styles don't support :hover / @media)
const hoverStyles = `
  .signage-media-item:hover {
    background-color: ${colors.neutral50};
  }
  .signage-playlist-item:hover {
    background-color: ${colors.neutral50};
  }
  .signage-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: ${spacing.lg};
  }
  @media (min-width: 768px) {
    .signage-grid {
      grid-template-columns: 1fr 1fr;
    }
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

  // Inject hover styles
  useEffect(() => {
    const styleId = 'signage-section-hover-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = hoverStyles;
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
    // Fallback: 독립 사용 시 자체 호출
    homeApi.getSignage(3, 2)
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
      <div style={styles.card}>
        {isLoading ? (
          <p style={styles.empty}>불러오는 중...</p>
        ) : !hasContent ? (
          <div style={styles.emptyWrap}>
            <p style={styles.empty}>사이니지 콘텐츠가 준비 중입니다.</p>
            <p style={styles.emptyHint}>디지털 사이니지로 약국을 꾸며보세요.</p>
          </div>
        ) : (
          <div className="signage-grid">
            {media.length > 0 && (
              <div>
                <h3 style={styles.subTitle}>동영상</h3>
                <ul style={styles.mediaList}>
                  {media.map((item) => {
                    const thumbnailUrl = getMediaThumbnailUrl(item);
                    return (
                      <li key={item.id}>
                        <Link
                          to={`/signage/media/${item.id}`}
                          style={styles.mediaItem}
                          className="signage-media-item"
                        >
                          <div style={styles.mediaThumbSmall}>
                            <MediaThumbnail url={thumbnailUrl} name={item.name} mediaType={item.mediaType} />
                          </div>
                          <div style={styles.mediaInfo}>
                            <span style={styles.mediaItemName}>{item.name}</span>
                            {item.duration != null && item.duration > 0 && (
                              <span style={styles.mediaDuration}>{formatDuration(item.duration)}</span>
                            )}
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.neutral400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {playlists.length > 0 && (
              <div>
                <h3 style={styles.subTitle}>플레이리스트</h3>
                <ul style={styles.playlistList}>
                  {playlists.map((pl) => (
                    <li key={pl.id}>
                      <Link
                        to={`/signage/playlist/${pl.id}`}
                        style={styles.playlistItem}
                        className="signage-playlist-item"
                      >
                        <div style={styles.playlistIcon}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                          </svg>
                        </div>
                        <div style={styles.playlistInfo}>
                          <span style={styles.playlistName}>{pl.name}</span>
                          <span style={styles.playlistMeta}>
                            {pl.itemCount}개 항목
                            {pl.totalDuration > 0 && ` · ${formatDuration(pl.totalDuration)}`}
                          </span>
                        </div>
                        {/* Arrow indicator */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.neutral400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MediaThumbnail({ url, name, mediaType }: { url: string | null; name: string; mediaType: string }) {
  const [failed, setFailed] = useState(false);
  const variant = (mediaType === 'youtube' || mediaType === 'video') ? 'video' : 'photo';

  if (!url || failed) {
    return (
      <div style={styles.thumbnailPlaceholder}>
        <PlaceholderImage variant={variant} style={{ borderRadius: 0 }} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      style={styles.thumbnailImg}
      onError={() => setFailed(true)}
    />
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
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  subTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    margin: `0 0 ${spacing.sm}`,
  },
  mediaList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  mediaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginLeft: `-${spacing.sm}`,
    marginRight: `-${spacing.sm}`,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  mediaThumbSmall: {
    flexShrink: 0,
    width: '48px',
    height: '32px',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.neutral100,
    position: 'relative',
  },
  thumbnailImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral400,
  },
  mediaInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaItemName: {
    fontSize: '0.875rem',
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mediaDuration: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    whiteSpace: 'nowrap',
    marginLeft: spacing.sm,
  },
  playlistList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  playlistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginLeft: `-${spacing.sm}`,
    marginRight: `-${spacing.sm}`,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  playlistIcon: {
    flexShrink: 0,
    color: colors.neutral400,
    display: 'flex',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: '0.875rem',
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  playlistMeta: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    whiteSpace: 'nowrap',
    marginLeft: spacing.sm,
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
