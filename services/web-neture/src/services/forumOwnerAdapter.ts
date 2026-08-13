/**
 * Neture — 포럼 소유자 영역 adapter
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 공통 View(ForumOwnerDashboard)에 주입한다. 매핑·envelope 정규화·실패 승격은 공통 factory 담당.
 *
 * Neture 고유 정책 (SERVICE_SPECIFIC 로 유지):
 *   - 소유자 영역이 **공급자 공간(/supplier/*)** 안에 있다 → basePath 가 다르다.
 *   - **폐쇄형 포럼 회원 관리 동선이 없다** → `links.memberManageHref` 를 주지 않아 노출을 끈다.
 *     (없는 기능을 이번 공통화로 새로 만들지 않는다.)
 */

import {
  createForumOwnerApi,
  type ForumOwnerTheme,
} from '@o4o/shared-space-ui';
import {
  fetchMyCategories,
  fetchMyForumRequests,
  updateMyCategory,
  requestDeleteCategory,
} from './forumApi';

/**
 * Neture 공급자 공간 accent (emerald — 기존 화면과 동일).
 * Tailwind JIT 스캔 대상이 되도록 완성된 클래스 문자열로 적는다.
 */
export const NETURE_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-emerald-600',
  accentSolid: 'bg-emerald-600 hover:bg-emerald-700',
  accentSoft: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  accentSoftText: 'text-emerald-600',
  accentStrongText: 'text-emerald-800',
  accentBadge: 'bg-emerald-100 text-emerald-700',
  accentIconBg: 'bg-emerald-50',
  accentRing: 'focus:ring-emerald-500',
  accentHover: 'hover:text-emerald-600 hover:bg-emerald-50',
};

export const netureForumOwnerApi = createForumOwnerApi({
  fetchOwnedForums: fetchMyCategories,
  fetchMyRequests: fetchMyForumRequests,
  updateForum: updateMyCategory,
  requestForumDelete: requestDeleteCategory,
});
