/**
 * ForumHubPage - GlycoPharm 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ForumHubTemplate + glycopharm config.
 * 기본 카테고리/활동 렌더러 사용 (서비스별 API 어댑터로 주입).
 */

import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ForumHubTemplate, type ForumHubConfig, type ForumHubCategory, type ForumHubPost } from '@o4o/shared-space-ui';
import { apiClient } from '@/services/api';

// ─── Raw API Types ─────────────────────────────────────────────────────────────

interface RawForumCategory {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  color?: string | null;
  iconUrl?: string | null;
  iconEmoji?: string | null;
  postCount: number;
  isPinned?: boolean;
}

interface RawForumPost {
  id: string;
  title: string;
  author?: { id: string; name?: string; nickname?: string; email?: string } | null;
  authorName?: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isPinned?: boolean;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function mapCategory(raw: RawForumCategory): ForumHubCategory {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    iconEmoji: raw.iconEmoji,
    iconUrl: raw.iconUrl,
    color: raw.color,
    postCount: raw.postCount ?? 0,
    isPinned: raw.isPinned,
  };
}

function mapPost(raw: RawForumPost): ForumHubPost {
  return {
    id: raw.id,
    title: raw.title,
    authorName: raw.authorName || raw.author?.nickname || raw.author?.name || '익명',
    viewCount: raw.viewCount ?? 0,
    commentCount: raw.commentCount ?? 0,
    createdAt: raw.createdAt,
    isPinned: raw.isPinned,
  };
}

// ─── Write Prompt (auth-aware) ────────────────────────────────────────────────

function GlycoWritePrompt({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section style={{ padding: '16px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        background: 'linear-gradient(to right, #ECFDF5, #F0FDFA)',
        borderRadius: 12,
        border: '1px solid #D1FAE5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            backgroundColor: '#D1FAE5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            ✏️
          </div>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              포럼에 참여해 보세요
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0' }}>
              {isAuthenticated
                ? '의견, 질문, 피드백을 자유롭게 나눠보세요'
                : '로그인 후 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link to="/forum" style={{
            padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600,
            color: '#FFFFFF', backgroundColor: '#059669',
            borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' as const,
          }}>
            포럼 보기
          </Link>
        ) : (
          <Link to="/login" style={{
            padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500,
            color: '#059669', border: '1px solid #A7F3D0',
            borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' as const,
          }}>
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function ForumHubPage() {
  const { isAuthenticated } = useAuth();

  const config: ForumHubConfig = {
    serviceKey: 'glycopharm',
    heroTitle: 'GlycoPharm 포럼',
    heroDesc: '의약품과 건강기능식품에 대한 정보를 교환하고 토론에 참여하세요',
    categoryPath: (id) => `/forum?category=${id}`,
    listPath: '/forum',

    fetchCategories: async () => {
      const res = await apiClient.get<RawForumCategory[]>('/api/v1/glycopharm/forum/categories');
      return Array.isArray(res.data) ? res.data.map(mapCategory) : [];
    },

    fetchRecentPosts: async () => {
      const res = await apiClient.get<RawForumPost[]>('/api/v1/glycopharm/forum/posts?limit=10');
      return Array.isArray(res.data) ? res.data.map(mapPost) : [];
    },

    renderWritePrompt: () => <GlycoWritePrompt isAuthenticated={isAuthenticated} />,

    infoLinks: [
      { label: '전체 글', href: '/forum' },
      { label: '피드백', href: '/forum/feedback' },
    ],
  };

  return <ForumHubTemplate config={config} isAuthenticated={isAuthenticated} />;
}
