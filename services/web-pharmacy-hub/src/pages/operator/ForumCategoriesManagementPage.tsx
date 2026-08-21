/**
 * ForumCategoriesManagementPage — 포럼 목록 관리 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/forum-categories thin wrapper.
 *   공통 backend(`/api/v1/forum/operator/categories*`, serviceCode=pharmacy-hub) 를 그대로 호출한다.
 *   hardDelete 409 안전장치는 backend 정책 그대로 — 프런트에서 완화하지 않는다.
 */

import { OperatorForumCategoriesPage } from '@o4o/operator-core-ui/modules/forum-categories';
import type { ForumCategoriesClient } from '@o4o/operator-core-ui/modules/forum-categories';
import { forumCategoriesOperatorApi } from '../../services/forumApi';

const client: ForumCategoriesClient = forumCategoriesOperatorApi as ForumCategoriesClient;

export default function ForumCategoriesManagementPage() {
  return <OperatorForumCategoriesPage client={client} tableId="pharmacy-hub-forum-categories" />;
}
