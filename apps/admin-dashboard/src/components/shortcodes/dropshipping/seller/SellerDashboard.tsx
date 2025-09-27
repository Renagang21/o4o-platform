import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown,
  Calculator,
  ShoppingCart,
  Users,
  Target,
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Shield
} from 'lucide-react';

interface SellerDashboardProps {
  attributes?: {
    period?: '7d' | '30d' | '90d' | '1y';
  };
  content?: string;
}

interface DashboardStats {
  // 수익 지표
  totalRevenue: number;
  totalMargin: number;
  avgMarginRate: number;
  revenueGrowth: number;
  
  // 판매 지표
  totalSales: number;
  conversionRate: number;
  avgOrderValue: number;
  topSellingProduct: {
    id: string;
    title: string;
    sales: number;
  };
  
  // 상품 관리 지표
  activeProducts: number;
  productsNeedPricing: number;
  avgPriceVsMsrp: number; // 평균적으로 MSRP 대비 몇% 가격 설정
  
  // 정산 지표
  pendingSettlement: number;
  lastPayout: {
    amount: number;
    date: string;
  };
  nextPayoutDate: string;
}

interface PricingAlert {
  productId: string;
  productTitle: string;
  msrp: number;
  costPrice: number;
  currentPrice?: number;
  suggestedMargin: number;
  reason: string;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ 
  attributes = { period: '30d' } 
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pricingAlerts, setPricingAlerts] = useState<PricingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pricing' | 'settlement'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [attributes.period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증이 필요합니다');
      }

      const params = new URLSearchParams({
        period: attributes.period || '30d'
      });

      const response = await fetch(`/api/v1/dropshipping/seller/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('대시보드 데이터를 불러올 수 없습니다');
      }

      const data = await response.json();
      setStats(data.stats);
      setPricingAlerts(data.pricingAlerts || []);

    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatPercent = (value: number, showSign = false): string => {
    const formatted = `${value.toFixed(1)}%`;
    return showSign && value > 0 ? `+${formatted}` : formatted;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getMarginBadge = (marginRate: number) => {
    if (marginRate >= 30) {
      return <Badge variant="success">우수</Badge>;
    } else if (marginRate >= 20) {
      return <Badge variant="warning">보통</Badge>;
    } else if (marginRate >= 10) {
      return <Badge variant="secondary">낮음</Badge>;
    } else {
      return <Badge variant="destructive">매우 낮음</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>판매자 대시보드를 불러오는 중...</span>
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

  if (!stats) {
    return null;
  }

  return (
    <div className="seller-dashboard-container space-y-6">
      {/* Legal Compliance Header */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>🏦 판매자 가격 자율성 보장</strong>
          <div className="mt-2 space-y-1 text-sm">
            <div>• 모든 판매 가격은 <strong>판매자가 자율적으로 결정</strong>합니다</div>
            <div>• MSRP는 단순 참고용이며, <strong>구속력이 없습니다</strong></div>
            <div>• 마진은 판매자의 전략에 따라 <strong>자유롭게 설정</strong> 가능합니다</div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">판매자 대시보드</h2>
        <div className="flex gap-2">
          <Button variant={attributes.period === '7d' ? 'default' : 'outline'} size="sm"
            onClick={() => window.location.href = '?period=7d'}>
            7일
          </Button>
          <Button variant={attributes.period === '30d' ? 'default' : 'outline'} size="sm"
            onClick={() => window.location.href = '?period=30d'}>
            30일
          </Button>
          <Button variant={attributes.period === '90d' ? 'default' : 'outline'} size="sm"
            onClick={() => window.location.href = '?period=90d'}>
            90일
          </Button>
          <Button variant={attributes.period === '1y' ? 'default' : 'outline'} size="sm"
            onClick={() => window.location.href = '?period=1y'}>
            1년
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 마진 수익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalMargin)}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {getGrowthIcon(stats.revenueGrowth)}
                  <span className={stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercent(stats.revenueGrowth, true)}
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              평균 마진율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {formatPercent(stats.avgMarginRate)}
                  {getMarginBadge(stats.avgMarginRate)}
                </div>
                <div className="text-sm text-muted-foreground">
                  목표: 25% 이상
                </div>
              </div>
              <Percent className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
            <Progress 
              value={Math.min(stats.avgMarginRate / 30 * 100, 100)} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 판매 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalSales.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">
                  전환율: {formatPercent(stats.conversionRate)}
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              평균 주문액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
                <div className="text-sm text-muted-foreground">
                  객단가
                </div>
              </div>
              <Target className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex space-x-4">
          <button
            className={`pb-2 px-1 ${selectedTab === 'overview' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            개요
          </button>
          <button
            className={`pb-2 px-1 ${selectedTab === 'pricing' ? 'border-b-2 border-blue-500 font-semibold' : ''} flex items-center gap-1`}
            onClick={() => setSelectedTab('pricing')}
          >
            가격 설정 필요
            {stats.productsNeedPricing > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.productsNeedPricing}
              </Badge>
            )}
          </button>
          <button
            className={`pb-2 px-1 ${selectedTab === 'settlement' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
            onClick={() => setSelectedTab('settlement')}
          >
            정산 현황
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                상품 관리 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">활성 상품</span>
                <span className="font-semibold">{stats.activeProducts}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">가격 미설정</span>
                <div className="flex items-center gap-2">
                  {stats.productsNeedPricing > 0 && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className={`font-semibold ${stats.productsNeedPricing > 0 ? 'text-yellow-600' : ''}`}>
                    {stats.productsNeedPricing}개
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MSRP 대비 평균</span>
                <span className="font-semibold">
                  {stats.avgPriceVsMsrp > 0 ? '+' : ''}{stats.avgPriceVsMsrp.toFixed(1)}%
                </span>
              </div>
              
              {stats.topSellingProduct && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">베스트셀러</div>
                  <div className="font-medium">{stats.topSellingProduct.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.topSellingProduct.sales}개 판매
                  </div>
                </div>
              )}
              
              <div className="pt-4">
                <Button className="w-full" onClick={() => window.location.href = '/seller/products'}>
                  <Calculator className="h-4 w-4 mr-2" />
                  상품 가격 관리
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settlement Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                정산 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">정산 대기</span>
                <span className="font-semibold text-lg">{formatCurrency(stats.pendingSettlement)}</span>
              </div>
              
              {stats.lastPayout && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">최근 지급</span>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(stats.lastPayout.amount)}</div>
                    <div className="text-xs text-muted-foreground">{stats.lastPayout.date}</div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">다음 정산일</span>
                <span className="font-medium">{stats.nextPayoutDate}</span>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  정산은 매월 25일에 자동으로 진행됩니다
                </AlertDescription>
              </Alert>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full" 
                  onClick={() => window.location.href = '/seller/settlement'}>
                  정산 내역 상세보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === 'pricing' && (
        <div className="space-y-4">
          {pricingAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">모든 상품 가격이 설정되었습니다</h3>
                  <p className="text-muted-foreground">
                    현재 가격 설정이 필요한 상품이 없습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>가격 설정이 필요한 상품이 {pricingAlerts.length}개 있습니다</strong><br />
                  판매를 시작하려면 아래 상품들의 가격을 설정해주세요
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4">
                {pricingAlerts.map((alert) => (
                  <Card key={alert.productId} className="border-yellow-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{alert.productTitle}</CardTitle>
                          <CardDescription>{alert.reason}</CardDescription>
                        </div>
                        <Badge variant="warning">가격 미설정</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">공급가</div>
                          <div className="font-semibold">{formatCurrency(alert.costPrice)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">MSRP (참고)</div>
                          <div className="font-semibold">{formatCurrency(alert.msrp)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">권장 마진</div>
                          <div className="font-semibold">{formatPercent(alert.suggestedMargin)}</div>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => window.location.href = `/seller/product-pricing?id=${alert.productId}`}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        가격 설정하기
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedTab === 'settlement' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>정산 현황</CardTitle>
              <CardDescription>
                판매 마진 정산 내역과 지급 상태를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Pending Settlement */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">정산 대기 금액</span>
                    <span className="text-2xl font-bold text-yellow-700">
                      {formatCurrency(stats.pendingSettlement)}
                    </span>
                  </div>
                  <div className="text-sm text-yellow-600">
                    다음 정산일: {stats.nextPayoutDate}
                  </div>
                </div>

                {/* Settlement History Summary */}
                {stats.lastPayout && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">최근 정산 완료</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatCurrency(stats.lastPayout.amount)}
                      </span>
                    </div>
                    <div className="text-sm text-green-600">
                      지급일: {stats.lastPayout.date}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = '/seller/settlement'}
                >
                  전체 정산 내역 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/seller/products'}>
              <Package className="h-4 w-4 mr-2" />
              상품 관리
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/seller/pricing'}>
              <Calculator className="h-4 w-4 mr-2" />
              가격 설정
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/seller/analytics'}>
              <TrendingUp className="h-4 w-4 mr-2" />
              판매 분석
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/seller/settlement'}>
              <DollarSign className="h-4 w-4 mr-2" />
              정산 내역
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;