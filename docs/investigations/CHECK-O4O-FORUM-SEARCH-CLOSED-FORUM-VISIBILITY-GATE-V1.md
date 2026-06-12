# CHECK-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1

> **작업명:** WO-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1
> **유형:** forum search backend visibility hardening — 폐쇄형 포럼 글이 비회원 검색에 노출되지 않도록 forum membership 기준 게이트 적용
> **결과: PASS — 사용자 LIVE 검색 경로는 이미 게이팅됨(안전). 유일한 미게이팅 표면(forum-core full-text `ForumSearchService`, dormant)에 defense-in-depth member/owner 게이트 적용.**
> 선행: forum 보안/정합 축 다수 · 기준: `IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1`(visibility=tag 아닌 forum membership 기준) — 2026-06-12

---

## 1. 목적

forum search 결과에서 폐쇄형 포럼(forumType='closed') 게시글이 **비회원에게 노출되지 않도록** forum membership 기준 visibility gate 를 확인·적용한다. visibility 기준은 tag 가 아니라 **forum(forum_category_requests.id = forumId) membership(forum_category_members)** (terminology IR 확정).

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD(시작) | `f1e8b46d6` |
| origin/main ahead/behind | `0 / 0` |
| staged | 없음 |

**다른 세션 WIP(미접촉):** CHECK-...-ORDER-VIEW-LOOP M + untracked(이전 IR/png). path-specific 으로 대상 파일만 커밋.

## 3. search 경로 구조 정독 — 두 갈래

