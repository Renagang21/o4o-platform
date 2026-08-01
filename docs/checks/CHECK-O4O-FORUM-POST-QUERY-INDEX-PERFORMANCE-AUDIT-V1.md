# CHECK-O4O-FORUM-POST-QUERY-INDEX-PERFORMANCE-AUDIT-V1

> **WO**: `WO-O4O-FORUM-POST-QUERY-INDEX-PERFORMANCE-AUDIT-V1`
> **성격**: read-only 조사 전용 — 인덱스·migration·쿼리 코드·운영 데이터 **변경 0건**
> **선행**: `WO-O4O-API-SERVER-ORPHANED-MIGRATIONS-RISK-CLASSIFICATION-V1` (P2)
> **일자**: 2026-08-01

---

## 1. 시작 상태

```
branch : main
HEAD   : 716ffb574857eba9261ad85c04ba017d4cfd5f78
HEAD...origin/main : 0  0
git status : pnpm-lock.yaml + 병렬 세션 HFF/OTC 산출물 (조사 대상과 분리 — 미접촉)
```

---

## 2. 선행 P2 지적의 근거 — **일부 오류였음을 정정**

선행 감사는 orphan `1739353200000-AddForumPostPerformanceIndexes` 가 미적용이고
"`forum_post` 에 `idx_forum_post_forum_id` **하나만** 존재" 한다고 기록했다.

**이 관측은 틀렸다.** 당시 조회가

```sql
WHERE tablename='forum_post' AND indexname LIKE '%perf%' OR indexname LIKE 'idx%'
```

였는데, 실제 인덱스 중 하나가 **대문자 접두사** `IDX_forum_post_organization` 이라
`LIKE 'idx%'` 에 걸리지 않아 누락됐다(연산자 우선순위 문제도 겹쳤다).

프로덕션 실제 인덱스는 **4개**다(§4). 특히 orphan 이 추가하려던 홈 화면용 인덱스는
**이미 더 나은 컬럼 순서로 존재**한다.

> 선행 감사의 P2 항목은 이 CHECK 로 **철회**한다.

---

## 3. entity 와 테이블 계약

`packages/forum-core/src/backend/entities/ForumPost.ts`

```ts
@Entity('forum_post')
@Index(['forumId', 'status', 'isPinned', 'createdAt'])   // ← 프로덕션 부재
@Index(['organizationId', 'status', 'createdAt'])        // ← 프로덕션 존재
```

프로덕션 컬럼(25개, 실측):
`id, title, slug, content, excerpt, type, status, author_id, isPinned, isLocked, allowComments,
viewCount, commentCount, likeCount, tags, metadata, published_at, last_comment_at, last_comment_by,
organization_id, is_organization_exclusive, show_contact_on_post, created_at, updated_at, forum_id`

주의할 점 3가지.

- **`isPinned` / `viewCount` / `commentCount` / `likeCount` 는 camelCase 인용 식별자**다. 쿼리에서 `p."isPinned"` 로 접근한다.
- **soft-delete 없음** — `deleted_at` 컬럼이 존재하지 않는다. partial index 의 `WHERE deleted_at IS NULL` 조건은 애초에 성립하지 않는다.
- **`service_key` 없음** — 테넌트 축은 `organization_id`(NULL = 커뮤니티 전역) 와 `forum_id` 다.

`status` CHECK 제약: `draft | publish | pending | rejected | archived`

---

## 4. migration 및 프로덕션 인덱스 현황

### 프로덕션 실제 인덱스 (4)

| 인덱스 | 정의 | 출처 |
|---|---|---|
| `forum_post_pkey` | UNIQUE (id) | PK |
| `forum_post_slug_key` | UNIQUE (slug) | unique 제약 |
| `idx_forum_post_forum_id` | (forum_id) | 기존 migration |
| **`IDX_forum_post_organization`** | **(organization_id, status, created_at)** | entity `@Index(['organizationId','status','createdAt'])` |

