# CHECK-O4O-AUTH-ACCOUNT-ACTIVITIES-EMAIL-MAPPING-V1

> **결과: 완료 — 프로덕션 실측 검증까지 통과.**
> **작성일:** 2026-08-09
> **근거:** `CHECK-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1` §7-2 (후속 후보)
> **commit:** `bb9e943a9`
> **migration 0 · DB backfill 0 · 인증 흐름 무변경**

---

## 1. 원인

`account_activities.email` 은 **DB 에 `varchar(255) NULL` 로 존재**했으나
`AccountActivity` **엔티티에 컬럼 선언이 없었다.** `success` 컬럼과 **동일 유형의 미매핑**이다.

TypeORM INSERT 가 컬럼을 지정하지 않으니 항상 `NULL` 로 남았고, 같은 값이 `details.email`
JSON 에만 저장됐다.

---

## 2. DB 스키마 확인 (프로덕션 read-only)

| 컬럼 | 타입 | NULL | 기본값 |
|------|------|:----:|--------|
| `email` | `character varying(255)` | YES | — |
| `success` | `boolean` | NO | `true` |
| `action` | `character varying(100)` | NO | — |

### 2-1. 기록 실태 (수정 전, 전 기간)

| 항목 | 값 |
|------|----|
| 전체 행 | **5,712** |
| `email` **컬럼**이 채워진 행 | **0** |
| `details.email` 이 있는 행 | **5,712** |

→ 이메일 기준 감사·실패 분석을 컬럼으로 하면 **전량 누락**된다.

---

## 3. migration 유무

**불필요.** 신규 컬럼이 아니라 **기존 DB 컬럼에 엔티티 매핑만** 추가했다.
`synchronize: false` 확인(`database/connection.ts:94`) → 스키마 변경 위험 0.

---

## 4. 수정 파일 (4개)

| 파일 | 변경 |
|------|------|
| `entities/AccountActivity.ts` | `email` 컬럼 **매핑 추가** (`varchar(255)`, nullable) |
| `services/auth/auth-login.service.ts` | `logLoginAttempt` 가 `email` **명시 지정** |
| `services/account-linking.service.ts` | `linked_email` 활동에 `email` 기록 |
| `services/auth/auth-guest.service.ts` | `guest_upgrade_to_service` 활동에 `email` 기록 |

### 4-1. write 경로 정책

```ts
email: email ? email.slice(0, 255) : null
```

- **`userId` 와 독립**으로 기록한다. `account_not_found` 처럼 사용자가 없는 실패에서도
  **시도된 이메일**이 남아야 미가입 계정 대상 시도·오타 유입을 컬럼 기준으로 분석할 수 있다.
- `varchar(255)` 초과분은 잘라 저장한다 — 기록 실패가 인증 흐름을 막지 않게 한다.
- `logLoginAttempt` 는 **단일 write 지점**이라 로그인 12개 호출부 전부가 한 번에 교정된다.
- 뒤 2개 파일은 email 이 이미 가용해 함께 정합화했다. 게스트 승격은 `userId` 가 없어
  **email 이 유일한 계정 식별 축**이다.

### 4-2. details JSON 호환

`details.email` · `details.success` · `details.reason` 모두 **그대로 유지**했다(소비처 호환).
컬럼과 JSON 이 중복되지만 제거하지 않는다. 비밀번호성 정보는 추가하지 않았다.

### 4-3. 조회 API

**변경 없음.** 본 WO 는 write 정합화만 다룬다(WO §6.4).

---

## 5. 검증 — 프로덕션 실측 (배포 후)

배포: run `31301982475` success → revision **`o4o-core-api-03258-v7k`** (headSha `bb9e943a9`)

### 5-1. 로그인 4시나리오

| # | 시나리오 | HTTP | `success` | **`email` 컬럼** | `reason` | `userId` |
|:-:|----------|:----:|:---------:|------------------|----------|:--------:|
| 1 | 정상 로그인 | 200 | t | ✅ 기록됨 | (없음) | 있음 |
| 2 | 잘못된 비밀번호 | 401 | f | ✅ 기록됨 | `invalid_password` | 있음 |
| 3 | **없는 계정** | 401 | f | ✅ **기록됨** | `account_not_found` | **NULL** |
| 4 | 멤버십 실패(serviceKey) | 401 | f | ✅ 기록됨 | `service_not_member` | 있음 |

> **3번이 이번 수정의 핵심 가치다.** `userId` 가 NULL 인데도 시도 이메일이 남아,
> 미가입 계정 대상 시도를 컬럼 기준으로 추적할 수 있게 됐다.

### 5-2. 정합성 (최근 10분, 로그인 이벤트)

| 검사 | 결과 |
|------|:----:|
| `email` 컬럼 ↔ `details.email` 불일치 | **0** ✅ |
| `success` 컬럼 ↔ `details.success` 불일치 | **0** ✅ (선행 WO 회귀 없음) |
| `details` 에 비밀번호·해시·토큰성 키 유입 | **0** ✅ |

마지막 검사는 `"(password|passwordHash|token|accessToken|refreshToken|secret)"` 패턴으로 확인했다.

### 5-3. 검증 시 안전 조치

```text
잘못된 비밀번호 시도는 1회만 수행하고 곧바로 정상 로그인으로 카운터 리셋(5회/30분 잠금 회피)
account_not_found 검증에는 실계정이 아닌 1회용 주소 사용
account_not_found · service_not_member 는 handleFailedLogin 미호출 → 잠금 무관
DB 는 read-only SELECT 만 (임시 포트 프록시, 조회 후 종료)
비밀번호·해시·토큰 미출력
```

---

## 6. backfill 미수행

WO 금지사항에 따라 **과거 행을 수정하지 않았다.**

```text
수정 이전 행 : email 컬럼 전부 NULL (5,712행)
과거 조회 시 : details->>'email' 사용
경계 시각    : revision o4o-core-api-03258-v7k 배포 시점 (2026-08-09)
```

향후 backfill 이 필요하면 `email = details->>'email'` 로 확정 가능하나, 대량 UPDATE 이므로
**별도 승인·dry-run·rollback 계약**이 선행되어야 한다(§8 후속 2번).

---

## 7. 무변경 확인

```
인증 판정 흐름 무변경 (판정 순서·게이트·에러 코드 동일)
serviceKey 정책 · service_credentials 분리 정책 무변경
users.password fallback 무변경 · INVALID_CREDENTIALS 정책 무변경
로그인 응답 계약 무변경 (4시나리오 HTTP·code 기존과 동일)
migration 0 · DB 스키마 0 · backfill 0 · role 변경 0
조회 API·대시보드 무변경
비밀번호/해시/토큰 기록 0
```

api-server `tsc --noEmit` **PASS** · Deploy API Server **success**.

---

## 8. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `WO-O4O-AUTH-FAILURE-RATE-DASHBOARD-SUCCESS-COLUMN-AUDIT-V1` — 실패율·인증 대시보드가 `details.success` 가 아니라 **컬럼**을 쓰는지 점검 | P3 |
| 2 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-HISTORICAL-BACKFILL-DECISION-V1` — 과거 `success` 오집계 1,710건 + `email` 미기록 5,712건 backfill 여부 **정책 결정** | P3 |
| 3 | `AccountActivity` 엔티티의 `action` 길이 선언(50)이 DB(100)와 다름 — `synchronize:false` 라 무해하나 표기 정합 | P3 |

---

*범위: 기록 정합화만 · 인증 로직 무변경 · 프로덕션 4시나리오 + 정합 3검사 통과 · backfill 0*
