/**
 * AdSection - 광고 섹션 (Placeholder)
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 3열 광고 영역. 운영자가 관리.
 * 현재는 정적 placeholder UI.
 */

import { Megaphone } from 'lucide-react';

const placeholderAds = [
  {
    id: 1,
    title: '광고 영역 1',
    description: '공급자 제품 홍보',
    color: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-400',
  },
  {
    id: 2,
    title: '광고 영역 2',
    description: '파트너 프로모션',
    color: 'bg-purple-50 border-purple-100',
    iconColor: 'text-purple-400',
  },
  {
    id: 3,
    title: '광고 영역 3',
    description: '플랫폼 이벤트',
    color: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-400',
  },
];

export function AdSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Promotion
          </h2>
          <p className="text-sm text-gray-500">
            공급자와 파트너의 프로모션 정보
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {placeholderAds.map((ad) => (
            <div
              key={ad.id}
              className={`p-8 rounded-xl border ${ad.color} flex flex-col items-center text-center`}
            >
              <Megaphone className={`w-10 h-10 ${ad.iconColor} mb-4`} />
              <h3 className="text-base font-semibold text-gray-700 mb-2">{ad.title}</h3>
              <p className="text-sm text-gray-500">{ad.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          광고 문의: 공급자 신청 → 운영자 협의 → 등록
        </p>
      </div>
    </section>
  );
}
