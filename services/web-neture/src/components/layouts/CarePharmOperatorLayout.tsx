import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
import { NetureBottomNav } from '../NetureBottomNav';

/** Display scope only: the existing OperatorRoute and assigned-business API remain authoritative. */
const MENU: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: 'CarePharm 운영 홈', path: '/operator', exact: true }],
  approvals: [{ label: '가입 · 공급 제안 · 콘텐츠', path: '/operator/semi-franchises' }],
  content: [{ label: '홈 · 공개 공지', path: '/operator/home-presentation/carepharm', exact: true }],
  forum: [{ label: '회원 커뮤니티 운영', path: '/communities/business%3Acarepharm/forum' }],
};

export default function CarePharmOperatorLayout() {
  const { pathname } = useLocation();
  if (pathname === '/operator') return <Navigate to="/operator/semi-franchises?key=carepharm&tab=memberships" replace />;
  // Do not mount a representative-site console or issue its requests on this business host.
  if (pathname !== '/operator/home-presentation/carepharm' && pathname !== '/operator/semi-franchises' && !pathname.startsWith('/operator/semi-franchises/')) {
    return <Navigate to="/operator" replace />;
  }
  return <>
    <OperatorAreaShell header={<NetureGlobalHeader />} menuItems={MENU} capabilities={ENABLED_CAPABILITIES} menuLabel="CarePharm 운영 메뉴">
      <div className="mb-4 rounded-xl border bg-white p-4">
        <p className="font-semibold">CarePharm · 만성질환 약국 협업체 운영</p>
        <p className="mt-2 text-sm text-gray-600">참여 약국의 가입, 공급 제안, 회원 전용 콘텐츠를 관리합니다.</p>
      </div>
      <Outlet />
    </OperatorAreaShell>
    <NetureBottomNav />
  </>;
}
