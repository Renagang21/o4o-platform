/**
 * ForumCategoriesManagementPage - 활성 포럼(카테고리) 목록 관리 (KPA-Society)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-CATEGORIES-GP-KCOS-INTRODUCE-V1:
 *   직접 구현(목록/활성·비활성/태그/영구삭제 + 일괄)을
 *   @o4o/operator-core-ui/modules/forum-categories 의 OperatorForumCategoriesPage thin wrapper 로 수렴.
 *   기능/안전장치(delete-check 409 차단·확인 문구) 보존. 서비스 차이는 client(forumOperatorApi) + tableId.
 *
 * 공통 /api/v1/forum/operator/categories* API 사용 (forumOperatorApi, serviceCode=kpa-society)
 */

import { OperatorForumCategoriesPage } from '@o4o/operator-core-ui/modules/forum-categories';
import type { ForumCategoriesClient } from '@o4o/operator-core-ui/modules/forum-categories';
import { forumOperatorApi } from '../../api/forum';

const client: ForumCategoriesClient = forumOperatorApi;

export default function ForumCategoriesManagementPage() {
  return <OperatorForumCategoriesPage client={client} tableId="kpa-forum-categories" />;
}
