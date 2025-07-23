import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Download,
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@o4o/ui';
import { formatCurrency } from '@o4o/utils';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Mock 데이터
const salesByMonth = [
  { month: '1월', sales: 3500000, orders: 45, avgOrderValue: 77777 },
  { month: '2월', sales: 4200000, orders: 52, avgOrderValue: 80769 },
  { month: '3월', sales: 3800000, orders: 48, avgOrderValue: 79166 },
  { month: '4월', sales: 5100000, orders: 63, avgOrderValue: 80952 },
  { month: '5월', sales: 6200000, orders: 78, avgOrderValue: 79487 },
  { month: '6월', sales: 7500000, orders: 92, avgOrderValue: 81521 },
];

const productPerformance = [
  { name: '무선 이어폰 Pro', sales: 234, revenue: 20826000, growth: 15.3 },
  { name: '스마트워치 Series 5', sales: 89, revenue: 26611000, growth: -5.2 },
  { name: '블루투스 스피커', sales: 156, revenue: 23244000, growth: 22.1 },
  { name: '태블릿 케이스', sales: 412, revenue: 16068000, growth: 8.7 },
  { name: '무선 충전기', sales: 67, revenue: 3953000, growth: -12.4 },
];

const categoryBreakdown = [
  { name: '전자제품', value: 45, revenue: 67500000, color: '#3B82F6' },
  { name: '액세서리', value: 25, revenue: 37500000, color: '#10B981' },
  { name: '의류', value: 20, revenue: 30000000, color: '#F59E0B' },
  { name: '생활용품', value: 10, revenue: 15000000, color: '#EF4444' },
];

const customerMetrics = [
  { month: '1월', newCustomers: 45, returningCustomers: 120 },
  { month: '2월', newCustomers: 52, returningCustomers: 135 },
  { month: '3월', newCustomers: 38, returningCustomers: 142 },
  { month: '4월', newCustomers: 61, returningCustomers: 155 },
  { month: '5월', newCustomers: 73, returningCustomers: 168 },
  { month: '6월', newCustomers: 89, returningCustomers: 185 },
];

export default function VendorAnalytics() {
  const [dateRange, setDateRange] = useState('month');
  const [_selectedMetric] = useState('sales');

  const totalSales = salesByMonth.reduce((sum, month) => sum + month.sales, 0);
  const totalOrders = salesByMonth.reduce((sum, month) => sum + month.orders, 0);
  const avgOrderValue = totalSales / totalOrders;
  const growthRate = ((salesByMonth[5].sales - salesByMonth[0].sales) / salesByMonth[0].sales * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 분석</h1>
          <p className="text-gray-600 mt-1">비즈니스 성과를 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="quarter">이번 분기</option>
            <option value="year">올해</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 매출</p>
                <p className="text-2xl font-bold mt-2">{formatCurrency(totalSales)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{growthRate}%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 주문</p>
                <p className="text-2xl font-bold mt-2">{totalOrders}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+23.5%</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 주문금액</p>
                <p className="text-2xl font-bold mt-2">{formatCurrency(avgOrderValue)}</p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-2.3%</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">신규 고객</p>
                <p className="text-2xl font-bold mt-2">358</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.7%</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 추이 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByMonth}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 매출 */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 매출 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryBreakdown.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(category.revenue)}</p>
                    <p className="text-xs text-gray-500">{category.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 고객 분석 */}
        <Card>
          <CardHeader>
            <CardTitle>고객 유형 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newCustomers" name="신규 고객" fill="#3B82F6" />
                  <Bar dataKey="returningCustomers" name="재구매 고객" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상품별 성과 */}
      <Card>
        <CardHeader>
          <CardTitle>상품별 판매 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left pb-3 font-medium text-gray-600">상품명</th>
                  <th className="text-right pb-3 font-medium text-gray-600">판매량</th>
                  <th className="text-right pb-3 font-medium text-gray-600">매출액</th>
                  <th className="text-right pb-3 font-medium text-gray-600">성장률</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map((product, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4">{product.name}</td>
                    <td className="py-4 text-right">{product.sales.toLocaleString()}</td>
                    <td className="py-4 text-right">{formatCurrency(product.revenue)}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end">
                        {product.growth > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={product.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                          {Math.abs(product.growth)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}