import React from 'react';
import { Card, Button } from '@o4o/ui';
import { formatCurrency } from '@o4o/utils/format';
import { OrderSummary } from '@o4o/types/ecommerce';
import { cn } from '@o4o/utils';
import { ShoppingBag, Truck, Tag } from 'lucide-react';

interface CartSummaryProps {
  summary: OrderSummary;
  userRole?: string;
  userGrade?: string;
  onCheckout: () => void;
  loading?: boolean;
  className?: string;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  summary,
  userRole,
  userGrade,
  onCheckout,
  loading = false,
  className
}) => {
  const isRetailer = userRole === 'retailer';
  const isVIP = userGrade === 'vip';
  
  // Get discount rate based on retailer grade
  const getDiscountRate = () => {
    if (!isRetailer) return 0;
    switch (userGrade) {
      case 'gold': return 0;
      case 'premium': return 3;
      case 'vip': return 5;
      default: return 0;
    }
  };

  const discountRate = getDiscountRate();
  const hasDiscount = discountRate > 0;

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      <h3 className="font-semibold text-lg">주문 요약</h3>

      {/* Grade Badge for Retailers */}
      {isRetailer && userGrade && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <Tag className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              {userGrade.toUpperCase()} 회원 혜택
            </p>
            <p className="text-xs text-muted-foreground">
              {discountRate > 0 ? `${discountRate}% 추가 할인` : '기본 가격 적용'}
              {isVIP && ' + 무료배송'}
            </p>
          </div>
        </div>
      )}

      {/* Summary Items */}
      <div className="space-y-2 py-4 border-y">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">상품 금액</span>
          <span>{formatCurrency(summary.subtotal)}</span>
        </div>
        
        {hasDiscount && (
          <div className="flex justify-between text-sm text-green-600">
            <span>등급 할인 ({discountRate}%)</span>
            <span>-{formatCurrency(summary.discount || 0)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Truck className="h-4 w-4" />
            배송비
          </span>
          <span>
            {summary.shipping === 0 ? (
              <span className="text-green-600">무료</span>
            ) : (
              formatCurrency(summary.shipping)
            )}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">부가세</span>
          <span>{formatCurrency(summary.tax)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between font-semibold text-lg">
        <span>총 결제금액</span>
        <span className="text-primary">{formatCurrency(summary.total)}</span>
      </div>

      {/* Shipping Policy */}
      <div className="text-xs text-muted-foreground">
        {isVIP ? (
          <p>✓ VIP 회원 무료배송 적용</p>
        ) : (
          <p>✓ 5만원 이상 구매시 무료배송</p>
        )}
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        disabled={loading || summary.itemCount === 0}
        className="w-full"
        size="lg"
      >
        <ShoppingBag className="h-5 w-5 mr-2" />
        {loading ? '처리 중...' : `결제하기 (${summary.itemCount}개)`}
      </Button>
    </Card>
  );
};