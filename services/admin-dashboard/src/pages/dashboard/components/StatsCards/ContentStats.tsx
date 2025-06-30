/**
 * Content Statistics Card
 * 콘텐츠 현황 통계 카드
 */

import React from 'react';
import { FileText, Eye, Image, Edit, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface ContentStatsProps {
  data?: {
    publishedPages: number;
    draftContent: number;
    totalMedia: number;
    todayViews: number;
    change: number;
    trend: 'up' | 'down';
  };
  isLoading?: boolean;
}

const ContentStats: React.FC<ContentStatsProps> = ({ data, isLoading = false }) => {
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
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    publishedPages = 0,
    draftContent = 0,
    totalMedia = 0,
    todayViews = 0,
    change = 0,
    trend = 'up'
  } = data || {};

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCompactNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  const hasDrafts = draftContent > 0;
  const hasHighViews = todayViews > 1000;

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-600">발행된 페이지</h3>
              {hasDrafts && (
                <div className="ml-2 flex items-center">
                  <Edit className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600 ml-1">
                    {draftContent}개 초안
                  </span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(publishedPages)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center">
              <Image className="w-3 h-3 text-blue-600 mr-1" />
              <span className="text-xs text-gray-600">미디어</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatCompactNumber(totalMedia)}개
            </p>
          </div>
          <div className={`rounded p-2 ${hasHighViews ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <Eye className={`w-3 h-3 mr-1 ${hasHighViews ? 'text-green-600' : 'text-gray-600'}`} />
              <span className={`text-xs ${hasHighViews ? 'text-green-600' : 'text-gray-600'}`}>오늘 조회</span>
            </div>
            <p className={`text-sm font-semibold ${hasHighViews ? 'text-green-900' : 'text-gray-900'}`}>
              {formatCompactNumber(todayViews)}회
            </p>
          </div>
        </div>

        {/* Content Status */}
        {hasDrafts && (
          <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <Edit className="w-3 h-3 mr-1" />
              <span className="font-medium">작업 중인 콘텐츠</span>
            </div>
            <p className="text-xs text-orange-800 mt-1">
              {formatNumber(draftContent)}개의 초안이 발행을 기다리고 있습니다
            </p>
          </div>
        )}

        {/* Trend */}
        <div className="flex items-center text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">조회수 변화</span>
        </div>

        {/* High Performance Alert */}
        {hasHighViews && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-xs text-green-700">
              <Eye className="w-3 h-3 mr-1" />
              <span>오늘 높은 조회수를 기록하고 있습니다! 📈</span>
            </div>
          </div>
        )}

        {/* Draft Alert */}
        {draftContent > 10 && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              <span>많은 초안이 대기 중입니다. 발행을 검토해보세요</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentStats;