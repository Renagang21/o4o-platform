# CHECK-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-AND-FIX-V1

> WO: `WO-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-AND-FIX-V1`
> 대상: `serviceKey` 를 포함한 로그인만 401 이 되는 원인 확정 + `users.password` ↔ `service_credentials.password_hash` 계약 복구
> 브랜치: `fix/identity-v2-service-credential-password-hash` (worktree `C:/tmp/o4o-identity-v2`, `origin/main` = `daf4f5f37` 기준)
> 상태: **조사 완료 · 코드 수정 0 · 데이터 변경 0 — 중지 조건 2건 충족으로 수정 전 판단 요청**

---

## 0. 결론 요약

**WO 의 전제가 성립하지 않는다.**

`users.password` 와 `service_credentials.password_hash` 는 **동기화되도록 설계된 적이 없다.**
두 값이 다른 것은 drift 가 아니라 `WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1` 이
**명시적으로 의도한 서비스별 자격 분리**다. 따라서 "stale hash 를 동기화해 복구한다"는 방향은
버그 수정이 아니라 **설계된 보안 경계를 되돌리는 변경**이 된다.

| 항목 | 결과 |
|---|---|
| 401 재현 | ✅ 실측 — serviceKey 없음 **200**, `serviceKey='kpa-society'` **401 `INVALID_CREDENTIALS`** |
| 원인 확정 | ✅ **설계된 동작** — credential row 존재 시 `users.password` 로 fallback 하지 않는다 |
| 코드 결함 | ❌ 인증 경로에는 없음 (이중 해싱·fallback 오류·경로 분기 오류 모두 부정) |
| 운영 결함 | ⚠️ **1건 실재** — 관리자 비밀번호 재설정이 서비스 로그인에 반영되지 않는 **사일런트 무효** (§4) |
| 부수 결함 | ⚠️ 1건 — `account_activities.success` 가 실패에도 `true` 로 기록 (§4-2) |
| 코드 수정 | **0건** — 중지 조건 충족 (§7) |
| 데이터 변경 | **0건** — 일괄 동기화는 WO 금지사항이자 설계상 오답 |
| **Auth 공통화 브랜치 잠금 해제** | ✅ **코드 수정 없이 가능** — §6 절차로 실제 로그인 E2E 수행 가능 |

---

## 1. 401 의 확정 원인

### 1-1. credential 선택 규칙 (`auth-login.service.ts:187-216`)

```
serviceKey 없음                  → users.password
serviceKey 있음 + credential 있음 → credential.password_hash   ← users.password 를 보지 않는다
serviceKey 있음 + credential 없음 → users.password (Phase 1 G-B fallback)
```

```ts
let credentialHash: string | null = null;
if (serviceKey) {
  const credential = await credRepo.findOne({ where: { userId: user.id, serviceKey } });
  credentialHash = credential?.passwordHash ?? null;
}
const targetHash = credentialHash ?? user.password;   // credential 이 있으면 그것만 본다
```

즉 **credential row 가 존재하는 순간 그 서비스의 비밀번호는 `users.password` 와 완전히 독립**이다.
"serviceKey 를 보낸 로그인만 401" 은 이 규칙의 직접적 귀결이며, 코드 결함이 아니다.

### 1-2. 실측 재현 (프로덕션 API, 비밀번호·해시 미출력)

동일 계정 `renagang21@gmail.com` · 동일 비밀번호(로컬 테스트 계정 문서값, env 주입) · serviceKey 만 차이:

| 요청 | 결과 |
|---|---|
| `POST /api/v1/auth/login {email, password}` | **HTTP 200** `success=true`, user 반환 |
| `POST /api/v1/auth/login {email, password, serviceKey:'kpa-society'}` | **HTTP 401** `code=INVALID_CREDENTIALS` |

요청 2회만 수행했다 (실패 누적 5회 → 30분 계정 잠금 회피).

### 1-3. 대상 계정 DB 실측 (read-only, 해시는 동일성 boolean 으로만 판정)

`renagang21@gmail.com` (`6967ebe0-…`) — `status=active`, `isActive=true`, `loginAttempts=0`, `lockedUntil=NULL`

