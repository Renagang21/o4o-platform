# IR-O4O-FORUM-RECENT-POSTS-DELETED-ORPHAN-AUDIT-V1

> 조사 목표: 삭제된 게시글이 `/operator/forum` 최근 게시글 리스트에 계속 노출되는 원인 조사

**조사일**: 2026-05-11
**조사 범위**: forum_post soft delete 정책 / listRecentPosts query / operator summary API / 삭제 흐름 / orphan 재현 조건

---

## 1. 핵심 데이터 모델 — PostStatus enum

**파일**: `packages/forum-core/src/backend/entities/ForumPost.ts`

```typescript
export enum PostStatus {
  PUBLISHED  = 'publish',   // 공개 상태 (DB 값: 'publish' — 오타 아님, legacy 유지)
  PENDING    = 'pending',
  REJECTED   = 'rejected',
  ARCHIVED   = 'archived',  // soft delete 상태
}
```

**핵심**: DB에 저장되는 삭제 상태 값은 `'archived'`. `'deleted'` 문자열은 사용하지 않음.

---

## 2. 게시글 삭제 흐름 (soft delete)

**파일**: `apps/api-server/src/controllers/forum/ForumPostController.ts:410`

```typescript
async deletePost(req, res) {
  const post = await this.postRepository.findOne({ where: { id } });
  // ...
  post.status = PostStatus.ARCHIVED;  // ← 'archived'로 변경
  await this.postRepository.save(post);
  // forum_category_requests.postCount 감소: 없음 (WO-O4O-FORUM-CATEGORY-CLEANUP-V1 이후 제거됨)
}
```

**판단**:
- Hard delete 없음, 순수 soft delete
- `postCount` 감소 로직 없음 (카테고리 테이블 폐기 이후 의도적 제거)
- 삭제 후 cleanup/cascade 없음 (댓글, 좋아요 등 별도 정리 없음)

---

## 3. listRecentPosts 쿼리 분석

**파일**: `apps/api-server/src/modules/forum/forum-query.service.ts:28`

```sql
-- community scope (KPA operator summary에서 사용)
SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName",
       p.created_at as "createdAt", f.name as "categoryName"
FROM forum_post p
LEFT JOIN forum_category_requests f ON p.forum_id = f.id AND f.status = 'completed'
LEFT JOIN users u ON p.author_id = u.id
WHERE p.status = 'publish'                               -- ← 삭제 제외 조건
  AND p.organization_id IS NULL
  AND (f.forum_type IS NULL OR f.forum_type != 'closed')
ORDER BY p.created_at DESC
LIMIT $1
```

**판단**: `WHERE p.status = 'publish'` 조건이 존재하므로 `status = 'archived'` 게시글은 **이론적으로** 제외됨.

---

## 4. KPA Operator Summary에서 forumService 초기화

**파일**: `apps/api-server/src/routes/kpa/kpa.routes.ts:179`

```typescript
const forumService = new ForumQueryService(dataSource, {
  scope: 'community',   // ← community scope 고정
});
```

**판단**: KPA operator summary는 `scope: 'community'` → `organization_id IS NULL` 게시글만 조회. 조직 전용 게시글은 포함하지 않음.

---

## 5. 핵심 발견 — 깨진 문자열의 실제 원인

### 5.1 문자열 `【���】AI ���� ...` 패턴 분석

이 패턴은 다음 두 가지 경우 중 하나입니다:

**Case A — DB에 이미 깨진 데이터가 저장됨**
```
저장 시: UTF-8 다중 바이트 문자가 손상된 채로 INSERT
  → SELECT 시 그대로 반환
  → 목록 API에서 그대로 노출
  → "삭제 후에도 보임" = 소프트 삭제가 되지 않은 것
```

**Case B — LEFT JOIN 결과의 NULL 처리 문제**
```
forum_category_requests f에 해당 forum_id가 없는 경우
  → f.name = NULL → categoryName = NULL
  → 조인이 f.status='completed'로 필터되어 결과 제외되어야 하나,
    LEFT JOIN이므로 f 전체가 NULL인 상태로 포함됨
```

### 5.2 실제 orphan 노출 재현 조건 분석

다음 조건이 동시에 존재하면 "삭제된 것처럼 보이는데 목록에 남아 있음" 현상이 발생합니다:

