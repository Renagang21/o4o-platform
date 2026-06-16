/**
 * ForumAnalyticsDashboard - 포럼 운영 분석 (KPA-Society)
 *
 * WO-O4O-KPA-A-FORUM-ALIGNMENT-V1 (원본)
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1:
 *   직접 구현(KPI/트렌드/활동)을 @o4o/operator-core-ui/modules/forum-analytics 의
 *   OperatorForumAnalyticsPage thin wrapper 로 수렴 (GP/K-Cosmetics 와 동일 콘솔 정합).
 *   서비스 차이는 accent(blue + 활성포럼 emerald) + client adapter 만 주입.
 *   기능/지표/route/menu/API 불변, 조회 전용 (mutation 없음).
 *
 * 공통 /api/v1/forum/operator/analytics/* API 사용 (forumAnalyticsApi)
 */

import { OperatorForumAnalyticsPage } from '@o4o/operator-core-ui/modules/forum-analytics';
import type { ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { forumAnalyticsApi } from '../../api/forum';

const client: ForumAnalyticsClient = forumAnalyticsApi;

export default function ForumAnalyticsDashboard() {
  return (
    <OperatorForumAnalyticsPage
      client={client}
      accent={{
        iconText: 'text-blue-600',
        barColor: 'bg-blue-500',
        activeForumText: 'text-emerald-600',
        activeForumBg: 'bg-emerald-50',
      }}
    />
  );
}
