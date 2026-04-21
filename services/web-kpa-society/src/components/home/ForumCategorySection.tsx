/**
 * ForumCategorySection — Home 허브 포럼 카테고리 그리드
 *
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1
 * CommunityHubPage ForumSection 스타일 재활용
 */

import { Link } from 'react-router-dom';
import type { HomeForumCategory } from '../../api/home';
import { colors, spacing, typography } from '../../styles/theme';

interface Props {
  categories: HomeForumCategory[];
  loading?: boolean;
}

export function ForumCategorySection({ categories, loading }: Props) {
  if (loading) return null;

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>포럼</h2>
        <Link to="/forum" style={styles.sectionLink}>포럼 바로가기 →</Link>
      </div>
      {categories.length > 0 ? (
        <div style={styles.categoryGrid}>
          {categories.slice(0, 6).map((cat) => (
            <Link key={cat.id} to={`/forum/all?category=${cat.id}`} style={styles.categoryCard}>
              <span style={styles.categoryEmoji}>{cat.iconEmoji || '💬'}</span>
              <span style={styles.categoryName}>{cat.name}</span>
              <span style={styles.categoryCount}>{cat.postCount}개 글</span>
            </Link>
          ))}
        </div>
      ) : (
        <p style={styles.empty}>등록된 포럼이 없습니다.</p>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {},
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  categoryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 12px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s',
  },
  categoryEmoji: {
    fontSize: '24px',
  },
  categoryName: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  categoryCount: {
    fontSize: '11px',
    color: colors.neutral400,
  },
  empty: {
    color: colors.neutral400,
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px 0',
  },
};
