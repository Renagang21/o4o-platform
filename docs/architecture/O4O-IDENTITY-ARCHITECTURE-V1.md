# O4O Platform Identity Architecture V1

> **WO-O4O-AUTH-PASSWORD-SYNC-V1 완료 후 작성**
> 플랫폼 전체 인증·인가·서비스 이동 아키텍처 문서

---

> ## ⚠ Legacy Baseline — V2 가 Canonical 로 채택됨 (2026-05-23)
>
> **현재 상태:** **본 V1 문서는 Legacy Baseline 으로 격하되었다.** [O4O-IDENTITY-ARCHITECTURE-V2.md](O4O-IDENTITY-ARCHITECTURE-V2.md) 가 O4O Identity 의 공식 Canonical 기준이다.
>
> **V1 유지 사유 (Why V1 still exists):**
> 1. **운영 코드 현행 동작 기록** — V1 은 현재 코드 베이스의 실제 동작 (공통 password 모델, users.password 단일 컬럼) 을 정확히 기술한다. 코드가 V2 모델로 이행되기 전까지 V1 은 **운영 사실의 기록** 으로 유지된다.
> 2. **역사적 판단 기록** — §9 의 Password Sync 제거 결정 (2026-03-25) 등 V1 시점의 의사결정 맥락은 향후 회고/감사에 필요하다.
> 3. **V1↔V2 의 차이 명확화** — §2.1 / §9 의 V2 재해석은 두 모델의 차이를 진단할 때 직접 참조된다.
>
> **신규 구조 판단 기준 (V2 채택 이후):**
> - **모든 신규 Identity 관련 IR / WO / 설계 판단은 V2 를 기준으로 한다.**
> - V1 은 신규 설계의 근거 문서로 사용하지 않는다 — 신규 작업이 V1 §2.1 / §9 의 원문을 인용하면 V2 의 재해석본을 함께 참조해야 한다.
> - V1 의 §3-§8, §10-§15 (서버/JWT/쿠키/Handoff 메커니즘/Switcher/Account Center/CORS/도메인 3축 등) 은 V2 에서도 구조적으로 유지된다.
>
> **충돌 지점 (V1 ↔ O4O 철학 — V2 에서 해결):** §2.1 (단일 계정 원칙 — "비밀번호는 플랫폼 전체에서 동기화됨"), §9 ([REMOVED] Password Sync 의 제거 사유)
>
> **관련 문서:**
> - **다음 모델 (Canonical):** [O4O-IDENTITY-ARCHITECTURE-V2.md](O4O-IDENTITY-ARCHITECTURE-V2.md)
> - **채택 결정 문서:** [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)
> - 충돌 조사: [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](../investigations/IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) §H
> - 정렬 WO: `WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1`
> - 채택 WO: `WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1`

---

## 1. 도메인 구조

O4O 플랫폼은 5개 서비스 + Account Center로 구성되며, 단일 API 서버(`o4o-core-api`)가 모든 인증을 처리한다.

| 서비스 | 도메인 | serviceKey | 인증 전략 |
|--------|--------|------------|-----------|
| Neture | `neture.co.kr` | `neture` | Cookie |
| GlycoPharm | `glycopharm.co.kr` | `glycopharm` | localStorage + Bearer |
| GlucoseView | `glucoseview.co.kr` | `glucoseview` | Cookie |
| KPA Society | `kpa-society.co.kr` | `kpa-society` | localStorage + Bearer |
| K-Cosmetics | `k-cosmetics.site` | `k-cosmetics` | Cookie |
| Account Center | `account.neture.co.kr` | — | Cookie |

**Single Source of Truth:** `apps/api-server/src/config/service-catalog.ts`

---

## 2. Identity Core

### 2.1 단일 계정 원칙

> ⚠ **V2 전환 예정 — 본 절은 현재 코드 동작을 기술하나 O4O 철학과는 불일치한다.** ([V2 DRAFT §2](O4O-IDENTITY-ARCHITECTURE-V2.md) 참조)

