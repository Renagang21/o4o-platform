/**
 * ForumHomePage - 포럼 메인 홈 페이지
 *
 * 포럼 목록(ForumListPage)과 분리된 포럼 랜딩 페이지
 * 컴포넌트 트리 패턴: 메인 홈 페이지와 동일 구조
 *
 * ForumHomePage
 * ├─ ForumQuickActions      - 빠른 접근 (글쓰기, 전체 글, 인기 글, 공지)
 * ├─ ForumActivitySection   - 최근 활동 (최근 글 + 인기 글)
 * ├─ ForumCategorySection   - 카테고리 둘러보기
 * ├─ ForumWritePrompt       - 글쓰기 유도
 * └─ ForumInfoSection       - 이용안내 + 바로가기
 */

import { ForumQuickActions } from '../../components/forum/ForumQuickActions';
import { ForumActivitySection } from '../../components/forum/ForumActivitySection';
import { ForumCategorySection } from '../../components/forum/ForumCategorySection';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';
import { ForumInfoSection } from '../../components/forum/ForumInfoSection';
import { PageHeader } from '../../components/common';
import { colors, spacing } from '../../styles/theme';

export function ForumHomePage() {
  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <PageHeader
          title="포럼"
          description="약사 커뮤니티에서 정보를 교환하고 토론에 참여하세요"
          breadcrumb={[{ label: '홈', href: '/' }, { label: '포럼' }]}
        />
        <ForumQuickActions />
        <ForumActivitySection />
        <ForumCategorySection />
        <ForumWritePrompt />
        <ForumInfoSection />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
};

export default ForumHomePage;
