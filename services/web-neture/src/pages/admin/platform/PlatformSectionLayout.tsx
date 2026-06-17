/**
 * PlatformSectionLayout — /admin/platform section 공통 레이아웃 + local nav
 *
 * WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
 *
 * platform-admin section 내부 navigation(플랫폼 홈 / 계정 관리 / 서비스 관리)만 제공.
 * 전체 Neture admin sidebar 와 통합하지 않는다(section 내부 한정).
 * guard 는 상위 PlatformRoute(platform:admin/super_admin)가 담당.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const NAV = [
  { to: '/admin/platform', label: '플랫폼 홈', end: true },
  { to: '/admin/platform/accounts', label: '계정 관리', end: false },
  { to: '/admin/platform/services', label: '서비스 관리', end: false },
  { to: '/admin/platform/users', label: '사용자 조회', end: false },
  { to: '/admin/platform/roles', label: '역할 관리', end: false },
  // WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1
  { to: '/admin/platform/service-audience', label: '서비스 대상 정책', end: false },
];

export default function PlatformSectionLayout() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* section 헤더 + local nav */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-700">O4O 플랫폼 관리</span>
        <span className="ml-2 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5">
          platform admin
        </span>
      </div>
      <nav className="flex gap-1 border-b border-slate-200 mb-6">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors no-underline ${
                isActive
                  ? 'text-slate-900 border-slate-800'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
