# WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1 — CHECK

**일자:** 2026-08-08
**선행:** `d8343f827` — market-trial 생명주기 인벤토리(판정 `MIXED`, 포럼 연동 `INCOMPLETE`)
**성격:** 복구. 제거가 아니다. KPA-SOCIETY 무변경, 운영 DB 직접 write 0.

> **판정 정정 반영** — 선행 CHECK 는 후속 권고에 "연동 존치/폐기" 선택지를 두었으나, 정책상
> market-trial 승인 공고는 **Neture 포럼에 게시하는 것이 현행**이며 KPA-SOCIETY 연결 방식은 대상이
> 아니다. 따라서 폐기 선택지는 폐기하고 복구로 진행했다.

---

## 1. Neture 포럼 현행 생성 계약

`WO-O4O-FORUM-CATEGORY-CLEANUP-V1` 이후의 계약을 코드·DB 양쪽에서 확정했다.

| 개념 | 현행 |
|------|------|
| 포럼 실체 | `forum_category_requests` 의 **`status='completed'`** 행 |
| 게시글 소속 | `forum_post.forum_id` → 위 행의 `id` |
| **정식 해석 방식** | **`slug`** — `ForumPostController.createPost` 가 `SELECT id FROM forum_category_requests WHERE slug=$1 AND status='completed'` 로 해석한다 |
| 서비스 격리 | `service_code` (Neture = `'neture'`) |
| 게시글 author | 운영 게시물 **4/4 전량이 `author_id` 를 가진다** (NULL 0건) |
| 없어진 테이블 | `forum_category`(단수) — **DB 에 존재하지 않음** |

**대조군**: market-trial 과 무관한 정식 게시 흐름(`createPost`)이 위와 동일하게 slug 로 해석한다. 이번 복구는 그 계약을 그대로 재사용했다.

---

## 2. 기존 자동 게시 단절의 최종 원인

**상수 값이 잘못된 것이 아니라, 그 행을 만들 주체가 사라진 것이 원인이다.**

1. 생성 migration 2건(`20260406200000-CreateMarketTrialForumCategory`, `20260415260000-ReseedMarketTrialForumCategory`)은 **`forum_category`(단수)** 에 INSERT 한다.
2. 그 테이블은 DB 에 없다 → 두 migration 은 `hasTable('forum_category')` 가드로 **조용히 no-op**.
3. 컨트롤러는 전환 후 **`forum_category_requests`** 를 조회한다 → 상수 행 **0건**.
4. `catExists.length > 0` 조건이 거짓이면 포럼 블록 전체가 **아무 기록 없이 skip** 됐다. `recordForumSyncFailure` 는 **쿼리 예외에만** 반응하므로 "행 0건" 은 원장에도 남지 않았다.

**실측 확증**: `market_trial_forums` 0건 · `market_trial_forum_sync_failures` 0건. 즉 승인은 정상 처리되면서 공고만 영구히 생성되지 않았고, 장애가 관측되지 않았다.

---

## 3. 선택한 카테고리 식별 방식과 기준 데이터 처리

**사용자 결정: 기존 `공급자/파트너 서비스 개선` 포럼에 게시.**

| 항목 | 값 |
|------|-----|
| 대상 포럼 | `add9971a-2141-470e-9111-8bb4b2bb2db9` · `공급자/파트너 서비스 개선` · `completed` · `service_code='neture'` |
| 식별 방식 | **slug + `service_code='neture'` + `status='completed'`** (고정 UUID 폐기) |
| 기본 slug | `공급자파트너-서비스-개선-mrvj0ozg` |
| 재정의 | 환경변수 **`MARKET_TRIAL_FORUM_SLUG`** |

이 slug 끝의 `mrvj0ozg` 는 포럼 생성 시 **무작위로 부여된 접미사**라 환경마다 달라질 수 있다. 그래서 WO 범위 D-2("환경마다 달라질 수 있는 DB 행을 코드 상수로 전제하지 않는다")를 지키기 위해 **환경변수로 덮어쓸 수 있게** 하고 기본값만 현재 운영 값으로 두었다.

