/**
 * ForumHomePage - 포럼 메인 홈 페이지
 *
 * WO-O4O-FORUM-HUB-TEMPLATE-FOUNDATION-V1
 *
 * ForumHubTemplate + KPA config.
 * 서비스 고유 서브섹션(sort/tag/search)은 renderXxx props로 주입.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ForumHubTemplate, type ForumHubConfig } from '@o4o/shared-space-ui';
import { ForumHubSection } from '../../components/forum/ForumHubSection';
import { ForumActivitySection } from '../../components/forum/ForumActivitySection';
import { ForumSearchBar } from '../../components/forum/ForumSearchBar';
import { ForumSearchResults } from '../../components/forum/ForumSearchResults';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';

// ─── Forum Request Button ─────────────────────────────────────────────────────

const requestBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  backgroundColor: '#2563eb',
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

// ─── KPA Config ────────────────────────────────────────────────────────────────

const kpaForumConfig: ForumHubConfig = {
  serviceKey: 'kpa-society',
  heroTitle: '💊 약사회 포럼',
  heroDesc: '약사 커뮤니티에서 정보를 교환하고 토론에 참여하세요',
  listPath: '/forum/all',

  // KPA uses section overrides — fetchCategories/fetchRecentPosts not called
  fetchCategories: async () => [],
  fetchRecentPosts: async () => [],

  // KPA-specific: 서버 집계 기반 카테고리 섹션 (sort/tag/member count)
  renderCategorySection: () => <ForumHubSection />,

  // KPA-specific: 서버 집계 기반 활동 섹션 (sort tabs)
  renderActivitySection: () => <ForumActivitySection />,

  // KPA-specific: 통합 검색바
  renderSearchSection: (onSearch, onClear, isSearching) => (
    <ForumSearchBar onSearch={onSearch} onClear={onClear} isSearching={isSearching} />
  ),

  // KPA-specific: 검색 결과
  renderSearchResults: (query) => <ForumSearchResults query={query} />,

  // KPA-specific: auth-aware CTA (내부에서 useAuth 사용)
  renderWritePrompt: () => <ForumWritePrompt />,

  // WO-KPA-FORUM-REQUEST-BUTTON-ON-FORUM-V1: Hero 우측 개설신청 버튼
  headerAction: <ForumRequestButton />,

  infoLinks: [
    { label: '포럼 목록', href: '/forum/all' },
    { label: '포럼 개설 신청', href: '/forum/request' },
    { label: '내 활동', href: '/mypage' },
    { label: '이용약관', href: '/policy' },
  ],
};

// ─── Page Component ────────────────────────────────────────────────────────────

export function ForumHomePage() {
  const { isAuthenticated } = useAuth();
  return <ForumHubTemplate config={kpaForumConfig} isAuthenticated={isAuthenticated} />;
}

export default ForumHomePage;
