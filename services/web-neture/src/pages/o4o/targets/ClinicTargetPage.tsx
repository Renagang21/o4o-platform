/**
 * ClinicTargetPage - 의료기관 네트워크 대상 사업자 안내
 *
 * 관점: 의료기관을 대상으로 비즈니스하는 사업자 (본부, 파트너)
 * 참고: 의료기관은 제품을 취급하지 않으므로 무재고 상품 공급 제외
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Monitor, Tablet, Tv, GraduationCap, Building2, Megaphone } from 'lucide-react';

export default function ClinicTargetPage() {
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
          <h1 className="text-3xl font-bold mb-4">의료기관 네트워크</h1>
          <p className="text-slate-300 leading-relaxed">
            병원·의원 네트워크를 대상으로
            <br />
            비즈니스하는 사업자를 위한 플랫폼
          </p>
          <p className="mt-4 text-sm text-white/60 italic">
            진료 전 대기 시간은 환자에게 가장 집중된 설명의 순간입니다.
          </p>
        </div>
      </div>

      {/* 대상 사업자 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          의료기관 네트워크를 대상으로 비즈니스하는 사업자
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          o4o를 통해 의료기관 채널을 확보하고 비즈니스를 확장합니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">본부 / 네트워크</h3>
            <p className="text-gray-600 text-sm">
              의료 네트워크 본부가 소속 병원에
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
              의료기관 대상 마케팅·콘텐츠
              <br />
              서비스를 제공합니다
            </p>
          </div>
        </div>

        {/* 제공 가능한 채널 */}
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          의료기관에 제공할 수 있는 채널
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          사업자가 의료기관 네트워크에 제공하는 채널 환경
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
              병원 전용 웹사이트와 앱을 제공합니다.
              진료 안내, 건강관리 상품 소개, 예약 접수 기능을 탑재하여
              환자가 온라인에서 병원과 연결됩니다.
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
              환자가 대기 중 건강 정보를 검색하고
              관련 상품을 확인합니다.
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
              건강 정보, 병원 소개, 건강관리 상품 안내 콘텐츠를
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
              질환별 관리법, 건강 상식, 운동법 등을
              의료진과 환자에게 전달합니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 */}
        <div className="bg-primary-50 rounded-xl p-8 border border-primary-200 text-center mb-8">
          <p className="text-primary-800 leading-relaxed">
            <strong>의료기관 네트워크를 대상으로 비즈니스하는 사업자</strong>가
            <br />
            o4o를 통해 채널을 확보하고 비즈니스를 확장합니다.
          </p>
        </div>

        {/* 매장 운영자용 채널 안내 */}
        <div className="rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-3">이 흐름을 실제 매장에서 운영하는 방법을 확인하세요.</p>
          <Link
            to="/o4o/channels/medical"
            onClick={() => trackEvent({ event: 'channel_click', target: 'clinic', action: 'channel', position: 'mid' })}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            매장 운영 방식 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-2">
            병원·의원 운영자가 실제 채널 구조를 확인하는 자료
          </p>
        </div>

        {/* 실행 시나리오 */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">실제로 이렇게 작동합니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">1. 노출</p>
              <p className="text-gray-700 text-sm leading-relaxed">대기실 화면과 안내물로 검사·관리·연계 상품 정보를 제공합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">2. 반응</p>
              <p className="text-gray-700 text-sm leading-relaxed">환자가 진료 전후 필요한 정보를 확인하고 문의합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">3. 실행</p>
              <p className="text-gray-700 text-sm leading-relaxed">의료기관은 설명 부담을 줄이고 연계 서비스 안내를 체계화합니다.</p>
            </div>
          </div>
        </div>

        {/* 중간 CTA */}
        <div className="mt-10 rounded-xl border border-gray-200 p-6">
          <p className="font-medium text-gray-900">이 업종에 맞는 O4O 활용을 시작해 보세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/supplier"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'clinic', action: 'supplier', position: 'mid' })}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              제품 공급자로 참여하기
            </Link>
            <Link
              to="/partner"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'clinic', action: 'partner', position: 'mid' })}
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
              <p className="text-gray-700 text-sm leading-relaxed">진료 전후 설명 부담이 줄어들고 전달 효율이 높아집니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">환자가 필요한 정보를 스스로 확인하고 준비하게 됩니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">안내와 설명이 시스템으로 정리됩니다.</p>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/supplier"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'clinic', action: 'supplier', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            제품 공급자로 참여하기
          </Link>
          <Link
            to="/partner"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'clinic', action: 'partner', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            운영 파트너로 참여하기
          </Link>
          <Link
            to="/contact"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'clinic', action: 'contact', position: 'final' })}
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
