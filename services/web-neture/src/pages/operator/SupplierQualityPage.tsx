/**
 * Operator Supplier Quality Report Page
 *
 * WO-O4O-NETURE-SUPPLIER-QUALITY-REPORT-V1
 *
 * KPI cards + supplier list + error type breakdown
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api/client';

interface SupplierQualityKpi {
  totalSuppliers: number;
  totalBatches: number;
  totalRows: number;
  totalApplied: number;
  totalFailed: number;
  avgSuccessRate: number;
}

interface SupplierQualityItem {
  supplierId: string;
  supplierName: string;
  batchCount: number;
  totalRows: number;
  appliedRows: number;
  failedRows: number;
  successRate: number;
  grade: 'GOOD' | 'NORMAL' | 'BAD';
}

interface ErrorTypeItem {
  type: string;
  count: number;
}

interface QualityReport {
  kpi: SupplierQualityKpi;
  suppliers: SupplierQualityItem[];
  topErrors: ErrorTypeItem[];
}

// ─── Grade Badge ──────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    GOOD: 'bg-green-100 text-green-800',
    NORMAL: 'bg-yellow-100 text-yellow-800',
    BAD: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    GOOD: 'Good',
    NORMAL: 'Normal',
    BAD: 'Bad',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[grade] || 'bg-gray-100'}`}>
      {labels[grade] || grade}
    </span>
  );
}

// ─── Error label ──────────────────────────────────────────────
function friendlyErrorType(type: string): string {
  if (type === 'barcode_error') return '바코드 오류';
  if (type === 'price_error') return '가격 오류';
  if (type === 'master_not_found') return 'Master 미발견';
  if (type === 'duplicate_error') return '중복 데이터';
  if (type === 'mfds_error') return 'MFDS 검증 실패';
  if (type.startsWith('validation_')) return `검증: ${type.replace('validation_', '')}`;
  return type;
}

// ─── Main Page ────────────────────────────────────────────────
export default function SupplierQualityPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const response = await api.get(`/neture/operator/supplier-quality${qs ? '?' + qs : ''}`);
      if (response.data?.success) {
        setReport(response.data.data);
      }
    } catch (err) {
      console.error('[Quality Report] Failed:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">공급자 품질 리포트</h1>

      {/* Period Filter */}
      <div className="flex items-end gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">시작일</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">종료일</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={loadReport}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-900"
        >
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {loading && !report ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : !report ? (
        <p className="text-sm text-gray-400">데이터가 없습니다.</p>
      ) : (
        <>
          {/* ═══ KPI Cards ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">공급자 수</p>
              <p className="text-2xl font-bold text-gray-900">{report.kpi.totalSuppliers}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">총 처리 행</p>
              <p className="text-2xl font-bold text-gray-900">{report.kpi.totalRows.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">평균 성공률</p>
              <p className={`text-2xl font-bold ${report.kpi.avgSuccessRate >= 95 ? 'text-green-600' : report.kpi.avgSuccessRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {report.kpi.avgSuccessRate}%
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">총 실패</p>
              <p className="text-2xl font-bold text-red-600">{report.kpi.totalFailed.toLocaleString()}</p>
            </div>
          </div>

          {/* ═══ Supplier List ═══ */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">공급자별 품질</h2>
            {report.suppliers.length === 0 ? (
              <p className="text-sm text-gray-400">업로드 이력이 있는 공급자가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">공급자</th>
                      <th className="pb-2 pr-4">등급</th>
                      <th className="pb-2 pr-4">배치</th>
                      <th className="pb-2 pr-4">전체 행</th>
                      <th className="pb-2 pr-4">성공</th>
                      <th className="pb-2 pr-4">실패</th>
                      <th className="pb-2">성공률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.suppliers.map((s) => (
                      <tr key={s.supplierId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-900">{s.supplierName}</td>
                        <td className="py-2 pr-4"><GradeBadge grade={s.grade} /></td>
                        <td className="py-2 pr-4">{s.batchCount}</td>
                        <td className="py-2 pr-4">{s.totalRows.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-green-600">{s.appliedRows.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-red-600">{s.failedRows.toLocaleString()}</td>
                        <td className={`py-2 font-medium ${s.grade === 'GOOD' ? 'text-green-600' : s.grade === 'NORMAL' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {s.successRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ═══ Top Errors ═══ */}
          {report.topErrors.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">오류 유형 TOP {report.topErrors.length}</h2>
              <div className="space-y-2">
                {report.topErrors.map((e, i) => {
                  const maxCount = report.topErrors[0].count;
                  const pct = maxCount > 0 ? (e.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-40 shrink-0 truncate" title={e.type}>
                        {friendlyErrorType(e.type)}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-red-400 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">{e.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
