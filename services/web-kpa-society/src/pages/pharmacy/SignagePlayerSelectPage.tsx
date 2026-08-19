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
 *   목록·검색·표·재생 동선은 KCos/GP 사본과 완전히 동일했다(VIEW_DUPLICATED).
 *   공통 SignagePlayerSelectView 로 이관하고, KPA 에만 있는 활성 스케줄 배너는 headerExtra slot,
 *   송출 대상 다중 선택은 rowSelection prop 으로 주입한다. 문구·동작 변경 없음.
 */

import { useState, useEffect } from 'react';
import { Calendar, Tv } from 'lucide-react';
import { SignagePlayerSelectView } from '@o4o/store-ui-core';
import { fetchStorePlaylists } from '../../api/storePlaylist';
import { fetchActiveContent, type ActiveContentResult } from '../../api/signageSchedule';
import { useAuth } from '../../contexts';

/** HH:MM:SS → HH:MM */
function toHHMM(t: string): string {
  return t?.slice(0, 5) ?? '';
}

export function SignagePlayerSelectPage() {
  const { user } = useAuth();
  const organizationId = user?.kpaMembership?.organizationId || '';

  const [selectedPlayerKeys, setSelectedPlayerKeys] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<ActiveContentResult | null>(null);

  // Load active schedule
  useEffect(() => {
    if (!organizationId) return;
    fetchActiveContent(organizationId)
      .then((result) => {
        if (result.schedule && result.items.length > 0) {
          setActiveContent(result);
        }
      })
      .catch(() => { /* no active schedule — banner hidden */ });
  }, [organizationId]);

  const handleSchedulePlay = () => {
    window.open('/store/marketing/signage/play/_schedule', '_blank');
  };

  return (
    <SignagePlayerSelectView
      fetchStorePlaylists={fetchStorePlaylists}
      playButtonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
      searchInputClassName="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      rowSelection={{ selectedRowKeys: selectedPlayerKeys, onChange: setSelectedPlayerKeys }}
      headerExtra={
        activeContent?.schedule ? (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-teal-900 truncate">
                    현재 활성 스케줄: {activeContent.schedule.name}
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
              스케줄 변경은 TV 화면을 새로고침하거나 다시 열면 반영됩니다.
            </p>
          </div>
        ) : null
      }
    />
  );
}
