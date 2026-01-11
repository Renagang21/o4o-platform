/**
 * Executive Card v1.1
 * 임원 컨텍스트 카드 - 지부/분회 임원용
 *
 * 원칙:
 * - 읽기 중심 (설정 변경, 권한 위임 등 금지)
 * - 임원 컨텍스트 1개 = 카드 1개
 * - Role 연동 없음 (순수 Context 기반)
 */

import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, Bell, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExecutiveCardProps, ExecutiveContextType } from '../types';
import { useNotifications } from '../useNotifications';

// 조직 타입 라벨
const ORG_TYPE_LABELS: Record<ExecutiveContextType, { label: string; color: string }> = {
  executive_branch: { label: '지부', color: 'bg-indigo-100 text-indigo-700' },
  executive_chapter: { label: '분회', color: 'bg-violet-100 text-violet-700' },
};

// Mock 데이터 인터페이스
interface ExecutiveSummary {
  notices: number;
  upcomingEvents: number;
  pendingAgendas: number;
  memberCount: number;
}

export const ExecutiveCard: React.FC<ExecutiveCardProps> = ({ executiveContext }) => {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // executive 컨텍스트 알림 연계
  const { getNotificationsByContext, isLoading: isLoadingNotifications } = useNotifications({
    contextFilter: 'executive',
  });

  const executiveNotifications = getNotificationsByContext('executive');

  useEffect(() => {
    loadExecutiveSummary();
  }, [executiveContext.id]);

  const loadExecutiveSummary = async () => {
    setIsLoading(true);
    try {
      // Mock data for v1.1
      await new Promise((r) => setTimeout(r, 300));
      setSummary({
        notices: Math.floor(Math.random() * 5),
        upcomingEvents: Math.floor(Math.random() * 3),
        pendingAgendas: Math.floor(Math.random() * 2),
        memberCount: Math.floor(Math.random() * 100) + 20,
      });
    } catch (err) {
      console.error('Error loading executive summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const orgTypeInfo = ORG_TYPE_LABELS[executiveContext.type];
  const isActive = executiveContext.status === 'active';

  if (isLoading || isLoadingNotifications) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const unreadCount = executiveNotifications?.unreadCount || 0;

  return (
    <div className="space-y-4">
      {/* Organization Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{executiveContext.organizationName}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${orgTypeInfo.color}`}>
                {orgTypeInfo.label}
              </span>
            </div>
            {executiveContext.position && (
              <p className="text-sm text-gray-500">{executiveContext.position}</p>
            )}
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isActive ? '임기 중' : '종료'}
        </span>
      </div>

      {/* Term Info */}
      {executiveContext.term && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(executiveContext.term.startAt).toLocaleDateString('ko-KR')}
            {executiveContext.term.endAt && (
              <> ~ {new Date(executiveContext.term.endAt).toLocaleDateString('ko-KR')}</>
            )}
          </span>
        </div>
      )}

      {/* Executive Notifications */}
      {unreadCount > 0 && (
        <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            <p className="text-sm text-indigo-700">
              <strong>{unreadCount}</strong>건의 새 알림
            </p>
          </div>
          {executiveNotifications?.notifications?.slice(0, 1).map((notif) => (
            <p key={notif.id} className="text-xs text-indigo-600 mt-1 truncate">
              {notif.title}
            </p>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Bell className="w-3 h-3" />
            공지사항
          </div>
          <p className="text-lg font-bold text-gray-700">{summary?.notices || 0}건</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Calendar className="w-3 h-3" />
            예정 일정
          </div>
          <p className="text-lg font-bold text-gray-700">{summary?.upcomingEvents || 0}건</p>
        </div>
      </div>

      {/* Pending Agendas Alert */}
      {(summary?.pendingAgendas || 0) > 0 && (
        <div className="p-2 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-700">
            <strong>{summary?.pendingAgendas}</strong>개의 안건이 대기 중입니다
          </p>
        </div>
      )}

      {/* Member Count */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span>소속 회원 {summary?.memberCount || 0}명</span>
      </div>

      {/* Action - Read Only */}
      <Link
        to={`/organization/${executiveContext.organizationId}`}
        className="flex items-center justify-center gap-1 w-full px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        자세히 보기
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export default ExecutiveCard;
