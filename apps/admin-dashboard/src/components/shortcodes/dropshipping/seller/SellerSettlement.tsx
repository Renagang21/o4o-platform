import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  TrendingUp,
  CreditCard,
  FileText,
  Info,
  Calculator,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';

interface SellerSettlementProps {
  attributes?: {
    period?: '7d' | '30d' | '90d' | '1y';
    status?: 'all' | 'pending' | 'scheduled' | 'paid';
  };
  content?: string;
}

interface SettlementTransaction {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  orderDate: string;
  // 가격 정보
  sellerPrice: number;
  costPrice: number;
  supplierCommission: number;
  platformFee: number;
  // 마진 계산
  grossMargin: number;
  netMargin: number;
  marginRate: number;
  // 정산 정보
  settlementStatus: 'pending' | 'scheduled' | 'paid' | 'cancelled';
  scheduledDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  // 고객 정보
  customerName: string;
  quantity: number;
}

interface SettlementSummary {
  totalRevenue: number;
  totalMargin: number;
  pendingAmount: number;
  scheduledAmount: number;
  paidAmount: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
  averageMarginRate: number;
  totalTransactions: number;
}

interface PayoutHistory {
  id: string;
  payoutDate: string;
  amount: number;
  transactionCount: number;
  status: 'completed' | 'processing' | 'failed';
  bankAccount: string;
  reference: string;
}

