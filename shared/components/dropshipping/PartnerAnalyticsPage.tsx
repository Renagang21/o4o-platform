import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart,
  PieChart as RechartsPieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// 일별 클릭 데이터
const dailyClickData = [
  { date: '6/20', clicks: 245, conversions: 8 },
  { date: '6/21', clicks: 312, conversions: 12 },
  { date: '6/22', clicks: 289, conversions: 9 },
  { date: '6/23', clicks: 356, conversions: 15 },
  { date: '6/24', clicks: 298, conversions: 11 },
  { date: '6/25', clicks: 412, conversions: 18 },
  { date: '6/26', clicks: 389, conversions: 14 },
  { date: '6/27', clicks: 445, conversions: 19 },
  { date: '6/28', clicks: 478, conversions: 22 },
  { date: '6/29', clicks: 423, conversions: 17 },
];

// 시간대별 클릭 분포
const hourlyClickData = [
  { hour: '00-04', clicks: 120 },
  { hour: '04-08', clicks: 89 },
  { hour: '08-12', clicks: 345 },
  { hour: '12-16', clicks: 456 },
  { hour: '16-20', clicks: 523 },
  { hour: '20-24', clicks: 298 },
];

// 유입 경로별 분석
const trafficSourceData = [
  { name: '소셜미디어', value: 45, color: '#4F46E5' },
  { name: '블로그', value: 30, color: '#7C3AED' },
  { name: '이메일', value: 15, color: '#EC4899' },
  { name: '직접유입', value: 10, color: '#F59E0B' },
];

// 상품별 전환율
const productConversionData = [
  { product: '스마트폰 케이스', rate: 4.2, conversions: 45 },
  { product: '무선 이어폰', rate: 3.8, conversions: 38 },
  { product: '충전 케이블', rate: 3.5, conversions: 32 },
  { product: '보호필름', rate: 2.9, conversions: 28 },
  { product: '차량용 충전기', rate: 2.5, conversions: 22 },
];

// 퍼널 분석 데이터
const funnelData = [
  { stage: '클릭', value: 12450, percentage: 100 },
  { stage: '상품 조회', value: 8234, percentage: 66.1 },
  { stage: '장바구니', value: 2456, percentage: 19.7 },
  { stage: '결제 시작', value: 892, percentage: 7.2 },
  { stage: '구매 완료', value: 398, percentage: 3.2 },
];

// 일별 커미션 데이터
const dailyCommissionData = [
  { date: '6/20', commission: 12500 },
  { date: '6/21', commission: 18900 },
  { date: '6/22', commission: 15600 },
  { date: '6/23', commission: 22300 },
  { date: '6/24', commission: 19800 },
  { date: '6/25', commission: 28900 },
  { date: '6/26', commission: 24500 },
  { date: '6/27', commission: 31200 },
  { date: '6/28', commission: 35600 },
  { date: '6/29', commission: 29800 },
];

// 캠페인별 수익 기여도
const campaignRevenueData = [
  { name: '스마트폰 액세서리', value: 35, color: '#4F46E5' },
  { name: '여름 전자기기', value: 25, color: '#7C3AED' },
  { name: '무선 오디오', value: 20, color: '#EC4899' },
  { name: '충전 액세서리', value: 12, color: '#F59E0B' },
  { name: '기타', value: 8, color: '#10B981' },
];

// 성과 테이블 데이터
const performanceTableData = [
  {
    date: '2025-06-29',
    campaign: '스마트폰 액세서리',
    clicks: 478,
    conversions: 22,
    conversionRate: 4.6,
    commission: 35600,
    change: 12.5
  },
  {
    date: '2025-06-28',
    campaign: '여름 전자기기',
    clicks: 356,
    conversions: 15,
    conversionRate: 4.2,
    commission: 28900,
    change: -5.2
  },
  {
    date: '2025-06-27',
    campaign: '무선 오디오',
    clicks: 298,
    conversions: 11,
    conversionRate: 3.7,
    commission: 19800,
    change: 8.3
  },
];

