/**
 * Admin Order Detail
 *
 * Phase N-2: 운영 안정화
 *
 * 운영자용 주문 상세 페이지
 * - 주문 정보 확인
 * - 결제 정보 확인
 * - 환불 처리
 * - 주문 로그 확인
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@o4o/ui';
import { Badge } from '@o4o/ui';
import { Button } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import {
  ArrowLeft,
  Package,
  CreditCard,
  MapPin,
  User,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminOrder,
  getOrderLogs,
  refundOrder,
  type OrderLog,
} from '@/lib/api/admin-orders';

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800">결제완료</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>;
    case 'refunded':
      return <Badge className="bg-red-100 text-red-800">환불완료</Badge>;
    case 'failed':
      return <Badge className="bg-gray-100 text-gray-800">실패</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toLocaleString('ko-KR');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: '주문 생성',
    payment_initiated: '결제 시작',
    payment_success: '결제 성공',
    payment_failed: '결제 실패',
    refund_requested: '환불 요청',
    refunded: '환불 완료',
    cancelled: '주문 취소',
    status_changed: '상태 변경',
  };
  return labels[action] || action;
}

export function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // 주문 상세 조회
  const {
    data: orderData,
    isLoading: orderLoading,
    error: orderError,
  } = useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: () => getAdminOrder(orderId!),
    enabled: !!orderId,
  });

  // 주문 로그 조회
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'order-logs', orderId],
    queryFn: () => getOrderLogs(orderId!),
    enabled: !!orderId,
  });

  // 환불 처리
  const refundMutation = useMutation({
    mutationFn: () =>
      refundOrder(orderId!, { reason: refundReason }),
    onSuccess: () => {
      toast.success('환불이 완료되었습니다.');
      setShowRefundForm(false);
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'order-logs', orderId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || '환불 처리에 실패했습니다.');
    },
  });

  const handleRefund = () => {
    if (!refundReason.trim()) {
      toast.error('환불 사유를 입력해주세요.');
      return;
    }
    if (
      confirm(
        `${formatPrice(orderData?.order.totalAmount || 0)}원을 환불하시겠습니까?`
      )
    ) {
      refundMutation.mutate();
    }
  };

  if (orderLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (orderError || !orderData) {
    return (
      <div className="space-y-6">
        <Link to="/admin/orders">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            주문을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { order, payment } = orderData;
  const canRefund = order.paymentStatus === 'paid';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/orders">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              주문 상세
            </h1>
            <p className="text-sm text-gray-500 font-mono">
              {order.orderNumber}
            </p>
          </div>
        </div>
        {getPaymentStatusBadge(order.paymentStatus)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 주문 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              주문 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">주문 ID</span>
                <p className="font-mono">{order.id}</p>
              </div>
              <div>
                <span className="text-gray-500">주문번호</span>
                <p className="font-mono">{order.orderNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">주문일시</span>
                <p>{formatDate(order.createdAt)}</p>
              </div>
              {order.paidAt && (
                <div>
                  <span className="text-gray-500">결제일시</span>
                  <p>{formatDate(order.paidAt)}</p>
                </div>
              )}
              {order.refundedAt && (
                <div>
                  <span className="text-gray-500">환불일시</span>
                  <p>{formatDate(order.refundedAt)}</p>
                </div>
              )}
              {order.partnerId && (
                <div>
                  <span className="text-gray-500">파트너 코드</span>
                  <p>
                    <Badge variant="outline" className="font-mono">
                      {order.partnerId}
                    </Badge>
                  </p>
                </div>
              )}
            </div>

            {/* 주문 상품 */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">주문 상품</h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                  >
                    <span>{item.productName}</span>
                    <span className="text-gray-600">
                      {item.quantity}개 x {formatPrice(item.unitPrice)}원 ={' '}
                      {formatPrice(item.subtotal)}원
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 금액 정보 */}
            <div className="border-t pt-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품금액</span>
                  <span>{formatPrice(order.subtotal)}원</span>
                </div>
                {order.shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">배송비</span>
                    <span>{formatPrice(order.shippingFee)}원</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>할인</span>
                    <span>-{formatPrice(order.discount)}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>총 결제금액</span>
                  <span className="text-blue-600">
                    {formatPrice(order.totalAmount)}원
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 결제 정보 & 배송 정보 */}
        <div className="space-y-6">
          {/* 결제 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                결제 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payment ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">결제 상태</span>
                    <p>{getPaymentStatusBadge(payment.status)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">결제 금액</span>
                    <p className="font-medium">
                      {formatPrice(payment.amount)}원
                    </p>
                  </div>
                  {payment.method && (
                    <div>
                      <span className="text-gray-500">결제 수단</span>
                      <p>{payment.method}</p>
                    </div>
                  )}
                  {payment.cardCompany && (
                    <div>
                      <span className="text-gray-500">카드사</span>
                      <p>{payment.cardCompany}</p>
                    </div>
                  )}
                  {payment.cardNumber && (
                    <div>
                      <span className="text-gray-500">카드번호</span>
                      <p className="font-mono">{payment.cardNumber}</p>
                    </div>
                  )}
                  {payment.paymentKey && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Payment Key</span>
                      <p className="font-mono text-xs break-all">
                        {payment.paymentKey}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">결제 정보가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  배송 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{order.shippingAddress.recipientName}</span>
                  </div>
                  <div className="text-gray-600">
                    {order.shippingAddress.phone}
                  </div>
                  <div className="text-gray-600">
                    ({order.shippingAddress.zipCode}){' '}
                    {order.shippingAddress.address1}
                    {order.shippingAddress.address2 &&
                      ` ${order.shippingAddress.address2}`}
                  </div>
                  {order.shippingAddress.memo && (
                    <div className="text-gray-500 bg-gray-50 p-2 rounded">
                      배송 메모: {order.shippingAddress.memo}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 환불 처리 */}
          {canRefund && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <RefreshCw className="w-5 h-5" />
                  환불 처리
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showRefundForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        환불 사유 *
                      </label>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm"
                        rows={3}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="환불 사유를 입력해주세요..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleRefund}
                        disabled={refundMutation.isPending}
                      >
                        {refundMutation.isPending
                          ? '처리 중...'
                          : `${formatPrice(order.totalAmount)}원 환불`}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRefundForm(false);
                          setRefundReason('');
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setShowRefundForm(true)}
                  >
                    환불 처리
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 환불 완료 정보 */}
          {order.paymentStatus === 'refunded' && order.refundReason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>환불 사유:</strong> {order.refundReason}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* 주문 로그 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            주문 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log: OrderLog) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">
                      {formatDate(log.createdAt)}
                    </span>
                    <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                    {log.note && (
                      <span className="text-gray-600">{log.note}</span>
                    )}
                  </div>
                  {log.performedBy && (
                    <span className="text-gray-400 text-xs">
                      by {log.performerType}: {log.performedBy}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">로그가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
