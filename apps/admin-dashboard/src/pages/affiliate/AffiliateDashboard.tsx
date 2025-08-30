import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Share2, BarChart3, Calendar, Activity, MousePointer, Zap, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReferralLinkGenerator } from '@/components/affiliate/ReferralLinkGenerator';
import { RealTimeActivity } from '@/components/affiliate/RealTimeActivity';
import { ClickAnalytics } from '@/components/affiliate/ClickAnalytics';
import { AffiliateNotifications } from '@/components/affiliate/AffiliateNotifications';
import { useAuth } from '@o4o/auth-context';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { getAffiliateUser, getAffiliateStats } from '@/api/affiliate';
import toast from 'react-hot-toast';

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [affiliateUser, setAffiliateUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      
      // Get affiliate user data
      const affiliateData = await getAffiliateUser();
      if (affiliateData) {
        setAffiliateUser(affiliateData);
        
        // Get stats for the current month
        const statsData = await getAffiliateStats({
          affiliateId: affiliateData.id,
          period: 'month'
        });
        
        if (statsData?.success) {
          setStats(statsData.data);
          
          // Generate chart data from stats
          const chartData = generateChartData(statsData.data);
          setChartData(chartData);
        }
      } else {
        // Use mock data if no affiliate account exists
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
        setStats(mockStats);
        setChartData(generateMockChartData());
      }
    } catch (error) {
      toast.error('데이터를 불러오는데 실패했습니다.');
      // Use mock data as fallback
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
      setStats(mockStats);
      setChartData(generateMockChartData());
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (statsData) => {
    // Generate last 7 days data from API stats
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        clicks: Math.floor(statsData.monthlyClicks / 7 * (0.8 + Math.random() * 0.4)),
        signups: Math.floor(statsData.monthlySignups / 7 * (0.8 + Math.random() * 0.4)),
        orders: Math.floor(statsData.monthlyOrders / 7 * (0.8 + Math.random() * 0.4)),
        commission: Math.floor(statsData.monthlyCommission / 7 * (0.8 + Math.random() * 0.4)),
      };
    });
  };

  const generateMockChartData = () => {
    return [
      { date: '3/25', clicks: 45, signups: 3, orders: 2, commission: 12000 },
      { date: '3/26', clicks: 52, signups: 4, orders: 3, commission: 18000 },
      { date: '3/27', clicks: 38, signups: 2, orders: 1, commission: 8000 },
      { date: '3/28', clicks: 65, signups: 5, orders: 4, commission: 25000 },
      { date: '3/29', clicks: 43, signups: 3, orders: 2, commission: 15000 },
      { date: '3/30', clicks: 58, signups: 4, orders: 3, commission: 22000 },
      { date: '3/31', clicks: 49, signups: 3, orders: 2, commission: 14000 },
    ];
  };
  
  const mockReferralCode = affiliateUser?.affiliateCode || 'DEMO123';
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

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
        <Badge variant={"outline" as const} className="text-modern-success">
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
                    ₩{stats?.pendingCommission?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-modern-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">예상 지급액</span>
                  <span className="text-lg font-bold text-modern-primary">
                    ₩{stats?.pendingCommission?.toLocaleString() || '0'}
                  </span>
                </div>
                <p className="text-xs text-modern-text-secondary mb-3">
                  매월 25일 지급 예정
                </p>
                <Button size={"sm" as const} className="w-full">
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

              <Button variant={"outline" as const} size={"sm" as const} className="w-full mt-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 클릭 및 가입 추이 */}
            <div>
              <h4 className="text-sm font-medium text-modern-text-secondary mb-4">클릭 및 가입 추이</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666"
                      fontSize={12}
                    />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend fontSize={12} />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="클릭수"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="signups" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="가입수"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* 주문 및 수수료 추이 */}
            <div>
              <h4 className="text-sm font-medium text-modern-text-secondary mb-4">주문 및 수수료 추이</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666"
                      fontSize={12}
                    />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value, name) => {
                        if (name === '수수료') {
                          return [`₩${value.toLocaleString()}`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend fontSize={12} />
                    <Bar dataKey="orders" fill="#f59e0b" name="주문수" />
                    <Area 
                      type="monotone" 
                      dataKey="commission" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3}
                      name="수수료"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Tracking and Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-modern-primary" />
            실시간 추적 및 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="realtime" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="realtime" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                실시간 활동
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                클릭 분석
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                알림센터
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="realtime" className="space-y-6">
              <RealTimeActivity 
                referralCode={mockReferralCode}
                maxEvents={15}
              />
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-6">
              <ClickAnalytics 
                referralCode={mockReferralCode}
                period="7d"
              />
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <AffiliateNotifications 
                referralCode={mockReferralCode}
                onNotificationClick={(notification) => {
                  console.log('Notification clicked:', notification);
                  // Handle notification click (e.g., navigate to relevant section)
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateDashboard;