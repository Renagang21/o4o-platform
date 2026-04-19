import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { ActivitySectionProps } from './types';

const DEFAULT_ACCENT = '#2563EB';

export function ActivitySection({
  title = '최근 활동',
  featuredPosts,
  recentPosts,
  loading = false,
  emptyMessage = '아직 글이 없습니다',
  emptyActionLabel = '포럼 바로가기 →',
  emptyActionHref = '/forum',
  viewAllHref = '/forum',
  accentColor = DEFAULT_ACCENT,
}: ActivitySectionProps) {
  useEffect(() => {
    const id = 'shared-activity-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-hot-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      @media (max-width: 640px) {
        .ss-hot-grid {
          grid-template-columns: 1fr;
        }
      }
      .ss-hot-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .ss-recent-item:hover {
        background-color: #f8fafc;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const isEmpty = featuredPosts.length === 0 && recentPosts.length === 0;

  return (
    <section style={styles.section}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {viewAllHref && (
          <Link to={viewAllHref} style={{ ...styles.headerLink, color: accentColor }}>
            전체보기 →
          </Link>
        )}
      </div>

      {loading ? (
        <p style={styles.empty}>불러오는 중...</p>
      ) : isEmpty ? (
        <div style={styles.emptyWrap}>
          <p style={styles.empty}>{emptyMessage}</p>
          {emptyActionHref && (
            <Link to={emptyActionHref} style={{ ...styles.emptyAction, color: accentColor }}>
              {emptyActionLabel}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Featured / Hot posts */}
          {featuredPosts.length > 0 && (
            <>
              <p style={styles.subLabel}>인기 글</p>
              <div className="ss-hot-grid" style={{ marginBottom: 24 }}>
                {featuredPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    to={post.href}
                    style={styles.hotCard}
                    className="ss-hot-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={styles.hotRank}>{idx + 1}</span>
                      {post.category && <span style={styles.categoryBadge}>{post.category}</span>}
                    </div>
                    <p style={styles.hotTitle}>{post.title}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={styles.metaText}>{post.author}</span>
                      <span style={styles.metaText}>조회 {post.viewCount}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Recent posts */}
          {recentPosts.length > 0 && (
            <>
              <p style={styles.subLabel}>최근 글</p>
              <div style={styles.card}>
                {recentPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    to={post.href}
                    style={{
                      ...styles.listRow,
                      borderBottom: idx < recentPosts.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                    className="ss-recent-item"
                  >
                    {post.category && <span style={styles.categoryBadge}>{post.category}</span>}
                    <span style={styles.listTitle}>{post.title}</span>
                    <span style={styles.listDate}>
                      {new Date(post.date).toLocaleDateString('ko-KR')}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  headerLink: {
    fontSize: 13,
    textDecoration: 'none',
    fontWeight: 500,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
  },
  /* Hot posts */
  hotCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    textDecoration: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    display: 'block',
  },
  hotRank: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
    flexShrink: 0,
  },
  hotTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  metaText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  /* Recent posts */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    textDecoration: 'none',
    transition: 'background-color 0.1s',
  },
  listTitle: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listDate: {
    fontSize: 12,
    color: '#94a3b8',
    flexShrink: 0,
  },
  /* Empty */
  empty: {
    textAlign: 'center',
    color: '#64748b',
    margin: 0,
    padding: '24px 0',
  },
  emptyWrap: {
    textAlign: 'center',
    padding: 32,
  },
  emptyAction: {
    display: 'inline-block',
    marginTop: 8,
    fontSize: '0.8125rem',
    textDecoration: 'none',
  },
};
