/**
 * OtherTargetsPage - 기타 대상 사업자 안내
 *
 * Work Order: WO-O4O-OTHER-TARGETS-PAGE-V1
 *
 * 관점:
 * - o4o는 "매장 네트워크 대상 사업자"를 위한 플랫폼
 * - 주요 대상(약국, 병원, 미용실, 안경원) 외에도 다양한 매장 업종 네트워크를 대상으로 비즈니스하는 사업자가 활용 가능
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Store, Truck, Building2, Coffee, Utensils, Dumbbell } from 'lucide-react';

const targetNetworks = [
  {
    icon: Coffee,
    title: '카페 네트워크',
    desc: '카페 체인에 원두, 시럽, 용품을 공급하거나 프랜차이즈 본부가 가맹점에 채널을 제공',
    status: '확장 예정',
  },
  {
    icon: Utensils,
    title: '음식점 네트워크',
    desc: '식자재 공급자 또는 프랜차이즈 본부가 음식점 네트워크에 채널 환경을 제공',
    status: '확장 예정',
  },
  {
    icon: Dumbbell,
    title: '피트니스 네트워크',
    desc: '헬스보충제, 용품 공급자가 피트니스 센터 네트워크를 판매 채널로 활용',
    status: '확장 예정',
  },
  {
    icon: Store,
    title: '편의점 네트워크',
    desc: '편의점 본부 또는 공급자가 편의점 네트워크에 콘텐츠/상품을 제공',
    status: '확장 예정',
  },
  {
    icon: Building2,
    title: '전통시장 네트워크',
    desc: '상인회 또는 지자체가 전통시장 점포에 통합 채널 환경을 제공',
    status: '확장 예정',
  },
  {
    icon: Truck,
    title: '기타 업종 공급자',
    desc: '특정 업종 매장 네트워크에 상품을 공급하는 도매/제조 사업자',
    status: '문의 가능',
  },
];

export default function OtherTargetsPage() {
  const trackEvent = (eventData: { event: string; target: string; action: string; position: string }) => {
    console.log('[O4O_TRACK]', { ...eventData, timestamp: Date.now() });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 확장 대상
          </p>
          <h1 className="text-3xl font-bold mb-4">기타 매장 네트워크</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
            약국, 병원, 미용실, 안경원 외에도
            <br />
            <strong className="text-white">다양한 업종의 매장 네트워크를 대상으로 비즈니스하는 사업자</strong>가
            <br />
            o4o를 활용할 수 있습니다.
          </p>
          <p className="mt-4 text-sm text-white/60 italic">
            모든 매장은 고객과 만나는 순간부터 새로운 채널이 될 수 있습니다.
          </p>
        </div>
      </div>

      {/* Section Title */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-6">
        <h2 className="text-xl font-bold text-gray-900 text-center">
          확장 대상 매장 네트워크
        </h2>
        <p className="text-gray-500 text-sm text-center mt-2">
          아래 업종의 매장 네트워크를 대상으로 비즈니스하는 사업자도 o4o를 활용할 수 있습니다
        </p>
      </div>

      {/* Banner List */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targetNetworks.map((network) => (
            <div
              key={network.title}
              className="p-6 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                  <network.icon className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{network.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                      {network.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{network.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-primary-50 rounded-xl p-6 border border-primary-200 text-center">
          <p className="text-primary-800 text-sm leading-relaxed">
            매장 네트워크를 대상으로 비즈니스하는 <strong>공급자, 본부, 마케팅 파트너</strong>라면
            <br />
            업종에 관계없이 o4o를 활용할 수 있습니다.
            <br />
            <span className="text-primary-600 mt-2 inline-block">
              사업 형태에 맞는 참여 방식을 함께 설계합니다.
            </span>
          </p>
        </div>

        {/* 실행 시나리오 */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">실제로 이렇게 작동합니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">1. 노출</p>
              <p className="text-gray-700 text-sm leading-relaxed">매장 공간과 고객 접점에 맞는 제품·서비스 정보를 노출합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">2. 반응</p>
              <p className="text-gray-700 text-sm leading-relaxed">고객이 QR, 화면, 안내물을 통해 관심 정보를 확인합니다.</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-primary-600 mb-2">3. 실행</p>
              <p className="text-gray-700 text-sm leading-relaxed">매장은 업종 특성에 맞게 주문, 상담, 재방문 흐름을 설계합니다.</p>
            </div>
          </div>
        </div>

        {/* 중간 CTA */}
        <div className="mt-10 rounded-xl border border-gray-200 p-6">
          <p className="font-medium text-gray-900">이 업종에 맞는 O4O 활용을 시작해 보세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/supplier"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'other', action: 'supplier', position: 'mid' })}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              제품 공급자로 참여하기
            </Link>
            <Link
              to="/partner"
              onClick={() => trackEvent({ event: 'mid_cta_click', target: 'other', action: 'partner', position: 'mid' })}
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
              <p className="text-gray-700 text-sm leading-relaxed">매장 특성에 맞는 정보 전달 구조를 만들 수 있습니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">고객 접점이 단발성이 아닌 지속적인 관계로 이어집니다.</p>
            </li>
            <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <p className="text-gray-700 text-sm leading-relaxed">별도의 시스템 없이도 새로운 판매 흐름을 설계할 수 있습니다.</p>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/supplier"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'other', action: 'supplier', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            제품 공급자로 참여하기
          </Link>
          <Link
            to="/partner"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'other', action: 'partner', position: 'final' })}
            className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            운영 파트너로 참여하기
          </Link>
          <Link
            to="/contact"
            onClick={() => trackEvent({ event: 'final_cta_click', target: 'other', action: 'contact', position: 'final' })}
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
