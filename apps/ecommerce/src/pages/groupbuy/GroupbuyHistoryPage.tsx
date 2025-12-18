/**
 * Groupbuy History Page (Member View)
 * Phase 3: UI Integration
 *
 * Work Order: WO-GROUPBUY-YAKSA-PHASE3-UI-INTEGRATION
 * Displays member's participation history
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Select } from '@o4o/ui';
import { ArrowLeft, Package, Clock, AlertCircle } from 'lucide-react';
import { useMyGroupbuyOrders, useCancelGroupbuyOrder } from '@/hooks/useGroupbuy';
import { GroupbuyStatusBadge } from '@/components/groupbuy';
import type { GroupbuyOrderStatus } from '@/lib/api/groupbuy';

// TODO: Get from auth context
const MOCK_PHARMACY_ID = 'pharmacy-sample-001';

const statusFilters: { value: GroupbuyOrderStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'confirmed', label: '확정' },
  { value: 'cancelled', label: '취소됨' }
];

export function GroupbuyHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<GroupbuyOrderStatus | ''>('');

  const { data: orders, isLoading, error } = useMyGroupbuyOrders(
    MOCK_PHARMACY_ID,
    { status: statusFilter || undefined }
  );

  const cancelMutation = useCancelGroupbuyOrder();

  const handleCancel = async (orderId: string) => {
    if (!confirm('이 참여를 취소하시겠습니까?')) return;

    try {
      await cancelMutation.mutateAsync(orderId);
      alert('참여가 취소되었습니다.');
    } catch (error) {
      alert('취소 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/groupbuy">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">참여 이력</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/groupbuy">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">참여 이력</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/groupbuy">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">참여 이력</h1>
          <p className="text-muted-foreground">내가 참여한 공동구매 목록</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value as GroupbuyOrderStatus | '')
          }
          className="w-32"
        >
          {statusFilters.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          총 {orders?.length || 0}건
        </span>
      </div>

      {/* Orders List */}
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Product Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {order.productName || `상품 ${order.campaignProductId}`}
                      </div>
                      {order.campaignTitle && (
                        <div className="text-sm text-muted-foreground">
                          {order.campaignTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="text-sm text-muted-foreground mb-2">
                    수량: {order.quantity.toLocaleString()}개
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <GroupbuyStatusBadge status={order.status} type="order" />

                  {order.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelMutation.isPending}
                    >
                      취소
                    </Button>
                  )}

                  {order.dropshippingOrderId && (
                    <Link to={`/orders/${order.dropshippingOrderId}`}>
                      <Button variant="link" size="sm">
                        주문 상세
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-lg mb-2">참여 이력이 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            공동구매에 참여하면 여기에 이력이 표시됩니다.
          </p>
          <Link to="/groupbuy">
            <Button>공동구매 둘러보기</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
