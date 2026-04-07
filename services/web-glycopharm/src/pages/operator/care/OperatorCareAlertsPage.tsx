/**
 * OperatorCareAlertsPage — 케어 알림
 * WO-O4O-GLYCOPHARM-OPERATOR-CARE-PAGES-V1
 *
 * 플랫폼 전체 Care 알림 관리 (operator/admin 전용)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Bell,
  CheckCircle,
  Search,
} from 'lucide-react';
import {
  pharmacyApi,
  type CareAlertDto,
} from '../../../api/pharmacy';

// ─── Badge Components ────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '심각', color: 'text-red-700', bg: 'bg-red-50' },
  warning: { label: '경고', color: 'text-amber-700', bg: 'bg-amber-50' },
  info: { label: '정보', color: 'text-blue-700', bg: 'bg-blue-50' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || { label: severity, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '열림', color: 'text-amber-700', bg: 'bg-amber-50' },
  acknowledged: { label: '확인됨', color: 'text-blue-700', bg: 'bg-blue-50' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  high_risk: '고위험 상태',
  abnormal_glucose: '혈당 이상',
  data_missing: '데이터 미입력',
  coaching_needed: '코칭 필요',
};

// ─── Types ───────────────────────────────────────────────────

type TabType = 'all' | 'critical' | 'warning' | 'info' | 'acknowledged';

const TABS: { value: TabType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'critical', label: '심각' },
  { value: 'warning', label: '경고' },
  { value: 'info', label: '정보' },
  { value: 'acknowledged', label: '확인됨' },
];

// ─── Main Component ──────────────────────────────────────────

export default function OperatorCareAlertsPage() {
  const [alerts, setAlerts] = useState<CareAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacyApi.getCareAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || '알림을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Stats
  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length;
    const warning = alerts.filter(a => a.severity === 'warning' && a.status === 'open').length;
    const info = alerts.filter(a => a.severity === 'info' && a.status === 'open').length;
    return { total, critical, warning, info };
  }, [alerts]);

  // Filter
  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (activeTab === 'acknowledged') {
      result = result.filter(a => a.status === 'acknowledged');
    } else if (activeTab !== 'all') {
      result = result.filter(a => a.severity === activeTab && a.status === 'open');
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.patientName.toLowerCase().includes(lower) ||
        a.message.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [alerts, activeTab, searchTerm]);

  const tabCounts: Record<TabType, number> = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'open').length,
    warning: alerts.filter(a => a.severity === 'warning' && a.status === 'open').length,
    info: alerts.filter(a => a.severity === 'info' && a.status === 'open').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
  }), [alerts]);

  // Actions
  const handleAck = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await pharmacyApi.acknowledgeCareAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' as const } : a));
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await pharmacyApi.resolveCareAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="p-6 text-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">알림을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">케어 알림</h1>
          <p className="text-sm text-slate-500 mt-1">플랫폼 전체 케어 알림 관리</p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />새로고침
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1: 부분 구현 안내 */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold">알림 목록 조회 단계</p>
          <p className="mt-1 text-amber-700">
            현재는 알림 목록 조회만 제공됩니다. 우선순위 조정·자동화 규칙·일괄 처리는 후속 단계에서 제공됩니다.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50"><Bell className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">전체 알림</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-slate-500">심각</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
              <p className="text-xs text-slate-500">경고</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><AlertCircle className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
              <p className="text-xs text-slate-500">정보</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-100 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tabCounts[tab.value] > 0 && (
                <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {tabCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="당뇨인명, 메시지 검색..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Table */}
        {filteredAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">당뇨인</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">유형</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">심각도</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">메시지</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">상태</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">발생일</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-slate-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAlerts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-800 whitespace-nowrap">{a.patientName}</td>
                    <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap">
                      {ALERT_TYPE_LABELS[a.alertType] || a.alertType}
                    </td>
                    <td className="px-5 py-2.5"><SeverityBadge severity={a.severity} /></td>
                    <td className="px-5 py-2.5 text-slate-600 max-w-xs truncate">{a.message}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {actionLoading === a.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <>
                            {a.status === 'open' && (
                              <button
                                onClick={() => handleAck(a.id)}
                                title="확인"
                                className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                              >
                                확인
                              </button>
                            )}
                            {(a.status === 'open' || a.status === 'acknowledged') && (
                              <button
                                onClick={() => handleResolve(a.id)}
                                title="해결"
                                className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 border border-green-200 rounded hover:bg-green-50"
                              >
                                <CheckCircle className="w-3 h-3" />해결
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-slate-400">
            {searchTerm ? '검색 결과가 없습니다.' : '알림이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
}
