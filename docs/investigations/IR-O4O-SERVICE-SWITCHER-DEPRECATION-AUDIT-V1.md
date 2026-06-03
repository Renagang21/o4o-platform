# IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1

> **조사 전용 IR — 코드 / DB / migration / UI 변경 없음.**
> Identity V2 Canonical 기준에서 기존 ServiceSwitcher / 서비스 전환 / 가입 유도 흐름이 현재 O4O 철학과 충돌하는지 조사하고, 삭제·축소·보류 범위를 확정한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (read-only)
- **기준 문서:**
  - [O4O-IDENTITY-ARCHITECTURE-V2.md](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) Canonical (§7 Handoff 잠정 해석 A)
  - [O4O-BUSINESS-PHILOSOPHY-V1.md](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) (서비스별 독립 사업자)
  - [USER-OPERATOR-FREEZE-V1.md](../architecture/USER-OPERATOR-FREEZE-V1.md) §10 (V2 4-Layer 양립)
- **선행 IR:** [IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1](IR-O4O-SERVICE-SPECIFIC-PASSWORD-CREDENTIAL-ARCHITECTURE-AUDIT-V1.md) §G.4

---

## 0. 핵심 결론 (TL;DR)

> **ServiceSwitcher UI 의 실질 사용처는 web-account (Account Center) 1곳에 집중**되어 있다. 4개 service web app (KPA / GlycoPharm / K-Cosmetics / Neture) 자체에는 inter-service switching UI 가 없다 — 헤더 드롭다운은 서비스 내부 navigation 일 뿐.
>
> 가장 큰 충돌은 **`POST /auth/services/:key/join` 엔드포인트가 운영자 승인 절차를 우회하여 즉시 `active` membership 을 생성한다는 점**이다. 이는 Register 의 `pending → 운영자 승인 → active` 흐름과 정면 충돌하며, "서비스는 독립 사업자" 철학의 핵심 (서비스별 가입 승인) 을 깬다.
>
> **Handoff (`/auth/handoff` + `/exchange` + 5개 HandoffPage)** 는 ServiceSwitcher UI 와 **분리해서 판단**한다 — 인증 transport 메커니즘이지 credential 검증 메커니즘이 아니므로 V2 §7.3 해석 A 와 양립. 본 IR 에서는 즉시 삭제 대상으로 단정하지 않음 (별도 후속 IR).

### 핵심 발견 5선

1. **ServiceSwitcher UI 는 web-account 1곳에만 집중** — 4개 service 의 헤더 드롭다운은 서비스 내부 메뉴 (강의 / 운영 / 마이페이지) 일 뿐 inter-service switching 아님.
2. **`POST /auth/services/:key/join` 이 운영자 승인 우회** — 즉시 `status='active'` 생성. Register (pending) 와 비대칭. V2 철학의 가장 큰 충돌점.
3. **`DashboardSwitcher` 컴포넌트 (KPA)** 는 코드는 있으나 단일 대시보드 환경에서 미렌더링 (dormant code).
4. **HandoffPage 는 5개 service 전부에 존재** (web-account + 4 main). exchange API 는 같은 인터페이스, 클라이언트별 storage 만 다름 (Cookie / localStorage).
5. **service_memberships 생성 경로 4가지** — Register (pending) / Switcher Join (instant active) / 운영자 승인 (pending→active) / migration. **Switcher Join 만 비대칭**.

---

## 1. 조사 기준 (O4O 철학 V2)

```
1 Email = 1 Identity
   ↓
service_credentials (서비스별 독립)
service_memberships (서비스별 가입/승인/상태 — 독립 사업자)
role_assignments    (서비스별 역할)

→ KPA 가입은 KPA 에서, GlycoPharm 가입은 GlycoPharm 에서,
  각각 독립적으로 진행 (운영자 승인 포함)
```

본 IR 의 충돌 판정은 이 철학을 기준으로 한다.

---

## 2. Frontend ServiceSwitcher / Service Switching UI 조사

### 2.1 4개 service web app — Inter-service switching UI **없음**

각 service 의 GlobalHeader 드롭다운은 **서비스 내부 navigation only**:

