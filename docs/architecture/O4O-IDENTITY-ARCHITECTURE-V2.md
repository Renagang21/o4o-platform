# O4O Platform Identity Architecture V2

> **Canonical Identity Baseline.** 본 문서는 V1 의 "공통 password 모델" 을 **O4O 의 "서비스별 독립 사업자 + 서비스별 독립 회원" 철학**과 정합하는 모델로 재정의하며, **O4O Identity 의 공식 기준 문서 (Canonical)** 다.

- **상태:** **CANONICAL** (Adopted) — 향후 모든 신규 Identity 관련 구조 판단은 본 문서를 기준으로 한다
- **채택일 (Adopted):** 2026-05-23
- **채택 WO:** `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1`
- **채택 결정 문서:** [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)
- **승계 대상:** [O4O-IDENTITY-ARCHITECTURE-V1.md](O4O-IDENTITY-ARCHITECTURE-V1.md) (Legacy Baseline — 운영 코드 현행 동작 기록용)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../archive/investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md)
- **선행 정렬 WO:** `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1` (2026-05-23)
- **작성일:** 2026-05-23 · **채택일:** 2026-05-23

### 채택 근거 (Adoption Grounds)

1. **철학 정합성**: O4O 의 5개 핵심 철학 원칙(§1) 중 원칙 4 (Credential 의 서비스 범위 독립) 가 V1 모델과 명시적 충돌 — V2 채택으로 5개 원칙 모두 정합 회복 (§10 매트릭스)
2. **선행 조사 결과**: [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../archive/investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) §H 에서 V1 baseline 과 철학의 구조적 충돌 확인
3. **이해관계자 합의**: 2026-05-23 사용자 명시 결정 — "Identity V2 공식 채택"
4. **구현 비충돌**: 본 채택은 코드/migration/DB 변경을 수반하지 않는다 — V1 운영 코드는 그대로 동작하며, V2 는 향후 구현 WO 의 **계약 기준 (contract)** 이다

### 구현 상태 안내 (Implementation Status)

본 V2 는 **공식 채택된 Canonical Baseline** 이며 동시에 **구현은 미진행** 상태다. 두 사실은 양립한다:
- **문서 기준으로는** — 모든 신규 Identity 관련 IR / WO / 설계 판단은 V2 를 기준으로 한다
- **운영 코드 기준으로는** — V1 모델 (공통 password) 이 그대로 동작 중이다 (V1 문서가 현행 동작을 기술)
- **구현 진입은** — 별도 후속 WO (`WO-O4O-IDENTITY-V2-PHASE1-*` 등) 의 책임 — F10/F11 명시적 예외 승인 절차를 거쳐 진행

---

## 0. V2 의 범위와 비범위

### 0.1 V2 가 다루는 것

- **Credential 의 소유 단위 (Owner)** 재정의 — `User-global` → `Service-scoped`
- §2.1 (단일 계정 원칙) / §9 (Password Sync 제거 사유) 재해석
- 4-Layer Identity Model 명시 (Identity / Credential / Membership / Role)
- Service Handoff · Service Switcher 의 의미 재검토 항목 명시
- Freeze (F10, F11) 영향 범위 문서화
- 향후 구현 WO 의 계약 기준 (acceptance criteria) 제공

### 0.2 V2 가 다루지 않는 것

- 코드 변경 / migration / DB 스키마 수정
- Auth 로직 변경 / front-end UX 변경
- 구현 WO 생성 (본 V2 합의 후 별도 WO 로 분리)
- V1 의 §3-§8, §10-§15 (서버/JWT/쿠키/Handoff 메커니즘/Switcher/Account Center/CORS/도메인 3축 등) — **구조적으로 유지**

> 본 V2 는 **방향 문서**이지 **구현 사양**이 아니다. 코드 변경은 향후 별도 WO 의 승인 절차를 거친다.

---

## 1. O4O 철학 (Restated)

V2 는 다음 5개 철학 원칙을 baseline 으로 채택한다:

