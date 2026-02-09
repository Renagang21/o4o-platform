/**
 * FunnelPage
 *
 * WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1
 *
 * consultation 목적 한정 퍼널 시각화.
 * 내부 판단용 — 차트 없음, 금액 없음, 숫자만.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, ArrowDown, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type PeriodDays = 7 | 30;
type SourceFilter = 'all' | 'qr' | 'tablet';

interface FunnelData {
  period: { from: string; to: string };
  event: { total: number; impressions: number; clicks: number; qrScans: number };
  request: { total: number; approved: number; rejected: number; pending: number };
  action: { total: number; draft: number; inProgress: number; completed: number };
  orderDraft: { total: number };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function conversionRate(from: number, to: number): string {
  if (from === 0) return '-';
  return `${((to / from) * 100).toFixed(1)}%`;
}

export default function FunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      const now = new Date();
      const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams();
      params.set('from', from.toISOString().split('T')[0]);
      params.set('to', now.toISOString().split('T')[0]);
      if (sourceFilter !== 'all') {
        params.set('sourceType', sourceFilter);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/funnel/consultation?${params.toString()}`,
        {
          headers: {
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          credentials: 'include',
        },
      );

      if (!response.ok) throw new Error('Failed to fetch funnel data');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');

      setData(result.data);
    } catch (err: any) {
      console.error('Funnel fetch error:', err);
      setError(err.message || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [periodDays, sourceFilter]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">전환 퍼널</h1>
          <p className="text-slate-500 mt-1">consultation 목적 · 내부 판단용</p>
        </div>
        <button
          onClick={fetchFunnel}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
          {([7, 30] as PeriodDays[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriodDays(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodDays === days
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {days}일
            </button>
          ))}
        </div>

        {/* Source filter */}
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
                sourceFilter === key
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Period display */}
        {data && (
          <span className="text-xs text-slate-400">
            {data.period.from} ~ {data.period.to}
          </span>
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
          <button
            onClick={fetchFunnel}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Funnel Data */}
      {data && !loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Event Stage */}
          <FunnelStage
            title="Event"
            subtitle="노출/클릭/스캔"
            total={data.event.total}
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            titleColor="text-blue-800"
            items={[
              { label: 'impression', value: data.event.impressions },
              { label: 'click', value: data.event.clicks },
              { label: 'qr_scan', value: data.event.qrScans },
            ]}
          />

          <ConversionArrow
            rate={conversionRate(data.event.total, data.request.total)}
          />

          {/* Request Stage */}
          <FunnelStage
            title="Request"
            subtitle="고객 요청"
            total={data.request.total}
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            titleColor="text-amber-800"
            items={[
              { label: '승인', value: data.request.approved, color: 'text-green-600' },
              { label: '거절', value: data.request.rejected, color: 'text-red-600' },
              { label: '대기', value: data.request.pending, color: 'text-amber-600' },
            ]}
          />

          <ConversionArrow
            rate={conversionRate(data.request.total, data.action.total)}
          />

          {/* Action Stage */}
          <FunnelStage
            title="Action"
            subtitle="상담 로그"
            total={data.action.total}
            bgColor="bg-green-50"
            borderColor="border-green-200"
            titleColor="text-green-800"
            items={[
              { label: '초안', value: data.action.draft, color: 'text-amber-600' },
              { label: '진행 중', value: data.action.inProgress, color: 'text-blue-600' },
              { label: '완료', value: data.action.completed, color: 'text-green-600' },
            ]}
          />

          <ConversionArrow
            rate={conversionRate(data.action.total, data.orderDraft.total)}
          />

          {/* Order Draft Stage */}
          <FunnelStage
            title="Order (draft)"
            subtitle="주문 초안 · 참고"
            total={data.orderDraft.total}
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            titleColor="text-purple-800"
            items={[]}
          />
        </div>
      )}

      {/* Interpretation Guide */}
      {data && !loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">해석 가이드</h2>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>
              <span className="font-medium text-slate-700">Event</span> 많고{' '}
              <span className="font-medium text-slate-700">Request</span> 적음
              → 의도 전달 또는 UX 문제
            </li>
            <li>
              <span className="font-medium text-slate-700">Request</span> 많고{' '}
              <span className="font-medium text-slate-700">승인</span> 적음
              → 운영 부담 또는 조건 문제
            </li>
            <li>
              <span className="font-medium text-slate-700">승인</span> 많고{' '}
              <span className="font-medium text-slate-700">Action</span> 적음
              → 후속 연결 문제
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Funnel stage block */
function FunnelStage({
  title,
  subtitle,
  total,
  bgColor,
  borderColor,
  titleColor,
  items,
}: {
  title: string;
  subtitle: string;
  total: number;
  bgColor: string;
  borderColor: string;
  titleColor: string;
  items: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className={`text-sm font-bold ${titleColor}`}>{title}</span>
          <span className="text-xs text-slate-400 ml-2">{subtitle}</span>
        </div>
        <span className={`text-2xl font-bold ${titleColor}`}>
          {formatNumber(total)}
        </span>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {items.map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">{label}</span>
              <span className={`font-semibold ${color || 'text-slate-700'}`}>
                {formatNumber(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Arrow between stages with conversion rate */
function ConversionArrow({ rate }: { rate: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <ArrowDown className="w-4 h-4 text-slate-300" />
      <span className="text-xs font-medium text-slate-400">{rate}</span>
    </div>
  );
}
