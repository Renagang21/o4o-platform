/**
 * DentalTargetPage - 치과 네트워크 대상 사업자 안내
 *
 * WO-O4O-ABOUT-IA-RESTRUCTURE-V1
 *
 * 관점: 치과를 대상으로 비즈니스하는 사업자 (본부, 파트너)
 * 참고: 치과는 신뢰 공간 특성상 무재고 상품 공급 제외
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Monitor, Tablet, Tv, GraduationCap, Building2, Megaphone, ArrowRight } from 'lucide-react';

export default function DentalTargetPage() {
  const trackEvent = (eventData: { event: string; target: string; action: string; position: string }) => {
    console.log('[O4O_TRACK]', { ...eventData, timestamp: Date.now() });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 대상 업종
          </p>
          <h1 className="text-3xl font-bold mb-4">치과 네트워크</h1>
          <p className="text-slate-300 leading-relaxed">
            치과 네트워크를 대상으로
            <br />
            비즈니스하는 사업자를 위한 플랫폼
          </p>
          <p className="mt-4 text-sm text-white/60 italic">
            치과 진료 전후의 시간은 환자 교육과 선택을 결정짓는 핵심 구간입니다.
          </p>
        </div>
      </div>

      {/* 대상 사업자 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          치과 네트워크를 대상으로 비즈니스하는 사업자
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          o4o를 통해 치과 채널을 확보하고 비즈니스를 확장합니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">본부 / 네트워크</h3>
            <p className="text-gray-600 text-sm">
              치과 네트워크 본부가 소속 치과에
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
              치과 대상 마케팅·콘텐츠
              <br />
              서비스를 제공합니다
            </p>
          </div>
        </div>

        {/* 제공 가능한 채널 */}
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          치과에 제공할 수 있는 채널
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          사업자가 치과 네트워크에 제공하는 채널 환경
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
              치과 전용 웹사이트와 앱을 제공합니다.
              진료 안내, 건강 정보, 예약 접수 기능을 탑재하여
              환자가 온라인에서 치과와 연결됩니다.
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
              대기실 키오스크와 태블릿을 제공합니다.
              환자가 대기 중 구강 건강 정보를 검색하고
              진료 안내 콘텐츠를 확인합니다.
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
              대기실 TV/모니터로 방송 채널을 운영합니다.
              구강 건강 정보, 진료 안내 콘텐츠를
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
              구강 관리법, 치료 후 관리, 구강 위생 지식 등을
              치과 직원과 환자에게 전달합니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 */}
        <div className="bg-primary-50 rounded-xl p-8 border border-primary-200 text-center mb-8">
          <p className="text-primary-800 leading-relaxed">
            <strong>치과 네트워크를 대상으로 비즈니스하는 사업자</strong>가
            <br />
            o4o를 통해 채널을 확보하고 비즈니스를 확장합니다.
          </p>
        </div>

        {/* 매장 운영자용 채널 안내 */}
        <div className="rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-3">이 흐름을 실제 매장에서 운영하는 방법을 확인하세요.</p>
          <Link
            to="/o4o/channels/dental"
            onClick={() => trackEvent({ event: 'channel_click', target: 'dental', action: 'channel', position: 'mid' })}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            매장 운영 방식 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-2">
            치과 원장·운영자가 실제 채널 구조를 확인하는 자료
          </p>
        </div>

        {/* 실행 시나리오 */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">실제로 이렇게 작동합니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">1. 노출</p>
              <p className="text-gray-700 text-sm leading-relaxed">진료 전후 대기 시간에 구강관리 제품과 관리 정보를 안내합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">2. 반응</p>
              <p className="text-gray-700 text-sm leading-relaxed">환자가 QR이나 안내 화면을 통해 필요한 제품과 정보를 확인합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">3. 실행</p>
              <p className="text-gray-700 text-sm leading-relaxed">치과는 환자 교육, 사후관리, 제품 안내를 자연스럽게 연결합니다.</p>
            </div>
          </div>
        </div>

        {/* 중간 CTA */}
        <div className="mt-10 rounded-xl border border-gray-200 p-6">
          <p className="font-medium text-gray-900">이 업종에 맞는 O4O 활용을 시작해 보세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/supplier"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'dental', action: 'supplier', position: 'mid' })}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              제품 공급자로 참여하기
            </Link>
            <Link
              to="/partner"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'dental', action: 'partner', position: 'mid' })}
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
              <p className="text-gray-700 text-sm leading-relaxed">환자 교육이 진료 흐름 안에서 자연스럽게 이루어집니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">사후 관리 안내가 체계적으로 전달됩니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">반복적인 설명 업무가 줄어듭니다.</p>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/supplier"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'dental', action: 'supplier', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            제품 공급자로 참여하기
          </Link>
          <Link
            to="/partner"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'dental', action: 'partner', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            운영 파트너로 참여하기
          </Link>
          <Link
            to="/contact"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'dental', action: 'contact', position: 'final' })}
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