| # | 원칙 | 의미 |
|---|------|------|
| 1 | **1 Email = 1 Identity** | 같은 이메일은 플랫폼 전체에서 같은 사람이다 (Identity 통합) |
| 2 | **서비스는 독립 사업자** | KPA / GlycoPharm / K-Cosmetics / Neture / GlucoseView 는 각각 독립 사업체 — 회원·권한·프로필·삭제가 독립 |
| 3 | **회원은 서비스 범위에서 독립** | 같은 사람이 여러 서비스에 가입할 수 있으나, 각 서비스의 회원은 서로 독립적 (탈퇴/정지/승인 별도) |
| 4 | **Credential 은 서비스 범위에서 독립** | KPA password ≠ GlycoPharm password 가 **정상** — 같아도 무방하나 강제되지 않는다 |
| 5 | **Role · 권한은 서비스 범위에서 독립** | role_assignments 의 `{serviceKey}:{role}` 패턴은 이미 정합 — V2 에서 그대로 유지 |

→ **차이의 핵심은 원칙 4 (Credential 독립)** 다. 1·2·3·5 는 이미 V1 코드와 구조적으로 정합한다.

---

## 2. V1 ↔ V2 모델 차이

### 2.1 V1 모델 (공통 password)

```
1 Email
   ↓
1 Account (users)
   ↓
1 Password (users.password)   ← Owner = User (Identity)
   ↓
N Memberships (service_memberships)
   ↓
N Roles (role_assignments)
```

### 2.2 V2 모델 (서비스 범위 credential)

```
1 Email
   ↓
1 Identity (users)
   ↓
   ├─ N Credentials (service_credentials)        ← Owner = Service Scope
   ├─ N Memberships (service_memberships)
   └─ N Roles (role_assignments)
```

### 2.3 차이의 본질

| 항목 | V1 | V2 |
|------|----|----|
| Password 의 소유 단위 | User (전역) | Service Scope (서비스별) |
| `users.password` 컬럼 | 핵심 자격증명 | **deprecated** (전환 후 — V2 §6 참조) |
| 신규 테이블 | — | `service_credentials` (Layer 2) |
| 같은 이메일 다중 가입 | 허용되나 password 공유 | 허용되고 password 각자 |
| Login 요청의 serviceKey | 선택적 | **필수** (credential 식별 키) |
| Password Reset | users.password 갱신 | service_credentials.password_hash 갱신 (serviceKey 필수) |

---

## 3. 4-Layer Identity Model (V2 핵심)

V2 는 Identity 를 4개의 명시적 Layer 로 정의한다. 각 Layer 는 별도 책임을 가지며, 같은 unique tuple `(user_id, service_key)` 를 공유하되 책임이 겹치지 않는다.

| Layer | 테이블 | 책임 | Unique Key | Lifecycle |
|-------|--------|------|------------|-----------|
| **L1 Identity** | `users` | 사람의 정체성 (이메일·이름·전화) | `email` (전역) | 영구 |
| **L2 Credential** | `service_credentials` (신규) | 서비스 범위 자격증명 (password_hash) | `(user_id, service_key)` | 가입~탈퇴 |
| **L3 Membership** | `service_memberships` | 가입 상태 · 승인 · 역할 (서비스 내) | `(user_id, service_key)` | pending → active → suspended/withdrawn |
| **L4 Role** | `role_assignments` | 권한 (서비스 + scope) | `(user_id, role, is_active)` | role 부여~해제 |

### 3.1 Layer 간 의존 관계

```
L1 Identity (users)
   ├─ L2 Credential (service_credentials)    [user_id FK]
   ├─ L3 Membership (service_memberships)    [user_id FK]
   └─ L4 Role (role_assignments)             [user_id FK]
```

→ **L1 만 L2/L3/L4 의 부모**. L2/L3/L4 간에는 직접 FK 가 없다 (논리적으로 같은 `(user_id, service_key)` 를 공유할 뿐). 이는 책임 분리를 명확히 한다.

