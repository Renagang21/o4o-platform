/**
 * ServiceOnboardingBanner
 * WO-BUSINESS-SERVICE-ONBOARDING-UNIFIED-V1
 *
 * GlucoseView 약국 온보딩 배너
 * 가드: 로그인 상태 AND 미승인 사용자
 * CTA: 기존 /apply 페이지로 이동
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ServiceOnboardingBanner() {
  const { isAuthenticated, isApproved, isPending, isRejected } = useAuth();

  // Guard: 로그인 + 미승인 사용자에게만 노출
  if (!isAuthenticated) return null;
  if (isApproved) return null;

  // 심사 중
  if (isPending) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
          <span className="text-3xl flex-shrink-0">&#x23F3;</span>
          <div>
            <p className="text-sm font-semibold text-amber-900 m-0">
              신청이 심사 중입니다
            </p>
            <p className="text-sm text-slate-600 m-0 mt-1">
              승인 후 서비스를 이용할 수 있습니다.{' '}
              <Link
                to="/apply/my-applications"
                className="text-blue-600 hover:underline"
              >
                신청 현황 보기
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 거부됨
  if (isRejected) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-4">
          <span className="text-3xl flex-shrink-0">&#x274C;</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900 m-0">
              신청이 반려되었습니다
            </p>
            <p className="text-sm text-slate-600 m-0 mt-1">
              다시 신청하시려면 아래 버튼을 눌러주세요.
            </p>
          </div>
          <Link
            to="/apply"
            className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors no-underline"
          >
            다시 신청하기
          </Link>
        </div>
      </div>
    );
  }

  // 기본: 미신청 상태
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
        <span className="text-3xl flex-shrink-0">&#x1F3E5;</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900 m-0">
            약국을 등록하고 GlucoseView를 시작하세요
          </p>
          <p className="text-sm text-slate-600 m-0 mt-1">
            약국 CGM 데이터 관리 서비스를 이용하시면 환자 혈당 데이터를 한 곳에서 관리할 수 있습니다.
          </p>
        </div>
        <Link
          to="/apply"
          className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors no-underline"
        >
          서비스 신청하기
        </Link>
      </div>
    </div>
  );
}