export const PartnerAnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('7days');
  const [activeTab, setActiveTab] = useState('traffic');
  const [tableView, setTableView] = useState('date');

  const handleExport = () => {
    // 실제로는 데이터를 CSV/Excel로 내보내기
    console.log('Exporting analytics data...');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">성과 분석</h1>
          <p className="text-gray-600 mt-1">캠페인 성과 및 수익 분석</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          리포트 내보내기
        </Button>
      </div>

      {/* 기간 선택 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex gap-2">
              {['7days', '30days', '3months', '6months'].map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                >
                  {range === '7days' && '최근 7일'}
                  {range === '30days' && '30일'}
                  {range === '3months' && '3개월'}
                  {range === '6months' && '6개월'}
                </Button>
              ))}
            </div>
            <div className="ml-auto text-sm text-gray-500">
              2025년 6월 23일 - 6월 29일
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 핵심 지표 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>총 클릭수</span>
              <MousePointer className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                일평균 415
              </Badge>
              <span className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                15.2%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>전환율</span>
              <Target className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                업계 평균 2.8%
              </Badge>
              <span className="text-xs text-green-600">우수</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>평균 주문금액</span>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩45,000</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                전체 대비 +12%
              </Badge>
              <span className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                8.5%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>ROI</span>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">285%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                수익 ÷ 비용
              </Badge>
              <span className="text-xs text-green-600">매우 우수</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 성과 차트 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>상세 분석</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="traffic" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  트래픽
                </TabsTrigger>
                <TabsTrigger value="conversion" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  전환
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  수익
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <TabsContent value={activeTab}>
            {activeTab === 'traffic' && (
              <div className="space-y-6">
                {/* 일별 클릭 수 추이 */}
                <div>
                  <h3 className="text-sm font-medium mb-4">일별 클릭 수 추이</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={dailyClickData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#4F46E5" 
                        strokeWidth={2}
                        name="클릭 수"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>

                {/* 시간대별 클릭 분포 & 유입 경로 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">시간대별 클릭 분포</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={hourlyClickData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#7C3AED" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4">유입 경로별 분석</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={trafficSourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {trafficSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conversion' && (
              <div className="space-y-6">
                {/* 일별 전환 수 추이 */}
                <div>
                  <h3 className="text-sm font-medium mb-4">일별 전환 추이</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={dailyClickData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="conversions" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="전환 수"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>

                {/* 상품별 전환율 & 퍼널 분석 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">상품별 전환율</h3>
                    <div className="space-y-3">
                      {productConversionData.map((product, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{product.product}</span>
                            <span className="text-sm font-medium">{product.rate}%</span>
                          </div>
                          <Progress value={product.rate * 20} className="h-2" />
                          <div className="text-xs text-gray-500">
                            {product.conversions}건 전환
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4">퍼널 분석</h3>
                    <div className="space-y-3">
                      {funnelData.map((stage, index) => (
                        <div key={index} className="relative">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{stage.stage}</span>
                            <span className="text-sm">{stage.value.toLocaleString()}명</span>
                          </div>
                          <div className="relative">
                            <Progress value={stage.percentage} className="h-8" />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                              {stage.percentage}%
                            </span>
                          </div>
                          {index < funnelData.length - 1 && (
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                              <TrendingDown className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-6">
                {/* 일별 커미션 추이 */}
                <div>
                  <h3 className="text-sm font-medium mb-4">일별 커미션 추이</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyCommissionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                      <Area 
                        type="monotone" 
                        dataKey="commission" 
                        stroke="#4F46E5" 
                        fill="#4F46E5"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 캠페인별 수익 기여도 & 상품별 수익 순위 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">캠페인별 수익 기여도</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={campaignRevenueData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {campaignRevenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4">상품별 수익 TOP 5</h3>
                    <div className="space-y-3">
                      {[
                        { name: '스마트폰 케이스', revenue: 89500, percentage: 28 },
                        { name: '무선 이어폰', revenue: 67800, percentage: 21 },
                        { name: '충전 케이블', revenue: 54300, percentage: 17 },
                        { name: '보호필름', revenue: 43200, percentage: 13 },
                        { name: '차량용 충전기', revenue: 38900, percentage: 12 },
                      ].map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                ₩{product.revenue.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{product.percentage}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Card>

      {/* 상세 성과 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>상세 성과 데이터</CardTitle>
            <Select value={tableView} onValueChange={setTableView}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">날짜별</SelectItem>
                <SelectItem value="campaign">캠페인별</SelectItem>
                <SelectItem value="product">상품별</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tableView === 'date' ? '날짜' : tableView === 'campaign' ? '캠페인' : '상품'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    클릭 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전환 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전환율
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    증감률
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceTableData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tableView === 'date' ? row.date : row.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.conversions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.conversionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₩{row.commission.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`flex items-center ${row.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.change > 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(row.change)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 내보내기 버튼 */}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};