### 3.2 Layer 별 책임 정의

- **L1 Identity** — "이 사람은 누구인가?"
- **L2 Credential** — "이 서비스에 들어올 때 어떻게 인증하는가?"
- **L3 Membership** — "이 사람이 이 서비스의 회원인가? 어떤 상태인가?"
- **L4 Role** — "이 사람이 이 서비스에서 무엇을 할 수 있는가?"

### 3.3 4-Layer 모델의 운영 시사점

| 시나리오 | 영향받는 Layer |
|----------|---------------|
| 사용자가 KPA 비밀번호만 변경 | L2 (해당 서비스 credential 만) |
| 사용자가 GlycoPharm 에서 탈퇴 | L3 (membership.status='withdrawn') · L4 (해당 role 무효화) · L2 (credential 삭제 OR 비활성화) |
| 운영자가 사용자 정지 | L3 (membership.status='suspended') — L1/L2 무관 |
| 사용자가 이메일 변경 | L1 만 — L2/L3/L4 자동 따라감 |
| 사용자가 GlycoPharm 에 새로 가입 | L3 새 row · L2 새 credential — L1 그대로 |
| 사용자 계정 완전 삭제 | L1·L2·L3·L4 모두 (CASCADE) |

---

## 4. §2.1 단일 계정 원칙 — V2 재작성

### 4.1 V1 (구 버전)

> - 1 Email = 1 Account (플랫폼 전체)
> - 사용자는 하나의 계정으로 모든 서비스 이용
> - 비밀번호는 플랫폼 전체에서 동기화됨

### 4.2 V2 (지향 버전)

> - **1 Email = 1 Identity** (플랫폼 전체) — `users.email` UNIQUE 유지
> - 사용자는 하나의 Identity 로 모든 서비스에 가입 가능 (다중 가입 정상)
> - **비밀번호는 서비스 범위에서 독립** (`service_credentials.(user_id, service_key)`) — 같은 이메일이라도 서비스별로 다른 password 가능. 같아도 무방하나 강제되지 않음.

---

## 5. §9 Password Sync — V2 재해석

V1 §9 의 "제거 사유" 는 V1 시점의 모델 (공통 password) 안에서는 옳았으나, V2 모델 (service-scoped credential) 에서는 **논리적 기반이 뒤집힌다**. 자세한 비교는 V1 §9.2 참조.

**V2 의 입장:**
- Password Sync 엔드포인트는 **부활하지 않는다** (V1 의 제거 결정 유지)
- 그 이유는 V1 의 "구조적으로 불가능" 이 아니라, **"sync 필요 자체가 발생하지 않는 모델 (서비스 독립 credential)" 로 전환**되기 때문
- V2 에서 같은 password 를 여러 서비스에 쓰고 싶다면 사용자가 각 서비스에서 개별 설정 (또는 가입 시 동일 입력) — UI 안내는 가능하되 백엔드 sync 는 없다

---

## 6. 전환 단계 (Migration Path — 정책 합의용 골격만)

> 본 §6 은 구현 사양이 아니라 **합의해야 할 정책 결정 지점** 의 목록이다. 각 항목은 별도 후속 WO 의 입력이 된다.

| Phase | 작업 | 코드 변경 | 비고 |
|-------|------|----------|------|
| **Phase 0 (완료 — 2026-05-23)** | 문서 정렬, IR + V2 채택 합의 | **없음** | `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1` (정렬) + `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1` (채택) |
| Phase 1 | `service_credentials` 테이블 신설 (빈 상태) | migration only | F10/F11 Freeze 영향 검토 후 별도 WO |
| Phase 2 | login/register/change/reset 의 dual-read 도입 (credential 우선, fallback to users.password) | controller 변경 | 별도 WO |
| Phase 3 | 신규 가입자는 service_credentials 만 사용 | register 분기 | 별도 WO |
| Phase 4 | 기존 active membership 의 credential backfill (또는 강제 reset) | 데이터 작업 | IR-V1 §F.2/§F.3 참조 |
| Phase 5 | users.password deprecation 선언 + 코드 제거 | controller 정리 | F11 Freeze 의 명시적 변경 — 별도 WO 필요 |