**현재 V1 모델 (구현된 동작):**
- **1 Email = 1 Account** (플랫폼 전체) — `users.email` UNIQUE 제약
- 사용자는 하나의 계정으로 모든 서비스 이용
- ~~비밀번호는 플랫폼 전체에서 동기화됨~~ ← **V2 에서 폐기 예정**

**V2 지향 모델 (Document Alignment 후):**
- **1 Email = 1 Identity** (플랫폼 전체) — `users.email` UNIQUE 유지
- 사용자는 하나의 Identity 로 모든 서비스에 가입 가능
- **비밀번호는 서비스 범위 (Service-scoped Credential)** — KPA password ≠ GlycoPharm password 가 정상

**전환 사유:** O4O 플랫폼은 "서비스별 독립 사업자 + 서비스별 독립 회원" 철학을 채택한다. 같은 이메일을 쓰더라도 KPA 회원과 GlycoPharm 회원은 독립적이며, 비밀번호 역시 서비스 범위에서 관리되어야 일관된다. 자세한 모델 정의는 V2 DRAFT §3 의 4-Layer 모델 참조.

### 2.2 테이블 구조

```
users               → Identity ONLY (이메일, 비밀번호, 이름, 전화번호)
role_assignments    → RBAC 단일 소스 (역할 부여)
service_memberships → 서비스별 가입 상태
organization_members → 조직 소속 (Business Role)
kpa_pharmacist_profiles → 약사 자격 정보
```

### 2.3 RBAC 흐름 (Phase 3-E 이후)

```
Login → roleAssignmentService.getRoleNames(userId) → generateTokens(user, roles, domain)
requireAuth → user.roles = payload.roles (JWT payload 직접 할당, DB 쿼리 없음)
requireAdmin → roleAssignmentService.hasAnyRole(userId, ['admin','super_admin','operator'])
/auth/status → roleAssignmentService.getRoleNames(userId) (fresh RA query)
```

---

## 3. Auth Server (o4o-core-api)

### 3.1 인증 엔드포인트

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/api/v1/auth/login` | 로그인 | Public |
| POST | `/api/v1/auth/register` | 회원가입 | Public |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 | Public |
| GET | `/api/v1/auth/me` | 현재 사용자 | Required |
| POST | `/api/v1/auth/logout` | 로그아웃 | Required |
| GET | `/api/v1/auth/status` | 인증 상태 확인 | Optional |

### 3.2 비밀번호 관리 엔드포인트

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/api/v1/auth/forgot-password` | 비밀번호 재설정 요청 | Public |
| POST | `/api/v1/auth/reset-password` | 비밀번호 재설정 (토큰) | Public |
| POST | `/api/v1/auth/find-id` | 전화번호로 계정 찾기 | Public |

### 3.3 서비스 Handoff 엔드포인트

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/api/v1/auth/handoff` | Handoff 토큰 생성 | Required |
| POST | `/api/v1/auth/handoff/exchange` | Handoff 토큰 교환 | Public |
| GET | `/api/v1/auth/services` | 서비스 목록 + 가입 상태 | Required |
| POST | `/api/v1/auth/services/:key/join` | 서비스 가입/재활성화 | Required |

---

## 4. JWT 토큰 구조

### 4.1 Access Token (15분)

```typescript
{
  userId: string;
  sub: string;           // = userId
  email: string;
  role: string;          // Primary role (roles[0])
  roles: string[];       // role_assignments 테이블에서 조회
  permissions: string[];
  scopes: string[];      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT
  memberships: { serviceKey: string; status: string }[];
  tokenType: 'user' | 'service' | 'guest';
  iss: string;           // JWT_ISSUER (default: 'o4o-platform')
  aud: string;           // JWT_AUDIENCE (default: 'o4o-api')
}
```

### 4.2 Refresh Token (7일)

```typescript
{
  userId: string;
  sub: string;
  tokenVersion: 1;
  tokenFamily: string;   // UUID - 토큰 회전 추적
  iss: string;
  aud: string;
}
```

### 4.3 Guest Token (2시간)

- `tokenType: 'guest'` — QR/Kiosk용
- Refresh token 미발급

### 4.4 Server Isolation (Phase 2.5)

- `iss`/`aud` 클레임으로 서버 간 토큰 재사용 차단
- 다른 서버 인스턴스의 토큰은 검증 시 거부 (warning 로그)

---

## 5. Service Membership

### 5.1 가입 상태

| Status | 설명 |
|--------|------|
| `active` | 활성 멤버십 |
| `pending` | 대기 중 (가입 승인 필요) |
| `inactive` | 비활성화 |

### 5.2 가입 흐름

1. 서비스 A에서 회원가입 → `service_memberships(user, serviceA, active)` 생성
2. 서비스 B에서 같은 이메일로 가입 시도 → 계정 존재 감지
3. 로그인 성공 시 → `service_memberships(user, serviceB, active)` 자동 추가
4. 또는 Service Switcher에서 "가입" 클릭 → `POST /auth/services/:key/join`

---

## 6. 인증 방식 (Dual Strategy)

### 6.1 Cookie 기반 (Primary)

**사용 서비스:** Neture, GlucoseView, K-Cosmetics, Account Center

```typescript
// 요청 시
fetch(url, { credentials: 'include' })

