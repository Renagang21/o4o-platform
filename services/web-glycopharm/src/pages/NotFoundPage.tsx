import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-slate-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">페이지를 찾을 수 없습니다</h2>
        <p className="text-slate-500 mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        {/* WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1: 404 minimal 복귀 네비 정합 (KCos/KPA 표준 — 홈/커뮤니티/문의).
            선행: WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1 (404=minimal nav, footer 제외 의도). */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로
          </NavLink>
          <NavLink
            to="/forum"
            className="px-5 py-2.5 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors"
          >
            커뮤니티
          </NavLink>
          <NavLink
            to="/contact"
            className="px-5 py-2.5 text-sm font-medium text-slate-600 border rounded-xl hover:bg-slate-50 transition-colors"
          >
            문의하기
          </NavLink>
        </div>
      </div>
    </div>
  );
}
