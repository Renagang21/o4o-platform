/**
 * NotFoundPage — GlycoPharm 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1
 *   5개 web 서비스의 404 화면이 서로 달랐다. 어떤 서비스는 요청 주소를 보여주고 뒤로가기를
 *   제공했지만(Neture / Pharmacy-Hub), 여기서는 "페이지를 찾을 수 없습니다" 문구만 있고
 *   사용자가 무슨 주소로 들어왔는지, 직전 화면으로 어떻게 돌아가는지 알 수 없었다.
 *   canonical(Neture / Pharmacy-Hub) 형태로 맞춘다 — 404 코드 · 표준 문구 · 요청 경로 표시 ·
 *   [홈으로 이동] + [이전 화면으로 돌아가기]. 서비스 고유 보조 링크(커뮤니티 · 문의하기)는 유지한다.
 *
 * 선행: WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1 (404 = minimal nav, footer 제외 의도)
 */

import { NavLink, useLocation, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-8xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-800">
          요청하신 페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
        </p>
        <p className="mt-4 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-400">
          {location.pathname}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <NavLink
            to="/"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            홈으로 이동
          </NavLink>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            이전 화면으로 돌아가기
          </button>
        </div>

        {/* 서비스 고유 보조 링크 (기존 유지) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <NavLink to="/forum" className="text-sm text-slate-500 underline-offset-4 hover:underline">
            커뮤니티
          </NavLink>
          <NavLink to="/contact" className="text-sm text-slate-500 underline-offset-4 hover:underline">
            문의하기
          </NavLink>
        </div>
      </div>
    </div>
  );
}
