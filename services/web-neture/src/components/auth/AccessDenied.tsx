/**
 * AccessDenied — 권한 없음 안내 화면
 *
 * WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1
 *
 * 기존에는 guard 가 role 불충족 시 안내 없이 `/` 로 redirect 했다 —
 * 사용자는 "왜 홈으로 튕겼는지" 알 수 없었다. 판정 자체는 그대로 두고
 * 거부 **표시**만 안내 화면으로 바꾼다(권한/role/membership 판정 무변경).
 *
 * 문구는 5개 web 서비스 공통 표준을 따른다.
 * MembershipGate(가입 상태 축)와 역할을 분리한다 — 여기는 role 축 전용이다.
 */

import { useNavigate } from 'react-router-dom';

export const ACCESS_DENIED_TITLE = '접근 권한이 없습니다';
export const ACCESS_DENIED_MESSAGE = '현재 계정으로는 이 기능을 사용할 수 없습니다.';

export function AccessDenied({ message }: { message?: string }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-sm border border-slate-200">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2.5">{ACCESS_DENIED_TITLE}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{message || ACCESS_DENIED_MESSAGE}</p>
        <button
          type="button"
          className="px-5 py-2.5 bg-slate-100 text-slate-700 border-none rounded-lg text-sm font-medium cursor-pointer"
          onClick={() => navigate('/')}
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
