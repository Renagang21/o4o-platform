/**
 * Market Trial Detail Page
 *
 * Trial 상세 정보
 *
 * @package Phase L-1 - Market Trial
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  MarketTrial,
  TrialParticipation,
  TRIAL_STATUS_LABELS,
  ROLE_LABELS,
  REWARD_TYPE_LABELS,
} from './marketTrial.types';

export function MarketTrialDetailPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const navigate = useNavigate();

  const [trial, setTrial] = useState<MarketTrial | null>(null);
  const [participation, setParticipation] = useState<TrialParticipation | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const user = authClient.getCurrentUser();

  useEffect(() => {
    if (trialId) {
      loadTrialDetail();
    }
  }, [trialId]);

  const loadTrialDetail = async () => {
    try {
      const [trialRes, participationRes] = await Promise.all([
        authClient.api.get<{ data: MarketTrial }>(
          `/api/market-trial/${trialId}`
        ),
        authClient.api
          .get<{ data: TrialParticipation | null }>(
            `/api/market-trial/${trialId}/participation`
          )
          .catch(() => ({ data: null })),
      ]);

      setTrial(trialRes.data || null);
      setParticipation(participationRes.data || null);
    } catch (error) {
      console.error('Failed to load trial:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const isOpen = trial.status === 'open';
  const hasSpots =
    !trial.maxParticipants ||
    (trial.currentParticipants || 0) < trial.maxParticipants;
  const canJoin = isOpen && hasSpots && !participation;
  const alreadyJoined = !!participation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/market-trial')}
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
            Trial 목록
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          {/* Status */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                isOpen
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {TRIAL_STATUS_LABELS[trial.status]}
            </span>
            {alreadyJoined && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                참여 완료
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {trial.title}
          </h1>

          {/* Supplier */}
          <p className="text-gray-500 mb-6">
            제공: {trial.supplierName || 'Supplier'}
          </p>

          {/* Description */}
          <div className="prose max-w-none mb-8">
            <p className="text-gray-700 whitespace-pre-wrap">
              {trial.description}
            </p>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b">
            {/* Eligible Roles */}
            <div>
              <div className="text-sm text-gray-500 mb-1">대상</div>
              <div className="flex flex-wrap gap-1">
                {trial.eligibleRoles.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-1 bg-gray-100 rounded text-sm font-medium"
                  >
                    {ROLE_LABELS[role]}
                  </span>
                ))}
              </div>
            </div>

            {/* Participants */}
            {trial.maxParticipants && (
              <div>
                <div className="text-sm text-gray-500 mb-1">모집 현황</div>
                <div className="font-medium">
                  {trial.currentParticipants || 0} / {trial.maxParticipants}명
                </div>
              </div>
            )}

            {/* Deadline */}
            {trial.deadline && (
              <div>
                <div className="text-sm text-gray-500 mb-1">마감일</div>
                <div className="font-medium">
                  {new Date(trial.deadline).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Created */}
            <div>
              <div className="text-sm text-gray-500 mb-1">등록일</div>
              <div className="font-medium">
                {new Date(trial.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Reward Options */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">보상 안내</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {trial.rewardOptions.includes('cash') && (
              <div className="p-6 border-2 border-purple-200 rounded-xl bg-purple-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-900">
                    현금 정산
                  </h3>
                </div>
                <p className="text-purple-700">
                  {trial.cashRewardAmount
                    ? `${trial.cashRewardAmount.toLocaleString()}원`
                    : '금액은 참여 후 안내됩니다.'}
                </p>
              </div>
            )}

            {trial.rewardOptions.includes('product') && (
              <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-900">
                    제품 제공
                  </h3>
                </div>
                <p className="text-green-700">
                  {trial.productRewardDescription ||
                    '제품 정보는 참여 후 안내됩니다.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Already Joined Status */}
        {alreadyJoined && participation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">참여 완료</h3>
            <div className="text-blue-700 space-y-1">
              <p>
                선택한 보상:{' '}
                <span className="font-medium">
                  {REWARD_TYPE_LABELS[participation.rewardType]}
                </span>
              </p>
              <p>
                보상 상태:{' '}
                <span className="font-medium">
                  {participation.rewardStatus === 'pending'
                    ? '지급 대기'
                    : '지급 완료'}
                </span>
              </p>
              <p>
                참여일:{' '}
                {new Date(participation.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-4">
          {canJoin ? (
            <button
              onClick={() => navigate(`/market-trial/${trialId}/join`)}
              className="flex-1 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              이 Trial에 참여하기
            </button>
          ) : !isOpen ? (
            <div className="flex-1 py-4 bg-gray-200 text-gray-500 font-semibold rounded-xl text-center">
              모집이 마감되었습니다
            </div>
          ) : !hasSpots ? (
            <div className="flex-1 py-4 bg-gray-200 text-gray-500 font-semibold rounded-xl text-center">
              모집 인원이 마감되었습니다
            </div>
          ) : null}

          <button
            onClick={() => navigate('/market-trial')}
            className="px-8 py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            목록으로
          </button>
        </div>
      </div>
    </div>
  );
}
