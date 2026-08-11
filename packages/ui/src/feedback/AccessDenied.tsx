/**
 * AccessDenied — 권한 없음 안내 (공통)
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1
 *   WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1 에서 3개 서비스에
 *   byte-identical 로 복제됐던 컴포넌트를 Design Core(@o4o/ui)로 승격한다.
 *
 * 이 컴포넌트는 **표시 계약만** 담당한다. 권한/role/membership 판정은 호출 측 guard 가 한다.
 */

import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const ACCESS_DENIED_TITLE = '접근 권한이 없습니다';
export const ACCESS_DENIED_MESSAGE = '현재 계정으로는 이 기능을 사용할 수 없습니다.';

export interface AccessDeniedProps {
  /** 기본값 '접근 권한이 없습니다' */
  title?: string;
  /** 기본값 '현재 계정으로는 이 기능을 사용할 수 없습니다.' */
  description?: string;
  /** description 별칭 — 기존 서비스 컴포넌트 prop 호환 */
  message?: string;
  /** 홈 이동 경로. 기본 '/' */
  homeTo?: string;
  /** 홈 버튼 문구. 기본 '홈으로 돌아가기' */
  homeLabel?: string;
  /** 홈 버튼 노출. 기본 true */
  showHome?: boolean;
  /** 로그인 유도 버튼 노출 (미인증 안내용). 기본 false */
  showLogin?: boolean;
  /** 로그인 경로. 기본 '/login' */
  loginTo?: string;
  /** 이전 화면으로 돌아가기 노출. 기본 false */
  showBack?: boolean;
  /** 서비스 고유 보조 안내 */
  children?: ReactNode;
  className?: string;
}

export function AccessDenied({
  title = ACCESS_DENIED_TITLE,
  description,
  message,
  homeTo = '/',
  homeLabel = '홈으로 돌아가기',
  showHome = true,
  showLogin = false,
  loginTo = '/login',
  showBack = false,
  children,
  className,
}: AccessDeniedProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const body = description ?? message ?? ACCESS_DENIED_MESSAGE;

  return (
    <div className={`min-h-[60vh] flex items-center justify-center p-5 ${className ?? ''}`} role="alert">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-sm border border-slate-200">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2.5">{title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {showLogin && (
            <button
              type="button"
              className="px-5 py-2.5 bg-blue-600 text-white border-none rounded-lg text-sm font-medium cursor-pointer"
              onClick={() => navigate(loginTo, { state: { from: location.pathname + location.search } })}
            >
              로그인하기
            </button>
          )}
          {showHome && (
            <button
              type="button"
              className="px-5 py-2.5 bg-slate-100 text-slate-700 border-none rounded-lg text-sm font-medium cursor-pointer"
              onClick={() => navigate(homeTo)}
            >
              {homeLabel}
            </button>
          )}
          {showBack && (
            <button
              type="button"
              className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium cursor-pointer"
              onClick={() => navigate(-1)}
            >
              이전 화면으로 돌아가기
            </button>
          )}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

export default AccessDenied;
