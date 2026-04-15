/**
 * MyCreditsPage - 네처 크레딧 페이지
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * 잔액 표시 + 거래 내역 (적립 기록)
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { creditApi } from '../../api/credit';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { CreditTransaction } from '../../types';

const SOURCE_LABELS: Record<string, string> = {
  lesson_complete: '단계 완료',
  quiz_pass: '퀴즈 통과',
  course_complete: '코스 완료',
};

export function MyCreditsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
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

      const [balanceRes, txRes] = await Promise.all([
        creditApi.getMyBalance(),
        creditApi.getMyTransactions({ page: currentPage, limit: 20 }),
      ]);

      setBalance(balanceRes.data.balance);
      setTransactions(txRes.data.transactions);
      setTotalPages(txRes.data.pagination.totalPages);
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
          description="크레딧을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="크레딧 정보를 불러오는 중..." />;
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
        title="네처 크레딧"
        description="학습 활동으로 획득한 크레딧을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: '/mypage' },
          { label: '네처 크레딧' },
        ]}
      />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {/* Balance Card */}
      <Card padding="large">
        <div style={styles.balanceSection}>
          <div style={styles.balanceLabel}>보유 크레딧</div>
          <div style={styles.balanceValue}>{balance.toLocaleString()} C</div>
          <div style={styles.balanceHint}>학습 활동을 완료하면 크레딧이 적립됩니다</div>
        </div>
      </Card>

      {/* Reward Guide */}
      <div style={styles.rewardGuide}>
        <div style={styles.rewardItem}>
          <span style={styles.rewardLabel}>단계 완료</span>
          <span style={styles.rewardValue}>+10 C</span>
        </div>
        <div style={styles.rewardItem}>
          <span style={styles.rewardLabel}>퀴즈 통과</span>
          <span style={styles.rewardValue}>+20 C</span>
        </div>
        <div style={styles.rewardItem}>
          <span style={styles.rewardLabel}>코스 완료</span>
          <span style={styles.rewardValue}>+50 C</span>
        </div>
      </div>

      {/* Transaction History */}
      <h3 style={styles.sectionTitle}>적립 내역</h3>
      {transactions.length === 0 ? (
        <EmptyState
          icon="📋"
          title="적립 내역이 없습니다"
          description="학습 활동을 완료하면 크레딧이 적립됩니다."
          action={{ label: '학습 시작', onClick: () => window.location.href = '/lms/courses' }}
        />
      ) : (
        <>
          <div style={styles.txList}>
            {transactions.map(tx => (
              <div key={tx.id} style={styles.txRow}>
                <div style={styles.txLeft}>
                  <div style={styles.txSource}>
                    {SOURCE_LABELS[tx.sourceType] || tx.sourceType}
                  </div>
                  <div style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={{
                  ...styles.txAmount,
                  color: tx.amount > 0 ? colors.success : colors.error,
                }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} C
                </div>
              </div>
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
  balanceSection: {
    textAlign: 'center',
    padding: '24px 0',
  },
  balanceLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginBottom: '8px',
  },
  balanceValue: {
    fontSize: '40px',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '8px',
  },
  balanceHint: {
    ...typography.bodyS,
    color: colors.neutral400,
  },
  rewardGuide: {
    display: 'flex',
    gap: '16px',
    margin: '24px 0',
  },
  rewardItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  rewardLabel: {
    ...typography.bodyS,
    color: colors.neutral600,
    marginBottom: '4px',
  },
  rewardValue: {
    ...typography.bodyM,
    fontWeight: 600,
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: '32px 0 16px',
  },
  txList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  txRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.white,
  },
  txLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  txSource: {
    ...typography.bodyM,
    fontWeight: 500,
    color: colors.neutral800,
  },
  txDate: {
    ...typography.bodyS,
    color: colors.neutral400,
  },
  txAmount: {
    ...typography.bodyL,
    fontWeight: 600,
  },
};
