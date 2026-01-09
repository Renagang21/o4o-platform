import { useState, useEffect } from 'react';
import { 
  Users, DollarSign, BarChart3,
  MousePointer, ShoppingBag, Clock, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReferralLinkGenerator } from '@/components/partner/ReferralLinkGenerator';
import { CommissionHistory } from '@/components/partner/CommissionHistory';
import { ReferralToolkit } from '@/components/partner/ReferralToolkit';
// import { PerformanceChart } from '@/components/partner/PerformanceChart';
import { useAuth } from '@o4o/auth-context';
import { formatPrice } from '@/utils/vendorUtils';
import type { PartnerUser, UserPartnerDashboard } from '@o4o/types';

const PartnerPerformanceDashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [partnerData, setPartnerData] = useState<PartnerUser | null>(null);
  const [dashboard, setDashboard] = useState<UserPartnerDashboard | null>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual API call
      // const response = await partnerApi.getDashboard(user?.id, period);
      // setPartnerData(response.partner);
      // setDashboard(response.dashboard);

      // Empty state until API integration
      setPartnerData(null);
      setDashboard(null);
    } catch (error: any) {
      // Error logging - use proper error handler
      setPartnerData(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  const conversionRate = dashboard 
    ? ((dashboard.monthlyStats.signups / dashboard.monthlyStats.clicks) * 100).toFixed(1)
    : '0';

  const purchaseRate = dashboard && dashboard.monthlyStats.signups > 0
    ? ((dashboard.monthlyStats.orders / dashboard.monthlyStats.signups) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">
            추천인 성과 대시보드
          </h1>
          <p className="text-modern-text-secondary mt-1">
            추천 활동과 수익을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant={"outline" as const} className="text-modern-success">
            <div className="w-2 h-2 rounded-full bg-modern-success mr-2" />
            활성
          </Badge>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 클릭</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {dashboard?.monthlyStats.clicks.toLocaleString() || 0}
                </p>
                <p className="text-xs text-modern-success mt-1">+12.5%</p>
              </div>
              <MousePointer className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">신규 가입</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {dashboard?.monthlyStats.signups || 0}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  전환율 {conversionRate}%
                </p>
              </div>
              <Users className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">구매 전환</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {dashboard?.monthlyStats.orders || 0}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  구매율 {purchaseRate}%
                </p>
              </div>
              <ShoppingBag className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">예상 수익</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {formatPrice(dashboard?.monthlyStats.commission || 0)}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  수수료율 {partnerData?.commissionRate || 5}%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 탭 콘텐츠 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="links">추천 링크</TabsTrigger>
          <TabsTrigger value="commission">커미션</TabsTrigger>
          <TabsTrigger value="toolkit">도구</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 성과 차트 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-modern-primary" />
                  추천 성과 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* <PerformanceChart period={period} /> */}
                <div className="text-center py-8 text-gray-500">성과 차트는 준비 중입니다.</div>
              </CardContent>
            </Card>

            {/* 최근 활동 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-modern-primary" />
                  최근 활동
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        activity.type === 'order' ? 'bg-modern-success' :
                        activity.type === 'signup' ? 'bg-modern-primary' :
                        activity.type === 'commission' ? 'bg-modern-warning' :
                        'bg-modern-text-tertiary'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-modern-text-primary">
                          {activity.description}
                        </p>
                        {activity.amount && (
                          <p className="text-sm font-medium text-modern-success">
                            {formatPrice(activity.amount)}
                          </p>
                        )}
                        <p className="text-xs text-modern-text-secondary">
                          {new Date(activity.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 수익 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>총 수익 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-modern-text-secondary">총 추천 수익</span>
                  <span className="font-medium">
                    {formatPrice(dashboard?.totalStats.revenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-modern-text-secondary">지급 완료</span>
                  <span className="font-medium text-modern-success">
                    {formatPrice(dashboard?.totalStats.paidCommission || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-modern-text-secondary">지급 대기</span>
                  <span className="font-medium text-modern-warning">
                    {formatPrice(dashboard?.totalStats.pendingCommission || 0)}
                  </span>
                </div>
                <div className="pt-3 border-t border-modern-border-primary">
                  <p className="text-xs text-modern-text-secondary mb-2">
                    다음 정산일: 2024년 3월 25일
                  </p>
                  <Button size={"sm" as const} variant={"outline" as const} className="w-full">
                    정산 내역 보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>인기 추천 링크</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard?.referralLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-modern-bg-tertiary rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{link.name}</p>
                      <p className="text-xs text-modern-text-secondary">
                        클릭 {link.clicks.toLocaleString()}회
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-modern-text-tertiary" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 추천 링크 탭 */}
        <TabsContent value="links" className="space-y-6">
          <ReferralLinkGenerator
            referralCode={partnerData?.referralCode || ''}
            userName={user?.name}
          />
        </TabsContent>

        {/* 커미션 탭 */}
        <TabsContent value="commission" className="space-y-6">
          <CommissionHistory partnerUserId={partnerData?.id || ''} />
        </TabsContent>

        {/* 도구 탭 */}
        <TabsContent value="toolkit" className="space-y-6">
          <ReferralToolkit
            referralCode={partnerData?.referralCode || ''}
            userName={user?.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerPerformanceDashboard;