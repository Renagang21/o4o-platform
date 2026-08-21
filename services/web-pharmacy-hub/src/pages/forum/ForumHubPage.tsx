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
  // WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §14
  // 기능은 있는데 진입점이 없는 상태를 남기지 않는다 — 개설 신청·내 포럼을 허브에 노출한다.
  infoLinks: [
    { label: '포럼 개설 신청', href: '/forum/request' },
    { label: '내 포럼', href: '/forum/my-dashboard' },
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
