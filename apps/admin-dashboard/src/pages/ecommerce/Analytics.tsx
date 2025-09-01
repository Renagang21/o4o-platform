import { FC, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    chart: Array<{ date: string; value: number }>;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    averageValue: number;
    chart: Array<{ date: string; count: number; value: number }>;
  };
  products: {
    topSelling: Array<{ id: string; name: string; sales: number; revenue: number }>;
    lowStock: Array<{ id: string; name: string; stock: number; reorderPoint: number }>;
    categories: Array<{ name: string; sales: number; percentage: number }>;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    churnRate: number;
    lifetime: number;
    segments: Array<{ segment: string; count: number; value: number }>;
  };
  inventory: {
    totalValue: number;
    turnoverRate: number;
    deadStock: number;
    avgDaysToSell: number;
  };
}

const EcommerceAnalytics: FC = () => {
  const [period, setPeriod] = useState('month');
  const [compareMode, setCompareMode] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['ecommerce-analytics', period],
    queryFn: async () => {
      const response = await authClient.api.get(`/analytics/ecommerce?period=${period}`);
      return response.data?.data as AnalyticsData;
    }
  });

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    revenue: {
      current: 1250000,
      previous: 980000,
      growth: 27.55,
      chart: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: Math.floor(Math.random() * 50000 + 30000)
      }))
    },
    orders: {
      total: 324,
      completed: 280,
      pending: 32,
      cancelled: 12,
      averageValue: 85000,
      chart: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        count: Math.floor(Math.random() * 50 + 30),
        value: Math.floor(Math.random() * 100000 + 50000)
      }))
    },
    products: {
      topSelling: [
        { id: '1', name: '프리미엄 노트북 스탠드', sales: 89, revenue: 2670000 },
        { id: '2', name: '무선 충전 패드', sales: 76, revenue: 1520000 },
        { id: '3', name: '블루투스 이어폰', sales: 64, revenue: 1920000 },
        { id: '4', name: '스마트워치 스트랩', sales: 52, revenue: 520000 },
        { id: '5', name: 'USB-C 허브', sales: 48, revenue: 1440000 }
      ],
      lowStock: [
        { id: '1', name: '프리미엄 노트북 스탠드', stock: 5, reorderPoint: 20 },
        { id: '2', name: '무선 충전 패드', stock: 8, reorderPoint: 15 },
        { id: '3', name: '블루투스 이어폰', stock: 3, reorderPoint: 25 }
      ],
      categories: [
        { name: '전자제품', sales: 450, percentage: 45 },
        { name: '액세서리', sales: 280, percentage: 28 },
        { name: '가전제품', sales: 180, percentage: 18 },
        { name: '기타', sales: 90, percentage: 9 }
      ]
    },
    customers: {
      total: 1234,
      new: 234,
      returning: 1000,
      churnRate: 5.2,
      lifetime: 520000,
      segments: [
        { segment: 'VIP', count: 123, value: 1560000 },
        { segment: '일반', count: 890, value: 890000 },
        { segment: '신규', count: 221, value: 221000 }
      ]
    },
    inventory: {
      totalValue: 8900000,
      turnoverRate: 4.2,
      deadStock: 120000,
      avgDaysToSell: 18
    }
  };

  const data = analyticsData || mockData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate max values for chart scaling
  const maxRevenue = Math.max(...data.revenue.chart.map(d => d.value));
  const maxOrderCount = Math.max(...data.orders.chart.map(d => d.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-Commerce Analytics</h1>
          <p className="text-muted-foreground">실시간 판매 분석 및 인사이트</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            보고서 다운로드
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{data.revenue.current.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {data.revenue.growth > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{data.revenue.growth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{data.revenue.growth}%</span>
                </>
              )}
              <span className="ml-1">전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">주문 수</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.orders.total}</div>
            <div className="text-xs text-muted-foreground">
              평균 주문액: ₩{data.orders.averageValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고객 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customers.total}</div>
            <div className="text-xs text-muted-foreground">
              신규: {data.customers.new} | 재구매: {data.customers.returning}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 회전율</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inventory.turnoverRate}x</div>
            <div className="text-xs text-muted-foreground">
              평균 판매 소요일: {data.inventory.avgDaysToSell}일
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">매출 분석</TabsTrigger>
          <TabsTrigger value="products">상품 분석</TabsTrigger>
          <TabsTrigger value="customers">고객 분석</TabsTrigger>
          <TabsTrigger value="inventory">재고 분석</TabsTrigger>
        </TabsList>

        {/* Revenue Analysis */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>매출 추이</CardTitle>
              <CardDescription>일별 매출 변화</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Text-based area chart */}
              <div className="space-y-4">
                <div className="flex items-end gap-1 h-48">
                  {data.revenue.chart.slice(-14).map((item, index) => {
                    const heightPercent = (item.value / maxRevenue) * 100;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400 transition-colors relative group"
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.date}: ₩${item.value.toLocaleString()}`}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          ₩{(item.value / 1000).toFixed(0)}k
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{data.revenue.chart[0]?.date}</span>
                  <span>{data.revenue.chart[data.revenue.chart.length - 1]?.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>주문 상태별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">완료</span>
                      <span className="text-sm font-medium">{data.orders.completed}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${(data.orders.completed / data.orders.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">진행중</span>
                      <span className="text-sm font-medium">{data.orders.pending}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-yellow-500 rounded-full"
                        style={{ width: `${(data.orders.pending / data.orders.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">취소</span>
                      <span className="text-sm font-medium">{data.orders.cancelled}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-red-500 rounded-full"
                        style={{ width: `${(data.orders.cancelled / data.orders.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>총 주문</span>
                      <span>{data.orders.total}건</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>일별 주문 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.orders.chart.slice(-7).map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">{item.date}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div
                          className="h-6 bg-green-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(item.count / maxOrderCount) * 100}%` }}
                        >
                          <span className="text-xs text-white font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Analysis */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>베스트셀러 TOP 5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.products.topSelling.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sales}개 판매</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₩{product.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>카테고리별 판매</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.products.categories.map((category, index) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{category.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{category.sales}개</span>
                            <Badge variant="outline">{category.percentage}%</Badge>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>재고 부족 상품</CardTitle>
              <CardDescription>재주문이 필요한 상품 목록</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.products.lowStock.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        재주문 기준: {product.reorderPoint}개
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={product.stock < 5 ? 'destructive' : 'outline'}>
                        재고: {product.stock}개
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Analysis */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>고객 세그먼트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.customers.segments.map((segment) => (
                    <div key={segment.segment} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{segment.segment}</span>
                        <span className="text-sm text-gray-600">{segment.count}명</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        평균 구매액: ₩{Math.floor(segment.value / segment.count).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>고객 지표</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">이탈률</span>
                    <span className="font-medium">{data.customers.churnRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">생애가치</span>
                    <span className="font-medium">₩{data.customers.lifetime.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">재구매율</span>
                    <span className="font-medium">
                      {((data.customers.returning / data.customers.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>신규 vs 재구매</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{data.customers.new}</div>
                    <div className="text-sm text-muted-foreground">신규 고객</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{data.customers.returning}</div>
                    <div className="text-sm text-muted-foreground">재구매 고객</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Analysis */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">총 재고 가치</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩{data.inventory.totalValue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">재고 회전율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.inventory.turnoverRate}x</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">사재고 가치</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₩{data.inventory.deadStock.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">평균 판매 소요일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.inventory.avgDaysToSell}일</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcommerceAnalytics;