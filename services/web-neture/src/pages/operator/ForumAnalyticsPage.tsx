/**
 * ForumAnalyticsPage - 포럼 운영 분석 (Neture)
 *
 * WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1 (원본)
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   자체 구현(212L: KPI/트렌드/활동)을 @o4o/operator-core-ui/modules/forum-analytics 의
 *   OperatorForumAnalyticsPage thin wrapper 로 수렴 (KPA/K-Cosmetics/GlycoPharm 과 동일 콘솔 정합).
 *   서비스 차이는 accent(emerald) + client adapter 만 주입.
 *   기능/지표/route/menu/API 불변, 조회 전용 (mutation 없음).
 *
 * 공통 /api/v1/forum/operator/analytics/* API 사용 (forumAnalyticsApi, serviceCode=neture)
 */

import { OperatorForumAnalyticsPage } from '@o4o/operator-core-ui/modules/forum-analytics';
import type { ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { forumAnalyticsApi } from '../../services/forumApi';

const client: ForumAnalyticsClient = forumAnalyticsApi;

export default function ForumAnalyticsPage() {
  return (
    <OperatorForumAnalyticsPage
      client={client}
      accent={{
        iconText: 'text-emerald-600',
        barColor: 'bg-emerald-500',
        activeForumText: 'text-emerald-600',
        activeForumBg: 'bg-emerald-50',
      }}
    />
  );
}
