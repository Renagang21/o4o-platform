# WO-O4O-MARKET-TRIAL-FEATURE-LIFECYCLE-INVENTORY-V1 — CHECK

**일자:** 2026-08-08 · **유형:** 조사·판정 전용 (코드·운영 데이터 변경 0)
**산출물:** `scripts/audits/market-trial-lifecycle-inventory.sql` (재현 가능, write 구문 0)

## 결론 (먼저)

**전체 판정: `MIXED`**

market-trial(**유통참여형 펀딩**)은 **폐기 잔재가 아니다.** 공급자·운영자·참여자 3주체의 E2E 흐름이 코드·화면·메뉴·cron·알림까지 완결된 상태로 프로덕션에 배포돼 있다. 그러나 **실제 사업 데이터가 0**이고(유일 행은 SMOKE 테스트), **KPA 포럼 연동 1개 하위 흐름이 구조적으로 단절**돼 있다.

> **제거 대상이 아니다.** 후속은 "제거"가 아니라 **단절 구간 수리 또는 명시적 폐기 판정**이다.

---

## 1. 기능 구조

| 계층 | 구성 |
|------|------|
| **패키지** | `packages/market-trial` — manifest + lifecycle(install/activate/deactivate/uninstall) + entity 4종(`MarketTrial` · `MarketTrialParticipant` · `MarketTrialDecision` · `MarketTrialForum`) + service 3종 |
| **API 서버** | controller 2 (`marketTrialController` · `marketTrialOperatorController`), route 2, **cron job 1**(`market-trial-lifecycle.job`), 알림 서비스 1, extension entity 1(`MarketTrialForumSyncFailure`) |
| **migration** | **22개** (2026-02-22 최초 생성 ~ 2026-11-16 컬럼 정리) |
| **프런트(web-neture)** | 공개 3화면 + 공급자 4화면 + 운영자 2화면 + 가이드 2화면 = **11화면** |

**등록 조건: 환경 게이트 없음 — 프로덕션 상시 등록.**

| 경로 | 가드 |
|------|------|
| `/api/market-trial` | `authenticate` / 일부 `optionalAuth`(공개 목록·상세) |
| `/api/v1/neture/operator/market-trial` | `requireAuth` + `requireNetureScope('neture:operator')` |

cron job 은 `startup.service.ts:300` 에서 `marketTrialLifecycleJob.start()` 로 기동되며, 상태 전이는 **precondition 있는 atomic UPDATE + statusHistory 기록**으로 구현돼 있다. 알림은 `notificationService.createNotification` 을 실제 호출하는 **8개 hook**(submitted/approved/rejected/joined/recruitingResult/outcomeConfirming/fulfilled 등)으로 구현돼 있다. **스텁이 아니다.**

---

## 2. 사용자별 E2E 흐름과 완결성

| 주체 | 흐름 | 화면 | API | 완결성 |
|------|------|------|-----|:---:|
| **공급자** | 등록 → 수정 → 제출 → 결과 확인 | `/supplier/market-trial` `/new` `/:id` `/:id/edit` | `POST /` · `PATCH /:id` · `GET /my` · `GET /:id/results` | ✅ 완결 |
| **운영자** | 목록 → 상세 → 승인/반려 → KPI·퍼널 → 참여자 관리 → CSV → 보상·정산·결제 상태 | `/operator/market-trial` `/:id` | `PATCH /:id/approve` `/reject` `/status`, `GET /kpi` `/funnel` `/participants` `/export` | ✅ 완결 |
| **참여자** | 탐색 → 참여 → 제출 → 정산 선택 → 내 참여 | `/market-trial` `/:id` `/my` | `POST /:id/join` · `PATCH /:id/submit` · `POST /:id/settlement-choice` | ✅ 완결 |
| **시스템** | 모집 마감·상태 자동 전환 | — | cron job | ✅ 완결 |
| **연동** | 승인 시 KPA 포럼 자동 게시 | — | `approve1st` 내부 | ❌ **단절** (§4) |

**도달 불가 route: 0.** 메뉴(`SupplierSpaceLayout` 공급자 / `operatorMenuGroups` 운영자)에 노출된 경로가 모두 `App.tsx` 에 실재한다. `/admin/market-trial` 은 `/operator/market-trial` 로 redirect 처리돼 있다.

---

## 3. route·화면·메뉴·권한·production 노출

