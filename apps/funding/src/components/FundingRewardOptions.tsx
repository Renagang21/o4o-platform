import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface RewardOption {
  id: string;
  title: string;
  description: string;
  price: number;
  maxQuantity: number;
  remainingQuantity: number;
}

interface FundingRewardOptionsProps {
  options: RewardOption[];
  onSelect: (optionId: string, quantity: number) => void;
}

const FundingRewardOptions: React.FC<FundingRewardOptionsProps> = ({
  options,
  onSelect
}) => {
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: string]: number;
  }>({});

  const handleQuantityChange = (optionId: string, change: number) => {
    const currentQuantity = selectedOptions[optionId] || 0;
    const option = options.find((opt) => opt.id === optionId);
    
    if (!option) return;

    const newQuantity = Math.max(
      0,
      Math.min(currentQuantity + change, option.remainingQuantity)
    );

    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: newQuantity
    }));

    onSelect(optionId, newQuantity);
  };

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div
          key={option.id}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-text-main mb-1">
                {option.title}
              </h3>
              <p className="text-sm text-text-secondary">
                {option.description}
              </p>
            </div>
            <div className="text-lg font-semibold text-primary">
              {option.price.toLocaleString()}원
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              남은 수량: {option.remainingQuantity}개
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleQuantityChange(option.id, -1)}
                disabled={!selectedOptions[option.id]}
                className="p-1 text-text-secondary hover:text-text-main disabled:text-text-disabled transition-colors duration-200"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center text-text-main">
                {selectedOptions[option.id] || 0}
              </span>
              <button
                onClick={() => handleQuantityChange(option.id, 1)}
                disabled={
                  (selectedOptions[option.id] || 0) >= option.remainingQuantity
                }
                className="p-1 text-text-secondary hover:text-text-main disabled:text-text-disabled transition-colors duration-200"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FundingRewardOptions; 