FK 3개: `forum_id → forum_category_requests(id) ON DELETE SET NULL`, `author_id → users(id)`,
`last_comment_by → users(id) ON DELETE SET NULL`.
※ PostgreSQL 은 FK 에 인덱스를 자동 생성하지 않으므로 `author_id` 단독 인덱스는 없다.

### orphan 이 추가하려던 것과의 대조

| orphan 인덱스 | 현황 | 판단 |
|---|---|---|
| `(status, organization_id, created_at DESC)` | **사실상 이미 존재** — `IDX_forum_post_organization (organization_id, status, created_at)` | **중복.** 대상 쿼리(`status='publish' AND organization_id IS NULL ORDER BY created_at DESC`)는 등가조건 2개 + 정렬이라 **기존 컬럼 순서가 오히려 적절**하다. 추가 이득 없음 |
| `(author_id)` | 부재 | 현 규모에서 불필요(§8 Q4) |

### entity ↔ 프로덕션 차이

`@Index(['forumId','status','isPinned','createdAt'])` 가 **프로덕션에 없다**.
현재는 `forum_id` 단독 인덱스만 있다. 이것이 지배적 활성 패턴(§6)에 가장 맞는 인덱스이지만,
현 데이터 규모에서는 planner 가 어차피 쓰지 않는다(§8). **지금은 무해한 drift** 다.

---

## 5. 운영 데이터 census

```
총 4행 · 전부 status='publish' · 전부 organization_id IS NULL
distinct forum 2개 (최대 forum 3행) · distinct author 3명
최근 30일 0행 / 최근 90일 4행 · 최신 2026-05-22 · 최고(最古) 2026-05-19
테이블 크기 80 kB (사실상 1 페이지) · planner 추정 4행
n_live_tup 4 / n_dead_tup 1 · last_autoanalyze 2026-07-03 (통계 최신)
```

users 테이블도 40행 수준이다.

---

## 6. 활성 조회 경로별 WHERE·JOIN·ORDER BY·pagination

지배적 소비처는 `apps/api-server/src/modules/forum/forum-query.service.ts` 다.

| # | 경로 | WHERE | ORDER BY | LIMIT |
|---|---|---|---|---|
| Q1 | 커뮤니티 카테고리별 최신글 (`CROSS JOIN LATERAL`) | `p.forum_id = c.id AND p.status='publish' AND p.organization_id IS NULL` | `p."isPinned" DESC, p.created_at DESC` | LIMIT n |
| Q1' | 조직 스코프 동일 쿼리 | 위와 동일 + `organization_id = $2` | 동일 | LIMIT n |
| Q3 | 게시판 목록 | `forum_id = ? AND status='publish'` | `"isPinned" DESC, created_at DESC` | LIMIT/OFFSET |
| Q4 | 작성자 결합 목록 | `status='publish'` + `LEFT JOIN users` | `created_at DESC` | LIMIT |
| Q5 | 카테고리별 게시글 수 | `p2.forum_id = c.id AND p2.status='publish'` | — (COUNT) | — |

정렬 옵션 3종(`forum-query.service.ts:257-267`):
`isPinned DESC, viewCount DESC, created_at DESC` / `isPinned DESC, likeCount DESC, created_at DESC` /
`isPinned DESC, created_at DESC` (기본)

**핵심 관찰**: 지배 패턴의 선행 등가조건은 `forum_id` 이고 정렬은 `isPinned, created_at` 이다.
즉 entity 가 선언했으나 프로덕션에 없는 `(forum_id, status, isPinned, created_at)` 이 이 패턴의 정확한 대응이다.
반면 orphan 이 노렸던 `(status, organization_id, created_at)` 형태는 Q2(홈 최신글) 전용이며 이미 커버된다.

---

## 7. 기존 인덱스 사용 가능성

`IDX_forum_post_organization` 은 **실제로 사용 가능**하다. `enable_seqscan=off` 로 강제하면
planner 가 즉시 이 인덱스를 선택한다.