| 축 | 상태 |
|----|------|
| 백엔드 등록 | **프로덕션 상시** (환경 게이트 없음) |
| 프런트 배포 | web-neture 에 포함, 공개 경로 `/market-trial` |
| 공급자 메뉴 | `SupplierSpaceLayout.tsx:88` "유통참여형 펀딩" |
| 운영자 메뉴 | `operatorMenuGroups.ts:52` "유통참여형 펀딩" |
| SEO | `seoRegistry.ts` 에 `/market-trial` · `/guide/features/market-trial` 등록 → **검색엔진이 크롤 중** |
| 가이드 문서 | `/guide/features/market-trial` · `/guide/business/market-trial` 2화면 |

---

## 4. live 상수 — 단 1개, 그리고 그것이 단절돼 있다

`marketTrialOperatorController.ts` 의 하드코딩 UUID 는 **1개뿐**이다.

```
TRIAL_FORUM_CATEGORY_ID = 'f0000000-0a00-4000-f000-0000000000f1'   (line 299)
```

| 항목 | 실측 |
|------|------|
| 목적 | 운영자 승인 시 KPA-a 포럼에 모집 공고를 **자동 게시**할 카테고리 식별자 |
| 계약 성격 | **조회 전제**(lookup precondition). 이 상수로 새 데이터를 만들지 않는다 |
| 컨트롤러가 읽는 테이블 | `forum_category_requests` (`WO-O4O-FORUM-CATEGORY-CLEANUP-V1` 로 전환) |
| 생성 migration 이 쓰는 테이블 | **`forum_category`(단수)** — `20260406200000-CreateMarketTrialForumCategory` · `20260415260000-ReseedMarketTrialForumCategory` |
| `forum_category`(단수) 실재 | **0 — 테이블 자체가 없다** |
| `forum_category_requests` 실재 | 1 (테이블은 있음) |
| **상수 참조 행** | **0** |

### 단절의 구조

1. 두 migration 은 `hasTable('forum_category')` 가드로 시작한다 → 테이블이 없으니 **조용히 no-op**.
2. 컨트롤러는 다른 테이블(`forum_category_requests`)을 조회한다 → 행이 없으니 `catExists.length === 0`.
3. `catExists` 가 비면 **포럼 연동 블록 전체가 `if` 밖으로 빠져 조용히 skip** 된다.
4. `recordForumSyncFailure` 는 **쿼리 예외에만** 반응한다. "행이 0건" 은 예외가 아니므로 **실패 원장에도 남지 않는다.**

**결과:** 운영자가 승인하면 trial 은 정상적으로 `RECRUITING` 이 되지만, **KPA 포럼 공고는 영원히 생성되지 않고 아무 흔적도 남지 않는다.** 실측이 이를 뒷받침한다 — `market_trial_forums`(매핑) **0건**, `market_trial_forum_sync_failures`(실패 원장) **0건**.

> 상수를 제거·변경하면 영향받는 것은 이 자동 게시 흐름 **하나뿐**이다. 다른 기능은 이 상수를 참조하지 않는다.

---

## 5. 운영 데이터와 최근 사용 근거

### 5-1. DB (read-only 실측)

| 테이블 | rows |
|--------|-----:|
| `market_trials` | **1** |
| `market_trial_participants` | **1** |
| `market_trial_decisions` | 0 |
| `market_trial_forums` | 0 |
| `market_trial_forum_sync_failures` | 0 |

유일한 trial:

```
cf6cdc98-69a1-49ef-9628-76a7f882c9b1
title  : [SMOKE] 유통참여형 펀딩 운영 루프 테스트
status : closed        참여자 1/3
생성/수정: 2026-06-07 (동일일자, 이후 변경 없음)
```

**실제 사업 데이터는 0건이다.** 유일 행은 명시적 SMOKE 테스트이며 2개월간 변동이 없다.

### 5-2. 프로덕션 호출 로그 (최근 30일)

| 상태 | 건수 | 성격 |
|------|-----:|------|
| 304 | 66 | 캐시 재검증 |
| 200 | 52 | 정상 |
| 204 | 35 | 정상(빈 응답) |
| **404** | **16** | **Googlebot 이 존재하지 않는 trial `15eb3f51-…` 을 반복 크롤**(referer `neture.co.kr`). 해당 ID 는 DB 에 **0건** |
| **500** | **2** | **bingbot 의 `/api/market-trial` 목록 호출**. 해당 시각 ERROR 로그 미확보로 원인 미확정 |

200/204 응답 87건의 User-Agent: Windows Chrome 79 · Googlebot 5 · macOS 2 · CrOS 1. **일반 브라우저 트래픽은 있으나 신규 trial·참여 데이터가 전혀 늘지 않았으므로, 사업 사용이 아니라 열람/점검 수준으로 해석된다.**

---

## 6. 중복 기능·도달 불가·미완성 구간

