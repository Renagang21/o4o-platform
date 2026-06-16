/**
 * ForumAnalyticsPage - 포럼 운영 분석 (K-Cosmetics)
 *
 * WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1 (원본)
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1:
 *   직접 구현(KPI/트렌드/활동)을 @o4o/operator-core-ui/modules/forum-analytics 의
 *   OperatorForumAnalyticsPage thin wrapper 로 수렴 (KPA/GlycoPharm 와 동일 콘솔 정합).
 *   서비스 차이는 accent(pink) + client adapter 만 주입.
 *   기능/지표/route/menu/API 불변, 조회 전용 (mutation 없음).
 */

import { OperatorForumAnalyticsPage } from '@o4o/operator-core-ui/modules/forum-analytics';
import type { ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { forumAnalyticsApi } from '@/services/forumApi';

const client: ForumAnalyticsClient = forumAnalyticsApi;

export default function ForumAnalyticsPage() {
  return (
    <OperatorForumAnalyticsPage
      client={client}
      accent={{
        iconText: 'text-pink-600',
        barColor: 'bg-pink-500',
        activeForumText: 'text-pink-600',
        activeForumBg: 'bg-pink-50',
      }}
    />
  );
}
