/**
 * PartnerTargetsPage - 홍보 대상 페이지
 * Reference: GlycoPharm (복제)
 */

import { MapPin, Building2, Info } from 'lucide-react';

interface PromotionTarget {
  id: string;
  name: string;
  type: 'store' | 'region';
  description: string;
  address?: string;
}

const mockTargets: PromotionTarget[] = [
  {
    id: '1',
    name: 'GlucoseView 강남센터',
    type: 'store',
    description: '서울 강남구 테헤란로 일대',
    address: '서울 강남구 테헤란로 123',
  },
  {
    id: '2',
    name: 'GlucoseView 종로센터',
    type: 'store',
    description: '서울 종로구 광화문 일대',
    address: '서울 종로구 세종대로 45',
  },
  {
    id: '3',
    name: '서울 전체',
    type: 'region',
    description: '서울특별시 전체 서비스 영역',
  },
];

export default function PartnerTargetsPage() {
  const targets = mockTargets;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">홍보 대상</h1>
        <p className="text-slate-500 mt-1">
          현재 홍보 활동 대상인 센터 및 지역을 확인하세요.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          홍보 대상은 GlucoseView 서비스에 의해 지정되며
          파트너가 직접 변경할 수 없습니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">지정된 홍보 대상</h2>
        </div>

        {targets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            현재 지정된 홍보 대상이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {targets.map((target) => (
              <li key={target.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    target.type === 'store' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {target.type === 'store' ? (
                      <Building2 className="w-5 h-5 text-blue-600" />
                    ) : (
                      <MapPin className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{target.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        target.type === 'store'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {target.type === 'store' ? '센터' : '지역'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{target.description}</p>
                    {target.address && (
                      <p className="text-xs text-slate-400 mt-1">{target.address}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-400">
          홍보 대상 변경이 필요한 경우 GlucoseView 운영팀에 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
