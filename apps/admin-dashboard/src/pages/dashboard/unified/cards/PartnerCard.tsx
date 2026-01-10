/**
 * Partner Context Card
 * PoC: 파트너 대시보드 대체 카드
 */

import React, { useState, useEffect } from 'react';
import { Users, Handshake, TrendingUp, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps } from '../types';

interface PartnerStats {
  activeClients: number;
  pendingRequests: number;
  monthlyCommission: number;
  upcomingMeetings: number;
}

export const PartnerCard: React.FC<UnifiedCardProps> = ({ config }) => {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPartnerStats();
  }, []);

  const loadPartnerStats = async () => {
    setIsLoading(true);
    try {
      // Mock data for PoC
      await new Promise((r) => setTimeout(r, 300));
      setStats({
        activeClients: Math.floor(Math.random() * 50) + 10,
        pendingRequests: Math.floor(Math.random() * 10) + 1,
        monthlyCommission: Math.floor(Math.random() * 2000000) + 500000,
        upcomingMeetings: Math.floor(Math.random() * 5),
      });
    } catch (err) {
      console.error('Error loading partner stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">활성 고객</span>
          </div>
          <p className="text-xl font-bold text-purple-700">{stats?.activeClients || 0}명</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">대기 요청</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{stats?.pendingRequests || 0}건</p>
        </div>
      </div>

      {/* Commission */}
      <div className="p-3 bg-green-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">이번 달 수수료</span>
            </div>
            <p className="text-xl font-bold text-green-700">
              {(stats?.monthlyCommission || 0).toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Meetings */}
      {(stats?.upcomingMeetings || 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700">예정된 미팅</p>
            <p className="text-xs text-blue-600">{stats?.upcomingMeetings}건의 미팅이 있습니다</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Link
          to="/partner/clients"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          고객 관리
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/partner/reports"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          리포트
        </Link>
      </div>
    </div>
  );
};

export default PartnerCard;
