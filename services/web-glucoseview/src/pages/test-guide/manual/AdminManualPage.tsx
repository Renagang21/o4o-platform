/**
 * AdminManualPage - 관리자 역할 매뉴얼 (내부용)
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import TestGuideLayout from '../../../components/layouts/TestGuideLayout';

export default function AdminManualPage() {
  const { user, isAuthenticated } = useAuth();

  // 권한 체크: admin만 접근 가능
  if (!isAuthenticated || !user?.roles.includes('admin')) {
    return <Navigate to="/test-guide" replace />;
  }

  return (
    <TestGuideLayout title="관리자 매뉴얼" subtitle="GlucoseView 플랫폼 관리 가이드 (내부용)">
      {/* 내부용 경고 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-center">
        <p className="text-sm text-red-600 font-medium">이 문서는 내부 관리자 전용입니다. 외부 공개 금지.</p>
      </div>

      {/* 이 역할은 무엇을 하는가 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">관리자는 무엇을 하나요?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          관리자는 GlucoseView <strong>플랫폼 전체를 관리</strong>하는 역할입니다.
          약사 계정 승인, 시스템 설정, 데이터 관리를 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">로그인 후 첫 화면</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          로그인하면 <strong>관리자 페이지</strong>로 이동합니다.
          신청 목록, 사용자 관리, 시스템 상태를 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">자주 사용하는 기능</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
            <div>
              <strong className="text-sm text-slate-800">신청 관리</strong>
              <p className="text-sm text-slate-500 mt-1">약사 가입 신청을 검토하고 승인합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
            <div>
              <strong className="text-sm text-slate-800">사용자 관리</strong>
              <p className="text-sm text-slate-500 mt-1">등록된 약사 계정을 관리하고 권한을 조정합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
            <div>
              <strong className="text-sm text-slate-800">테스트 포럼 관리</strong>
              <p className="text-sm text-slate-500 mt-1">테스터 의견을 확인하고 이슈를 정리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 테스트 운영 시 주의사항 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">테스트 운영 시 주의사항</h2>
        <ul className="text-sm text-slate-600 space-y-2 pl-5 list-disc">
          <li><strong>테스트 포럼 관리</strong>: 테스터 의견을 주기적으로 확인하고 정리합니다.</li>
          <li><strong>계정 대응</strong>: 테스터 요청 시 계정 문제를 지원합니다.</li>
          <li><strong>데이터 초기화</strong>: 필요 시 테스트 데이터를 초기화합니다.</li>
          <li><strong>이슈 기록</strong>: 발견된 버그와 개선점을 문서화합니다.</li>
        </ul>
      </section>

      {/* 연결 문구 */}
      <div className="text-center py-4">
        <Link to="/test-guide" className="text-blue-600 text-sm font-medium">← 테스트 가이드로 돌아가기</Link>
        <p className="text-slate-500 text-xs mt-2">의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}
