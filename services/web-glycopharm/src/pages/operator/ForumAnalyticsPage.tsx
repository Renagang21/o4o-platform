/**
 * ForumAnalyticsPage - 포럼 운영 분석 (GlycoPharm)
 *
 * WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1 (원본)
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1:
 *   직접 구현(KPI/트렌드/활동)을 @o4o/operator-core-ui/modules/forum-analytics 의
 *   OperatorForumAnalyticsPage thin wrapper 로 수렴 (KPA/K-Cosmetics 와 동일 콘솔 정합).
 *   서비스 차이는 accent(teal) + client adapter 만 주입.
 *   기능/지표/route/menu/API 불변, 조회 전용 (mutation 없음).
 */

import { OperatorForumAnalyticsPage } from '@o4o/operator-core-ui/modules/forum-analytics';
import type { ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { forumAnalyticsApi } from '@/services/api';

const client: ForumAnalyticsClient = forumAnalyticsApi;

export default function ForumAnalyticsPage() {
  return (
    <OperatorForumAnalyticsPage
      client={client}
      accent={{
        iconText: 'text-teal-600',
        barColor: 'bg-teal-500',
        activeForumText: 'text-teal-600',
        activeForumBg: 'bg-teal-50',
      }}
    />
  );
}
