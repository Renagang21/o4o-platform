/**
 * PartnerOverviewPage - 파트너 현황 페이지
 * Reference: GlycoPharm (복제)
 * API Integration: WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 */

import { useState, useEffect } from 'react';
import { FileText, Calendar, Activity, CheckCircle, Loader2 } from 'lucide-react';
import { partnerApi, type PartnerOverviewData } from '../../services/api';

export default function PartnerOverviewPage() {
  const [data, setData] = useState<PartnerOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      setError(null);
      const response = await partnerApi.getOverview();
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        setData(response.data);
      }
      setIsLoading(false);
    };
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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

  if (!data) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">파트너 현황</h1>
        <p className="text-slate-500 mt-1">
          GlucoseView 파트너로서의 활동 현황을 확인하세요.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{data.activeContentCount}</p>
              <p className="text-sm text-slate-500">활성 콘텐츠</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{data.activeEventCount}</p>
              <p className="text-sm text-slate-500">진행 중 이벤트</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              data.status === 'active' ? 'bg-green-100' : 'bg-slate-100'
            }`}>
              {data.status === 'active' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Activity className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{data.status === 'active' ? '정상' : '비활성'}</p>
              <p className="text-sm text-slate-500">전체 상태</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2">파트너 센터 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>이 페이지는 현재 활동 현황을 요약합니다.</li>
          <li>콘텐츠, 이벤트 조건 설정은 각 메뉴에서 진행해 주세요.</li>
          <li>홍보 대상은 GlucoseView 서비스에서 지정됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
