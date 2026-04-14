/**
 * MarketTrialListPage - Market Trial Entry Point (Pharmacy)
 *
 * WO-MARKET-TRIAL-LEGACY-SERVICE-PAGES-CONSOLIDATION-V1:
 * 서비스별 페이지는 entry-point 역할만 수행.
 * 참여·상세는 KPA-a 시범판매 허브로 안내.
 *
 * Gateway 패턴: 접근 상태 + 시범판매 요약 목록 + KPA-a 연결.
 */

import { useState, useEffect } from 'react';
import {
  Tag,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState } from '@/components/common';

const KPA_URL = import.meta.env.VITE_KPA_URL || 'https://kpa-society-web-3e3aws7zqa-du.a.run.app';

interface GatewayTrial {
  id: string;
  title: string;
  status: string;
  supplierName?: string;
  currentParticipants: number;
  maxParticipants?: number;
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

const ACCESS_STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  not_logged_in: {
    title: '로그인이 필요합니다',
    description: '시범판매 참여를 위해 먼저 로그인해 주세요.',
  },
  no_kpa_membership: {
    title: 'KPA-a 회원 전용 서비스입니다',
    description: '시범판매는 약사회(KPA-a) 회원에게 제공됩니다. KPA-a에 가입 후 참여하세요.',
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

function StatusDot({ group }: { group: DisplayGroup }) {
  switch (group) {
    case 'active':
      return <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />;
    case 'upcoming':
      return <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />;
    case 'ended':
      return <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  }
}

const GROUP_LABEL: Record<DisplayGroup, string> = {
  active: '진행중',
  upcoming: '예정',
  ended: '종료',
};

export default function MarketTrialListPage() {
  const [trials, setTrials] = useState<GatewayTrial[]>([]);
  const [openTrialCount, setOpenTrialCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const gwRes = await apiClient.get<{ accessStatus: string; openTrialCount: number; trials: GatewayTrial[] }>(
          '/api/market-trial/gateway?serviceKey=glycopharm',
        );
        if (gwRes.data) {
          setAccessStatus(gwRes.data.accessStatus as AccessStatus);
          setOpenTrialCount(gwRes.data.openTrialCount ?? 0);
          setTrials(gwRes.data.trials ?? []);
        } else {
          setAccessStatus('error');
        }
      } catch {
        setAccessStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingState message="시범판매 정보를 불러오는 중..." />;
  }

  const statusMsg = ACCESS_STATUS_MESSAGES[accessStatus];
  const activeTrials = trials.filter((t) => getDisplayGroup(t.status) === 'active');
  const otherTrials = trials.filter((t) => getDisplayGroup(t.status) !== 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Market Trial</h1>
        <p className="text-slate-500">신제품 시범판매 프로그램</p>
      </div>

      {/* Primary CTA — KPA-a Hub */}
      <div className="bg-violet-50 rounded-xl p-5 border border-violet-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-violet-900">
              시범판매는 KPA-a(약사회) 허브에서 운영됩니다
            </p>
            <p className="text-sm text-violet-600 mt-1">
              참여 신청, 상세 확인, 보상 현황은 KPA-a 시범판매 허브에서 진행하세요.
              {openTrialCount > 0 && (
                <span className="font-medium"> 현재 {openTrialCount}건 모집 중</span>
              )}
            </p>
          </div>
          <a
            href={`${KPA_URL}/market-trial`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            KPA-a 시범판매 허브
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Access Status Message */}
      {statusMsg && accessStatus !== 'accessible' && accessStatus !== 'error' && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">{statusMsg.title}</p>
          <p className="text-xs text-amber-600 mt-1">{statusMsg.description}</p>
        </div>
      )}

      {/* Trial Summary List */}
      {trials.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">이 서비스 관련 시범판매</h2>
          </div>

          {/* Active Trials */}
          {activeTrials.length > 0 && (
            <div className="divide-y divide-slate-100">
              {activeTrials.map((trial) => (
                <a
                  key={trial.id}
                  href={`${KPA_URL}/market-trial/${trial.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <StatusDot group="active" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-violet-700">
                      {trial.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {trial.supplierName || '공급자'} · {trial.currentParticipants}명 참여
                      {trial.maxParticipants ? ` / ${trial.maxParticipants}명` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                    {GROUP_LABEL.active}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}

          {/* Other Trials */}
          {otherTrials.length > 0 && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {otherTrials.map((trial) => {
                const group = getDisplayGroup(trial.status);
                return (
                  <a
                    key={trial.id}
                    href={`${KPA_URL}/market-trial/${trial.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group ${
                      group === 'ended' ? 'opacity-60' : ''
                    }`}
                  >
                    <StatusDot group={group} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate group-hover:text-violet-700">
                        {trial.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {trial.supplierName || '공급자'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      group === 'upcoming' ? 'text-blue-700 bg-blue-50' : 'text-slate-500 bg-slate-100'
                    }`}>
                      {GROUP_LABEL[group]}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {trials.length === 0 && accessStatus !== 'loading' && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">이 서비스에 해당하는 시범판매가 없습니다.</p>
          <a
            href={`${KPA_URL}/market-trial`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            KPA-a에서 전체 시범판매 보기
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
