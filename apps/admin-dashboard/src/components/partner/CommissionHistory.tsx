import { FC, useState, useEffect } from 'react';
import { DollarSign, Calendar, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/utils/vendorUtils';
import type { PartnerCommission } from '@o4o/types';

interface CommissionHistoryProps {
  partnerUserId: string;
}

export const CommissionHistory: FC<CommissionHistoryProps> = ({ partnerUserId }) => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'cancelled'>('all');
  const [period, setPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissions();
  }, [partnerUserId, filter, period]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      // API call will be implemented here
      setCommissions([]);
    } catch (error: any) {
    // Error logging - use proper error handler
    } finally {
      setLoading(false);
    }
  };

  const filteredCommissions = commissions.filter((commission: any) => {
    const matchesFilter = filter === 'all' || commission.status === filter;
    const matchesSearch = searchQuery === '' || 
      commission.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCommission = filteredCommissions.reduce((sum: number, c: PartnerCommission) => 
    c.status !== 'cancelled' ? sum + c.commissionAmount : sum, 0
  );
  const pendingCommission = filteredCommissions
    .filter((c: any) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum: number, c: PartnerCommission) => sum + c.commissionAmount, 0);
  const paidCommission = filteredCommissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c: PartnerCommission) => sum + c.commissionAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />승인됨</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-modern-success"><DollarSign className="w-3 h-3 mr-1" />지급완료</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />취소됨</Badge>;
      default:
        return <Badge variant={"outline" as const}>{status}</Badge>;
    }
  };

  const exportToExcel = () => {
    // CSV 내보내기 로직
    const csv = [
      ['주문번호', '주문금액', '커미션율', '커미션금액', '상태', '생성일', '지급일'].join(','),
      ...filteredCommissions.map((c: any) => [
        c.orderId,
        c.orderAmount,
        c.commissionRate + '%',
        c.commissionAmount,
        c.status,
        new Date(c.createdAt).toLocaleDateString('ko-KR'),
        c.paidAt ? new Date(c.paidAt).toLocaleDateString('ko-KR') : '-'
      ].join(','))
    ].join('\n');

    // BOM 없이는 Excel 이 CSV 를 시스템 기본 인코딩(한국어 Windows=CP949)으로 읽어 한글이 깨진다.
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commission_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 커미션</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(totalCommission)}
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
                <p className="text-sm text-modern-text-secondary">지급 대기</p>
                <p className="text-2xl font-bold text-modern-warning">
                  {formatPrice(pendingCommission)}
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
                <p className="text-sm text-modern-text-secondary">지급 완료</p>
                <p className="text-2xl font-bold text-modern-success">
                  {formatPrice(paidCommission)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-modern-primary" />
              커미션 내역
            </span>
            <Button size={"sm" as const} variant={"outline" as const} onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="주문번호로 검색..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="paid">지급완료</SelectItem>
                <SelectItem value="cancelled">취소됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 기간</SelectItem>
                <SelectItem value="month">이번 달</SelectItem>
                <SelectItem value="quarter">이번 분기</SelectItem>
                <SelectItem value="year">올해</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 커미션 목록 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-border-primary">
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">주문번호</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">주문금액</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">커미션</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">상태</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">생성일</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-modern-text-secondary">지급일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-modern-text-secondary">
                      로딩 중...
                    </td>
                  </tr>
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-modern-text-secondary">
                      커미션 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission: any) => (
                    <tr key={commission.id} className="border-b border-modern-border-primary hover:bg-modern-bg-tertiary">
                      <td className="py-3 px-2">
                        <p className="font-medium text-sm">{commission.orderId}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{formatPrice(commission.orderAmount)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-sm">{formatPrice(commission.commissionAmount)}</p>
                          <p className="text-xs text-modern-text-secondary">{commission.commissionRate}%</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(commission.status)}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{new Date(commission.createdAt).toLocaleDateString('ko-KR')}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">
                          {commission.paidAt 
                            ? new Date(commission.paidAt).toLocaleDateString('ko-KR')
                            : commission.status === 'approved' 
                              ? '다음 정산일'
                              : '-'
                          }
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 정산 안내 */}
          <div className="mt-6 p-4 bg-modern-bg-tertiary rounded-lg">
            <p className="text-sm text-modern-text-secondary">
              💡 커미션은 주문 확정 후 승인되며, 매월 25일에 일괄 정산됩니다.
              취소된 주문의 커미션은 자동으로 취소 처리됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};