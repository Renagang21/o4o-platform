/**
 * Market Trial List Page
 *
 * Partner/Seller용 Trial 목록
 *
 * @package Phase L-1 - Market Trial
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  MarketTrial,
  TrialStatus,
  TRIAL_STATUS_LABELS,
  ROLE_LABELS,
  REWARD_TYPE_LABELS,
} from './marketTrial.types';

export function MarketTrialListPage() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<MarketTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TrialStatus | 'all'>('all');

  const user = authClient.getCurrentUser();

  useEffect(() => {
    loadTrials();
  }, []);

  const loadTrials = async () => {
    try {
      const response = await authClient.api.get<{ data: MarketTrial[] }>(
        '/api/market-trial'
      );
      setTrials(response.data || []);
    } catch (error) {
      console.error('Failed to load trials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrials = trials.filter((trial) => {
    if (filter === 'all') return true;
    return trial.status === filter;
  });

  // 접근 권한 체크 (Partner/Seller만)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            Market Trial에 참여하려면 먼저 로그인해 주세요.
          </p>
          <button
            onClick={() => navigate('/login?redirect=/market-trial')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Market Trial
          </h1>
          <p className="text-gray-600">
            새로운 제품과 서비스를 먼저 체험하고 보상을 받으세요.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-600">상태:</span>
          {(['all', 'open', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? '전체' : TRIAL_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {/* Trial List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredTrials.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? '아직 진행 중인 Trial이 없습니다'
                : `${TRIAL_STATUS_LABELS[filter as TrialStatus]} 상태의 Trial이 없습니다`}
            </h3>
            <p className="text-gray-600">
              새로운 Trial이 등록되면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrials.map((trial) => (
              <TrialCard
                key={trial.id}
                trial={trial}
                onViewDetail={() => navigate(`/market-trial/${trial.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrialCard({
  trial,
  onViewDetail,
}: {
  trial: MarketTrial;
  onViewDetail: () => void;
}) {
  const isOpen = trial.status === 'open';
  const hasSpots =
    !trial.maxParticipants ||
    (trial.currentParticipants || 0) < trial.maxParticipants;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status & Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isOpen
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {TRIAL_STATUS_LABELS[trial.status]}
            </span>
            {isOpen && hasSpots && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                참여 가능
              </span>
            )}
            {trial.maxParticipants && (
              <span className="text-xs text-gray-500">
                {trial.currentParticipants || 0}/{trial.maxParticipants}명
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {trial.title}
          </h3>

          {/* Supplier */}
          <p className="text-sm text-gray-500 mb-3">
            {trial.supplierName || 'Supplier'}
          </p>

          {/* Description (truncated) */}
          <p className="text-gray-600 mb-4 line-clamp-2">{trial.description}</p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {/* Eligible Roles */}
            <div className="flex items-center gap-1">
              <span>대상:</span>
              {trial.eligibleRoles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>

            {/* Reward Options */}
            <div className="flex items-center gap-1">
              <span>보상:</span>
              {trial.rewardOptions.map((reward) => (
                <span
                  key={reward}
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
                >
                  {REWARD_TYPE_LABELS[reward]}
                </span>
              ))}
            </div>

            {/* Deadline */}
            {trial.deadline && (
              <div>
                마감: {new Date(trial.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onViewDetail}
          className="ml-4 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          상세 보기
        </button>
      </div>
    </div>
  );
}
