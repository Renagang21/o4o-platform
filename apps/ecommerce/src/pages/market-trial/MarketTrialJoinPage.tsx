/**
 * Market Trial Join Page
 *
 * Trial 참여 + 보상 선택 페이지
 *
 * @package Phase L-1 - Market Trial
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  MarketTrial,
  RewardType,
  TRIAL_STATUS_LABELS,
  REWARD_TYPE_LABELS,
} from './marketTrial.types';
import { MarketTrialRewardSelector } from './MarketTrialRewardSelector';

export function MarketTrialJoinPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const navigate = useNavigate();

  const [trial, setTrial] = useState<MarketTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = authClient.getCurrentUser();

  useEffect(() => {
    if (trialId) {
      loadTrial();
    }
  }, [trialId]);

  const loadTrial = async () => {
    try {
      const response = await authClient.api.get<{ data: MarketTrial }>(
        `/api/market-trial/${trialId}`
      );
      setTrial(response.data || null);
    } catch (err) {
      console.error('Failed to load trial:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedReward) {
      setError('보상 방식을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await authClient.api.post(`/api/market-trial/${trialId}/join`, {
        rewardType: selectedReward,
      });

      // 성공 - 상세 페이지로 이동
      navigate(`/market-trial/${trialId}`, {
        state: { joined: true },
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          '참여 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 로그인 체크
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            로그인이 필요합니다
          </h2>
          <button
            onClick={() =>
              navigate(`/login?redirect=/market-trial/${trialId}/join`)
            }
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Trial을 찾을 수 없습니다
          </h2>
          <button
            onClick={() => navigate('/market-trial')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (trial.status !== 'open') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            모집이 마감되었습니다
          </h2>
          <button
            onClick={() => navigate(`/market-trial/${trialId}`)}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
          >
            상세로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(`/market-trial/${trialId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Trial 상세로 돌아가기
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Trial 참여하기
          </h1>
          <p className="text-gray-600">{trial.title}</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Trial Summary */}
          <div className="mb-8 pb-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              참여 정보 확인
            </h2>
            <div className="space-y-2 text-gray-600">
              <p>
                <span className="text-gray-500">Trial:</span>{' '}
                <span className="font-medium text-gray-900">{trial.title}</span>
              </p>
              <p>
                <span className="text-gray-500">제공:</span>{' '}
                {trial.supplierName || 'Supplier'}
              </p>
              <p>
                <span className="text-gray-500">상태:</span>{' '}
                <span className="text-green-600 font-medium">
                  {TRIAL_STATUS_LABELS[trial.status]}
                </span>
              </p>
            </div>
          </div>

          {/* Reward Selector (핵심) */}
          <div className="mb-8">
            <MarketTrialRewardSelector
              availableOptions={trial.rewardOptions}
              selectedReward={selectedReward}
              onSelect={setSelectedReward}
              cashAmount={trial.cashRewardAmount}
              productDescription={trial.productRewardDescription}
              disabled={submitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Notice */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">참여 안내</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- 참여 확정 후에는 보상 방식을 변경할 수 없습니다.</li>
              <li>- 보상은 Trial 완료 후 순차적으로 지급됩니다.</li>
              <li>- 문의사항은 Supplier에게 연락해 주세요.</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleJoin}
              disabled={!selectedReward || submitting}
              className="flex-1 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? '처리 중...' : '참여 확정'}
            </button>
            <button
              onClick={() => navigate(`/market-trial/${trialId}`)}
              disabled={submitting}
              className="px-8 py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
