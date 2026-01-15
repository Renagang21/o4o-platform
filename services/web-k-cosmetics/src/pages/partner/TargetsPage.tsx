/**
 * PartnerTargetsPage - 홍보 대상 페이지
 * Reference: GlycoPharm (복제)
 * API Integration: WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 */

import { useState, useEffect } from 'react';
import { MapPin, Building2, Info, Loader2 } from 'lucide-react';
import { partnerApi, type PartnerTarget } from '../../services/partnerApi';

export default function PartnerTargetsPage() {
  const [targets, setTargets] = useState<PartnerTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTargets = async () => {
      setIsLoading(true);
      setError(null);
      const response = await partnerApi.getTargets();
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        setTargets(response.data);
      }
      setIsLoading(false);
    };
    fetchTargets();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">홍보 대상</h1>
        <p className="text-slate-500 mt-1">
          현재 홍보 활동 대상인 매장 및 지역을 확인하세요.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          홍보 대상은 K-Cosmetics 서비스에 의해 지정되며
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
                    target.type === 'pharmacy' ? 'bg-pink-100' : 'bg-blue-100'
                  }`}>
                    {target.type === 'pharmacy' ? (
                      <Building2 className="w-5 h-5 text-pink-600" />
                    ) : (
                      <MapPin className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{target.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        target.type === 'pharmacy'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {target.type === 'pharmacy' ? '매장' : '지역'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{target.serviceArea || target.description}</p>
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
          홍보 대상 변경이 필요한 경우 K-Cosmetics 운영팀에 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