| service_key | membership | role | credential | `password_hash = users.password` |
|---|---|---|---|---|
| glycopharm | active | pharmacy | ✅ | **false** |
| k-cosmetics | active | cosmetics:store_owner | ✅ | **false** |
| kpa-society | active | user | ✅ | **false** |
| neture | active | supplier | ✅ | **false** |
| pharmacy-hub | active | pharmacy-hub:store_owner | ✅ | **false** |
| platform | active | super_admin | ❌ (없음) | — |

**5개 서비스 credential 전부가 `users.password` 와 다르다.** 그래서 문서에 적힌 비밀번호로는
serviceKey 로그인이 5개 서비스 모두 실패하고, serviceKey 없는 로그인만 성공한다.
고아 credential(멤버십 없는 credential) 0건.

`platform` 은 credential 이 없으므로 admin 로그인은 `users.password` 로 정상 동작한다 —
관측된 "일부는 되고 일부는 안 된다"의 설명이 된다.

---

## 2. `users.password` 와 service credential 의 정식 계약

### 2-1. 계층 정의

| 계층 | 저장소 | 의미 | 사용 시점 |
|---|---|---|---|
| L1 Identity | `users.password` | 플랫폼 전역 자격 | serviceKey 없는 로그인 · credential 없는 서비스의 fallback |
| L2 Credential | `service_credentials.password_hash` | `(user_id, service_key)` 범위 **서비스 전용** 자격 | 해당 serviceKey 로그인 |

### 2-2. write-path 전수 (credential 을 쓰는 곳은 4곳뿐)

| # | 위치 | 동작 | 계약 |
|---|---|---|---|
| 1 | `auth-register.controller.ts:513` | 신규 가입 — `users.password` 와 **같은 해시**로 credential 생성 | 시작점만 동일 |
| 2 | `auth-register.controller.ts:205` | **기존 계정이 다른 서비스 가입** — `servicePassword ?? password` 로 credential upsert | **의도적 분리** |
| 3 | `user.controller.ts:207` | 비밀번호 변경(serviceKey 있음) — credential 만 갱신 | 주석: "users.password 는 건드리지 않는다" |
| 4 | `passwordResetService.ts:147` | 재설정(serviceKey 있음) — credential 만 갱신 | 주석: "V2 path 에서는 users.password 를 건드리지 않는다 (legacy fallback 보존)" |

경로 2 의 원문 주석:

> 기존 user 의 users.password 는 그대로 유지(다른 서비스 로그인 영향 없음).
> service_credentials 는 해당 서비스 전용으로 새 비밀번호로 upsert.

**→ 서비스별로 다른 비밀번호를 갖는 것은 설계다. 동기화가 "복구"가 아니다.**

### 2-3. 프런트 배선은 계약과 일치한다 (확인 완료)

| 경로 | serviceKey 전달 | 판정 |
|---|---|---|
| `/auth/forgot-password` (5개 서비스) | ✅ `serviceKey: SERVICE_KEY` | 정상 — 재설정이 credential 에 적용 |
| `PUT /users/password` (KPA·K-Cos·Glyco·Neture·PH 전부) | ✅ `serviceKey` 포함 | 정상 — 변경이 credential 에 적용 |
| `/auth/login` (5개 서비스) | ✅ `serviceKey` 포함 | 정상 — credential 로 판정 |

셀프서비스 경로는 전부 정합하다. 사용자가 각 서비스에서 스스로 바꾸고 스스로 로그인하는 한
문제가 발생하지 않는다.

---

## 3. 이중 해싱 등 오염 경로 — 모두 부정

| 의심 | 결과 |
|---|---|
| `User` 엔티티 `@BeforeInsert/@BeforeUpdate hashPassword()` 가 로그인 성공 시 `save(user)` 에서 재해싱 | ❌ 부정 — `if (this.password && !this.password.startsWith('$2'))` 가드 존재 |
| 해시 알고리즘 불일치 | ❌ 부정 — `users.password`·credential 모두 `$2a$` (bcrypt) |
| 고아 credential 로 인한 오판 | ❌ 부정 — 대상 계정 0건 |
| 계정 잠금·비활성으로 인한 401 | ❌ 부정 — `loginAttempts=0`, `lockedUntil=NULL`, `status=active` |
| `SERVICE_NOT_MEMBER` 오분류 | ❌ 부정 — 5개 서비스 membership 전부 `active`, 실제 코드도 `INVALID_CREDENTIALS` 반환 |

---

## 4. 실재하는 결함 2건 (이번 WO 에서 수정하지 않음)

### 4-1. 관리자 비밀번호 재설정의 사일런트 무효 ⚠️ 유의미

`users.password` 만 쓰고 credential 을 건드리지 않는 경로:

| 위치 | 노출 |
|---|---|
| `AdminUserController.ts:379` — `PUT /api/v1/admin/users/:id` (password 포함 시) | O4O-CORE-FREEZE §2.3 Approval Engine 의 공식 API |
| `AdminUserController.ts:275` — 관리자 계정 생성 | |
| `routes/admin/platform-accounts.routes.ts:114` — `PATCH /:id/password` | 관리자 콘솔 |
| `services/account-linking.service.ts:185` | 계정 연결 |
| `scripts/{reset-admin-password, list-and-reset-all-users, create-admin-user, diagnose-admin-login}.ts` | 운영 스크립트 |

**증상**: 관리자가 사용자 비밀번호를 재설정해도, credential 을 가진 사용자의 **서비스 로그인은 옛 비밀번호로 계속 동작**한다.
관리자는 성공 응답을 받으므로 무효라는 사실을 알 수 없다. 사용자는 새 비밀번호로 로그인하지 못한다.

**왜 이번에 고치지 않는가**: 이 경로를 credential 까지 확장하려면
"관리자 재설정 = 모든 서비스 비밀번호 초기화" 라는 **비밀번호 정책 결정**이 필요하다 (§7 중지 조건).
서비스별 자격 분리가 의도인 이상, 관리자가 서비스 전용 비밀번호를 일괄 덮어쓰는 것이
옳은지는 코드가 아니라 정책이 정할 문제다.

### 4-2. 로그인 감사 로그의 success 컬럼이 항상 true

`logLoginAttempt()` 는 `account_activities.details.success` 에만 결과를 쓰고 컬럼 `success` 를 채우지 않아
DB 기본값 `true` 가 남는다. 실측에서 `reason='invalid_password'` 인 행도 `success=t` 였다.

→ 인증 실패 집계를 `success` 컬럼으로 하면 **전량 오집계**된다. 신뢰 가능한 필드는 `details->>'reason'` 뿐이다.
보안·감사 영향이 있으나 credential 계약과 무관하므로 별도 WO 로 분리한다.

---

## 5. 모집단 (전역, read-only)

### 5-1. credential 이 `users.password` 와 다른 건수

| service_key | credentials | 동일 | **상이** |
|---|---:|---:|---:|
| glycopharm | 8 | 3 | 5 |
| k-cosmetics | 4 | 1 | 3 |
| kpa-society | 10 | 6 | 4 |
| neture | 9 | 5 | 4 |
| pharmacy-hub | 9 | 7 | 2 |
| **합계** | **40** | **22** | **18** |

**이 18건은 "정비 대상 모집단"이 아니다.** 설계상 정상일 수 있는 상태이며,
어느 것이 "사용자가 의도한 서비스 전용 비밀번호"이고 어느 것이 "관리자 재설정이 무효화된 결과"인지
**해시만으로는 구분할 수 없다**. 따라서 WO 의 "기존 stale credential 모집단 산출"은
**원리적으로 확정 불가**이며, 이것이 중지 조건 2번째다.

### 5-2. credential 없는 membership (V1 fallback 로 동작 중)

| service_key | memberships | credential 없음 |
|---|---:|---:|
| glycopharm | 2 | 0 |
| k-cosmetics | 2 | 0 |
| kpa-society | 4 | 1 |
| neture | 3 | 0 |
| pharmacy-hub | 3 | 1 |
| platform | 7 | **7** |

`platform` 은 credential 을 만들지 않으므로 admin 로그인은 항상 `users.password` 로 동작한다.

---

## 6. Auth 공통화 브랜치 잠금 해제 — 코드 수정 없이 가능

`work/frontend-auth-commonization` 의 `BLOCKED_EXTERNAL` 은 **백엔드 수정 없이 해소된다.**

원인이 "백엔드 결함"이 아니라 "테스트 계정의 서비스별 비밀번호가 문서값과 다름"이기 때문이다.

**해제 절차 (데이터 변경 승인 불필요 — 사용자 셀프서비스 경로)**

