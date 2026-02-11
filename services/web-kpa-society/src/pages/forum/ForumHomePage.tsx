/**
 * ForumHomePage - 포럼 메인 홈 페이지
 *
 * 레이아웃:
 * ├─ HeroHeader             - 흰색 배경 + 하단 보더
 * ├─ ForumActivitySection   - 최근 글 + 인기 글 (2열)
 * ├─ ForumCategorySection   - 카테고리 탭 + 글 목록
 * ├─ ForumWritePrompt       - 글쓰기 유도
 * └─ ForumInfoSection       - 이용안내 + 바로가기
 *
 * 데이터 로딩:
 * - categories + posts 를 한 번만 fetch → 하위 섹션에 props 전달
 * - ForumCategorySection 은 탭 전환 시에만 추가 fetch
 */

import { useState, useEffect } from 'react';
import { ForumActivitySection } from '../../components/forum/ForumActivitySection';
import { ForumCategorySection } from '../../components/forum/ForumCategorySection';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';
import { ForumInfoSection } from '../../components/forum/ForumInfoSection';
import { forumApi } from '../../api';
import type { ForumCategory, ForumPost } from '../../types';
import { colors, spacing, typography } from '../../styles/theme';

export function ForumHomePage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [allPosts, setAllPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      forumApi.getCategories(),
      forumApi.getPosts({ limit: 30 }),
    ])
      .then(([catRes, postRes]) => {
        if (catRes.data) setCategories(catRes.data);
        if (postRes.data) setAllPosts(postRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      {/* Hero Header */}
      <div style={styles.heroHeader}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>💊 약사회 포럼</h1>
          <p style={styles.heroDesc}>
            약사 커뮤니티에서 정보를 교환하고 토론에 참여하세요
          </p>
        </div>
      </div>

      <div style={styles.content}>
        <ForumActivitySection
          categories={categories}
          allPosts={allPosts}
          loading={loading}
        />
        <ForumCategorySection
          prefetchedCategories={categories}
          prefetchedPosts={allPosts}
          parentLoading={loading}
        />
        <ForumWritePrompt />
        <ForumInfoSection />
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
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
};

export default ForumHomePage;
