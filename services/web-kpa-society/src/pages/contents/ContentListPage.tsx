/**
 * ContentListPage — 콘텐츠 허브 목록
 *
 * WO-KPA-CONTENT-HUB-TEMPLATE-MIGRATION-V1
 * (이전) WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1
 *
 * ContentHubTemplate 기반 공통 구조.
 * GlycoPharm, K-Cosmetics와 동일한 패턴.
 */

import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ContentHubTemplate } from '@o4o/shared-space-ui';
import type { ContentHubConfig, ContentHubItem } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';

// ─── Type Mapping ────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  information: '문서',
  participation: '참여',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  information: { bg: '#eff6ff', text: '#1d4ed8' },
  participation: { bg: '#f5f3ff', text: '#7c3aed' },
};

function mapContentItem(item: ContentItem): ContentHubItem {
  const subLabel = item.sub_type === '설문' ? '설문'
    : item.sub_type === '퀴즈' ? '퀴즈'
    : TYPE_LABELS[item.content_type] ?? '문서';
  return {
    id: item.id,
    title: item.title,
    summary: item.author_name
      ? `${item.author_name} · ${item.summary ?? ''}`
      : item.summary ?? undefined,
    type: subLabel,
    typeColor: TYPE_COLORS[item.content_type],
    date: item.created_at,
  };
}

// ─── Custom renderItems: Table with internal navigation ──────

function ContentTable({ items }: { items: ContentHubItem[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 80 }}>유형</th>
            <th style={thStyle}>제목</th>
            <th style={{ ...thStyle, width: 200 }}>요약</th>
            <th style={{ ...thStyle, width: 100 }}>작성일</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const badgeColor = item.typeColor ?? { bg: '#f1f5f9', text: '#475569' };
            return (
              <tr
                key={item.id}
                onClick={() => navigate(`/content/${item.id}`)}
                style={{ cursor: 'pointer', transition: 'background-color 0.1s' }}
              >
                <td style={{ ...tdStyle, width: 80, textAlign: 'center' }}>
                  {item.type && (
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem',
                      fontWeight: 600, borderRadius: 4, backgroundColor: badgeColor.bg, color: badgeColor.text,
                    }}>
                      {item.type}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                    {item.title}
                  </span>
                </td>
                <td style={{ ...tdStyle, width: 200, color: '#64748b', fontSize: '0.8125rem' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {item.summary || '-'}
                  </span>
                </td>
                <td style={{ ...tdStyle, width: 100, color: '#94a3b8', fontSize: '0.8125rem' }}>
                  {item.date ? formatDate(item.date) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600,
  color: '#64748b', backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0', textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  padding: '12px', fontSize: '0.875rem', color: '#0f172a',
  borderBottom: '1px solid #f1f5f9',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

// ─── Component ───────────────────────────────────────────────

export function ContentListPage() {
  const { isAuthenticated } = useAuth();

  const config: ContentHubConfig = useMemo(() => ({
    serviceKey: 'kpa-society',
    heroTitle: '콘텐츠',
    heroDesc: '콘텐츠를 탐색하고 관리하세요',
    headerAction: isAuthenticated ? (
      <Link
        to="/content/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600, borderRadius: 8,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        + 콘텐츠 제작
      </Link>
    ) : undefined,
    searchPlaceholder: '제목으로 검색...',
    filters: [
      { key: 'all', label: '전체' },
      { key: 'information', label: '문서' },
      { key: 'participation', label: '참여' },
    ],
    pageLimit: 20,
    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const res = await contentApi.list({
          page,
          limit,
          sort: 'latest',
          search: search || undefined,
          content_type: filter !== 'all' ? filter : undefined,
        });
        return {
          items: (res.data?.items ?? []).map(mapContentItem),
          total: res.data?.total ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },
    renderItems: (items) => <ContentTable items={items} />,
    emptyMessage: '아직 콘텐츠가 없습니다',
    emptyFilteredMessage: '검색 결과가 없습니다',
    showUsageBlock: false,
    showInfoBlock: false,
  }), [isAuthenticated]);

  return <ContentHubTemplate config={config} />;
}

export default ContentListPage;
