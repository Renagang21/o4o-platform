/**
 * ForumHubPage — Neture 포럼 허브
 *
 * WO-NETURE-COMMUNITY-HUB-TEMPLATE-ADOPTION-V1
 *
 * ForumHubTemplate + Neture config-only adapter.
 * basePath prop 으로 /forum, /workspace/forum 동일 컴포넌트 재사용.
 */

import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
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

// WO-O4O-NETURE-FORUM-CREATION-REQUEST-ENTRY-ALIGN-KPA-V1:
// Hero 헤더 개설신청 버튼 (auth-aware) — 비로그인 시 로그인 후 /forum/request 복귀.
const requestBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  backgroundColor: '#059669',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

function ForumRequestButton() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/forum/request' } });
    } else {
      navigate('/forum/request');
    }
  };

  return (
    <button onClick={handleClick} style={requestBtnStyle}>
      + 포럼 개설신청
    </button>
  );
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

    // WO-O4O-NETURE-FORUM-CREATION-REQUEST-ENTRY-ALIGN-KPA-V1: Hero 우측 개설신청 CTA
    headerAction: <ForumRequestButton />,

    infoLinks: [
      { label: '포럼 개설 신청', href: '/forum/request' },
      { label: '인기 글', href: `${basePath}/posts?sort=popular` },
      { label: '공지사항', href: `${basePath}/posts?type=announcement` },
    ],
  }), [title, description, basePath]);

  return <ForumHubTemplate config={config} isAuthenticated={isAuthenticated} />;
}

export { ForumHubPage };
