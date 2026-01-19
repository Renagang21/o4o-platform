/**
 * Operator Context Card
 * v1: 운영 컨텍스트 카드 - membership/operator 대시보드 흡수
 */

import React, { useState, useEffect } from 'react';
import { Settings, Users, FileCheck, ClipboardList, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps } from '../types';

interface OperatorStats {
  pendingApprovals: number;
  activeMembers: number;
  pendingVerifications: number;
  recentReports: number;
}

export const OperatorCard: React.FC<UnifiedCardProps> = ({ config }) => {
  const [stats, setStats] = useState<OperatorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOperatorStats();
  }, []);

  const loadOperatorStats = async () => {
    setIsLoading(true);
    try {
      // v1.2: WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1
      // TODO: 실제 API 구현 시 아래와 같이 호출
      // const response = await authClient.api.get('/api/v1/operator/stats');
      // setStats(response.data);

      // 현재 기능 미구현 - 빈 데이터 반환
      setStats({
        pendingApprovals: 0,
        activeMembers: 0,
        pendingVerifications: 0,
        recentReports: 0,
      });
    } catch (err) {
      console.error('Error loading operator stats:', err);
    } finally {
      setIsLoading(false);
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
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">활성 회원</span>
          </div>
          <p className="text-xl font-bold text-gray-700">{stats?.activeMembers || 0}명</p>
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-gray-600">승인 대기</span>
          </div>
          <p className="text-xl font-bold text-orange-700">{stats?.pendingApprovals || 0}건</p>
        </div>
      </div>

      {/* Pending Items Alert */}
      {(stats?.pendingVerifications || 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-700">인증 대기</p>
            <p className="text-xs text-yellow-600">{stats?.pendingVerifications}건의 인증 요청이 있습니다</p>
          </div>
        </div>
      )}

      {/* Reports Status */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">최근 보고서</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{stats?.recentReports || 0}건</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Link
          to="/admin/membership/dashboard"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
        >
          회원 관리
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/admin/reporting/dashboard"
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          보고서
        </Link>
      </div>
    </div>
  );
};

export default OperatorCard;
