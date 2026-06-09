/**
 * PharmacyTargetPage - 약국 네트워크 대상 사업자 안내
 *
 * 관점: 약국을 대상으로 비즈니스하는 사업자 (공급자, 본부, 파트너)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Monitor, Tablet, Tv, GraduationCap, Package, Truck, Building2, Megaphone } from 'lucide-react';

export default function PharmacyTargetPage() {
  const trackEvent = (eventData: { event: string; target: string; action: string; position: string }) => {
    console.log('[O4O_TRACK]', { ...eventData, timestamp: Date.now() });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 대상 매장 업종
          </p>
          <h1 className="text-3xl font-bold mb-4">약국 네트워크</h1>
          <p className="text-slate-300 leading-relaxed">
            건강기능식품, 의약외품을 취급하는 약국 네트워크를 대상으로
            <br />
            비즈니스하는 사업자를 위한 플랫폼
          </p>
          <p className="mt-4 text-sm text-white/60 italic">
            약국의 대기 공간은 이미 가장 강력한 정보 전달 채널입니다.
          </p>
        </div>
      </div>

      {/* 대상 사업자 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          약국 네트워크를 대상으로 비즈니스하는 사업자
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          o4o를 통해 약국 채널을 확보하고 비즈니스를 확장합니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Truck className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">공급자</h3>
            <p className="text-gray-600 text-sm">
              건강기능식품, 의약외품 공급사가
              <br />
              약국 판매 채널을 확보합니다
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">본부 / 프랜차이즈</h3>
            <p className="text-gray-600 text-sm">
              약국 체인 본부가 가맹점에
              <br />
              통합 채널 환경을 제공합니다
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Megaphone className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">마케팅 파트너</h3>
            <p className="text-gray-600 text-sm">
              약국 대상 마케팅·콘텐츠
              <br />
              서비스를 제공합니다
            </p>
          </div>
        </div>

        {/* 제공 가능한 채널 */}
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          약국에 제공할 수 있는 채널
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          사업자가 약국 네트워크에 제공하는 채널 환경
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 웹/앱 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Monitor className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">웹 / 앱</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              약국 전용 웹사이트와 앱을 제공합니다.
              상품 안내, 예약, 상담 접수 기능을 탑재하여
              고객이 온라인에서 약국과 연결됩니다.
            </p>
          </div>

          {/* 키오스크/태블릿 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Tablet className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">키오스크 / 태블릿</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              매장 내 키오스크와 태블릿을 제공합니다.
              고객이 대기 중 상품 정보를 검색하고
              건강 관련 콘텐츠를 확인합니다.
            </p>
          </div>

          {/* 디지털 사이니지 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Tv className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">디지털 사이니지</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              매장 내 TV/모니터로 방송 채널을 운영합니다.
              건강 정보, 상품 안내, 프로모션 콘텐츠를
              직접 편성하여 송출합니다.
            </p>
          </div>

          {/* LMS */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <GraduationCap className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">LMS (교육 콘텐츠)</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              자체 교육 콘텐츠를 제작하여 제공합니다.
              건강기능식품 복용법, 질환별 관리 방법 등을
              약국 직원과 고객에게 전달합니다.
            </p>
          </div>

          {/* 무재고 상품 공급 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">무재고 상품 공급</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              약국이 재고 부담 없이 상품을 판매합니다. 주문 시 공급사에서 직접 배송합니다.
              공급자는 약국 네트워크를 판매 채널로 활용하고, 약국은 추가 수익을 얻습니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 */}
        <div className="bg-primary-50 rounded-xl p-8 border border-primary-200 text-center mb-8">
          <p className="text-primary-800 leading-relaxed">
            <strong>약국 네트워크를 대상으로 비즈니스하는 사업자</strong>가
            <br />
            o4o를 통해 채널을 확보하고 비즈니스를 확장합니다.
          </p>
        </div>

        {/* 채널 활용 안내 — WO-O4O-NETURE-CHANNEL-PAGES-ABSORB-V1: /o4o/channels/pharmacy 흡수 */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">약국 채널에서 O4O는 어떻게 작동하나요?</h2>
          <p className="text-sm text-gray-500 mb-5">
            약국의 신뢰와 통제권을 유지하면서 채널을 운영합니다.
          </p>
          <ul className="space-y-3 mb-5">
            <li className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 text-lg">🎛️</span>
              <div>
                <strong className="text-gray-900">채널 주도권은 약국에 있습니다</strong>
                <p className="text-sm text-gray-600 mt-0.5">TV·디지털 채널에서 무엇을 보여줄지, 사용할지 말지는 약국이 결정합니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 text-lg">🤝</span>
              <div>
                <strong className="text-gray-900">운영자는 지원자</strong>
                <p className="text-sm text-gray-600 mt-0.5">콘텐츠와 도구는 운영자가 제공하고, 선택·편집은 약국이 합니다.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 text-lg">🔗</span>
              <div>
                <strong className="text-gray-900">QR은 연결 통로</strong>
                <p className="text-sm text-gray-600 mt-0.5">광고나 판매 강요 수단이 아니라, 관심 있는 고객이 스스로 선택해 이동하는 연결입니다.</p>
              </div>
            </li>
          </ul>
          <Link
            to="/o4o/apply?industry=pharmacy"
            onClick={() => trackEvent({ event: 'channel_apply_click', target: 'pharmacy', action: 'apply', position: 'channel-section' })}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            내 약국에 적용 검토
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* 실행 시나리오 */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">실제로 이렇게 작동합니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">1. 노출</p>
              <p className="text-gray-700 text-sm leading-relaxed">약국 TV, POP, QR에서 제품과 건강 정보를 안내합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">2. 반응</p>
              <p className="text-gray-700 text-sm leading-relaxed">고객이 대기 중 QR을 스캔하거나 관심 제품을 확인합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">3. 실행</p>
              <p className="text-gray-700 text-sm leading-relaxed">약국은 설명 기반 상담, 무재고 주문, 재방문 안내로 연결합니다.</p>
            </div>
          </div>
        </div>

        {/* 중간 CTA */}
        <div className="mt-10 rounded-xl border border-gray-200 p-6">
          <p className="font-medium text-gray-900">이 업종에 맞는 O4O 활용을 시작해 보세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/supplier"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'pharmacy', action: 'supplier', position: 'mid' })}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              제품 공급자로 참여하기
            </Link>
            <Link
              to="/partner"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'pharmacy', action: 'partner', position: 'mid' })}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              운영 파트너로 참여하기
            </Link>
          </div>
        </div>

        {/* 신뢰 섹션 */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">이 방식으로 달라집니다</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">대기 시간이 단순 대기가 아니라 정보 전달 시간이 됩니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">반복 설명이 줄고, 고객 스스로 이해하는 구조가 만들어집니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">추가 재고 없이도 새로운 매출 흐름을 만들 수 있습니다.</p>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/supplier"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'pharmacy', action: 'supplier', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            제품 공급자로 참여하기
          </Link>
          <Link
            to="/partner"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'pharmacy', action: 'partner', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            운영 파트너로 참여하기
          </Link>
          <Link
            to="/contact"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'pharmacy', action: 'contact', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            도입 문의하기
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-t border-slate-200">
        <Link
          to="/o4o"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          o4o 메인으로
        </Link>
      </div>
    </div>
  );
}
