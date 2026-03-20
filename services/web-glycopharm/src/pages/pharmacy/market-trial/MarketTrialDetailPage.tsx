/**
 * Market Trial Detail Page (Pharmacy Store)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * 매장에서 Trial 상세 확인 + 참여하기
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface TrialDetail {
  id: string;
  title: string;
  description?: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
  };
  rewardOptions?: string[];
  currentParticipants: number;
  maxParticipants?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface Participation {
  id: string;
  trialId: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  joinedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중', submitted: '심사 대기', approved: '승인 대기',
  recruiting: '모집 중', development: '준비 중', outcome_confirming: '결과 확정 중',
  fulfilled: '이행 완료', closed: '종료',
};

const STATUS_COLORS: Record<string, string> = {
  recruiting: 'bg-green-100 text-green-800',
  development: 'bg-purple-100 text-purple-800',
  fulfilled: 'bg-teal-100 text-teal-800',
  closed: 'bg-red-100 text-red-700',
};

export default function MarketTrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<TrialDetail | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<'cash' | 'product'>('product');

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trialRes, partRes] = await Promise.all([
        api.get(`${API_BASE}/api/market-trial/${id}`),
        api.get(`${API_BASE}/api/market-trial/${id}/participation`).catch(() => ({ data: { data: null } })),
      ]);
      setTrial(trialRes.data.data);
      setParticipation(partRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Trial을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!id) return;
    setJoinLoading(true);
    setError('');
    try {
      const { data } = await api.post(`${API_BASE}/api/market-trial/${id}/join`, {
        rewardType: selectedReward,
      });
      setParticipation(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '참여에 실패했습니다.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  if (!trial) {
    return <div className="p-6 text-center text-gray-500">{error || 'Trial을 찾을 수 없습니다.'}</div>;
  }

  const isRecruiting = trial.status === 'recruiting';
  const canJoin = isRecruiting && !participation;
  const isFull = trial.maxParticipants ? trial.currentParticipants >= trial.maxParticipants : false;
  const statusColor = STATUS_COLORS[trial.status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/store/market-trial')}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 목록
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Trial Info Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">{trial.title}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
              {STATUS_LABELS[trial.status] || trial.status}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">{trial.supplierName || '공급자'}</p>

          {trial.description && (
            <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">{trial.description}</p>
          )}

          <div className="space-y-3 text-sm">
            {trial.outcomeSnapshot && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-20">결과 약속</span>
                <span className="text-gray-900">
                  {trial.outcomeSnapshot.expectedType === 'product' ? '제품' : '현금'}: {trial.outcomeSnapshot.description}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0 w-20">모집 기간</span>
              <span className="text-gray-900">{fmtDate(trial.startDate)} ~ {fmtDate(trial.endDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0 w-20">참여 현황</span>
              <span className="text-gray-900">
                {trial.currentParticipants}명
                {trial.maxParticipants ? ` / ${trial.maxParticipants}명` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Participation Section */}
        <div className="border-t border-gray-200 p-5">
          {participation ? (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-teal-800 mb-2">참여 완료</h3>
              <div className="text-sm text-teal-700 space-y-1">
                <p>보상 유형: {participation.rewardType === 'product' ? '제품' : '현금'}</p>
                <p>보상 상태: {participation.rewardStatus === 'fulfilled' ? '지급 완료' : '대기 중'}</p>
                <p>참여일: {new Date(participation.joinedAt).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
          ) : canJoin ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">참여하기</h3>
              {isFull ? (
                <p className="text-sm text-red-600">참여 인원이 마감되었습니다.</p>
              ) : (
                <>
                  {trial.rewardOptions && trial.rewardOptions.length > 0 && (
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 mb-2 block">보상 유형 선택</label>
                      <div className="flex gap-3">
                        {trial.rewardOptions.includes('product') && (
                          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="radio"
                              value="product"
                              checked={selectedReward === 'product'}
                              onChange={() => setSelectedReward('product')}
                            />
                            제품 제공
                          </label>
                        )}
                        {trial.rewardOptions.includes('cash') && (
                          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="radio"
                              value="cash"
                              checked={selectedReward === 'cash'}
                              onChange={() => setSelectedReward('cash')}
                            />
                            현금 보상
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleJoin}
                    disabled={joinLoading}
                    className="w-full py-2.5 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {joinLoading ? '참여 처리 중...' : '참여하기'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {trial.status === 'closed' || trial.status === 'fulfilled'
                ? '종료된 Trial입니다.'
                : '현재 참여할 수 없는 상태입니다.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ko-KR');
}
