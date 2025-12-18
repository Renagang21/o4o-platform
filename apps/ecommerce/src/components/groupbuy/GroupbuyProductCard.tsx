/**
 * Groupbuy Product Card Component
 * Phase 3: UI Integration
 *
 * Displays product info for campaign detail view
 * Note: Price is display only - no calculations per Work Order rules
 */

import { Card, Button } from '@o4o/ui';
import { Calendar, Package, CheckCircle } from 'lucide-react';
import type { CampaignProduct } from '@/lib/api/groupbuy';
import { GroupbuyStatusBadge } from './GroupbuyStatusBadge';
import { ProgressBar } from './ProgressBar';
import { useRemainingTime } from '@/hooks/useGroupbuy';

interface GroupbuyProductCardProps {
  product: CampaignProduct;
  onParticipate?: (product: CampaignProduct) => void;
  showActions?: boolean;
}

export function GroupbuyProductCard({
  product,
  onParticipate,
  showActions = true
}: GroupbuyProductCardProps) {
  const { label: remainingLabel, isExpired } = useRemainingTime(product.endDate);
  const isAvailable = product.status === 'active' && !isExpired;
  const isThresholdMet = product.confirmedQuantity >= product.minTotalQuantity;

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {product.productImage ? (
            <img
              src={product.productImage}
              alt={product.productName || '상품'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium line-clamp-1">
                {product.productName || `상품 ${product.productId}`}
              </h4>
              {product.supplierName && (
                <p className="text-sm text-muted-foreground">
                  {product.supplierName}
                </p>
              )}
            </div>
            <GroupbuyStatusBadge status={product.status} type="product" />
          </div>

          {/* Progress */}
          <div className="mb-3">
            <ProgressBar
              current={product.confirmedQuantity}
              target={product.minTotalQuantity}
              size="sm"
            />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className={isExpired ? 'text-red-500' : ''}>
                {remainingLabel}
              </span>
            </div>
            {isThresholdMet && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>목표 달성</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <Button
            size="sm"
            disabled={!isAvailable}
            onClick={() => onParticipate?.(product)}
          >
            {isAvailable ? '참여하기' : isExpired ? '마감됨' : '참여불가'}
          </Button>
        </div>
      )}
    </Card>
  );
}
