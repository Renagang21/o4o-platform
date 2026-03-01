/**
 * BranchCampaignListPage - 분회 공동구매 목록
 *
 * WO-NETURE-CAMPAIGN-CLEAN-CORE-V1: Campaign 제거 완료.
 * 공동구매 vNext 설계 전까지 준비 중 상태 표시.
 */

import { Link } from 'react-router-dom';
import { PageHeader, EmptyState } from '../../components/common';
import { useBranchContext } from '../../contexts/BranchContext';

export function BranchCampaignListPage() {
  const { basePath } = useBranchContext();

  return (
    <div style={styles.container}>
      <PageHeader
        title="공동구매"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '공동구매' },
        ]}
      />

      <div style={styles.tabs}>
        <Link to={`${basePath}/groupbuy`} style={{ ...styles.tab, ...styles.tabActive }}>
          진행중
        </Link>
        <Link to={`${basePath}/groupbuy/history`} style={styles.tab}>
          참여 내역
        </Link>
      </div>

      <EmptyState
        icon="🛒"
        title="공동구매 서비스 준비 중"
        description="새로운 공동구매 시스템이 준비되면 알려드리겠습니다."
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
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: '#F5F5F5',
    color: '#6B7280',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
  },
};
