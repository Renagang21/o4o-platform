/**
 * MarketTrialListPage - Market Trial 목록 (K-Cosmetics Store)
 *
 * WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1:
 * 공통 API (/api/market-trial?serviceKey=k-cosmetics) 사용.
 *
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1:
 * Gateway 패턴 적용 — 접근 상태 확인 + KPA-a 연결.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  Building2,
  Tag,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Info,
} from 'lucide-react';

import { api, API_BASE_URL } from '../../lib/apiClient';

const KPA_URL = import.meta.env.VITE_KPA_URL || 'https://kpa-society-web-3e3aws7zqa-du.a.run.app';

interface MarketTrialItem {
  id: string;
  title: string;
  description: string | null;
  supplierId: string;
  supplierName?: string;
  status: string;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
  };
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  currentParticipants: number;
  createdAt: string;
}

type AccessStatus =
  | 'not_logged_in'
  | 'no_kpa_membership'
  | 'not_pharmacy_member'
  | 'pending_approval'
  | 'no_trials'
  | 'accessible'
  | 'loading'
  | 'error';

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

const statusFilters: { value: DisplayGroup | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'ended', label: '종료' },
];

const ACCESS_STATUS_MESSAGES: Record<string, { title: string; description: string; actionLabel?: string; actionUrl?: string }> = {
  not_logged_in: {
    title: '로그인이 필요합니다',
    description: '시범판매 참여를 위해 먼저 로그인해 주세요.',
    actionLabel: '로그인',
    actionUrl: '/auth/login',
  },
  no_kpa_membership: {
    title: 'KPA-a 회원 전용 서비스입니다',
    description: '시범판매는 약사회(KPA-a) 회원에게 제공됩니다. KPA-a에 가입 후 참여하세요.',
    actionLabel: 'KPA-a 바로가기',
    actionUrl: KPA_URL,
  },
  not_pharmacy_member: {
    title: '약국 회원만 참여할 수 있습니다',
    description: '시범판매 참여를 위해 약국 회원 등록이 필요합니다.',
  },
  pending_approval: {
    title: '약국 회원 승인 대기 중',
    description: '약국 회원 승인이 완료되면 시범판매에 참여하실 수 있습니다.',
  },
  no_trials: {
    title: '현재 모집 중인 시범판매가 없습니다',
    description: '이 서비스에 해당하는 모집 중인 시범판매가 없습니다. 나중에 다시 확인해 주세요.',
  },
};

export default function MarketTrialListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisplayGroup | 'all'>('all');
  const [trials, setTrials] = useState<MarketTrialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Fetch gateway status
      try {
        const gwRes = await api.get(`${API_BASE_URL}/api/market-trial/gateway?serviceKey=k-cosmetics`);
        if (gwRes.data?.success && gwRes.data?.data) {
          setAccessStatus(gwRes.data.data.accessStatus as AccessStatus);
        } else {
          setAccessStatus('error');
        }
      } catch {
        setAccessStatus('error');
      }

      // Fetch trials list
      try {
        const response = await api.get(`${API_BASE_URL}/api/market-trial?serviceKey=k-cosmetics`);
        if (response.data?.success && response.data?.data) {
          setTrials(response.data.data);
        }
      } catch {
        setTrials([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTrials = trials.filter((trial) => {
    const matchesSearch =
      trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trial.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trial.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const group = getDisplayGroup(trial.status);
    const matchesStatus = statusFilter === 'all' || group === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  const statusMsg = ACCESS_STATUS_MESSAGES[accessStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Market Trial</h1>
        <p className="text-slate-500">신제품 체험 및 테스트 프로그램</p>
      </div>

      {/* Gateway Banner — KPA-a 연결 안내 */}
      <div className="bg-violet-50 rounded-xl p-4 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-violet-800">
              시범판매 참여는 KPA-a(약사회)에서 운영됩니다
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              모집 중인 시범판매 확인 및 참여는 KPA-a 시범판매 허브에서 진행하세요.
            </p>
          </div>
        </div>
        <a
          href={`${KPA_URL}/market-trial`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
        >
          KPA-a에서 참여하기
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Access Status Message (if not accessible) */}
      {statusMsg && accessStatus !== 'accessible' && accessStatus !== 'error' && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">{statusMsg.title}</p>
          <p className="text-xs text-amber-600 mt-1">{statusMsg.description}</p>
          {statusMsg.actionLabel && statusMsg.actionUrl && (
            statusMsg.actionUrl.startsWith('http') ? (
              <a
                href={statusMsg.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700"
              >
                {statusMsg.actionLabel}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <Link
                to={statusMsg.actionUrl}
                className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700"
              >
                {statusMsg.actionLabel}
              </Link>
            )
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제품명, 공급자 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-pink-100 text-pink-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trial Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredTrials.map((trial) => {
          const group = getDisplayGroup(trial.status);
          return (
            <div
              key={trial.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                group === 'ended' ? 'opacity-60' : ''
              }`}
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(trial.status)}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {trial.supplierName || '공급자'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      {trial.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {trial.description}
                    </p>
                  </div>
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-8 h-8 text-slate-300" />
                  </div>
                </div>
              </div>

              {trial.outcomeSnapshot?.description && (
                <div className="px-5 py-3 bg-pink-50">
                  <p className="text-sm text-pink-700">
                    <span className="font-medium">Trial 목적:</span> {trial.outcomeSnapshot.description}
                  </p>
                </div>
              )}

              {(trial.startDate || trial.endDate) && (
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {trial.startDate ? new Date(trial.startDate).toLocaleDateString() : '?'} ~{' '}
                      {trial.endDate ? new Date(trial.endDate).toLocaleDateString() : '?'}
                    </span>
                  </div>
                </div>
              )}

              <div className="px-5 py-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-500">참여자 </span>
                  <span className="font-medium text-slate-700">
                    {trial.currentParticipants}
                    {trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명
                  </span>
                </div>
                {group === 'active' && (
                  <a
                    href={`${KPA_URL}/market-trial`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-800"
                  >
                    KPA-a에서 참여
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTrials.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Market Trial이 없습니다</h3>
          <p className="text-slate-500">
            {searchQuery ? '검색 조건에 맞는 Trial이 없습니다.' : '아직 등록된 Market Trial이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
