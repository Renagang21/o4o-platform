# IR-O4O-SERVICE-CREDENTIAL-PHASE1-IMPLEMENTATION-SCOPE-AUDIT-V1

> **조사 전용 IR — 코드 / migration / DB 변경 없음.**
> 본 IR 은 Identity V2 Canonical 기준으로 **Service Credential 구조의 Phase 1 구현 최소 범위**를 정의하는 조사 보고서다. 구현은 본 IR 의 범위 외이며 별도 후속 WO 의 책임이다.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (read-only)
- **대상 영역:** Identity V2 Phase 1 구현 범위 산정
- **기준 문서:**
  - [O4O-IDENTITY-ARCHITECTURE-V2.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) (Canonical)
  - [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md)
- **선행 WO:**
  - `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1`
  - `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1`
- **관련 Freeze:** F9 (RBAC SSOT), F10 (O4O Core), F11 (User/Operator)
- **운영 데이터 정책:** Pre-service disposable (계정 데이터는 disposable 정책 적용 가능 여부 §G 참조)

---

## 0. 핵심 결론 (TL;DR)

> **Phase 1 의 본질은 "가장 작은 변경으로 V2 의 검증 가능한 첫 발판" 만들기이다.** 1인 개발 기준 가장 작은 단위는:
>
> **(1) `service_credentials` Entity + Migration 신설 → (2) Register 의 dual-write 도입 → (3) Login 의 dual-read 도입** — 이 3 단계 + 운영 데이터 disposable 정책 채택 시 backfill 생략.
>
> **Phase 2 이관 항목:** users.password deprecation · change-password 의 serviceKey 분기 · Service Handoff 의미 재정의 · ServiceSwitcher "가입" UX 재설계.

### 핵심 발견 5선

1. **Service Handoff 와 Service Switcher 는 password 와 무관**하다. Phase 1 단계에서 둘 다 그대로 작동한다 (§H, §I).
2. **login DTO 의 `serviceKey` 는 이미 optional**, **reset DTO 의 `serviceKey` 도 이미 optional** — Phase 1 의 DTO 변경 영향 0 (§B.4 / §E).
3. **register DTO 의 service 필드명은 `service` (not `serviceKey`)** — Phase 1 분기 시 정확한 필드명 인지 필수 (§D.1).
4. **password reset 은 token 에 serviceKey 가 이미 저장된다** (`WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1`, 2026-05-22). Phase 1 변경 1줄 (write 대상만 credential 로) (§E).
5. **JWT / Handoff / RBAC 흐름은 password 와 분리되어 있다** — Phase 1 의 토큰/세션 레이어 영향 0 (§H, §J).

---

## A. Phase 1 최소 구현 범위 정의

### A.1 후보 항목 매트릭스

사용자가 제시한 6개 후보를 Phase 분류:

| # | 후보 항목 | 권장 Phase | 사유 |
|---|----------|-----------|------|
| 1 | `service_credentials` Entity | **Phase 1 (필수)** | V2 의 L2 Layer 의 토대 — 없으면 다른 모든 후보가 무의미 |
| 2 | login (credential read) | **Phase 1 (필수)** | "V2 가 작동한다" 의 최소 검증 경로 |
| 3 | register (credential write) | **Phase 1 (필수)** | credential 데이터를 만들지 못하면 read 도 무의미 |
| 4 | password reset | **Phase 1 (소형)** | 이미 token 에 serviceKey 가 있어 변경 1줄 — 같은 PR 에 묶기 안전 |
| 5 | change password | **Phase 2** | login/register 가 안정된 후 분기. UX/serviceKey 도입 필요 |
| 6 | legacy fallback | **Phase 1 (필수)** OR **생략 가능** | §F 참조 — disposable 정책 여부에 따라 결정 |

→ **Phase 1 필수 4개** + **Phase 1 소형 1개** + **Phase 2 이관 1개** + **선택적 1개**.

### A.2 Phase 1 의 4가지 시나리오

"가장 작은 변경" 원칙 아래 가능한 4가지:

| 시나리오 | 범위 | 위험 | 검증 가치 | 권장 여부 |
|---------|------|------|---------|----------|
| **Z (Schema-only, Dormant)** | Entity + migration 만. 어떤 read/write 도 없음 | 매우 낮음 | 매우 낮음 (V2 작동 검증 불가) | ❌ — Phase 1 의 "발판" 가치 없음 |
| **Y (Schema + Register dual-write)** | Z + 신규 register 시 credential 에도 write. login 은 그대로 | 낮음 | 낮음 (read path 미검증) | ⚪ 보수적이지만 검증 부족 |
| **X (Schema + Register write + Login dual-read)** ★ | Y + login 시 credential 우선 read, fallback to users.password | 낮음-중간 | **높음 (V2 end-to-end 검증)** | ✅ **권장** |
| **W (X + reseed all users)** | X + 기존 user 전부 wipe & 재시드 | 중간 (data loss) | 매우 높음 | △ disposable 정책 명시적 채택 시만 |

### A.3 권장 Phase 1 범위 (시나리오 X)

**Phase 1 의 정확한 범위:**

```
[필수]
1. service_credentials Entity 신설 (TypeORM entity + ESM rule 준수)
2. CREATE TABLE service_credentials migration
3. Register controller:
   - 신규 사용자: users.password + service_credentials 둘 다 write
   - 기존 사용자 (새 서비스 가입): credential 신규 생성 (기존 password 검증은 V1 그대로 유지)
4. Login service:
   - serviceKey 있을 때: service_credentials 우선 조회 → 없으면 users.password fallback
   - serviceKey 없을 때: 기존 V1 동작 (users.password)
5. Password reset:
   - resetPassword() 의 write 대상을 users.password → service_credentials 로 변경
     (token.serviceKey 가 있는 경우만 — 없으면 V1 fallback)

[Phase 1 에서 명시적으로 하지 않는 것]
- change password 의 serviceKey 분기 (Phase 2)
- users.password deprecation (Phase 5)
- Service Handoff 의미 재정의 (Phase 6+)
- ServiceSwitcher "가입" UX 재설계 (Phase 3+ UX WO)
- backfill (§G — disposable 정책 채택 시 생략, 비-disposable 시 별도 WO)
```

### A.4 Phase 1 의 종료 조건 (Acceptance)

- [ ] service_credentials 테이블 생성됨
- [ ] 신규 register 시 credential row 생성됨
- [ ] 같은 user 가 두 서비스에 가입했을 때 두 credential row 가 존재함
- [ ] login 시 service_credentials 가 있으면 그 쪽이 사용됨
- [ ] login 시 service_credentials 가 없으면 users.password fallback 작동
- [ ] password reset 시 token.serviceKey 가 있으면 service_credentials 갱신
- [ ] 기존 V1 흐름 (serviceKey 미제공 login / change-password / Handoff / Switcher) **회귀 없음**
- [ ] F10 + F11 명시적 예외 승인 절차 통과

---

## B. service_credentials Entity 조사

### B.1 제안 스키마 (V2 §3 와 일치)

```typescript
// apps/api-server/src/modules/auth/entities/ServiceCredential.ts
@Entity('service_credentials')
@Unique('uq_service_credentials_user_service', ['userId', 'serviceKey'])
@Index(['userId'])
export class ServiceCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'service_key' })
  serviceKey!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string; // bcrypt

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

```sql
-- migration: 20260524000000-CreateServiceCredentials.ts (예시)
CREATE TABLE service_credentials (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_key   VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_credentials_user_service UNIQUE (user_id, service_key)
);
CREATE INDEX idx_service_credentials_user ON service_credentials(user_id);
```

### B.2 ESM Rule 준수 (CLAUDE.md §2)

- relation 사용 시 반드시 string-based reference 형태 사용:
  ```typescript
  // ❌ FORBIDDEN
  @ManyToOne(() => User, (u) => u.credentials)
  // ✅ REQUIRED
  @ManyToOne('User', 'credentials')
  ```
- 본 entity 는 단순 FK 만 사용해도 동작 가능 (relation 객체 없이 userId 컬럼만 유지) — **권장: relation 정의 없이 userId 만 유지**해 ESM 충돌 위험 최소화.

### B.3 F11 (User/Operator Freeze) 정합성 확인

| 항목 | 확인 |
|------|------|
| `users` 책임 침해 | ❌ 없음 — identity 정보만 그대로 |
| `service_memberships` 책임 침해 | ❌ 없음 — 가입 상태/역할은 그대로 |
| `role_assignments` 책임 침해 | ❌ 없음 — 권한은 그대로 |
| 신규 책임 영역 (L2 Credential) | ✅ 명확히 분리 |

→ F11 §10 (Identity V2 채택과의 관계) 의 4-Layer 양립 해석과 일치.

### B.4 F10 (O4O Core Freeze) 정합성 확인

- Auth Core 의 entity 추가 → F10 §5-A.2 의 명시적 예외 승인 절차 5단계 적용 대상
- migration 자체는 destructive 하지 않음 (신규 CREATE TABLE)
- 기존 Auth Core 파일은 본 entity 추가 단계에서 수정되지 않음

---

## C. Login 영향 범위 조사

### C.1 현재 흐름 (V1)

[apps/api-server/src/services/auth/auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) (L157-L186):

```typescript
// 1. user 조회 (email + password)
const user = await userRepo.findOne({ where: { email }, select: [..., 'password'] });

// 2. (선택) serviceKey 있으면 membership 검증
if (serviceKey) {
  const membership = await smRepo.findOne({ where: { userId: user.id, serviceKey } });
  if (!membership) throw new Error('SERVICE_NOT_MEMBER');
}

// 3. password 검증
const ok = await bcrypt.compare(password, user.password);
if (!ok) { /* loginAttempts++ */ }
```

### C.2 Phase 1 흐름 (V2 dual-read)

```typescript
// 1. user 조회 (그대로)
const user = await userRepo.findOne({ where: { email }, select: [..., 'password'] });

// 2. membership 검증 (그대로)
if (serviceKey) { ... }

// 3. password 검증 — 분기
let ok = false;
if (serviceKey) {
  const credential = await credRepo.findOne({
    where: { userId: user.id, serviceKey },
  });
  if (credential) {
    ok = await bcrypt.compare(password, credential.passwordHash); // V2 path
  } else {
    ok = await bcrypt.compare(password, user.password); // fallback
  }
} else {
  ok = await bcrypt.compare(password, user.password); // V1 path
}
```

### C.3 영향 파일 / 함수

| 파일 | 함수 | 변경 |
|------|------|------|
| [auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) | `handleEmailLogin` (L157-186) | dual-read 분기 5-10 줄 |
| [auth-login.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-login.controller.ts) | `login` (L49) | DTO 변경 없음 (serviceKey optional 유지) |
| [auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) | `handleOAuthLogin` (L420) | 변경 없음 (OAuth 사용자는 Phase 1 에서 V1 fallback) |

### C.4 회귀 위험

- ⚠ `serviceKey` 미제공 login: V1 동작 그대로 → 회귀 없음
- ⚠ `serviceKey` 제공 + credential 미존재: fallback to users.password → 기존 동작과 동일 → 회귀 없음
- ⚠ `serviceKey` 제공 + credential 존재: V2 신경로 (Phase 1 신규 사용자만 해당) → 신경로

→ **Phase 1 의 login 변경은 backward-compatible**. 기존 코드 경로는 모두 살아있다.

---

## D. Register 영향 범위 조사

### D.1 현재 DTO

[apps/api-server/src/modules/auth/dto/register.dto.ts](../../apps/api-server/src/modules/auth/dto/register.dto.ts):

```typescript
{
  email: string,
  password: string,
  service?: string,         // ← serviceKey 가 아니라 'service' (canonical)
  membershipType?: string,
  ... (other fields)
}
```

> ⚠ **field name 주의:** `service` (not `serviceKey`). Phase 1 분기 시 DTO 변환 필요 X — 그대로 사용 가능.

### D.2 현재 흐름 (V1)

[apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts):

**신규 사용자 (L172-277):**
```
1. hashPassword(data.password)
2. users insert (password 포함)
3. service_memberships insert (status='pending')
```

**기존 사용자 새 서비스 가입 (L77-170):**
```
1. comparePassword(data.password, existingUser.password)   ← 기존 password 검증
2. service_memberships insert
3. businessInfo merge / KPA·GlycoPharm 자동 row 생성
```

### D.3 Phase 1 흐름 (dual-write)

**신규 사용자:**
```
1. hashPassword(data.password) → hashed
2. users insert (password = hashed)            ← V1 그대로
3. service_memberships insert (status='pending')
4. service_credentials insert (user_id, service, password_hash = hashed)   ← V2 신규
```

**기존 사용자 새 서비스 가입:**
```
1. comparePassword(data.password, existingUser.password)   ← V1 본인 확인 유지
2. service_memberships insert
3. service_credentials insert (user_id, NEW serviceKey, password_hash = NEW hashed)
   ↑ 핵심: 기존 password 로 본인 확인하되, 새 서비스의 credential 은 별도 생성.
     이때 새 서비스의 password 가 무엇인지의 UX 결정 필요:
     (a) 기존 password 와 동일하게 자동 복제 (Phase 1 기본)
     (b) 새 password 입력 강제 (Phase 3 UX WO)
```

→ **Phase 1 기본:** (a) 자동 복제. UX 변경 없이 즉시 V2 데이터 누적. 의미상 "공통 password" 와 같으나 **구조적으로 service-scoped 가 됨**. (b) 는 Phase 3 UX WO 에서.

### D.4 영향 파일 / 함수

| 파일 | 함수 | 변경 |
|------|------|------|
| [auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) | `register` (L172-277, 신규) | credential insert 3-5 줄 |
| [auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) | `register` (L77-170, 기존 추가) | credential insert 3-5 줄 |
| DTO | 변경 없음 | `service` 필드 그대로 사용 |

### D.5 회귀 위험

- ⚠ 신규 가입: users.password + credential 양쪽 write — 실패 시 transaction 으로 rollback 필요
- ⚠ 기존 추가 가입: 본인 확인은 V1 그대로 (기존 password) — UX 변화 없음

→ **트랜잭션 wrapping 필수** (이미 기존 코드도 트랜잭션 사용 — TypeORM `manager.transaction()`).

---

## E. Password Reset 영향 범위

### E.1 현재 흐름 (이미 절반 V2)

- `PasswordResetToken` entity 에 **`serviceKey` 컬럼 이미 존재** ([apps/api-server/src/entities/PasswordResetToken.ts](../../apps/api-server/src/entities/PasswordResetToken.ts))
- forgot-password DTO 에 `serviceKey` 이미 optional
- reset-password DTO 에 `serviceKey` 이미 optional
- request 시 service_memberships 검증 이미 적용
- reset 시 token.serviceKey 와 request.serviceKey 일치 검증 이미 적용

### E.2 Phase 1 변경 1줄

[apps/api-server/src/services/passwordResetService.ts](../../apps/api-server/src/services/passwordResetService.ts) (L130-L133):

**현재:**
```typescript
const hashedPassword = await hashPassword(newPassword);
resetToken.user.password = hashedPassword;  // ← V1
await userRepo.save(resetToken.user);
```

**Phase 1 (분기):**
```typescript
const hashedPassword = await hashPassword(newPassword);
if (resetToken.serviceKey) {
  // V2: credential 갱신
  await credRepo.upsert(
    { userId: resetToken.userId, serviceKey: resetToken.serviceKey, passwordHash: hashedPassword },
    ['userId', 'serviceKey'],
  );
} else {
  resetToken.user.password = hashedPassword;  // V1 fallback
  await userRepo.save(resetToken.user);
}
```

### E.3 영향

| 파일 | 함수 | 변경 |
|------|------|------|
| [passwordResetService.ts](../../apps/api-server/src/services/passwordResetService.ts) | `resetPassword` (L98-143) | 분기 5-8 줄 |
| Entity (PasswordResetToken) | — | 변경 없음 (serviceKey 이미 있음) |
| DTO | — | 변경 없음 |
| Controller | — | 변경 없음 |

→ **password reset 은 Phase 1 의 가장 작은 변경 지점**. 같은 PR 에 묶어도 안전.

---

## F. Legacy Fallback 전략

### F.1 Fallback 필요성 (Disposable 정책 미채택 시)

기존 사용자의 users.password 가 살아있는 동안 login 시 service_credentials 가 없으면 fallback 필요. Phase 1 의 dual-read 가 이 역할:

```
serviceKey 제공 + credential 존재  → credential 사용 (V2)
serviceKey 제공 + credential 미존재 → users.password (V1 fallback)
serviceKey 미제공                  → users.password (V1)
```

### F.2 Fallback 의 끝 시점

- Phase 1 동안: 모든 기존 사용자가 fallback 으로 작동
- Phase 2 (`change password` 분기) 동안: 사용자가 비번 변경 시 credential 로 자동 이전
- Phase 4 (backfill 또는 cut-over): 모든 사용자가 credential 로 통합
- Phase 5 (users.password deprecation): fallback 코드 제거

### F.3 Fallback 코드 위치

| 위치 | fallback 분기 |
|------|--------------|
| [auth-login.service.ts:171-183](../../apps/api-server/src/services/auth/auth-login.service.ts#L171-L183) | password 검증 시 |
| [passwordResetService.ts:130-133](../../apps/api-server/src/services/passwordResetService.ts#L130-L133) | reset 시 (token.serviceKey 없을 때) |

→ **Phase 5 deprecation 시 위 2개 지점 정리.**

### F.4 Disposable 정책 채택 시 (시나리오 W)

- fallback 자체를 생략하고 즉시 V2-only 동작
- 기존 사용자 wipe + 재시드 1회 수행
- 코드 단순화 + 검증 명확

→ §G 의 결정에 종속.

---

## G. Backfill 전략 조사

### G.1 메모리 정책 회상

> **Memory:** [pre-service disposable data](C:\Users\sohae\.claude\projects\c--Users-sohae-coding-o4o-platform\memory\project_pre_service_disposable_data.md) — O4O 운영 DB 데이터는 현재 disposable, backfill 코드보다 재시드 우선.

→ **계정/비밀번호가 이 정책의 예외인지 명시적 확인 필요.** (선행 IR 의 §F.1 에서 "예외일 가능성이 높음" 으로 추정).

### G.2 시나리오 비교

| 시나리오 | 작업 | 코드량 | 데이터 영향 | 권장 조건 |
|---------|------|-------|----------|----------|
| **G-A. Backfill (active membership 단위 복사)** | 모든 active service_memberships 에 대해 `INSERT service_credentials(user_id, serviceKey, users.password)` 1회 실행 | 작음 (SQL 1개) | 안전 (read-only on users) | 비-disposable 시 |
| **G-B. No backfill (자연 이전)** | 기존 사용자는 fallback 으로 운영, password 변경 시 자연 이전 | 0 | 없음 | 운영 시간 길어도 무방 시 |
| **G-C. Wipe + reseed** | 모든 users + service_memberships wipe → 재시드 | 중간 (시드 스크립트) | **destructive** | **disposable 정책 명시 채택 시** |

### G.3 권장

> **계정/비밀번호의 disposable 여부 사용자 확인 필요.**
>
> - 예 → **G-C (Wipe + reseed)** — Phase 1 ↔ Phase 5 단계 압축 가능, 가장 단순
> - 아니오 → **G-A (Backfill)** — Phase 4 별도 WO 로 분리
> - 운영 시간 충분 → **G-B (No backfill)** — Phase 1 만 하고 자연 이전 대기

→ **본 IR 단계에서는 G-A 또는 G-B 를 default 가정**. G-C 채택은 별도 결정 사항.

### G.4 Backfill 의 정확한 의미

기존 사용자에게 backfill 을 하면 **"공통 password" 가 모든 서비스에 복제** 된다. 즉 V2 의 데이터 모양은 갖되 의미는 V1 그대로다. 진정한 V2 의미 (서비스별 다른 password) 는 다음 password 변경 시점부터 자연 발생.

→ **G-A 또는 G-B 의 차이는 "코드 단순성"이지 "철학 정합성"이 아니다.** 둘 다 의미상 같다.

---

## H. Service Handoff 영향

### H.1 결론

> **Handoff 는 password 와 무관 — Phase 1 단계에서 그대로 작동, 변경 0.**

### H.2 근거

[apps/api-server/src/modules/auth/controllers/handoff.controller.ts](../../apps/api-server/src/modules/auth/controllers/handoff.controller.ts):

- `generateHandoff` (L32-82): user.id 기반 토큰 생성, **password 검증 없음**
- `exchangeHandoff` (L92-156): Redis 에서 토큰 소비 → `users.findOne(id)` → `roleAssignmentService` + service_memberships → `tokenUtils.generateTokens` — **password 무관**

### H.3 V2 §7.3 의 해석 A 잠정 유지

- **해석 A (SSO 유지):** Handoff 는 Identity 검증 reuse 이지 credential 검증 reuse 가 아니다 → V2 와 양립
- **해석 B (서비스 격리 강화):** Handoff 시 credential 재입력 요구 → SSO UX 가치 소멸

→ **Phase 1 은 해석 A 잠정 유지.** Phase 6+ 별도 정책 WO 의 책임.

### H.4 Phase 1 액션 아이템

- [ ] **없음.** Handoff 코드 / 컨트롤러 / 토큰 entity / Redis 키 모두 그대로.

---

## I. Service Switcher 영향

### I.1 결론

> **Switcher 의 "내 서비스 이동" 도 password 와 무관 — Phase 1 단계 변경 0.** "가입" 동작 UX 재설계는 Phase 3 UX WO 의 책임.

### I.2 근거

- `GET /auth/services` — service_memberships 조회만, password 무관
- `POST /auth/services/:key/join` — service_memberships insert만, password 무관 (현재는 기존 인증 세션 reuse)
- Frontend `ServiceSwitcher.tsx` — UI 이동만, password 입력 받지 않음

### I.3 Phase 1 단계 동작

- "내 서비스" 클릭 → Handoff → 대상 서비스 진입 (그대로)
- "가입 가능 서비스" 클릭 → `POST /auth/services/:key/join` → service_membership 추가 → credential 미존재
- 이 경우 credential 이 없으므로 다음 login 시 fallback 으로 작동 (Phase 1 의 dual-read 가 처리)

### I.4 Phase 3 UX 변경 항목 (Phase 1 외)

- "가입" 동작 시 신규 password 입력 UI
- 본인 확인 메커니즘 (이메일 인증 토큰 등)
- 별도 UX WO (`WO-O4O-IDENTITY-V2-SWITCHER-UX-V1`) 의 책임

### I.5 Phase 1 액션 아이템

- [ ] **없음.** Switcher 코드 / 컴포넌트 / `/auth/services/:key/join` 모두 그대로.
- 단, Switcher join 으로 가입한 사용자는 **다음 password reset 시 credential 이 생성** 되므로 운영상 영향 0.

---

## J. 현재 구조 vs O4O 철학 충돌 체크 (V2 Canonical 정합성)

### J.1 5개 원칙 매트릭스

| # | 원칙 | V1 (현재 코드) | Phase 1 (X 시나리오) | Phase 5 (V2 완성) |
|---|------|----|----|----|
| 1 | 1 Email = 1 Identity | ✅ | ✅ | ✅ |
| 2 | 서비스는 독립 사업자 | ⚪ 부분 | ⚪ 부분 (credential 데이터는 분리되나 의미는 동일) | ✅ |
| 3 | 회원은 서비스 범위에서 독립 | ✅ | ✅ | ✅ |
| 4 | **Credential 은 서비스 범위에서 독립** | ❌ | **⚪ 데이터 구조는 V2, 의미는 V1** (자동 복제) | ✅ |
| 5 | Role 은 서비스 범위에서 독립 | ✅ | ✅ | ✅ |

→ Phase 1 의 본질: **"의미는 V1, 구조는 V2 로 단계적 이전"**. 사용자가 비번을 변경하기 시작하면 비로소 원칙 4 의 의미가 살아남.

### J.2 V2 Canonical 정합성 (Phase 1 기준)

| Canonical 항목 | Phase 1 준수 여부 |
|---------------|----|
| V2 §3 4-Layer Model | ✅ L2 Credential Layer 신설로 정합 |
| V2 §11.1 Phase 1 계약 | ✅ Schema 신설 부분 만족, dual-read 부분은 Phase 2 의 일부로 처리하느냐 Phase 1 에 포함하느냐 결정 사항 (본 IR 권장: 통합 Phase 1) |
| V2 §11.2 Phase 2 계약 (dual-read) | ⚪ 본 IR 권장 Phase 1 에 통합 → 검증 가치 극대화 |
| F10 §5-A.2 명시적 예외 승인 절차 5단계 | ⚠ Phase 1 진입 전 절차 통과 필수 |
| F11 §10.4 명시적 예외 승인 절차 5단계 | ⚠ Phase 1 진입 전 절차 통과 필수 |

> ⚠ **V2 §11 의 Phase 명세 와 본 IR 의 Phase 1 권장 (시나리오 X) 사이에 미세한 차이**: V2 §11 은 Phase 1=Schema, Phase 2=Dual-Read 로 분리했으나, 본 IR 은 둘을 통합하기를 권장. 사유: 1인 개발 + 검증 가치. **사용자 결정 사항** — 통합할지, 분리할지.

### J.3 충돌 체크 결과

| 영역 | Phase 1 채택 후 정합성 |
|------|---|
| 독립 사업자 원칙 | ⚪ 부분 (의미 동일, 구조 V2) — Phase 5 까지 단계적 |
| 서비스 Credential 독립 | ⚪ 데이터는 V2, 사용자 비번 변경 후 의미 완성 |
| 회원 독립 | ✅ 정합 (V1 부터 정합) |
| Role 독립 | ✅ 정합 (V1 부터 정합) |
| V2 Canonical | ✅ 정합 (단, V2 §11 의 Phase 분리 vs 본 IR Phase 통합 사용자 결정) |

---

## 최종 산출물

### 1. Phase 1 구현 범위 (시나리오 X 권장)

```
[필수]
- service_credentials Entity + TypeORM migration
- Register dual-write (신규 + 기존 user 가입 양쪽)
- Login dual-read (serviceKey 있을 때 credential 우선, fallback)
- Password Reset 의 write 대상 분기 (token.serviceKey 있을 때 credential)

[Phase 1 에 포함하지 않음]
- change password 의 serviceKey 분기 (Phase 2)
- users.password deprecation (Phase 5)
- Service Handoff 의미 재정의 (Phase 6+)
- ServiceSwitcher "가입" UX 재설계 (Phase 3 UX)
- backfill (G-A) 또는 wipe-reseed (G-C) — disposable 정책 결정 따라 별도 WO
```

### 2. Phase 2 이관 범위

```
- change password 의 serviceKey 분기 + DTO 확장
- ServiceSwitcher "가입" UX 재설계 (신규 password 입력)
- 운영 안정화 + 모니터링 1-2 sprint
- users.password 사용처의 점진적 deprecation 준비
```

### 3. 영향 파일 수 (Phase 1 권장 시나리오 X)

| 영역 | 파일 수 |
|------|--------|
| 신규 (Entity + Migration) | 2 |
| 수정 (Register + Login + Reset) | 3 |
| 변경 없음 (Handoff + Switcher + DTO + Token + RBAC) | 0 |
| 합계 | **5개 파일 (신규 2 + 수정 3)** |

추가로 테스트 코드 / 시드 스크립트 1-2 개 (Phase 1 의 검증 자산).

### 4. 예상 난이도 (1인 개발 기준)

| 영역 | 난이도 | 시간 추정 |
|------|--------|---------|
| Entity + Migration | **S** | 0.5d |
| Register dual-write (트랜잭션 포함) | **M** | 1d |
| Login dual-read (분기 + 회귀 검증) | **M** | 1d |
| Password Reset 분기 (1줄) | **S** | 0.2d |
| 통합 테스트 (4개 시나리오) | **M** | 1d |
| F10/F11 예외 승인 + 문서 | **S** | 0.5d |
| 합계 | **M (중간)** | **약 4-5d** |

### 5. WO 분리 계획

| WO | 분리 사유 | 의존 |
|----|----------|------|
| **WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-V1** | Entity + Migration 만 — 가장 작은 리스크, 단독 머지 가능 | F10/F11 예외 승인 필요 |
| **WO-O4O-IDENTITY-V2-PHASE1-REGISTER-V1** | Register dual-write — Schema WO 후속 | Schema WO 완료 |
| **WO-O4O-IDENTITY-V2-PHASE1-LOGIN-V1** | Login dual-read — Register WO 와 평행 가능 | Schema WO 완료 |
| **WO-O4O-IDENTITY-V2-PHASE1-RESET-V1** | Reset 분기 (1줄) — Login WO 에 묶거나 단독 가능 | Schema WO 완료 |
| **WO-O4O-IDENTITY-V2-PHASE1-VERIFY-V1** | 통합 검증 (4 시나리오) — 위 3개 머지 후 | Register + Login + Reset |
| (선택) WO-O4O-IDENTITY-V2-PHASE1-DATA-V1 | backfill (G-A) 또는 wipe-reseed (G-C) — disposable 정책 결정 후 | Verify WO 완료 |

→ **권장 PR 순서: Schema → (Register || Login) 평행 → Reset → Verify → (Data 선택).** 5-6개 PR, 각 PR 작음.

### 5-A. 더 작은 단위 옵션 (압축 변형)

1인 개발 효율 우선 시 위 5개를 **2-3 PR 로 압축** 가능:

- **PR1 (Schema + Reset)**: Entity/migration + reset 분기 1줄 — 가장 안전
- **PR2 (Register + Login)**: dual-write/read 같이 — 검증 가치 단일 PR 에 집중
- **PR3 (Verify + 선택 Data)**: 통합 시나리오 검증 + 데이터 정책 결정

→ 사용자 작업 스타일에 따라 5-6 PR (분리) ↔ 2-3 PR (통합) 결정.

---

## 정리

| 결정 사항 | 권장 |
|----------|------|
| Phase 1 의 시나리오 | **X (Schema + Register write + Login dual-read + Reset 분기)** |
| Backfill 전략 | **G-A 또는 G-B 중 사용자 결정** (disposable 정책 명시 시 G-C) |
| Service Handoff | **그대로 유지** (Phase 6+ 정책 WO) |
| Service Switcher | **그대로 유지** (Phase 3 UX WO) |
| change password | **Phase 2 이관** |
| V2 §11 의 Phase 1 + 2 통합 여부 | **통합 권장** (검증 가치 + 1인 개발 효율) |
| WO 분리 입자도 | **5-6 PR (정석)** 또는 **2-3 PR (압축)** — 사용자 결정 |

> **본 IR 의 핵심 메시지**: V2 의 Phase 1 은 새로운 entity 1개 + 3개 controller 함수에 분기 추가 + reset 1줄 변경 = **약 4-5일 작업**으로 V2 의 end-to-end 검증 가능한 첫 발판을 완성할 수 있다. Handoff / Switcher / change-password / DTO 등 큰 충돌 지점은 Phase 1 에서 모두 회피 가능하다.

---

## 부록 — 본 IR 의 비범위 (Out-of-Scope)

본 IR 은 다음을 수행하지 **않는다**:

- 코드 / migration / DB 변경
- service_credentials 관련 구현 WO 의 생성 (별도 후속 WO 의 책임)
- F10 / F11 예외 승인 절차 자체의 수행
- Disposable 정책의 사용자 결정 — 본 IR 은 옵션을 제시할 뿐
- V2 §11 의 Phase 분리 vs 통합 결정 — 본 IR 은 통합을 권장하나 최종 결정은 사용자
- Phase 2-6+ 의 구체 설계 (본 IR 의 범위 외)

---

*Created: 2026-05-23*
*Type: Investigation Report (read-only)*
*Status: Awaiting Decision — Phase 1 시나리오 채택 + Disposable 정책 + WO 입자도 결정 선행 필요*
