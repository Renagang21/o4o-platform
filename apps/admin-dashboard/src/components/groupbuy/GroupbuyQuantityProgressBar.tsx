import { FC } from 'react';
import { Progress } from 'antd';

interface GroupbuyQuantityProgressBarProps {
  currentQuantity: number;
  minQuantity: number;
  maxQuantity?: number;
  showText?: boolean;
  size?: 'small' | 'default';
}

export const GroupbuyQuantityProgressBar: FC<GroupbuyQuantityProgressBarProps> = ({
  currentQuantity,
  minQuantity,
  maxQuantity,
  showText = true,
  size = 'default'
}) => {
  // Calculate progress percentage based on min quantity
  const percentage = Math.min(100, Math.round((currentQuantity / minQuantity) * 100));

  // Determine status color
  const getStatus = () => {
    if (currentQuantity >= minQuantity) {
      return 'success';
    } else if (currentQuantity >= minQuantity * 0.7) {
      return 'active';
    } else {
      return 'normal';
    }
  };

  const status = getStatus();

  return (
    <div className="flex flex-col gap-1">
      <Progress
        percent={percentage}
        status={status === 'success' ? 'success' : status === 'active' ? 'active' : 'normal'}
        size={size === 'small' ? 'small' : 'default'}
        showInfo={showText}
      />
      {showText && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">{currentQuantity}</span>
          <span> / {minQuantity}</span>
          {maxQuantity && <span> (최대 {maxQuantity})</span>}
        </div>
      )}
    </div>
  );
};

export default GroupbuyQuantityProgressBar;