| 검색 경로 | 호출처 | closed-forum 게이트 | 상태 |
|-----------|--------|:---:|------|
| **(A) LIVE** `forumApi.getPosts({ search })` → `GET /forum/posts` → `ForumPostController.listPosts` | KPA `ForumSearchResults`(homeApi.getForumHub + forumApi.getPosts), 4서비스 forum 목록/검색 | ✅ **있음** | 사용자 실사용 |
| **(A') LIVE** forum hub/home → `ForumQueryService` | `/home/forum-*` | ✅ **있음** (`f.forum_type != 'closed'`) | 사용자 실사용 |
| **(B) full-text** `GET /forum/search` → `SearchController` → `ForumSearchService.searchPosts` (forum-core, Phase 15-A) | **frontend 호출 0** · module-loader 조건부 마운트 | ❌ **없음**(수정 전) | dormant(미배선) |

- **(A) 게이팅 근거:** `ForumPostController.listPosts`(controllers/forum/ForumPostController.ts:64–78) — 비회원 대상 `NOT EXISTS(closed) OR requester_id=:uid OR EXISTS(forum_category_members.user_id=:uid)`. 미인증은 `NOT EXISTS(closed)`(open only). `applyContextFilter` 로 org/scope 도 적용.
- **(A') 게이팅 근거:** `modules/forum/forum-query.service.ts:36,49` `AND f.forum_type != 'closed'`.
- **(B) 미게이팅:** `forum.search.service.ts` 는 `status=PUBLISHED` + narrowing(extensionKey/postType/organizationId/authorId)만 적용, forum_type/membership 무관. SearchController 는 user context 미참조, search route 는 auth 미들웨어 없음(익명).

## 4. closed forum 노출 가능성 판정

- **(A)/(A') 사용자 LIVE 검색: 안전** — 이미 forum membership 게이트 적용. **실 사용자 노출 위험 없음.**
- **(B) forum-core `ForumSearchService`: 미게이팅** — 활성화(module-loader) 시 closed forum published 글이 익명/비회원에게 노출될 **잠재 leak**. 단 현재 frontend 호출 0 + 조건부 마운트(정적으로 reachability 확정 불가).
- **판정:** 사용자 LIVE 경로는 이미 막혀 있으나(WO §B 충족), 잠재 표면(B)이 보안상 미게이팅 → **defense-in-depth 로 (B) 게이트 적용**(활성화 시 leak 방지, 사용자 경로 무영향).

## 5. 적용한 visibility gate (B 표면)

**파일:** `packages/forum-core/src/backend/services/forum.search.service.ts` · `.../controllers/search.controller.ts`

- `ForumSearchQuery` 에 `viewerId?: string` 추가(익명=undefined).
- `searchPosts` status 필터 직후, 단일 query builder 에 `Brackets` 게이트 추가(parameter binding):
  ```sql
  ( NOT EXISTS (SELECT 1 FROM forum_category_requests _vfcr
                WHERE _vfcr.id = post.forum_id AND _vfcr.forum_type = 'closed')   -- open forum
    OR EXISTS (SELECT 1 FROM forum_category_members _vfcm
               WHERE _vfcm.forum_category_id = post.forum_id AND _vfcm.user_id = :viewerId)  -- member
    OR EXISTS (SELECT 1 FROM forum_category_requests _vfco
               WHERE _vfco.id = post.forum_id AND _vfco.requester_id = :viewerId) )          -- owner
  ```
  - viewerId 없으면(익명) member/owner 절 생략 → **open forum 만**.
- `SearchController.search`: `const viewerId = (req as any).user?.id` → searchQuery 에 전달(익명이면 undefined).
- **단일 qb** 이므로 `getCount()`(total)와 `getRawAndEntities()`(items) **양쪽에 동일 적용** — list/count 정합 ✅.
- forum_id NULL(legacy/orphan) 글 → `NOT EXISTS(closed)` 참 → open 취급(노출). 정상.

### 5.1 범위/한계 (의도된 minimal)
- **operator/admin override 미포함(B 표면 한정):** forum-core 패키지는 api-server 의 RBAC helper(`isServiceOperator`/`resolveRolePrefix`)를 import 불가(패키지 경계). 따라서 (B) full-text search 의 operator/admin closed 가시성은 미지원 — operator 의 closed forum 접근은 **전용 operator 콘솔/`/forum/operator/*`** 로 처리되며 full-text search 표면은 member/owner + open 으로 한정. (B 는 dormant 이므로 실 영향 0.)
- **viewer context 의존:** search route 에 auth 미들웨어를 추가하지 않음(route/패키지 경계 무변경). `req.user` 가 상위 미들웨어로 채워지면 member/owner 가시성 동작, 아니면 익명(open only)으로 **fail-safe**. hard requirement(비회원 미노출)는 viewer 유무와 무관하게 항상 충족.
- suggestions/popular/highlights 엔드포인트(동일 dormant)는 본 WO 범위 외(주 검색 결과 표면 우선). §8 후속 기록.

## 6. operator/admin override 범위 확인

- (A) LIVE 경로의 operator/admin closed 접근은 기존 `ForumControllerBase.checkClosedForumAccess`(선행 `WO-O4O-FORUM-AUTHOR-PII-GUARD-V1` S3)에서 **service-scoped**(`resolveRolePrefixFromCanonicalServiceKey` + `isServiceOperator`)로 처리 — cross-service bypass 차단 유지.
- (B) 본 게이트는 member/owner 만(§5.1) → operator 가 타 서비스 closed 를 full-text 로 보는 위험 자체가 없음(over-restrictive·safe).

## 7. 검증

- **TypeScript:** forum-core `tsc --noEmit` **0 errors** · api-server `tsc --noEmit` **0 errors**(forum-core 타입 변경 회귀 없음) ✅.
- **정적:** (A)/(A') 게이트 존재 확인(listPosts:64–78 / forum-query:36,49) · (B) 단일 qb → count/items 동일 적용 확인 · 익명 viewerId=undefined → open only 확인 · parameter binding(string interpolation 없음) 확인.
- **API smoke:** **NOT TESTED** — (B) search 는 frontend 미배선·module-loader 조건부라 reachable endpoint 부재(미인증 GET 프로브 대상 불명확) + production. 게이트는 read-only query 조건 추가라 정적+typecheck 로 검증. (A) LIVE 경로는 기존 동작(무변경).
- **무변경 확인:** frontend ✅ · DB/migration ✅ · route path ✅ · response shape ✅(viewerId 는 내부 query 옵션, 응답 형태 불변) · forum-core dist 는 gitignore(CI 빌드) → 미커밋.

## 8. 후속 후보

1. **(정합) forum-core `ForumSearchService` dead/dormant 판정** — frontend 호출 0·module-loader 조건부. LMS content-analytics 류 dead-scaffolding 정리 축에서 활성/제거 결정. 활성화하려면 search route 에 optionalAuth + operator/admin 게이트(api-server 측 래핑) 설계 필요.
2. suggestions/popular/highlights(동일 dormant 표면) closed 게이트 — full-text search 활성화 시 함께.
3. (A) LIVE 경로는 추가 작업 불요(이미 게이팅).

## 9. 완료 판정

**PASS.** 사용자 LIVE forum 검색(`listPosts`/`ForumQueryService`)은 이미 closed-forum membership 게이트로 안전 확인. 유일한 미게이팅 표면인 forum-core full-text `ForumSearchService`(dormant)에 member/owner + open 게이트를 defense-in-depth 로 적용(익명=open only, list/count 동일, parameter binding). operator/admin override 는 패키지 경계상 (B) 표면에서 미지원(전용 콘솔이 담당, dormant 라 무영향). route/response/frontend/DB/migration 무변경. typecheck(forum-core+api-server) 통과.

---

*Date: 2026-06-12 · WO-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1 · LIVE 경로 안전, dormant full-text search 에 closed-forum member/owner 게이트 defense-in-depth 적용. forum-core ForumSearchService 활성/정리는 후속.*