```
조건 1: forum_post.status = 'publish' (삭제가 실제로 안 된 경우)
  → deletePost API가 호출되지 않았거나 실패한 경우
  → 관리자가 forum 자체를 archived 처리했으나 post는 'publish' 유지

조건 2: 해당 forum_id의 forum_category_requests.status = 'archived'
  → LEFT JOIN 결과에서 f.name = NULL (categoryName = null)
  → 그러나 post 자체는 LEFT JOIN이므로 결과에 포함됨
  → WHERE p.status = 'publish' 만 걸리므로 노출됨
```

**이것이 핵심 버그입니다.**

```sql
-- 현재 쿼리 (버그 있음):
FROM forum_post p
LEFT JOIN forum_category_requests f ON p.forum_id = f.id AND f.status = 'completed'
WHERE p.status = 'publish'
  AND p.organization_id IS NULL
  AND (f.forum_type IS NULL OR f.forum_type != 'closed')  -- f가 NULL이면 TRUE로 통과
```

포럼(forum_category_requests)이 `archived` 상태가 되면:
- LEFT JOIN에서 `f` 전체가 NULL (join 조건 `f.status='completed'` 불충족)
- `f.forum_type IS NULL` → TRUE → WHERE 통과
- 결과: **archived 포럼의 게시글이 여전히 목록에 노출됨**

---

## 6. 상세 버그 시나리오 — 재현 경로

```
1. 포럼 개설 → forum_category_requests.status = 'completed'
2. 게시글 작성 → forum_post.status = 'publish', forum_id = {포럼 ID}
3. Operator가 포럼 비활성화 → forum_category_requests.status = 'archived'
   (이 때 forum_post.status는 변경되지 않음 → 'publish' 유지)
4. listRecentPosts 쿼리 실행:
   - LEFT JOIN: f.status = 'archived' ≠ 'completed' → f 전체 NULL
   - WHERE p.status = 'publish' → 통과 ✓
   - WHERE f.forum_type IS NULL → NULL IS NULL = TRUE → 통과 ✓
   - 결과: 비활성 포럼의 게시글이 recent posts에 포함됨
```

**이것이 "삭제된 것처럼 보이는 게시글"이 목록에 남는 주된 원인입니다.**

---

## 7. analytics/summary의 totalPosts 카운트 문제

**파일**: `apps/api-server/src/routes/forum/operator-forum.routes.ts:868`

```sql
-- operator analytics summary에서 totalPosts 계산
SELECT COUNT(*)::int FROM forum_post
WHERE forum_id IN (:...forumIds)   -- archived 포럼의 게시글도 포함됨
-- status 필터 없음!
```

**판단**: totalPosts 카운트에는 삭제된(`archived`) 게시글까지 포함됨 (status 필터 없음).

---

## 8. 깨진 문자열(UTF-8 mojibake) 발생 조건

`【���】AI ~~~~` 패턴의 실제 저장 원인 후보:

| 후보 | 가능성 | 근거 |
|------|--------|------|
| 클라이언트 측 인코딩 오류 (form submit) | 높음 | 한국어 특수문자 + AI 조합 |
| 복사/붙여넣기 시 클립보드 인코딩 문제 | 중간 | `【】` 는 전각 문자 |
| API 서버 charset 미설정 | 낮음 | 다른 게시글은 정상 |
| 마이그레이션/시드 데이터 오류 | 낮음 | 운영 데이터 패턴 |

**판단**: DB에 이미 깨진 채로 저장된 row가 존재하며, 이는 별도 수정이 필요한 데이터 품질 문제.

---

## 9. 일반 Forum List vs Operator Summary 비교

| 항목 | 일반 `/forum/posts` | Operator `/operator/summary` |
|------|--------------------|-----------------------------|
| 쿼리 방식 | TypeORM queryBuilder | Raw SQL (`dataSource.query`) |
| status 필터 | `PostStatus.PUBLISHED` (enum) | `'publish'` (문자열) |
| forum 상태 필터 | ❌ 없음 | LEFT JOIN f.status='completed' (불충분) |
| organization 필터 | 없음 | `organization_id IS NULL` |
| closed forum 제외 | ❌ 없음 | `f.forum_type != 'closed'` (LEFT JOIN 취약) |

**결론**: 두 경로 모두 **archived 포럼의 게시글 제외 조건이 없음**.

---

