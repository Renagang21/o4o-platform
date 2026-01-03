/**
 * BranchesPage - 지부/분회 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { organizationApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Organization } from '../../types';

export function BranchesPage() {
  const [branches, setBranches] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationApi.getBranches();
      setBranches(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 분회 (chapter) 타입만 필터링
  const chapters = branches.filter(b => b.type === 'chapter');

  if (loading) {
    return <LoadingSpinner message="지부/분회 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="지부/분회"
        description="각 지역 분회를 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '조직소개', href: '/organization' },
          { label: '지부/분회' },
        ]}
      />

      {chapters.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="등록된 분회가 없습니다"
          description="분회 정보가 준비 중입니다."
        />
      ) : (
        <div style={styles.grid}>
          {chapters.map(chapter => (
            <Link key={chapter.id} to={`/organization/branches/${chapter.id}`} style={styles.itemLink}>
              <Card hover padding="large">
                <div style={styles.itemIcon}>🏢</div>
                <h3 style={styles.itemTitle}>{chapter.name}</h3>
                {chapter.description && (
                  <p style={styles.itemDescription}>{chapter.description}</p>
                )}
                <div style={styles.itemMeta}>
                  <span>👥 회원 {chapter.memberCount}명</span>
                </div>
                {chapter.phone && (
                  <div style={styles.itemContact}>
                    📞 {chapter.phone}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  itemLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  itemIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  itemTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '8px',
  },
  itemDescription: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginBottom: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  itemMeta: {
    ...typography.bodyS,
    color: colors.neutral600,
  },
  itemContact: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '8px',
  },
};
