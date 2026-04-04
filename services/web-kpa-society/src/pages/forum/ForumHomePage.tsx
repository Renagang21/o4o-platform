/**
 * ForumHomePage - 포럼 메인 홈 페이지
 *
 * 레이아웃:
 * ├─ HeroHeader             - 흰색 배경 + 하단 보더
 * ├─ ForumHubSection        - 포럼 허브 카드 (서버 집계)
 * ├─ ForumActivitySection   - 카테고리별 최근 활동 (서버 집계)
 * ├─ ForumCategorySection   - 카테고리 탭 + 글 목록
 * ├─ ForumWritePrompt       - 글쓰기 유도
 * └─ ForumInfoSection       - 이용안내 + 바로가기
 *
 * 데이터 로딩:
 * - categories 만 fetch → ForumCategorySection 탭 표시용
 * - ForumHubSection, ForumActivitySection 은 각각 독립 fetch
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ForumHubSection } from '../../components/forum/ForumHubSection';
import { ForumActivitySection } from '../../components/forum/ForumActivitySection';
import { ForumCategorySection } from '../../components/forum/ForumCategorySection';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';
import { ForumInfoSection } from '../../components/forum/ForumInfoSection';
import { forumApi } from '../../api';
import type { ForumCategory } from '../../types';
import { colors, spacing, typography } from '../../styles/theme';

export function ForumHomePage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    forumApi.getCategories()
      .then((res) => {
        if (res.data) setCategories(res.data);
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
          <div style={styles.heroActions}>
            <Link to="/forum/write" style={styles.heroWriteBtn}>글쓰기</Link>
            <Link to="/mypage/my-forums/request" style={styles.heroRequestBtn}>새 포럼 개설 신청</Link>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <ForumHubSection />
        <ForumActivitySection />
        <ForumCategorySection
          prefetchedCategories={categories}
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
  heroActions: {
    display: 'flex',
    gap: '12px',
    marginTop: spacing.md,
  },
  heroWriteBtn: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color 0.2s',
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
