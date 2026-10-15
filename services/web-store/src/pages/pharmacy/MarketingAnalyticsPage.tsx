import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { MonitoringNavigation } from './monitoring/MonitoringNavigation';
import { StoreMarketingAnalyticsView } from '@o4o/store-ui-core';
import { colors } from '../../styles/theme';
import { useMonitoringScope } from './monitoring/useMonitoringScope';
import { useMarketingAnalytics } from './monitoring/useMarketingAnalytics';

export function MarketingAnalyticsPage() {
  const scope = useMonitoringScope();
  if (!scope.ready) return <p role="status">매장을 선택하고 서비스 연결을 확인해 주세요.</p>;
  return <MarketingAnalytics key={scope.key} organizationId={scope.organizationId!} />;
}

function MarketingAnalytics({ organizationId }: { organizationId: string }) {
  const { fetchAnalytics, loading, error } = useMarketingAnalytics(organizationId);
  const { pathname } = useLocation();
  const [retry, setRetry] = useState(0);
  return <>
    <MonitoringNavigation />
    {loading && <p role="status">홍보 분석을 불러오는 중입니다.</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h1 className="font-semibold">홍보 분석</h1>
      <p>{error}</p>
      <button type="button" onClick={() => setRetry(v => v + 1)}>다시 불러오기</button>
    </div>}
    <div hidden={loading || !!error} aria-busy={loading}>
      <StoreMarketingAnalyticsView key={retry} fetchAnalytics={fetchAnalytics}
        backTo={`${storeWorkspaceBase(pathname)}/workspace/use`} primaryColor={colors.primary} breadcrumbRootLabel="분석" />
    </div>
  </>;
}
