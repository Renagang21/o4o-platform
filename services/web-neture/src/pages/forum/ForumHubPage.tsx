/**
 * ForumHubPage — Neture 포럼 허브
 *
 * WO-NETURE-COMMUNITY-HUB-TEMPLATE-ADOPTION-V1
 *
 * ForumHubTemplate + Neture config-only adapter.
 * basePath prop 으로 /forum, /workspace/forum 동일 컴포넌트 재사용.
 */

import { useMemo } from 'react';
import {
  ForumHubTemplate,
  type ForumHubConfig,
  type ForumHubCategory,
  type ForumHubPost,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts';
import {
  fetchPopularForums,
  fetchForumCategories,
  fetchForumPosts,
  getAuthorName,
  type ForumPost,
  type ForumCategory,
  type PopularForum,
} from '../../services/forumApi';

interface ForumHubPageProps {
  title?: string;
  description?: string;
  basePath?: string;
}

function mapPopularToCategory(raw: PopularForum): ForumHubCategory {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    iconUrl: raw.iconUrl,
    color: raw.color,
    postCount: raw.postCount ?? 0,
  };
}

function mapCategory(raw: ForumCategory): ForumHubCategory {
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

export default function ForumHubPage({
  title = '네뚜레 포럼',
  description = 'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다',
  basePath = '/forum',
}: ForumHubPageProps) {
  const { isAuthenticated } = useAuth();

  const config: ForumHubConfig = useMemo(() => ({
    serviceKey: 'neture',
    heroTitle: title,
    heroDesc: description,
    categoryPath: (id) => `${basePath}/posts?category=${id}`,
    listPath: `${basePath}/posts`,

    fetchCategories: async () => {
      const popular = await fetchPopularForums(20);
      if (popular.success && popular.data.length > 0) {
        return popular.data.map(mapPopularToCategory);
      }
      const cats = await fetchForumCategories();
      return (cats.data ?? []).map(mapCategory);
    },

    fetchRecentPosts: async () => {
      const res = await fetchForumPosts({ limit: 10, sortBy: 'latest' });
      return (res.data ?? []).map(mapPost);
    },

    writePrompt: { ctaPath: `${basePath}/posts` },

    infoLinks: [
      { label: '인기 글', href: `${basePath}/posts?sort=popular` },
      { label: '공지사항', href: `${basePath}/posts?type=announcement` },
    ],
  }), [title, description, basePath]);

  return <ForumHubTemplate config={config} isAuthenticated={isAuthenticated} />;
}

export { ForumHubPage };
