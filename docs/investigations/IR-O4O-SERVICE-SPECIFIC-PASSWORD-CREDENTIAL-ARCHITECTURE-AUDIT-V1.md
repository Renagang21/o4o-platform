# IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1

> **조사 전용 IR — 코드 / migration / UI 수정 없음.**
> 본 문서는 "현재 O4O 인증 구조에서 공통 Identity(users) 유지 상태로 **서비스별 독립 Password(Credential)** 구조가 가능한지" 판단하기 위한 **구조 조사 + 철학 충돌 체크** 보고서이다.

- **작성일:** 2026-05-23
- **분류:** Investigation (read-only)
- **대상 영역:** Auth · Identity · ServiceMembership · Credential
- **관련 Freeze:** F9 (RBAC SSOT), F10 (O4O Core), F11 (User/Operator)
- **선행 IR:**
  - [IR-O4O-AUTH-JWT-PAYLOAD-AUDIT-V1](IR-O4O-AUTH-JWT-PAYLOAD-AUDIT-V1.md)
  - [IR-O4O-MULTI-SERVICE-MEMBERSHIP-AUDIT-V1](IR-O4O-MULTI-SERVICE-MEMBERSHIP-AUDIT-V1.md)
  - [IR-O4O-AUTH-ARCHITECTURE-V1](../audit/IR-O4O-AUTH-ARCHITECTURE-V1.md)
- **관련 WO:**
  - `WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1` (2026-03-25) — Password Sync 엔드포인트 완전 제거
  - `WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1` (2026-05-22) — Reset Token 에 `serviceKey` 격리 컬럼 추가

---

## 0. 요약 (Executive Summary)

| 항목 | 결론 |
|------|------|
| 현재 구조 | **users.password 단일 컬럼** 1개로 모든 서비스 인증 (공통 password 모델) |
| service_memberships | password 컬럼 **없음** (멤버십 상태/역할만 추적) |
| 같은 이메일 다중 가입 | 코드 레벨 **허용** (UNIQUE(userId, serviceKey)) |
| serviceKey 로그인 검증 | 선택적 (membership 존재 확인) — password 자체는 공통 |
| 비밀번호 재설정 | reset_token 에 serviceKey 격리 **이미 적용** (2026-05-22) |
| O4O 철학(서비스별 독립) | **공식 baseline 과 직접 충돌** (§H 참조) |
| 변경 권장 방향 | **C. 단계적 분리 — 다층 결정 필요** (§H 결론 참조) |

**핵심 충돌**: 본 IR 의 출발 전제("서비스별 독립 password 가능") 는 현재 공식 baseline `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` §2.1 의 **"비밀번호는 플랫폼 전체에서 동기화됨"** 문구와 정면 충돌한다. 본 IR 의 **§H 가 가장 중요한 결과 섹션**이다.

---

## A. 현재 Password 사용 구조 조사

### A.1 users 엔티티의 password 필드

**위치:** [apps/api-server/src/modules/auth/entities/User.ts:25-26](../../apps/api-server/src/modules/auth/entities/User.ts#L25-L26)

```typescript
@Column({ type: 'varchar', length: 255 })
password!: string; // bcrypt hashed
```

- type: `varchar(255)`
- nullable: **false** (OAuth-only 사용자는 가입 시 임의 토큰을 hash 해서 저장)
- select: 기본 (조회 가능)
- hash: `@BeforeInsert / @BeforeUpdate` hook 에서 bcrypt 자동 해싱 (User.ts:220-226)

### A.2 users 테이블의 기타 Credential 관련 컬럼

| 컬럼 | 용도 |
|------|------|
| `resetPasswordToken` (varchar 255, nullable) | 비밀번호 재설정 토큰 |
| `resetPasswordExpires` (timestamp, nullable) | 재설정 토큰 만료 |
| `refreshTokenFamily` (varchar 255, nullable) | Refresh Token family tracking |
| `loginAttempts` (int, default 0) | 실패 횟수 |
| `lockedUntil` (timestamp, nullable) | 계정 잠금 해제 시각 |

→ 모두 **user-global** (서비스별 분리 없음).

### A.3 service_memberships 의 password 컬럼

**위치:** [apps/api-server/src/modules/auth/entities/ServiceMembership.ts](../../apps/api-server/src/modules/auth/entities/ServiceMembership.ts)

```typescript
@Entity('service_memberships')
@Unique(['userId', 'serviceKey'])
@Index(['serviceKey', 'status'])
export class ServiceMembership {
  id, userId, serviceKey, status, role,
  approvedBy?, approvedAt?, rejectionReason?,
  createdAt, updatedAt
}
```

→ **password 컬럼 없음**. (구조적으로 분산되어 있지 않다.)

### A.4 Password 가 직접 참조되는 파일 (총 20개)

| # | 파일 경로 | 주요 함수 / 라인 | 사용 방식 |
|---|----------|------------------|----------|
| 1 | [apps/api-server/src/modules/auth/entities/User.ts](../../apps/api-server/src/modules/auth/entities/User.ts) (L25) | column 정의 + hash hook | 단일 저장소 |
| 2 | [apps/api-server/src/services/auth/auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) (L171, L183, L420) | handleEmailLogin / handleOAuthLogin | bcrypt.compare + OAuth 랜덤 hash |
| 3 | [apps/api-server/src/modules/auth/controllers/auth-login.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-login.controller.ts) (L49) | login() body 파싱 | `{ email, password, serviceKey }` |
| 4 | [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) (L90, L173, L181) | register() | 신규: hashPassword / 기존: comparePassword |
| 5 | [apps/api-server/src/modules/user/controllers/user.controller.ts](../../apps/api-server/src/modules/user/controllers/user.controller.ts) (L163, L170) | changePassword() | current 검증 → 신규 저장 |
| 6 | [apps/api-server/src/services/passwordResetService.ts](../../apps/api-server/src/services/passwordResetService.ts) (L38-46, L130, L133) | requestPasswordReset / resetPassword | hashPassword + serviceKey 격리 |
| 7 | [apps/api-server/src/modules/auth/controllers/password.controller.ts](../../apps/api-server/src/modules/auth/controllers/password.controller.ts) (L76) | resetPassword endpoint | service 위임 |
| 8 | [apps/api-server/src/entities/PasswordResetToken.ts](../../apps/api-server/src/entities/PasswordResetToken.ts) | entity (serviceKey 컬럼 있음) | reset token 저장 |
| 9 | [apps/api-server/src/services/auth/auth-context.helper.ts](../../apps/api-server/src/services/auth/auth-context.helper.ts) (L40-47) | generateTokensWithContext | JWT 발급 |
| 10 | [apps/api-server/src/utils/token.utils.ts](../../apps/api-server/src/utils/token.utils.ts) (L75-211, L237-245) | generateAccessToken / generateTokens | password 미포함 |
| 11 | [apps/api-server/src/modules/auth/services/refresh-token.service.ts](../../apps/api-server/src/modules/auth/services/refresh-token.service.ts) (L121-149) | refreshAccessToken | password 무관 |
| 12 | [apps/api-server/src/entities/RefreshToken.ts](../../apps/api-server/src/entities/RefreshToken.ts) | entity | password 컬럼 없음 |
| 13 | [apps/api-server/src/controllers/admin/AdminUserController.ts](../../apps/api-server/src/controllers/admin/AdminUserController.ts) (L245, L356) | createUser / updateUser | hashPassword |
| 14 | [apps/api-server/src/services/account-linking.service.ts](../../apps/api-server/src/services/account-linking.service.ts) | linkOAuthAccount | hashPassword |
| 15 | apps/api-server/src/scripts/reset-admin-password.ts | CLI script | 운영 도구 |
| 16 | apps/api-server/src/scripts/create-admin-user.ts | CLI script | 운영 도구 |
| 17 | apps/api-server/src/scripts/diagnose-admin-login.ts | CLI script | 운영 도구 |
| 18 | apps/api-server/src/scripts/list-and-reset-all-users.ts | CLI script | 운영 도구 |
| 19 | apps/api-server/src/database/migrations/1700000000000-CreateUsersTable.ts | migration | password varchar 생성 |
| 20 | apps/api-server/src/database/migrations/1771200000015-CreateAuthTokenTables.ts | migration | password_reset_tokens / email_verification_tokens 생성 |

### A.5 인증 Middleware

- `requireAuth` 등 모든 auth middleware 는 **JWT 검증만** 수행. password 컬럼을 직접 참조하는 middleware 없음.
- 따라서 password 분리 시 **middleware 계층은 영향 없음** — login / register / reset 의 3개 경로만 변경 대상.

### A.6 영향 범위 평가

- 직접 참조 파일: **20개**
- 핵심 변경 지점 함수: **약 23개**
- 영향 범위: **L (Large)** — Core entity 변경 + 신규 entity + 3개 controller 로직 분기 + migration + admin CLI script

---

## B. serviceKey 로그인 구조 정합성 조사

### B.1 현재 login flow 에서 serviceKey

[apps/api-server/src/services/auth/auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) (L157-168)

```typescript
if (serviceKey) {
  const membership = await smRepo.findOne({
    where: { userId: user.id, serviceKey },
  });
  if (!membership) {
    // SERVICE_NOT_MEMBER 에러
  }
}
```

**현재 동작:**
1. `email + password` 로 user 조회 — `users.password` 단일 컬럼 검증
2. **선택적** `serviceKey` 가 들어오면 service_memberships 존재만 확인
3. password 자체는 **serviceKey 와 무관**하게 같은 컬럼에서 검증

### B.2 password 검증의 users.password 의존도

**100% 의존** — login / register / change / reset / admin tool 모든 경로가 `users.password` 단일 컬럼만 read/write.

### B.3 서비스별 credential 전환 시 변경 범위

| 경로 | 현재 | 전환 후 (예시) |
|------|------|---------------|
| login | `bcrypt.compare(input, user.password)` | `bcrypt.compare(input, credential.password_hash)` (serviceKey 필수) |
| register (신규) | `hashPassword → newUser.password` | `hashPassword → service_credentials(user_id, serviceKey)` |
| register (기존 user, 새 서비스) | 기존 password 검증 후 membership 추가 | **새 password 입력** 후 credential 추가 |
| change | users.password 갱신 | serviceKey 기준 credential 갱신 |
| reset | users.password 갱신 + token.serviceKey 격리 (현재) | service_credentials.password_hash 갱신 (serviceKey 필수) |
| OAuth | users.password = randomHash | service_credentials = 미생성 또는 placeholder |
| Admin CLI | users.password 직접 reset | serviceKey 명시 필요 (UX 변화) |

→ login 요청에서 `serviceKey` 가 **선택적 → 필수** 로 바뀐다 (의미 변화). JWT 발급 후 multi-service 이동(Service Switcher / Handoff) 모델과의 충돌은 §G / §H 에서 다룬다.

---

## C. Credential Entity 신설 가능성 조사

### C.1 제안 스키마

```sql
CREATE TABLE service_credentials (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_key     VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_credentials_user_service UNIQUE (user_id, service_key)
);
CREATE INDEX idx_service_credentials_user ON service_credentials(user_id);
```

### C.2 service_memberships 와의 관계

| 항목 | service_memberships | service_credentials (제안) |
|------|---------------------|---------------------------|
| 핵심 | 가입 상태/역할/승인 | 인증 자격증명 |
| Unique key | (user_id, service_key) | (user_id, service_key) |
| Lifecycle | pending → active → suspended/withdrawn | 활성 동안 1개 |
| 삭제 정책 | status='withdrawn' (soft) | credential 자체 삭제 OR password 무력화 |
| 의존 | users.id | users.id |

→ **충돌 없음**. 두 테이블은 같은 unique tuple 을 공유하되 책임이 분리됨 (membership = 권한 / credential = 인증).

### C.3 대안: service_memberships 에 password_hash 컬럼 추가

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. 별도 service_credentials 테이블** | 책임 분리, membership 정책 변경 시 credential 무관 | 테이블 증가, 가입 시 2개 row 생성 |
| **B. service_memberships.password_hash 컬럼** | 가입/탈퇴 lifecycle 과 자동 일치 | membership row 가 의미 과부하 (state + role + credential) |

→ **B 가 단순하지만 F10/F11 Freeze 와 충돌 가능성 큼** (User/Operator Freeze 는 3테이블 구조 고정). 신규 테이블 (A) 이 Freeze 우회에 더 안전.

### C.4 기존 구조 충돌 여부

| 항목 | 충돌 가능성 |
|------|-----------|
| users.email UNIQUE 제약 | 없음 (그대로 유지) |
| service_memberships UNIQUE(user_id, service_key) | 없음 |
| role_assignments | 없음 (password 와 무관) |
| RBAC Freeze (F9) | 없음 (role 책임 분리 유지) |
| User/Operator Freeze (F11) | **users.password 컬럼을 어떻게 처리하느냐**에 따라 충돌 — 컬럼을 deprecate 만 하고 남기면 무관, 제거하면 Freeze 위반 |

---

## D. 회원가입 흐름 조사

### D.1 현재 흐름

**위치:** [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) (L27-260)

**신규 사용자 (L172-277):**
```
1. hashPassword(data.password)
2. users insert (password 포함)
3. service_memberships insert (status='pending')
4. role_assignments 는 승인 시 생성
```

**기존 사용자 새 서비스 가입 (L77-170):**
```
1. comparePassword(data.password, existingUser.password)  ← 기존 password 검증
   ↓ 불일치: 401 PASSWORD_MISMATCH (+ 기존 가입 서비스 목록 반환)
2. service_memberships insert (status='pending')
3. businessInfo 병합
4. KPA/GlycoPharm 자동 row 생성 (해당 시)
```

→ **현재는 password 가 본인 확인 수단으로 재사용된다.** 신규 password 입력 옵션 자체가 코드 경로에 없음.

### D.2 서비스별 credential 전환 시

| 시나리오 | 전환 후 UX |
|----------|-----------|
| 신규 사용자가 KPA 가입 | password A 입력 → service_credentials(user_id, 'kpa-society') 생성 |
| 같은 user 가 GlycoPharm 추가 가입 | **본인 확인 방법 재설계 필요**: ① 기존 서비스 중 하나로 로그인된 상태에서만 가입 허용, ② OR 이메일 인증 토큰으로 본인 확인, ③ password B 신규 입력 |
| 새 서비스에서 password 변경 | service_credentials(user_id, 'glycopharm').password_hash 만 갱신 |

→ "기존 password 로 본인 확인" 패턴이 사라지므로 **회원가입 UX 흐름 자체를 재설계** 해야 함. 이는 §H 의 결정 사안.

### D.3 영향 범위

- controller 1개 (auth-register.controller.ts)
- UX 변경: 6개 서비스 front-end 의 가입 화면 (LoginModal / RegisterPage)
- 본인 확인 메커니즘: 이메일 인증 토큰 발급/검증 신규 (별도 WO 필요)

---

## E. 비밀번호 재설정 구조 조사

### E.1 현재 PasswordResetToken 엔티티

**위치:** [apps/api-server/src/entities/PasswordResetToken.ts](../../apps/api-server/src/entities/PasswordResetToken.ts)

```typescript
{
  id, token (sha256, unique),
  userId, email,
  expiresAt (1시간), usedAt,
  serviceKey: string | null   // ← WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1 (2026-05-22)
}
```

**관련 migration:**
- `20261026000000-AddServiceKeyToPasswordResetTokens.ts`
- `20261026000001-RenameServiceKeyColumnInPasswordResetTokens.ts`

### E.2 현재 reset 흐름 (이미 serviceKey 격리됨)

[apps/api-server/src/services/passwordResetService.ts](../../apps/api-server/src/services/passwordResetService.ts) (L25-143)

```
requestPasswordReset(email, serviceKey?):
  serviceKey 제공 시:
    - service_memberships 존재 검증
    - 미가입이면 true 만 반환 (email enumeration 방지)
    - token.serviceKey 저장

resetPassword(token, newPassword, serviceKey?):
  - token 의 serviceKey 와 요청 serviceKey 일치 검증
  - 불일치: '유효하지 않은 토큰' 에러
  - 일치: users.password 갱신   ← 여전히 users.password 단일 컬럼
```

→ **현재 reset 은 "어느 서비스에서 요청했는지" 만 격리되어 있고, 갱신 대상은 여전히 공통 users.password 다.** 즉 "KPA 에서 reset 요청 → 결과적으로 GlycoPharm 비번도 바뀜" 이 현재 동작.

### E.3 서비스별 credential 전환 시

| 단계 | 전환 후 |
|------|--------|
| request | 그대로 (이미 serviceKey 격리) |
| reset | `service_credentials.password_hash` 갱신 (serviceKey 필수) |
| token entity | 변경 없음 (이미 serviceKey 컬럼 있음) |

→ **reset 경로는 가장 적은 변경으로 전환 가능**. 이미 절반 이상 정렬되어 있음.

### E.4 영향 범위

- passwordResetService.ts 의 `resetPassword()` 내부 1줄 (`resetToken.user.password = ...`) 만 service_credentials 로 변경
- token entity 변경 없음
- migration 추가 1개 (service_credentials 테이블)

---

## F. Migration 전략 조사

### F.1 기존 사용자 처리

**전제:** O4O 운영 DB 데이터는 현재 disposable. backfill 보다 재시드 우선 (memory rule).

→ 그러나 **계정/비밀번호는 disposable 정책 예외**일 가능성이 높음 (이미 실제 사용자/약사회 회원 데이터 존재). 본 IR 은 두 가지 시나리오를 다룬다.

### F.2 시나리오 A — Disposable (재시드)

```
1. service_credentials 테이블 생성 (빈 상태)
2. 신규 가입자만 service_credentials 사용
3. 기존 users.password 는 deprecated, 첫 로그인 시 강제 재설정
4. 모든 기존 user 비밀번호 무력화 → reset 메일 일괄 발송
```

- 장점: 코드 단순, migration 위험 최소
- 단점: 사용자 1회 password reset 강제 (UX 비용)

### F.3 시나리오 B — Backfill

```
1. service_credentials 테이블 생성
2. 모든 active service_memberships 에 대해 service_credentials(user_id, serviceKey, users.password) 복사
3. 기존 users.password 는 유지 (legacy fallback)
4. 다음 password 변경 시점부터 service-specific 으로 자연 분기
```

- 장점: UX 단절 없음
- 단점: 초기 password 가 모든 서비스에서 동일 → 철학적 의도("서비스별 독립")가 즉시 구현되지 않음. 사용자가 명시적으로 변경해야 의미 발생.

### F.4 다운타임

- 두 시나리오 모두 **무중단 가능** (신규 컬럼/테이블 추가 + 코드 분기 처리).
- read path 는 fallback (service_credentials 없으면 users.password 사용) 만 추가하면 됨.

### F.5 Migration 난이도

| 항목 | 난이도 |
|------|--------|
| Schema 변경 (CREATE TABLE) | **S** — 단순 |
| 데이터 backfill (시나리오 B) | **M** — active membership 수만큼 row 생성 |
| 코드 분기 (login/register/change/reset) | **M-L** — 23개 함수 검토 |
| 6개 서비스 front-end UX (회원가입 본인 확인 방법) | **L** — 별도 WO |
| 운영 CLI script 업데이트 | **S** |
| 문서 정합 (Identity Arch V1 §2.1, §9 재작성) | **M** — baseline 변경 필요 |

→ 종합 난이도: **M-L** (코드보다 정책/UX 결정이 더 어려움)

---

## G. JWT / RefreshToken 영향

### G.1 현재 JWT payload

[apps/api-server/src/utils/token.utils.ts](../../apps/api-server/src/utils/token.utils.ts) (Access Token, 15분)

```typescript
{
  userId, sub, email, role, roles, permissions, scopes,
  memberships: [
    { serviceKey: 'neture', status: 'active' },
    { serviceKey: 'glycopharm', status: 'active' }, ...
  ],
  tokenType: 'user' | 'service' | 'guest',
  iss, aud
}
```

- password 자체는 **JWT 에 포함된 적 없음** → password 분리는 JWT payload 에 직접 영향 없음
- `memberships[]` 는 모든 가입 서비스 배열 — Service Switcher / Handoff 의 핵심

### G.2 RefreshToken

[apps/api-server/src/entities/RefreshToken.ts](../../apps/api-server/src/entities/RefreshToken.ts)

- password 컬럼 없음, tokenFamily UUID 로 회전 추적
- password 분리 시 영향 **없음**

### G.3 변경 필요 여부

| 항목 | 변경 필요 |
|------|----------|
| JWT payload 스키마 | 없음 |
| Refresh Token entity | 없음 |
| `requireAuth` middleware | 없음 |
| `roleAssignmentService` | 없음 |
| **Service Handoff** (§H 와 충돌) | **재검토 필수** |

### G.4 Service Handoff 와의 충돌 (중요)

Identity Architecture V1 §8 의 Handoff 흐름:

```
[서비스 A 로그인] → 사용자가 "서비스 B 로 이동" 클릭
  → POST /auth/handoff { targetServiceKey: 'B' }
  → API: Redis 에 single-use 토큰 저장 (60초)
  → 서비스 B 에서 /auth/handoff/exchange → 인증 완료
```

→ **현재 Handoff 는 한 번 로그인하면 다른 서비스로 password 입력 없이 이동 가능**. 이는 "공통 password 모델" 위에서만 의미가 있는 흐름이다.

**서비스별 독립 password 모델로 가면:**
- Handoff 자체가 철학과 충돌 (KPA 비번으로 GlycoPharm 에 진입하는 셈)
- 또는 Handoff 시 "도착 서비스 비번 재입력" 필수 → SSO UX 가치 거의 소멸
- Service Switcher 의 "원클릭 서비스 이동" 기능 의미 약화

→ **서비스별 password 도입은 Handoff 의 존재 의의를 직접 손상시킨다.** 별도 정책 결정 필요.

---

## H. 현재 구조 vs O4O 철학 충돌 체크 ★

> **본 IR 의 가장 중요한 결과 섹션.**

### H.1 현재 baseline 의 명시적 정책

**1. [docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) §2.1 "단일 계정 원칙"** (2026-03-13 작성, 2026-03-25 갱신):

```
- 1 Email = 1 Account (플랫폼 전체)
- 사용자는 하나의 계정으로 모든 서비스 이용
- 비밀번호는 플랫폼 전체에서 동기화됨   ← ★ 직접 명시
```

**2. 같은 문서 §9 "[REMOVED] Password Sync"** (WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1, 2026-03-25):

```
제거 사유: users.email 이 UNIQUE 제약이므로 서비스 간 비밀번호 불일치는
        구조적으로 불가능. 모든 잘못된 비밀번호가 PASSWORD_MISMATCH →
        비밀번호 강제 변경 UI 를 트리거하여 기존 비밀번호를 덮어쓰는
        무한 루프를 발생시킴.
```

→ **이 시점의 결정 논리는 "비밀번호 통일은 자연스러운 결과" 임을 전제로 한다.** 즉 password 가 서비스별로 다를 수 있다는 가능성 자체가 baseline 에서 명시적으로 부정되었다.

**3. [docs/architecture/USER-OPERATOR-FREEZE-V1.md](../architecture/USER-OPERATOR-FREEZE-V1.md)** (F11, 2026-03-19):
- users · service_memberships · role_assignments 3테이블 구조 **고정**
- 신규 테이블 추가는 Freeze 위반 → 명시적 WO 필요

**4. [docs/architecture/O4O-CORE-FREEZE-V1.md](../architecture/O4O-CORE-FREEZE-V1.md)** (F10, 2026-03-11):
- Auth / Membership / Approval / RBAC 4개 Core 모듈 Freeze
- 구조 변경 시 명시적 WO 필수

### H.2 사용자가 제시한 O4O 철학

| 원칙 | 현재 baseline 일치 여부 |
|------|-----------------------|
| 같은 이메일을 여러 서비스에서 사용 가능 (KPA `abc@test.com` + GlycoPharm `abc@test.com`) | 일치 (실제 동작) |
| 서비스는 독립 사업자 성격 (회원/권한/프로필/삭제 독립) | 부분 일치 (service_memberships + role_assignments 구조) |
| **서비스별 비밀번호 가능 (KPA: A, GlycoPharm: B, K-Cosmetics: C)** | **직접 충돌** — Identity Arch §2.1 의 "비밀번호 동기화" 와 정면 충돌 |
| users 공통 Identity 유지 | 일치 |
| service_memberships 가 서비스 가입/승인/상태 담당 | 일치 |

### H.3 충돌의 근원

- 현재 baseline 은 **"1 Email = 1 비밀번호 = N Membership = N Role"** 모델이다.
- 사용자가 제시한 철학은 **"1 Email = N 비밀번호 = N Membership = N Role"** 모델이다.
- 차이는 password 의 **소유 단위 (Owner)** 에 있다:
  - 현재: password 의 owner = User (Identity)
  - 제안: password 의 owner = ServiceMembership (Service-scoped Identity)

이 차이는 단순 기능 추가가 아니라 **identity 모델의 변경**이며, F10 (Core Freeze) 의 명시적 WO 승인 사항이다.

### H.4 정합성 회복 시 영향

| 영역 | 영향 |
|------|------|
| Identity Architecture V1 §2.1 / §9 | 재작성 필요 (baseline 변경) |
| Service Handoff (§G.4) | 의미 손상 — 정책 재검토 필요 |
| Service Switcher 의 "원클릭 이동" | UX 가치 하락 |
| 6개 서비스 front-end 의 LoginModal / RegisterPage | 본인 확인 메커니즘 재설계 |
| 운영 CLI (admin password reset) | serviceKey 명시 필수화 |
| 사용자 멘탈 모델 | "한 번 로그인하면 다 된다" → "서비스마다 비번 다르다" 로 전환 — 학습 비용 발생 |

### H.5 충돌 판정 결론

> **본 비밀번호 이슈는 단순 구현 이슈가 아닌, O4O Identity 모델 자체의 재정의 사안이다.**
>
> 현재 baseline (`O4O-IDENTITY-ARCHITECTURE-V1` §2.1) 과 사용자가 제시한 O4O 철학 사이에는 **명시적·구조적 충돌**이 존재하며, 본 충돌은 다음 둘 중 하나의 선택을 강제한다:
>
> 1. baseline 의 "비밀번호 동기화" 원칙 유지 → 서비스별 독립 password 포기
> 2. 사용자 철학 채택 → Identity Architecture V1 재작성 + F10 Freeze 명시적 WO 발의

---

## 최종 산출물

### 1. 변경 필요 여부

| 항목 | 판정 |
|------|------|
| 기술적으로 가능한가 | **Y** (별도 service_credentials 테이블로 깔끔 구현 가능) |
| 코드 베이스 적합한가 | **Y** (이미 password reset 의 serviceKey 격리는 진행 중) |
| 현재 baseline 과 일치하는가 | **N** (§H 충돌) |
| 즉시 추진 가능한가 | **N** (Identity 정책 재합의 + Handoff/Switcher UX 재검토 선행 필요) |

### 2. 예상 변경 규모

- **코드:** Medium-Large
- **DB:** 신규 테이블 1개 + migration 2-3개 (back fill 포함)
- **Front-end:** Large (6 서비스 LoginModal/RegisterPage)
- **문서/Baseline:** Large (Identity Arch V1 §2.1·§9 재작성, F10 영향)

### 3. 영향 파일 수

- 직접 password 참조: **20개**
- 핵심 변경 함수: **약 23개**
- 6개 service front-end LoginModal/RegisterPage: **약 12-15개**
- 문서 (baseline + IR 갱신): **약 5-6개**
- 합계: **약 60-65개 파일**

### 4. Migration 난이도

- 시나리오 A (재시드 + 강제 reset): **M**
- 시나리오 B (backfill + 점진 분기): **M-L**

### 5. 권장 방향

| 선택지 | 설명 | 권장 여부 |
|-------|------|----------|
| **A. 현재 유지 (공통 password)** | Identity Arch V1 §2.1 그대로 유지, password reset 의 serviceKey 격리만 운영 | 안전 — 단 사용자 제시 철학과는 불일치 |
| **B. 즉시 Credential 분리** | service_credentials 신규, 6개 서비스 UX 전면 개편 | **권장하지 않음** — Handoff/Switcher 모델 손상 위험, Freeze 위반 |
| **C. 단계적 분리 — 정책 합의 선행** | (1) 사용자/이해관계자와 Identity 모델 재합의 → (2) Handoff/Switcher 의 의미 재정의 → (3) WO 발의 → (4) 시나리오 B 방식으로 점진 backfill | **권장** |

> **즉시 코드 변경은 권고하지 않는다.** §H 의 정책 충돌이 먼저 해소되어야 한다. 본 IR 의 결과는 "현재 구조가 깨졌다" 가 아니라 "철학 vs baseline 의 충돌이 존재한다" 이다.

---

## 부록 — 참고 문서

| 문서 | 관련성 |
|------|--------|
| [docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) | §2.1 비밀번호 동기화, §9 Password Sync 제거 |
| [docs/baseline/USER-DOMAIN-SSOT-V1.md](../baseline/USER-DOMAIN-SSOT-V1.md) | service_memberships SSOT |
| [docs/architecture/USER-OPERATOR-FREEZE-V1.md](../architecture/USER-OPERATOR-FREEZE-V1.md) | F11 — 3테이블 구조 고정 |
| [docs/architecture/O4O-CORE-FREEZE-V1.md](../architecture/O4O-CORE-FREEZE-V1.md) | F10 — Auth/Membership/Approval/RBAC Freeze |
| [docs/rbac/RBAC-FREEZE-DECLARATION-V1.md](../rbac/RBAC-FREEZE-DECLARATION-V1.md) | F9 — role_assignments SSOT |
| WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1 | 2026-03-25 password sync 제거 |
| WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1 | 2026-05-22 reset token serviceKey 격리 |

---

*Created: 2026-05-23*
*Type: Investigation Report (read-only)*
*Status: Awaiting Decision — §H 의 정책 충돌 해소 선행 필요*
