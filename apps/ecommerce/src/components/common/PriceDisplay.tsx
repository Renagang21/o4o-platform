import React from 'react';
import { formatCurrency, formatPercentage } from '@o4o/utils/format';
import { cn } from '@o4o/utils';
import { PriceByRole } from '@o4o/types/ecommerce';

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  priceByRole?: PriceByRole;
  userRole?: string;
  showDiscount?: boolean;
  showSavings?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  compareAtPrice,
  priceByRole,
  userRole,
  showDiscount = true,
  showSavings = false,
  size = 'md',
  className
}) => {
  // Get role-based price if available
  const displayPrice = priceByRole && userRole && priceByRole[userRole] 
    ? priceByRole[userRole] 
    : price;

  const discount = compareAtPrice && compareAtPrice > displayPrice
    ? ((compareAtPrice - displayPrice) / compareAtPrice) * 100
    : 0;

  const savings = compareAtPrice && compareAtPrice > displayPrice
    ? compareAtPrice - displayPrice
    : 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const priceSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <div className={cn('flex items-baseline space-x-2', className)}>
      <span className={cn('font-semibold', priceSizeClasses[size])}>
        {formatCurrency(displayPrice)}
      </span>
      
      {compareAtPrice && compareAtPrice > displayPrice && (
        <>
          <span className={cn('text-muted-foreground line-through', sizeClasses[size])}>
            {formatCurrency(compareAtPrice)}
          </span>
          
          {showDiscount && discount > 0 && (
            <span className="text-destructive font-medium">
              -{formatPercentage(discount / 100)}
            </span>
          )}
          
          {showSavings && savings > 0 && (
            <span className="text-green-600 text-sm">
              절약 {formatCurrency(savings)}
            </span>
          )}
        </>
      )}
    </div>
  );
};