const SellerSettlement: React.FC<SellerSettlementProps> = ({ 
  attributes = {
    period: '30d',
    status: 'all'
  }
}) => {
  const [transactions, setTransactions] = useState<SettlementTransaction[]>([]);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'transactions' | 'summary' | 'history'>('transactions');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(attributes.status || 'all');
  const [filterPeriod, setFilterPeriod] = useState<string>(attributes.period || '30d');

  useEffect(() => {
    fetchSettlementData();
  }, [filterStatus, filterPeriod]);

  const fetchSettlementData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증이 필요합니다');
      }

      const params = new URLSearchParams({
        period: filterPeriod,
        status: filterStatus
      });

      const response = await fetch(`/api/v1/dropshipping/seller/settlement?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('정산 내역을 불러올 수 없습니다');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
      setPayoutHistory(data.payoutHistory || []);

    } catch (err) {
      console.error('Error fetching settlement data:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          대기중
        </Badge>;
      case 'scheduled':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          예정
        </Badge>;
      case 'paid':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          완료
        </Badge>;
      case 'cancelled':
        return <Badge variant="destructive">취소</Badge>;
      default:
        return <Badge variant="outline">알수없음</Badge>;
    }
  };

  const getMarginColor = (rate: number): string => {
    if (rate >= 30) return 'text-green-600';
    if (rate >= 20) return 'text-yellow-600';
    if (rate >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const exportToCSV = () => {
    const headers = ['주문일', '상품명', '판매가', '원가', '수수료', '순마진', '마진율', '정산상태', '정산예정일'];
    const rows = transactions.map(t => [
      formatDate(t.orderDate),
      t.productTitle,
      t.sellerPrice,
      t.costPrice,
      t.supplierCommission + t.platformFee,
      t.netMargin,
      `${t.marginRate.toFixed(1)}%`,
      t.settlementStatus,
      t.scheduledDate ? formatDate(t.scheduledDate) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `settlement_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>정산 내역을 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="seller-settlement-container space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">판매자 정산 내역</h2>
          <p className="text-muted-foreground">
            판매 마진 정산 내역과 지급 상태를 확인하세요
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          CSV 내보내기
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 마진 수익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalMargin)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              평균 마진율: {summary.averageMarginRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">
              정산 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {formatCurrency(summary.pendingAmount)}
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              처리 대기중
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">
              정산 예정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(summary.scheduledAmount)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {summary.nextPayoutDate}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">
              정산 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(summary.paidAmount)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {summary.totalTransactions}건 완료
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout Alert */}
      {summary.nextPayoutAmount > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="flex items-center justify-between">
              <div>
                <strong>다음 정산 예정</strong>
                <div className="text-sm mt-1">
                  {summary.nextPayoutDate}에 {formatCurrency(summary.nextPayoutAmount)}가 지급될 예정입니다
                </div>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>정산 내역</CardTitle>
            <div className="flex gap-2">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="1y">최근 1년</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="scheduled">예정</option>
                <option value="paid">완료</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions">거래 내역</TabsTrigger>
              <TabsTrigger value="summary">마진 분석</TabsTrigger>
              <TabsTrigger value="history">지급 이력</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">정산 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg">
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedTransaction(
                          expandedTransaction === transaction.id ? null : transaction.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="font-medium">{transaction.productTitle}</div>
                                <div className="text-sm text-muted-foreground">
                                  주문일: {formatDate(transaction.orderDate)} | 수량: {transaction.quantity}개
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-lg">
                                  {formatCurrency(transaction.netMargin)}
                                </div>
                                <div className={`text-sm font-medium ${getMarginColor(transaction.marginRate)}`}>
                                  마진율 {transaction.marginRate.toFixed(1)}%
                                </div>
                              </div>
                              {getStatusBadge(transaction.settlementStatus)}
                              <button className="p-1">
                                {expandedTransaction === transaction.id ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedTransaction === transaction.id && (
                        <div className="border-t p-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">판매가</div>
                              <div className="font-semibold">{formatCurrency(transaction.sellerPrice)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">공급가</div>
                              <div className="font-semibold text-red-600">
                                -{formatCurrency(transaction.costPrice)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">수수료</div>
                              <div className="font-semibold text-red-600">
                                -{formatCurrency(transaction.supplierCommission + transaction.platformFee)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">순마진</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(transaction.netMargin)}
                              </div>
                            </div>
                          </div>

                          {/* Settlement Info */}
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">주문번호:</span>
                                  <span className="ml-2 font-mono">{transaction.orderId}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">고객:</span>
                                  <span className="ml-2">{transaction.customerName}</span>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                {transaction.scheduledDate && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">정산예정:</span>
                                    <span className="ml-2 font-medium">
                                      {formatDate(transaction.scheduledDate)}
                                    </span>
                                  </div>
                                )}
                                {transaction.paidDate && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">지급완료:</span>
                                    <span className="ml-2 font-medium text-green-600">
                                      {formatDate(transaction.paidDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Margin Calculation Breakdown */}
                          <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <div className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Calculator className="h-4 w-4" />
                              마진 계산 상세
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>판매가 (자율 결정)</span>
                                <span className="font-medium">{formatCurrency(transaction.sellerPrice)}</span>
                              </div>
                              <div className="flex justify-between text-red-600">
                                <span>- 공급가</span>
                                <span>{formatCurrency(transaction.costPrice)}</span>
                              </div>
                              <div className="flex justify-between text-red-600">
                                <span>- 공급자 수수료</span>
                                <span>{formatCurrency(transaction.supplierCommission)}</span>
                              </div>
                              <div className="flex justify-between text-red-600">
                                <span>- 플랫폼 수수료</span>
                                <span>{formatCurrency(transaction.platformFee)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-blue-200 font-semibold text-green-600">
                                <span>= 순마진</span>
                                <span>{formatCurrency(transaction.netMargin)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">마진 분석</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">평균 마진율</span>
                      <span className="text-2xl font-bold">
                        {summary.averageMarginRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={summary.averageMarginRate} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 매출</span>
                        <span className="font-medium">{formatCurrency(summary.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 마진</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(summary.totalMargin)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">거래 건수</span>
                        <span className="font-medium">{summary.totalTransactions}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">건당 평균</span>
                        <span className="font-medium">
                          {formatCurrency(summary.totalMargin / summary.totalTransactions)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert className="mt-4">
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      마진율 25% 이상 유지시 수익성이 양호합니다
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {payoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">아직 지급 이력이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutHistory.map((payout) => (
                    <Card key={payout.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{formatDate(payout.payoutDate)}</span>
                              {payout.status === 'completed' ? (
                                <Badge variant="success">완료</Badge>
                              ) : payout.status === 'processing' ? (
                                <Badge variant="warning">처리중</Badge>
                              ) : (
                                <Badge variant="destructive">실패</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payout.bankAccount} | {payout.transactionCount}건
                            </div>
                            <div className="text-xs text-muted-foreground">
                              참조: {payout.reference}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">{formatCurrency(payout.amount)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Settlement Policy Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            정산 정책 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-blue-600" />
            <div>
              <strong>정산 주기:</strong> 매월 25일 (공휴일인 경우 익영업일)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-blue-600" />
            <div>
              <strong>정산 대상:</strong> 배송 완료 후 7일 경과한 거래
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-blue-600" />
            <div>
              <strong>최소 정산 금액:</strong> 10,000원 이상
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 text-blue-600" />
            <div>
              <strong>지급 방법:</strong> 등록된 계좌로 자동 이체
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerSettlement;