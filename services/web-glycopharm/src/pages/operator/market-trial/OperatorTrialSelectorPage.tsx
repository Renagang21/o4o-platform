/**
 * OperatorTrialSelectorPage - Trial 현황 (Operator)
 *
 * WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1:
 * 공통 API (/api/market-trial?serviceKey=glycopharm) 사용.
 * 읽기 전용 현황 대시보드로 전환 (관리 기능은 별도 Admin WO에서 구현).
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Tag,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';

/** Common trial DTO from /api/market-trial */
interface MarketTrialItem {
  id: string;
  title: string;
  description: string | null;
  supplierId: string;
  supplierName?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  currentParticipants: number;
  createdAt: string;
}

type DisplayGroup = 'upcoming' | 'active' | 'ended';

function getDisplayGroup(status: string): DisplayGroup {
  switch (status) {
    case 'draft':
    case 'submitted':
    case 'approved':
      return 'upcoming';
    case 'recruiting':
    case 'development':
    case 'outcome_confirming':
      return 'active';
    case 'fulfilled':
    case 'closed':
      return 'ended';
    default:
      return 'active';
  }
}

export default function OperatorTrialSelectorPage() {
  const [trials, setTrials] = useState<MarketTrialItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrials = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<MarketTrialItem[]>('/api/market-trial?serviceKey=glycopharm');
        if (response.data) {
          setTrials(response.data);
        }
      } catch {
        setTrials([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrials();
  }, []);

  const filteredTrials = trials.filter((trial) =>
    trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (trial.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const group = getDisplayGroup(status);
    switch (group) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            진행중
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" />
            예정
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <XCircle className="w-3 h-3" />
            종료
          </span>
        );
    }
  };

  const activeCount = trials.filter((t) => getDisplayGroup(t.status) === 'active').length;
  const upcomingCount = trials.filter((t) => getDisplayGroup(t.status) === 'upcoming').length;
  const endedCount = trials.filter((t) => getDisplayGroup(t.status) === 'ended').length;

  if (isLoading) {
    return <LoadingState message="Trial 목록을 불러오는 중..." />;
  }

  if (trials.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Market Trial 현황</h1>
          <p className="text-slate-500">서비스에 노출 중인 Trial 현황</p>
        </div>
        <div className="bg-white rounded-2xl">
          <EmptyState
            icon={Tag}
            title="등록된 Trial이 없습니다"
            description="본부에서 Trial을 등록하면 여기에 표시됩니다."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Market Trial 현황</h1>
        <p className="text-slate-500">서비스에 노출 중인 Trial 현황</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">전체 Trial</p>
          <p className="text-2xl font-bold text-slate-800">{trials.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">진행중</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">예정</p>
          <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">종료됨</p>
          <p className="text-2xl font-bold text-slate-400">{endedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제품명, 공급자 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Trial List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">제품명</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">공급자</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">상태</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden lg:table-cell">기간</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">참여자</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTrials.map((trial) => {
              const group = getDisplayGroup(trial.status);
              return (
                <tr
                  key={trial.id}
                  className={`hover:bg-slate-50 ${group === 'ended' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-800">{trial.title}</p>
                      <p className="text-sm text-slate-500 md:hidden">{trial.supplierName}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="w-4 h-4" />
                      {trial.supplierName || '-'}
                    </div>
                  </td>

                  <td className="px-4 py-4 hidden md:table-cell">
                    {getStatusBadge(trial.status)}
                  </td>

                  <td className="px-4 py-4 hidden lg:table-cell">
                    {(trial.startDate || trial.endDate) ? (
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {trial.startDate ? new Date(trial.startDate).toLocaleDateString() : '?'} ~{' '}
                        {trial.endDate ? new Date(trial.endDate).toLocaleDateString() : '?'}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-slate-700">
                      {trial.currentParticipants}
                      {trial.maxParticipants ? `/${trial.maxParticipants}` : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
