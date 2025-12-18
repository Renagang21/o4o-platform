/**
 * Market Trial Reward Selector Component
 *
 * 보상 유형 선택 UI (필수 선택)
 *
 * @package Phase L-1 - Market Trial
 */

import { RewardType, REWARD_TYPE_LABELS } from './marketTrial.types';

interface MarketTrialRewardSelectorProps {
  availableOptions: RewardType[];
  selectedReward: RewardType | null;
  onSelect: (reward: RewardType) => void;
  cashAmount?: number;
  productDescription?: string;
  disabled?: boolean;
}

export function MarketTrialRewardSelector({
  availableOptions,
  selectedReward,
  onSelect,
  cashAmount,
  productDescription,
  disabled = false,
}: MarketTrialRewardSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-gray-900 mb-2">
        이 Trial의 보상 방식을 선택하세요.
      </div>
      <p className="text-sm text-gray-500 mb-4">
        선택 후에는 변경할 수 없습니다. 신중하게 선택해 주세요.
      </p>

      <div className="space-y-3">
        {/* Cash Option */}
        {availableOptions.includes('cash') && (
          <label
            className={`block p-5 border-2 rounded-xl cursor-pointer transition-all ${
              selectedReward === 'cash'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="rewardType"
                value="cash"
                checked={selectedReward === 'cash'}
                onChange={() => onSelect('cash')}
                disabled={disabled}
                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
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
                  <span className="font-semibold text-gray-900">
                    {REWARD_TYPE_LABELS.cash}으로 받기
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  {cashAmount
                    ? `${cashAmount.toLocaleString()}원이 정산됩니다.`
                    : 'Trial 완료 후 현금으로 정산받습니다.'}
                </p>
              </div>
            </div>
          </label>
        )}

        {/* Product Option */}
        {availableOptions.includes('product') && (
          <label
            className={`block p-5 border-2 rounded-xl cursor-pointer transition-all ${
              selectedReward === 'product'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="rewardType"
                value="product"
                checked={selectedReward === 'product'}
                onChange={() => onSelect('product')}
                disabled={disabled}
                className="mt-1 w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
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
                  <span className="font-semibold text-gray-900">
                    {REWARD_TYPE_LABELS.product}으로 받기
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  {productDescription ||
                    'Trial 완료 후 제품을 제공받습니다.'}
                </p>
              </div>
            </div>
          </label>
        )}
      </div>

      {/* No selection warning */}
      {!selectedReward && (
        <p className="text-sm text-orange-600 flex items-center gap-1 mt-4">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          보상 방식을 선택해 주세요.
        </p>
      )}
    </div>
  );
}
