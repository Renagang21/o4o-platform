/**
 * EventsHomePage - 이벤트 메인 페이지
 *
 * "이벤트 목록 페이지" ❌ → "지금 참여할 수 있는 것" ⭕
 *
 * 컴포넌트 트리:
 * EventsHomePage
 * ├─ EventsHeader       - 타이틀 + 참여 중 이벤트/로그인
 * ├─ EventsTabs         - 유형 탭 (전체/퀴즈/설문/업체)
 * ├─ EventGrid          - 이벤트 카드 그리드
 * │  └─ EventCard       - 개별 이벤트 카드
 * └─ Pagination         - 페이지네이션
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EventsHeader } from '../../components/events/EventsHeader';
import { EventsTabs } from '../../components/events/EventsTabs';
import { EventGrid } from '../../components/events/EventGrid';
import { Pagination } from '../../components/common';
import { participationApi } from '../../api';
import { colors, spacing } from '../../styles/theme';
import type { EventTab } from '../../components/events/EventsTabs';
import type { EventData } from '../../components/events/EventCard';
import type { ParticipationSet } from '../participation/types';
import { ParticipationStatus, QuestionType } from '../participation/types';

function mapParticipationToEvent(set: ParticipationSet): EventData {
  const hasQuiz = set.questions.some((q) => q.type === QuestionType.QUIZ);
  const type = hasQuiz ? 'quiz' : 'survey';

  let status: EventData['status'] = 'ongoing';
  if (set.status === ParticipationStatus.CLOSED) {
    status = 'ended';
  } else if (set.status === ParticipationStatus.DRAFT) {
    status = 'upcoming';
  }

  return {
    id: set.id,
    title: set.title,
    description: set.description || '',
    type,
    startDate: new Date(set.createdAt).toISOString().split('T')[0],
    endDate: set.scope.endAt
      ? new Date(set.scope.endAt).toISOString().split('T')[0]
      : undefined,
    status,
    participantCount: 0,
  };
}

export function EventsHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentTab = (searchParams.get('tab') || 'all') as EventTab;
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    participationApi.getParticipationSets({ page: currentPage, limit: 12 })
      .then((res) => {
        if (res.data) {
          setEvents(res.data.map(mapParticipationToEvent));
          setTotalPages(res.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPage]);

  const handleTabChange = (tab: EventTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  };

  // 클라이언트 필터링
  const filteredEvents = events.filter((e) => {
    if (currentTab === 'all') return true;
    if (currentTab === 'corporate') return e.type === 'corporate';
    return e.type === currentTab;
  });

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <EventsHeader />

        <EventsTabs
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />

        {loading ? (
          <div style={styles.empty}>불러오는 중...</div>
        ) : filteredEvents.length === 0 ? (
          <div style={styles.empty}>
            <p>자료가 없습니다</p>
          </div>
        ) : (
          <>
            <EventGrid events={filteredEvents} />
            {totalPages > 1 && (
              <div style={styles.paginationWrap}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EventsHomePage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral500,
  },
  paginationWrap: {
    marginTop: spacing.xl,
  },
};
