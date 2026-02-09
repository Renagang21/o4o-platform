/**
 * ReportsPage
 *
 * WO-O4O-SUPPLIER-REPORTING-BILLING-BASIS-PHASE3B-CP1
 *
 * consultation 청구 근거 리포트.
 * 운영자용 — 퍼널 요약, 거절 사유, 소스별 비교, 상위 QR, CSV 내보내기.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  ArrowDown,
  ChevronDown,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type PeriodDays = 7 | 30;
type SourceFilter = 'all' | 'qr' | 'tablet';

const SOURCE_LABELS: Record<string, string> = {
  qr: 'QR',
  tablet: '태블릿',
  web: '웹',
  signage: '사이니지',
  print: '전단',
};

interface ReportData {
  period: { from: string; to: string };
  pharmacy?: { id: string; name: string };
  summary: {
    totalEvents: number;
    totalRequests: number;
    approved: number;
    rejected: number;
    pending: number;
    totalActions: number;
    totalOrderDrafts: number;
  };
  funnel: {
    event: number;
    request: number;
    approved: number;
    action: number;
    orderDraft: number;
    eventToRequestRate: number;
    requestToApprovedRate: number;
    approvedToActionRate: number;
  };
  rejectReasons: Array<{
    reason: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  bySource: Array<{
    sourceType: string;
    requests: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    actions: number;
  }>;
  topSources: Array<{
    sourceId: string;
    sourceType: string;
    eventCount: number;
    requestCount: number;
    approvedCount: number;
    approvalRate: number;
  }>;
}

interface PharmacyOption {
  id: string;
  name: string;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(n: number): string {
  return `${n}%`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
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

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = getAccessToken();
      const now = new Date();
      const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams();
      params.set('from', from.toISOString().split('T')[0]);
      params.set('to', now.toISOString().split('T')[0]);
      if (sourceFilter !== 'all') params.set('sourceType', sourceFilter);
      if (pharmacyId) params.set('pharmacyId', pharmacyId);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/reports/consultation?${params.toString()}`,
        {
          headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to fetch report');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setData(json.data);
    } catch (err: any) {
      setError(err.message || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [periodDays, sourceFilter, pharmacyId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleCsvExport = () => {
    if (!data) return;
    const lines: string[] = [];

    // Header
    lines.push(`청구 근거 리포트 (consultation)`);
    lines.push(`기간,${data.period.from} ~ ${data.period.to}`);
    if (data.pharmacy) lines.push(`약국,${data.pharmacy.name}`);
    lines.push('');

    // Summary
    lines.push('=== 요약 ===');
    lines.push('항목,값');
    lines.push(`총 Event,${data.summary.totalEvents}`);
    lines.push(`총 Request,${data.summary.totalRequests}`);
    lines.push(`승인,${data.summary.approved}`);
    lines.push(`거절,${data.summary.rejected}`);
    lines.push(`대기,${data.summary.pending}`);
    lines.push(`Action,${data.summary.totalActions}`);
    lines.push(`Order(draft),${data.summary.totalOrderDrafts}`);
    lines.push('');

    // Funnel
    lines.push('=== 퍼널 전환율 ===');
    lines.push('단계,수치,전환율');
    lines.push(`Event,${data.funnel.event},`);
    lines.push(`Request,${data.funnel.request},${data.funnel.eventToRequestRate}%`);
    lines.push(`Approved,${data.funnel.approved},${data.funnel.requestToApprovedRate}%`);
    lines.push(`Action,${data.funnel.action},${data.funnel.approvedToActionRate}%`);
    lines.push(`Order(draft),${data.funnel.orderDraft},`);
    lines.push('');

    // Reject reasons
    lines.push('=== 거절 사유 ===');
    lines.push('사유,건수,비율');
    data.rejectReasons.forEach((r) => {
      lines.push(`${r.label},${r.count},${r.percentage}%`);
    });
    lines.push('');

    // By source
    lines.push('=== 소스별 비교 ===');
    lines.push('소스,요청,승인,거절,승인율,Action');
    data.bySource.forEach((s) => {
      lines.push(`${SOURCE_LABELS[s.sourceType] || s.sourceType},${s.requests},${s.approved},${s.rejected},${s.approvalRate}%,${s.actions}`);
    });
    lines.push('');

    // Top sources
    lines.push('=== 상위 소스 TOP 5 ===');
    lines.push('Source ID,소스,Event,요청,승인,승인율');
    data.topSources.forEach((s) => {
      lines.push(`${s.sourceId},${SOURCE_LABELS[s.sourceType] || s.sourceType},${s.eventCount},${s.requestCount},${s.approvedCount},${s.approvalRate}%`);
    });

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation-report-${data.period.from}-${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">청구 근거 리포트</h1>
          <p className="text-slate-500 mt-1">consultation 목적 · 운영자 전용</p>
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
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
          {([7, 30] as PeriodDays[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriodDays(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodDays === days ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {days}일
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
          {([
            { key: 'all' as SourceFilter, label: '전체' },
            { key: 'qr' as SourceFilter, label: 'QR' },
            { key: 'tablet' as SourceFilter, label: '태블릿' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sourceFilter === key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Pharmacy selector */}
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
        {data && (
          <span className="text-xs text-slate-400">{data.period.from} ~ {data.period.to}</span>
        )}
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
          <button onClick={fetchReport} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="총 Event" value={data.summary.totalEvents} color="blue" />
            <SummaryCard label="총 Request" value={data.summary.totalRequests} color="amber" />
            <SummaryCard label="승인" value={data.summary.approved} color="green" />
            <SummaryCard label="Action" value={data.summary.totalActions} color="purple" />
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">퍼널 전환</h2>
            <div className="space-y-1">
              <FunnelRow label="Event" value={data.funnel.event} rate={null} />
              <FunnelArrow rate={data.funnel.eventToRequestRate} />
              <FunnelRow label="Request" value={data.funnel.request} rate={data.funnel.eventToRequestRate} />
              <FunnelArrow rate={data.funnel.requestToApprovedRate} />
              <FunnelRow label="Approved" value={data.funnel.approved} rate={data.funnel.requestToApprovedRate} />
              <FunnelArrow rate={data.funnel.approvedToActionRate} />
              <FunnelRow label="Action" value={data.funnel.action} rate={data.funnel.approvedToActionRate} />
              <FunnelArrow rate={null} />
              <FunnelRow label="Order (draft)" value={data.funnel.orderDraft} rate={null} />
            </div>
          </div>

          {/* Reject Reasons */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">거절 사유 분포</h2>
            {data.rejectReasons.length === 0 ? (
              <p className="text-sm text-slate-400">거절 데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {data.rejectReasons.map((r) => (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{r.label}</span>
                      <span className="text-sm text-slate-500">{fmt(r.count)}건 ({pct(r.percentage)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${Math.max(r.percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Source */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">소스별 비교</h2>
            </div>
            {data.bySource.length === 0 ? (
              <p className="text-sm text-slate-400 px-6 pb-6">데이터 없음</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">소스</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">요청</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">승인</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">거절</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">승인율</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySource.map((s) => (
                      <tr key={s.sourceType} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-700">{SOURCE_LABELS[s.sourceType] || s.sourceType}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">{fmt(s.requests)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{fmt(s.approved)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{fmt(s.rejected)}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-700 font-medium">{pct(s.approvalRate)}</td>
                        <td className="px-6 py-3 text-sm text-right text-purple-600 font-medium">{fmt(s.actions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Sources */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">상위 소스 TOP 5</h2>
            </div>
            {data.topSources.length === 0 ? (
              <p className="text-sm text-slate-400 px-6 pb-6">데이터 없음</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">소스</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Event</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">요청</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">승인</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">승인율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSources.map((s, i) => (
                      <tr key={s.sourceId} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-bold text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-700">{s.sourceId}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{SOURCE_LABELS[s.sourceType] || s.sourceType}</td>
                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">{fmt(s.eventCount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-amber-600 font-medium">{fmt(s.requestCount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{fmt(s.approvedCount)}</td>
                        <td className="px-6 py-3 text-sm text-right text-slate-700 font-medium">{pct(s.approvalRate)}</td>
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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{fmt(value)}</p>
    </div>
  );
}

function FunnelRow({ label, value, rate }: { label: string; value: number; rate: number | null }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-slate-800">{fmt(value)}</span>
        {rate !== null && (
          <span className="text-xs font-medium text-slate-400">({pct(rate)})</span>
        )}
      </div>
    </div>
  );
}

function FunnelArrow({ rate }: { rate: number | null }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
      {rate !== null && (
        <span className="text-[10px] font-medium text-slate-300 ml-1">{pct(rate)}</span>
      )}
    </div>
  );
}