1. 각 서비스의 `/forgot-password` 에서 `renagang21@gmail.com` 재설정 요청
   → 프런트가 `serviceKey` 를 함께 보내므로 토큰에 serviceKey 가 실린다
2. 메일 링크로 새 비밀번호 설정
   → `passwordResetService` 가 **해당 서비스 credential 만** 갱신 (`users.password` 무영향)
3. 5개 서비스에 대해 반복 (kpa-society / glycopharm / k-cosmetics / neture / pharmacy-hub)
4. `docs/local/TEST-ACCOUNTS.local.md` 를 **서비스별 비밀번호 컬럼 구조로 갱신**
   — 현재 문서는 5개 서비스에 단일 비밀번호를 기재하고 있어 구조 자체가 계약과 어긋난다
5. 그 뒤 Auth 공통화 브랜치에서 실제 로그인 E2E 수행 → CHECK §4-1 3번 항목 갱신

> 이 절차는 운영 DB 직접 write 가 아니라 정상 사용자 플로우다. 5-1 의 18건에 손대지 않는다.

---

## 7. 중지 조건 — 2건 충족

WO 가 정의한 중지 조건 중 다음 2건에 해당하여 **최소 수정 단계에 진입하지 않았다.**

| # | 중지 조건 | 충족 근거 |
|---|---|---|
| 1 | 서비스별로 서로 다른 비밀번호를 갖는 것이 **의도된 계약** | §2-2 경로 2 — `WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1` 이 분리를 명시. 경로 3·4 도 "users.password 를 건드리지 않는다"고 명시 |
| 2 | **stale 모집단을 확정할 수 없음** | §5-1 — 상이 18건 중 "의도된 서비스 전용 비밀번호" 와 "관리자 재설정 무효 잔재" 를 해시로 구분 불가 |
| (연계) | 인증·비밀번호 **정책 자체를 변경해야 함** | §4-1 수정은 "관리자 재설정 = 전 서비스 초기화" 정책 결정을 요구 |

WO 금지사항 준수 확인:

- ❌ serviceKey 검증 제거 — 하지 않음
- ❌ `users.password` 무조건 fallback — 하지 않음
- ❌ 실패 후 다른 hash 순차 시도 — 하지 않음
- ❌ 비밀번호 평문·전체 해시 출력 — 하지 않음 (동일성 boolean + `$2a$` prefix 만)
- ❌ 확인 전 일괄 동기화 — 하지 않음 (확인 결과 **의도된 계약**으로 판명)
- ❌ Auth 공통화 브랜치 수정 — 하지 않음 (별도 worktree)
- ❌ main 병합 — 하지 않음

---

## 8. 판단 요청 (다음 WO 를 정하기 위해)

| # | 질문 | 선택지 |
|---|---|---|
| A | 관리자 비밀번호 재설정(§4-1)의 의미 | (가) 현행 유지 — 관리자는 L1 만 재설정. 대신 **무효임을 응답·UI 에 명시** / (나) 관리자 재설정 시 해당 사용자의 **모든 credential 삭제** → 다음 로그인은 `users.password` fallback / (다) 관리자가 **serviceKey 를 지정**해 특정 서비스 credential 만 재설정 |
| B | 서비스별 비밀번호 분리를 **계속 유지**할 것인가 | 유지 시 §4-1 (가)/(다), 폐기 시 Identity V2 Phase 재설계 (별도 대형 WO) |
| C | §4-2 감사 로그 결함 | 별도 WO 발주 여부 |

> A 의 (나)는 credential 삭제 = 운영 데이터 write 이므로, 선택 시 dry-run·모집단 확정·rollback 계약이 선행되어야 한다.

---

## 9. Git · 검증 채널

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-identity-v2` |
| 브랜치 | `fix/identity-v2-service-credential-password-hash` (`origin/main` `daf4f5f37` 기준) |
| 코드 변경 | **0건** |
| DB write | **0건** — SELECT 전용 (Cloud SQL Auth Proxy v2, port 5451, `o4o_api` 계정) |
| 프로덕션 API 호출 | 2회 (로그인 재현). 실패 1회 — 계정 잠금 임계치(5회) 미도달, 사후 `loginAttempts` 영향은 성공 로그인으로 상쇄 |
| 임시 파일 | 요청 body·응답 파일 즉시 삭제 (자격증명 잔존 0) |
| main 병합 | ❌ |
