/**
 * Phase 9: Supplier Authorization Inbox
 *
 * Supplier UI for managing incoming authorization requests from sellers
 *
 * Features:
 * - View pending authorization requests by product
 * - Approve/reject requests with reason tracking
 * - View remaining slots for each seller (prevent >10 approvals)
 * - Filter by product and status
 * - Bulk actions support
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Filter, RefreshCw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';

interface AuthorizationRequest {
  id: string;
  productId: string;
  productName?: string;
  sellerId: string;
  sellerName?: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'CANCELLED';
  requestedAt: string;
  metadata?: {
    businessJustification?: string;
    [key: string]: any;
  };
  // Seller limit info (from enriched response)
  sellerLimits?: {
    currentCount: number;
    maxLimit: number;
    remainingSlots: number;
  };
}

interface ActionModalState {
  isOpen: boolean;
  action: 'approve' | 'reject' | null;
  authorization: AuthorizationRequest | null;
  reason: string;
  cooldownDays: number;
}

const SupplierAuthorizationInbox = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('REQUESTED');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  const [modalState, setModalState] = useState<ActionModalState>({
    isOpen: false,
    action: null,
    authorization: null,
    reason: '',
    cooldownDays: 30,
  });

  useEffect(() => {
    fetchRequests();
    fetchProducts();
  }, [selectedProduct, selectedStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedProduct !== 'all') params.productId = selectedProduct;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await authClient.api.get('/api/v1/ds/supplier/authorizations/inbox', { params });

      if (response.data?.success) {
        setRequests(response.data.data.requests || []);
      }
    } catch (error: any) {
      if (error.response?.status === 501) {
        toast.error('Seller Authorization 기능이 아직 활성화되지 않았습니다.');
      } else {
        toast.error('요청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch supplier's products for filtering
      const response = await authClient.api.get('/api/v1/ds/supplier/products');
      if (response.data?.success) {
        setProducts(response.data.data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const openActionModal = (action: 'approve' | 'reject', authorization: AuthorizationRequest) => {
    setModalState({
      isOpen: true,
      action,
      authorization,
      reason: '',
      cooldownDays: 30,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      action: null,
      authorization: null,
      reason: '',
      cooldownDays: 30,
    });
  };

  const handleApprove = async () => {
    if (!modalState.authorization) return;

    // Check if seller has slots remaining
    const limits = modalState.authorization.sellerLimits;
    if (limits && limits.remainingSlots <= 0) {
      toast.error('판매자가 상품 한도(10개)에 도달했습니다. 승인할 수 없습니다.');
      return;
    }

    try {
      await authClient.api.post(
        `/api/v1/ds/supplier/authorizations/${modalState.authorization.id}/approve`,
        {
          approvedBy: user?.id || 'supplier-admin',
        }
      );

      toast.success('승인 요청이 처리되었습니다.');
      closeModal();
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async () => {
    if (!modalState.authorization) return;

    // Validate reason (minimum 10 characters)
    if (modalState.reason.trim().length < 10) {
      toast.error('거절 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    try {
      await authClient.api.post(
        `/api/v1/ds/supplier/authorizations/${modalState.authorization.id}/reject`,
        {
          rejectedBy: user?.id || 'supplier-admin',
          reason: modalState.reason,
          cooldownDays: modalState.cooldownDays,
        }
      );

      toast.success(`거절 처리되었습니다. (쿨다운: ${modalState.cooldownDays}일)`);
      closeModal();
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '거절 처리에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: AuthorizationRequest['status']) => {
    const variants = {
      APPROVED: { variant: 'default' as const, icon: CheckCircle, label: '승인됨', color: 'text-green-600' },
      REQUESTED: { variant: 'secondary' as const, icon: Clock, label: '대기중', color: 'text-yellow-600' },
      REJECTED: { variant: 'destructive' as const, icon: XCircle, label: '거절됨', color: 'text-red-600' },
      REVOKED: { variant: 'destructive' as const, icon: XCircle, label: '철회됨', color: 'text-red-800' },
      CANCELLED: { variant: 'outline' as const, icon: XCircle, label: '취소됨', color: 'text-gray-600' },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getSlotsWarning = (limits?: AuthorizationRequest['sellerLimits']) => {
    if (!limits) return null;

    const { currentCount, maxLimit, remainingSlots } = limits;

    if (remainingSlots === 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">한도 초과 ({currentCount}/{maxLimit})</span>
        </div>
      );
    }

    if (remainingSlots <= 2) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">남은 슬롯: {remainingSlots}</span>
        </div>
      );
    }

    return (
      <span className="text-sm text-gray-600">
        {currentCount}/{maxLimit} (남음: {remainingSlots})
      </span>
    );
  };

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: () => { fetchRequests(); fetchProducts(); }, variant: 'primary' as const },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="승인 요청함"
        subtitle="판매자의 상품 승인 요청을 관리하세요"
        actions={headerActions}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-filter">상품 필터</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product-filter">
                  <SelectValue placeholder="상품 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상품</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">상태 필터</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="REQUESTED">대기중</SelectItem>
                  <SelectItem value="APPROVED">승인됨</SelectItem>
                  <SelectItem value="REJECTED">거절됨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>승인 요청 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">승인 요청이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상품명</TableHead>
                  <TableHead>판매자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청일</TableHead>
                  <TableHead>판매자 한도</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.productName || request.productId}
                    </TableCell>
                    <TableCell>{request.sellerName || request.sellerId}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.requestedAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>{getSlotsWarning(request.sellerLimits)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.metadata?.businessJustification || '-'}
                    </TableCell>
                    <TableCell>
                      {request.status === 'REQUESTED' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openActionModal('approve', request)}
                            disabled={request.sellerLimits?.remainingSlots === 0}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionModal('reject', request)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            거절
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Modal (Approve/Reject) */}
      <Dialog open={modalState.isOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalState.action === 'approve' ? '승인 확인' : '거절 처리'}
            </DialogTitle>
            <DialogDescription>
              {modalState.action === 'approve'
                ? '이 승인 요청을 처리하시겠습니까?'
                : '거절 사유를 입력하고 쿨다운 기간을 설정하세요.'}
            </DialogDescription>
          </DialogHeader>

          {modalState.authorization && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">상품:</span>
                  <span>{modalState.authorization.productName || modalState.authorization.productId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">판매자:</span>
                  <span>{modalState.authorization.sellerName || modalState.authorization.sellerId}</span>
                </div>
                {modalState.authorization.sellerLimits && (
                  <div className="flex justify-between">
                    <span className="font-medium">판매자 한도:</span>
                    {getSlotsWarning(modalState.authorization.sellerLimits)}
                  </div>
                )}
              </div>

              {modalState.action === 'reject' && (
                <>
                  <div>
                    <Label htmlFor="reason">거절 사유 (필수, 최소 10자)</Label>
                    <Textarea
                      id="reason"
                      placeholder="예: 품질 기준 미달, 계약 조건 불충분, 재고 관리 우려 등"
                      value={modalState.reason}
                      onChange={(e) => setModalState({ ...modalState, reason: e.target.value })}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cooldown">쿨다운 기간 (일)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      min="1"
                      max="365"
                      value={modalState.cooldownDays}
                      onChange={(e) =>
                        setModalState({ ...modalState, cooldownDays: parseInt(e.target.value) || 30 })
                      }
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      판매자는 이 기간 동안 재요청할 수 없습니다. (기본: 30일)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              취소
            </Button>
            {modalState.action === 'approve' ? (
              <Button onClick={handleApprove}>승인 확인</Button>
            ) : (
              <Button variant="destructive" onClick={handleReject}>
                거절 처리
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierAuthorizationInbox;
