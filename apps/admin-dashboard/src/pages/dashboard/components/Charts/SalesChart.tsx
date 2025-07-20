/**
 * Sales Analysis Chart
 * 매출 분석 차트 (Recharts)
 */

import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

interface SalesData {
  date: string;
  amount: number;
  orders: number;
}

interface SalesChartProps {
  data: SalesData[];
  isLoading?: boolean;
}

const SalesChart: React.FC<SalesChartProps> = ({ data, isLoading = false }) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // 데이터 필터링 및 가공
  const processedData = useMemo(() => {
    if (!data || !data.length) {
      // Generate sample data if no data available
      const sampleData = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        sampleData.push({
          date: date.toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 5000000) + 1000000,
          orders: Math.floor(Math.random() * 50) + 10
        });
      }
      data = sampleData;
    }

    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const filteredData = data.slice(-periodDays[period]);

    return filteredData.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      }),
      formattedAmount: new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(item.amount)
    }));
  }, [data, period]);

  // 통계 계산
  const stats = useMemo(() => {
    if (!processedData.length) return { total: 0, average: 0, highest: 0, growth: 0 };

    const total = processedData.reduce((sum, item) => sum + item.amount, 0);
    const average = total / processedData.length;
    const highest = Math.max(...processedData.map(item => item.amount));
    
    // 성장률 계산 (첫째 날 vs 마지막 날)
    const firstDay = processedData[0]?.amount || 0;
    const lastDay = processedData[processedData.length - 1]?.amount || 0;
    const growth = firstDay > 0 ? ((lastDay - firstDay) / firstDay) * 100 : 0;

    return { total, average, highest, growth };
  }, [processedData]);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">매출:</span>
              <span className="text-sm font-semibold text-gray-900 ml-1">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(payload[0]?.value || 0)}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">주문:</span>
              <span className="text-sm font-semibold text-gray-900 ml-1">
                {payload[1]?.value}건
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="wp-card-body">
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="wp-card-title">매출 분석</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Chart Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  chartType === 'line' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                라인
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  chartType === 'area' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                영역
              </button>
            </div>

            {/* Period Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    period === p 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wp-card-body">
        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">총 매출</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(stats.total)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">일 평균</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(stats.average)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">최고 매출</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(stats.highest)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">성장률</p>
            <p className={`text-lg font-bold ${
              stats.growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('ko-KR', {
                      notation: 'compact',
                      maximumFractionDigits: 0
                    }).format(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#1d4ed8' }}
                  name="매출"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                  yAxisId="right"
                  name="주문 수"
                />
              </LineChart>
            ) : (
              <AreaChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => 
                    new Intl.NumberFormat('ko-KR', {
                      notation: 'compact',
                      maximumFractionDigits: 0
                    }).format(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                  name="매출"
                />
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Info */}
        <div className="mt-4 flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1" />
          <span>
            최근 {period === '7d' ? '7일' : period === '30d' ? '30일' : '90일'} 
            매출 추이를 보여줍니다
          </span>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;