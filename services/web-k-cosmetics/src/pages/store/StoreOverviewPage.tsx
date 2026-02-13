/**
 * StoreOverviewPage - K-Cosmetics Store Dashboard Overview
 * WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 Phase 1
 */

export default function StoreOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">내 매장 대시보드</h1>
        <p className="text-slate-500 mt-1">K-Cosmetics 매장 현황을 확인하세요</p>
      </div>

      {/* KPI Cards (Phase 2에서 실데이터 연결) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">오늘 주문</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">-</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">이번달 매출</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">-</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">채널 비율</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">-</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">등록 상품</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">-</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-lg font-medium text-slate-700">매장 대시보드</p>
        <p className="mt-2 text-slate-500">좌측 메뉴에서 매장 관리 기능을 확인하세요.</p>
      </div>
    </div>
  );
}
