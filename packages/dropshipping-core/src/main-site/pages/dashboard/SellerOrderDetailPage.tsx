/**
 * Seller Order Detail Page
 * Phase 3-7: 판매자 주문 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  DollarSign,
  Truck,
  FileText,
  Check,
  X,
  Clock,
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { sellerOrderAPI } from '@/services/sellerOrderApi';
import {
  SellerOrderDetail,
  SellerOrderStatus,
} from '@/types/seller-order';

export const SellerOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<SellerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shipping info state
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Memo state
  const [memoInternal, setMemoInternal] = useState('');

  // Fetch order detail
  const fetchOrderDetail = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await sellerOrderAPI.fetchSellerOrderDetail(id);
      setOrder(response.data);
      setCourier(response.data.shipping_info?.courier || '');
      setTrackingNumber(response.data.shipping_info?.tracking_number || '');
      setMemoInternal(response.data.memo_internal || '');
    } catch (err) {
      setError('주문을 불러오는데 실패했습니다.');
      console.error('Failed to fetch order detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  // Handle status change
  const handleStatusChange = async (newStatus: SellerOrderStatus) => {
    if (!id || !order) return;

    const confirmMessages: Record<SellerOrderStatus, string> = {
      NEW: '',
      CONFIRMED: '주문을 확인하시겠습니까?',
      IN_PROGRESS: '처리중으로 변경하시겠습니까?',
      SHIPPED: '발송완료 처리하시겠습니까? (택배사와 송장번호를 확인해주세요)',
      COMPLETED: '거래를 완료하시겠습니까?',
      CANCELLED: '주문을 취소하시겠습니까?',
    };

    if (confirmMessages[newStatus] && !confirm(confirmMessages[newStatus])) {
      return;
    }

    try {
      const payload: any = { status: newStatus };

      // If shipping, include shipping info
      if (newStatus === 'SHIPPED') {
        if (!courier || !trackingNumber) {
          alert('택배사와 송장번호를 입력해주세요.');
          return;
        }
        payload.shipping_info = {
          courier,
          tracking_number: trackingNumber,
        };
      }

      await sellerOrderAPI.updateSellerOrderStatus(id, payload);
      alert('주문 상태가 업데이트되었습니다.');
      fetchOrderDetail();
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  // Handle memo save
  const handleSaveMemo = async () => {
    if (!id) return;

    try {
      await sellerOrderAPI.updateSellerOrderMemo(id, {
        memo_internal: memoInternal,
      });
      alert('메모가 저장되었습니다.');
      fetchOrderDetail();
    } catch (err) {
      console.error('Failed to save memo:', err);
      alert('메모 저장에 실패했습니다.');
    }
  };

  // Get status badge
  const getStatusBadge = (status: SellerOrderStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4" />
            신규
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-cyan-100 text-cyan-800">
            <Check className="w-4 h-4" />
            확인됨
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
            <Package className="w-4 h-4" />
            처리중
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">
            <Truck className="w-4 h-4" />
            발송완료
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            <Check className="w-4 h-4" />
            완료
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
            <X className="w-4 h-4" />
            취소됨
          </span>
        );
      default:
        return null;
    }
  };

  // Get available status transitions
  const getAvailableTransitions = (
    currentStatus: SellerOrderStatus
  ): SellerOrderStatus[] => {
    switch (currentStatus) {
      case 'NEW':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_PROGRESS':
        return ['SHIPPED', 'CANCELLED'];
      case 'SHIPPED':
        return ['COMPLETED'];
      case 'COMPLETED':
      case 'CANCELLED':
        return [];
      default:
        return [];
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">로딩 중...</div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error || '주문을 찾을 수 없습니다.'}</div>
        <button
          onClick={() => navigate('/dashboard/seller/orders')}
          className="text-blue-600 hover:underline"
        >
          주문 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(order.status);

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '주문 관리', href: '/dashboard/seller/orders' },
          { label: order.order_number, isCurrent: true },
        ]}
      />

      <PageHeader
        title="주문 상세"
        subtitle={`주문번호 ${order.order_number}`}
        actions={
          <button
            onClick={() => navigate('/dashboard/seller/orders')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        }
      />

      <div className="space-y-6">
        {/* Order Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                주문 정보
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>주문번호: {order.order_number}</p>
                <p>주문일: {formatDate(order.created_at)}</p>
                {order.channel && <p>채널: {order.channel}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="mb-3">{getStatusBadge(order.status)}</div>
              {availableTransitions.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {availableTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {status === 'CONFIRMED' && '주문 확인'}
                      {status === 'IN_PROGRESS' && '처리중으로 변경'}
                      {status === 'SHIPPED' && '발송완료'}
                      {status === 'COMPLETED' && '거래 완료'}
                      {status === 'CANCELLED' && '주문 취소'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {order.memo_from_buyer && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                고객 요청사항
              </p>
              <p className="text-sm text-yellow-800">{order.memo_from_buyer}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              고객 정보
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">이름:</span>
                <span className="font-medium text-gray-900">
                  {order.buyer.name}
                </span>
              </div>
              {order.buyer.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">연락처:</span>
                  <span className="font-medium text-gray-900">
                    {order.buyer.phone}
                  </span>
                </div>
              )}
              {order.buyer.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">이메일:</span>
                  <span className="font-medium text-gray-900">
                    {order.buyer.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              배송지 정보
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">수취인:</span>
                <span className="font-medium text-gray-900">
                  {order.shipping_address.receiver_name}
                </span>
              </div>
              {order.shipping_address.postal_code && (
                <div className="flex justify-between">
                  <span className="text-gray-600">우편번호:</span>
                  <span className="font-medium text-gray-900">
                    {order.shipping_address.postal_code}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-600">주소:</span>
                <p className="font-medium text-gray-900 mt-1">
                  {order.shipping_address.address1}
                  {order.shipping_address.address2 &&
                    ` ${order.shipping_address.address2}`}
                </p>
              </div>
              {order.shipping_address.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">연락처:</span>
                  <span className="font-medium text-gray-900">
                    {order.shipping_address.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              주문 상품
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수량
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    단가
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product_name}
                      </div>
                      {item.supplier_name && (
                        <div className="text-xs text-gray-500">
                          공급자: {item.supplier_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.unit_price.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {item.line_total.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품 합계:</span>
                <span className="font-medium text-gray-900">
                  {order.totals.subtotal.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">배송비:</span>
                <span className="font-medium text-gray-900">
                  {order.totals.shipping_fee.toLocaleString()}원
                </span>
              </div>
              {order.totals.discount && order.totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">할인:</span>
                  <span className="font-medium text-red-600">
                    -{order.totals.discount.toLocaleString()}원
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">최종 결제 금액:</span>
                <span className="text-blue-600">
                  {order.totals.total.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            배송 정보
          </h3>

          {order.shipping_info?.shipped_at ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">택배사:</span>
                <span className="font-medium text-gray-900">
                  {order.shipping_info.courier}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">송장번호:</span>
                <span className="font-medium text-gray-900">
                  {order.shipping_info.tracking_number}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">발송일:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(order.shipping_info.shipped_at)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  택배사
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  disabled={
                    order.status === 'COMPLETED' ||
                    order.status === 'CANCELLED'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">택배사 선택</option>
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="한진택배">한진택배</option>
                  <option value="로젠택배">로젠택배</option>
                  <option value="우체국택배">우체국택배</option>
                  <option value="롯데택배">롯데택배</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  송장번호
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  disabled={
                    order.status === 'COMPLETED' ||
                    order.status === 'CANCELLED'
                  }
                  placeholder="송장번호를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              {order.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleStatusChange('SHIPPED')}
                  disabled={!courier || !trackingNumber}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  발송완료 처리
                </button>
              )}
            </div>
          )}
        </div>

        {/* Internal Memo */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            내부 메모
          </h3>
          <div className="space-y-3">
            <textarea
              value={memoInternal}
              onChange={(e) => setMemoInternal(e.target.value)}
              rows={4}
              placeholder="내부 메모를 입력하세요 (고객에게 보이지 않습니다)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveMemo}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              메모 저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerOrderDetailPage;