// 쿠키 설정
{
  httpOnly: true,
  secure: true,          // Production only
  sameSite: 'none',      // Cross-origin 지원
  domain: '.neture.co.kr' // Origin 기반 자동 감지
}
```

**쿠키 목록:**
- `accessToken` — 15분 TTL
- `refreshToken` — 7일 TTL
- `sessionId` — 7일 TTL (세션 추적)

### 6.2 localStorage + Bearer 기반

**사용 서비스:** GlycoPharm, KPA Society

```typescript
// 저장
localStorage.setItem('glycopharm_access_token', token);

// 요청 시
headers: { 'Authorization': `Bearer ${accessToken}` }
```

### 6.3 Cross-Origin 감지

서버는 요청의 Origin 헤더와 API 호스트의 base domain을 비교:
- **Same base domain** (예: `admin.neture.co.kr` + `api.neture.co.kr`) → Cookie 전용
- **Different base domain** (예: `glycopharm.co.kr` + `api.neture.co.kr`) → Cookie + Body 토큰 반환

---

## 7. Cookie Domain 매핑

```typescript
// cookie.utils.ts - SERVICE_DOMAINS
const SERVICE_DOMAINS = [
  '.neture.co.kr',
  '.glycopharm.co.kr',
  '.kpa-society.co.kr',
  '.glucoseview.co.kr',
  '.k-cosmetics.site',
];
```

Origin 헤더에서 도메인 추출 → SERVICE_DOMAINS 매칭 → 쿠키 domain 설정.
2-part TLD (`.co.kr`, `.com.au`) 처리 로직 포함.

---

## 8. Service Handoff (Cross-Service SSO)

### 8.1 흐름

```
[서비스 A] 사용자가 "서비스 B로 이동" 클릭
    ↓
[서비스 A → API] POST /auth/handoff { targetServiceKey: 'B' }
    ↓
[API] Redis에 single-use 토큰 저장 (60초 TTL)
    ↓
[API → 서비스 A] { handoffUrl: 'https://B.co.kr/handoff?token=xxx' }
    ↓
[서비스 A] window.location.href = handoffUrl
    ↓
[서비스 B /handoff 페이지] POST /auth/handoff/exchange { token: 'xxx' }
    ↓
[API] Redis에서 토큰 소비 (single-use) → 사용자 로드 → 인증 토큰 발급
    ↓
