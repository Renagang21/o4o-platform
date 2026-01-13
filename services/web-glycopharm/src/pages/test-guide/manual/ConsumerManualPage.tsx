/**
 * ConsumerManualPage - 소비자 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

export default function ConsumerManualPage() {
  return (
    <TestGuideLayout title="소비자 매뉴얼" subtitle="GlycoPharm 쇼핑 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">소비자는 무엇을 하나요?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          소비자는 GlycoPharm에서 <strong>건강기능식품을 탐색하고 구매</strong>하는 역할입니다.
          약국별 스토어에서 상품을 비교하고, 장바구니에 담아 주문할 수 있습니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">로그인 후 첫 화면</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          로그인하면 <strong>홈페이지</strong>로 이동합니다.
          근처 약국 스토어나 추천 상품을 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">자주 사용하는 기능</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
            <div>
              <strong className="text-sm text-slate-800">약국 스토어 방문</strong>
              <p className="text-sm text-slate-500 mt-1">약국별 스토어에서 건강기능식품을 탐색합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
            <div>
              <strong className="text-sm text-slate-800">장바구니</strong>
              <p className="text-sm text-slate-500 mt-1">마음에 드는 상품을 담아두고 한 번에 주문합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
            <div>
              <strong className="text-sm text-slate-800">주문하기</strong>
              <p className="text-sm text-slate-500 mt-1">장바구니 상품을 주문하고 배송 정보를 입력합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">이번 테스트에서 안 해도 되는 것</h2>
        <ul className="text-sm text-slate-500 space-y-1 pl-5 list-disc">
          <li>실제 결제 (테스트 환경에서는 결제가 처리되지 않습니다)</li>
          <li>리뷰 작성</li>
          <li>회원 정보 수정</li>
        </ul>
        <p className="text-xs text-slate-400 italic mt-3">
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
