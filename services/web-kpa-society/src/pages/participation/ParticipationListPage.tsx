/**
 * ParticipationListPage - 참여 목록 페이지
 *
 * 핵심 원칙:
 * - 사람을 평가하지 않는다
 * - 단지 묻고, 모으고, 보여줄 뿐이다
 * - 점수/등급/랭킹 개념 없음
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { participationApi } from '../../api/participation';
import { colors, typography } from '../../styles/theme';
import type { ParticipationSet, ParticipationStatus } from './types';
import { STATUS_LABELS, SCOPE_TYPE_LABELS, ParticipationStatus as StatusEnum } from './types';

export function ParticipationListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sets, setSets] = useState<ParticipationSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentStatus = searchParams.get('status') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentStatus, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      const response = await participationApi.getParticipationSets({
        status: currentStatus || undefined,
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
      });

      setSets(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      console.warn('Participation API not available:', err);
      setSets([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const handleStatusChange = (status: string) => {
    setSearchParams(prev => {
      if (status) {
        prev.set('status', status);
      } else {
        prev.delete('status');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const getStatusBadgeStyle = (status: ParticipationStatus): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    };

    switch (status) {
      case 'active':
        return { ...baseStyle, backgroundColor: colors.accentGreen, color: colors.white };
      case 'draft':
        return { ...baseStyle, backgroundColor: colors.neutral300, color: colors.neutral700 };
      case 'closed':
        return { ...baseStyle, backgroundColor: colors.neutral100, color: colors.neutral500 };
      default:
        return baseStyle;
    }
  };

  if (loading) {
    return <LoadingSpinner message="참여 목록을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="참여"
        description="설문과 퀴즈에 참여하고 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '참여' }]}
      />

      <div style={styles.toolbar}>
        <div style={styles.statusFilters}>
          <button
            style={{
              ...styles.filterButton,
              ...(!currentStatus ? styles.filterButtonActive : {}),
            }}
            onClick={() => handleStatusChange('')}
          >
            전체
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(currentStatus === StatusEnum.ACTIVE ? styles.filterButtonActive : {}),
            }}
            onClick={() => handleStatusChange(StatusEnum.ACTIVE)}
          >
            진행 중
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(currentStatus === StatusEnum.CLOSED ? styles.filterButtonActive : {}),
            }}
            onClick={() => handleStatusChange(StatusEnum.CLOSED)}
          >
            종료됨
          </button>
        </div>

        <Link to="/participation/create" style={styles.createButton}>
          새 참여 만들기
        </Link>
      </div>

      {sets.length === 0 ? (
        <EmptyState
          icon="📋"
          title="참여 항목이 없습니다"
          description="새로운 설문이나 퀴즈를 만들어보세요"
          action={{
            label: '새 참여 만들기',
            onClick: () => (window.location.href = '/participation/create'),
          }}
        />
      ) : (
        <>
          <div style={styles.setList}>
            {sets.map(set => (
              <Link
                key={set.id}
                to={
                  set.status === StatusEnum.ACTIVE
                    ? `/participation/${set.id}/respond`
                    : `/participation/${set.id}/results`
                }
                style={styles.setLink}
              >
                <Card hover padding="medium">
                  <div style={styles.setHeader}>
                    <span style={getStatusBadgeStyle(set.status)}>
                      {STATUS_LABELS[set.status]}
                    </span>
                    <span style={styles.scopeBadge}>
                      {SCOPE_TYPE_LABELS[set.scope.scopeType]}
                    </span>
                  </div>
                  <h3 style={styles.setTitle}>{set.title}</h3>
                  {set.description && (
                    <p style={styles.setDescription}>{set.description}</p>
                  )}
                  <div style={styles.setMeta}>
                    <span>질문 {set.questions.length}개</span>
                    <span>·</span>
                    <span>
                      {set.scope.anonymity === 'anonymous' ? '익명' : '기명'}
                    </span>
                    {set.scope.endAt && (
                      <>
                        <span>·</span>
                        <span>
                          마감: {new Date(set.scope.endAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statusFilters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  setList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  setLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  setHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  scopeBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
  },
  setTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  setDescription: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '8px',
    marginBottom: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  setMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    ...typography.bodyS,
    color: colors.neutral500,
  },
};
