/**
 * Order Status Distribution Chart
 * 주문 현황 분석 차트 (Recharts 도넛 차트)
 */

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';

interface OrderData {
  status: string;
  count: number;
  color: string;
}

interface OrderChartProps {
  data: OrderData[];
  isLoading?: boolean;
}

const OrderChart: React.FC<OrderChartProps> = ({ data, isLoading = false }) => {
  // 데이터 가공
  const processedData = useMemo(() => {
    if (!data.length) {
      // 기본 데이터
      return [
        { status: '처리중', count: 45, color: '#3b82f6', percentage: 32.1 },
        { status: '배송중', count: 23, color: '#f59e0b', percentage: 16.4 },
        { status: '완료', count: 67, color: '#10b981', percentage: 47.9 },
        { status: '취소', count: 5, color: '#ef4444', percentage: 3.6 }
      ];
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.count / total) * 100 : 0
    }));
  }, [data]);

  const totalOrders = processedData.reduce((sum, item) => sum + item.count, 0);
  const completedOrders = processedData.find(item => item.status === '완료')?.count || 0;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center mb-2">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: data.color }}
            ></div>
            <span className="text-sm font-medium text-gray-900">{data.status}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              주문 수: <span className="font-semibold text-gray-900">{data.count}건</span>
            </p>
            <p className="text-sm text-gray-600">
              비율: <span className="font-semibold text-gray-900">{data.percentage.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 커스텀 라벨
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // 5% 미만은 라벨 숨김

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="wp-card-body">
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center">
          <Package className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="wp-card-title">주문 현황</h3>
        </div>
      </div>

      <div className="wp-card-body">
        {/* Summary Stats */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">총 주문</p>
              <p className="text-xl font-bold text-gray-900">
                {totalOrders.toLocaleString()}건
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">완료율</p>
              <p className="text-xl font-bold text-green-600">
                {completionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="count"
                stroke="none"
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status List */}
        <div className="space-y-3">
          {processedData.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {item.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">
                  {item.count}건
                </span>
                <span className="text-xs text-gray-500">
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Indicator */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center text-sm">
            <TrendingUp className={`w-4 h-4 mr-2 ${
              completionRate >= 70 ? 'text-green-500' : 
              completionRate >= 50 ? 'text-yellow-500' : 'text-red-500'
            }`} />
            <span className="text-gray-600">
              완료율이 
              <span className={`font-medium ml-1 ${
                completionRate >= 70 ? 'text-green-600' : 
                completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {completionRate >= 70 ? '우수' : 
                 completionRate >= 50 ? '보통' : '개선 필요'}
              </span>
              합니다
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="text-xs py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            처리 대기 보기
          </button>
          <button className="text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            배송 현황 확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderChart;