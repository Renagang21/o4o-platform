/**
 * ForumHubPage - K-Cosmetics 포럼 허브 랜딩 페이지
 *
 * WO-O4O-COMMONIZATION-REFINEMENT-V1
 *
 * ForumHubTemplate + k-cosmetics config.
 * 기본 카테고리/활동 렌더러 사용 (서비스별 API 어댑터로 주입).
 */

import { useAuth } from '../../contexts/AuthContext';
import { ForumHubTemplate, type ForumHubConfig, type ForumHubCategory, type ForumHubPost } from '@o4o/shared-space-ui';
import {
  fetchPopularForums,
  fetchForumPosts,
  getAuthorName,
  type PopularForum,
  type ForumPost,
} from '../../services/forumApi';

// ─── Adapters ─────────────────────────────────────────────────────────────────

function mapCategory(raw: PopularForum): ForumHubCategory {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    iconUrl: raw.iconUrl,
    color: raw.color,
    postCount: raw.postCount ?? 0,
    isPinned: false,
  };
}

function mapPost(raw: ForumPost): ForumHubPost {
  return {
    id: raw.id,
    title: raw.title,
    authorName: getAuthorName(raw),
    viewCount: raw.viewCount ?? 0,
    commentCount: raw.commentCount ?? 0,
    createdAt: raw.createdAt,
    isPinned: raw.isPinned,
  };
}

// ─── Page Component ────────────────────────────────────────────────────────────

export function ForumHubPage() {
  const { isAuthenticated } = useAuth();

  const config: ForumHubConfig = {
    serviceKey: 'k-cosmetics',
    heroTitle: 'K-Cosmetics 포럼',
    heroDesc: '뷰티 트렌드와 화장품에 대한 정보를 교환하고 토론에 참여하세요',
    categoryPath: (id) => `/forum/posts?category=${id}`,
    listPath: '/forum/posts',

    fetchCategories: async () => {
      const res = await fetchPopularForums(20);
      return (res.data ?? []).map(mapCategory);
    },

    fetchRecentPosts: async () => {
      const res = await fetchForumPosts({ limit: 10 });
      return (res.data ?? []).map(mapPost);
    },

    writePrompt: {
      ctaPath: '/forum/posts',
    },

    infoLinks: [
      { label: '인기 글', href: '/forum/posts?sort=popular' },
      { label: '공지사항', href: '/forum/posts?type=announcement' },
    ],
  };

  return <ForumHubTemplate config={config} isAuthenticated={isAuthenticated} />;
}

export default ForumHubPage;