→ **Phase 0 (본 WO) 의 종료 조건은 V2 모델에 대한 이해관계자 합의**이다. Phase 1 이후는 별도 WO 들의 책임.

---

## 7. Service Handoff 의미 재정의

### 7.1 V1 의 Handoff

V1 §8 의 Handoff 흐름:
```
[서비스 A 로그인] → "서비스 B 로 이동" → 60초 single-use 토큰 → 서비스 B 인증 완료
```

→ "한 번 로그인하면 다른 서비스로 password 입력 없이 이동" — **공통 password 모델 위에서 자연스럽다**.

### 7.2 V2 모델에서의 의미

V2 의 "서비스별 독립 credential" 모델에서 같은 Handoff 흐름은 다음 두 해석이 모두 가능하다:

**해석 A (SSO 유지):**
- Handoff 는 **Identity 검증의 reuse** 이지 credential 검증의 reuse 가 아니다
- "이미 한 번 자기 정체를 증명했으니 다른 서비스에 들어가는 데 추가 자격증명은 불요" — 일반적인 SSO 사용자 멘탈 모델
- 단, **대상 서비스의 active membership 이 확인되어야 한다** — `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` (2026-05-24) 이후 generateHandoff / exchangeHandoff 양쪽에서 검증됨. 그 이전에는 검증되지 않았으며 [`IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1`](../archive/investigations/IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md) 에서 갭이 확인되어 후속 WO 로 보강됨 ([CHECK 결과](../archive/checks/CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1.md)).
- **결론:** Handoff 유지 (축소 보존), V2 와 충돌하지 않음

**해석 B (서비스 격리 강화):**
- "서비스가 독립 사업자라면 각 서비스 입장 시 credential 검증이 일관된 정책" — 더 엄격한 격리
- Handoff 시에도 대상 서비스의 credential 재입력 요구
- **결론:** Handoff 의 UX 가치 거의 소멸 → ServiceSwitcher 단순 redirect 로 회귀

### 7.3 V2 의 잠정 입장

> **해석 A 를 잠정 채택** — Handoff 는 Identity reuse 의 메커니즘이며, credential 독립과 양립한다.
> 단, **이해관계자 합의에 따라 해석 B 채택 가능** — 향후 정책 재합의 시점에 결정.
> 본 V2 채택 단계 (Phase 0) 에서는 Handoff 코드/구현 변경 없음 — 향후 Phase 6+ 정책 WO 의 책임.

**재합의 필요 항목 (Phase 6+ 후속 검토):**
- Handoff 토큰 발급 시 credential 검증 여부
- Handoff 결과 토큰에 어떤 service scope 의 권한이 부여되는가
- "도착 서비스 credential 미설정" 시 동작 (자동 생성 vs reset 요구)

### 7.4 현재 Handoff 정책 상태 (2026-05-24 기준)

본 §7 의 잠정 입장 (해석 A) 의 전제 조건이 실제 코드와 정합하도록 정렬된 후의 현재 상태:

| 항목 | 정책 |
|---|---|
| 보존 여부 | **유지 (축소 보존)** — Handoff API + 5 service HandoffPage 모두 보존. 삭제 대상 아님. |
| Handoff 의 성격 | **Identity transport** — credential 재검증 아님. 이미 인증된 identity 를 다른 active service 로 전달. |
| 허용 조건 | target service 의 `service_memberships.status === 'active'` 필수. |
| 차단 대상 | `pending` / `rejected` / `suspended` / `withdrawn` / 미가입 (membership row 부재). |
| 검증 시점 | `generateHandoff` (token 발급 시) + `exchangeHandoff` (token 소비 시) **양쪽 모두**. 60s TTL 사이 status 변경에 대한 이중 안전판. |
| Service Join 과의 관계 | **연결하지 않음** — Handoff 는 가입 흐름이 아닌 이미 가입된 서비스 간 이동 전용. Join (pending 정책) 과는 별개 surface. |
| Credential 재확인 정책 | **Phase 6+ 보류** — 해석 A vs B 의 최종 결정은 향후 정책 WO 의 책임. |

