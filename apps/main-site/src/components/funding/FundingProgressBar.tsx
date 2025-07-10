import React from 'react';

interface FundingProgressBarProps {
  currentAmount: number;
  targetAmount: number;
  backerCount: number;
  daysLeft: number;
}

const FundingProgressBar: React.FC<FundingProgressBarProps> = ({
  currentAmount,
  targetAmount,
  backerCount,
  daysLeft
}) => {
  const progress = Math.min((currentAmount / targetAmount) * 100, 100);
  const formattedCurrentAmount = currentAmount.toLocaleString();
  const formattedTargetAmount = targetAmount.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-2xl font-bold text-text-main">
            {formattedCurrentAmount}원
          </span>
          <span className="text-sm text-text-secondary ml-2">
            목표 {formattedTargetAmount}원
          </span>
        </div>
        <div className="text-lg font-semibold text-primary">
          {progress.toFixed(1)}%
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-text-secondary">
        <div>
          <span className="font-medium">{backerCount.toLocaleString()}</span>명의
          서포터
        </div>
        <div>
          <span className="font-medium">{daysLeft}</span>일 남음
        </div>
      </div>
    </div>
  );
};

export default FundingProgressBar; 