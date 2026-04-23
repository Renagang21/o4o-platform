/**
 * ForumHomePage - 포럼 메인 홈 페이지
 *
 * WO-FORUM-SEARCH-FIRST-HUB-UX-V1:
 * 레이아웃:
 * ├─ HeroHeader             - 흰색 배경 + 하단 보더
 * ├─ ForumSearchBar [NEW]   - 통합 검색바 (포럼 + 게시글)
 * ├─ [검색 모드] ForumSearchResults [NEW]
 * ├─ [기본 모드]
 * │   ├─ ForumHubSection    - 포럼 허브 카드 (서버 집계)
 * │   └─ ForumActivitySection - 최근 활동 (서버 집계)
 * ├─ ForumWritePrompt       - 글쓰기 유도
 * └─ ForumInfoSection       - 이용안내 + 바로가기
 *
 * 데이터 로딩:
 * - ForumHubSection, ForumActivitySection 은 각각 독립 fetch
 * - 검색 시 ForumSearchResults 가 병렬 fetch
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ForumHubSection } from '../../components/forum/ForumHubSection';
import { ForumActivitySection } from '../../components/forum/ForumActivitySection';
import { ForumSearchBar } from '../../components/forum/ForumSearchBar';
import { ForumSearchResults } from '../../components/forum/ForumSearchResults';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';
import { colors, spacing, typography } from '../../styles/theme';

export function ForumHomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchMode = searchQuery.length >= 2;

  return (
    <div style={styles.page}>
      {/* Hero Header */}
      <div style={styles.heroHeader}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>💊 약사회 포럼</h1>
          <p style={styles.heroDesc}>
            약사 커뮤니티에서 정보를 교환하고 토론에 참여하세요
          </p>
          <div style={styles.heroActions}>
            <Link to="/mypage/my-forums/request" style={styles.heroRequestBtn}>새 포럼 개설 신청</Link>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <ForumSearchBar
          onSearch={setSearchQuery}
          onClear={() => setSearchQuery('')}
          isSearching={isSearchMode}
        />

        {isSearchMode ? (
          <ForumSearchResults query={searchQuery} />
        ) : (
          <>
            <ForumHubSection />
            <ForumActivitySection />
          </>
        )}

        <ForumWritePrompt />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
    minHeight: '100vh',
  },
  heroHeader: {
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.neutral200}`,
    padding: `${spacing.xl} 0`,
  },
  heroContent: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `0 ${spacing.lg}`,
  },
  heroTitle: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
  },
  heroDesc: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: `${spacing.sm} 0 0`,
  },
  heroActions: {
    display: 'flex',
    gap: '12px',
    marginTop: spacing.md,
  },
  heroRequestBtn: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
};

export default ForumHomePage;