**관련 이력:**
- [`IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1`](../archive/investigations/IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md) — 기존 구현이 active membership 을 검증하지 않음을 확인, Option B (축소 보존) 권고.
- `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` (commit `339dbb3da`) — generateHandoff / exchangeHandoff 양쪽에 active membership 검증 추가.
- [`CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1`](../archive/checks/CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1.md) — 프로덕션 E2E 검증, 필수 5/5 PASS.

### 7.5 Handoff 의 O4O 철학 정합 (현재 기준)

| 원칙 | 정합 여부 | 근거 |
|---|:---:|---|
| 독립 사업자 | ✅ 정합 | active membership 보유 서비스에만 토큰 발급 — 운영자 승인 우회 차단 |
| 서비스별 membership 독립성 | ✅ 정합 | pending / withdrawn 우회 차단 |
| 서비스별 credential 독립성 | ✅ 정합 (해석 A) | Handoff 는 credential 재사용이 아닌 identity transport — credential 은 서비스별 독립 유지 |
| Service Join 흐름과의 분리 | ✅ 정합 | Handoff 는 가입 surface 아님 (가입은 각 서비스 사이트에서) |

→ **최종 판정: Handoff 는 축소 보존 상태로 V2 정합.**

---

## 8. Service Switcher 재검토

### 8.1 V1 의 Switcher

- 헤더 드롭다운으로 "내 서비스" / "가입 가능 서비스" 노출
- 원클릭 이동 (Handoff 사용)
- `POST /auth/services/:key/join` 으로 신규 서비스 가입 (password 추가 입력 없음 — 기존 password 재사용)

### 8.2 V2 의 변경 필요성

| 기능 | V2 에서 |
|------|--------|
| "내 서비스" 목록 노출 | 변경 없음 |
| 원클릭 이동 | **§7.3 의 해석 A 채택 시** 변경 없음 |
| 가입 가능 서비스 join | **가입 시 신규 password 입력 UI 필요** (현재 password 재사용 패턴 불가) |

### 8.3 V2 의 잠정 입장

- Switcher 의 표면 UX 는 V2 와 호환 가능
- 단, **"가입" 동작은 본인 확인 + 신규 credential 입력 흐름 으로 재설계** 필요
- 본인 확인 메커니즘 후보: ① 현재 로그인된 세션이 본인임의 증거, ② 이메일 인증 토큰
- 별도 UX WO 의 책임 — 본 V2 채택 단계 (Phase 0) 에서는 UI 변경 없음

---

## 9. Freeze 영향 정리

V2 모델 도입은 다음 Frozen Baseline 에 영향을 미친다.

### 9.1 F10 (O4O Core Freeze) — 영향: HIGH

**Frozen 대상:** Auth · Membership · Approval · RBAC 4개 Core 모듈

| V2 변경 항목 | F10 영향 |
|-------------|---------|
| `service_credentials` 신규 테이블 (Auth Core) | **명시적 WO 필수** — Core 구조 확장 |
| `users.password` deprecation | **명시적 WO 필수** — Core 컬럼 정책 변경 |
| login/register 분기 로직 | **명시적 WO 필수** — Auth Core 동작 변경 |
| Membership · Approval · RBAC | **영향 없음** — V2 의 변경은 Credential 계층에 국한 |

→ V2 의 구현 진입 (Phase 1+) 은 F10 의 명시적 WO 승인 절차를 통과해야 한다.

### 9.2 F11 (User/Operator Freeze) — 영향: MEDIUM-HIGH

**Frozen 대상:** `users` · `service_memberships` · `role_assignments` 3-테이블 구조

