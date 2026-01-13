/**
 * PharmacistManualPage - 약사 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '../../../components/layouts/TestGuideLayout';

export default function PharmacistManualPage() {
  return (
    <TestGuideLayout title="약사 매뉴얼" subtitle="GlucoseView CGM 데이터 관리 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">약사는 무엇을 하나요?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          약사는 GlucoseView에서 <strong>환자의 CGM 데이터를 모니터링하고 상담</strong>하는 역할입니다.
          환자별 혈당 추이, 패턴 분석, 인사이트 확인을 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">로그인 후 첫 화면</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          로그인하면 <strong>홈페이지</strong>로 이동합니다.
          상단 메뉴에서 환자 목록, 인사이트, 설정 등에 접근할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">자주 사용하는 기능</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
            <div>
              <strong className="text-sm text-slate-800">환자 목록</strong>
              <p className="text-sm text-slate-500 mt-1">관리 중인 환자들의 CGM 데이터 현황을 확인합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
            <div>
              <strong className="text-sm text-slate-800">인사이트</strong>
              <p className="text-sm text-slate-500 mt-1">혈당 패턴 분석 결과와 AI 기반 인사이트를 확인합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
            <div>
              <strong className="text-sm text-slate-800">설정</strong>
              <p className="text-sm text-slate-500 mt-1">알림 설정, 표시 옵션 등을 관리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">이번 테스트에서 안 해도 되는 것</h2>
        <ul className="text-sm text-slate-500 space-y-1 pl-5 list-disc">
          <li>실제 CGM 기기 연동</li>
          <li>환자 개인정보 입력</li>
          <li>리포트 출력</li>
        </ul>
        <p className="text-xs text-slate-400 italic mt-3">
          ※ 이 서비스는 의료 행위가 아닙니다. 테스트 환경은 실제 서비스와 다를 수 있습니다.
        </p>
      </section>

      {/* 연결 문구 */}
      <div className="text-center py-4">
        <Link to="/test-guide" className="text-blue-600 text-sm font-medium">← 테스트 가이드로 돌아가기</Link>
        <p className="text-slate-500 text-xs mt-2">의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}
