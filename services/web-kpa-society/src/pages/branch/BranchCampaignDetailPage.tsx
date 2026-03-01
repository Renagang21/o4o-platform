/**
 * BranchCampaignDetailPage - 분회 공동구매 상세
 *
 * WO-NETURE-CAMPAIGN-CLEAN-CORE-V1: Campaign 제거 완료.
 * 공동구매 vNext 설계 전까지 준비 중 상태 표시.
 */

import { EmptyState } from '../../components/common';

export function BranchCampaignDetailPage() {
  return (
    <div style={styles.container}>
      <EmptyState
        icon="🛒"
        title="공동구매 서비스 준비 중"
        description="새로운 공동구매 시스템이 준비되면 알려드리겠습니다."
        action={{ label: '목록으로', onClick: () => window.history.back() }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
};
