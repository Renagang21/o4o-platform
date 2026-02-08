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

export function SignageSection() {
  const [media, setMedia] = useState<HomeMedia[]>([]);
  const [playlists, setPlaylists] = useState<HomePlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeApi.getSignage(6, 4)
      .then((res) => {
        if (res.data) {
          setMedia(res.data.media || []);
          setPlaylists(res.data.playlists || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasContent = media.length > 0 || playlists.length > 0;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>디지털 사이니지</h2>
        <Link to="/signage" style={styles.moreLink}>더보기</Link>
      </div>
      <div style={styles.card}>
        {loading ? (
          <p style={styles.empty}>불러오는 중...</p>
        ) : !hasContent ? (
          <p style={styles.empty}>등록된 콘텐츠가 없습니다</p>
        ) : (
          <div>
            {media.length > 0 && (
              <div>
                <h3 style={styles.subTitle}>최신 미디어</h3>
                <div style={styles.mediaGrid}>
                  {media.map((item) => (
                    <div key={item.id} style={styles.mediaCard}>
                      <div style={styles.mediaThumbnail}>
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            style={styles.thumbnailImg}
                          />
                        ) : (
                          <div style={styles.thumbnailPlaceholder}>
                            <MediaIcon type={item.mediaType} />
                          </div>
                        )}
                        {item.duration != null && item.duration > 0 && (
                          <span style={styles.duration}>
                            {formatDuration(item.duration)}
                          </span>
                        )}
                      </div>
                      <p style={styles.mediaName}>{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playlists.length > 0 && (
              <div style={media.length > 0 ? { marginTop: spacing.lg } : undefined}>
                <h3 style={styles.subTitle}>플레이리스트</h3>
                <ul style={styles.playlistList}>
                  {playlists.map((pl) => (
                    <li key={pl.id} style={styles.playlistItem}>
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

function MediaIcon({ type }: { type: string }) {
  if (type === 'youtube' || type === 'video') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
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
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
  },
  mediaCard: {
    overflow: 'hidden',
  },
  mediaThumbnail: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
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
  duration: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    padding: '1px 6px',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: colors.white,
    fontSize: '0.7rem',
  },
  mediaName: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    padding: `${spacing.sm} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
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
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
