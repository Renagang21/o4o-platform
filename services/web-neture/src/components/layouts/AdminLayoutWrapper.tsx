/**
 * Neture AdminLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-NETURE-ADMIN-DASHBOARD-ACTUAL-STRUCTURE-FIX-V1:
 *   admin sidebar 가 operator 메뉴 superset 으로 보이던 문제 해소 — getAdminMenu()
 *   재설계로 admin 전용 항목 + 운영자 업무 바로가기 1개만 표시.
 *
 * WO-O4O-NETURE-UX-LABEL-LAYOUT-SLIM-ALIGNMENT-V1:
 *   serviceName 을 OperatorLayoutWrapper 와 동일하게 "Neture" 로 통일.
 *   관리자/운영자 구분은 serviceName 이 아니라 페이지 제목·사이드바·role context 에서 표현.
 *
 * admin 전용 레이아웃. GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { getAdminMenu } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function AdminLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = getAdminMenu();

  return (
    <div className="min-h-screen flex flex-col">
      <NetureGlobalHeader />
      <OperatorShell
        serviceName="Neture"
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
        dashboardLink="/admin"
        user={user ? { name: user.name || '', email: user.email } : null}
        onLogout={() => { logout(); navigate('/'); }}
        renderHeader={() => null}
        sidebarTopOffset="top-20"
      >
        <Outlet />
      </OperatorShell>
    </div>
  );
}