| 서비스 | 헤더 컴포넌트 | 드롭다운 메뉴 항목 | Inter-service UI |
|---|---|---|:---:|
| KPA-Society | [KpaGlobalHeader.tsx](services/web-kpa-society/src/components/KpaGlobalHeader.tsx) | 강의대시보드 / 관리자/운영 대시보드 / 내 매장 / 마이페이지 / 설정 | ❌ 없음 |
| GlycoPharm | [GlycoGlobalHeader.tsx](services/web-glycopharm/src/components/GlycoGlobalHeader.tsx) | 강의대시보드 / 운영 대시보드 / 마이페이지 / 설정 | ❌ 없음 |
| K-Cosmetics | [KCosGlobalHeader.tsx](services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx) | 강의대시보드 / 운영/일반 대시보드 / 마이페이지 / 설정 | ❌ 없음 |
| Neture | [NetureGlobalHeader.tsx](services/web-neture/src/components/NetureGlobalHeader.tsx) | 운영 대시보드 / 마이페이지 / 설정 | ❌ 없음 |

→ **4개 service 모두 서로 격리.** "다른 서비스로 이동" / "다른 서비스 가입" 진입점 0건. 본 4개 service 의 헤더는 V2 철학과 정합.

### 2.2 `DashboardSwitcher` 컴포넌트 (KPA, dormant)

| 위치 | [services/web-kpa-society/src/components/common/DashboardSwitcher.tsx](services/web-kpa-society/src/components/common/DashboardSwitcher.tsx) |
|---|---|
| 사용처 | [StoreUserDropdown.tsx:125](services/web-kpa-society/src/components/store/StoreUserDropdown.tsx#L125) (조건부) |
| 표시 조건 | `accessibleDashboards.length >= 2` |
| 현재 동작 | 단일 대시보드 환경 → **미노출** (dormant code) |
| 평가 | **삭제 후보** — `useAccessibleDashboards()` 가 마이페이지만 반환하므로 실질 무용 |

### 2.3 web-account (Account Center) — 핵심 ServiceSwitcher 사용처

**`web-account`** 는 4개 main service 와 별개의 5번째 service. 중앙 포털 역할.

| 파일 | 기능 |
|---|---|
| [services/web-account/src/pages/DashboardPage.tsx](services/web-account/src/pages/DashboardPage.tsx) | **"내 서비스" + "이용 가능한 서비스" 섹션 UI** — V2 철학과 직접 충돌 영역 |
| [services/web-account/src/components/ServiceCard.tsx](services/web-account/src/components/ServiceCard.tsx) | 가입(UserPlus) / 활성화(RefreshCw) / 열기(ExternalLink) 버튼 |

DashboardPage 가 호출하는 API:
- `GET /api/v1/auth/services` — 서비스 목록 + membership 상태
- `POST /api/v1/auth/handoff` — 서비스 열기 (token 생성)
- `POST /api/v1/auth/services/{serviceKey}/join` — **즉시 active 가입** ★

### 2.4 shared package — `GlobalUserProfileDropdown`

| 위치 | [packages/account-ui/src/components/GlobalUserProfileDropdown.tsx](packages/account-ui/src/components/GlobalUserProfileDropdown.tsx) |
|---|---|
| 용도 | 4 service 공통 사용 가능한 프로필 드롭다운 베이스 (node prop 으로 커스텀 확장) |
| 현재 사용 | KPA `StoreUserDropdown` 에서만 사용 |
| 평가 | **보존** — 일반 dropdown 추상, ServiceSwitcher 자체 아님 |

---

## 3. Backend API 조사

### 3.1 4개 endpoint 책임 매트릭스

| HTTP | Path | 책임 | Identity V2 정합 |
|---|---|---|:---:|
| GET | `/api/v1/auth/services` | 사용자 memberships + 가능 서비스 카탈로그 | ⚪ 정보 조회 자체는 문제 없음 |
| **POST** | **`/api/v1/auth/services/:key/join`** | **즉시 active membership 생성 (운영자 승인 없음)** | ❌ **충돌 — Register 비대칭** |
| POST | `/api/v1/auth/handoff` | handoff token 발급 (60초 TTL) | ✅ 정합 (V2 §7.3 해석 A) |
| POST | `/api/v1/auth/handoff/exchange` | token 교환 → cookie + access/refresh | ✅ 정합 |

### 3.2 `POST /auth/services/:key/join` — 가장 큰 충돌점 (상세)

**위치:** [handoff.controller.ts:164-231](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L164-L231) `HandoffController.joinService()`

**동작:**
- 기존 membership 없음 → `INSERT INTO service_memberships ... status='active'`
- 기존 비활성 (pending/rejected/suspended) → `UPDATE ... SET status='active'`
- withdrawn → 403 차단 (`WO-O4O-HANDOFF-INACTIVE-MEMBERSHIP-BLOCK-V1`)

**비교 — Register 의 흐름:**
- 신규 사용자 → users + service_memberships (`status='pending'`) → **운영자 승인 후 active**
- 기존 사용자 새 서비스 → 본인 확인 (기존 password) + service_memberships (`status='pending'`) → **운영자 승인 후 active**

→ **Register 는 pending, Switcher Join 은 즉시 active.** 동일 user 가 동일 서비스에 가입하는 두 경로의 **승인 정책이 비대칭**.

이는 V2 의 "서비스는 독립 사업자" 철학에서 가장 위험한 우회 경로 — 운영자가 모르는 사이에 사용자가 한 번 클릭으로 active membership 을 획득.

### 3.3 service_memberships 생성 경로 4가지 비교

| 경로 | 위치 | 결과 status | 운영자 승인 필요 |
|---|---|---|:---:|
| **Register (신규 user)** | auth-register.controller.ts | `pending` | ✅ 필요 |
| **Register (기존 user 새 서비스)** | auth-register.controller.ts | `pending` | ✅ 필요 |
| **Switcher Join** ★ | handoff.controller.ts:215 | `active` | ❌ **우회** |
| **운영자 승인** | MembershipApprovalService.ts | pending → `active` | (자기 자신) |
| Migration / seed | 다수 | active / pending | (자동) |

→ Switcher Join 만 운영자 승인을 우회한다.

### 3.4 Frontend 호출 사이트

| API | 호출 사이트 | 비고 |
|---|---|---|
| `GET /auth/services` | web-account DashboardPage:33 | **1곳** |
| `POST /auth/services/:key/join` | web-account DashboardPage:74 | **1곳 — web-account 만** |
| `POST /auth/handoff` | web-account DashboardPage:53 | **1곳** |
| `POST /auth/handoff/exchange` | 5개 HandoffPage (web-account + 4 main) | **5곳** |

→ ServiceSwitcher 관련 호출 (`services`, `join`, `handoff` 발급) 은 모두 **web-account 한 곳에 집중**. 4 main service 는 `handoff/exchange` 의 수신 측 (HandoffPage) 만 사용.

---

## 4. ServiceSwitcher UI 와 Handoff 분리 판단

### 4.1 분리 기준

| 항목 | ServiceSwitcher UI | Handoff API |
|---|---|---|
| **본질** | 사용자가 다른 서비스로 이동하거나 가입하는 진입점 | 인증 token transport 메커니즘 (한 service 의 인증을 다른 service 로 전달) |
| **V2 §7.3 해석 A** | 해당 없음 (UI 단) | "Handoff = Identity 검증 reuse, credential 검증 reuse 아님" → V2 와 양립 |
| **V2 §7.3 해석 B 적용 시** | 어차피 삭제 후보 | 의미 가치 소멸 — 별도 검토 필요 |
| **즉시 삭제 시 영향** | 가입/이동 UI 사라짐 — V2 철학 회복 | cross-domain SSO 깨짐 — 운영 UX 손상 |

### 4.2 본 IR 의 판단

> **ServiceSwitcher UI 는 삭제/축소 후보.**
> **Handoff 는 별도 IR 로 분리 — 즉시 삭제 단정 금지.**

근거:
- Handoff 의 V2 §7.3 해석 A 잠정 채택 상태 (V2 본문에 명시)
- HandoffPage 는 5개 service 전부에 deploy 된 인프라 — 삭제 영향 큼
- Handoff 의 의미 재정의는 V2 §7.3 의 후속 정책 결정 사안

---

## 5. V2 철학 충돌 체크

### 5.1 항목별 매트릭스

| 차원 | V2 / 철학 | 현재 구조 | 충돌 |
|---|---|---|:---:|
| 독립 사업자 원칙 | 서비스별 독립 운영 | 4 main service 의 헤더는 독립 (✅), web-account DashboardPage 가 중앙 집중 (❌) | **부분 충돌 (web-account)** |
| 서비스별 가입 독립성 | 각 service 에서 운영자 승인 거쳐 가입 | Switcher Join 이 운영자 승인 우회, instant active | **HIGH 충돌** |
| 서비스별 Credential 독립성 | 각 service 별 password (V2 Phase 1/2 완료) | Switcher Join 이 service_credentials 미생성 — credential 없는 active membership 생성 가능 | **MED 충돌** |
| 한 서비스에서 다른 서비스 가입 유도 UX | 부적절 (각 서비스가 직접 가입 받음) | web-account DashboardPage 가 "이용 가능한 서비스" 목록 + "가입" 버튼 노출 | **HIGH 충돌** |
| 운영자가 다른 서비스 가입 정보 노출 | 부적절 (cross-service 시야 가짐) | web-account 는 운영자 화면 아님 (사용자 own portal) → cross-service 정보 노출은 사용자 본인에게는 OK | ⚪ 부분 OK |
| 공통 Core + 독립 서비스 구조 | identity·membership·credential·role 만 공통, 가입 UX 는 서비스별 | web-account 가 가입 UX 중앙화 — Core 가 아니라 별도 service | **MED 충돌** |

### 5.2 종합 판정

- **충돌 위치 1순위:** `POST /auth/services/:key/join` 의 instant active 정책
- **충돌 위치 2순위:** web-account DashboardPage 의 "가입 가능 서비스" UI (=중앙 가입 진입점)
- **충돌 위치 3순위:** `GET /auth/services` 가 모든 서비스 카탈로그를 반환 (V2 의 분리 사업자 시야 위반 — 단, 사용자 본인 portal 이므로 약함)

---

## 6. 삭제 / 보존 / 보류 분류

### 6.1 A. 삭제 / 축소 대상 (V2 충돌 직접)

| # | 항목 | 위치 | 충돌 |
|---|---|---|:---:|
| A1 | **`POST /auth/services/:key/join` instant active 정책** | [handoff.controller.ts:164-231](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L164-L231) | HIGH — Register pending 흐름 우회 |
| A2 | **web-account DashboardPage "이용 가능한 서비스" 섹션** | [services/web-account/src/pages/DashboardPage.tsx](services/web-account/src/pages/DashboardPage.tsx) (가입 섹션 부분) | HIGH — 중앙 가입 진입점 |
| A3 | `DashboardSwitcher` 컴포넌트 (KPA, dormant) | [services/web-kpa-society/src/components/common/DashboardSwitcher.tsx](services/web-kpa-society/src/components/common/DashboardSwitcher.tsx) | LOW (사용 안 됨) — cleanup |
| A4 | StoreUserDropdown 의 DashboardSwitcher 조건 호출 | [services/web-kpa-society/src/components/store/StoreUserDropdown.tsx#L125](services/web-kpa-society/src/components/store/StoreUserDropdown.tsx#L125) | LOW (조건부 dormant) — cleanup |
| A5 | web-account ServiceCard 의 "가입" 버튼 path | [services/web-account/src/components/ServiceCard.tsx](services/web-account/src/components/ServiceCard.tsx) | A2 의 부속 |

### 6.2 B. 보존 대상 (V2 정합 또는 내부 필요)

| # | 항목 | 사유 |
|---|---|---|
| B1 | 4 main service 의 GlobalHeader 드롭다운 (강의/운영/마이페이지 등) | 서비스 내부 navigation, inter-service 아님 |
| B2 | `GlobalUserProfileDropdown` (account-ui package) | 일반 dropdown 추상 |
| B3 | `GET /auth/services` (조회 자체) | 사용자가 자기 가입 상태를 보는 것은 정합. 단, 응답에서 "가입 가능 서비스" 부분은 별도 검토 가능 |
| B4 | service_memberships, MembershipApprovalService, 운영자 승인 flow | V2 의 핵심 |
| B5 | `/auth/status`, `/auth/me`, RBAC 관련 endpoint | 내부 필요 |
| B6 | web-account "내 서비스" 섹션 (active membership 보유 서비스만 표시) | 사용자 정보 조회 — 충돌 없음 |

### 6.3 C. 보류 대상 (별도 IR 후속)

| # | 항목 | 사유 |
|---|---|---|
| **C1** | **`POST /auth/handoff` 발급** | V2 §7.3 해석 A 잠정 채택 — 인증 transport 자체는 정합. 별도 정책 IR |
| **C2** | **`POST /auth/handoff/exchange` 교환** | C1 과 짝 |
| **C3** | **5개 HandoffPage (web-account + 4 main)** | C1/C2 와 짝 — exchange 수신 측 인프라 |
| C4 | "withdrawn" 상태 차단 (handoff.controller.ts) | Switcher Join 의 일부지만 보안 정책 — 우선 보존 (탈퇴 즉시 재가입 방지) |
| C5 | web-account 자체의 존재 여부 | 중앙 포털 자체를 폐지/유지 결정은 별도 사안 (가입 UI 만 제거 시 잔여 기능 무엇인지 평가 필요) |

---

## 7. 후속 구현 WO 제안

### 7.1 즉시 가능 (LOW 위험)

**`WO-O4O-DASHBOARD-SWITCHER-DORMANT-CODE-CLEANUP-V1`** (가벼움)
- A3 (DashboardSwitcher 컴포넌트) + A4 (StoreUserDropdown 조건부 호출) 제거
- 사용처 없는 dormant code 정리
- 위험: 매우 낮음

### 7.2 중간 (Identity V2 핵심 영향)

**`WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1`** (HIGH 영향)
- A1: `POST /auth/services/:key/join` 의 정책 결정
  - **Option α**: endpoint 자체 제거 (사용자 facing 가입은 각 service register 만)
  - **Option β**: status 를 `pending` 으로 변경 (Register 와 대칭) — instant active 우회 차단
- A2: web-account DashboardPage "이용 가능한 서비스" 섹션 + "가입" 버튼 제거
- A5: ServiceCard 의 "가입" 버튼 제거
- 본 WO 가 가장 큰 V2 정합 회복 효과

→ Option α (제거) vs Option β (pending 화) — IR 의 권고: **Option β 우선 검토**. endpoint 자체를 보존하되 정책만 정렬하면 향후 다시 활용 여지 보존.

### 7.3 별도 후속 IR (보류 분리)

**`IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1`** (보류 — Handoff 전용)
- C1/C2/C3 의 보존 여부 결정
- V2 §7.3 의 해석 A (잠정) → 정식 정책 확정
- 5개 HandoffPage 의 인프라 영향 평가
- 본 IR 결과 (ServiceSwitcher UI 삭제) 후 Handoff 의 유효성 재평가

---

## 8. 즉시 가능 범위 / 보류 범위 — 결정 매트릭스

| 시점 | 가능 작업 | 위험 |
|---|---|:---:|
| **즉시** | A3 + A4 (DashboardSwitcher dormant cleanup) | LOW |
| **단기 (V2 정합 회복)** | A1 (join API 정책 결정) + A2 + A5 (web-account 가입 UI 제거) | MED |
| **중기 (별도 IR 후)** | C1+C2+C3 (Handoff 보존/축소/삭제) | HIGH (보류) |
| **장기** | C5 (web-account 자체 존속 여부) | 정책 결정 |

---

## 9. 본 IR 이 결정하지 않는 것

- 실제 코드 삭제 / 정책 변경 (별도 WO)
- `POST /auth/services/:key/join` 의 Option α (제거) vs Option β (pending 화) 최종 선택 — 별도 WO 시작 시 결정
- Handoff 의 보존/축소/삭제 결정 — 별도 IR 후속
- web-account (Account Center) 자체의 존속 여부

---

## 10. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|---|:----------:|
| 1 | 즉시 dormant cleanup WO 진행 여부 (A3+A4) | **권장** (LOW 위험) |
| 2 | Service Join API 정책 — Option α 제거 vs Option β pending 화 | **Option β 우선 검토** (pending 화) |
| 3 | web-account DashboardPage 가입 UI 제거 우선순위 | A1 결정 이후 진행 |
| 4 | Handoff IR 후속 우선순위 | A1 완료 후 별도 IR — 즉시 결정 불요 |

---

## 11. 검증 항목

| 검증 | 결과 |
|---|:---:|
| Frontend ServiceSwitcher UI 전수 (5 service + shared package) | ✅ §2 |
| API 4개 endpoint 책임 + 호출 사이트 매트릭스 | ✅ §3 |
| service_memberships 생성 경로 4가지 비교 (Switcher Join 비대칭 확인) | ✅ §3.3 |
| ServiceSwitcher 와 Handoff 분리 판단 | ✅ §4 |
| V2 철학 충돌 체크 (6 차원) | ✅ §5 |
| 삭제 / 보존 / 보류 분류 (A/B/C 각 항목) | ✅ §6 |
| 후속 WO 제안 (즉시 / 단기 / 중기) | ✅ §7 |

---

## 부록 — 본 IR 의 비범위 (Out-of-Scope)

본 IR 은 다음을 수행하지 **않는다**:

- 코드 / migration / DB / UI 변경
- ServiceSwitcher 를 살리는 UX 재설계
- Handoff 의 즉시 삭제 결정
- 후속 WO 의 실제 생성

---

*Created: 2026-05-23*
*Type: Investigation Report (read-only)*
*Status: Awaiting Decision — A3+A4 dormant cleanup / A1 join API 정책 결정 / Handoff IR 후속*
