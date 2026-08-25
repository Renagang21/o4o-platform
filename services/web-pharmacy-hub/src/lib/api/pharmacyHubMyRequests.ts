/**
 * PharmacyHub — 내 신청 내역 집계 adapter
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §5 (#19 · #51)
 *
 * KPA `/mypage/my-requests` 와 같은 **통합 신청함**을 PH 에 채택한다.
 * 신규 backend 0 — 이미 있는 세 계약을 프런트에서 합칠 뿐이다:
 *   1) GET /forum/category-requests/my?serviceCode=pharmacy-hub  — 포럼 개설 신청
 *   2) GET /lms/enrollments/me                                   — 수강 신청·진행
 * 변환은 공통 `@o4o/account-ui` normalizer 를 쓴다 (PH 전용 변환 사본 금지).
 *
 * 한 축이 실패해도 나머지는 보여준다. 다만 **전부 실패하면 오류로 올린다** —
 * 조회 실패를 "신청 내역 없음" 으로 위장하지 않는다.
 */

import {
  normalizeForumCategoryRequest,
  normalizeLmsEnrollment,
  sortRequestsByCreatedAtDesc,
  type MyRequestItem,
} from '@o4o/account-ui';
import { fetchMyPharmacyHubForumRequests } from '../../services/forumApi';
import { lmsApi } from '../../api/lms';

const SERVICE_KEY = 'pharmacy-hub';

function toArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

export async function fetchPharmacyHubMyRequests(): Promise<MyRequestItem[]> {
  const [forumRes, lmsRes] = await Promise.allSettled([
    fetchMyPharmacyHubForumRequests(),
    lmsApi.getMyEnrollments(),
  ]);

  if (forumRes.status === 'rejected' && lmsRes.status === 'rejected') {
    throw new Error('신청 내역을 불러오지 못했습니다.');
  }

  const items: MyRequestItem[] = [];

  if (forumRes.status === 'fulfilled') {
    for (const request of toArray(forumRes.value)) {
      items.push({ ...normalizeForumCategoryRequest(request), serviceKey: SERVICE_KEY });
    }
  }

  if (lmsRes.status === 'fulfilled') {
    for (const enrollment of toArray(lmsRes.value)) {
      items.push(normalizeLmsEnrollment(enrollment, SERVICE_KEY));
    }
  }

  return sortRequestsByCreatedAtDesc(items);
}
