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

import { useSearchParams } from 'react-router-dom';
import { EventsHeader } from '../../components/events/EventsHeader';
import { EventsTabs } from '../../components/events/EventsTabs';
import { colors, spacing } from '../../styles/theme';
import type { EventTab } from '../../components/events/EventsTabs';

export function EventsHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') || 'all') as EventTab;

  const handleTabChange = (tab: EventTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      prev.set('page', '1');
      return prev;
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <EventsHeader />

        <EventsTabs
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />

        <div style={styles.empty}>
          <p>이벤트 기능은 준비 중입니다.</p>
        </div>
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
