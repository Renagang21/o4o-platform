/**
 * Requests 공통 adapter — 서비스별 backend 응답 → 최소 공통 view model
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §8
 *
 * 원칙:
 *   - 서비스별 backend 응답을 하나의 DB 모델로 통합하지 않는다.
 *   - 변환은 frontend adapter 에서만 하고, 공통 View 는 `MyRequestItem` 만 소비한다.
 *   - 여기 있는 normalizer 는 **여러 서비스가 같은 backend 계약을 소비할 때만** 둔다.
 *     서비스 고유 응답의 변환은 각 서비스 api 모듈에 남긴다.
 */

import type { MyRequestItem } from '../components/MyRequestsInbox.js';

type AnyRecord = Record<string, unknown>;

function pick<T = unknown>(raw: AnyRecord, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

/**
 * `GET /api/v1/forum/category-requests/my` 응답 1건 → `MyRequestItem`.
 *
 * 이 endpoint 는 KPA / GlycoPharm / K-Cosmetics / Neture 가 동일 계약으로
 * 소비한다(serviceCode 쿼리만 다르다). camelCase / snake_case 를 모두 받는다.
 */
export function normalizeForumCategoryRequest(input: unknown): MyRequestItem {
  const raw = (input ?? {}) as AnyRecord;
  const payload = (pick<AnyRecord>(raw, 'payload') ?? {}) as AnyRecord;

  const createdAt =
    pick<string>(raw, 'createdAt', 'created_at') ?? new Date().toISOString();
  const createdCategorySlug = pick<string>(
    raw,
    'createdCategorySlug',
    'created_category_slug',
  );

  return {
    id: String(pick<string>(raw, 'id') ?? ''),
    entityType: 'forum_category',
    status: pick<string>(raw, 'status') ?? 'pending',
    displayTitle:
      pick<string>(raw, 'name') ?? pick<string>(payload, 'name') ?? '포럼 신청',
    displayDescription:
      pick<string>(raw, 'description') ?? pick<string>(payload, 'description') ?? '',
    reviewComment: pick<string>(raw, 'reviewComment', 'review_comment') ?? null,
    revisionNote: pick<string>(raw, 'revisionNote', 'revision_note') ?? null,
    reviewedAt: pick<string>(raw, 'reviewedAt', 'reviewed_at') ?? null,
    resultEntityId:
      pick<string>(raw, 'createdCategoryId', 'created_category_id', 'result_entity_id') ??
      null,
    resultMetadata: createdCategorySlug
      ? { slug: createdCategorySlug }
      : (pick<AnyRecord>(raw, 'resultMetadata', 'result_metadata') ?? null),
    submittedAt:
      pick<string>(raw, 'submittedAt', 'submitted_at') ?? createdAt,
    createdAt,
    updatedAt: pick<string>(raw, 'updatedAt', 'updated_at'),
    payload: {
      name: pick(raw, 'name'),
      description: pick(raw, 'description'),
      reason: pick(raw, 'reason') ?? pick(payload, 'reason'),
      forumType:
        pick(raw, 'forumType', 'forum_type') ?? pick(payload, 'forumType'),
      tags: pick(raw, 'tags') ?? pick(payload, 'tags'),
    },
  };
}

/** 목록 단위 변환 + 최신순 정렬. */
export function normalizeForumCategoryRequests(input: unknown): MyRequestItem[] {
  const list = Array.isArray(input) ? input : [];
  return list.map(normalizeForumCategoryRequest);
}

/** `createdAt` 기준 최신순 병합 정렬 (여러 소스를 합칠 때 공통 사용). */
export function sortRequestsByCreatedAtDesc(items: MyRequestItem[]): MyRequestItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