```
Index Scan using "IDX_forum_post_organization" on forum_post p  (cost=0.13..12.21 rows=4)
  Index Cond: ((organization_id IS NULL) AND ((status)::text = 'publish'::text))
```

→ 인덱스가 **없어서** 못 쓰는 게 아니라, **4행 1페이지라 Seq Scan(cost 1.05)이 더 싸서** 안 쓰는 것이다.
이는 planner 의 정상 동작이다.

---

## 8. 대표 쿼리별 EXPLAIN (ANALYZE, BUFFERS) — 프로덕션 read-only

| 쿼리 | 계획 | 실행시간 | Buffers | Sort |
|---|---|---:|---:|---|
| Q1 LATERAL 커뮤니티 | Nested Loop + Seq Scan | **0.152 ms** | hit 12 | quicksort 25 kB |
| Q2 홈 최신글 | Seq Scan + Sort | **0.038 ms** | hit 1 | quicksort 25 kB |
| Q3 게시판 목록 | Seq Scan + Sort | **0.066 ms** | hit 1 | quicksort 25 kB |
| Q4 작성자 JOIN | Hash Right Join (users 40행 Seq Scan) | **0.119 ms** | hit 5 | quicksort 25 kB |
| Q5 카테고리 카운트 | Seq Scan + SubPlan Aggregate | ~0.034 ms | hit 4 | — |

- **디스크 정렬 0건** (전부 메모리 quicksort 25 kB)
- **shared read 0** — 전부 buffer hit
- 예상행/실제행 괴리 없음 (4 vs 4)
- `Rows Removed by Filter` 최대 3행

Q1 의 Planning Time(0.986 ms)이 Execution Time(0.152 ms)보다 크다 —
**실행이 아니라 계획 수립이 지배적**인 전형적인 초소형 테이블 양상이다.

전문검색 대상 쿼리는 이번 활성 경로에서 발견되지 않았다(별도 인덱스 종류 검토 불필요).

---

## 9. 확인된 병목과 운영 영향

**없음.** 모든 대표 쿼리가 1 ms 미만이고 디스크 I/O·디스크 정렬·과다 행 검사가 없다.
`Seq Scan` 이 나타나지만 이는 결함이 아니라 80 kB 테이블에 대한 올바른 선택이다.

---

## 10. 쓰기 경로 및 인덱스 유지 비용

`forum_post` 에는 **핫 업데이트 컬럼**이 있다.

- `viewCount` — 게시글 조회마다 `+1` (`ForumPostController.ts:208`)
- `commentCount` — 댓글마다 `+1` (`ForumCommentController.ts:160`)
- `likeCount` — 좋아요마다 `+1` (`ForumPostController.ts:582,602`)

정렬 옵션이 `viewCount DESC` / `likeCount DESC` 를 쓰지만, **이 컬럼들을 인덱스에 포함하면
조회 1건마다 인덱스 갱신이 발생**해 읽기 이득보다 쓰기 비용이 커진다.
향후 인덱스를 만들더라도 카운터 컬럼은 제외하는 것이 옳다.

---

## 11. 판정

### **D. 현재 데이터 규모에서는 보류**

인덱스를 추가하지 않는다. orphan `1739353200000-AddForumPostPerformanceIndexes` 는 적용 대상이 아니다.

---

## 12. 판정 근거

1. **활성 쿼리의 병목이 증명되지 않았다** — 대표 5개 전부 0.04~0.16 ms, 디스크 정렬·read 0.
2. **orphan 인덱스 #1 은 중복이다** — `IDX_forum_post_organization` 이 같은 쿼리를 더 적절한 컬럼 순서로 커버하며, 강제 실행 시 실제로 선택된다(§7).
3. **인덱스가 없어서 못 쓰는 상황이 아니다** — planner 가 비용 기준으로 Seq Scan 을 고르는 정상 동작이다. 지금 인덱스를 추가해도 **선택되지 않는다.**
4. **데이터 규모가 4행 / 80 kB / 1 페이지**이고 최근 30일 신규 0건이다.
5. **쓰기 비용 위험** — 정렬에 쓰이는 카운터 컬럼이 조회마다 갱신된다(§10).
6. 선행 P2 의 근거였던 "인덱스 1개뿐" 관측 자체가 오류였다(§2).

