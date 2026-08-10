# CHECK-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1

> **결과: 완료 — 프로덕션 실측 검증까지 통과.**
> **작성일:** 2026-08-09
> **근거:** `CHECK-O4O-AUTH-SERVICEKEY-LOGIN-INVALID-CREDENTIALS-P0-V1` §5-2 · §8 **결정 C**
> **commit:** `fea953983`
> **DB backfill 0 · 인증 흐름 무변경 · 응답 계약 무변경**

---

## 1. 원인

`account_activities.success` 는 **DB 에 `boolean NOT NULL DEFAULT true` 로 존재**했으나
`AccountActivity` **엔티티에 컬럼 선언이 없었다.**

```ts
// entities/AccountActivity.ts — success 선언 없음
// services/auth/auth-login.service.ts — details.success 에만 결과를 기록
details: { provider, email, success, ...(failureReason && { reason: failureReason }) }
```

TypeORM INSERT 가 컬럼을 지정하지 않으니 **모든 행이 기본값 `true`** 로 저장됐다.
`details.success` 는 올바른 값을 갖고 있었으므로, **컬럼과 JSON 이 서로 모순**된 상태였다.

---

## 2. 실측 (수정 전, 프로덕션 read-only)

| 항목 | 값 |
|------|----|
| 실패인데 `success=true` (전 기간) | **1,710 건** |
| `success=false` 행 | **0 건** — 컬럼이 한 번도 올바로 기록된 적 없음 |

최근 30일 오집계 사유 분포:

| `success` | `details.success` | reason | 건수 |
|:---:|:---:|---|---:|
| t | true | (성공) | 1,038 |
| **t** | false | `invalid_password` | **39** |
| **t** | false | `account_inactive` | **5** |
| **t** | false | `account_not_found` | **2** |
| **t** | false | `service_not_member` | **2** |

→ 이 컬럼으로 인증 실패를 집계하면 **전량 오집계**된다(실패율 항상 0%).

---

## 3. 수정

| 파일 | 변경 |
|------|------|
| `entities/AccountActivity.ts` | `success` 컬럼 **매핑 추가** (`boolean`, default `true`) |
| `services/auth/auth-login.service.ts` | `logLoginAttempt` 가 `success` 를 **명시 지정** |

- **migration 불필요** — 신규 컬럼이 아니라 **기존 DB 컬럼에 매핑만** 추가했다.
  `synchronize: false` 확인(`database/connection.ts:94`) → 스키마 변경 위험 0.
- `details.success` 는 **유지**했다. 기존 소비처 호환 때문이며, 중복이지만 제거하지 않는다.
- 기본값 `true` 를 남긴 이유: **성공 이벤트만 기록하는 다른 writer** 의 동작을 바꾸지 않기 위해서다
  (`account-linking.service.ts` 3곳 · `auth-guest.service.ts` 2곳 — 전부 성공 경로 전용임을 확인).
- **호출부 12곳 전수 확인** — 실패 8건이 이미 `false`, 성공 4건이 `true` 를 넘기고 있었다.
  단일 write 지점 수정으로 전 경로가 교정된다.

---

## 4. 검증 — 프로덕션 실측 (배포 후)

배포: run `31300109348` success → revision **`o4o-core-api-03257-j7h`** (headSha `fea953983`)

### 4-1. 로그인 4경로 실행 후 DB 확인

| # | 시나리오 | HTTP | `success` 컬럼 | `reason` |
|:-:|----------|:----:|:--------------:|----------|
| 1 | 정상 로그인 | 200 | **t** ✅ | (없음) |
| 2 | 잘못된 비밀번호 | 401 | **f** ✅ | `invalid_password` |
| 3 | 없는 계정 | 401 | **f** ✅ | `account_not_found` |
| 4 | 권한 없는 serviceKey(멤버십 실패) | 401 | **f** ✅ | `service_not_member` |

### 4-2. 컬럼 ↔ details 정합

```sql
SELECT COUNT(*) FROM account_activities
 WHERE "createdAt" > NOW() - INTERVAL '15 minutes'
   AND action LIKE 'login_%' AND success::text <> (details->>'success');
-- → 0
```

**불일치 0건.** 수정 이후 기록되는 행은 컬럼과 JSON 이 항상 일치한다.

### 4-3. WO 검증 항목 대비

| WO 항목 | 결과 |
|---------|:----:|
| 1. 정상 로그인 → `success=true` | ✅ |
| 2. 잘못된 비밀번호 → `false` | ✅ |
| 3. 권한 없는 serviceKey/멤버십 실패 → `false` | ✅ |
| 4. 없는 계정 → `false` | ✅ |
| 5. `service_credentials` 분리 정책 변동 없음 | ✅ 코드 무변경 |
| 6. 로그인 응답 계약 변동 없음 | ✅ 4경로 HTTP·code 기존과 동일 |

### 4-4. 검증 시 안전 조치

```text
잘못된 비밀번호 시도는 1회만 수행하고 곧바로 정상 로그인으로 카운터를 리셋했다
  (실패 5회/30분 → 계정 잠금 회피)
account_not_found · service_not_member 는 handleFailedLogin 을 호출하지 않아 잠금 무관
없는 계정 검증에는 실계정이 아닌 1회용 주소를 사용했다
DB 는 read-only SELECT 만 수행 (프록시는 임시 포트, 조회 후 종료)
```

> 참고: 초기 시도에서 `password:"x"` 는 **400**(입력 검증)으로 서비스에 도달하지 않아 행이 기록되지 않았다.
> 정상 동작이며, 길이를 채워 재시도해 `account_not_found` 를 확인했다.

---

## 5. 과거 데이터 (backfill 하지 않음)

WO 금지사항에 따라 **기존 1,710 건은 그대로 둔다.**

```text
수정 이전 행 : success 컬럼 신뢰 불가 (전부 true)
과거 집계 시 : details->>'reason' 을 사용할 것
경계 시각    : revision o4o-core-api-03257-j7h 배포 시점 (2026-08-09)
```

향후 backfill 이 필요하면 `success = (details->>'success')::boolean` 로 확정 가능하나,
대량 UPDATE 이므로 **별도 승인·dry-run·rollback 계약**이 선행되어야 한다(본 WO 범위 밖).

---

## 6. 무변경 확인

```
로그인 인증 흐름 무변경 (판정 순서·게이트·에러 코드 전부 동일)
service_credentials 분리 정책 무변경 · users.password fallback 도입 0
serviceKey 정책 무변경 · INVALID_CREDENTIALS 는 여전히 해시 불일치에서만 발생
권한/role 변경 0 · migration 0 · DB backfill 0 · 스키마 변경 0
로그인 응답 계약 무변경
```

api-server `tsc --noEmit` **PASS** · Deploy API Server **success**.

---

## 7. 후속

| # | 내용 | 상태 |
|:-:|------|------|
| 1 | 과거 1,710 행 backfill 여부 | 사용자 판단 (대량 UPDATE — 별도 승인 필요) |
| 2 | `account_activities.email` 컬럼도 엔티티 미매핑 (현재 `details.email` 에만 기록) | 관측만, 별도 WO 후보 |
| 3 | 실패율 대시보드/알림이 `success` 컬럼을 쓰는지 점검 | 별도 WO 후보 |

---

*범위: 기록 정확도만 · 인증 로직 무변경 · 프로덕션 4경로 실측 통과 · backfill 0*
