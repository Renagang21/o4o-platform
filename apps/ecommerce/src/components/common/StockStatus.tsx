import React from 'react';
import { cn } from '@o4o/utils';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface StockStatusProps {
  stockQuantity: number;
  lowStockThreshold?: number;
  manageStock?: boolean;
  showIcon?: boolean;
  showQuantity?: boolean;
  className?: string;
}

export const StockStatus: React.FC<StockStatusProps> = ({
  stockQuantity,
  lowStockThreshold = 5,
  manageStock = true,
  showIcon = true,
  showQuantity = false,
  className
}) => {
  if (!manageStock) {
    return (
      <div className={cn('flex items-center space-x-1 text-blue-600', className)}>
        {showIcon && <CheckCircle className="w-4 h-4" />}
        <span className="text-sm">재고 관리 안함</span>
      </div>
    );
  }

  const getStatus = () => {
    if (stockQuantity === 0) {
      return {
        label: '품절',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle
      };
    }
    if (stockQuantity <= lowStockThreshold) {
      return {
        label: '재고 부족',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: AlertCircle
      };
    }
    return {
      label: '재고 있음',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm',
        status.bgColor,
        status.borderColor,
        'border',
        className
      )}
    >
      {showIcon && <Icon className={cn('w-4 h-4', status.color)} />}
      <span className={status.color}>
        {status.label}
        {showQuantity && stockQuantity > 0 && ` (${stockQuantity}개)`}
      </span>
    </div>
  );
};