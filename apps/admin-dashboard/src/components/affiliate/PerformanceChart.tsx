import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatPrice } from '@/utils/vendorUtils';

interface PerformanceChartProps {
  period: 'today' | 'week' | 'month' | 'year';
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ period }) => {
  // 기간별 더미 데이터 생성
  const generateChartData = () => {
    switch (period) {
      case 'today':
        return Array.from({ length: 24 }, (_, i) => ({
          label: `${i}시`,
          clicks: Math.floor(Math.random() * 20) + 5,
          signups: Math.floor(Math.random() * 3),
          orders: Math.floor(Math.random() * 2),
          revenue: Math.floor(Math.random() * 500000)
        }));
      
      case 'week':
        const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
        return weekDays.map((day) => ({
          label: day,
          clicks: Math.floor(Math.random() * 50) + 20,
          signups: Math.floor(Math.random() * 10) + 2,
          orders: Math.floor(Math.random() * 8) + 1,
          revenue: Math.floor(Math.random() * 2000000) + 100000
        }));
      
      case 'month':
        return Array.from({ length: 30 }, (_, i) => ({
          label: `${i + 1}일`,
          clicks: Math.floor(Math.random() * 30) + 10,
          signups: Math.floor(Math.random() * 5) + 1,
          orders: Math.floor(Math.random() * 4),
          revenue: Math.floor(Math.random() * 1000000) + 50000
        }));
      
      case 'year':
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        return months.map((month) => ({
          label: month,
          clicks: Math.floor(Math.random() * 500) + 100,
          signups: Math.floor(Math.random() * 50) + 10,
          orders: Math.floor(Math.random() * 40) + 5,
          revenue: Math.floor(Math.random() * 10000000) + 500000
        }));
      
      default:
        return [];
    }
  };

  const data = generateChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-modern-border-primary rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'revenue' 
                  ? formatPrice(entry.value)
                  : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 클릭 및 전환 차트 */}
      <div>
        <h4 className="text-sm font-medium text-modern-text-secondary mb-4">
          클릭 및 전환 추이
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="label" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="clicks" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="클릭"
            />
            <Line 
              type="monotone" 
              dataKey="signups" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="가입"
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="구매"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 수익 차트 */}
      <div>
        <h4 className="text-sm font-medium text-modern-text-secondary mb-4">
          추천 수익
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="label" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="revenue" 
              fill="#8b5cf6" 
              radius={[4, 4, 0, 0]}
              name="수익"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};