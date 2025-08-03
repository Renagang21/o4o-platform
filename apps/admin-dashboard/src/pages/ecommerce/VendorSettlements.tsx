import { ChangeEvent, FC, useState } from 'react';
import { Users, DollarSign, Clock, CheckCircle, Download, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

interface VendorSettlement {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  settlementPeriod: {
    startDate: string;
    endDate: string;
  };
  orderCount: number;
  totalSales: number;
  platformFee: number;
  tossFee: number;
  taxAmount: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  memo?: string;
  receiptUrl?: string;
}

interface SettlementApproval {
  settlementIds: string[];
  totalAmount: number;
  memo?: string;
}

const VendorSettlements: FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSettlements, setSelectedSettlements] = useState<any[]>([]);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalMemo, setApprovalMemo] = useState('');

  // Fetch vendor settlements
  const { data: settlementsData, isLoading } = useQuery({
    queryKey: ['vendor-settlements', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await authClient.api.get(`/v1/settlements/vendors?${params}`);
      return response.data;
    }
  });
  const settlements: VendorSettlement[] = settlementsData?.data || [];

  // Bulk approve settlements
  const approveSettlementsMutation = useMutation({
    mutationFn: async (data: SettlementApproval) => {
      const response = await authClient.api.post('/v1/settlements/vendors/approve-bulk', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('정산이 승인되었습니다');
      queryClient.invalidateQueries({ queryKey: ['vendor-settlements'] });
      setSelectedSettlements([]);
      setIsApprovalDialogOpen(false);
      setApprovalMemo('');
    },
    onError: () => {
      toast.error('정산 승인 중 오류가 발생했습니다');
    }
  });

  // Individual settlement action
  const settlementActionMutation = useMutation({
    mutationFn: async ({ id, action, memo }: { id: string; action: string; memo?: string }) => {
      const response = await authClient.api.post(`/v1/settlements/vendors/${id}/${action}`, { memo });
      return response.data;
    },
    onSuccess: (_, variables) => {
      const actionText = variables.action === 'approve' ? '승인' : 
                       variables.action === 'reject' ? '거부' : '처리';
      toast.success(`정산이 ${actionText}되었습니다`);
      queryClient.invalidateQueries({ queryKey: ['vendor-settlements'] });
    }
  });

  // Export settlements
  const exportMutation = useMutation({
    mutationFn: async (settlementIds: string[]) => {
      const response = await authClient.api.post('/v1/settlements/vendors/export', 
        { settlementIds },
        { responseType: 'blob' }
      );
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settlements_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('정산 데이터가 다운로드되었습니다');
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant={"outline" as const} className="text-orange-600 border-orange-600">승인 대기</Badge>;
      case 'approved':
        return <Badge variant={"outline" as const} className="text-blue-600 border-blue-600">승인됨</Badge>;
      case 'processing':
        return <Badge variant={"outline" as const} className="text-purple-600 border-purple-600">처리중</Badge>;
      case 'completed':
        return <Badge>완료</Badge>;
      case 'failed':
        return <Badge variant="secondary">실패</Badge>;
      default:
        return <Badge variant={"outline" as const}>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const handleBulkApprove = () => {
    if (selectedSettlements.length === 0) {
      toast.error('승인할 정산을 선택하세요');
      return;
    }
    setIsApprovalDialogOpen(true);
  };

  const confirmBulkApprove = () => {
    const selectedSettlementData = settlements.filter((s: any) => selectedSettlements.includes(s.id));
    const totalAmount = selectedSettlementData.reduce((sum: any, s: any) => sum + s.netAmount, 0);

    approveSettlementsMutation.mutate({
      settlementIds: selectedSettlements,
      totalAmount,
      memo: approvalMemo
    });
  };

  const handleExport = () => {
    const exportIds = selectedSettlements.length > 0 ? selectedSettlements : settlements.map((s: any) => s.id);
    exportMutation.mutate(exportIds);
  };

  const pendingSettlements = settlements.filter((s: any) => s.status === 'pending');
  const totalPendingAmount = pendingSettlements.reduce((sum: any, s: any) => sum + s.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">판매자 정산 관리</h1>
          <p className="text-modern-text-secondary mt-1">판매자별 정산 승인 및 처리</p>
        </div>
        <div className="flex gap-2">
          <Button variant={"outline" as const} onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button onClick={handleBulkApprove} disabled={selectedSettlements.length === 0}>
            <CheckCircle className="w-4 h-4 mr-2" />
            일괄 승인 ({selectedSettlements.length})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              승인 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingSettlements.length}건
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              {formatCurrency(totalPendingAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {settlements.filter((s: any) => s.status === 'completed').length}건
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              이번 달
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Users className="w-4 h-4" />
              정산 판매자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(settlements.map((s: any) => s.vendorId)).size}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              총 정산 금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {formatCurrency(settlements.reduce((sum: any, s: any) => sum + s.netAmount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-4 h-4" />
                <Input
                  placeholder="판매자명, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
            >
              <option value="all">모든 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인됨</option>
              <option value="processing">처리중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle>정산 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e: any) => {
                        if (e.target.checked) {
                          setSelectedSettlements(settlements.map((s: any) => s.id));
                        } else {
                          setSelectedSettlements([]);
                        }
                      }}
                      checked={selectedSettlements.length === settlements.length && settlements.length > 0}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    판매자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    정산 기간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    매출액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    수수료
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    정산액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    요청일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-modern-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : settlements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-modern-text-secondary">
                      정산 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  settlements.map((settlement: any) => (
                    <tr key={settlement.id} className="hover:bg-modern-bg-hover">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedSettlements.includes(settlement.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setSelectedSettlements([...selectedSettlements, settlement.id]);
                            } else {
                              setSelectedSettlements(selectedSettlements.filter((id: any) => id !== settlement.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {settlement.vendorName}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {settlement.vendorEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-primary">
                          {formatDate(settlement.settlementPeriod.startDate)} ~ {formatDate(settlement.settlementPeriod.endDate)}
                        </div>
                        <div className="text-xs text-modern-text-tertiary">
                          {settlement.orderCount}건 주문
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-modern-text-primary">
                          {formatCurrency(settlement.totalSales)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-secondary">
                          플랫폼: {formatCurrency(settlement.platformFee)}
                        </div>
                        <div className="text-xs text-modern-text-tertiary">
                          토스: {formatCurrency(settlement.tossFee)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(settlement.netAmount)}
                        </div>
                        {settlement.taxAmount > 0 && (
                          <div className="text-xs text-modern-text-tertiary">
                            세금: {formatCurrency(settlement.taxAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(settlement.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-modern-text-secondary">
                          {formatDate(settlement.requestedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {settlement.status === 'pending' && (
                            <>
                              <Button
                                size={"sm" as const}
                                onClick={() => settlementActionMutation.mutate({ 
                                  id: settlement.id, 
                                  action: 'approve' 
                                })}
                                disabled={settlementActionMutation.isPending}
                              >
                                승인
                              </Button>
                              <Button
                                size={"sm" as const}
                                variant={"outline" as const}
                                onClick={() => settlementActionMutation.mutate({ 
                                  id: settlement.id, 
                                  action: 'reject' 
                                })}
                                disabled={settlementActionMutation.isPending}
                              >
                                거부
                              </Button>
                            </>
                          )}
                          {settlement.receiptUrl && (
                            <Button
                              size={"sm" as const}
                              variant={"ghost" as const}
                              onClick={() => window.open(settlement.receiptUrl, '_blank')}
                            >
                              영수증
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

      {/* Bulk Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정산 일괄 승인</DialogTitle>
            <DialogDescription>
              선택한 {selectedSettlements.length}건의 정산을 승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-modern-bg-secondary rounded-lg">
              <div className="text-sm font-medium text-modern-text-secondary mb-2">승인 요약</div>
              <div className="flex justify-between">
                <span>총 정산건수</span>
                <span className="font-medium">{selectedSettlements.length}건</span>
              </div>
              <div className="flex justify-between">
                <span>총 정산금액</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(
                    settlements
                      .filter((s: any) => selectedSettlements.includes(s.id))
                      .reduce((sum: any, s: any) => sum + s.netAmount, 0)
                  )}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="approvalMemo">메모 (선택)</Label>
              <Input
                id="approvalMemo"
                value={approvalMemo}
                onChange={(e: any) => setApprovalMemo(e.target.value)}
                placeholder="승인 관련 메모를 입력하세요"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant={"outline" as const} 
              onClick={() => setIsApprovalDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              onClick={confirmBulkApprove}
              disabled={approveSettlementsMutation.isPending}
            >
              승인 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorSettlements;