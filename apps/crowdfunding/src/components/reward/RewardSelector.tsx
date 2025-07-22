import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { RewardTier } from '@o4o/crowdfunding-types';
import { formatPrice } from '@o4o/utils';

interface RewardSelectorProps {
  rewards: RewardTier[];
  onSelect: (rewardId: string, quantity: number) => void;
  className?: string;
}

export const RewardSelector: React.FC<RewardSelectorProps> = ({
  rewards,
  onSelect,
  className = ''
}) => {
  const [selectedRewards, setSelectedRewards] = useState<{
    [key: string]: number;
  }>({});

  const handleQuantityChange = (rewardId: string, change: number) => {
    const currentQuantity = selectedRewards[rewardId] || 0;
    const reward = rewards.find((r) => r.id === rewardId);
    
    if (!reward) return;

    const maxQuantity = reward.remainingQuantity ?? reward.totalQuantity ?? Infinity;
    const newQuantity = Math.max(
      0,
      Math.min(currentQuantity + change, maxQuantity)
    );

    setSelectedRewards((prev) => ({
      ...prev,
      [rewardId]: newQuantity
    }));

    onSelect(rewardId, newQuantity);
  };

  const isAvailable = (reward: RewardTier) => {
    const remaining = reward.remainingQuantity ?? reward.totalQuantity;
    return remaining === undefined || remaining > 0;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {rewards.map((reward) => {
        const available = isAvailable(reward);
        const quantity = selectedRewards[reward.id] || 0;
        
        return (
          <div
            key={reward.id}
            className={`bg-white rounded-xl shadow-sm p-6 border transition-colors ${
              available
                ? 'border-border-main hover:border-primary'
                : 'border-border-light opacity-75'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-text-main mb-1">
                  {reward.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {reward.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-primary">
                  {formatPrice(reward.price)}
                </div>
                {reward.earlyBirdPrice && reward.earlyBirdPrice < reward.price && (
                  <div className="text-sm text-green-600">
                    얼리버드 {formatPrice(reward.earlyBirdPrice)}
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-text-secondary mb-4">
              <div>배송 예정일: {new Date(reward.estimatedDeliveryDate).toLocaleDateString()}</div>
              {reward.shippingRequired && (
                <div>배송비 별도</div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                {reward.totalQuantity ? (
                  <>남은 수량: {reward.remainingQuantity ?? reward.totalQuantity}개</>
                ) : (
                  <>수량 제한 없음</>
                )}
              </div>
              
              {available && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(reward.id, -1)}
                    disabled={!quantity}
                    className="p-1 text-text-secondary hover:text-text-main disabled:text-text-disabled transition-colors duration-200"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-8 text-center text-text-main font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(reward.id, 1)}
                    disabled={
                      quantity >= (reward.remainingQuantity ?? reward.totalQuantity ?? Infinity) ||
                      quantity >= reward.maxPerBacker
                    }
                    className="p-1 text-text-secondary hover:text-text-main disabled:text-text-disabled transition-colors duration-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {!available && (
              <div className="mt-4 text-center text-sm text-red-500 font-medium">
                품절
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};