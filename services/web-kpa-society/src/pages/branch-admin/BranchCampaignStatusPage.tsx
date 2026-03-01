/**
 * BranchCampaignStatusPage — KPA-b (지부) 공동구매 수량 현황
 *
 * WO-NETURE-CAMPAIGN-CLEAN-CORE-V1: Campaign 제거 완료.
 * 공동구매 vNext 설계 전까지 준비 중 상태 표시.
 */

import { colors } from '../../styles/theme';

export function BranchCampaignStatusPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>공동구매 현황</h1>
      <p style={styles.pageDescription}>활성 캠페인의 분회별 주문 수량을 확인합니다.</p>

      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>🛒</span>
        <h3 style={styles.emptyTitle}>공동구매 서비스 준비 중</h3>
        <p style={styles.emptyDescription}>새로운 공동구매 시스템이 준비되면 현황이 표시됩니다.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '900px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '32px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '14px',
    color: colors.neutral500,
  },
};
