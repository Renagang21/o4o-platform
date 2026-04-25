/**
 * ContentLibraryPage — K-Cosmetics 콘텐츠 라이브러리
 *
 * WO-O4O-COMMONIZATION-REFINEMENT-V1
 *
 * ContentHubTemplate + k-cosmetics config-adapter.
 * Route: /library/content
 */

import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ContentHubTemplate,
  type ContentHubConfig,
  type ContentHubItem,
  type ContentHubItemContext,
} from '@o4o/shared-space-ui';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { dashboardCopyApi } from '../../lib/api/dashboardCopy';
import { useAuth } from '../../contexts/AuthContext';

// ─── Adapter ──────────────────────────────────────────────────────────────────

function apiItemToContentHubItem(item: HubContentItemResponse): ContentHubItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description,
    thumbnail: item.thumbnailUrl || item.imageUrl,
    href: item.linkUrl,
    type: item.cmsType,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null,
    isPinned: item.isPinned,
  };
}

// ─── Card Grid Renderer ───────────────────────────────────────────────────────

function CardGrid({ items, ctx }: { items: ContentHubItem[]; ctx: ContentHubItemContext }) {
  return (
    <div style={gridSt.grid}>
      {items.map((item) => {
        const isCopied = ctx.copiedIds.has(item.id);
        const isCopying = ctx.copyingId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => item.href && window.open(item.href, '_blank', 'noopener')}
            style={{ ...gridSt.card, cursor: item.href ? 'pointer' : 'default' }}
          >
            {item.thumbnail ? (
              <div style={gridSt.thumb}>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={gridSt.thumbImg}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div style={{ ...gridSt.thumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, color: '#e2e8f0' }}>📄</span>
              </div>
            )}
            <div style={gridSt.body}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {item.type && <span style={gridSt.badge}>{item.type}</span>}
                {item.isPinned && <span style={gridSt.pinnedBadge}>추천</span>}
              </div>
              <p style={gridSt.title}>{item.title}</p>
              {item.summary && <p style={gridSt.desc}>{item.summary}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <p style={gridSt.date}>{item.date}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); ctx.onCopy(item); }}
                  disabled={isCopied || isCopying}
                  style={{
                    ...gridSt.copyBtn,
                    ...(isCopied || isCopying ? gridSt.copyBtnDisabled : {}),
                  }}
                >
                  {isCopied ? ctx.copiedLabel : isCopying ? ctx.copyingLabel : ctx.copyLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const gridSt: Record<string, CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  card: {
    backgroundColor: 'white', borderRadius: 12,
    border: '1px solid #e2e8f0', overflow: 'hidden',
  },
  thumb: {
    width: '100%', height: 140,
    backgroundColor: '#f8fafc', overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  body: { padding: '10px 14px 12px' },
  badge: {
    display: 'inline-block', padding: '1px 6px',
    fontSize: 10, fontWeight: 500,
    backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: 4,
  },
  pinnedBadge: {
    display: 'inline-block', padding: '1px 6px',
    fontSize: 10, fontWeight: 500,
    backgroundColor: '#fdf2f8', color: '#DB2777', borderRadius: 4,
  },
  title: {
    fontSize: 14, fontWeight: 600, color: '#1e293b',
    margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  desc: {
    fontSize: 12, color: '#94a3b8',
    margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  date: { fontSize: 10, color: '#cbd5e1', margin: 0 },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    padding: '3px 8px', fontSize: 10, fontWeight: 500,
    borderRadius: 4, border: 'none', cursor: 'pointer',
    backgroundColor: '#f1f5f9', color: '#64748b',
  },
  copyBtnDisabled: {
    backgroundColor: '#f8fafc', color: '#cbd5e1', cursor: 'default',
  },
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ContentLibraryPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const config: ContentHubConfig = useMemo(() => ({
    serviceKey: 'k-cosmetics',
    heroTitle: '콘텐츠 라이브러리',
    heroDesc: 'K-Cosmetics 콘텐츠를 한눈에 확인하세요',
    headerAction: (
      <Link to="/community" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
        ← 커뮤니티
      </Link>
    ),
    searchPlaceholder: '콘텐츠 검색',
    filters: [
      { key: 'all', label: '전체' },
      { key: 'notice', label: '공지' },
      { key: 'guide', label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo', label: '프로모션' },
      { key: 'news', label: '뉴스' },
    ],
    pageLimit: 12,

    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const res = await hubContentApi.list({
          sourceDomain: 'cms',
          type: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          page,
          limit,
        });
        return {
          items: (res?.data ?? []).map(apiItemToContentHubItem),
          total: res?.pagination?.total ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      try {
        const ids = await dashboardCopyApi.getCopiedSourceIds(userId);
        return new Set(ids);
      } catch {
        return new Set<string>();
      }
    },

    onCopy: async (item: ContentHubItem) => {
      if (!userId) return;
      await dashboardCopyApi.copyAsset({
        sourceType: 'hub_content',
        sourceId: item.id,
        targetDashboardId: userId,
      });
    },

    copyLabel: '↓ 내 콘텐츠로',
    copiedLabel: '✓ 가져옴',
    copyingLabel: '복사 중...',

    renderItems: (items: ContentHubItem[], ctx: ContentHubItemContext) => (
      <CardGrid items={items} ctx={ctx} />
    ),

    emptyMessage: '등록된 콘텐츠가 없습니다',
    emptyFilteredMessage: '조건에 맞는 콘텐츠가 없습니다',
  }), [userId]);

  return <ContentHubTemplate config={config} />;
}
