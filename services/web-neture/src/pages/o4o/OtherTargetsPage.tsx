/**
 * OtherTargetsPage - 기타 대상 사업자 안내
 *
 * Work Order: WO-O4O-OTHER-TARGETS-PAGE-V1
 *
 * 목적:
 * - 주요 대상(약국, 병원, 미용실, 안경원) 외 사업자 안내
 * - 향후 확장 대상 미리 노출
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Store, Users, Building2, ShoppingBag, MapPin } from 'lucide-react';

const targetBanners = [
  {
    icon: Store,
    title: '전문매장 대상 도매 사업자',
    desc: '특정 업종 매장에 상품을 공급하는 도매 사업자',
    status: '준비중',
  },
  {
    icon: Users,
    title: '마케팅 대행 사업자',
    desc: '오프라인 매장의 온라인 마케팅을 대행하는 사업자',
    status: '준비중',
  },
  {
    icon: Building2,
    title: '소규모 프랜차이즈 본부',
    desc: '10개 미만 가맹점을 운영하는 프랜차이즈 본부',
    status: '준비중',
  },
  {
    icon: MapPin,
    title: '전통시장',
    desc: '전통시장 내 점포 또는 상인회 단위 참여',
    status: '준비중',
  },
  {
    icon: ShoppingBag,
    title: '지역 공동구매 모임',
    desc: '지역 기반 공동구매를 운영하는 모임 또는 단체',
    status: '준비중',
  },
];

export default function OtherTargetsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform
          </p>
          <h1 className="text-3xl font-bold mb-4">Online for Offline</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
            o4o는 오프라인 사업자가 온라인 채널을 직접 운영할 수 있도록 돕습니다.
            <br />
            플랫폼에 종속되지 않고, 사업자가 자신의 고객과 직접 연결됩니다.
          </p>
        </div>
      </div>

      {/* Section Title */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-6">
        <h2 className="text-xl font-bold text-gray-900 text-center">
          기타 대상 사업자
        </h2>
        <p className="text-gray-500 text-sm text-center mt-2">
          아래 유형의 사업자도 o4o를 활용할 수 있습니다
        </p>
      </div>

      {/* Banner List */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targetBanners.map((banner) => (
            <div
              key={banner.title}
              className="p-6 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                  <banner.icon className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                      {banner.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{banner.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
          <p className="text-slate-600 text-sm">
            위 유형에 해당하시면 문의해 주세요.
            <br />
            사업 형태에 맞는 참여 방식을 함께 설계합니다.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-t border-slate-200">
        <Link
          to="/"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          메인으로
        </Link>
      </div>
    </div>
  );
}