| 항목 | 결과 |
|------|------|
| 동일 목적의 다른 정식 기능 | **없음** — Event Offer·공급자 승인·Distribution 은 별개 도메인. 중복 아님 |
| 도달 불가 route | **0** |
| 스텁·미구현 | **없음** (알림·cron 모두 실제 구현) |
| 삭제된 테이블 의존 | **1건** — `forum_category`(단수) 대상 migration 2개 (§4) |
| 존재하지 않는 상수 행 의존 | **1건** — 동일 (§4) |
| 실패 시 운영자 복구 절차 | 포럼 sync 실패 원장(`market_trial_forum_sync_failures`) + 운영자 resolve API 는 **존재**. 단 §4 의 skip 경로는 원장에 기록되지 않아 **복구 절차가 발동하지 않는다** |
| 관측된 결함 | 목록 API 500 (2건/30일), SEO 404 (16건/30일) |

---

## 7. 하위 흐름별 최종 생명주기 판정

| # | 하위 흐름 | 판정 | 근거 |
|---|-----------|------|------|
| 1 | 공급자 등록·수정·제출 | **DORMANT_VALID** | 완결·도달 가능·메뉴 노출. 실데이터 0 |
| 2 | 운영자 승인·반려·KPI·참여자 관리 | **DORMANT_VALID** | 완결·스코프 가드·CSV/정산 API 완비. 실데이터 0 |
| 3 | 참여자 참여·제출·정산 선택 | **DORMANT_VALID** | 완결. 참여 1건(SMOKE) |
| 4 | 라이프사이클 cron 자동 전환 | **DORMANT_VALID** | 기동 등록·atomic UPDATE·statusHistory 구현 |
| 5 | 알림 8 hook | **DORMANT_VALID** | 실제 `createNotification` 호출 |
| 6 | **KPA 포럼 자동 게시** | **INCOMPLETE** | migration↔컨트롤러 테이블 불일치 → 상수 행 0 → **무음 skip**, 실패 원장에도 미기록 |
| 7 | 공개 목록 API | **ACTIVE(결함 有)** | 트래픽 실재, 30일 500 2건 원인 미확정 |
| 8 | SEO 노출 | **ACTIVE(결함 有)** | 존재하지 않는 trial 을 봇이 반복 크롤(404 16건) |

**전체: `MIXED`** — 기반은 완결·현행이나 연동 1건이 단절, 관측 결함 2건.

---

## 8. 후속 권고 (별도 WO)

이번 조사에서는 **아무것도 변경하지 않았다.** 아래는 권고안이다.

| 우선순위 | 항목 | 성격 |
|:---:|------|------|
| **1** | **§4 포럼 연동 단절 판정** — ⓐ `forum_category_requests` 에 상수 행을 정본으로 만들 것인지, ⓑ 연동 자체를 폐기할 것인지 **사업 판단이 먼저**다. 코드 수정은 그 다음이다. 어느 쪽이든 **"행 0건일 때 무음 skip" 은 실패 원장에 기록되도록 고쳐야 한다**(현재는 장애가 보이지 않는다) | 결함 수리 |
| 2 | 목록 API 500 (2건/30일) 원인 규명 | 결함 조사 |
| 3 | SEO 404 — `seoRegistry`/sitemap 에 남은 존재하지 않는 trial URL 정리 | 위생 |
| 4 | SMOKE trial 1건(`cf6cdc98…`)의 처리 방침 | 데이터 정책 |

**제거 권고 없음.** 메뉴·가이드·SEO·cron 까지 갖춘 의도된 사업 기능이며, 동일 목적의 대체 기능도 없다.

---

## 9. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0 |
| 세션 read-only | ✅ `default_transaction_read_only = on` |
| write 차단 실증 | ✅ `CREATE TEMP TABLE` · `UPDATE market_trials` · `DELETE market_trial_participants` **3종 모두 거부** |
| **운영 DB write** | ✅ **0** |
| 조사 스크립트 재실행 | ✅ `ERROR 0` (전 구간) |
| 참조 목록 ↔ 실제 파일 교차검증 | ✅ 백엔드 8 · 패키지 1 · 프런트 11화면 · migration 22 전부 실재 확인 |
| route 등록 환경·인증·권한 | ✅ §3 (공개/authenticate/`neture:operator`) |
| 상수 ↔ DB 대조 | ✅ 상수 1개, 참조 행 0 확인 |
| 화면→API→service→DB 추적 | ✅ 3주체 전 흐름 §2 |
| production 호출 로그 대조군 | ✅ 상태코드 분포·UA 분류로 봇/브라우저 분리 |
| 자격증명 literal | ✅ 0 |
| 코드·운영 데이터 변경 | ✅ **0** |
| `git diff --check` | ✅ exit 0 |
