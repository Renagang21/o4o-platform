/**
 * PartnerOverviewPage - 파트너 요약 페이지
 *
 * Work Order: WO-GLYCOPHARM-PARTNER-DASHBOARD-IMPLEMENTATION-V1
 *
 * 포함 요소:
 * - 활성 콘텐츠 수 (mock)
 * - 진행 중 이벤트 수 (mock)
 * - 전체 상태 (활성/비활성)
 *
 * 절대 금지:
 * - 매출
 * - 전환율
 * - 그래프
 */

import { FileText, Calendar, Activity, CheckCircle } from 'lucide-react';

// Mock 데이터 (API 연동 구조 유지)
const mockData = {
  activeContents: 3,
  ongoingEvents: 1,
  overallStatus: 'active' as const,
};

export default function PartnerOverviewPage() {
  const data = mockData;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">요약</h1>
        <p className="text-slate-500 mt-1">
          현재 파트너 활동 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Active Contents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">활성 콘텐츠</p>
              <p className="text-2xl font-bold text-slate-800">{data.activeContents}개</p>
            </div>
          </div>
        </div>

        {/* Ongoing Events */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">진행 중 이벤트</p>
              <p className="text-2xl font-bold text-slate-800">{data.ongoingEvents}개</p>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              data.overallStatus === 'active' ? 'bg-green-100' : 'bg-slate-100'
            }`}>
              {data.overallStatus === 'active' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Activity className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 상태</p>
              <p className={`text-lg font-semibold ${
                data.overallStatus === 'active' ? 'text-green-600' : 'text-slate-500'
              }`}>
                {data.overallStatus === 'active' ? '활성' : '비활성'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <h3 className="font-semibold text-purple-800 mb-2">파트너 센터 안내</h3>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>이 페이지는 현재 활동 현황을 요약합니다.</li>
          <li>콘텐츠, 이벤트 조건 설정은 각 메뉴에서 진행해 주세요.</li>
          <li>홍보 대상은 GlycoPharm 서비스에서 지정됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
