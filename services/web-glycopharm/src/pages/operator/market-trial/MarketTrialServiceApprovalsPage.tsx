/**
 * Market Trial Service Approvals Page (GlycoPharm Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * GlycoPharm 운영자 2차 승인 목록
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface TrialWithApproval {
  id: string;
  title: string;
  description?: string;
  supplierName?: string;
  status: string;
  visibleServiceKeys: string[];
  currentParticipants: number;
  maxParticipants?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  serviceApproval: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedAt?: string;
    reason?: string;
  } | null;
}

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인됨', color: 'bg-green-100 text-green-800' },
  rejected: { label: '반려됨', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS = [
  { label: '전체', value: '' },
  { label: '승인 대기', value: 'pending' },
  { label: '승인됨', value: 'approved' },
  { label: '반려됨', value: 'rejected' },
];

export default function MarketTrialServiceApprovalsPage() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<TrialWithApproval[]>([]);
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
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`${API_BASE}/api/v1/glycopharm/operator/market-trial${params}`);
      setTrials(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Market Trial 서비스 승인</h1>
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
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
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
        <div className="text-center py-12 text-gray-400">해당하는 Trial이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {trials.map((trial) => {
            const approvalCfg = trial.serviceApproval
              ? APPROVAL_STATUS_CONFIG[trial.serviceApproval.status] || { label: trial.serviceApproval.status, color: 'bg-gray-100 text-gray-700' }
              : { label: '미등록', color: 'bg-gray-100 text-gray-500' };

            return (
              <div
                key={trial.id}
                onClick={() => navigate(`/operator/market-trial/${trial.id}`)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{trial.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {trial.supplierName || '공급자'} · {new Date(trial.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${approvalCfg.color}`}>
                    {approvalCfg.label}
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