[서비스 B] 쿠키 설정 또는 localStorage 저장 → 대시보드 이동
```

### 8.2 보안

- **Single-use:** 토큰 교환 즉시 Redis에서 삭제
- **60초 TTL:** 만료 후 자동 삭제
- **Fresh roles:** 교환 시 `role_assignments`에서 최신 역할 조회
- **Cookie domain 자동 감지:** 대상 서비스 Origin 기반

---

## 9. [REMOVED] Password Sync (WO-O4O-AUTH-PASSWORD-SYNC-V1)

> **WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1 (2026-03-25) 에 의해 완전 제거.**
>
> **제거 범위:** `/api/v1/auth/password-sync` 엔드포인트, syncToken Redis 저장, `@o4o/auth-client` passwordSync(), `@o4o/auth-utils` PASSWORD_MISMATCH 에러 코드, 6개 서비스 AuthContext passwordSync 함수 + LoginModal sync UI.
>
> **비밀번호 변경:** forgot-password / reset-password 흐름으로만 가능.

### 9.1 제거 사유 (V1 기록 — V2 에서 재해석)

**V1 시점 (2026-03-25) 의 제거 사유 (원문 보존):**

> "`users.email` 이 UNIQUE 제약이므로 서비스 간 비밀번호 불일치는 **구조적으로 불가능**.
> 모든 잘못된 비밀번호가 PASSWORD_MISMATCH → 비밀번호 강제 변경 UI 를 트리거하여 기존 비밀번호를 덮어쓰는 무한 루프를 발생시킴."

### 9.2 V2 기준 재해석 (Document Alignment)

위 사유는 **"공통 password 모델" 을 자명한 전제로 한** 진술이다. V2 의 "Service-scoped Credential" 모델 관점에서 같은 사건을 재해석하면:

| 항목 | V1 해석 | V2 재해석 |
|------|---------|----------|
| `users.email` UNIQUE | "같은 비밀번호여야 자연스럽다" 의 근거 | 같은 **Identity** 라는 의미일 뿐, password 의 범위와는 무관 |
| 서비스 간 password 불일치 | "구조적으로 불가능" | **정상 상태** — 서비스 독립 회원 모델의 직접적 결과 |
| PASSWORD_MISMATCH 무한 루프 | 모델의 모순으로 발생한 버그 → sync 제거로 해결 | 같은 증상이 **credential 의 owner 가 user-global 이라는 잘못된 모델** 의 부산물이었음 — V2 의 service-scoped credential 로 가면 PASSWORD_MISMATCH 자체가 발생하지 않음 |
| Password Sync 의 본질 | "여러 서비스 간 password 동기화" — 모델 자체가 모순 | **모델 정합성 해결책으로 적절치 않았음** — 진짜 해결은 credential 의 범위 자체를 service-scoped 로 바꾸는 것 |

→ V1 의 **제거 결정 자체는 V2 에서도 유효**하다 ("Password Sync 엔드포인트는 잘못된 해결책이었다"). 다만 **제거 사유의 논리적 기반은 V2 에서 뒤집힌다**: "구조적으로 불가능" 이 아니라 "구조적으로 다양해야 자연스럽다" 가 V2 의 입장이다.

**즉 V2 에서도 password-sync 엔드포인트는 부활하지 않는다.** 대신 sync 가 필요하지 않은 모델 (서비스별 독립 credential) 로 전환된다.

---

## 10. Service Switcher

### 10.1 기능

모든 서비스 헤더에 삽입된 드롭다운 컴포넌트:

- **My Services:** active 멤버십 → 클릭 시 Handoff로 이동
- **Available Services:** 미가입 서비스 → 클릭 시 `POST /auth/services/:key/join`
- **서비스 관리:** Account Center로 이동
- **현재 서비스:** 체크 표시로 식별

### 10.2 배치

```
[Logo] [Navigation] ... [ServiceSwitcher] [UserMenu]
```

인증된 사용자에게만 표시.

### 10.3 구현

각 서비스에 `ServiceSwitcher.tsx` 복사 배치 (self-contained):
- API 호출: `GET /auth/services` (최초 오픈 시, 캐싱)
- Handoff: `POST /auth/handoff` → `window.location.href`
- Join: `POST /auth/services/:key/join` → 목록 갱신

---

## 11. Account Center

- **URL:** `https://account.neture.co.kr`
- **기능:** 계정 정보 관리, 서비스 멤버십 확인
- **인증:** Cookie 기반 (`.neture.co.kr` 도메인 공유)
- **ServiceSwitcher 포함:** 서비스 간 이동 지원

---

## 12. CORS 설정

### 12.1 허용 Origin

**Production:**
```
neture.co.kr (www, admin, dev-admin, shop, forum, signage, funding, auth, api, account)
glycopharm.co.kr (www)
glucoseview.co.kr (www)
kpa-society.co.kr (www)
k-cosmetics.site (www)
siteguide.co.kr (www)
```

**Development:**
```
localhost:3000-3003, localhost:5173-5177
```

### 12.2 CORS 옵션

```typescript
{
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400  // 24시간 preflight 캐시
}
```

---

## 13. 도메인 설정 3축

플랫폼 도메인 설정은 3곳에서 일관되어야 한다:

| # | 파일 | 역할 |
|---|------|------|
| 1 | `config/service-catalog.ts` | 서비스 식별·표시 (SSOT) |
| 2 | `main.ts` allowedOrigins | CORS 허용 Origin |
| 3 | `cookie.utils.ts` SERVICE_DOMAINS | 쿠키 도메인 매핑 |

**규칙:** 새 서비스 추가 시 3곳 모두 업데이트 필수.

---

## 14. 전체 인증 흐름

```
┌─────────────────────────────────────────────────────────┐
│                    최초 방문                              │
│  GET /auth/me → 401 → 로그인 모달/페이지 표시            │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    로그인                                 │
│  POST /auth/login { email, password }                   │
│    → 성공: Cookie 설정 + (Body 토큰) → 대시보드           │
│    → INVALID_CREDENTIALS: "비밀번호가 일치하지 않습니다"    │
│    → INVALID_USER: "이메일 또는 비밀번호가 올바르지..."     │
│    → ACCOUNT_LOCKED: "계정이 잠겨있습니다"                 │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    인증된 세션                             │
│  모든 API 요청: Cookie 자동 전송 또는 Bearer 토큰          │
│  15분마다: POST /auth/refresh → 새 Access Token          │
│  서비스 이동: ServiceSwitcher → Handoff → 대상 서비스      │
└─────────────────────────────────────────────────────────┘
```

---

## 15. 확장 규칙

1. **새 서비스 추가 시:**
   - `service-catalog.ts`에 서비스 등록
   - `main.ts` CORS Origin 추가
   - `cookie.utils.ts` SERVICE_DOMAINS 추가
   - HandoffPage 컴포넌트 구현
   - ServiceSwitcher 컴포넌트 복사
   - AuthContext 구현 (Cookie 또는 localStorage 전략 선택)

2. **역할 추가 시:**
   - `role_assignments` 테이블에 레코드 추가 (RBAC SSOT)
   - JWT에 자동 포함 (generateTokens에서 조회)

3. **인증 정책 변경 금지:**
   - Core Freeze (WO-O4O-CORE-FREEZE-V1) 적용
   - Auth, Membership, Approval, RBAC 모듈은 명시적 WO 승인 필수

---

*Created: 2026-03-13*
*Based on: WO-O4O-SERVICE-SWITCHER-GLOBAL-V1, IR-O4O-AUTH-CLIENT-STRATEGY-AUDIT-V1*
*Updated: 2026-03-25 — WO-O4O-AUTH-PASSWORD-SYNC-REMOVAL-V1 (Section 9 removed)*
*Updated: 2026-05-23 — WO-O4O-IDENTITY-ARCHITECTURE-V2-DOCUMENT-ALIGNMENT-V1 (§2.1, §9 V2 전환 표기 + V2 링크)*
*Updated: 2026-05-23 — WO-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-DOCUMENTATION-V1 (Legacy Baseline 격하, V2 Canonical 채택 반영)*
*Status: **Legacy Baseline** — 운영 코드 현행 동작 기록용. 신규 구조 판단은 [V2](O4O-IDENTITY-ARCHITECTURE-V2.md) 기준.*
