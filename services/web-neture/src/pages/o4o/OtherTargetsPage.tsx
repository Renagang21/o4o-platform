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
