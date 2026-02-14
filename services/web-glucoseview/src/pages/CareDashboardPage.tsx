import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { CareDashboardDto } from '../services/api';

export default function CareDashboardPage() {
  const [data, setData] = useState<CareDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getCareDashboard();
        setData(result);
      } catch {
        setError('대시보드 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const riskBadge = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'moderate': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const riskText = (level: string) => {
    switch (level) {
      case 'high': return '고위험';
      case 'moderate': return '주의';
      case 'low': return '양호';
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-semibold text-slate-900">Care Dashboard</h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-red-600 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totalRisk = data.highRiskCount + data.moderateRiskCount + data.lowRiskCount;
  const riskPercent = (count: number) => totalRisk > 0 ? Math.round((count / totalRisk) * 100) : 0;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-slate-900">Care Dashboard</h1>
          <p className="text-slate-500 mt-1">환자 현황 및 관리 성과를 한눈에 확인합니다.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500 mb-1">관리 환자</p>
            <p className="text-3xl font-bold text-slate-900">{data.totalPatients}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <p className="text-sm text-red-500 mb-1">고위험 환자</p>
            <p className="text-3xl font-bold text-red-600">{data.highRiskCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500 mb-1">최근 7일 상담</p>
            <p className="text-3xl font-bold text-slate-900">{data.recentCoachingCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-6">
            <p className="text-sm text-green-600 mb-1">개선 환자</p>
            <p className="text-3xl font-bold text-green-600">{data.improvingCount}</p>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">위험군 분포</h3>
          {totalRisk === 0 ? (
            <p className="text-slate-400 text-sm">아직 분석 기록이 없습니다.</p>
          ) : (
            <>
              <div className="flex rounded-full h-4 overflow-hidden mb-4">
                {data.highRiskCount > 0 && (
                  <div className="bg-red-400" style={{ width: `${riskPercent(data.highRiskCount)}%` }} />
                )}
                {data.moderateRiskCount > 0 && (
                  <div className="bg-amber-400" style={{ width: `${riskPercent(data.moderateRiskCount)}%` }} />
                )}
                {data.lowRiskCount > 0 && (
                  <div className="bg-green-400" style={{ width: `${riskPercent(data.lowRiskCount)}%` }} />
                )}
              </div>
              <div className="flex gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  High {data.highRiskCount}명 ({riskPercent(data.highRiskCount)}%)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  Moderate {data.moderateRiskCount}명 ({riskPercent(data.moderateRiskCount)}%)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  Low {data.lowRiskCount}명 ({riskPercent(data.lowRiskCount)}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Two column: Recent Analysis + Recent Coaching */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Analysis */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">최근 분석</h3>
              <Link to="/insights" className="text-sm text-blue-600 hover:underline">전체 보기</Link>
            </div>
            {data.recentSnapshots.length === 0 ? (
              <p className="text-slate-400 text-sm">분석 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentSnapshots.map((s, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 truncate max-w-[60%]">{s.patientId.slice(0, 8)}...</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(s.riskLevel)}`}>
                        {riskText(s.riskLevel)}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(s.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Coaching */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">최근 상담</h3>
              <Link to="/insights" className="text-sm text-blue-600 hover:underline">전체 보기</Link>
            </div>
            {data.recentSessions.length === 0 ? (
              <p className="text-slate-400 text-sm">상담 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentSessions.map((s, i) => (
                  <li key={i} className="border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{formatDate(s.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{s.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
