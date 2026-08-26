/**
 * AiCostPage - 관리자 AI 비용 현황
 *
 * Work Order: WO-AI-COST-TOOLING-V1
 * 개정: WO-O4O-NETURE-AI-ADMIN-API-500-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1
 *   - mock 데이터 표시를 제거하고 실제 집계 API(/api/ai/admin/analytics/*)에 연결한다.
 *   - 백엔드 근거가 없는 지표(일별 추이, 패키지 준수율, 내부 단가표)는 표시하지 않는다.
 *   - 조회 실패를 0건/빈 화면으로 위장하지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { Activity, BarChart3, DollarSign, Info, Server } from 'lucide-react';
import { api, API_BASE_URL } from '../../../lib/apiClient';
import { formatCost } from './aiCostConfig';
import { AiAdminEmptyState, AiAdminErrorState, toAiAdminError, type AiAdminError } from './AiAdminStates';

interface CostSummaryResponse {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgDurationMs: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
  days: number;
}

interface ScopeCostRow {
  scope: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  errors: number;
}

interface ModelCostRow {
  provider: string;
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

const DAY_OPTIONS = [7, 30, 90];

const formatNumber = (num: number) => num.toLocaleString('ko-KR');

function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  subValue?: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
      </div>
    </div>
  );
}

export default function AiCostPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AiAdminError | null>(null);
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null);
  const [byScope, setByScope] = useState<ScopeCostRow[]>([]);
  const [byModel, setByModel] = useState<ModelCostRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, scopeRes, modelRes] = await Promise.all([
        api.get(`${API_BASE_URL}/api/ai/admin/analytics/summary?days=${days}`),
        api.get(`${API_BASE_URL}/api/ai/admin/analytics/by-scope?days=${days}`),
        api.get(`${API_BASE_URL}/api/ai/admin/analytics/by-model?days=${days}`),
      ]);

      if (!summaryRes.data?.success || !scopeRes.data?.success || !modelRes.data?.success) {
        setSummary(null);
        setByScope([]);
        setByModel([]);
        setError({ status: 200, message: '비용 집계 응답 형식이 올바르지 않습니다.' });
        return;
      }

      setSummary(summaryRes.data.data);
      setByScope(scopeRes.data.data || []);
      setByModel(modelRes.data.data || []);
    } catch (err) {
      setSummary(null);
      setByScope([]);
      setByModel([]);
      setError(toAiAdminError(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scopeColumns: ListColumnDef<ScopeCostRow>[] = [
    {
      key: 'scope',
      header: '스코프',
      minWidth: 160,
      render: (_v, row) => <div className="font-medium text-gray-900">{row.scope}</div>,
    },
    {
      key: 'requests',
      header: '요청 수',
      align: 'right',
      width: '100px',
      render: (_v, row) => <span className="text-gray-600">{formatNumber(row.requests)}</span>,
    },
    {
      key: 'tokens',
      header: '토큰',
      align: 'right',
      width: '110px',
      render: (_v, row) => <span className="text-gray-600">{formatNumber(row.tokens)}</span>,
    },
    {
      key: 'cost',
      header: '추정 비용',
      align: 'right',
      width: '110px',
      render: (_v, row) => <span className="font-medium text-gray-900">{formatCost(row.cost)}</span>,
    },
    {
      key: 'latency',
      header: '평균 지연(ms)',
      align: 'right',
      width: '130px',
      render: (_v, row) => <span className="text-gray-600">{formatNumber(row.latency)}</span>,
    },
    {
      key: 'errors',
      header: '오류',
      align: 'right',
      width: '90px',
      render: (_v, row) => (
        <span className={row.errors > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
          {formatNumber(row.errors)}
        </span>
      ),
    },
  ];

  const modelColumns: ListColumnDef<ModelCostRow>[] = [
    {
      key: 'model',
      header: '모델',
      minWidth: 180,
      render: (_v, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.model || '-'}</div>
          <div className="text-xs text-gray-400">{row.provider || '-'}</div>
        </div>
      ),
    },
    {
      key: 'requests',
      header: '요청 수',
      align: 'right',
      width: '100px',
      render: (_v, row) => <span className="text-gray-600">{formatNumber(row.requests)}</span>,
    },
    {
      key: 'tokens',
      header: '토큰',
      align: 'right',
      width: '110px',
      render: (_v, row) => <span className="text-gray-600">{formatNumber(row.tokens)}</span>,
    },
    {
      key: 'cost',
      header: '추정 비용',
      align: 'right',
      width: '110px',
      render: (_v, row) => <span className="font-medium text-gray-900">{formatCost(row.cost)}</span>,
    },
    {
      key: 'errors',
      header: '오류',
      align: 'right',
      width: '90px',
      render: (_v, row) => (
        <span className={row.errors > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
          {formatNumber(row.errors)}
        </span>
      ),
    },
  ];

  const avgCostPerRequest =
    summary && summary.totalRequests > 0 ? summary.totalCost / summary.totalRequests : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 overflow-x-auto">
            <Link
              to="/admin/ai-admin"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai-admin/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai-admin/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai-admin/cost"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm whitespace-nowrap"
            >
              비용 현황
            </Link>
            <Link
              to="/admin/ai-admin/context-assets"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              Context Asset
            </Link>
            <Link
              to="/admin/ai-admin/composition-rules"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              응답 규칙
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI 비용 현황</h1>
            <p className="text-gray-500 mt-1">
              최근 {days}일간 기록된 AI 사용 로그를 기준으로 집계합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  days === option
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {option}일
              </button>
            ))}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : error ? (
          <AiAdminErrorState error={error} onRetry={fetchData} retrying={loading} />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={Activity}
                label="총 AI 요청"
                value={formatNumber(summary?.totalRequests ?? 0)}
                subValue={`최근 ${days}일`}
                iconColor="bg-blue-100 text-blue-600"
              />
              <SummaryCard
                icon={DollarSign}
                label="총 추정 비용"
                value={formatCost(summary?.totalCost ?? 0)}
                subValue="사용 로그 기반 추정치"
                iconColor="bg-green-100 text-green-600"
              />
              <SummaryCard
                icon={BarChart3}
                label="평균 비용/요청"
                value={formatCost(avgCostPerRequest)}
                subValue={`토큰 ${formatNumber(summary?.totalTokens ?? 0)}`}
                iconColor="bg-amber-100 text-amber-600"
              />
              <SummaryCard
                icon={Server}
                label="오류율"
                value={`${summary?.errorRate ?? 0}%`}
                subValue={`평균 응답 ${formatNumber(summary?.avgDurationMs ?? 0)}ms`}
                iconColor="bg-purple-100 text-purple-600"
              />
            </div>

            {/* Scope */}
            <section className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">스코프별 비용</h2>
              {byScope.length === 0 ? (
                <AiAdminEmptyState message={`최근 ${days}일간 기록된 AI 사용 로그가 없습니다.`} />
              ) : (
                <DataTable
                  tableId="neture-ai-cost-by-scope"
                  columns={scopeColumns}
                  data={[...byScope].sort((a, b) => b.cost - a.cost)}
                  rowKey={(row) => row.scope}
                />
              )}
            </section>

            {/* Model */}
            <section className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">모델별 비용</h2>
              {byModel.length === 0 ? (
                <AiAdminEmptyState message={`최근 ${days}일간 기록된 AI 사용 로그가 없습니다.`} />
              ) : (
                <DataTable
                  tableId="neture-ai-cost-by-model"
                  columns={modelColumns}
                  data={[...byModel].sort((a, b) => b.cost - a.cost)}
                  rowKey={(row) => `${row.provider}:${row.model}`}
                />
              )}
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>비용 가시화 원칙</strong>: 이 화면은 비용 통제 도구가 아니라 운영 판단
                도구입니다. 표시되는 비용은 <code>ai_usage_logs</code> 에 기록된 추정치이며 실제
                과금액과 다를 수 있습니다.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
