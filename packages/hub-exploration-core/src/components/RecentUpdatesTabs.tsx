import { useState, useMemo } from 'react';
import type { RecentUpdatesTabsProps } from '../types.js';
import { NEUTRALS, SHADOWS, DEFAULT_THEME } from '../theme.js';

export function RecentUpdatesTabs({
  tabs,
  items,
  maxItems = 6,
  moreLabel,
  onMoreClick,
}: RecentUpdatesTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '');

  const filtered = useMemo(() => {
    const result = activeTab === 'all'
      ? items
      : items.filter(item => item.tabKey === activeTab || item.tabKey === 'all');
    return result.slice(0, maxItems);
  }, [items, activeTab, maxItems]);

  return (
    <div>
      <h2 style={S.sectionTitle}>최근 업데이트</h2>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? { ...S.tab, ...S.tabActive } : S.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div style={S.empty}>이 카테고리의 업데이트가 없습니다.</div>
      ) : (
        <div style={S.list}>
          {filtered.map(item => (
            <button
              key={item.id}
              style={S.item}
              onClick={item.onClick}
              disabled={!item.onClick}
            >
              <div style={S.itemContent}>
                <div style={S.itemTitleRow}>
                  <span style={S.itemTitle}>{item.title}</span>
                  {item.badge && (
                    <span style={{
                      ...S.badge,
                      backgroundColor: item.badgeColor ? `${item.badgeColor}15` : `${DEFAULT_THEME.primaryColor}15`,
                      color: item.badgeColor ?? DEFAULT_THEME.primaryColor,
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && <p style={S.itemDesc}>{item.description}</p>}
              </div>
              {item.date && <span style={S.itemDate}>{item.date}</span>}
            </button>
          ))}
        </div>
      )}

      {/* More link */}
      {moreLabel && onMoreClick && (
        <div style={S.moreWrap}>
          <button onClick={onMoreClick} style={S.moreBtn}>{moreLabel} &rarr;</button>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: NEUTRALS[500],
    backgroundColor: NEUTRALS[100],
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: DEFAULT_THEME.primaryColor,
    color: '#ffffff',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: `1px solid ${NEUTRALS[200]}`,
    boxShadow: SHADOWS.sm,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.625rem',
    fontWeight: 600,
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    margin: '4px 0 0',
    fontSize: '0.75rem',
    color: NEUTRALS[400],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDate: {
    fontSize: '0.75rem',
    color: NEUTRALS[400],
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: NEUTRALS[400],
  },
  moreWrap: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  moreBtn: {
    padding: '6px 12px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: DEFAULT_THEME.primaryColor,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