| V2 변경 항목 | F11 영향 |
|-------------|---------|
| `service_credentials` 신규 테이블 | **3-테이블 구조 확장** — Freeze 의 표면적 위반 |
| `users.password` 컬럼 처리 | deprecation 만이면 컬럼 자체 유지 (Freeze 호환), 제거 시 위반 |

**해석:** F11 의 핵심 의도는 "user/membership/role 3축 고정" 이지 "테이블 추가 금지" 가 아니다. Credential 은 4축의 별도 책임이므로 신규 테이블 추가는 F11 의 의도를 침해하지 않는다고 해석할 수 있다. 단, 이 해석은 **F11 의 명시적 예외 승인 절차**를 거쳐 확정되어야 하며, 본 V2 채택 (2026-05-23) 은 그 절차의 시작점이다.

### 9.3 F9 (RBAC SSOT) — 영향: NONE

- role_assignments 의 구조 변화 없음
- V2 는 L4 (Role) 계층을 그대로 유지

---

## 10. 현재 구조 vs O4O 철학 충돌 체크 ★

> **본 절은 IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1 §H 의 결론을 V2 모델 기준으로 재정렬한 것이다.**

### 10.1 5개 철학 원칙 vs 모델 정합성 매트릭스

| # | O4O 철학 원칙 | V1 모델 | V2 모델 |
|---|--------------|---------|---------|
| 1 | 1 Email = 1 Identity | ✅ 일치 (users.email UNIQUE) | ✅ 일치 (유지) |
| 2 | 서비스는 독립 사업자 | ⚪ 부분 (membership/role 만 독립, credential 공유) | ✅ 일치 (모든 계층 독립) |
| 3 | 회원은 서비스 범위에서 독립 | ✅ 일치 (service_memberships 구조) | ✅ 일치 (유지) |
| 4 | **Credential 은 서비스 범위에서 독립** | ❌ **충돌** (users.password 공통) | ✅ 일치 (service_credentials) |
| 5 | Role · 권한은 서비스 범위에서 독립 | ✅ 일치 (role_assignments `{serviceKey}:{role}`) | ✅ 일치 (유지) |

### 10.2 충돌 제거 결과

- **V1 모델 → V2 모델 전환의 본질**: 원칙 4 (Credential 독립) 의 정합성 회복
- 다른 원칙 1·2·3·5 는 V1 ↔ V2 차이 없음
- V2 도입의 가치는 "단일 원칙 (Credential Owner) 의 모델 정렬" — 변경 범위는 명확히 한정됨

### 10.3 정합성 회복 후 잔여 결정 항목

| 결정 항목 | 해소 시점 | 책임 |
|-----------|----------|------|
| V2 모델 공식 채택 여부 | 본 WO 합의 시 | 이해관계자 (사용자) |
| Service Handoff 의 의미 (해석 A vs B) | Phase 6+ | 별도 정책 WO |
| Switcher "가입" 의 본인 확인 메커니즘 | Phase 3 진입 시 | 별도 UX WO |
| Migration 시나리오 A vs B (재시드 vs backfill) | Phase 4 진입 시 | 별도 데이터 WO |
| F10/F11 Freeze 의 공식 해석 합의 | Phase 1 진입 전 | Freeze 거버넌스 |

---

## 11. 향후 구현 WO 의 계약 기준 (Acceptance Criteria for Phase 1+)

본 V2 가 채택되었으므로 (2026-05-23 Adopted), 후속 구현 WO 들은 다음 계약 기준을 만족해야 한다:

### 11.1 V2-Phase1 (Schema 신설) 계약

- [ ] `service_credentials` 테이블 신설 — V2 §3 의 스키마 준수
- [ ] migration 은 빈 테이블로 생성 (데이터 backfill 없음)
- [ ] 기존 코드 변경 없음 (read/write 추가 금지)
- [ ] F10/F11 Freeze 의 명시적 WO 승인 확보

### 11.2 V2-Phase2 (Dual-Read) 계약

