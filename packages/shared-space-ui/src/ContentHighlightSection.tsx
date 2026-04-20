/**
 * ContentHighlightSection — Shared content/course highlight UI
 *
 * WO-SHARED-SPACE-CONTENT-COMPONENT-V1
 *
 * Two-group layout (primary + optional secondary).
 * Handles thumbnail, badge, title, summary, meta, link.
 * Data fetch is done in the parent — this is presentation only.
 */

import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { ContentHighlightSectionProps, ContentHighlightItem } from './types';

/* ─── Style injection (responsive grid + hover) ─── */

const STYLE_ID = 'shared-content-highlight-styles';

const injectedStyles = `
  .ch-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (max-width: 640px) {
    .ch-grid {
      grid-template-columns: 1fr;
    }
  }
  .ch-card:hover {
    border-color: #cbd5e1 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
`;

/* ─── Card ─── */

function Card({ item }: { item: ContentHighlightItem }) {
  const isExternal = !!item.href && /^https?:\/\//.test(item.href);

  const base: CSSProperties = {
    display: 'block',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s',
  };

  const inner = (
    <>
      {item.thumbnailUrl ? (
        <div style={s.thumb}>
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            style={s.thumbImg}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div style={{ ...s.thumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '24px', color: '#cbd5e1' }}>📄</span>
        </div>
      )}
      <div style={s.cardBody}>
        {item.badge && <span style={s.badge}>{item.badge}</span>}
        <p style={s.cardTitle}>{item.title}</p>
        {item.summary && <p style={s.summary}>{item.summary}</p>}
        {item.meta && <p style={s.meta}>{item.meta}</p>}
      </div>
    </>
  );

  if (!item.href) {
    return <div className="ch-card" style={base}>{inner}</div>;
  }

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="ch-card" style={base}>
        {inner}
      </a>
    );
  }

  return (
    <Link to={item.href} className="ch-card" style={base}>
      {inner}
    </Link>
  );
}

/* ─── Group (used in two-group mode) ─── */

function Group({
  label,
  items,
  emptyMessage,
}: {
  label: string;
  items: ContentHighlightItem[];
  emptyMessage?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={s.groupLabel}>{label}</p>
      {items.length > 0 ? (
        <div className="ch-grid">
          {items.map((item) => <Card key={item.id} item={item} />)}
        </div>
      ) : (
        emptyMessage ? <p style={s.empty}>{emptyMessage}</p> : null
      )}
    </div>
  );
}

/* ─── Main Component ─── */

const DEFAULT_ACCENT = '#2563EB';

export function ContentHighlightSection({
  title,
  subtitle,
  primaryGroupTitle,
  secondaryGroupTitle,
  primaryItems,
  secondaryItems,
  viewAllHref,
  viewAllLabel = '전체 보기 →',
  emptyMessage = '등록된 항목이 없습니다.',
  loading = false,
  accentColor = DEFAULT_ACCENT,
}: ContentHighlightSectionProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = injectedStyles;
    document.head.appendChild(el);
  }, []);

  const hasSecondary = !!secondaryGroupTitle && !!secondaryItems && secondaryItems.length > 0;
  const isEmpty = primaryItems.length === 0 && !hasSecondary;
  const isViewAllExternal = !!viewAllHref && /^https?:\/\//.test(viewAllHref);

  return (
    <section style={s.section}>
      {/* Header */}
      {(title || viewAllHref) && (
        <div style={s.header}>
          <div>
            {title && <h2 style={s.sectionTitle}>{title}</h2>}
            {subtitle && <p style={s.sectionSubtitle}>{subtitle}</p>}
          </div>
          {viewAllHref && (
            isViewAllExternal ? (
              <a
                href={viewAllHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.viewAll, color: accentColor }}
              >
                {viewAllLabel}
              </a>
            ) : (
              <Link to={viewAllHref} style={{ ...s.viewAll, color: accentColor }}>
                {viewAllLabel}
              </Link>
            )
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <p style={s.empty}>불러오는 중...</p>
      ) : isEmpty ? (
        <div style={s.emptyWrap}>
          <p style={s.emptyIcon}>📄</p>
          <p style={s.empty}>{emptyMessage}</p>
        </div>
      ) : secondaryGroupTitle ? (
        /* Two-group mode: show sub-labels for each group */
        <>
          <Group label={primaryGroupTitle} items={primaryItems} emptyMessage={emptyMessage} />
          {hasSecondary && (
            <Group label={secondaryGroupTitle} items={secondaryItems!} />
          )}
        </>
      ) : (
        /* Single-group mode: plain grid, no sub-label */
        <div className="ch-grid">
          {primaryItems.map((item) => <Card key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}

/* ─── Styles ─── */

const s: Record<string, CSSProperties> = {
  section: {},
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    margin: '2px 0 0',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    flexShrink: 0,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
  },
  thumb: {
    width: '100%',
    height: '100px',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardBody: {
    padding: '8px 12px 10px',
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  summary: {
    fontSize: '11px',
    color: '#94a3b8',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  meta: {
    fontSize: '11px',
    color: '#cbd5e1',
    margin: 0,
  },
  empty: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px 0',
    margin: 0,
  },
  emptyWrap: {
    textAlign: 'center',
    padding: '24px 0',
  },
  emptyIcon: {
    fontSize: '1.5rem',
    margin: '0 0 8px',
    textAlign: 'center',
  },
};
