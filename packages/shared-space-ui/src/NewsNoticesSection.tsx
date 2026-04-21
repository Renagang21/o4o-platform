import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { NewsNoticesSectionProps } from './types';

const DEFAULT_ACCENT = '#2563EB';
const DEFAULT_ACCENT_BG = '#eff6ff';

export function NewsNoticesSection({
  title = '공지 / 새 소식',
  tabs,
  activeTab,
  onTabChange,
  items,
  loading = false,
  emptyTitle = '등록된 공지가 없습니다',
  emptySubtitle,
  externalCta,
  viewAllHref,
  accentColor = DEFAULT_ACCENT,
  accentBg = DEFAULT_ACCENT_BG,
}: NewsNoticesSectionProps) {
  useEffect(() => {
    const id = 'shared-news-hover';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-news-tab:hover:not(.ss-news-tab-active) {
        border-color: #cbd5e1;
        background-color: #f8fafc;
      }
      .ss-news-item:hover {
        background-color: #f8fafc;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <section style={styles.section}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {viewAllHref && (
          <Link to={viewAllHref} style={{ ...styles.viewAllLink, color: accentColor }}>
            전체보기 →
          </Link>
        )}
      </div>

      {/* Tabs (optional) */}
      {tabs && tabs.length > 0 && (
        <div style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`ss-news-tab${isActive ? ' ss-news-tab-active' : ''}`}
                style={{
                  ...styles.tab,
                  ...(isActive
                    ? { backgroundColor: accentColor, borderColor: accentColor, color: '#ffffff', fontWeight: 600 }
                    : {}),
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Card body */}
      <div style={styles.card}>
        {externalCta ? (
          /* External CTA (e.g. 약업신문, 약사공론) */
          <div style={styles.ctaWrap}>
            {externalCta.icon && <div style={styles.ctaIconWrap}>{externalCta.icon}</div>}
            <p style={styles.ctaText}>{externalCta.message}</p>
            <a
              href={externalCta.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.ctaLink, color: accentColor }}
            >
              {externalCta.linkLabel}
            </a>
          </div>
        ) : loading ? (
          <p style={styles.empty}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <div style={styles.emptyWrap}>
            <p style={styles.empty}>{emptyTitle}</p>
            {emptySubtitle && <p style={styles.emptyHint}>{emptySubtitle}</p>}
          </div>
        ) : (
          <>
            <ul style={styles.list}>
              {items.map((item, idx) => {
                const inner = (
                  <>
                    {item.isPinned && (
                      <span style={{ ...styles.badge, backgroundColor: accentBg, color: accentColor }}>
                        공지
                      </span>
                    )}
                    {item.category && !item.isPinned && (
                      <span style={styles.categoryBadge}>{item.category}</span>
                    )}
                    <span style={styles.listTitle}>{item.title}</span>
                    <span style={styles.listDate}>
                      {new Date(item.date).toLocaleDateString('ko-KR')}
                    </span>
                  </>
                );
                return (
                  <li key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    {item.href ? (
                      <Link to={item.href} style={styles.listRow} className="ss-news-item">
                        {inner}
                      </Link>
                    ) : (
                      <div style={styles.listRow} className="ss-news-item">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {viewAllHref && (
              <div style={styles.footerRow}>
                <Link to={viewAllHref} style={{ ...styles.footerLink, color: accentColor }}>
                  전체 보기 →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
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
  viewAllLink: {
    fontSize: 13,
    textDecoration: 'none',
    fontWeight: 500,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tab: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    color: '#475569',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    minHeight: 200,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    textDecoration: 'none',
    transition: 'background-color 0.1s',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 4,
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
  footerRow: {
    textAlign: 'right',
    padding: '8px 16px',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
  empty: {
    textAlign: 'center',
    color: '#64748b',
    margin: 0,
    padding: '24px 0',
  },
  emptyWrap: {
    textAlign: 'center',
    padding: 24,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.8rem',
    margin: '4px 0 0',
  },
  ctaWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  ctaIconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#334155',
    margin: '0 0 12px',
  },
  ctaLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
