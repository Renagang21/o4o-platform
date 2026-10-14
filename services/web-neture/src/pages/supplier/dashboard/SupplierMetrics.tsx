import { ChevronDown, ChevronUp } from 'lucide-react';
import type { useSupplierDashboard } from './useSupplierDashboard';
import { won } from './presentation';

export function SupplierMetrics({
  data,
  open: aiOpen,
  onToggle,
}: {
  data: ReturnType<typeof useSupplierDashboard>;
  open: boolean;
  onToggle: () => void;
}) {
  const { metricsFailed, performance, distribution, trending } = data;
  const topByRevenue = performance.slice(0, 5);
  const topByOrders = [...performance]
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);
  return (
    <>
      {/* ── 7. 지표 분석 (Copilot 집계 블록 — 접기 가능) ── */}
      <section className="bg-white rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aiOpen}
          className="w-full flex items-center justify-between gap-3 p-6 text-left"
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-800">
              지표 분석
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              상품 성과, 매장 확산, 인기·성장 상품
            </p>
          </div>
          {aiOpen ? (
            <ChevronUp size={18} className="text-slate-400 shrink-0" />
          ) : (
            <ChevronDown size={18} className="text-slate-400 shrink-0" />
          )}
        </button>

        {aiOpen && metricsFailed && (
          <p role="alert" className="px-6 pb-6 text-sm text-red-600">
            지표를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.
          </p>
        )}
        {aiOpen && !metricsFailed && (
          <div className="px-6 pb-6 space-y-6">
            {/* 상품 성과 + 매장 확산 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  상품 성과 (매출 TOP 5)
                </h3>
                {topByRevenue.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">
                    상품 데이터가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topByRevenue.map((item, idx) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-400">
                            주문 {item.orders}건 &middot; QR {item.qrScans}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0">
                          {won(item.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  매장 확산
                </h3>
                {distribution.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">
                    매장 진열 데이터가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {distribution.slice(0, 5).map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {item.productName}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-600 shrink-0">
                          {item.storeCount}개 매장
                        </span>
                        {item.newStores > 0 && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                            +{item.newStores} new
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 인기 상품 + 성장 상품 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  인기 상품 (주문 TOP 5)
                </h3>
                {topByOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">
                    주문 데이터가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topByOrders.map((item, idx) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-400">
                            매출 {won(item.revenue)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0">
                          {item.orders}건
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
                <h3 className="text-base font-semibold text-emerald-900 mb-4">
                  성장 상품
                </h3>
                {trending.length === 0 ? (
                  <p className="text-sm text-emerald-400 py-8 text-center">
                    성장 데이터가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {trending.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-white/60 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-emerald-500">
                            이번주 {item.currentOrders}건 / 지난주{' '}
                            {item.previousOrders}건
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            item.growthRate > 0
                              ? 'text-emerald-700 bg-emerald-100'
                              : item.growthRate < 0
                                ? 'text-red-600 bg-red-50'
                                : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          {item.growthRate > 0 ? '+' : ''}
                          {item.growthRate}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
