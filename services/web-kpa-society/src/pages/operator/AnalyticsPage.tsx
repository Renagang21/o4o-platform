/**
 * OperatorAnalyticsPage — 운영 액션 분석
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1
 * WO-O4O-AI-OPERATOR-INSIGHT-V1 — rule-based operator insight
 * WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1:
 *   - 최근 액션 이력 raw <table> → 공용 DataTable
 *   - 조회 실패와 데이터 0건 분리 (3계층 독립 오류)
 *       · 필수 요약(KPI/액션별/일별) 실패 → 집계 영역 오류 + 재시도
 *       · 액션 이력 실패 → 해당 섹션 경고 + 재시도 (빈 목록으로 위장 금지)
 *       · AI 인사이트 실패 → 전체 화면 미차단, 보조 섹션 오류
 *   - 페이지 전체 inline style → Tailwind / O4O 토큰
 *   - 집계·액션 로그 API 계약과 계산 로직은 불변
 *
 * action_logs 기반 운영자 액션 통계 및 이력 조회.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { ApiClient } from '../../api/client';

/** Platform-level API client (not scoped to /kpa) */
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';
const platformApi = new ApiClient(API_BASE);

interface ActionSummary {
  action_key: string;
  status: string;
  count: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface ActionLog {
  id: string;
  service_key: string;
  user_id: string;
  action_key: string;
  status: string;
  meta: Record<string, any> | null;
  created_at: string;
}

const SERVICE_KEY = 'kpa-society';

const ACTION_LABELS: Record<string, string> = {
  'kpa.operator.product_approve': '상품 승인',
  'kpa.operator.product_reject': '상품 거부',
  // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: org_join_approve/reject 라벨 제거(dead flow).
  'kpa.operator.pharmacy_approve': '약국 승인',
  'kpa.operator.pharmacy_reject': '약국 거부',
};

const getActionLabel = (key: string) => ACTION_LABELS[key] || key.split('.').pop() || key;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('ko-KR')} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  // ── 필수 요약 (KPI / 액션별 / 일별) ──
  const [summary, setSummary] = useState<ActionSummary[]>([]);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [totals, setTotals] = useState({ total: 0, success_count: 0, failure_count: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ── 액션 이력 (독립 섹션) ──
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [actionsPage, setActionsPage] = useState(1);
  const [actionsTotalPages, setActionsTotalPages] = useState(1);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionsError, setActionsError] = useState<string | null>(null);

  // ── AI 인사이트 (보조 섹션) ──
  const [insight, setInsight] = useState<{
    summary: string;
    warnings: string[];
    recommendations: string[];
    metrics: { approvalRate: number; rejectionRate: number; totalActions: number; avgDaily: number };
  } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const res: any = await platformApi.get('/operator/analytics/summary', {
        serviceKey: SERVICE_KEY, days,
      });
      const data = res?.data;
      if (data) {
        setSummary(data.byAction || []);
        setDaily(data.daily || []);
        setTotals(data.totals || { total: 0, success_count: 0, failure_count: 0 });
      }
    } catch (err: any) {
      setSummaryError(err.message || '통계를 불러올 수 없습니다.');
    } finally {
      setSummaryLoading(false);
    }
  }, [days]);

  const loadActions = useCallback(async () => {
    try {
      setActionsLoading(true);
      setActionsError(null);
      const res: any = await platformApi.get('/operator/analytics/actions', {
        serviceKey: SERVICE_KEY, page: actionsPage, limit: 20,
      });
      setActions(res?.data || []);
      setActionsTotalPages(res?.pagination?.totalPages || 1);
    } catch (err: any) {
      // 조회 실패를 빈 목록으로 위장하지 않는다 — 섹션 경고 + 재시도
      setActionsError(err?.message || '액션 이력을 불러올 수 없습니다.');
    } finally {
      setActionsLoading(false);
    }
  }, [actionsPage]);

  const loadInsight = useCallback(async () => {
    try {
      setInsightLoading(true);
      setInsightError(null);
      const res: any = await platformApi.get('/operator/analytics/insight', {
        serviceKey: SERVICE_KEY, days,
      });
      setInsight(res?.data || null);
    } catch (err: any) {
      // 보조 섹션 — 전체 화면을 막지 않고 인사이트 카드에만 오류 표시
      setInsightError(err?.message || 'AI 인사이트를 불러올 수 없습니다.');
    } finally {
      setInsightLoading(false);
    }
  }, [days]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadActions(); }, [loadActions]);
  useEffect(() => { loadInsight(); }, [loadInsight]);

  const actionColumns: ListColumnDef<ActionLog>[] = useMemo(() => [
    {
      key: 'created_at',
      header: '일시',
      width: '160px',
      render: (_v, a) => <span className="text-slate-700">{formatDateTime(a.created_at)}</span>,
    },
    {
      key: 'action_key',
      header: '액션',
      render: (_v, a) => <span className="text-slate-700">{getActionLabel(a.action_key)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '90px',
      render: (_v, a) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold ${
            a.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {a.status === 'success' ? '성공' : '실패'}
        </span>
      ),
    },
    {
      key: 'meta',
      header: '상세',
      width: '200px',
      render: (_v, a) => (
        <span className="text-xs text-slate-400 truncate block max-w-[200px]">
          {a.meta?.targetId ? `ID: ${String(a.meta.targetId).slice(0, 8)}...` : '-'}
        </span>
      ),
    },
  ], []);

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">운영 액션 분석</h1>
      <p className="text-sm text-slate-500 mb-6">운영자 승인/거절 등 액션 이력을 분석합니다.</p>

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-md border text-[0.8125rem] transition-colors ${
              days === d
                ? 'bg-blue-800 border-blue-800 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {d}일
          </button>
        ))}
      </div>

      {/* AI Insight Card — 보조 섹션 (실패해도 전체 화면 미차단) */}
      {insightLoading ? (
        <div className="px-4 py-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg text-sky-700 text-[0.8125rem]">
          인사이트 분석 중...
        </div>
      ) : insightError ? (
        <div className="px-4 py-3 mb-6 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sky-800 text-[0.8125rem]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{insightError}</span>
          </div>
          <button
            onClick={loadInsight}
            className="px-2.5 py-1 text-xs border border-sky-300 rounded bg-transparent text-sky-700 hover:bg-sky-100 shrink-0"
          >
            다시 시도
          </button>
        </div>
      ) : insight && (
        <div className="p-5 mb-6 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-sky-900">AI 운영 인사이트</h3>
            <button
              onClick={loadInsight}
              className="px-2.5 py-1 text-xs border border-sky-300 rounded bg-transparent text-sky-700 hover:bg-sky-100"
            >
              새로고침
            </button>
          </div>
          <p className="mb-2 text-[0.8125rem] text-slate-900">{insight.summary}</p>
          {insight.warnings.map((w, i) => (
            <div key={`w-${i}`} className="px-2.5 py-1.5 mb-1 bg-amber-100 rounded text-[0.8125rem] text-amber-800">
              &#9888; {w}
            </div>
          ))}
          {insight.recommendations.map((r, i) => (
            <div key={`r-${i}`} className="px-2.5 py-1.5 mb-1 bg-emerald-50 rounded text-[0.8125rem] text-emerald-800">
              &#128161; {r}
            </div>
          ))}
        </div>
      )}

      {/* 집계 영역 (KPI + 액션별 + 일별) — 필수 요약 */}
      {summaryLoading ? (
        <div className="text-center py-16 text-slate-400">불러오는 중...</div>
      ) : summaryError ? (
        <SectionError message={summaryError} onRetry={loadSummary} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
            <div className="p-5 bg-white rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">총 액션 수</div>
              <div className="text-2xl font-bold text-slate-900">{totals.total}</div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">성공</div>
              <div className="text-2xl font-bold text-green-600">{totals.success_count}</div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">실패</div>
              <div className="text-2xl font-bold text-red-600">{totals.failure_count}</div>
            </div>
          </div>

          {/* Action Summary */}
          {summary.length > 0 && (
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-base font-semibold mb-3">액션별 요약</h2>
              <div className="flex flex-col gap-2">
                {summary.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-md">
                    <span className="text-[0.8125rem] text-slate-700">{getActionLabel(item.action_key)}</span>
                    <div className="flex gap-3 items-center">
                      <span className={`text-xs ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {daily.length > 0 && (
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-base font-semibold mb-3">일별 추이 (최근 {days}일)</h2>
              <div className="flex gap-0.5 items-end h-[100px]">
                {daily.slice().reverse().map((d, i) => {
                  const maxCount = Math.max(...daily.map((x) => x.count), 1);
                  const height = Math.max((d.count / maxCount) * 80, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full max-w-[24px] bg-blue-500 rounded-sm"
                        style={{ height }}
                        title={`${formatDate(d.date)}: ${d.count}건`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Actions — 독립 섹션 */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-3">최근 액션 이력</h2>
        {actionsError ? (
          <SectionError message={actionsError} onRetry={loadActions} compact />
        ) : (
          <>
            <DataTable<ActionLog>
              columns={actionColumns}
              data={actions}
              rowKey="id"
              loading={actionsLoading}
              emptyMessage="기록된 액션이 없습니다."
              tableId="operator-analytics-actions"
            />
            {actionsTotalPages > 1 && (
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setActionsPage((p) => Math.max(1, p - 1))}
                  disabled={actionsPage <= 1}
                  className="px-3.5 py-1.5 text-[0.8125rem] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="text-[0.8125rem] text-slate-500 py-1.5">{actionsPage} / {actionsTotalPages}</span>
                <button
                  onClick={() => setActionsPage((p) => p + 1)}
                  disabled={actionsPage >= actionsTotalPages}
                  className="px-3.5 py-1.5 text-[0.8125rem] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 공통 섹션 오류 UI (조회 실패 ≠ 데이터 0건) ───

function SectionError({ message, onRetry, compact }: { message: string; onRetry: () => void; compact?: boolean }): ReactNode {
  return (
    <div className={`text-center ${compact ? 'py-10' : 'py-16'} text-red-600`}>
      <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
      <p className="text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
      >
        다시 시도
      </button>
    </div>
  );
}
