/**
 * Phase PD-5: Supplier Settlements Page
 *
 * Allows suppliers to view their settlement history and preview upcoming settlements
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Calendar } from 'lucide-react';

interface Settlement {
  id: string;
  partyType: string;
  partyId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalSaleAmount: string;
  totalBaseAmount: string;
  totalCommissionAmount: string;
  totalMarginAmount: string;
  payableAmount: string;
  createdAt: string;
  updatedAt: string;
}

interface SettlementsResponse {
  success: boolean;
  settlements: Settlement[];
  total: number;
  totalPages: number;
}

interface SettlementPreview {
  partyType: string;
  partyId: string;
  periodStart: string;
  periodEnd: string;
  totalSaleAmount: number;
  totalBaseAmount: number;
  totalCommissionAmount: number;
  totalMarginAmount: number;
  payableAmount: number;
  orderCount: number;
  itemCount: number;
}

export default function SupplierSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      const response = await authClient.api.get<SettlementsResponse>(
        `/v1/supplier/settlements?${params.toString()}`
      );

      const data = response.data as SettlementsResponse;
      if (data.success && data.settlements) {
        setSettlements(data.settlements);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
      toast({
        title: '오류',
        description: '정산 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);

      // Current month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params = new URLSearchParams({
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });

      const response = await authClient.api.get<{ success: boolean; preview: SettlementPreview }>(
        `/v1/supplier/settlements/preview?${params.toString()}`
      );

      const previewData = response.data as { success: boolean; preview: SettlementPreview };
      if (previewData.success && previewData.preview) {
        setPreview(previewData.preview);
      }
    } catch (error) {
      console.error('Failed to fetch settlement preview:', error);
      // Silent fail for preview - it's not critical
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchPreview();
  }, [page]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      processing: 'default',
      paid: 'default',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: '대기',
      processing: '처리중',
      paid: '지급완료',
      cancelled: '취소됨',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (amount: string | number) => {
    return Number(amount).toLocaleString('ko-KR') + '원';
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  };

  if (loading && settlements.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">공급 정산 내역</h1>
        <p className="mt-2 text-gray-600">
          공급가 정산 내역을 확인하고 예상 정산 금액을 조회하세요
        </p>
      </div>

      {/* Current Month Preview Card */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              이번 달 예상 정산
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">주문 건수</div>
                <div className="text-2xl font-bold">{preview.orderCount}건</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">총 판매액</div>
                <div className="text-2xl font-bold">{formatCurrency(preview.totalSaleAmount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">총 공급가</div>
                <div className="text-2xl font-bold">{formatCurrency(preview.totalBaseAmount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">예상 정산액</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(preview.payableAmount)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="text-sm text-gray-600">
        총 {total}개의 정산 내역
      </div>

      {/* Settlements Table */}
      {settlements.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">아직 정산 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정산 기간</TableHead>
                <TableHead className="text-right">총 판매액</TableHead>
                <TableHead className="text-right">공급가 합계</TableHead>
                <TableHead className="text-right">정산 금액</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead>생성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell className="font-medium">
                    {formatPeriod(settlement.periodStart, settlement.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatCurrency(settlement.totalSaleAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(settlement.totalBaseAmount)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(settlement.payableAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(settlement.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(settlement.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
