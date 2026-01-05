/**
 * PharmacyOrders - 약국 주문 관리
 * Mock 데이터 제거, API 연동 구조
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronDown,
  Loader2,
  AlertCircle,
  Inbox,
  Monitor,
  Tablet,
  Globe,
} from 'lucide-react';
import { pharmacyApi, type PharmacyOrder } from '@/api/pharmacy';

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  pending: { icon: Clock, label: '접수 대기', color: 'yellow' },
  received: { icon: Inbox, label: '약국 접수', color: 'cyan' },
  confirmed: { icon: CheckCircle, label: '처리 중', color: 'blue' },
  shipped: { icon: Truck, label: '배송 중', color: 'purple' },
  delivered: { icon: CheckCircle2, label: '배송 완료', color: 'green' },
  cancelled: { icon: XCircle, label: '취소됨', color: 'red' },
};

const channelConfig: Record<string, { icon: typeof Globe; label: string }> = {
  web: { icon: Globe, label: '웹' },
  kiosk: { icon: Monitor, label: '키오스크' },
  tablet: { icon: Tablet, label: '태블릿' },
};

const statusTabs = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '접수대기' },
  { key: 'received', label: '접수완료' },
  { key: 'confirmed', label: '처리중' },
  { key: 'shipped', label: '배송중' },
  { key: 'delivered', label: '완료' },
];

export default function PharmacyOrders() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 주문 로드
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await pharmacyApi.getOrders({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: debouncedSearch || undefined,
        pageSize: 20,
      });

      if (res.success && res.data) {
        setOrders(res.data.items);
        setTotalCount(res.data.total);
      } else {
        throw new Error('주문을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Orders load error:', err);
      setError(err.message || '주문을 불러오는데 실패했습니다.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 주문 접수 처리 (RECEIVED)
  const handleReceiveOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await pharmacyApi.receiveOrder(orderId);
      loadOrders();
    } catch (err: any) {
      alert(err.message || '접수 처리에 실패했습니다.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  ) => {
    setUpdatingOrderId(orderId);
    try {
      await pharmacyApi.updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (err: any) {
      alert(err.message || '상태 변경에 실패했습니다.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
        <p className="text-slate-500 text-sm">
          {loading ? '불러오는 중...' : `총 ${totalCount}건의 주문`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주문번호 또는 고객명으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === tab.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const StatusIcon = status.icon;
            const isExpanded = expandedOrder === order.id;
            const isUpdating = updatingOrderId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Order Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-${status.color}-100 flex items-center justify-center`}
                    >
                      <StatusIcon className={`w-5 h-5 text-${status.color}-600`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{order.orderNumber}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-700`}
                        >
                          {status.label}
                        </span>
                        {/* 주문 채널 표시 */}
                        {(order as any).orderChannel && channelConfig[(order as any).orderChannel] && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                            {(() => {
                              const ChannelIcon = channelConfig[(order as any).orderChannel].icon;
                              return <ChannelIcon className="w-3 h-3" />;
                            })()}
                            {channelConfig[(order as any).orderChannel].label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {order.customerName} · {order.items.length}개 상품 ·{' '}
                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-slate-800">
                      {order.totalAmount.toLocaleString()}원
                    </p>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Order Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-slate-50">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">주문 상품</h4>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-white rounded-lg"
                            >
                              <span className="text-sm text-slate-700">{item.productName}</span>
                              <span className="text-sm text-slate-500">
                                {item.quantity}개 × {item.unitPrice.toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">배송 정보</h4>
                        <div className="p-3 bg-white rounded-lg space-y-1">
                          <p className="text-sm text-slate-700">
                            {order.shippingAddress.recipient}
                          </p>
                          <p className="text-sm text-slate-500">{order.shippingAddress.phone}</p>
                          <p className="text-sm text-slate-500">
                            {order.shippingAddress.address1} {order.shippingAddress.address2}
                          </p>
                          {order.shippingAddress.memo && (
                            <p className="text-sm text-slate-400">
                              배송메모: {order.shippingAddress.memo}
                            </p>
                          )}
                          {order.trackingNumber && (
                            <p className="text-sm text-primary-600">
                              운송장: {order.trackingNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {/* 접수 대기 → 접수 처리 */}
                    {order.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleReceiveOrder(order.id)}
                          disabled={isUpdating}
                          className="flex-1 py-2 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? '처리 중...' : '주문 접수'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                          disabled={isUpdating}
                          className="py-2 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    )}
                    {/* 약국 접수 → 처리 시작 */}
                    {order.status === 'received' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                          disabled={isUpdating}
                          className="flex-1 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? '처리 중...' : '처리 시작'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                          disabled={isUpdating}
                          className="py-2 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                        disabled={isUpdating}
                        className="w-full mt-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? '처리 중...' : '배송 시작'}
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        disabled={isUpdating}
                        className="w-full mt-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? '처리 중...' : '배송 완료 처리'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">주문이 없습니다</h3>
          <p className="text-slate-500">
            {debouncedSearch || selectedStatus !== 'all'
              ? '검색 조건에 맞는 주문이 없습니다.'
              : '아직 주문이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
