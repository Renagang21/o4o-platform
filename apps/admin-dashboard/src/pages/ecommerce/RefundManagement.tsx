import { useState, FC } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Search, Filter, Eye, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

type RefundStatus = 'requested' | 'processing' | 'approved' | 'completed' | 'rejected' | 'failed';

interface RefundRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentKey: string;
  requestedAmount: number;
  approvedAmount?: number;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  adminNote: string;
  tossRefundKey?: string;
  receiptUrl?: string;
  items: RefundItem[];
  cancelReason?: string;
  processingFee?: number;
}

interface RefundItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  refundQuantity: number;
  refundAmount: number;
  reason: string;
}

interface RefundProcessData {
  refundId: string;
  action: 'approve' | 'reject';
  approvedAmount?: number;
  adminNote: string;
  notifyCustomer: boolean;
}

const RefundManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [processForm, setProcessForm] = useState<RefundProcessData>({
    refundId: '',
    action: 'approve',
    approvedAmount: 0,
    adminNote: '',
    notifyCustomer: true
  });

  // Fetch refund requests
  const { data: refundsData, isLoading } = useQuery({
    queryKey: ['refund-requests', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await authClient.api.get(`/v1/payments/refunds?${params.toString()}`);
      return response.data;
    }
  });
  const refunds = refundsData?.data || [];

  // Fetch refund statistics
  const { data: statsData } = useQuery({
    queryKey: ['refund-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/payments/refunds/stats');
      return response.data;
    }
  });
  const stats = statsData?.data || {};

  // Process refund mutation
  const processRefundMutation = useMutation({
    mutationFn: async (data: RefundProcessData) => {
      const response = await authClient.api.post(`/v1/payments/refunds/${data.refundId}/process`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('환불 처리가 완료되었습니다');
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
      setIsProcessDialogOpen(false);
      setProcessForm({
        refundId: '',
        action: 'approve',
        approvedAmount: 0,
        adminNote: '',
        notifyCustomer: true
      });
    }
  });

  // Retry failed refund mutation
  const retryRefundMutation = useMutation({
    mutationFn: async (refundId: string) => {
      const response = await authClient.api.post(`/v1/payments/refunds/${refundId}/retry`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('환불 재시도가 시작되었습니다');
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
    }
  });

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case 'requested':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">요청됨</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">처리중</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">승인됨</Badge>;
      case 'completed':
        return <Badge>완료</Badge>;
      case 'rejected':
        return <Badge variant="secondary">거부됨</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: RefundStatus) => {
    switch (status) {
      case 'requested':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const handleOpenProcess = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setProcessForm({
      refundId: refund.id,
      action: 'approve',
      approvedAmount: refund.requestedAmount,
      adminNote: '',
      notifyCustomer: true
    });
    setIsProcessDialogOpen(true);
  };

  const handleOpenDetail = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setIsDetailDialogOpen(true);
  };

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (processForm.action === 'approve' && (!processForm.approvedAmount || processForm.approvedAmount <= 0)) {
      toast.error('승인 금액을 입력하세요');
      return;
    }
    if (!processForm.adminNote.trim()) {
      toast.error('처리 메모를 입력하세요');
      return;
    }
    processRefundMutation.mutate(processForm);
  };

  const canProcess = (status: RefundStatus) => {
    return ['requested', 'processing'].includes(status);
  };

  const canRetry = (status: RefundStatus) => {
    return status === 'failed';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">환불 관리</h1>
          <p className="text-modern-text-secondary mt-1">토스페이먼츠 환불 요청 처리 및 관리</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              대기 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.requested || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              처리 대기
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              처리 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.processing || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              토스 처리 중
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed || 0}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              이번 달
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary">
              총 환불 금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              ₩{(stats.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-modern-text-tertiary mt-1">
              이번 달
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <Input
              type="text"
              placeholder="주문번호, 고객명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="requested">요청됨</option>
            <option value="processing">처리중</option>
            <option value="approved">승인됨</option>
            <option value="completed">완료</option>
            <option value="rejected">거부됨</option>
            <option value="failed">실패</option>
          </select>
        </div>
      </div>

      {/* Refunds Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    주문 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    고객
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    환불 금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    요청일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-modern-text-secondary">
                      환불 요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  refunds.map((refund: RefundRequest) => (
                    <tr key={refund.id} className="hover:bg-modern-bg-hover">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {refund.orderNumber}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {refund.items.length}개 상품
                          </div>
                          <div className="text-xs text-modern-text-tertiary">
                            {refund.reason}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {refund.customerName}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {refund.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            ₩{refund.requestedAmount.toLocaleString()}
                          </div>
                          {refund.approvedAmount && refund.approvedAmount !== refund.requestedAmount && (
                            <div className="text-sm text-modern-text-secondary">
                              승인: ₩{refund.approvedAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(refund.status)}
                          {getStatusBadge(refund.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-modern-text-secondary">
                          {new Date(refund.requestedAt).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(refund)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canProcess(refund.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenProcess(refund)}
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          {canRetry(refund.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryRefundMutation.mutate(refund.id)}
                              disabled={retryRefundMutation.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Process Refund Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleProcessSubmit}>
            <DialogHeader>
              <DialogTitle>환불 처리</DialogTitle>
              <DialogDescription>
                {selectedRefund?.orderNumber} - {selectedRefund?.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>요청 금액: ₩{selectedRefund?.requestedAmount?.toLocaleString()}</Label>
              </div>

              <div>
                <Label htmlFor="action">처리 결과 *</Label>
                <select
                  id="action"
                  value={processForm.action}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, action: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
                  required
                >
                  <option value="approve">승인</option>
                  <option value="reject">거부</option>
                </select>
              </div>

              {processForm.action === 'approve' && (
                <div>
                  <Label htmlFor="approvedAmount">승인 금액 *</Label>
                  <Input
                    id="approvedAmount"
                    type="number"
                    min="0"
                    max={selectedRefund?.requestedAmount}
                    value={processForm.approvedAmount}
                    onChange={(e) => setProcessForm(prev => ({ ...prev, approvedAmount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                  <div className="text-xs text-modern-text-tertiary mt-1">
                    최대 승인 가능: ₩{selectedRefund?.requestedAmount?.toLocaleString()}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="adminNote">처리 메모 *</Label>
                <Textarea
                  id="adminNote"
                  value={processForm.adminNote}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="환불 처리 사유나 메모를 입력하세요..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyCustomer"
                  checked={processForm.notifyCustomer}
                  onChange={(e) => setProcessForm(prev => ({ ...prev, notifyCustomer: e.target.checked }))}
                  className="mr-2"
                />
                <Label htmlFor="notifyCustomer">고객에게 알림 발송</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={processRefundMutation.isPending}>
                {processForm.action === 'approve' ? '승인' : '거부'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>환불 요청 상세</DialogTitle>
            <DialogDescription>
              {selectedRefund?.orderNumber} - {selectedRefund?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-6 py-4">
              {/* Refund Items */}
              <div>
                <h3 className="text-lg font-medium mb-3">환불 상품</h3>
                <div className="space-y-2">
                  {selectedRefund.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-3 bg-modern-bg-secondary rounded-lg">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-modern-text-secondary">
                          SKU: {item.sku} | 주문 수량: {item.quantity} | 환불 수량: {item.refundQuantity}
                        </div>
                        <div className="text-sm text-modern-text-tertiary">
                          환불 사유: {item.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₩{item.refundAmount.toLocaleString()}</div>
                        <div className="text-sm text-modern-text-secondary">
                          단가: ₩{item.unitPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="text-lg font-medium mb-3">결제 정보</h3>
                <div className="p-3 bg-modern-bg-secondary rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-modern-text-secondary">토스 결제키</div>
                      <div className="font-medium">{selectedRefund.paymentKey}</div>
                    </div>
                    <div>
                      <div className="text-sm text-modern-text-secondary">요청 금액</div>
                      <div className="font-medium">₩{selectedRefund.requestedAmount.toLocaleString()}</div>
                    </div>
                    {selectedRefund.approvedAmount && (
                      <div>
                        <div className="text-sm text-modern-text-secondary">승인 금액</div>
                        <div className="font-medium">₩{selectedRefund.approvedAmount.toLocaleString()}</div>
                      </div>
                    )}
                    {selectedRefund.tossRefundKey && (
                      <div>
                        <div className="text-sm text-modern-text-secondary">토스 환불키</div>
                        <div className="font-medium">{selectedRefund.tossRefundKey}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing History */}
              <div>
                <h3 className="text-lg font-medium mb-3">처리 이력</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-modern-bg-secondary rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <div className="flex-1">
                      <div className="font-medium">환불 요청</div>
                      <div className="text-sm text-modern-text-secondary">
                        {new Date(selectedRefund.requestedAt).toLocaleString('ko-KR')}
                      </div>
                      <div className="text-sm text-modern-text-tertiary">
                        사유: {selectedRefund.reason}
                      </div>
                    </div>
                  </div>

                  {selectedRefund.processedAt && (
                    <div className="flex items-center gap-3 p-3 bg-modern-bg-secondary rounded-lg">
                      {getStatusIcon(selectedRefund.status)}
                      <div className="flex-1">
                        <div className="font-medium">관리자 처리</div>
                        <div className="text-sm text-modern-text-secondary">
                          {new Date(selectedRefund.processedAt).toLocaleString('ko-KR')}
                        </div>
                        {selectedRefund.adminNote && (
                          <div className="text-sm text-modern-text-tertiary">
                            메모: {selectedRefund.adminNote}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRefund.completedAt && (
                    <div className="flex items-center gap-3 p-3 bg-modern-bg-secondary rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium">환불 완료</div>
                        <div className="text-sm text-modern-text-secondary">
                          {new Date(selectedRefund.completedAt).toLocaleString('ko-KR')}
                        </div>
                        {selectedRefund.receiptUrl && (
                          <div className="text-sm">
                            <a href={selectedRefund.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-modern-primary hover:underline">
                              환불 영수증 보기
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundManagement;