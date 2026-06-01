# IR-O4O-EXISTING-ACCOUNT-SERVICE-REGISTRATION-CREDENTIAL-AUDIT-V1

> **조사 유형:** 구조 감사 IR (Structural Audit)
> **조사 일자:** 2026-05-27
> **조사 대상:** 기존 O4O 이메일 계정이 다른 서비스에 추가 가입할 때의 비밀번호 처리 흐름
> **코드 수정:** 없음 (조사 전용)

---

## 1. 조사 배경

Identity V2에서는 `service_credentials` 테이블로 서비스별 독립 Credential을 보장한다.
그러나 기존 이메일로 다른 서비스에 추가 가입하는 화면에서는 "기존 비밀번호" 하나만 입력받고 있다.
이 흐름이 Identity V2 철학과 충돌하는지, password 의미 분리가 필요한지 확인한다.

---

## 2. 현재 구조 (Identity V2 4-Layer)

| Layer | 테이블 | Unique Key | 역할 |
|-------|--------|-----------|------|
| **L1** | `users` | `email` (전역) | 누구인가 |
| **L2** | `service_credentials` | `(user_id, service_key)` | 서비스별 password hash |
| **L3** | `service_memberships` | `(user_id, service_key)` | 서비스 가입 상태 |
| **L4** | `role_assignments` | `(user_id, role, is_active)` | 서비스별 권한 |

**Phase 1 완료 항목 (WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1):**
- 신규 가입 시 service_credentials 생성 ✅
- 로그인 시 service_credentials 우선, users.password fallback ✅
- password reset / change 시 service_credentials 갱신 ✅
- KPA + GlycoPharm 서비스별 비밀번호 독립 동작 확인 ✅

---

## 3. 현재 existing-account registration 흐름

### 3-1. Backend 흐름

**파일:** `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`

```
POST /api/v1/auth/register (기존 이메일)
  ↓
1. users 테이블에서 email 조회 → existingUser 확인
2. service_memberships에서 이미 해당 서비스 가입 여부 확인
   → 이미 가입이면 409 SERVICE_ALREADY_JOINED
3. comparePassword(data.password, existingUser.password)
   ← data.password = 프론트에서 보낸 "기존 비밀번호"
   ← existingUser.password = users.password (L1, V1 legacy)
   → 불일치면 401 PASSWORD_MISMATCH
4. 트랜잭션:
   a. service_memberships INSERT (status='pending')
   b. service_credentials UPSERT:
      { userId, serviceKey, passwordHash: await hashPassword(data.password) }
      ← data.password를 다시 hash하여 L2에 저장
      ← 즉, 기존 비밀번호 = 새 서비스 Credential
```

**DTO 구조 (`register.dto.ts`):**
```typescript
password: string    // 하나의 필드 — 기존 계정 확인 + 새 서비스 Credential 겸용
// currentPassword 필드 없음
// servicePassword 필드 없음
```

### 3-2. Frontend 현황

| 서비스 | check-email 호출 | existingAccountMode | 비밀번호 필드 (기존 계정 시) | 새 서비스 비밀번호 필드 |
|--------|:---:|:---:|:---:|:---:|
| **GlycoPharm** | ✅ | ✅ | 1개 ("기존 비밀번호") | ❌ 없음 |
| **K-Cosmetics** | ✅ | ✅ | 1개 ("기존 비밀번호") | ❌ 없음 |
| **Neture** | ✅ | ✅ | 1개 ("기존 비밀번호") | ❌ 없음 |
| **KPA-Society** | ❌ 없음 | ❌ 없음 | 항상 2개 (강도 체크) | — |

**GlycoPharm / K-Cosmetics / Neture 공통 패턴:**
- 이메일 blur → `check-email` API → `exists=true, alreadyJoined=false`이면 `existingAccountMode=true`
- 라벨: `"비밀번호"` → `"기존 비밀번호"`
- 비밀번호 강도 체크 숨김
- 비밀번호 확인 필드 숨김
- submit 시 `password` 하나만 전송

**KPA-Society 특이사항:**
- check-email 클라이언트 호출 없음
- 항상 2개 필드 (password + passwordConfirm) 표시
- 강도 체크 항상 실행
- 기존 계정 여부를 서버에서 처리하여 에러 반환

---

## 4. 핵심 질문에 대한 답

### Q1: 기존 비밀번호를 새 서비스 credential로 복제하는 것이 Identity V2와 충돌하는가?

**판정: 부분 충돌 (Partial Conflict)**

Identity V2는 서비스별 Credential 독립성을 원칙으로 한다.
현재 구현에서는 기존 비밀번호 = 새 서비스 Credential이므로, 사용자가 새 서비스에서 다른 비밀번호를 사용하려 해도 방법이 없다.
단, V2 Phase 1 완료 이후 `service_credentials`가 분리되어 있으므로, 가입 이후 change-password를 통해 각 서비스 비밀번호를 독립적으로 변경하는 것은 가능하다.
따라서 "가입 시점"에 한해 V2 원칙이 완전히 관철되지 않는 상태다.

### Q2: 기존 비밀번호 입력을 본인 확인용으로 요구하는 것은 타당한가?

**판정: 타당함**

기존 계정 소유 여부를 검증하려면 무언가로 본인을 확인해야 한다.
현재 구조에서 `users.password`로 확인하는 것은 V1 fallback이지만, 이 확인 자체는 보안상 필요하다.
다만 확인 수단으로만 사용하고, 새 서비스 Credential에는 새 비밀번호를 저장해야 V2가 완전해진다.

### Q3: 본인 확인용 비밀번호와 새 서비스 비밀번호를 분리해야 하는가?

**판정: YES — 분리가 V2 원칙에 맞음**

현재: `password` 1개 필드 → 본인 확인 + 새 서비스 Credential 겸용
목표: `currentPassword`(본인 확인) + `servicePassword`(새 서비스 Credential) 분리

V2 원칙 완성을 위해서는 분리가 필요하다.
단, 이 작업은 UX + Backend DTO + 로직 변경을 모두 포함하므로 별도 WO가 필요하다.

### Q4: 사용자가 새 서비스 가입 시 비밀번호를 새로 설정하지 못하는 것이 UX/정책상 문제인가?

**판정: 장기적으로 문제 소지 있음**

단기적으로는:
- 사용자는 가입 후 각 서비스에서 change-password로 독립 비밀번호 설정 가능
- 현재 V1 legacy 이용자 대다수는 비밀번호를 서비스별로 다르게 쓰지 않음
- UX 복잡도 증가 vs 실사용 필요성 낮음

장기적으로는:
- O4O 각 서비스는 독립 사업자 성격 → 서비스별 비밀번호 독립성이 정책 원칙
- 사용자에게 "다른 서비스니까 비밀번호를 다르게 설정하실 수 있습니다"를 명확히 해야 함
- 특히 KPA-Society (의약사 전용) vs GlycoPharm (일반 약국) 간 계정 보안 독립성 중요

### Q5: service_credentials가 이미 분리된 상태에서 가입 UX만 V1에 남아 있는가?

**판정: YES**

`service_credentials` 테이블은 존재하고, 로그인/change-password/reset은 이미 V2 기반으로 동작한다.
가입 화면만 V1 방식(기존 비밀번호 = 새 서비스 Credential)으로 남아 있는 상태다.

---

## 5. Option 비교표

### Option A — 현재 유지

```
기존 이메일 감지 시 기존 비밀번호만 입력.
그 비밀번호를 그대로 새 서비스 Credential에 저장.
```

| 항목 | 내용 |
|------|------|
| 코드 변경 | 없음 |
| Identity V2 정합 | ❌ 부분 충돌 (가입 시점) |
| 사용자 서비스별 비밀번호 독립 | ❌ 가입 시 불가 (변경은 이후 가능) |
| UX 복잡도 | ✅ 현재 수준 유지 |
| 권장 여부 | 단기 유지는 가능, 장기적으로 부적합 |

### Option B — 기존 비밀번호 확인 + 새 서비스 비밀번호 설정 [권장]

```
기존 이메일 감지 시:
  - 기존 계정 확인 비밀번호 (본인 확인용)
  - 새 서비스 비밀번호 (서비스 Credential용)
  - 새 서비스 비밀번호 확인

Backend:
  - currentPassword로 users.password 본인 확인
  - servicePassword를 hash하여 service_credentials[serviceKey] 저장
```

| 항목 | 내용 |
|------|------|
| 코드 변경 | Backend DTO + 로직 변경, Frontend 4개 서비스 UI 변경 |
| Identity V2 정합 | ✅ 완전 충족 |
| 사용자 서비스별 비밀번호 독립 | ✅ 가입 시점부터 설정 가능 |
| UX 복잡도 | ⚠️ 필드 2→3개 증가 |
| 권장 여부 | **장기 권장** |

### Option C — 이메일 인증 기반 본인 확인 + 새 서비스 비밀번호

```
기존 비밀번호 대신 이메일 인증 코드로 본인 확인.
이후 새 서비스 비밀번호 설정.
```

| 항목 | 내용 |
|------|------|
| 코드 변경 | 이메일 토큰 + 대기 흐름 포함 대규모 변경 |
| Identity V2 정합 | ✅ 완전 충족 |
| 기존 비밀번호 분실 사용자 대응 | ✅ |
| 구현 범위 | ❌ 크고 복잡 |
| 권장 여부 | 장기 과제, 즉시 불필요 |

### Option D — 기존 로그인 후 서비스 추가 가입

```
기존 계정으로 먼저 로그인 → 로그인 세션에서 새 서비스 신청.
```

| 항목 | 내용 |
|------|------|
| 코드 변경 | 가입 화면을 완전히 다르게 설계 |
| UX | 단계 증가 |
| 구현 범위 | 크고 복잡 |
| 권장 여부 | 현재 시점 부적합 |

---

## 6. 권장안

**Option B** — 기존 비밀번호 확인 + 새 서비스 비밀번호 분리

**이유:**
- Identity V2의 서비스별 Credential 독립성 원칙을 가입 시점부터 관철
- 구현 범위가 Option C/D보다 작음
- 기존 사용자(이미 가입 완료)에게 영향 없음
- DB/migration 불필요

**UX 문구 예시 (기존 계정 감지 시):**
```
이미 O4O 플랫폼 계정이 있습니다.
계정 확인을 위해 현재 사용 중인 비밀번호를 입력해 주세요.
{서비스명}에서 사용할 비밀번호는 별도로 설정하실 수 있습니다.

[기존 계정 비밀번호 *]
[{서비스명} 비밀번호 *]
[{서비스명} 비밀번호 확인 *]
```

---

## 7. Backend 변경 범위 (Option B 기준)

**파일:** `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`

**DTO 확장 (`register.dto.ts`):**
```typescript
// 현재
password: string

// Option B — 명명 예시 (신규 사용자와 분기 필요)
currentPassword?: string   // 기존 계정 확인용 (existing-user branch에서만 사용)
servicePassword?: string   // 새 서비스 비밀번호 (existing-user branch에서만 사용)
password: string           // 신규 사용자 가입 시 그대로 사용 (기존 필드 유지)
```

**기존 사용자 분기 변경:**
```typescript
// 현재
comparePassword(data.password, existingUser.password)  // 본인 확인
hashPassword(data.password)                            // 새 Credential = 기존 비밀번호

// Option B
comparePassword(data.currentPassword, existingUser.password)  // 본인 확인
hashPassword(data.servicePassword)                            // 새 Credential = 새 비밀번호
```

**신규 사용자 분기 변경 없음** — `password` 필드 그대로 사용.

**DB/Migration 필요 여부:** 없음 (`service_credentials` 테이블 구조 변경 불필요)

---

## 8. Frontend 변경 범위 (Option B 기준)

### 공통 패턴 변경 (GlycoPharm, K-Cosmetics, Neture)

각 `RegisterPage.tsx` / `RegisterModal.tsx` 에서:

**기존 (existingAccountMode=true 시):**
```
[기존 비밀번호 *]
```

**변경 후:**
```
[기존 계정 비밀번호 *]         → currentPassword
[{서비스명} 비밀번호 *]        → servicePassword
[{서비스명} 비밀번호 확인 *]   → servicePasswordConfirm (프론트 only)
```

**submit 시 POST body 변경:**
```typescript
// 현재
{ email, password, service, ... }

// Option B
{ email, currentPassword, servicePassword, service, ... }
// 또는
{ email, password: currentPassword, servicePassword, service, ... }
// (DTO 명명 정책에 따라 결정)
```

