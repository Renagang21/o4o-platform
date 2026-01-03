/**
 * GroupbuyHistoryPage - 공동구매 참여 내역 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { groupbuyApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { GroupbuyParticipation } from '../../types';

export function GroupbuyHistoryPage() {
  const { user } = useAuth();
  const [participations, setParticipations] = useState<GroupbuyParticipation[]>([]);
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

      const res = await groupbuyApi.getMyParticipations({
        page: currentPage,
        limit: 10,
      });

      setParticipations(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: '대기중', color: colors.accentYellow, bg: '#FEF3C7' },
      confirmed: { label: '확정', color: colors.accentGreen, bg: '#D1FAE5' },
      cancelled: { label: '취소', color: colors.accentRed, bg: '#FEE2E2' },
    };
    return badges[status] || badges.pending;
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="참여 내역을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="참여 내역을 불러오는 중..." />;
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
        title="참여 내역"
        description="공동구매 참여 내역을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공동구매', href: '/groupbuy' },
          { label: '참여 내역' },
        ]}
      />

      {participations.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="참여 내역이 없습니다"
          description="공동구매에 참여해보세요!"
          action={{ label: '공동구매 보기', onClick: () => window.location.href = '/groupbuy' }}
        />
      ) : (
        <>
          <div style={styles.list}>
            {participations.map(p => {
              const badge = getStatusBadge(p.status);
              return (
                <Card key={p.id} padding="medium">
                  <div style={styles.item}>
                    <div style={styles.itemMain}>
                      <Link to={`/groupbuy/${p.groupbuyId}`} style={styles.itemTitle}>
                        {p.groupbuy.title}
                      </Link>
                      <div style={styles.itemMeta}>
                        <span>수량: {p.quantity}개</span>
                        <span>·</span>
                        <span>{formatPrice(p.totalPrice)}원</span>
                        <span>·</span>
                        <span>{new Date(p.participatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        color: badge.color,
                        backgroundColor: badge.bg,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </Card>
              );
            })}
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMain: {},
  itemTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    textDecoration: 'none',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    ...typography.bodyS,
    color: colors.neutral500,
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
};
