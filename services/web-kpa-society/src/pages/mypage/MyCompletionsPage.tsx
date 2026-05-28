/**
 * MyCompletionsPage - 내 수료 목록
 *
 * WO-O4O-COMPLETION-V1
 * 수료한 코스 목록 + 수료증 보기 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination, Card } from '../../components/common';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { MyPageLoadingState, MyPageEmptyState } from '@o4o/account-ui';
import { lmsApi } from '../../api/lms';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { CourseCompletionItem } from '../../types';

export function MyCompletionsPage() {
  const navigate = useNavigate();
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
      <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-5 lg:px-6 pb-10">
        <MyPageEmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="수료 내역을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <MyPageLoadingState message="수료 내역을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-5 lg:px-6 pb-10">
        <MyPageEmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          actionLabel="다시 시도"
          onAction={loadData}
        />
      </div>
    );
  }

  return (
    <MyPageLayout
      title="내 수료"
      description="완료한 코스 목록을 확인하세요"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '내 수료' },
      ]}
    >
      {completions.length === 0 ? (
        <MyPageEmptyState
          icon="📋"
          title="수료 내역이 없습니다"
          description="코스를 완료하면 수료 기록이 자동으로 생성됩니다."
          actionLabel="코스 보기"
          onAction={() => navigate('/lms')}
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
                    onClick={() => navigate('/mypage/certificates')}
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
    </MyPageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