**기준 데이터 처리:**
- **신규 migration 없음** — 기존 포럼을 쓰기로 결정했으므로 기준 행을 새로 만들지 않는다.
- **운영 DB 직접 INSERT 없음.**
- **기존 migration 파일 수정·삭제 없음** — no-op 인 2건은 과거 기록으로 그대로 둔다.

---

## 4. 승인 → 포럼 게시 및 연결 기록

인라인 블록을 재사용 가능한 `syncTrialToNetureForum(trial, actorUserId)` 로 복구했다. `approve1st` 와 재시도 엔드포인트가 같은 경로를 쓴다.

| 단계 | 동작 |
|------|------|
| 중복 검사 | `market_trial_forums` 에 매핑이 있으면 `already_linked` 로 즉시 반환 (재게시 안 함) |
| Stage 1 | slug + service_code + completed 로 forum 해석 |
| **행 0건** | **`category_check` / `critical` 실패 기록 후 종료 — 무음 skip 없음** |
| Stage 2 | `forum_post` INSERT — `forum_id` = 해석된 포럼, **`author_id` = 승인 운영자** (종전 `NULL`), `status='publish'`, `published_at=NOW()` |
| Stage 3 | `market_trial_forums` 에 매핑 저장 |
| 성공 후 | 해당 trial 의 **미해결 실패 기록을 자동 해소** (`resolvedAt` + 사유) |

**원자성·실패 정책은 기존 설계 의도를 유지했다** — 포럼 게시는 승인과 분리된 best-effort 이며, 게시 실패가 승인을 되돌리지 않는다. 달라진 것은 **실패가 반드시 기록된다**는 점뿐이다.

---

## 5. 실패 기록 · 재시도 · 중복 방지

| 항목 | 구현 |
|------|------|
| 실패 원장 | `market_trial_forum_sync_failures` (stage: `category_check` / `forum_post_create` / `forum_mapping_save`) |
| 운영자 조회 | 기존 `GET /forum-sync-failures` **재사용** (백엔드·프런트 클라이언트 모두 이미 존재) |
| 운영자 해소 | 기존 `PATCH /forum-sync-failures/:failureId/resolve` **재사용** |
| **재시도** | **신규 최소 추가** — `POST /api/v1/neture/operator/market-trial/:id/forum-sync/retry` |
| 권한 | 라우터 상단 `requireAuth` + `requireNetureScope('neture:operator')` 적용. **공급자·일반 사용자 도달 불가** |
| 멱등 | 매핑 존재 시 `already_linked` 반환, `forum_post` INSERT 미발행 |
| 상태 가드 | `DRAFT`/`SUBMITTED` trial 은 400 거부 (승인 전 공고 금지) |
| 로그 | 재시도 주체·trial·결과를 `logger.info` 로 기록. 실패 시 502 + stage·사유 응답 |
| 기록 폭증 방지 | 성공 시 미해결 기록 일괄 해소 → 같은 trial 의 미해결 건이 누적되지 않음 |

프런트에는 API 클라이언트 `retryTrialForumSync()` 만 추가했다 (기존 `trial.ts` 관례 준수). **Neture 포럼 자체 관리 기능은 변경하지 않았다.**

---

## 6. 공개 목록 API 500 및 SEO 404

### 6-1. 500 — 추측 수정하지 않고 진단만 보완

30일 2건, 모두 **bingbot 의 `/api/market-trial` 목록 호출**. 원인 규명을 시도했으나 해당 시각 Cloud Logging 에 대응 ERROR 엔트리가 없었다. 원인은 `getTrials` 의 catch 가 **`console.error` 만 사용**해 severity·stack 이 구조적으로 남지 않은 것이다.

→ WO 범위 E-3("근거가 부족하면 추측 수정하지 않고 진단 로그만 보완한다")에 따라 **로직은 건드리지 않고** `logger.error` + 구조화 필드(`event`, `statusFilter`, `errorMessage`, `errorStack`)로 교체했다. 다음 발생 시 원인 특정이 가능하다.

### 6-2. SEO 404 — 정상 404 유지 (변경 없음)

| 확인 | 결과 |
|------|------|
| `sitemap.xml` 에 해당 URL | **없음** (`/market-trial` 허브만 등록, 총 9 URL) |
| 소스에 `15eb3f51` 하드코딩 | **0건** |
| DB 에 해당 trial | **0건** |

