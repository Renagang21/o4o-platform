/**
 * ForumAnalyticsPage — 포럼 운영 분석 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/forum-analytics thin wrapper (조회 전용).
 */

import { OperatorForumAnalyticsPage } from '@o4o/operator-core-ui/modules/forum-analytics';
import type { ForumAnalyticsClient } from '@o4o/operator-core-ui/modules/forum-analytics';
import { forumAnalyticsApi } from '../../services/forumApi';

const client: ForumAnalyticsClient = forumAnalyticsApi as ForumAnalyticsClient;

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
