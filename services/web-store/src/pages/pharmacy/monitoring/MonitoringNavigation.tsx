import { Link, useLocation } from 'react-router-dom';
import { storeWorkspaceBase } from '../../../components/store/StoreWorkflowNavigation';

export function MonitoringNavigation() {
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  return <nav aria-label="매장 상담과 홍보 분석" className="mb-4 flex flex-wrap gap-3 text-sm">
    <Link to={`${base}/workspace/use`}>매장에서 활용</Link>
    <Link to={`${base}/requests`} aria-current={pathname.endsWith('/requests') ? 'page' : undefined}>상담 요청</Link>
    <Link to={`${base}/analytics/marketing`} aria-current={pathname.endsWith('/analytics/marketing') ? 'page' : undefined}>홍보 분석</Link>
  </nav>;
}
