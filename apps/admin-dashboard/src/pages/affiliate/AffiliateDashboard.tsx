import { TrendingUp, Users, DollarSign, Share2, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferralLinkGenerator } from '@/components/affiliate/ReferralLinkGenerator';
import { useAuth } from '@o4o/auth-context';

const AffiliateDashboard = () => {
  const { user } = useAuth();
  
  // 실제로는 API에서 데이터를 가져와야 함
  const mockReferralCode = 'KIM123ABC';
  const mockStats = {
    monthlyClicks: 245,
    monthlySignups: 18,
    monthlyOrders: 12,
    monthlyRevenue: 1234000,
    monthlyCommission: 61700,
    totalSignups: 156,
    totalRevenue: 8765000,
    paidCommission: 350000,
    pendingCommission: 125000,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">
            추천인 대시보드
          </h1>
          <p className="text-modern-text-secondary mt-1">
            추천 실적과 수수료를 확인하세요
          </p>
        </div>
        <Badge variant="outline" className="text-modern-success">
          <div className="w-2 h-2 rounded-full bg-modern-success mr-2" />
          활성
        </Badge>
      </div>

      {/* 이번 달 실적 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 클릭</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {mockStats.monthlyClicks.toLocaleString()}
                </p>
                <p className="text-xs text-modern-success mt-1">+12.5%</p>
              </div>
              <Share2 className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 가입</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {mockStats.monthlySignups}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  전환율 {((mockStats.monthlySignups / mockStats.monthlyClicks) * 100).toFixed(1)}%
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
                <p className="text-sm text-modern-text-secondary">이번 달 주문</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {mockStats.monthlyOrders}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  구매율 {((mockStats.monthlyOrders / mockStats.monthlySignups) * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 수수료</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{mockStats.monthlyCommission.toLocaleString()}
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">
                  수수료율 5%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 추천 링크 생성기 (2열) */}
        <div className="lg:col-span-2">
          <ReferralLinkGenerator 
            referralCode={mockReferralCode}
            userName={user?.name || '회원'}
          />
        </div>

        {/* 수수료 현황 (1열) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-modern-primary" />
                수수료 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-modern-text-secondary">총 수익</span>
                  <span className="font-medium">
                    ₩{mockStats.totalRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-modern-text-secondary">지급 완료</span>
                  <span className="font-medium text-modern-success">
                    ₩{mockStats.paidCommission.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-modern-text-secondary">지급 대기</span>
                  <span className="font-medium text-modern-warning">
                    ₩{mockStats.pendingCommission.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-modern-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">예상 지급액</span>
                  <span className="text-lg font-bold text-modern-primary">
                    ₩{mockStats.pendingCommission.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-modern-text-secondary mb-3">
                  매월 25일 지급 예정
                </p>
                <Button size="sm" className="w-full">
                  지급 내역 보기
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 최근 활동 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-modern-primary" />
                최근 추천 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-modern-success mt-1.5" />
                  <div className="flex-1">
                    <p className="text-sm text-modern-text-primary">
                      새로운 회원 가입
                    </p>
                    <p className="text-xs text-modern-text-secondary">
                      2시간 전
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-modern-warning mt-1.5" />
                  <div className="flex-1">
                    <p className="text-sm text-modern-text-primary">
                      주문 완료 (₩89,000)
                    </p>
                    <p className="text-xs text-modern-text-secondary">
                      5시간 전 • 수수료 ₩4,450
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-modern-primary mt-1.5" />
                  <div className="flex-1">
                    <p className="text-sm text-modern-text-primary">
                      추천 링크 클릭
                    </p>
                    <p className="text-xs text-modern-text-secondary">
                      1일 전 • 카카오톡
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4">
                전체 활동 보기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 추천 성과 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-modern-primary" />
            월별 추천 성과
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-modern-text-secondary">
            차트 컴포넌트가 여기에 표시됩니다
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateDashboard;