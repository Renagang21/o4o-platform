# CHECK-O4O-AUTH-FAILURE-RATE-DASHBOARD-SUCCESS-COLUMN-AUDIT-V1

> **결과: 판정 A + C + 별건 결함 발견·수정** — 프로덕션 실측 검증 통과.
> **작성일:** 2026-08-09
> **commit:** `301df8901`
> **DB backfill 0 · 인증 흐름 무변경 · 프런트 무변경**

---

## 0. 한 줄 결론

대시보드는 `account_activities` 를 **읽지 않는다.** 인증 감사·실패율은 **`action_logs`** 기반이며
`details.success` / `details.email` 에 의존하지 않는다(WO 가 우려한 의존은 **없음**).

대신 **다른 실패를 찾았다** — `action_logs` 의 저장값은 `'failed'` 인데 analytics 라우트가
`'failure'` 로 비교해, **실패 집계가 구조적으로 항상 0** 이었다. 이를 수정했다.

---

## 1. 조사 결과 요약

| 질문 (WO §1) | 답 |
|--------------|----|
| 실패율이 `account_activities.success` 를 쓰는가? | **아니다** — `action_logs.status` 사용 |
| `details.success` / JSON path 에 의존하는가? | **아니다** — 저장소 전체에서 소비 0건 |
| 이메일 집계가 `account_activities.email` 를 쓰는가? | **아니다** — `action_logs.meta->>'email'` 사용 |
| 과거/신규 경계를 고려하는가? | 해당 없음(다른 테이블 기반) |
| **운영 화면 집계가 실제 기록과 일치하는가?** | **❌ 불일치했다 — §3 결함** |

### 1-1. `account_activities` 소비처 전수 조사

| 유형 | 위치 | 비고 |
|------|------|------|
| **읽기(조회)** | **0건** | `find` / `findOne` / `createQueryBuilder` / `count` / raw SELECT **전무** |
| 쓰기 | `auth-login.service.ts` · `account-linking.service.ts` · `auth-guest.service.ts` · `auth-service-user.service.ts` | 전부 write |
| 엔티티 선언 | `entities/AccountActivity.ts` · `database/entities.ts` · `User.ts`(OneToMany) · `platform-core` manifest | — |

`details->>'success'` / `details->>'email'` 를 **쿼리하는 코드는 저장소에 존재하지 않는다**
(검색 결과의 유일한 매치는 선행 WO 에서 내가 넣은 주석뿐).

→ **판정 C** (해당 테이블 기반 대시보드 없음). 선행 두 WO 의 `success`/`email` 컬럼 수정은
**직접 DB 감사·향후 조회용**으로 의미가 있고, 현재 어떤 UI 지표에도 영향을 주지 않는다.

### 1-2. 실제 인증 대시보드는 `action_logs` 기반

| 계층 | 위치 | 사용 필드 |
|------|------|-----------|
| 화면 | `apps/admin-dashboard/src/pages/operator/AuthAnalyticsPage.tsx` | `status` · `meta.email` · `meta.errorCode` |
| API | `GET /api/v1/operator/analytics/auth/logs` (`routes/operator/analytics.routes.ts`) | `action_key LIKE 'auth.login.%'`, `status` 필터 |
| 요약 | `GET .../summary` · `GET .../insight` | `COUNT(*) FILTER (WHERE status = …)` |
| 기록 | `logLoginAttempt` → `actionLogService.logSuccess/logFailure` | `status`, `meta.email`, `meta.errorCode` |

즉 `logLoginAttempt` 는 **두 테이블에 기록**한다 — `account_activities`(읽는 곳 없음) + `action_logs`(대시보드 소스).

→ 대시보드 자체는 `details.*` 미의존이므로 **판정 A**(이미 정합).

---

## 2. 발견 경위

`action_logs` 실측 중 `status` 값이 `'failed'` 로 저장되는 것을 확인했고,
라우트가 `'failure'` 로 비교하고 있어 **한 건도 매칭되지 않는다**는 것이 드러났다.

---

## 3. 🔴 발견한 결함 — 실패 집계가 항상 0

### 3-1. 원인

`@o4o/action-log-core` 의 정본 타입:

```ts
export type ActionStatus = 'success' | 'failed';   // packages/action-log-core/src/types.ts:13
// action-log.service.ts:75 → status: 'failed'
```

그런데 `routes/operator/analytics.routes.ts` 는 **`'failure'`** 로 비교했다.

### 3-2. 실측 (수정 전, 프로덕션 read-only)

| 항목 | 값 |
|------|----|
| `action_logs.status` 분포 (전 기간) | `success` **4,135** / `failed` **1,716** |
| `'failure'` 리터럴로 매칭되는 행 | **0** |
| 최근 30일 실제 로그인 실패 | **54** |
| `status` 컬럼 CHECK 제약 | **없음** (varchar, 제약 0 → 오타가 DB 단에서 안 걸림) |

### 3-3. 사용자 영향

| 지점 | 증상 |
|------|------|
| `GET .../summary` `failure_count` | **항상 0** (`total ≠ success + failure` 로 내부 모순) |
| `GET .../insight` totals | 동일 |
| `AuthAnalyticsPage` **"실패" 필터** | 실제 54건이 **전부 미표시** |
| `AuthAnalyticsPage` 실패율 KPI | **정상이었다** — 프런트가 `failure = total - success` 로 파생하기 때문. 그래서 **필터를 눌러야만 드러나는** 결함이었다 |

---

## 4. 수정 (소비 측 3지점)

`apps/api-server/src/routes/operator/analytics.routes.ts`

| 지점 | 변경 |
|------|------|
| `summary` totals | `FILTER (WHERE status = 'failure')` → `'failed'` |
| `insight` totals | 동일 |
| `auth/logs` status 필터 | 요청값(`'success'\|'failure'`)을 **저장값으로 변환**해 비교. `'failed'` 직접 전달도 수용 |
| 공통 | 리터럴 재분기 방지용 `ACTION_STATUS_SUCCESS` / `ACTION_STATUS_FAILED` 상수 도입 |

원칙:

- **외부 쿼리 계약 유지** — 프런트는 계속 `status=failure` 를 보낸다. **프런트 변경 0.**
- 응답 필드명 `failure_count` 유지(외부 계약).
- `@o4o/action-log-core` 는 **F1 Frozen Baseline** 이라 **미접촉** — 소비 측만 정합화했다.
- 저장소 전수 검색 결과 동일 오류의 **다른 발생 지점은 없다**
  (`SecurityAuditService.result` 는 별도 축이라 무관).

---

## 5. 검증 — 프로덕션 실측 (배포 후)

배포: run `31305578503` success → revision **`o4o-core-api-03259-spd`** (headSha `301df8901`)

| 검증 | 수정 전 | 수정 후 |
|------|:------:|:------:|
| `auth/logs?status=failure` 건수 | **0** | **54** ✅ (DB 실측 54와 일치) |
| 반환 행의 `status` 값 | — | `["failed"]` ✅ |
| 실패 `errorCode` 종류 | — | `invalid_password` · `account_not_found` · `service_not_member` · `account_inactive` ✅ |
| `auth/logs?status=success` | 정상 | 정상 (`["success"]`) ✅ |
| `summary` totals | `failure_count = 0` | **`{ total: 1125, success_count: 1071, failure_count: 54 }`** ✅ |
| 합계 정합 | `1071 + 0 ≠ 1125` ❌ | **`1071 + 54 = 1125`** ✅ |
| `insight` | 200 | 200 ✅ |

### 5-1. 신규 이벤트 기준 검증 (선행 WO 에서 생성한 4건 재사용)

추가 로그인 시도를 **새로 만들지 않고** 직전 WO 의 smoke 이벤트로 확인했다(잠금 임계치 회피).

| 시나리오 | `action_logs.status` | `meta.email` |
|----------|:--------------------:|:------------:|
| 정상 로그인 | `success` | ✅ |
| 잘못된 비밀번호 | `failed` | ✅ |
| 없는 계정 (`user_id` NULL) | `failed` | ✅ |
| 멤버십 실패 | `failed` | ✅ |

| 정합 검사 (최근 90분) | 결과 |
|----------------------|:----:|
| `errorCode` 있는데 `status='success'` 인 행 | **0** ✅ |
| `meta.email` 누락 | **0** ✅ |
| `meta` 에 비밀번호·해시·토큰성 키 | **0** ✅ |

---

## 6. 과거 데이터 처리

**backfill 미수행** (WO 금지사항).

```text
account_activities : 과거 success 오집계 1,710건 · email NULL 5,712건 — 그대로 둔다
                     (읽는 곳이 없어 사용자 영향 0)
action_logs        : status 값은 처음부터 'failed' 로 올바르게 저장돼 왔다.
                     이번 결함은 기록이 아니라 **조회 쿼리** 문제라 backfill 자체가 불필요하다.
                     → 수정 즉시 과거 1,716건까지 전부 정상 집계된다.
```

이 점이 선행 두 WO 와 다르다 — **과거 데이터도 함께 복구**된다.

---

## 7. 무변경 확인

```
인증 판정 흐름 무변경 · serviceKey / service_credentials / users.password fallback 무변경
INVALID_CREDENTIALS 정책 무변경 · 로그인 응답 계약 무변경
@o4o/action-log-core (F1 Frozen) 무변경 · 기록(write) 경로 무변경
프런트(admin-dashboard) 무변경 · 응답 필드명 무변경 · 새 화면/차트 0
role 변경 0 · migration 0 · DB backfill 0
```

api-server `tsc --noEmit` **PASS** · Deploy API Server **success**.
프런트 변경이 없어 admin-dashboard typecheck·배포는 생략했다.

---

## 8. 변경 파일

```
M apps/api-server/src/routes/operator/analytics.routes.ts   (3지점 + 상수)
```

---

## 9. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `action_logs.status` 에 **CHECK 제약 또는 enum** 부재 — 오타 리터럴이 DB 단에서 안 걸린다. 이번 결함의 근본 원인이므로 제약 추가 검토 | **P2** |
| 2 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-HISTORICAL-BACKFILL-DECISION-V1` — 과거 `success` 1,710건 / `email` 5,712건 backfill 여부 결정. **읽는 곳이 없어 급하지 않다** | P3 |
| 3 | `WO-O4O-AUTH-ACCOUNT-ACTIVITY-ENTITY-SCHEMA-ALIGN-V1` — `action` 길이 선언(50) vs DB(100) | P3 |
| 4 | `account_activities` 와 `action_logs` 의 **역할 중복** — 로그인 1회에 두 테이블 기록. 하나로 정리할지 정책 검토 | P3 |

---

*판정: 대시보드의 `details.*` 의존 없음(A) · `account_activities` 읽기 소비처 0(C) · 별건 실패 집계 결함 발견·수정 후 실측 통과*
