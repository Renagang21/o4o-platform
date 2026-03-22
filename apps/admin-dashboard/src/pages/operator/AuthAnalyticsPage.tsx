/**
 * AuthAnalyticsPage
 *
 * WO-O4O-AUTH-ANALYTICS-UI-V1
 *
 * 운영자용 인증 로그 분석 페이지.
 * action_logs 기반 로그인 성공/실패 시각화.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Shield, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';

// ── Types ──

interface AuthLogEntry {
  id: string;
  user_id: string;
  action_key: string;
  status: 'success' | 'failure';
  error_message: string | null;
  meta: {
    email?: string;
    ip?: string;
    errorCode?: string;
    hashPrefix?: string;
  } | null;
  created_at: string;
}

interface AuthLogsResponse {
  success: boolean;
  data: AuthLogEntry[];
}

// ── API ──

async function fetchAuthLogs(status?: string): Promise<AuthLogEntry[]> {
  const params: Record<string, string> = { limit: '200' };
  if (status) params.status = status;
  const res = await authClient.api.get<AuthLogsResponse>('/api/v1/operator/analytics/auth/logs', { params });
  return res.data?.data ?? [];
}

// ── Constants ──

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'failure', label: '실패' },
] as const;

const ERROR_CODE_LABELS: Record<string, string> = {
  PASSWORD_MISMATCH: '비밀번호 불일치',
  invalid_password: '비밀번호 불일치',
  USER_NOT_FOUND: '사용자 없음',
  user_not_found: '사용자 없음',
  ACCOUNT_INACTIVE: '비활성 계정',
  account_inactive: '비활성 계정',
  ACCOUNT_LOCKED: '계정 잠금',
  account_locked: '계정 잠금',
  SOCIAL_ONLY: '소셜 전용 계정',
  social_only: '소셜 전용 계정',
  RATE_LIMITED: '요청 제한',
  rate_limited: '요청 제한',
};

// ── Component ──

export default function AuthAnalyticsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: logs = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['operator', 'auth-logs', statusFilter],
    queryFn: () => fetchAuthLogs(statusFilter || undefined),
    refetchInterval: 60_000, // auto-refresh every 60s
  });

  // ── Derived data ──

  const summary = useMemo(() => {
    const total = logs.length;
    const success = logs.filter(l => l.status === 'success').length;
    const failure = total - success;
    const failureRate = total > 0 ? Math.round((failure / total) * 100) : 0;
    return { total, success, failure, failureRate };
  }, [logs]);

  const errorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      if (log.status !== 'failure') continue;
      const code = log.meta?.errorCode || log.error_message || 'unknown';
      counts[code] = (counts[code] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([code, count]) => ({ code, label: ERROR_CODE_LABELS[code] || code, count }));
  }, [logs]);

  // ── Render ──

  if (error) {
    return (
      <div className="p-6 text-red-600">
        인증 로그를 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">인증 로그 분석</h1>
          <p className="text-gray-500 mt-1">로그인 성공/실패 이력을 모니터링합니다. (최근 30일)</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          label="총 시도"
          value={summary.total}
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          label="성공"
          value={summary.success}
          bg="bg-green-50"
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          label="실패"
          value={summary.failure}
          bg="bg-red-50"
        />
        <SummaryCard
          icon={<Shield className="w-5 h-5 text-amber-600" />}
          label="실패율"
          value={`${summary.failureRate}%`}
          bg="bg-amber-50"
          highlight={summary.failureRate > 20}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Auth Log Table */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">시간</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이메일</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">결과</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">에러</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Prefix</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={log.meta?.email}>
                        {log.meta?.email || log.user_id?.substring(0, 8) || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'success' ? '성공' : '실패'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.status === 'failure'
                          ? (ERROR_CODE_LABELS[log.meta?.errorCode || ''] || log.meta?.errorCode || log.error_message || '-')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {log.meta?.hashPrefix ? (
                          <code className={`px-1.5 py-0.5 text-xs rounded font-mono ${
                            log.meta.hashPrefix.startsWith('$2b')
                              ? 'bg-green-100 text-green-700'
                              : log.meta.hashPrefix.startsWith('$2a')
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.meta.hashPrefix}
                          </code>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {log.meta?.ip || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              해당 기간에 인증 로그가 없습니다.
            </div>
          )}
        </div>

        {/* Error Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">실패 원인 분포</h2>
          {errorBreakdown.length > 0 ? (
            <div className="space-y-3">
              {errorBreakdown.map((item) => (
                <div key={item.code}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate" title={item.code}>{item.label}</span>
                    <span className="font-medium text-gray-900 ml-2">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${summary.failure > 0 ? (item.count / summary.failure) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">실패 기록 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SummaryCard({ icon, label, value, bg, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${bg} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
