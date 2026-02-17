/**
 * OperatorManualPage - 운영자 역할 매뉴얼 (내부용)
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 접근 제어: operator role만 접근 가능
 */

import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function OperatorManualPage() {
  const { user, isAuthenticated } = useAuth();

  // 권한 체크: operator만 접근 가능
  if (!isAuthenticated || !user?.roles.includes('operator')) {
    return <Navigate to="/test-guide" replace />;
  }

  return (
    <TestGuideLayout title="운영자 매뉴얼" subtitle="GlycoPharm 플랫폼 관리 가이드 (내부용)">
      {/* 내부용 경고 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-center">
        <p className="text-sm text-red-600 font-medium">이 문서는 내부 운영자 전용입니다. 외부 공개 금지.</p>
      </div>

      {/* 이 역할은 무엇을 하는가 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">운영자는 무엇을 하나요?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          운영자는 GlycoPharm <strong>플랫폼 전체를 관리</strong>하는 역할입니다.
          약국 승인, 상품 검토, 주문 모니터링, 정산 관리를 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">로그인 후 첫 화면</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          로그인하면 <strong>운영자 대시보드</strong>로 이동합니다.
          가입 신청 현황, 스토어 승인 대기, 시스템 상태를 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">자주 사용하는 기능</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
            <div>
              <strong className="text-sm text-slate-800">가입 신청 관리</strong>
              <p className="text-sm text-slate-500 mt-1">약국 가입 신청을 검토하고 승인합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
            <div>
              <strong className="text-sm text-slate-800">스토어 승인</strong>
              <p className="text-sm text-slate-500 mt-1">약국의 스토어 개설 신청을 검토하고 승인합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
            <div>
              <strong className="text-sm text-slate-800">포럼 관리</strong>
              <p className="text-sm text-slate-500 mt-1">테스트 포럼 의견을 확인하고 이슈를 정리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 테스트 운영 시 주의사항 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">테스트 운영 시 주의사항</h2>
        <ul className="text-sm text-slate-600 space-y-2 pl-5 list-disc">
          <li><strong>테스트 포럼 관리</strong>: 테스터 의견을 주기적으로 확인하고 정리합니다.</li>
          <li><strong>계정/역할 대응</strong>: 테스터 요청 시 역할 변경을 지원합니다.</li>
          <li><strong>데이터 초기화</strong>: 필요 시 테스트 데이터를 초기화합니다.</li>
          <li><strong>이슈 기록</strong>: 발견된 버그와 개선점을 문서화합니다.</li>
        </ul>
      </section>

      {/* 연결 문구 */}
      <div className="text-center py-4">
        <Link to="/test-guide" className="text-primary-600 text-sm font-medium">← 테스트 가이드로 돌아가기</Link>
        <p className="text-slate-500 text-xs mt-2">의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}
