/**
 * Market Trial Approvals Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * 1차 승인 목록 — submitted trials 심사 + 전체 trial 관리
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOperatorTrials } from '../../api/trial';
import type { OperatorTrial } from '../../api/trial';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '작성 중', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: '심사 대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인됨', color: 'bg-blue-100 text-blue-800' },
  recruiting: { label: '모집 중', color: 'bg-green-100 text-green-800' },
  development: { label: '준비 중', color: 'bg-purple-100 text-purple-800' },
  outcome_confirming: { label: '결과 확정', color: 'bg-indigo-100 text-indigo-800' },
  fulfilled: { label: '이행 완료', color: 'bg-teal-100 text-teal-800' },
  closed: { label: '종료', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: '전체', value: '' },
  { label: '심사 대기', value: 'submitted' },
  { label: '승인됨', value: 'approved' },
  { label: '모집 중', value: 'recruiting' },
  { label: '종료', value: 'closed' },
];

export default function MarketTrialApprovalsPage() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<OperatorTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadTrials();
  }, [filter]);

  const loadTrials = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOperatorTrials(filter || undefined);
      setTrials(data);
    } catch (err: any) {
      setError(err.message || 'Trial 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Market Trial 관리</h1>
        <span className="text-sm text-gray-500">{trials.length}건</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              filter === tab.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      ) : trials.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter ? `"${FILTER_TABS.find((t) => t.value === filter)?.label}" 상태의 Trial이 없습니다.` : 'Trial이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {trials.map((trial) => {
            const statusCfg = STATUS_CONFIG[trial.status] || { label: trial.status, color: 'bg-gray-100 text-gray-700' };
            return (
              <div
                key={trial.id}
                onClick={() => navigate(`/workspace/operator/market-trial/${trial.id}`)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{trial.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {trial.supplierName || '공급자'} · {new Date(trial.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                    {trial.visibleServiceKeys && trial.visibleServiceKeys.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {trial.visibleServiceKeys.map((key) => (
                          <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
