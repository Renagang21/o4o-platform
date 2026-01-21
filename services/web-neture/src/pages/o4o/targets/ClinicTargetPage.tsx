/**
 * ClinicTargetPage - 병원/의원 네트워크 대상 사업자 안내
 *
 * 관점: 병원/의원을 대상으로 비즈니스하는 사업자 (공급자, 본부, 파트너)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Monitor, Tablet, Tv, GraduationCap, Package, Truck, Building2, Megaphone } from 'lucide-react';

export default function ClinicTargetPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 대상 매장 업종
          </p>
          <h1 className="text-3xl font-bold mb-4">병원 / 의원 네트워크</h1>
          <p className="text-slate-300 leading-relaxed">
            건강관리 상품을 취급하는 병원·의원 네트워크를 대상으로
            <br />
            비즈니스하는 사업자를 위한 플랫폼
          </p>
        </div>
      </div>

      {/* 대상 사업자 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          병원/의원 네트워크를 대상으로 비즈니스하는 사업자
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          o4o를 통해 병원/의원 채널을 확보하고 비즈니스를 확장합니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Truck className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">공급자</h3>
            <p className="text-gray-600 text-sm">
              건강관리 상품 공급사가
              <br />
              병원/의원 판매 채널을 확보합니다
            </p>
          </div>
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
              병원/의원 대상 마케팅·콘텐츠
              <br />
              서비스를 제공합니다
            </p>
          </div>
        </div>

        {/* 제공 가능한 채널 */}
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          병원/의원에 제공할 수 있는 채널
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          사업자가 병원/의원 네트워크에 제공하는 채널 환경
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

          {/* 무재고 상품 공급 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">무재고 상품 공급</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              병원/의원이 재고 부담 없이 건강관리 상품을 판매합니다. 주문 시 공급사에서 직접 배송합니다.
              공급자는 병원/의원 네트워크를 판매 채널로 활용하고, 병원/의원은 추가 수익을 얻습니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 */}
        <div className="bg-primary-50 rounded-xl p-8 border border-primary-200 text-center">
          <p className="text-primary-800 leading-relaxed">
            <strong>병원/의원 네트워크를 대상으로 비즈니스하는 사업자</strong>가
            <br />
            o4o를 통해 채널을 확보하고 비즈니스를 확장합니다.
          </p>
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
