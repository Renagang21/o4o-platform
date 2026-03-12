/**
 * Store Content Dashboard Card
 *
 * WO-O4O-STORE-HUB-CONTENT-INTEGRATION
 *
 * 매장 콘텐츠 현황 위젯
 * - Active / Draft 수
 * - 최근 콘텐츠 목록
 * - Quick Actions (콘텐츠 관리, 템플릿 보기)
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps } from '../types';
import { storeContentApi, StoreContent } from '@/api/store-content.api';

interface ContentStats {
  activeCount: number;
  draftCount: number;
  recentItems: StoreContent[];
}

export const StoreContentCard: React.FC<UnifiedCardProps> = () => {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [activeResult, draftResult] = await Promise.all([
        storeContentApi.list({ storeId: 'default', status: 'active', limit: 3 }),
        storeContentApi.list({ storeId: 'default', status: 'draft', limit: 1 }),
      ]);

      setStats({
        activeCount: activeResult.total,
        draftCount: draftResult.total,
        recentItems: activeResult.items.slice(0, 3),
      });
    } catch (err) {
      console.error('Error loading store content stats:', err);
      setStats({ activeCount: 0, draftCount: 0, recentItems: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Active</span>
          </div>
          <p className="text-xl font-bold text-green-700">{stats?.activeCount || 0}건</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Draft</span>
          </div>
          <p className="text-xl font-bold text-gray-700">{stats?.draftCount || 0}건</p>
        </div>
      </div>

      {/* Recent Items */}
      {stats && stats.recentItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">최근 콘텐츠</p>
          {stats.recentItems.map((item) => (
            <Link
              key={item.id}
              to={`/store-content/${item.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.title}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(item.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Link
          to="/store-content"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
        >
          콘텐츠 관리
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/store-content/templates"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          템플릿
        </Link>
      </div>
    </div>
  );
};

export default StoreContentCard;
