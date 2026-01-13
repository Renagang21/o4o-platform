/**
 * PharmacyManualPage - 약국 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function PharmacyManualPage() {
  return (
    <TestGuideLayout title="약국 매뉴얼" subtitle="GlycoPharm 약국 관리 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">약국은 무엇을 하나요?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          약국은 GlycoPharm에서 <strong>건강기능식품을 등록하고 판매</strong>하는 역할입니다.
          상품 등록, 재고 관리, 주문 확인 및 배송 처리를 담당합니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">로그인 후 첫 화면</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          로그인하면 <strong>약국 대시보드</strong>로 이동합니다.
          오늘의 주문 현황, 상품 관리, 환자 관리 메뉴를 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">자주 사용하는 기능</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
            <div>
              <strong className="text-sm text-slate-800">상품 관리</strong>
              <p className="text-sm text-slate-500 mt-1">건강기능식품을 등록하고 가격, 재고를 관리합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
            <div>
              <strong className="text-sm text-slate-800">주문 관리</strong>
              <p className="text-sm text-slate-500 mt-1">들어온 주문을 확인하고 처리합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
            <div>
              <strong className="text-sm text-slate-800">환자 관리</strong>
              <p className="text-sm text-slate-500 mt-1">단골 고객의 구매 이력과 상담 기록을 관리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">이번 테스트에서 안 해도 되는 것</h2>
        <ul className="text-sm text-slate-500 space-y-1 pl-5 list-disc">
          <li>정산 관련 기능</li>
          <li>스마트 디스플레이 설정</li>
          <li>B2B 발주</li>
        </ul>
        <p className="text-sm text-green-600 font-medium mt-3">
          테스트 계정으로 모든 약국 기능을 사용할 수 있습니다.
        </p>
        <p className="text-xs text-slate-400 italic mt-2">
          ※ 테스트 환경은 실제 서비스와 다를 수 있습니다.
        </p>
      </section>

      {/* 연결 문구 */}
      <div className="text-center py-4">
        <Link to="/test-guide" className="text-primary-600 text-sm font-medium">← 테스트 가이드로 돌아가기</Link>
        <p className="text-slate-500 text-xs mt-2">의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}