---

## 13. 권장 방향

**지금은 아무것도 하지 않는다.** 다만 재평가 트리거를 남긴다.

| 트리거 | 그때 만들 최소 인덱스 |
|---|---|
| `forum_post` 가 **수만 행** 규모가 되거나, 단일 forum 이 수천 행이 되고 Q1/Q3 가 느려질 때 | `(forum_id, status, "isPinned" DESC, created_at DESC)` — entity 가 이미 선언한 조합. **카운터 컬럼 미포함**. `CREATE INDEX CONCURRENTLY` 로 적용 |
| 작성자별 목록이 실사용되고 users 가 커질 때 | `(author_id)` |

- `IDX_forum_post_organization` 은 **그대로 유지** — Q2 용으로 이미 최적이다.
- soft-delete 컬럼이 없으므로 **partial index 는 적용 불가**.
- 재평가 시에는 반드시 그 시점의 EXPLAIN 으로 재검증한다. 본 CHECK 의 수치는 2026-08-01 기준이다.

**쿼리 교정(C)은 불필요하다** — 함수 적용·형변환·깊은 OFFSET·불필요 JOIN 이 발견되지 않았고,
`CROSS JOIN LATERAL` 은 카테고리별 top-N 에 적합한 형태다.

---

## 14. 후속 실행 WO 필요 여부

**불필요.** 인덱스 추가 WO 를 만들지 않는다.

부수적으로 남는 것은 entity 선언(`forumId,status,isPinned,createdAt`)과 프로덕션 인덱스의
불일치인데, **현 규모에서 무해**하며 §13 트리거 도달 시 함께 해소하면 된다.

---

## 15. 프로덕션 DDL·DML 0 확인

- 실행: `SELECT` / `information_schema` / `pg_indexes` / `pg_constraint` / `pg_stat_user_tables` /
  `EXPLAIN (ANALYZE, BUFFERS)` — **EXPLAIN ANALYZE 는 SELECT 쿼리에만** 적용
- `SET enable_seqscan` 은 세션 한정이며 즉시 `RESET` — 스키마·데이터 영향 없음
- **DDL 0건 · DML 0건 · 인덱스 생성/삭제 0건 · 코드 변경 0건**
- Cloud SQL Auth Proxy 사용, 조사 종료 후 종료

## 16. 변경 파일

- `docs/checks/CHECK-O4O-FORUM-POST-QUERY-INDEX-PERFORMANCE-AUDIT-V1.md` (본 문서, 신규)
- 그 외 **0건**

## 17. 미검증 사항

- **부하 상태 실측 없음** — 조사 시점 트래픽이 사실상 없어, 동시 접속 하에서의 계획 변화는 확인하지 못했다. 다만 현 데이터 규모에서는 의미 있는 차이가 나기 어렵다.
- **성장 후 거동은 추정**이다. §13 의 인덱스 후보는 현재 쿼리 형태에 근거한 설계이며, 실제 적용 전 그 시점 EXPLAIN 재검증이 필요하다.
- `pg_stat_statements` 기반 실제 호출 빈도는 확보하지 못했다(확장 활성 여부 미확인). 활성 경로는 **코드 기준**으로 목록화했다.

## 18. 제외 범위 변경 0

forum_post entity·service·controller·repository / DB schema·index / 기존 migration / 운영 데이터 /
Forum 기능·권한·승인 정책 / RBAC / Platform Store / Glycopharm / Cosmetics / Neture 비관련 기능 /
service-groups / SupplierProductOffer / OTC·HFF / pnpm-lock.yaml / 병렬 세션 산출물
— **전부 변경 0건**