**KPA-Society:** existingAccount 감지 없으므로 별도 처리 설계 필요.

**공통 컴포넌트 여부:**
- 현재 4개 서비스 각각 별도 파일 (`RegisterPage.tsx` / `RegisterModal.tsx`)
- 공통 컴포넌트 없음 → 4개 파일 개별 수정 필요
- 수정 시 공통 컴포넌트로 추출 검토 가능 (선택)

---

## 9. 기존 사용자/운영 영향

| 항목 | 영향 |
|------|------|
| 기존 service_credentials 데이터 | 없음 (변경 없음) |
| 이미 추가 가입 완료 사용자 | 없음 (가입 후 login/change-password 흐름 동일) |
| password reset 흐름 | 없음 (service_credentials 기준 갱신, 변경 불필요) |
| change-password 흐름 | 없음 |
| login dual-read | 없음 |
| users.password fallback | 없음 |

---

## 10. 현재 구조 vs O4O 철학 충돌 체크

| 원칙 | 현재 상태 | 판정 |
|------|-----------|------|
| 각 서비스는 독립 사업자 성격 | KPA/GlycoPharm/Cosmetics/Neture 각각 독립 | ✅ |
| 서비스별 Credential 독립성 | `service_credentials` 분리됨, **그러나 가입 시 기존 비밀번호 복제** | ⚠️ 부분 충돌 |
| 기존 계정 확인과 새 서비스 가입 권한 분리 | 현재 같은 `password` 필드 겸용 | ❌ 미분리 |
| 서비스별 password 독립 설정 가능성 | 가입 이후 change-password로 가능, **가입 시점은 불가** | ⚠️ 제한적 |
| O4O 독립 서비스 구조와 register UX 정합 | service_credentials 분리는 되었으나 가입 UX가 V1 방식으로 잔존 | ❌ UX만 V1 잔존 |

**결론:** service_credentials(L2)는 V2로 완전히 이행했으나, **가입 화면만 V1 방식으로 고립**되어 있다.

---

## 11. 요약

| 항목 | 현재 상태 |
|------|-----------|
| Backend DTO | `password` 1개 필드 — 본인 확인 + 새 Credential 겸용 |
| 기존 이메일 가입 시 password 의미 | **C. 둘 다 겸용** (본인 확인 + 새 서비스 Credential) |
| 신규 가입 시 password 의미 | 신규 사용자 비밀번호 (users.password + service_credentials 동시 저장) |
| Identity V2 충돌 | ⚠️ 가입 시점에 부분 충돌 — 가입 후 변경은 V2 준수 |
| DB/Migration 필요 | 없음 |
| 권장안 | **Option B** — currentPassword(확인) + servicePassword(신규 Credential) 분리 |

---

## 12. 후속 WO 제안

### WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1 [P2]

**목표:** 기존 계정 추가 서비스 가입 시 본인 확인 비밀번호와 새 서비스 비밀번호를 분리한다.

**범위:**
1. `register.dto.ts` — `currentPassword`, `servicePassword` 필드 추가 (기존 `password` 유지)
2. `auth-register.controller.ts` — 기존 사용자 분기: `currentPassword`로 확인, `servicePassword`를 Credential에 저장
3. GlycoPharm / K-Cosmetics / Neture `RegisterPage.tsx` / `RegisterModal.tsx` — existingAccountMode UI 확장
4. KPA-Society `RegisterModal.tsx` — existingAccount 감지 추가 또는 별도 처리 설계

**검증 시나리오:**
```
KPA 계정 (email=A, KPA_password=P1)으로 GlycoPharm 추가 가입:
  currentPassword = P1 → 본인 확인 성공
  servicePassword = P2 → GlycoPharm service_credentials에 P2 hash 저장

로그인 검증:
  KPA + P1 → 성공 ✅
  GlycoPharm + P2 → 성공 ✅
  GlycoPharm + P1 → 실패 ✅  (service_credentials에 P2만 있음)
  KPA + P2 → 실패 ✅
```

**DB/Migration:** 없음

---

**작성:** IR-O4O-EXISTING-ACCOUNT-SERVICE-REGISTRATION-CREDENTIAL-AUDIT-V1
**상태:** 조사 완료, 후속 WO 대기
**다음 단계:** 사용자 확인 후 WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1 실행
