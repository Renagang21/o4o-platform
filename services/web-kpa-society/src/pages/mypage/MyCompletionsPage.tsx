/**
 * MyCompletionsPage - 내 수료 목록
 *
 * WO-O4O-COMPLETION-V1
 * 수료한 코스 목록 + 수료증 보기 링크
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { lmsApi } from '../../api/lms';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { CourseCompletionItem } from '../../types';

export function MyCompletionsPage() {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<CourseCompletionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user) loadData();
  }, [user, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await lmsApi.getMyCompletions({ page: currentPage, limit: 12 });
      setCompletions(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="수료 내역을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="수료 내역을 불러오는 중..." />;
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
        title="내 수료"
        description="완료한 코스 목록을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: '/mypage' },
          { label: '내 수료' },
        ]}
      />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {completions.length === 0 ? (
        <EmptyState
          icon="📋"
          title="수료 내역이 없습니다"
          description="코스를 완료하면 수료 기록이 자동으로 생성됩니다."
          action={{ label: '코스 보기', onClick: () => window.location.href = '/lms/courses' }}
        />
      ) : (
        <>
          <div style={styles.grid}>
            {completions.map(c => (
              <Card key={c.id} padding="large">
                <div style={styles.completionContent}>
                  <div style={styles.completionIcon}>✅</div>
                  <h3 style={styles.completionTitle}>{c.courseTitle}</h3>
                  <div style={styles.completionInfo}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>수료일</span>
                      <span style={styles.infoValue}>
                        {new Date(c.completedAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    style={styles.certButton}
                    onClick={() => window.location.href = '/mypage/certificates'}
                  >
                    수료증 보기
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  completionContent: {
    textAlign: 'center',
  },
  completionIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  completionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  completionInfo: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  infoValue: {
    ...typography.bodyS,
    color: colors.neutral800,
    fontWeight: 500,
  },
  certButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
