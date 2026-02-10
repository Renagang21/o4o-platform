/**
 * BillingPreviewPage
 *
 * WO-O4O-BILLING-AUTOMATION-PHASE3C-CP1
 *
 * consultation 목적 청구 미리보기.
 * 운영자 전용 — 기간/단가/청구기준 선택 → 예상 청구 금액 산출.
 * 결제/확정 기능 없음. Preview only.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  ChevronDown,
  Calculator,
  Info,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type PeriodDays = 7 | 30;
type BillingUnit = 'consultation_action' | 'approved_request';

const UNIT_LABELS: Record<BillingUnit, string> = {
  consultation_action: 'Consultation Action 건수',
  approved_request: '승인된 Request 건수',
};

interface BillingPreviewData {
  period: { from: string; to: string };
  pharmacy?: { id: string; name: string };
  unit: BillingUnit;
  unitPrice: number;
  count: number;
  amount: number;
  details: Array<{
    date: string;
    sourceId: string | null;
    requestId: string;
    actionType: string;
    unitPrice: number;
  }>;
}

interface PharmacyOption {
  id: string;
  name: string;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function krw(n: number): string {
  return `\u20A9${n.toLocaleString()}`;
}

export default function BillingPreviewPage() {
  const [data, setData] = useState<BillingPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [billingUnit, setBillingUnit] = useState<BillingUnit>('consultation_action');
  const [unitPrice, setUnitPrice] = useState<number>(5000);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);

  // Fetch pharmacy list for dropdown
  useEffect(() => {
    (async () => {
      try {
        const accessToken = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/reports/pharmacies`, {
          headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) setPharmacies(json.data || []);
      } catch {
        // Silent - pharmacy list is optional
      }
    })();
  }, []);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = getAccessToken();
      const now = new Date();
      const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams();
      params.set('from', from.toISOString().split('T')[0]);
      params.set('to', now.toISOString().split('T')[0]);
      params.set('unit', billingUnit);
      params.set('unitPrice', unitPrice.toString());
      if (pharmacyId) params.set('pharmacyId', pharmacyId);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/billing/preview/consultation?${params.toString()}`,
        {
          headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to fetch billing preview');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setData(json.data);
    } catch (err: any) {
      setError(err.message || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [periodDays, billingUnit, unitPrice, pharmacyId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleCsvExport = () => {
    if (!data) return;
    const lines: string[] = [];

    // Header
    lines.push(`청구 미리보기 (consultation) - PREVIEW ONLY`);
    lines.push(`기간,${data.period.from} ~ ${data.period.to}`);
    if (data.pharmacy) lines.push(`약국,${data.pharmacy.name}`);
    lines.push(`청구 기준,${UNIT_LABELS[data.unit]}`);
    lines.push(`단가,${data.unitPrice}`);
    lines.push(`건수,${data.count}`);
    lines.push(`예상 청구 금액,${data.amount}`);
    lines.push('');

    // Details
    lines.push('=== 청구 상세 근거 ===');
    lines.push('날짜,Source ID,Request ID,Action Type,단가');
    data.details.forEach((d) => {
      lines.push(`${d.date},${d.sourceId || ''},${d.requestId},${d.actionType},${d.unitPrice}`);
    });

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-preview-consultation-${data.period.from}-${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">청구 미리보기</h1>
          <p className="text-slate-500 mt-1">consultation 목적 · 자동 산출 · Preview Only</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={!data || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">미리보기 전용</p>
          <p className="mt-0.5">이 화면은 청구 금액을 <strong>산출</strong>만 하며, 실제 청구/결제가 발생하지 않습니다. 단가를 변경하면 금액이 즉시 재계산됩니다.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">산출 조건</h2>
        <div className="flex flex-wrap items-end gap-4">
          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">기간</label>
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1">
              {([7, 30] as PeriodDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriodDays(days)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    periodDays === days ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {days}일
                </button>
              ))}
            </div>
          </div>

          {/* Billing Unit */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">청구 기준</label>
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1">
              {(['consultation_action', 'approved_request'] as BillingUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setBillingUnit(u)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    billingUnit === u ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {u === 'consultation_action' ? 'Action' : 'Approved Request'}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">단가 (원)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Pharmacy */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">약국</label>
            <div className="relative">
              <select
                value={pharmacyId}
                onChange={(e) => setPharmacyId(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">전체 약국</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={fetchPreview} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <>
          {/* Billing Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-slate-800">청구 미리보기 결과</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">기간</p>
                <p className="text-sm font-semibold text-slate-800">{data.period.from} ~ {data.period.to}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-600 mb-1">청구 기준</p>
                <p className="text-sm font-semibold text-blue-800">{UNIT_LABELS[data.unit]}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-600 mb-1">단가</p>
                <p className="text-lg font-bold text-amber-800">{krw(data.unitPrice)}</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs font-medium text-purple-600 mb-1">건수</p>
                <p className="text-lg font-bold text-purple-800">{fmt(data.count)}건</p>
              </div>
            </div>

            {/* Total Amount */}
            <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 text-center">
              <p className="text-sm font-medium text-green-600 mb-2">예상 청구 금액</p>
              <p className="text-3xl font-bold text-green-800">{krw(data.amount)}</p>
              <p className="text-xs text-green-500 mt-2">
                {fmt(data.count)}건 x {krw(data.unitPrice)} = {krw(data.amount)}
              </p>
              <p className="text-xs text-green-400 mt-1">* 미리보기 전용 · 실제 청구 아님</p>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-0 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">청구 상세 근거</h2>
              <span className="text-xs text-slate-400">{fmt(data.details.length)}건</span>
            </div>
            {data.details.length === 0 ? (
              <p className="text-sm text-slate-400 px-6 py-8 text-center">해당 기간 청구 대상 없음</p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">날짜</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Request ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">단가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.map((d, i) => (
                      <tr key={`${d.requestId}-${i}`} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-bold text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{d.date}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{d.sourceId || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{d.requestId.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{d.actionType}</td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-slate-700">{krw(d.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
