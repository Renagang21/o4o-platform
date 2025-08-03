import { ChangeEvent, FC, useEffect, useState } from 'react';
import { 
  DollarSign, CheckCircle, XCircle, Clock, Search, 
  Download, AlertCircle 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getCommissionHistory, processCommissions } from '@/api/affiliate';
import { formatPrice, formatRate } from '@/utils/vendorUtils';
import toast from 'react-hot-toast';
import type { AffiliateCommission, ProcessCommissionRequest } from '@o4o/types';

export const CommissionApprovalManager: FC = () => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'point'>('bank');

  useEffect(() => {
    loadCommissions();
  }, [filter]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const response = await getCommissionHistory({
        status: filter === 'all' ? undefined : filter,
        limit: 100
      });
      setCommissions(response.data || []);
    } catch (error: any) {
      toast.error('커미션 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCommissions.size === filteredCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(filteredCommissions.map((c: any) => c.id)));
    }
  };

  const toggleSelect = (commissionId: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(commissionId)) {
      newSelected.delete(commissionId);
    } else {
      newSelected.add(commissionId);
    }
    setSelectedCommissions(newSelected);
  };

  const handleApprove = async () => {
    if (selectedCommissions.size === 0) {
      toast.error('승인할 커미션을 선택해주세요');
      return;
    }

    const request: ProcessCommissionRequest = {
      commissionIds: Array.from(selectedCommissions),
      action: 'approve'
    };

    try {
      await processCommissions(request);
      toast.success(`${selectedCommissions.size}개 커미션이 승인되었습니다`);
      setSelectedCommissions(new Set());
      loadCommissions();
    } catch (error: any) {
      toast.error('커미션 승인 처리 중 오류가 발생했습니다');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('거절 사유를 입력해주세요');
      return;
    }

    const request: ProcessCommissionRequest = {
      commissionIds: Array.from(selectedCommissions),
      action: 'cancel',
      reason: rejectReason
    };

    try {
      await processCommissions(request);
      toast.success(`${selectedCommissions.size}개 커미션이 거절되었습니다`);
      setSelectedCommissions(new Set());
      setRejectReason('');
      setShowRejectDialog(false);
      loadCommissions();
    } catch (error: any) {
      toast.error('커미션 거절 처리 중 오류가 발생했습니다');
    }
  };

  const handlePayment = async () => {
    const request: ProcessCommissionRequest = {
      commissionIds: Array.from(selectedCommissions),
      action: 'pay',
      paymentMethod
    };

    try {
      await processCommissions(request);
      toast.success(`${selectedCommissions.size}개 커미션이 지급 처리되었습니다`);
      setSelectedCommissions(new Set());
      setShowPaymentDialog(false);
      loadCommissions();
    } catch (error: any) {
      toast.error('커미션 지급 처리 중 오류가 발생했습니다');
    }
  };

  const filteredCommissions = commissions.filter((commission: any) => {
    const matchesSearch = searchQuery === '' ||
      commission.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.affiliateUserId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalAmount = filteredCommissions.reduce((sum: number, c: AffiliateCommission) => sum + c.commissionAmount, 0);
  const selectedAmount = Array.from(selectedCommissions).reduce((sum: any, id: any) => {
    const commission = commissions.find((c: any) => c.id === id);
    return sum + (commission?.commissionAmount || 0);
  }, 0);

  const exportToExcel = () => {
    const csv = [
      ['커미션ID', '추천인ID', '주문번호', '주문금액', '커미션율', '커미션금액', '상태', '생성일'].join(','),
      ...filteredCommissions.map((c: any) => [
        c.id,
        c.affiliateUserId,
        c.orderId,
        c.orderAmount,
        c.commissionRate + '%',
        c.commissionAmount,
        c.status,
        new Date(c.createdAt).toLocaleDateString('ko-KR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commission_approval_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-modern-text-primary">커미션 승인 관리</h2>
          <p className="text-modern-text-secondary mt-1">
            추천 커미션을 검토하고 승인/거절/지급 처리할 수 있습니다
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          총 {filteredCommissions.length}건
        </Badge>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">대기 중</p>
                <p className="text-2xl font-bold text-modern-warning">
                  {commissions.filter((c: any) => c.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">승인됨</p>
                <p className="text-2xl font-bold text-modern-success">
                  {commissions.filter((c: any) => c.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 금액</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(totalAmount)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">선택 금액</p>
                <p className="text-2xl font-bold text-modern-accent">
                  {formatPrice(selectedAmount as number)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 액션 바 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-4 h-4" />
                <Input
                  placeholder="주문번호 또는 추천인ID로 검색..."
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={"outline" as const} onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={"outline" as const}
                onClick={() => setShowRejectDialog(true)}
                disabled={selectedCommissions.size === 0}
              >
                <XCircle className="w-4 h-4 mr-2" />
                거절
              </Button>
              <Button
                variant={"outline" as const}
                onClick={() => setShowPaymentDialog(true)}
                disabled={selectedCommissions.size === 0 || 
                  !Array.from(selectedCommissions).every((id: any) => 
                    commissions.find((c: any) => c.id === id)?.status === 'approved'
                  )}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                지급
              </Button>
              <Button
                onClick={handleApprove}
                disabled={selectedCommissions.size === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                승인 ({selectedCommissions.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 커미션 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-border-primary bg-modern-bg-secondary">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedCommissions.size === filteredCommissions.length && filteredCommissions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">추천인</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">주문 정보</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">커미션</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">상태</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">생성일</th>
                  <th className="p-4 text-left text-sm font-medium text-modern-text-secondary">의심 거래</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-modern-text-secondary">
                      로딩 중...
                    </td>
                  </tr>
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-modern-text-secondary">
                      커미션 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission: any) => {
                    // 의심 거래 체크 (예: 비정상적으로 높은 금액)
                    const isSuspicious = commission.orderAmount > 5000000 || 
                                       commission.commissionRate > 20;

                    return (
                      <tr key={commission.id} className="border-b border-modern-border-primary hover:bg-modern-bg-tertiary">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedCommissions.has(commission.id)}
                            onCheckedChange={() => toggleSelect(commission.id)}
                          />
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium">추천인 #{commission.affiliateUserId.slice(0, 8)}</p>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium">{commission.orderId}</p>
                            <p className="text-sm text-modern-text-secondary">
                              주문금액: {formatPrice(commission.orderAmount)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium">{formatPrice(commission.commissionAmount)}</p>
                            <p className="text-sm text-modern-text-secondary">{formatRate(commission.commissionRate)}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          {commission.status === 'pending' && (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              대기중
                            </Badge>
                          )}
                          {commission.status === 'approved' && (
                            <Badge variant="default">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              승인됨
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-modern-text-secondary">
                            {new Date(commission.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </td>
                        <td className="p-4">
                          {isSuspicious && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              검토 필요
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 거절 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>커미션 거절</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-modern-text-secondary mb-2">
                선택한 {selectedCommissions.size}개 커미션을 거절합니다.
              </p>
              <Label htmlFor="reason">거절 사유</Label>
              <Textarea
                id="reason"
                placeholder="거절 사유를 입력해주세요..."
                value={rejectReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setShowRejectDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              거절
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 지급 다이얼로그 */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>커미션 지급</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-modern-text-secondary mb-4">
                선택한 {selectedCommissions.size}개 커미션을 지급 처리합니다.
              </p>
              <p className="text-lg font-medium mb-4">
                총 지급액: {formatPrice(selectedAmount as number)}
              </p>
              <Label htmlFor="paymentMethod">지급 방법</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger id="paymentMethod" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">계좌 이체</SelectItem>
                  <SelectItem value="point">포인트 지급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setShowPaymentDialog(false)}>
              취소
            </Button>
            <Button onClick={handlePayment}>
              지급 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};