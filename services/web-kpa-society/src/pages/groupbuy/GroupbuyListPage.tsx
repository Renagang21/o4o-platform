/**
 * GroupbuyListPage - 공동구매 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { groupbuyApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Groupbuy } from '../../types';

export function GroupbuyListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [groupbuys, setGroupbuys] = useState<Groupbuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentStatus = searchParams.get('status') as 'active' | 'ended' | undefined;

  useEffect(() => {
    loadData();
  }, [currentPage, currentStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await groupbuyApi.getGroupbuys({
        status: currentStatus,
        page: currentPage,
        limit: 12,
      });

      setGroupbuys(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      // API 오류 시 빈 목록 표시 (서비스 준비 중)
      console.warn('Groupbuy API not available:', err);
      setGroupbuys([]);
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; bg: string }> = {
      upcoming: { label: '예정', color: colors.accentYellow, bg: '#FEF3C7' },
      active: { label: '진행중', color: colors.accentGreen, bg: '#D1FAE5' },
      ended: { label: '종료', color: colors.neutral500, bg: colors.neutral100 },
      cancelled: { label: '취소', color: colors.accentRed, bg: '#FEE2E2' },
    };
    return badges[status] || badges.ended;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calculateDiscount = (original: number, group: number) => {
    return Math.round(((original - group) / original) * 100);
  };

  if (loading) {
    return <LoadingSpinner message="공동구매를 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="공동구매"
        description="회원 전용 공동구매에 참여하세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '공동구매' }]}
      />

      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(currentStatus === undefined ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleStatusChange('')}
        >
          전체
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(currentStatus === 'active' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleStatusChange('active')}
        >
          진행중
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(currentStatus === 'ended' ? styles.filterButtonActive : {}),
          }}
          onClick={() => handleStatusChange('ended')}
        >
          종료
        </button>
      </div>

      {groupbuys.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="공동구매가 없습니다"
          description="현재 진행 중인 공동구매가 없습니다."
        />
      ) : (
        <>
          <div style={styles.grid}>
            {groupbuys.map(item => {
              const badge = getStatusBadge(item.status);
              const discount = calculateDiscount(item.originalPrice, item.groupPrice);

              return (
                <Link key={item.id} to={`/groupbuy/${item.id}`} style={styles.itemLink}>
                  <Card hover padding="none">
                    <div style={styles.thumbnail}>
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} style={styles.thumbnailImage} />
                      ) : (
                        <div style={styles.thumbnailPlaceholder}>🛍️</div>
                      )}
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
                    <div style={styles.content}>
                      <span style={styles.category}>{item.category}</span>
                      <h3 style={styles.title}>{item.title}</h3>

                      <div style={styles.priceSection}>
                        <span style={styles.discount}>{discount}%</span>
                        <span style={styles.groupPrice}>{formatPrice(item.groupPrice)}원</span>
                        <span style={styles.originalPrice}>{formatPrice(item.originalPrice)}원</span>
                      </div>

                      <div style={styles.progressSection}>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${Math.min((item.currentParticipants / item.minParticipants) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <div style={styles.participantInfo}>
                          <span>{item.currentParticipants}명 참여</span>
                          <span>최소 {item.minParticipants}명</span>
                        </div>
                      </div>

                      <div style={styles.dateInfo}>
                        ~{new Date(item.endDate).toLocaleDateString()} 까지
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  itemLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  thumbnail: {
    position: 'relative',
    height: '180px',
    backgroundColor: colors.neutral100,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  statusBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  content: {
    padding: '16px',
  },
  category: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  title: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: '8px 0 12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  priceSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '12px',
  },
  discount: {
    color: colors.accentRed,
    fontWeight: 600,
    fontSize: '16px',
  },
  groupPrice: {
    fontWeight: 600,
    fontSize: '18px',
    color: colors.neutral900,
  },
  originalPrice: {
    ...typography.bodyS,
    color: colors.neutral400,
    textDecoration: 'line-through',
  },
  progressSection: {
    marginBottom: '12px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: colors.neutral100,
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  participantInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    ...typography.bodyS,
    color: colors.neutral500,
  },
  dateInfo: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
};
