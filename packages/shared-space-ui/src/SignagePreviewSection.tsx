/**
 * SignagePreviewSection — Shared signage preview UI
 *
 * WO-SHARED-SPACE-SIGNAGE-COMPONENT-V1
 *
 * Standard table layout (제목 / 유형 / 등록자 / 등록일).
 * No thumbnails. Data fetch is done in the parent — presentation only.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SignagePreviewSectionProps, SignageMediaItem, SignagePlaylistItem } from './types';

/* ─── Style injection ─── */

const injectedStyles = `
  .signage-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .signage-table th {
    text-align: left;
    padding: 8px 12px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
    white-space: nowrap;
  }
  .signage-table td {
    padding: 9px 12px;
    color: #1e293b;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .signage-table tbody tr:hover td {
    background: #f8fafc;
  }
  .signage-table tbody tr:last-child td {
    border-bottom: none;
  }
  .signage-table a {
    color: inherit;
    text-decoration: none;
  }
  .signage-table a:hover {
    text-decoration: underline;
  }
  .signage-type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #eff6ff;
    color: #2563eb;
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
        <div style={styles.tableWrap}>
          {/* Media Table */}
          {mediaItems.length > 0 && (
            <div style={styles.tableSection}>
              <h3 style={styles.subTitle}>{mediaLabel}</h3>
              <div style={styles.tableCard}>
                <table className="signage-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>제목</th>
                      <th style={{ width: '15%' }}>유형</th>
                      <th style={{ width: '25%' }}>등록자</th>
                      <th style={{ width: '20%' }}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaItems.map((item) => (
                      <MediaRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Playlist Table */}
          {playlistItems.length > 0 && (
            <div style={styles.tableSection}>
              <h3 style={styles.subTitle}>{playlistLabel}</h3>
              <div style={styles.tableCard}>
                <table className="signage-table">
                  <thead>
                    <tr>
                      <th style={{ width: '55%' }}>이름</th>
                      <th style={{ width: '25%' }}>항목 수</th>
                      <th style={{ width: '20%' }}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlistItems.map((pl) => (
                      <PlaylistRow key={pl.id} playlist={pl} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Row Components ─── */

function MediaRow({ item }: { item: SignageMediaItem }) {
  const titleCell = item.href ? (
    <Link to={item.href}>{item.title}</Link>
  ) : (
    <span>{item.title}</span>
  );

  return (
    <tr>
      <td style={styles.titleCell}>{titleCell}</td>
      <td>
        {item.mediaType && (
          <span className="signage-type-badge">{formatMediaType(item.mediaType)}</span>
        )}
      </td>
      <td style={styles.metaCell}>{item.uploaderName ?? '—'}</td>
      <td style={styles.dateCell}>{item.createdAt ? formatDate(item.createdAt) : '—'}</td>
    </tr>
  );
}

function PlaylistRow({ playlist }: { playlist: SignagePlaylistItem }) {
  const nameCell = playlist.href ? (
    <Link to={playlist.href}>{playlist.name}</Link>
  ) : (
    <span>{playlist.name}</span>
  );

  return (
    <tr>
      <td style={styles.titleCell}>{nameCell}</td>
      <td style={styles.metaCell}>
        {playlist.itemCount != null ? `${playlist.itemCount}개 항목` : '—'}
      </td>
      <td style={styles.dateCell}>{playlist.createdAt ? formatDate(playlist.createdAt) : '—'}</td>
    </tr>
  );
}

/* ─── Helpers ─── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  video: '동영상',
  image: '이미지',
  html: 'HTML',
  text: '텍스트',
  rich_text: '리치텍스트',
  link: '링크',
};

function formatMediaType(type: string): string {
  return MEDIA_TYPE_LABELS[type] ?? type;
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
  tableWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  tableSection: {},
  subTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  titleCell: {
    fontWeight: 500,
    maxWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaCell: {
    color: '#475569',
  },
  dateCell: {
    color: '#94a3b8',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
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
