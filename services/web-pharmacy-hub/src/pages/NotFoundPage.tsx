/**
 * NotFoundPage — Pharmacy-Hub 404 안내
 *
 * WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1
 *
 * 왜 필요한가
 *   App.tsx 의 catch-all 은 `<Navigate to="/" replace />` 였다. 선언되지 않은 경로로 들어오면
 *   아무 안내 없이 홈으로 튕겼고, 요청했던 주소는 사라졌다. 사용자는 "주소를 잘못 입력했는지",
 *   "페이지가 없어졌는지", "권한이 없는지" 를 구분할 수 없었다.
 *
 *   redirect 가 아니라 이 화면을 그 자리에서 render 한다. 주소창의 요청 URL 은 그대로 유지된다.
 *
 * 이 화면은 API 를 호출하지 않는다.
 * layout(StoreOwnerShell 등) 밖에 두어 인증·역할 컨텍스트가 없는 경로에서도 렌더된다.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-xl font-bold text-slate-800">
          요청하신 페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
        </p>
        <p className="mt-4 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-400">
          {location.pathname}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900"
          >
            홈으로 이동
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            이전 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
