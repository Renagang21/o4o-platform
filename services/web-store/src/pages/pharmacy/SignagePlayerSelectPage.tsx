/**
 * SignagePlayerSelectPage — KPA Society
 * WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2
 * WO-KPA-STORE-SIGNAGE-SCHEDULE-PLAYBACK-SYNC-V1
 *
 * /store/marketing/signage/player
 * 게시된 플레이리스트 목록 → 새 탭 fullscreen 재생
 * + 현재 활성 스케줄 배너 → 스케줄 기준 재생
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B:
 *   목록·검색·표·재생 동선은 KCos 사본과 완전히 동일했다(VIEW_DUPLICATED).
 *   공통 SignagePlayerSelectView 로 이관하고, KPA 에만 있는 활성 스케줄 배너는 headerExtra slot,
 *   송출 대상 다중 선택은 rowSelection prop 으로 주입한다. 문구·동작 변경 없음.
 */

import { useState, useEffect } from 'react';
import { Calendar, Tv } from 'lucide-react';
import { SignagePlayerSelectView } from '@o4o/store-ui-core';
import { fetchStorePlaylists } from '../../api/storePlaylist';
import { fetchActiveContent, type ActiveContentResult } from '../../api/signageSchedule';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { Link, useLocation } from 'react-router-dom';
import { storeWorkspaceBase, StoreWorkflowNavigation } from '../../components/store/StoreWorkflowNavigation';

/** HH:MM:SS → HH:MM */
function toHHMM(t: string): string {
  return t?.slice(0, 5) ?? '';
}

export function SignagePlayerSelectPage() {
  const scope = useStoreOperationScope();
  return <PlayerSelectionSession key={scope.key} isCurrent={scope.isCurrent} />;
}

function PlayerSelectionSession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  // WO-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1: canonical 매장 조직 사용
  const { organizationId } = useStoreOrganizationId();

  const [selectedPlayerKeys, setSelectedPlayerKeys] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<ActiveContentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useLatestStoreRequest(organizationId);
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);

  // Load active schedule
  useEffect(() => {
    if (!organizationId) return;
    const current = request.begin();
    setLoading(true); setError(''); setActiveContent(null);
    fetchActiveContent(organizationId)
      .then((result) => {
        if (current() && isCurrent()) setActiveContent(result);
      })
      .catch(() => { if (current() && isCurrent()) setError('현재 시간의 재생 일정을 확인하지 못했습니다.'); })
      .finally(() => { if (current() && isCurrent()) setLoading(false); });
    return request.cancel;
  }, [organizationId, request, isCurrent, retry]);

  const handleSchedulePlay = () => {
    window.open('/store/marketing/signage/play/_schedule', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
    <StoreWorkflowNavigation subject="사이니지" studioPath="/marketing/signage/playlist" usePath="/marketing/signage/player" />
    <SignagePlayerSelectView
      fetchStorePlaylists={fetchStorePlaylists}
      playButtonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
      searchInputClassName="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      rowSelection={{ selectedRowKeys: selectedPlayerKeys, onChange: setSelectedPlayerKeys }}
      headerExtra={
        loading ? <p role="status" className="p-4 text-sm text-slate-600">현재 시간의 재생 일정을 확인하는 중입니다.</p>
        : error ? <p role="alert" className="p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 min-h-11 underline">일정 다시 시도</button></p>
        : activeContent?.schedule && activeContent.items.length > 0 ? (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-teal-900 truncate">
                    현재 시간의 재생 일정: {activeContent.schedule.name}
                  </p>
                  <p className="text-xs text-teal-600 mt-0.5">
                    {toHHMM(activeContent.schedule.startTime)} ~ {toHHMM(activeContent.schedule.endTime)}
                    {' · '}항목 {activeContent.items.length}개
                  </p>
                </div>
              </div>
              <button
                onClick={handleSchedulePlay}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors flex-shrink-0"
              >
                <Tv className="w-4 h-4" />
                현재 스케줄로 TV 재생
              </button>
            </div>
            <p className="text-xs text-teal-500 mt-2">
              실제 TV 재생 완료를 뜻하지 않습니다. 변경 후 재생 화면을 다시 열고 기기에서 확인하세요.
            </p>
            {activeContent.schedule.storePlaylistId && <Link to={`${base}/marketing/signage/playlist`} state={{ signagePlaylistId: activeContent.schedule.storePlaylistId }} className="inline-flex min-h-11 items-center text-sm text-teal-800 underline">현재 안내 수정</Link>}
          </div>
        ) : <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm text-slate-600"><p>{activeContent?.schedule ? '현재 일정에 재생 가능한 자료가 없습니다.' : '현재 시간에 적용된 일정이 없습니다.'}</p><Link to={`${base}/marketing/signage/schedules`} className="inline-flex min-h-11 items-center text-teal-800 underline">재생 시간 확인</Link></div>
      }
    />
    </>
  );
}
