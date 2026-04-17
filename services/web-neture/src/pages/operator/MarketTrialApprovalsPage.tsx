/**
 * Market Trial Approvals Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-OPERATOR-CONSOLIDATED-REFINE-V1
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1
 * WO-MONITOR-UI-1: 포럼 연계 실패 탭 추가
 *
 * 탭 구조:
 *   - Trial 관리: 기존 운영자 승인/목록
 *   - 포럼 연계 실패: 포럼 자동 연계 실패 이력 조회 + resolve
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOperatorTrials, getForumSyncFailures, resolveForumSyncFailure } from '../../api/trial';
import type { OperatorTrial, ForumSyncFailure } from '../../api/trial';

// ============================================================================
// 상수
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '작성 중', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: '심사 대기', color: 'bg-yellow-100 text-yellow-800' },
  recruiting: { label: '모집 중', color: 'bg-green-100 text-green-800' },
  development: { label: '준비 중', color: 'bg-purple-100 text-purple-800' },
  outcome_confirming: { label: '결과 확정', color: 'bg-indigo-100 text-indigo-800' },
  fulfilled: { label: '이행 완료', color: 'bg-teal-100 text-teal-800' },
  closed: { label: '종료', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: '전체', value: '' },
  { label: '심사 대기', value: 'submitted' },
  { label: '모집 중', value: 'recruiting' },
  { label: '종료', value: 'closed' },
];

type PageTab = 'trials' | 'forum-failures';

// ============================================================================
// 메인 페이지
// ============================================================================

export default function MarketTrialApprovalsPage() {
  const [pageTab, setPageTab] = useState<PageTab>('trials');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Market Trial 관리</h1>
      </div>

      {/* 상단 페이지 탭 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <PageTabButton active={pageTab === 'trials'} onClick={() => setPageTab('trials')}>
          Trial 관리
        </PageTabButton>
        <PageTabButton active={pageTab === 'forum-failures'} onClick={() => setPageTab('forum-failures')}>
          포럼 연계 실패
        </PageTabButton>
      </div>

      {pageTab === 'trials' ? <TrialsPanel /> : <ForumSyncFailuresPanel />}
    </div>
  );
}

function PageTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Trial 관리 패널 (기존 로직 분리)
// ============================================================================

function TrialsPanel() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<OperatorTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadTrials();
  }, [filter]);

  const loadTrials = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOperatorTrials(filter || undefined);
      setTrials(data);
    } catch (err: any) {
      setError(err.message || 'Trial 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 상태 필터 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              filter === tab.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">{trials.length}건</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!loading && trials.length > 0 && <SummaryBar trials={trials} />}

      {loading ? (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      ) : trials.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter
            ? `"${FILTER_TABS.find((t) => t.value === filter)?.label}" 상태의 Trial이 없습니다.`
            : 'Trial이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {trials.map((trial) => (
            <TrialCard
              key={trial.id}
              trial={trial}
              onClick={() => navigate(`/operator/market-trial/${trial.id}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Summary Metrics Bar ──

function SummaryBar({ trials }: { trials: OperatorTrial[] }) {
  const recruiting = trials.filter((t) => t.status === 'recruiting').length;
  const submitted = trials.filter((t) => t.status === 'submitted').length;
  const totalParticipants = trials.reduce((sum, t) => sum + t.currentParticipants, 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-yellow-600">{submitted}</p>
        <p className="text-xs text-gray-500 mt-0.5">심사 대기</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-green-600">{recruiting}</p>
        <p className="text-xs text-gray-500 mt-0.5">모집 중</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-blue-600">{totalParticipants}</p>
        <p className="text-xs text-gray-500 mt-0.5">전체 참여자</p>
      </div>
    </div>
  );
}

// ── Trial Card ──

function TrialCard({ trial, onClick }: { trial: OperatorTrial; onClick: () => void }) {
  const statusCfg = STATUS_CONFIG[trial.status] || {
    label: trial.status,
    color: 'bg-gray-100 text-gray-700',
  };
  const recruitRate =
    trial.maxParticipants && trial.maxParticipants > 0
      ? Math.round((trial.currentParticipants / trial.maxParticipants) * 100)
      : null;

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 truncate min-w-0 flex-1">{trial.title}</h3>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${statusCfg.color}`}
        >
          {statusCfg.label}
        </span>
      </div>

      <p className="text-sm text-gray-500 mt-1">
        {trial.supplierName || '공급자'} ·{' '}
        {new Date(trial.createdAt).toLocaleDateString('ko-KR')}
      </p>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="text-xs text-gray-600">
          참여 <span className="font-semibold text-gray-900">{trial.currentParticipants}</span>
          {trial.maxParticipants ? `/${trial.maxParticipants}` : ''}명
        </span>
        {recruitRate !== null && (
          <span
            className={`text-xs font-medium ${
              recruitRate >= 80
                ? 'text-red-600'
                : recruitRate >= 50
                ? 'text-yellow-600'
                : 'text-gray-500'
            }`}
          >
            ({recruitRate}%)
          </span>
        )}
        {trial.outcomeSnapshot?.expectedType && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              trial.outcomeSnapshot.expectedType === 'product'
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            {trial.outcomeSnapshot.expectedType === 'product' ? '제품' : '현금'}
          </span>
        )}
      </div>

      {trial.visibleServiceKeys && trial.visibleServiceKeys.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {trial.visibleServiceKeys.map((key) => (
            <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 포럼 연계 실패 패널
// ============================================================================

const STAGE_LABEL: Record<string, string> = {
  category_check: '카테고리 확인',
  forum_post_create: '게시글 생성',
  forum_mapping_save: '매핑 저장',
};

type ResolvedFilter = 'all' | 'unresolved' | 'resolved';

function ForumSyncFailuresPanel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ForumSyncFailure[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('unresolved');
  const [trialIdInput, setTrialIdInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // resolve 모달 상태
  const [resolveTarget, setResolveTarget] = useState<ForumSyncFailure | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // 에러 메시지 전체보기 모달
  const [errorDetailTarget, setErrorDetailTarget] = useState<ForumSyncFailure | null>(null);

  useEffect(() => {
    load();
  }, [resolvedFilter, page]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resolved: 'true' | 'false' | undefined =
        resolvedFilter === 'resolved' ? 'true' : resolvedFilter === 'unresolved' ? 'false' : undefined;
      const result = await getForumSyncFailures({
        resolved,
        trialId: trialIdInput.trim() || undefined,
        page,
        limit,
      });
      setItems(result.data);
      setTotal(result.meta.total);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    setResolveError('');
    try {
      const updated = await resolveForumSyncFailure(resolveTarget.id, resolveNote || undefined);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setResolveTarget(null);
      setResolveNote('');
    } catch (err: any) {
      setResolveError(err.message || '처리에 실패했습니다.');
    } finally {
      setResolving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* 필터 바 */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* resolved 필터 */}
        <div className="flex gap-1">
          {(['unresolved', 'all', 'resolved'] as ResolvedFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => { setResolvedFilter(v); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                resolvedFilter === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {v === 'unresolved' ? '미해결' : v === 'all' ? '전체' : '해결됨'}
            </button>
          ))}
        </div>

        {/* trial ID 검색 */}
        <div className="flex gap-1 flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Trial ID 검색"
            value={trialIdInput}
            onChange={(e) => setTrialIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
          >
            검색
          </button>
        </div>

        <span className="text-xs text-gray-400 ml-auto">총 {total}건</span>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {resolvedFilter === 'unresolved' ? '미해결 실패 건이 없습니다.' : '실패 이력이 없습니다.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">심각도</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Trial</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">단계</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">에러 메시지</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">발생 시각</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">해결 시각</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <ForumFailureRow
                  key={item.id}
                  item={item}
                  onNavigate={() => navigate(`/operator/market-trial/${item.trialId}`)}
                  onResolve={() => { setResolveTarget(item); setResolveNote(''); setResolveError(''); }}
                  onShowError={() => setErrorDetailTarget(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      )}

      {/* Resolve 모달 */}
      {resolveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">해결 처리</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">
              {resolveTarget.trialTitle}
            </p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="운영 메모 (선택)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-400 mb-3"
            />
            {resolveError && (
              <p className="text-xs text-red-600 mb-3">{resolveError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResolveTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {resolving ? '처리 중...' : '해결 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 전체보기 모달 */}
      {errorDetailTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">에러 메시지</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 font-mono break-all whitespace-pre-wrap max-h-60 overflow-y-auto mb-4">
              {errorDetailTarget.errorMessage}
            </div>
            <div className="text-right">
              <button
                onClick={() => setErrorDetailTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 실패 행 컴포넌트 ──

function ForumFailureRow({
  item,
  onNavigate,
  onResolve,
  onShowError,
}: {
  item: ForumSyncFailure;
  onNavigate: () => void;
  onResolve: () => void;
  onShowError: () => void;
}) {
  const isResolved = !!item.resolvedAt;

  return (
    <tr className={isResolved ? 'opacity-50' : ''}>
      {/* 상태 */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        {isResolved ? (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">해결됨</span>
        ) : (
          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">미해결</span>
        )}
      </td>

      {/* severity */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        {item.severity === 'critical' ? (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">critical</span>
        ) : (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">warning</span>
        )}
      </td>

      {/* Trial 제목 */}
      <td className="px-3 py-2.5 max-w-[180px]">
        <button
          onClick={onNavigate}
          className="text-blue-600 hover:underline text-xs text-left truncate block w-full"
          title={item.trialTitle}
        >
          {item.trialTitle}
        </button>
      </td>

      {/* 단계 */}
      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
        {STAGE_LABEL[item.stage] ?? item.stage}
      </td>

      {/* 에러 메시지 */}
      <td className="px-3 py-2.5 max-w-[200px]">
        <button
          onClick={onShowError}
          className="text-xs text-gray-700 text-left truncate block w-full hover:text-blue-600"
          title="클릭하여 전체 보기"
        >
          {item.errorMessage}
        </button>
      </td>

      {/* 발생 시각 */}
      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
        {new Date(item.occurredAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
      </td>

      {/* 해결 시각 */}
      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
        {item.resolvedAt
          ? new Date(item.resolvedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
          : '-'}
      </td>

      {/* 액션 */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        {!isResolved && (
          <button
            onClick={onResolve}
            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
          >
            해결 처리
          </button>
        )}
        {isResolved && item.resolutionNote && (
          <span className="text-xs text-gray-400 italic truncate block max-w-[100px]" title={item.resolutionNote}>
            {item.resolutionNote}
          </span>
        )}
      </td>
    </tr>
  );
}
