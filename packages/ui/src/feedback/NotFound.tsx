/**
 * NotFound — 404 안내 (공통)
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1
 *   WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1 / WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1
 *   에서 5개 서비스가 각자 맞춘 404 화면의 canonical 형태다 —
 *   404 코드 · 표준 문구 · 요청 경로 표시 · [홈으로 이동] + [이전 화면으로 돌아가기].
 *
 * 이 화면은 API 를 호출하지 않는다. 서비스 고유 보조 링크는 children 으로 받는다.
 */

import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const NOT_FOUND_TITLE = '요청하신 페이지를 찾을 수 없습니다.';
export const NOT_FOUND_DESCRIPTION = '주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.';

export interface NotFoundProps {
  title?: string;
  description?: string;
  /** 표시할 요청 경로. 기본은 현재 location.pathname */
  path?: string;
  /** 요청 경로 표시 여부. 기본 true */
  showPath?: boolean;
  /** 서비스 고유 보조 링크 */
  children?: ReactNode;
  className?: string;
}

export function NotFound({
  title = NOT_FOUND_TITLE,
  description = NOT_FOUND_DESCRIPTION,
  path,
  showPath = true,
  children,
  className,
}: NotFoundProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const shown = path ?? location.pathname;

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 px-4 ${className ?? ''}`}>
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        {showPath && (
          <p className="mt-4 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-400">
            {shown}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900"
          >
            홈으로 이동
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            이전 화면으로 돌아가기
          </button>
        </div>
        {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">{children}</div>}
      </div>
    </div>
  );
}

export default NotFound;
