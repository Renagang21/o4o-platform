/**
 * SignagePreviewSection — Shared signage preview UI
 *
 * WO-SHARED-SPACE-SIGNAGE-COMPONENT-V1
 *
 * 2-column layout (Media + Playlist), KPA reference design.
 * Horizontal scroll cards with thumbnails, duration badges.
 * Data fetch is done in the parent — this is presentation only.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SignagePreviewSectionProps, SignageMediaItem, SignagePlaylistItem } from './types';

/* ─── Style injection (responsive grid + scrollbar + hover) ─── */

const injectedStyles = `
  .signage-preview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (max-width: 640px) {
    .signage-preview-grid {
      grid-template-columns: 1fr;
    }
  }
  .signage-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .signage-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .signage-scroll::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 3px;
  }
  .signage-media-card:hover {
    border-color: #cbd5e1 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .signage-playlist-card:hover {
    border-color: #cbd5e1 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
`;

/* ─── Main Component ─── */

export function SignagePreviewSection(props: SignagePreviewSectionProps) {
  const {
    title = '디지털 사이니지',
    mediaLabel = '동영상',
    playlistLabel = '플레이리스트',
    mediaItems,
    playlistItems,
    loading = false,
    emptyMessage = '사이니지 콘텐츠가 준비 중입니다.',
    emptyHint = '디지털 사이니지로 매장을 꾸며보세요.',
    viewAllHref,
    viewAllLabel = '사이니지 콘텐츠 보기 →',
    accentColor = '#2563EB',
  } = props;

  useEffect(() => {
    const styleId = 'signage-preview-styles';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = injectedStyles;
      document.head.appendChild(el);
    }
  }, []);

  const hasContent = mediaItems.length > 0 || playlistItems.length > 0;

  return (
    <section style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {viewAllHref && (
          <Link to={viewAllHref} style={{ ...styles.viewAllLink, color: accentColor }}>
            {viewAllLabel}
          </Link>
        )}
      </div>

      {loading ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyText}>불러오는 중...</p>
        </div>
      ) : !hasContent ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyWrap}>
            <p style={styles.emptyText}>{emptyMessage}</p>
            {emptyHint && <p style={styles.emptyHintText}>{emptyHint}</p>}
          </div>
        </div>
      ) : (
        <div className="signage-preview-grid">
          {/* Media Column */}
          <div>
            <h3 style={styles.subTitle}>{mediaLabel}</h3>
            {mediaItems.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={styles.emptyText}>등록된 사이니지 미디어가 없습니다.</p>
              </div>
            ) : (
              <div className="signage-scroll" style={styles.scrollRow}>
                {mediaItems.map((item) => (
                  <MediaCard key={item.id} item={item} accentColor={accentColor} />
                ))}
              </div>
            )}
          </div>

          {/* Playlist Column */}
          <div>
            <h3 style={styles.subTitle}>{playlistLabel}</h3>
            {playlistItems.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={styles.emptyText}>플레이리스트가 없습니다.</p>
              </div>
            ) : (
              <div className="signage-scroll" style={styles.scrollRow}>
                {playlistItems.map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Sub-components ─── */

function MediaCard({ item, accentColor }: { item: SignageMediaItem; accentColor: string }) {
  return (
    <div className="signage-media-card" style={styles.mediaCard}>
      <div style={styles.thumbnailWrap}>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} style={styles.thumbnail} loading="lazy" />
        ) : (
          <div style={styles.thumbnailPlaceholder}>
            <PlayIcon />
          </div>
        )}
        {item.duration != null && item.duration > 0 && (
          <span style={styles.durationBadge}>{formatDuration(item.duration)}</span>
        )}
      </div>
      <div style={styles.mediaCardBody}>
        <p style={styles.mediaCardName}>{item.title}</p>
        {item.href && item.actionLabel && (
          <Link to={item.href} style={{ ...styles.actionLink, color: accentColor }}>
            {item.actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: SignagePlaylistItem }) {
  return (
    <div className="signage-playlist-card" style={styles.playlistCard}>
      <div style={styles.playlistIconWrap}>
        <ListIcon />
      </div>
      <p style={styles.playlistCardName}>{playlist.name}</p>
      <p style={styles.playlistCardMeta}>
        {playlist.itemCount != null && `${playlist.itemCount}개 항목`}
        {playlist.itemCount != null && playlist.totalDuration != null && playlist.totalDuration > 0 && ' · '}
        {playlist.totalDuration != null && playlist.totalDuration > 0 && formatDuration(playlist.totalDuration)}
      </p>
    </div>
  );
}

/* ─── Icons ─── */

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

/* ─── Helpers ─── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─── Styles ─── */

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 32,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  viewAllLink: {
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: 500,
  },
  subTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  scrollRow: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 8,
  },
  // Media card
  mediaCard: {
    flex: '0 0 180px',
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  thumbnailWrap: {
    position: 'relative',
    width: '100%',
    height: 100,
    backgroundColor: '#f1f5f9',
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
    color: '#94a3b8',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: '2px 6px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '0.6875rem',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
  },
  mediaCardBody: {
    padding: 8,
  },
  mediaCardName: {
    margin: 0,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actionLink: {
    display: 'inline-block',
    marginTop: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  // Playlist card
  playlistCard: {
    flex: '0 0 180px',
    minWidth: 180,
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #f1f5f9',
    padding: 12,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  playlistIconWrap: {
    color: '#94a3b8',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
  },
  playlistCardName: {
    margin: 0,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  playlistCardMeta: {
    margin: '4px 0 0',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  // Empty states
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #f1f5f9',
  },
  emptyWrap: {
    textAlign: 'center',
    padding: '16px 0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    margin: 0,
    fontSize: '0.875rem',
  },
  emptyHintText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.8rem',
    margin: '4px 0 0',
  },
};
