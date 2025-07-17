/**
 * User Activity Trend Chart
 * 사용자 활동 트렌드 차트 (Recharts 막대 차트)
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  LineChart,
  TooltipProps
} from 'recharts';
import { Users, UserPlus, Activity, TrendingUp } from 'lucide-react';

interface UserData {
  date: string;
  newUsers: number;
  activeUsers: number;
}

interface UserChartProps {
  data: UserData[];
  isLoading?: boolean;
}

const UserChart: React.FC<UserChartProps> = ({ data, isLoading = false }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'combined'>('bar');

  // 데이터 가공
  const processedData = useMemo(() => {
    if (!data.length) {
      // 기본 데이터 (최근 7일)
      const defaultData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        defaultData.push({
          date: date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
          }),
          shortDate: date.toLocaleDateString('ko-KR', {
            month: 'numeric',
            day: 'numeric'
          }),
          fullDate: date.toISOString().split('T')[0],
          newUsers: Math.floor(Math.random() * 20) + 5,
          activeUsers: Math.floor(Math.random() * 100) + 50,
          dayOfWeek: date.toLocaleDateString('ko-KR', { weekday: 'short' })
        });
      }
      
      return defaultData;
    }

    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      }),
      shortDate: new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric'
      }),
      dayOfWeek: new Date(item.date).toLocaleDateString('ko-KR', { weekday: 'short' })
    }));
  }, [data]);

  // 통계 계산
  const stats = useMemo(() => {
    if (!processedData.length) return { 
      totalNewUsers: 0, 
      avgActiveUsers: 0, 
      peakDay: '', 
      growthRate: 0 
    };

    const totalNewUsers = processedData.reduce((sum, item) => sum + item.newUsers, 0);
    const avgActiveUsers = processedData.reduce((sum, item) => sum + item.activeUsers, 0) / processedData.length;
    
    // 가장 활성 사용자가 많은 날
    const peakDayData = processedData.reduce((max, item) => 
      item.activeUsers > max.activeUsers ? item : max
    );
    
    // 성장률 (첫째 날 vs 마지막 날 신규 사용자)
    const firstDay = processedData[0]?.newUsers || 0;
    const lastDay = processedData[processedData.length - 1]?.newUsers || 0;
    const growthRate = firstDay > 0 ? ((lastDay - firstDay) / firstDay) * 100 : 0;

    return {
      totalNewUsers,
      avgActiveUsers: Math.round(avgActiveUsers),
      peakDay: peakDayData.date,
      growthRate
    };
  }, [processedData]);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload && payload.map((entry, index: number) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-sm text-gray-600">{entry.name}:</span>
                <span className="text-sm font-semibold text-gray-900 ml-1">
                  {entry.value?.toLocaleString() || 0}
                  {entry.dataKey === 'newUsers' ? '명' : '명'}
                </span>
              </div>
            ))}
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

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="shortDate" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="newUsers" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
              name="신규 사용자"
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
              name="활성 사용자"
            />
          </LineChart>
        );

      case 'combined':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="shortDate" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="newUsers" 
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              name="신규 사용자"
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
              name="활성 사용자"
            />
          </ComposedChart>
        );

      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="shortDate" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="newUsers" 
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              name="신규 사용자"
            />
            <Bar 
              dataKey="activeUsers" 
              fill="#10b981"
              radius={[2, 2, 0, 0]}
              name="활성 사용자"
            />
          </BarChart>
        );
    }
  };

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="wp-card-title">사용자 활동 트렌드</h3>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                chartType === 'bar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              막대
            </button>
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
              onClick={() => setChartType('combined')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                chartType === 'combined' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              혼합
            </button>
          </div>
        </div>
      </div>

      <div className="wp-card-body">
        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserPlus className="w-4 h-4 text-blue-600 mr-1" />
              <p className="text-xs text-gray-500">신규 가입</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.totalNewUsers.toLocaleString()}명
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-green-600 mr-1" />
              <p className="text-xs text-gray-500">평균 활성</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.avgActiveUsers.toLocaleString()}명
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600 mr-1" />
              <p className="text-xs text-gray-500">최고 활성일</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.peakDay}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className={`w-4 h-4 mr-1 ${
                stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
              <p className="text-xs text-gray-500">성장률</p>
            </div>
            <p className={`text-lg font-bold ${
              stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.growthRate > 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Weekly Summary */}
        <div className="mt-6 grid grid-cols-7 gap-2">
          {processedData.map((item, index) => (
            <div key={index} className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs font-medium text-gray-700">{item.dayOfWeek}</p>
              <p className="text-xs text-blue-600">{item.newUsers}명</p>
              <p className="text-xs text-green-600">{item.activeUsers}명</p>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <Activity className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            최근 7일간 사용자 활동 패턴을 분석한 결과입니다
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserChart;