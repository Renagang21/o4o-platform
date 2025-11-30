import { FC } from 'react';

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
  const getColorClass = () => {
    if (currentQuantity >= minQuantity) {
      return 'bg-green-500';
    } else if (currentQuantity >= minQuantity * 0.7) {
      return 'bg-blue-500';
    } else {
      return 'bg-gray-400';
    }
  };

  const heightClass = size === 'small' ? 'h-2' : 'h-4';

  return (
    <div className="flex flex-col gap-1">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${getColorClass()} ${heightClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">{currentQuantity}</span>
          <span> / {minQuantity}</span>
          {maxQuantity && <span> (최대 {maxQuantity})</span>}
          <span className="ml-2 text-gray-500">({percentage}%)</span>
        </div>
      )}
    </div>
  );
};

export default GroupbuyQuantityProgressBar;