내부 링크·sitemap 결함이 아니라 **외부 색인에만 남은 URL**이다. `20260419400000-ResetMarketTrialDataAndRemoveServiceKeys` 로 과거 데이터가 초기화되면서 색인만 남은 것으로 보인다. WO 범위 E-6 에 따라 **정상 404 를 유지**하고 아무것도 바꾸지 않았다. 정상 trial 상세 URL 의 색인 가능성도 그대로다.

---

## 7. KPA-SOCIETY 무변경 · 운영 DB write 0 증거

| 항목 | 증거 |
|------|------|
| KPA 파일 변경 | `git diff --name-only \| grep -i kpa` → **0건** |
| KPA 포럼·데이터 | 조회·변경 없음. 이번 변경은 `service_code='neture'` 로 고정 |
| 운영 DB write | 조사 세션 전부 `default_transaction_read_only=on`. **`CREATE TEMP TABLE` / `UPDATE forum_post` / `UPDATE market_trials` / `DELETE market_trial_participants` 시도 모두 거부됨** |
| 운영 trial 승인·게시 | **하지 않음.** 검증은 read-only 조회 + 스텁 기반 단위 테스트로만 수행 |
| 신규 migration | 없음 |

---

## 8. 보류 · 잔존 사항

| # | 항목 | 상태 |
|---|------|------|
| 1 | 대상 포럼의 주제 적합성 | `공급자/파트너 서비스 개선` 은 의견 수렴 성격이라 모집 공고와 주제가 완전히 일치하지는 않는다. 사용자 결정에 따라 그대로 사용하되, 전용 공고 포럼이 생기면 `MARKET_TRIAL_FORUM_SLUG` 만 바꾸면 된다 |
| 2 | no-op migration 2건 | `forum_category`(단수) 대상. 과거 기록으로 존치(WO 범위 D-7: 기존 migration 수정·삭제 금지) |
| 3 | 목록 API 500 근본 원인 | 미확정. 진단 로그 보강 후 재발 시 규명 |
| 4 | 운영 E2E 실증 | 실제 운영 trial 승인을 금지했으므로 프로덕션 게시 실증은 미수행. 다음 실제 승인 시 `market_trial_forums` 1건 증가로 확인 가능 |
| 5 | 운영자 화면 버튼 | 재시도 API·클라이언트까지 추가. 화면 버튼 배치는 UI 범위라 미포함 |

---

## 9. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0 |
| read-only 실증 | ✅ CREATE TEMP TABLE / UPDATE / DELETE 거부 |
| **운영 DB write** | ✅ **0** |
| 신규 spec (6 케이스) | ✅ **6/6 PASS** — 무음 skip 0 · slug 해석 · 매핑 기록 · 실패 해소 · author_id · 멱등 · 승인 전 거부 |
| 회귀 (guard·apply-gate 3 suite) | ✅ 4 suites **81 tests PASS** |
| `npx tsc --noEmit` (api-server) | ✅ exit 0 |
| `pnpm run type-check` (전 서비스) | ✅ OK |
| `pnpm run check:unsafe-routes` | ✅ 위반 0 (1,394 파일) |
| 고정 UUID 잔존 | ✅ 0 — spec 이 `f0000000-0a00-4000-f000-0000000000f1` 재유입을 회귀 차단 |
| KPA-SOCIETY 변경 | ✅ **0** |
| 자격증명 literal | ✅ 0 |
| `git diff --check` | ✅ exit 0 |

### 변경 파일

| 파일 | 변경 |
|------|------|
| `controllers/market-trial/marketTrialOperatorController.ts` | `syncTrialToNetureForum` 복구 + `retryForumSync` 신규 + 상수/설정 |
| `controllers/market-trial/marketTrialController.ts` | `getTrials` 진단 로그 구조화 (로직 무변경) |
| `routes/market-trial-operator.routes.ts` | 재시도 route 등록 |
| `services/web-neture/src/api/trial.ts` | `retryTrialForumSync()` 클라이언트 |
| `apps/api-server/jest.config.cjs` | `@o4o/market-trial` · `@o4o/action-log-core` src 매핑 (기존 관례) |
| `apps/api-server/src/__tests__/market-trial-neture-forum-sync.spec.ts` | 신규 spec |
