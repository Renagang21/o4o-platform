/**
 * GroupbuyDetailPage - 공동구매 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { groupbuyApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { Groupbuy, GroupbuyParticipation } from '../../types';

export function GroupbuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupbuy, setGroupbuy] = useState<Groupbuy | null>(null);
  const [participation, setParticipation] = useState<GroupbuyParticipation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [participating, setParticipating] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await groupbuyApi.getGroupbuy(id!);
      setGroupbuy(res.data);

      if (user) {
        try {
          const participationRes = await groupbuyApi.getParticipation(id!);
          setParticipation(participationRes.data);
        } catch {
          // 미참여 상태
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '공동구매를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!groupbuy || groupbuy.status !== 'active') {
      alert('현재 참여할 수 없는 상태입니다.');
      return;
    }

    try {
      setParticipating(true);
      const res = await groupbuyApi.participate(id!, quantity);
      setParticipation(res.data);
      setGroupbuy({
        ...groupbuy,
        currentParticipants: groupbuy.currentParticipants + 1,
      });
      alert('참여가 완료되었습니다!');
    } catch (err) {
      alert('참여에 실패했습니다.');
    } finally {
      setParticipating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('참여를 취소하시겠습니까?')) return;

    try {
      await groupbuyApi.cancelParticipation(id!);
      setParticipation(null);
      if (groupbuy) {
        setGroupbuy({
          ...groupbuy,
          currentParticipants: groupbuy.currentParticipants - 1,
        });
      }
      alert('참여가 취소되었습니다.');
    } catch (err) {
      alert('취소에 실패했습니다.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calculateDiscount = (original: number, group: number) => {
    return Math.round(((original - group) / original) * 100);
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

  if (loading) {
    return <LoadingSpinner message="공동구매를 불러오는 중..." />;
  }

  if (error || !groupbuy) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="공동구매를 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 공동구매입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/groupbuy') }}
        />
      </div>
    );
  }

  const badge = getStatusBadge(groupbuy.status);
  const discount = calculateDiscount(groupbuy.originalPrice, groupbuy.groupPrice);
  const progressPercent = Math.min((groupbuy.currentParticipants / groupbuy.minParticipants) * 100, 100);
  const isAchieved = groupbuy.currentParticipants >= groupbuy.minParticipants;

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공동구매', href: '/groupbuy' },
          { label: groupbuy.title },
        ]}
      />

      <div style={styles.content}>
        <div style={styles.main}>
          {/* 이미지 */}
          <div style={styles.imageSection}>
            {groupbuy.thumbnail ? (
              <img src={groupbuy.thumbnail} alt={groupbuy.title} style={styles.image} />
            ) : (
              <div style={styles.imagePlaceholder}>🛍️</div>
            )}
          </div>

          {/* 상세 정보 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>상품 정보</h2>
            <div style={styles.description}>
              {groupbuy.description}
            </div>
          </Card>
        </div>

        {/* 사이드바 */}
        <div style={styles.sidebar}>
          <Card padding="large">
            <span
              style={{
                ...styles.statusBadge,
                color: badge.color,
                backgroundColor: badge.bg,
              }}
            >
              {badge.label}
            </span>

            <span style={styles.category}>{groupbuy.category}</span>
            <h1 style={styles.title}>{groupbuy.title}</h1>

            <div style={styles.priceSection}>
              <span style={styles.discount}>{discount}% 할인</span>
              <div style={styles.prices}>
                <span style={styles.groupPrice}>{formatPrice(groupbuy.groupPrice)}원</span>
                <span style={styles.originalPrice}>{formatPrice(groupbuy.originalPrice)}원</span>
              </div>
            </div>

            <div style={styles.progressSection}>
              <div style={styles.progressHeader}>
                <span>참여 현황</span>
                <span style={{ color: isAchieved ? colors.accentGreen : colors.primary }}>
                  {groupbuy.currentParticipants}명 / 최소 {groupbuy.minParticipants}명
                </span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`,
                    backgroundColor: isAchieved ? colors.accentGreen : colors.primary,
                  }}
                />
              </div>
              {isAchieved && (
                <p style={styles.achievedText}>✓ 최소 인원 달성!</p>
              )}
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <span>모집 기간</span>
                <span>
                  {new Date(groupbuy.startDate).toLocaleDateString()} ~{' '}
                  {new Date(groupbuy.endDate).toLocaleDateString()}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span>최대 인원</span>
                <span>{groupbuy.maxParticipants}명</span>
              </div>
              <div style={styles.infoItem}>
                <span>주최</span>
                <span>{groupbuy.organizerName}</span>
              </div>
            </div>

            {participation ? (
              <div style={styles.participatedSection}>
                <p style={styles.participatedText}>✓ 참여 완료</p>
                <p style={styles.participatedInfo}>
                  수량: {participation.quantity}개 / {formatPrice(participation.totalPrice)}원
                </p>
                {groupbuy.status === 'active' && (
                  <button style={styles.cancelButton} onClick={handleCancel}>
                    참여 취소
                  </button>
                )}
              </div>
            ) : groupbuy.status === 'active' ? (
              <div style={styles.participateSection}>
                <div style={styles.quantitySection}>
                  <label>수량</label>
                  <div style={styles.quantityControl}>
                    <button
                      style={styles.quantityButton}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </button>
                    <span style={styles.quantityValue}>{quantity}</span>
                    <button
                      style={styles.quantityButton}
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={styles.totalPrice}>
                  총 금액: <strong>{formatPrice(groupbuy.groupPrice * quantity)}원</strong>
                </div>
                <button
                  style={styles.participateButton}
                  onClick={handleParticipate}
                  disabled={participating}
                >
                  {participating ? '참여 중...' : '참여하기'}
                </button>
              </div>
            ) : (
              <p style={styles.closedText}>
                {groupbuy.status === 'upcoming' ? '아직 시작되지 않았습니다.' : '종료된 공동구매입니다.'}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '32px',
  },
  main: {},
  sidebar: {
    position: 'sticky',
    top: '24px',
    height: 'fit-content',
  },
  imageSection: {
    backgroundColor: colors.neutral100,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  description: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '12px',
  },
  category: {
    ...typography.bodyS,
    color: colors.neutral500,
    display: 'block',
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: '8px 0 20px',
  },
  priceSection: {
    padding: '16px 0',
    borderTop: `1px solid ${colors.neutral200}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '20px',
  },
  discount: {
    color: colors.accentRed,
    fontWeight: 600,
    fontSize: '14px',
  },
  prices: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    marginTop: '8px',
  },
  groupPrice: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  originalPrice: {
    fontSize: '16px',
    color: colors.neutral400,
    textDecoration: 'line-through',
  },
  progressSection: {
    marginBottom: '20px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: colors.neutral700,
  },
  progressBar: {
    height: '8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  achievedText: {
    color: colors.accentGreen,
    fontSize: '13px',
    marginTop: '8px',
    fontWeight: 500,
  },
  infoList: {
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
    fontSize: '14px',
  },
  participatedSection: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  participatedText: {
    color: colors.accentGreen,
    fontWeight: 600,
    fontSize: '18px',
    margin: 0,
  },
  participatedInfo: {
    color: colors.neutral500,
    fontSize: '14px',
    marginTop: '8px',
  },
  cancelButton: {
    marginTop: '16px',
    padding: '10px 24px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  participateSection: {},
  quantitySection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  quantityButton: {
    width: '32px',
    height: '32px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    backgroundColor: colors.white,
    fontSize: '18px',
    cursor: 'pointer',
  },
  quantityValue: {
    fontSize: '18px',
    fontWeight: 500,
    minWidth: '32px',
    textAlign: 'center',
  },
  totalPrice: {
    textAlign: 'right',
    fontSize: '16px',
    marginBottom: '16px',
  },
  participateButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  closedText: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
};
