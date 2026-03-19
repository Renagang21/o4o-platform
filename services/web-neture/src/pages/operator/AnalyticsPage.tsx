/**
 * OperatorAnalyticsPage — 운영 액션 분석
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1
 *
 * action_logs 기반 운영자 액션 통계 및 이력 조회.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';

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

const SERVICE_KEY = 'neture';

const ACTION_LABELS: Record<string, string> = {
  'neture.operator.registration_approve': '가입 승인',
  'neture.operator.registration_reject': '가입 거부',
  'neture.admin.supplier_approve': '공급사 승인',
  'neture.admin.supplier_reject': '공급사 거부',
  'neture.admin.supplier_deactivate': '공급사 비활성화',
  'neture.admin.product_approve': '상품 승인',
  'neture.admin.product_reject': '상품 거절',
  'neture.admin.bulk_approve': '일괄 승인',
  'neture.admin.service_approval_approve': '서비스 승인',
  'neture.admin.service_approval_reject': '서비스 거절',
  'neture.admin.service_approval_revoke': '서비스 취소',
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ActionSummary[]>([]);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [totals, setTotals] = useState({ total: 0, success_count: 0, failure_count: 0 });
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [actionsPage, setActionsPage] = useState(1);
  const [actionsTotalPages, setActionsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/operator/analytics/summary', {
        params: { serviceKey: SERVICE_KEY, days },
      });
      const data = res.data?.data;
      if (data) {
        setSummary(data.byAction || []);
        setDaily(data.daily || []);
        setTotals(data.totals || { total: 0, success_count: 0, failure_count: 0 });
      }
    } catch (err: any) {
      setError(err.message || '통계를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadActions = useCallback(async () => {
    try {
      const res = await api.get('/operator/analytics/actions', {
        params: { serviceKey: SERVICE_KEY, page: actionsPage, limit: 20 },
      });
      setActions(res.data?.data || []);
      setActionsTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      // silent
    }
  }, [actionsPage]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadActions(); }, [loadActions]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ko-KR')} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getActionLabel = (key: string) => ACTION_LABELS[key] || key.split('.').pop() || key;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>운영 액션 분석</h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>
        운영자 승인/거절 등 액션 이력을 분석합니다.
      </p>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: '0.8125rem', cursor: 'pointer',
              backgroundColor: days === d ? '#1e40af' : '#fff',
              color: days === d ? '#fff' : '#475569',
            }}
          >
            {d}일
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
          {error}
          <button onClick={loadSummary} style={{ display: 'block', margin: '12px auto', padding: '6px 16px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>총 액션 수</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totals.total}</div>
            </div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>성공</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{totals.success_count}</div>
            </div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>실패</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{totals.failure_count}</div>
            </div>
          </div>

          {/* Action Summary */}
          {summary.length > 0 && (
            <div style={{ marginBottom: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>액션별 요약</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: '#334155' }}>{getActionLabel(item.action_key)}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: item.status === 'success' ? '#16a34a' : '#dc2626' }}>{item.status}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {daily.length > 0 && (
            <div style={{ marginBottom: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>일별 추이 (최근 {days}일)</h2>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                {daily.slice().reverse().map((d, i) => {
                  const maxCount = Math.max(...daily.map(x => x.count), 1);
                  const height = Math.max((d.count / maxCount) * 80, 4);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: '100%', maxWidth: 24, height, background: '#3b82f6', borderRadius: 2 }} title={`${formatDate(d.date)}: ${d.count}건`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Actions */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>최근 액션 이력</h2>
            {actions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>기록된 액션이 없습니다.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={thStyle}>일시</th>
                        <th style={thStyle}>액션</th>
                        <th style={thStyle}>상태</th>
                        <th style={thStyle}>상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => (
                        <tr key={action.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle}>{formatDateTime(action.created_at)}</td>
                          <td style={tdStyle}>{getActionLabel(action.action_key)}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600,
                              backgroundColor: action.status === 'success' ? '#d1fae5' : '#fee2e2',
                              color: action.status === 'success' ? '#065f46' : '#991b1b',
                            }}>
                              {action.status === 'success' ? '성공' : '실패'}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: '0.75rem', color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {action.meta?.targetId ? `ID: ${action.meta.targetId.slice(0, 8)}...` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {actionsTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                    <button
                      onClick={() => setActionsPage(p => Math.max(1, p - 1))}
                      disabled={actionsPage <= 1}
                      style={{ ...pageBtn, opacity: actionsPage <= 1 ? 0.4 : 1 }}
                    >
                      이전
                    </button>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', padding: '6px 0' }}>{actionsPage} / {actionsTotalPages}</span>
                    <button
                      onClick={() => setActionsPage(p => p + 1)}
                      disabled={actionsPage >= actionsTotalPages}
                      style={{ ...pageBtn, opacity: actionsPage >= actionsTotalPages ? 0.4 : 1 }}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', color: '#334155',
};

const pageBtn: React.CSSProperties = {
  padding: '6px 14px', fontSize: '0.8125rem', fontWeight: 500, color: '#475569',
  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer',
};
