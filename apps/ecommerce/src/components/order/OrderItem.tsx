import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button, Badge } from '@o4o/ui';
import { Order } from '@o4o/types';
import { formatCurrency, formatDate } from '@o4o/utils';
import { cn } from '@o4o/utils';

interface OrderItemProps {
  order: Order;
  onCancel?: (orderId: string) => void;
  onTrack?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  onReview?: (orderId: string) => void;
  className?: string;
}

const orderStatusConfig = {
  pending: { label: '주문 대기', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: '주문 확인', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: '처리 중', color: 'bg-orange-100 text-orange-800', icon: Package },
  shipped: { label: '배송 중', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: '배송 완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: '주문 취소', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: '반품', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
  refunded: { label: '환불 완료', color: 'bg-gray-100 text-gray-800', icon: RefreshCw }
};

export const OrderItem: FC<OrderItemProps> = ({
  order,
  onCancel,
  onTrack,
  onReorder,
  onReview,
  className
}) => {
  const statusConfig = orderStatusConfig[order.status] || orderStatusConfig.pending;
  const StatusIcon = statusConfig.icon;
  
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canTrack = ['shipped', 'delivered'].includes(order.status);
  const canReview = order.status === 'delivered';
  const canReorder = ['delivered', 'cancelled'].includes(order.status);

  return (
    <div className={cn('border rounded-lg p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/orders/${order.id}`} className="font-medium hover:text-primary">
            주문번호: {order.orderNumber}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.createdAt, 'long')}
          </p>
        </div>
        
        <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
          <StatusIcon className="h-4 w-4" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Order Items Preview */}
      <div className="space-y-2">
        {order.items.slice(0, 2).map((item: any) => (
          <div key={item.id} className="flex items-center gap-3">
            {item.productImage ? (
              <img
                src={item.productImage}
                alt={item.productName}
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(item.unitPrice)} x {item.quantity}개
              </p>
            </div>
          </div>
        ))}
        
        {order.items.length > 2 && (
          <p className="text-sm text-muted-foreground">
            외 {order.items.length - 2}개 상품
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="pt-2 border-t">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            총 {order.items.length}개 상품
          </p>
          <p className="font-semibold">
            {formatCurrency(order.summary.total)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Link to={`/orders/${order.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            주문 상세
          </Button>
        </Link>
        
        {canTrack && onTrack && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTrack(order.id)}
          >
            배송 추적
          </Button>
        )}
        
        {canCancel && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(order.id)}
            className="text-destructive hover:text-destructive"
          >
            주문 취소
          </Button>
        )}
        
        {canReview && onReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(order.id)}
          >
            리뷰 작성
          </Button>
        )}
        
        {canReorder && onReorder && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReorder(order.id)}
          >
            재주문
          </Button>
        )}
      </div>
    </div>
  );
};