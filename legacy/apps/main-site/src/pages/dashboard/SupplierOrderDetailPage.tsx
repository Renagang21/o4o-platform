/**
 * Supplier Order Detail Page  
 * Page for viewing and managing order details
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Truck,
  Package,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  XCircle,
} from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { supplierOrderAPI } from '../../services/supplierOrderApi';
import {
  SupplierOrderDetail,
  SupplierOrderStatus,
  UpdateOrderStatusRequest,
} from '../../types/supplier-order';

export const SupplierOrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<SupplierOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shipping form state
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch order detail
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!id) {
        setError('주문 ID가 없습니다.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await supplierOrderAPI.fetchOrderDetail(id);
        setOrder(response.data);
        if (response.data.courier) setCourier(response.data.courier);
        if (response.data.tracking_number)
          setTrackingNumber(response.data.tracking_number);
      } catch (err) {
        console.error('Failed to fetch order detail:', err);
        setError('주문 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id]);

  // Handle status update
  const handleStatusUpdate = async (
    newStatus: SupplierOrderStatus,
    requiresShipping = false
  ) => {
    if (!id || !order) return;

    if (requiresShipping && (!courier || !trackingNumber)) {
      alert('택배사와 송장번호를 입력해주세요.');
      return;
    }

    const confirmed = confirm(
      `주문 상태를 "${getStatusLabel(newStatus)}"로 변경하시겠습니까?`
    );
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const payload: UpdateOrderStatusRequest = {
        order_status: newStatus,
      };

      if (requiresShipping) {
        payload.courier = courier;
        payload.tracking_number = trackingNumber;
      }

      const response = await supplierOrderAPI.updateOrderStatus(id, payload);

      setOrder({
        ...order,
        order_status: response.data.order_status,
        courier: response.data.courier,
        tracking_number: response.data.tracking_number,
        shipped_at: response.data.shipped_at,
        updated_at: new Date().toISOString(),
      });

      alert(response.message || '상태가 변경되었습니다.');
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: SupplierOrderStatus) => {
    switch (status) {
      case SupplierOrderStatus.NEW:
        return 'bg-blue-100 text-blue-800';
      case SupplierOrderStatus.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case SupplierOrderStatus.SHIPPED:
        return 'bg-green-100 text-green-800';
      case SupplierOrderStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case SupplierOrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: SupplierOrderStatus) => {
    switch (status) {
      case SupplierOrderStatus.NEW:
        return '신규';
      case SupplierOrderStatus.PROCESSING:
        return '준비중';
      case SupplierOrderStatus.SHIPPED:
        return '발송완료';
      case SupplierOrderStatus.COMPLETED:
        return '완료';
      case SupplierOrderStatus.CANCELLED:
        return '취소';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: '공급자 대시보드', href: '/dashboard/supplier' },
            { label: '주문 관리', href: '/dashboard/supplier/orders' },
            { label: '주문 상세', isCurrent: true },
          ]}
        />
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: '공급자 대시보드', href: '/dashboard/supplier' },
            { label: '주문 관리', href: '/dashboard/supplier/orders' },
            { label: '주문 상세', isCurrent: true },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || '주문을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/dashboard/supplier/orders')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            주문 목록으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '주문 관리', href: '/dashboard/supplier/orders' },
          { label: order.order_number, isCurrent: true },
        ]}
      />

      <PageHeader
        title={`주문 상세 ${order.order_number}`}
        subtitle={`${order.buyer_name} · ${formatDate(order.order_date)}`}
        actions={
          <button
            onClick={() => navigate('/dashboard/supplier/orders')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">주문 정보</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.order_status)}`}>
                {getStatusLabel(order.order_status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">주문번호:</span>
                <span className="ml-2 font-medium text-gray-900">{order.order_number}</span>
              </div>
              <div>
                <span className="text-gray-500">주문일:</span>
                <span className="ml-2 text-gray-900">{formatDate(order.order_date)}</span>
              </div>
              {order.channel && (
                <div>
                  <span className="text-gray-500">채널:</span>
                  <span className="ml-2 text-gray-900">{order.channel}</span>
                </div>
              )}
              {order.note && (
                <div className="col-span-2">
                  <span className="text-gray-500">메모:</span>
                  <p className="mt-1 text-gray-900">{order.note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">고객 / 수취인 정보</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">이름:</span>
                <span className="font-medium text-gray-900">{order.buyer_name}</span>
              </div>
              {order.buyer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">연락처:</span>
                  <span className="text-gray-900">{order.buyer_phone}</span>
                </div>
              )}
              {order.buyer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">이메일:</span>
                  <span className="text-gray-900">{order.buyer_email}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500">배송지:</span>
                  <p className="mt-1 text-gray-900">
                    [{order.shipping_address.postal_code}] {order.shipping_address.address1}
                    {order.shipping_address.address2 && <>, {order.shipping_address.address2}</>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">상품 목록</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">옵션</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">공급가</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">합계</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.thumbnail_url && (
                            <img src={item.thumbnail_url} alt={item.product_name} className="w-12 h-12 object-cover rounded" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.option_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.supply_price.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{item.line_total.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">총 금액:</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{order.total_amount.toLocaleString()}원</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              배송 정보
            </h3>

            {order.order_status === SupplierOrderStatus.SHIPPED || order.order_status === SupplierOrderStatus.COMPLETED ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">택배사:</span>
                  <span className="ml-2 text-gray-900">{order.courier}</span>
                </div>
                <div>
                  <span className="text-gray-500">송장번호:</span>
                  <span className="ml-2 text-gray-900">{order.tracking_number}</span>
                </div>
                {order.shipped_at && (
                  <div>
                    <span className="text-gray-500">발송일:</span>
                    <span className="ml-2 text-gray-900">{formatDate(order.shipped_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">택배사</label>
                  <select value={courier} onChange={(e) => setCourier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">선택하세요</option>
                    <option value="우체국택배">우체국택배</option>
                    <option value="CJ대한통운">CJ대한통운</option>
                    <option value="로젠택배">로젠택배</option>
                    <option value="한진택배">한진택배</option>
                    <option value="롯데택배">롯데택배</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">송장번호</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="123456789012"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">상태 변경</h3>

            <div className="space-y-2">
              {order.order_status === SupplierOrderStatus.NEW && (
                <button
                  onClick={() => handleStatusUpdate(SupplierOrderStatus.PROCESSING)}
                  disabled={isUpdating}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Package className="w-4 h-4" />
                  준비중으로 변경
                </button>
              )}

              {order.order_status === SupplierOrderStatus.PROCESSING && (
                <button
                  onClick={() => handleStatusUpdate(SupplierOrderStatus.SHIPPED, true)}
                  disabled={isUpdating}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Truck className="w-4 h-4" />
                  발송완료 처리
                </button>
              )}

              {(order.order_status === SupplierOrderStatus.NEW || order.order_status === SupplierOrderStatus.PROCESSING) && (
                <button
                  onClick={() => handleStatusUpdate(SupplierOrderStatus.CANCELLED)}
                  disabled={isUpdating}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  주문 취소
                </button>
              )}

              {(order.order_status === SupplierOrderStatus.SHIPPED ||
                order.order_status === SupplierOrderStatus.COMPLETED ||
                order.order_status === SupplierOrderStatus.CANCELLED) && (
                <div className="text-center text-sm text-gray-500 py-4">
                  {order.order_status === SupplierOrderStatus.COMPLETED && '완료된 주문입니다.'}
                  {order.order_status === SupplierOrderStatus.CANCELLED && '취소된 주문입니다.'}
                  {order.order_status === SupplierOrderStatus.SHIPPED && '발송 완료된 주문입니다.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierOrderDetailPage;
