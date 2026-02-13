/**
 * OperatorLayout - Operator 대시보드 공통 Shell
 *
 * 구성:
 *   [ Page Header + 새로고침 ]
 *   [ Error Banner ]
 *   [ Hero Summary ]
 *   [ Action Panel (AI 행동 제안) ]
 *   [ Signal Cards ]
 *   [ Activity Feed ]
 *   [ children (서비스별 추가 섹션) ]
 */

import { RefreshCw } from 'lucide-react';
import type { OperatorDashboardConfig } from '../types';
import type { OperatorActionSuggestion } from '../action';
import { OperatorHero } from './OperatorHero';
import { OperatorActionPanel } from './OperatorActionPanel';
import { OperatorSignalCards } from './OperatorSignalCards';
import { OperatorActivityFeed } from './OperatorActivityFeed';

export function OperatorLayout({
  config,
  loading,
  error,
  onRefresh,
  actions,
  onActionNavigate,
  children,
}: {
  config: OperatorDashboardConfig | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  /** AI 행동 제안 목록 (없으면 패널 미표시) */
  actions?: OperatorActionSuggestion[];
  /** 행동 제안 클릭 시 라우팅 핸들러 */
  onActionNavigate?: (route: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {config?.pageTitle || '운영자 대시보드'}
          </h1>
          <p className="text-slate-500 mt-1">
            {config?.pageSubtitle || '운영 현황을 한눈에 확인하세요'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Hero */}
      {config && (
        <OperatorHero config={config.hero} loading={loading} />
      )}
      {!config && loading && (
        <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-64" />
        </div>
      )}

      {/* Action Panel — Hero 아래, Signal Cards 위 */}
      {actions && actions.length > 0 && (
        <OperatorActionPanel actions={actions} onNavigate={onActionNavigate} />
      )}

      {/* Signal Cards */}
      <OperatorSignalCards
        cards={config?.signalCards || []}
        loading={loading}
      />

      {/* Activity Feed (서비스가 activityFeed를 제공할 때만 렌더) */}
      {config?.activityFeed !== undefined && (
        <OperatorActivityFeed
          items={config.activityFeed}
          loading={loading}
        />
      )}
      {!config && loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
      )}

      {/* Service-specific extensions */}
      {children}
    </div>
  );
}
