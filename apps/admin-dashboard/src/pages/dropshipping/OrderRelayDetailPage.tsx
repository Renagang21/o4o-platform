/**
 * Order Relay Detail Page
 *
 * DS-4 Order Relay 상세 및 상태 관리 화면
 *
 * 경로: /admin/dropshipping/order-relays/:id
 *
 * DS-4.3 준수:
 * - 상태 전이 버튼은 화이트리스트 기반 (허용된 전이만 노출)
 * - 상태 변경 시 사유 입력 필수
 * - 서버 에러 메시지 그대로 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  History,
} from 'lucide-react';
import {
  getOrderRelay,
  getOrderRelayLogs,
  updateOrderRelayStatus,
  OrderRelay,
  OrderRelayLog,
  OrderRelayStatus,
  ORDER_RELAY_STATUS_LABELS,
  ORDER_RELAY_STATUS_COLORS,
  getOrderRelayAllowedTransitions,
} from '../../api/dropshipping-admin';

const OrderRelayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orderRelay, setOrderRelay] = useState<OrderRelay | null>(null);
  const [logs, setLogs] = useState<OrderRelayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderRelayStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const fetchOrderRelay = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [orderResponse, logsResponse] = await Promise.all([
        getOrderRelay(id),
        getOrderRelayLogs(id),
      ]);

      if (orderResponse.success) {
        setOrderRelay(orderResponse.data);
      }
      if (logsResponse.success) {
        setLogs(logsResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch order relay:', err);
      setError(err.message || '주문 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderRelay();
  }, [fetchOrderRelay]);

  const handleStatusChange = async () => {
    if (!id || !targetStatus || !statusReason.trim()) return;

    setUpdating(true);
    setUpdateError(null);
    try {
      const response = await updateOrderRelayStatus(id, targetStatus, statusReason.trim());
      if (response.success) {
        setOrderRelay(response.data);
        setShowStatusModal(false);
        setTargetStatus(null);
        setStatusReason('');
        // Refresh logs
        const logsResponse = await getOrderRelayLogs(id);
        if (logsResponse.success) {
          setLogs(logsResponse.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setUpdateError(err.message || '상태 변경에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (status: OrderRelayStatus) => {
    setTargetStatus(status);
    setStatusReason('');
    setUpdateError(null);
    setShowStatusModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderRelay) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error || '주문을 찾을 수 없습니다.'}</p>
        </div>
        <Link to="/admin/dropshipping/order-relays" className="mt-4 inline-block">
          <AGButton variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />}>
            목록으로
          </AGButton>
        </Link>
      </div>
    );
  }

  const allowedTransitions = getOrderRelayAllowedTransitions(orderRelay.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title={`주문 ${orderRelay.orderNumber}`}
        description="Order Relay 상세"
        icon={<Truck className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Link to="/admin/dropshipping/order-relays">
              <AGButton variant="ghost" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />}>
                목록
              </AGButton>
            </Link>
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchOrderRelay}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status & Actions */}
        <AGSection title="상태">
          <AGCard padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">현재 상태:</span>
                <AGTag color={ORDER_RELAY_STATUS_COLORS[orderRelay.status]} size="md">
                  {ORDER_RELAY_STATUS_LABELS[orderRelay.status]}
                </AGTag>
              </div>

              {allowedTransitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((status) => (
                    <AGButton
                      key={status}
                      variant={status === 'cancelled' || status === 'refunded' ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => openStatusModal(status)}
                    >
                      {ORDER_RELAY_STATUS_LABELS[status]}(으)로 변경
                    </AGButton>
                  ))}
                </div>
              )}

              {allowedTransitions.length === 0 && (
                <span className="text-sm text-gray-500">
                  (최종 상태 - 변경 불가)
                </span>
              )}
            </div>
          </AGCard>
        </AGSection>

        {/* Order Details */}
        <AGSection title="주문 정보">
          <AGCard padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">주문 번호</h4>
                <p className="text-gray-900">{orderRelay.orderNumber}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">외부 주문 ID</h4>
                <p className="text-gray-900">{orderRelay.externalOrderId || '-'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">E-commerce 주문 ID</h4>
                <p className="text-gray-900 font-mono text-sm">
                  {orderRelay.ecommerceOrderId || '-'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">리스팅 ID</h4>
                <p className="text-gray-900 font-mono text-sm">{orderRelay.listingId}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">수량</h4>
                <p className="text-gray-900">{orderRelay.quantity}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">단가</h4>
                <p className="text-gray-900">{formatPrice(orderRelay.unitPrice)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">총액</h4>
                <p className="text-gray-900 font-bold text-lg">{formatPrice(orderRelay.totalPrice)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">생성일</h4>
                <p className="text-gray-900">{formatDate(orderRelay.createdAt)}</p>
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Timeline */}
        <AGSection title="상태 타임라인">
          <AGCard padding="lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">생성:</span>
                <span className="text-sm">{formatDate(orderRelay.createdAt)}</span>
              </div>
              {orderRelay.relayedAt && (
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-600">전달:</span>
                  <span className="text-sm">{formatDate(orderRelay.relayedAt)}</span>
                </div>
              )}
              {orderRelay.confirmedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-600">확인:</span>
                  <span className="text-sm">{formatDate(orderRelay.confirmedAt)}</span>
                </div>
              )}
              {orderRelay.shippedAt && (
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-gray-600">배송시작:</span>
                  <span className="text-sm">{formatDate(orderRelay.shippedAt)}</span>
                </div>
              )}
              {orderRelay.deliveredAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-600">배송완료:</span>
                  <span className="text-sm">{formatDate(orderRelay.deliveredAt)}</span>
                </div>
              )}
            </div>
          </AGCard>
        </AGSection>

        {/* Audit Logs */}
        <AGSection title="변경 이력">
          <AGCard padding="lg">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>변경 이력이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{log.action}</span>
                      {log.previousStatus && log.newStatus && (
                        <span className="text-sm text-gray-500">
                          {ORDER_RELAY_STATUS_LABELS[log.previousStatus]} → {ORDER_RELAY_STATUS_LABELS[log.newStatus]}
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-sm text-gray-600 mb-1">사유: {log.reason}</p>
                    )}
                    <div className="text-xs text-gray-400">
                      {log.actorType}:{log.actor} | {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AGCard>
        </AGSection>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && targetStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              상태 변경: {ORDER_RELAY_STATUS_LABELS[targetStatus]}
            </h3>

            {updateError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">{updateError}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                변경 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="상태 변경 사유를 입력하세요 (필수)"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <AGButton
                variant="ghost"
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
              >
                취소
              </AGButton>
              <AGButton
                variant={targetStatus === 'cancelled' || targetStatus === 'refunded' ? 'danger' : 'primary'}
                onClick={handleStatusChange}
                disabled={!statusReason.trim() || updating}
              >
                {updating ? '처리중...' : '변경'}
              </AGButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderRelayDetailPage;
