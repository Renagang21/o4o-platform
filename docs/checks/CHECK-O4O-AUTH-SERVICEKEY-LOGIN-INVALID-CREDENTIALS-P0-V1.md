# CHECK-O4O-AUTH-SERVICEKEY-LOGIN-INVALID-CREDENTIALS-P0-V1

> **결과: `HOLD` — 코드 수정 0.** WO §0 중지 조건 **1건 명확 충족**:
> `serviceKey 처리 정책이 서비스별로 의도적으로 로그인 차단하는 구조임`
> **작성일:** 2026-08-09
> **판정:** P0 아님. **버그가 아니라 설계된 서비스별 자격(credential) 분리**다.
> **선행 정본:** `CHECK-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-V1`
> (commit `39826338e`, 브랜치 `fix/identity-v2-service-credential-password-hash` — **main 미병합**)

---

## 0. 한 줄 결론

`serviceKey` 포함 로그인의 401 `INVALID_CREDENTIALS` 는 **진짜 비밀번호 불일치**다.
오분류가 아니다. 해당 서비스의 `service_credentials.password_hash` 와 입력 비밀번호가 다를 뿐이며,
`serviceKey` 없는 로그인이 200 인 것은 그때만 `users.password` 를 보기 때문이다.

**본 WO 가 제안한 수정(§4)은 적용하면 안 된다.** "비밀번호가 맞는데 serviceKey 때문에 막힌다"는
전제 자체가 성립하지 않으며, 그 흐름대로 고치면 **credential 이 있어도 `users.password` 로 fallback**
하게 되어 `WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1` 이 세운 **보안 경계를 제거**한다.

---

## 1. 선행 조사와의 관계 (중복 조사 회피)

본 WO 착수 시점에 **병행 세션이 동일 401 을 이미 완결 조사**해 두었음을 발견했다.

```
worktree : C:/tmp/o4o-identity-v2
branch   : fix/identity-v2-service-credential-password-hash   (main 미병합)
commit   : 39826338e
문서      : docs/checks/CHECK-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-V1.md (267줄)
결론      : "drift 아님, 설계된 서비스별 자격 분리" · 코드 수정 0 · DB write 0
```

그 문서가 **원인 규명의 정본**이다(모집단 40건 실측, write-path 전수, 이중 해싱 등 오염 경로 전부 부정 포함).
본 CHECK 는 중복 분석을 하지 않고, **본 WO 관점에서 새로 확인·정정된 것만** 기록한다.

---

## 2. 현재 main 코드로 재확인 (read-only)

선행 조사는 `origin/main = daf4f5f37` 기준이다. 현재 main(`0c1a941aa`)에서도 동일함을 확인했다.

`apps/api-server/src/services/auth/auth-login.service.ts`

| 라인 | 내용 |
|---:|------|
| 175-183 | serviceKey 있으면 **membership 먼저 검사** → 미가입 시 `SERVICE_NOT_MEMBER` (별도 코드) |
| 192-199 | `(userId, serviceKey)` 로 `ServiceCredential` 조회 |
| 215 | `const targetHash = credentialHash ?? user.password;` ← **credential 이 있으면 그것만 본다** |
| 217-221 | `comparePassword` 실패 → `InvalidCredentialsError` (= `INVALID_CREDENTIALS`) |

`apps/api-server/src/modules/auth/controllers/auth-login.controller.ts:117-122`

```ts
if (error.code === 'INVALID_CREDENTIALS')  → 401 INVALID_CREDENTIALS
if (error.code === 'SERVICE_NOT_MEMBER')   → 401 SERVICE_NOT_MEMBER
```

### 2-1. WO §4 가 요구한 "오류 코드 분리"는 **이미 구현되어 있다**

WO §4 의 핵심 요구는 다음이었다.

```
serviceKey 처리 실패를 INVALID_CREDENTIALS로 반환하지 말 것
비밀번호 오류와 serviceKey/멤버십 오류를 구분
```

코드는 **이미 그렇게 되어 있다** — 멤버십 실패는 `SERVICE_NOT_MEMBER` 로 분리되어 있고(라인 178-183),
`INVALID_CREDENTIALS` 는 실제 해시 비교 실패에서만 나온다(라인 217-221).

즉 **내가 만난 401 은 오분류가 아니라 정확한 분류**였다. 고칠 코드가 없다.

---

## 3. 본 WO 관점의 신규 확인 — `neture` 케이스

선행 조사는 `serviceKey='kpa-society'` 로 재현했다. 본 건은 `serviceKey='neture'` 에서 발생했고,
동일 원인임을 확인했다.

| 요청 (`renagang21@gmail.com`, 동일 비밀번호) | 결과 |
|---|---|
| `{email, password}` | **200** |
| `{email, password, serviceKey:'neture', includeLegacyTokens:true}` | **401 `INVALID_CREDENTIALS`** |

선행 조사 §1-3 의 계정 실측표에 이 계정의 **`neture` credential 이 존재하고
`password_hash = users.password` 가 `false`** 로 기록되어 있다 → 401 의 직접 설명이 된다.

> 추가 로그인 시도는 하지 않았다. 계정 잠금 임계치(5회/30분) 회피 — 본 세션 누적 실패 3회.

---

## 4. 선행 보고의 정정 (중요)

`CHECK-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1 §7.2` 에서 본인이 기록한 다음 표현을 **정정한다.**

| 원문 | 정정 |
|------|------|
| "**웹 로그인이 프로덕션에서 막혀 있다**" / "공급자·매장 모두 웹으로 로그인할 수 없다" | **과장이다.** 각 서비스에서 **자기 비밀번호를 설정한 사용자는 정상 로그인**한다. 막힌 것은 **테스트 계정의 문서 기재 비밀번호가 그 서비스 credential 과 다른 것**뿐이다 |
| "P0 후보" | **P0 아님.** 서비스 장애가 아니라 테스트 계정 자격 불일치 + 문서 구조 문제 |
| "`serviceKey` 유무로 결과가 갈리는 결함" | 갈리는 것은 사실이나 **설계된 동작**이다 (L1 `users.password` / L2 `service_credentials`) |

정정 근거: 셀프서비스 경로(`/forgot-password`, `PUT /users/password`)는 5개 서비스 전부 `serviceKey` 를
정상 전달하므로(선행 조사 §2-3), 사용자가 서비스 안에서 비밀번호를 바꾸고 그 서비스로 로그인하는
정상 흐름에서는 문제가 발생하지 않는다.

**영향:** 이 정정으로 본 건의 우선순위가 P0 → 정책 결정 대기로 내려간다.

---

## 5. 실재하는 결함 (본 WO 범위 밖 — 미수정)

선행 조사가 확정한 2건을 그대로 승계한다. 둘 다 **정책 결정이 선행**되어야 한다.

| # | 결함 | 성격 |
|:-:|------|------|
| 5-1 | **관리자 비밀번호 재설정의 사일런트 무효** — `AdminUserController` 등 6개 경로가 `users.password` 만 갱신하고 credential 을 건드리지 않는다. 관리자는 성공 응답을 받지만 사용자의 **서비스 로그인은 옛 비밀번호로 계속 동작**한다 | "관리자 재설정 = 전 서비스 초기화" 인지에 대한 **비밀번호 정책 결정** 필요 |
| 5-2 | `account_activities.success` 컬럼이 실패에도 `true` — 인증 실패 집계 시 **전량 오집계**. 신뢰 가능한 필드는 `details->>'reason'` 뿐 | 감사·보안 영향, credential 계약과 무관 → 별도 WO |

---

## 6. 테스트 계정 문서 구조 문제

`docs/local/TEST-ACCOUNTS.local.md` 는 **계정당 비밀번호 1개**를 기재한다. 이는 L2 credential 계약과
구조적으로 어긋난다 — 실제로는 `(계정 × 서비스)` 마다 비밀번호가 다를 수 있다.

본 세션 실측: `sohae21@naver.com` 은 `serviceKey` 없는 로그인조차 401(문서값 불일치),
`renagang21@gmail.com` 은 `serviceKey` 없으면 200 / `neture` 포함하면 401.

→ **문서를 서비스별 비밀번호 컬럼 구조로 바꾸는 것**이 정합하다(선행 조사 §6-4 와 동일 결론).

---

## 7. WO 검증 항목 대비 실행 결과

| WO §6 항목 | 결과 |
|------------|------|
| 1. serviceKey 없음 200 | ✅ 확인 (기존 실측) |
| 2. serviceKey='neture' 200 | ❌ **미달성이며 달성 대상이 아님** — 해당 서비스 credential 비밀번호를 알아야 성립 |
| 3. kpa-society 판정 | 선행 조사에서 401 확인, 원인 동일 |
| 4. 잘못된 비밀번호 401 | ✅ 현행 정상 |
| 5. 권한 없는 serviceKey 별도 코드 | ✅ **이미 `SERVICE_NOT_MEMBER` 로 분리 구현됨** (§2-1) |
| 6~8. 웹 smoke / 대시보드 진입 | **미실행** — 코드 수정이 없어 검증 대상 없음 |

typecheck / build / 배포: **미실행** (코드 변경 0건이라 대상 없음).

---

## 8. 결정 — **확정 (2026-08-09 사용자 승인)**

본 WO 는 **P0 인증 버그가 아니라 Identity V2 서비스별 credential 분리 정책에 따른 정상 동작**으로
재분류하고, **로그인 로직은 수정하지 않는다.**

| # | 결정 | 확정 내용 |
|:-:|------|-----------|
| **A** | 관리자 비밀번호 재설정 | **현행 의미 유지 + 명시.** 서비스별 credential 이 있는 경우 **해당 서비스 로그인 비밀번호가 바뀌지 않을 수 있음**을 응답·UI 에 표시한다. credential 자체는 변경하지 않는다 |
| **B** | 서비스별 비밀번호 분리 | **유지.** `users.password` fallback 으로 되돌리지 않는다 |
| **C** | `account_activities.success` 오기록 | **별도 WO 로 분리** |
| **D** | `TEST-ACCOUNTS.local.md` | **서비스별 비밀번호 컬럼 구조로 개편** |

### 8-1. 절대 하지 않을 것 (확정)

```text
credential 이 있는데 users.password 로 fallback   ← 보안 경계 파괴
serviceKey 무시
공통 비밀번호로 전 서비스 로그인 허용
```

### 8-2. 후속 WO (우선순위 확정)

| 순위 | WO | 목적 |
|:---:|----|------|
| **1** | `WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1` | 관리자 재설정의 사일런트 무효를 응답·UI 에서 명확화. **실제 credential 변경은 하지 않음** |
| 2 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1` | 인증 실패가 `success=true` 로 기록되는 오집계 수정 |
| 3 | `WO-O4O-TEST-ACCOUNTS-SERVICE-CREDENTIAL-DOCUMENTATION-V1` | 테스트 계정 문서를 서비스별 비밀번호 구조로 정리 |

**본 WO 는 여기서 종료한다** (HOLD / 정책 재분류). 후속은 위 3건으로 분리 진행.

---

## 9. 변경 없음 선언

```
코드 변경 0 · migration 0 · DB write 0 · 배포 0 · 운영 계정/멤버십 수정 0
프로덕션 로그인 API 추가 호출 0 (계정 잠금 회피)
git 변경 = 본 CHECK 문서 1건
```

WO 금지사항 준수: serviceKey 검증 제거 ❌ / `users.password` 무조건 fallback ❌ /
전 serviceKey 무조건 허용 ❌ / 운영 계정 상태 수정 ❌ / 멤버십 backfill ❌ /
공급자·매장·QR·태블릿·Signage·STORE 설명서 코드 수정 ❌ — **전부 하지 않음.**

---

*결과: `HOLD` / 정책 재분류로 **종료** · P0 아님(설계된 동작) · WO §4 수정안은 보안 경계 제거이므로 적용 금지 · 오류 코드 분리는 이미 구현됨 · 결정 A–D 확정 · 후속 WO 3건 분리*