## 10. 다른 서비스(Neture) 동일 영향 확인

**파일**: `apps/api-server/src/routes/neture/controllers/neture.controller.ts:224`

```typescript
const posts = await forumService.listRecentPosts(limit);
```

Neture도 동일한 `ForumQueryService.listRecentPosts()`를 사용하며 **동일한 버그에 노출**.

---

## 11. 수정 방향 분류

### Fix A — listRecentPosts query filter fix (권장 우선 수정)

**대상**: `apps/api-server/src/modules/forum/forum-query.service.ts`

```sql
-- 수정 전:
LEFT JOIN forum_category_requests f ON p.forum_id = f.id AND f.status = 'completed'
WHERE p.status = 'publish'
  AND (f.forum_type IS NULL OR f.forum_type != 'closed')

-- 수정 후 (방법 1 — INNER JOIN으로 전환):
INNER JOIN forum_category_requests f ON p.forum_id = f.id AND f.status = 'completed'
WHERE p.status = 'publish'
  AND f.forum_type != 'closed'

-- 수정 후 (방법 2 — LEFT JOIN 유지 + NULL 명시 제외):
LEFT JOIN forum_category_requests f ON p.forum_id = f.id AND f.status = 'completed'
WHERE p.status = 'publish'
  AND f.id IS NOT NULL          -- archived/없는 포럼 게시글 제외
  AND f.forum_type != 'closed'
```

**영향**: KPA operator summary, Neture home community, KPA home/community 엔드포인트 전체 수정됨.

### Fix B — delete cascade 보완

포럼 비활성화(`deactivate`) 시 해당 포럼의 모든 게시글을 `archived`로 전환:

**대상**: `apps/api-server/src/routes/forum/operator-forum.routes.ts` (deactivate endpoint)

```typescript
// forum status → 'archived' 이후 추가:
await postRepo().update(
  { forumId: req.params.id, status: PostStatus.PUBLISHED },
  { status: PostStatus.ARCHIVED }
);
```

### Fix C — orphan repair migration

현재 `archived` 포럼에 속한 `publish` 게시글을 일괄 `archived`로 전환:

```sql
UPDATE forum_post fp
SET status = 'archived'
FROM forum_category_requests fcr
WHERE fp.forum_id = fcr.id
  AND fcr.status = 'archived'
  AND fp.status = 'publish';
```

### Fix D — totalPosts 카운트 filter 추가

**대상**: `apps/api-server/src/routes/forum/operator-forum.routes.ts:875`

```typescript
// 수정 전
.where('post.forumId IN (:...forumIds)', { forumIds })

// 수정 후
.where('post.forumId IN (:...forumIds)', { forumIds })
.andWhere('post.status = :status', { status: 'publish' })
```

---

## 12. 수정 우선순위

| 우선순위 | Fix | 범위 | 위험도 |
|---------|-----|------|--------|
| 1 | Fix A (query filter) | 즉시 수정 가능, 1파일 | 낮음 |
| 2 | Fix C (orphan repair migration) | DB 일괄 수정 | 중간 (승인 필요) |
| 3 | Fix B (delete cascade) | deactivate endpoint 수정 | 낮음 |
| 4 | Fix D (totalPosts filter) | analytics 정확도 | 낮음 |

---

## 13. 깨진 문자열 데이터 처리

조사 결과 깨진 문자열은 **DB에 이미 저장된 데이터**로 판단됨. 수정 방법:

1. 해당 게시글 식별 (`title LIKE '%\xef\xbf\xbd%'` 또는 유사 패턴)
2. 게시글 상세 확인 후 수동 또는 스크립트 삭제/수정
3. 또는 Fix C migration 시 해당 row가 이미 orphan이면 함께 archived 처리

---

## 요약

| 항목 | 결론 |
|------|------|
| 최근 게시글 query soft delete 필터 | ✅ `status = 'publish'` 존재 |
| archived **포럼** 게시글 제외 | ❌ **없음 — 이것이 root cause** |
| 게시글 삭제 시 cascade | ❌ 없음 |
| summary/cache table | ❌ 없음 (raw query만) |
| 깨진 문자열 원인 | DB 저장 데이터 (mojibake) |
| 공통 영향 서비스 | KPA + Neture (동일 함수 사용) |
| 권장 1차 수정 | Fix A (query INNER JOIN) + Fix C (orphan repair migration) |