- [ ] login/register/change/reset 모두 credential 우선, fallback to users.password
- [ ] serviceKey 가 login 요청에서 누락 시 V1 동작 (backward compat)
- [ ] 단일 serviceKey + credential 존재 시 V2 동작
- [ ] PASSWORD_MISMATCH / SERVICE_NOT_MEMBER 등 error code 의미 명시

### 11.3 V2-Phase3+ (UX / Migration / Deprecation) 계약

- 각 Phase 별 별도 WO — 본 V2 (Phase 0 채택 완료) 의 범위 외
- 단, 모든 Phase 는 본 V2 의 5개 철학 원칙과 4-Layer 모델을 위반하지 않아야 함

---

## 12. 본 V2 채택까지의 종료 조건 (Phase 0 추적)

본 V2 의 **Phase 0** 은 두 단계의 WO 로 완료되었다:

**Stage 1 — Document Alignment (`WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1`, 2026-05-23):**
- [x] V1 §2.1 에 V2 전환 표기 추가 (V2 §4 참조)
- [x] V1 §9 에 V2 재해석 추가 (V2 §5 참조)
- [x] V1 상단에 V2 링크 + 충돌 명시 배너 추가
- [x] V2 문서 본 파일 생성 (DRAFT 단계)
- [x] §10 현재 구조 vs O4O 철학 충돌 체크 명시
- [x] Freeze (F9/F10/F11) 영향 문서화
- [x] 향후 구현 WO 의 계약 기준 (§11) 명시

**Stage 2 — Adoption (`WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1`, 2026-05-23):**
- [x] V2 상태 DRAFT → CANONICAL 승격 (채택일 / 근거 / 결정문서 링크)
- [x] V1 → Legacy Baseline 표기 (운영 코드 현행 동작 기록 용도)
- [x] 결정 문서 `DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1` 신설
- [x] F10 / F11 에 Identity V2 명시적 예외 승인 절차 표기 추가
- [x] **이해관계자 합의 (사용자) — V2 모델 채택 확정 (2026-05-23)**

> Phase 0 (문서 채택) 완료. **Phase 1 이후 (코드/migration/DB) 는 본 V2 의 범위 외**이며, 별도 후속 WO 의 책임이다.

---

## 부록 — 관련 문서

| 문서 | 관련성 |
|------|--------|
| [O4O-IDENTITY-ARCHITECTURE-V1.md](O4O-IDENTITY-ARCHITECTURE-V1.md) | Legacy Baseline (운영 코드 현행 동작 기록 용도) |
| [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md) | 본 V2 의 공식 채택 결정 문서 (2026-05-23) |
| [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../archive/investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) | 본 V2 의 선행 조사 (충돌 발견) |
| [USER-DOMAIN-SSOT-V1.md](../baseline/USER-DOMAIN-SSOT-V1.md) | service_memberships SSOT |
| [USER-OPERATOR-FREEZE-V1.md](USER-OPERATOR-FREEZE-V1.md) | F11 — 3-테이블 구조 (§9.2 참조) — Identity V2 명시적 예외 승인 절차 표기 추가 |
| [O4O-CORE-FREEZE-V1.md](O4O-CORE-FREEZE-V1.md) | F10 — Auth/Membership/Approval/RBAC (§9.1 참조) — Identity V2 명시적 예외 승인 절차 표기 추가 |
| [RBAC-FREEZE-DECLARATION-V1.md](../rbac/RBAC-FREEZE-DECLARATION-V1.md) | F9 — role_assignments SSOT (§9.3 참조) |

---

*Created: 2026-05-23 (Document Alignment WO)*
*Adopted: 2026-05-23 (Adoption Documentation WO) — Canonical Identity Baseline*
*Type: Architecture Canonical Baseline*
*Status: CANONICAL (Adopted) — Phase 0 완료, Phase 1+ 별도 WO 책임*
*Scope: Document Authority — 운영 코드는 V1 동작 유지, V2 는 향후 구현 WO 의 계약 기준*
