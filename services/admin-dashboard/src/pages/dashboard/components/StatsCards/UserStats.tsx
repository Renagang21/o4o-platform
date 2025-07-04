/**
 * User Statistics Card
 * 사용자 현황 통계 카드
 */

import React from 'react';
import { Users, UserCheck, UserPlus, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface UserStatsProps {
  data?: {
    total: number;
    pending: number;
    today: number;
    activeRate: number;
    change: number;
    trend: 'up' | 'down';
  };
  isLoading?: boolean;
}

const UserStats: React.FC<UserStatsProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="wp-card animate-pulse">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="mt-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    total = 0,
    pending = 0,
    today = 0,
    activeRate = 0,
    change = 0,
    trend = 'up'
  } = data || {};

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-600">전체 사용자</h3>
              {pending > 0 && (
                <div className="ml-2 flex items-center">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600 ml-1">
                    {pending}명 승인 대기
                  </span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(total)}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center">
              <UserPlus className="w-3 h-3 text-green-600 mr-1" />
              <span className="text-xs text-gray-600">오늘 가입</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatNumber(today)}명
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center">
              <UserCheck className="w-3 h-3 text-blue-600 mr-1" />
              <span className="text-xs text-gray-600">활성률</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatPercentage(activeRate)}
            </p>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(Math.abs(change))}
          </span>
          <span className="text-gray-500 ml-1">지난 달 대비</span>
        </div>

        {/* Pending Users Alert */}
        {pending > 0 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-xs text-red-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              <span>
                <strong>{pending}명</strong>의 사용자가 승인을 기다리고 있습니다
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStats;