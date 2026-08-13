import { ForumHubTemplate, type ForumHubConfig } from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPharmacyHubForumCategories, fetchPharmacyHubRecentPosts } from '../../services/forumApi';

const pharmacyHubForumConfig: ForumHubConfig = {
  serviceKey: 'pharmacy-hub',
  heroTitle: 'PharmacyHub 커뮤니티',
  heroDesc: '약국과 공급자가 PharmacyHub 안에서 정보를 나누는 커뮤니티입니다.',
  categoryPath: (forumId) => `/forum/posts?forum=${encodeURIComponent(forumId)}`,
  listPath: '/forum/posts',
  fetchCategories: fetchPharmacyHubForumCategories,
  fetchRecentPosts: fetchPharmacyHubRecentPosts,
  writePrompt: {
    authTitle: '커뮤니티에 참여해 보세요',
    authDesc: '포럼을 선택해 정보를 확인하고, 바로 글을 작성할 수 있습니다.',
    ctaPath: '/forum/write',
  },
  infoLinks: [
    { label: 'PharmacyHub 홈', href: '/' },
    { label: '가입 상태', href: '/join/status' },
  ],
};

export default function ForumHubPage() {
  const { isAuthenticated } = useAuth();

  return (
    <ForumHubTemplate
      config={pharmacyHubForumConfig}
      isAuthenticated={isAuthenticated}
    />
  );
}
