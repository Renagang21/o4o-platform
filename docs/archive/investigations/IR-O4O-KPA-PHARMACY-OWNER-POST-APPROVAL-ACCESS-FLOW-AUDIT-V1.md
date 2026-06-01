# IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/migration/UI/contract 수정 없음, **commit/push 금지**)
**대상**: KPA-Society 에서 약국 개설자 (pharmacy_owner) 가 가입 승인 완료 후에도 `/pharmacy/approval` 로 강제 redirect 되는 증상의 **root cause** 분석.

**연관 IR**:
- `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (sister IR — auto-activation 흐름 + Guard 동작 매핑)
- `IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1` (post-approval data flow)
- `IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1` (policy alignment)

**증상** (사용자 보고):
1. 가입 시 약국 개설자 정보 입력 (pharmacy_owner)
2. 운영자가 회원 승인 완료
3. operator 화면에서도 약국 개설자로 정상 표시
4. **그러나 로그인 후 `/pharmacy/approval` 로 강제 redirect — "약국 서비스 이용 신청"을 다시 요구받음**

**현재 정책** (`IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` Sister IR 명시):
> 약국 개설자 / 매장 경영자 → 별도 약국 서비스 신청 승인 없이 → 매장 HUB + 내 약국 자동 이용

→ 현재 정책과 본 증상이 **명백히 충돌**.

---

## 0. 결론 요약

> **결론: Root cause 는 거의 확실히 "frontend 의 JWT stale" — backend auto-activation 은 정상 동작 (`role_assignments(kpa:store_owner)` INSERT) 하지만 사용자 JWT 의 `user.roles` 가 stale 하여 frontend Guard 가 권한 인식 못 함.** 추가로 PharmacyPage 의 단일 role check (PharmacyGuard 의 dual check 와 다름) 가 stale JWT 회복 fallback 부재로 redirect chain 트리거.

### 0-1. Redirect 체인 (실제 동작)

```
사용자 (kpa:store_owner role 보유 — backend 기록 상)
   ↓ /store-hub 또는 /store 접근 시도
HubGuard L37: hasAnyRole(user.roles, STORE_OWNER_ROLES)
   ↓ user.roles 에 kpa:store_owner 없음 (JWT stale)
   Navigate to=/pharmacy
   ↓
PharmacyPage L26: hasStoreRole = hasAnyRole(user.roles, STORE_OWNER_ROLES)
   ↓ false (JWT stale)
   useEffect: pharmacyRequestApi.getMyRequests() → 자동부여 사용자는 신청 row 없음 → 'none'
   ↓
L278: Navigate to=/pharmacy/approval ⚠️
   ↓
PharmacyApprovalGatePage L108: user.activityType !== 'pharmacy_owner'
   ↓ pharmacy_owner 이므로 통과 (loop 차단 안 됨)
신청 폼 표시 — 사용자가 "신청" 요구받음 ⚠️
```

### 0-2. 핵심 발견

| # | 발견 | 위험도 |
|---|---|:---:|
| F1 | **PharmacyPage 의 `hasStoreRole` 는 단순 `hasAnyRole(user.roles, STORE_OWNER_ROLES)` 만 check** — PharmacyGuard 의 dual check (roles + `user.isStoreOwner` via KPA context) 와 불일치 | 🔴 HIGH |
| F2 | **stale JWT 회복 fallback 부재** — PharmacyGuard 는 API check (`getMyRequestsCached`) 로 stale JWT 회복 시도하지만, **자동 부여 사용자는 pharmacy_request row 없음** → API check 도 false 반환 → /pharmacy 로 보낸 후 PharmacyApprovalGatePage 까지 chain | 🔴 HIGH |
| F3 | **PharmacyApprovalGatePage L108 의 loop 차단 가드** (`activityType !== 'pharmacy_owner'` 면 /pharmacy redirect) 가 pharmacy_owner 의 경우 통과 → 신청 폼 노출 | 🟠 MID |
| F4 | **자동 부여 사용자에게 신청 폼 노출 = 정책 위반** — 사용자가 다시 신청하면 backend 가 organization_members(role='owner') 중복 체크 (pharmacy-request.controller:58-68) 로 거부 → UX 혼란 | 🔴 HIGH |
| F5 | **/pharmacy/approval (PharmacyApprovalGatePage) 는 legacy/manual fallback 흐름** — 자동 부여 정책 도입 후 일반 사용자에게는 노출되지 않아야 하나 Guard 차단 부재 | 🟠 MID |
| F6 | **multi-role 사용자 (operator + store_owner) 가 자기 매장 접근 시 추가 위험** — HubGuard L33 이 `hasAnyRole(user.roles, PLATFORM_ROLES)` 우선 체크 → /operator 로 강제 redirect (자기 매장 접근 차단) | 🟠 MID |

### 0-3. 핵심 질문 답변 (요약)

| 질문 | 답 |
|---|---|
| 승인 완료 시 kpa:store_owner 자동 부여? | **YES (backend)** — member.controller.ts:550-614 의 auto-activation 정상 동작 (sister IR 확인). 단 backend 기록 ≠ frontend JWT |
| role_assignments 있는데 frontend 인식 못 함? | **YES (가설, 강력)** — JWT 에 user.roles 가 stale 한 경우. 사용자 재로그인이 새 JWT 발급되어야 회복되나, 일부 시나리오에서 누락 |
| organization 생성? | **YES (가설)** — auto-activation 흐름에서 `ensureOrganization(code=kpa-pharm-{bizno})` 호출 + organization_members(owner) INSERT 정상 (별도 데이터 검증 필요) |
| /pharmacy/approval 로 redirect 시키는 코드? | **PharmacyPage.tsx:278** — useEffect 결과 'none' 분기 fallthrough |
| 과거 "약국 서비스 신청" 흐름이 활성 route 로 잔존? | **YES** — `/pharmacy/approval` route + PharmacyApprovalGatePage + pharmacy-request.controller backend 모두 활성. Sister IR 진단: **fallback 경로로 유효** (자동 부여 실패 / 다른 직역) — 정책상 보존, 단 자동 부여 사용자에게 노출되면 UX 위반 |
| 현재 정책상 /pharmacy/approval 이 언제 필요? | **manual 신청 경로** (자동 부여 prerequisite 누락 사용자 / 다른 직역) — 자동 부여 성공한 pharmacy_owner 에게는 노출 금지 |
| 어느 단계에서 끊기는가? | **HubGuard → PharmacyPage → PharmacyApprovalGate** 3-step redirect chain — 각 단계가 user.roles 만 check, KPA context fallback 부재 |

---

## 1. 조사 방법

- 직접 grep + Read 로 redirect 코드 위치 + Guard 체인 추적 (agent 미사용 — 증거 충분)
- Sister IR (`IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1`) 의 데이터 재활용 + 새 발견 정정/보강
- 운영 데이터 확인은 본 IR 범위 외 (가설 검증 prerequisite — 후속 작업 필요)

### 1-1. 본 IR vs Sister IR 차이

| 항목 | Sister IR (자동 부여 capability) | 본 IR (post-approval access) |
|---|---|---|
| 시나리오 | 자동 부여 사용자가 MyProfilePage 의 capability 카드 보는 경우 | 자동 부여 사용자가 /store-hub 진입 시도 |
| Guard | MyProfilePage 의 deriveStoreOwnerStatus | HubGuard / PharmacyPage / PharmacyApprovalGatePage |
| Sister IR 의 가정 | "role 만 있으면 어디서든 즉시 통과" | **이 가정이 JWT stale 시점에는 깨짐** |
| 본 IR 추가 | — | redirect chain (HubGuard → PharmacyPage → /pharmacy/approval) + stale JWT 회복 부재 |

---

## 2. Redirect Decision Map

### 2-1. HubGuard ([components/auth/HubGuard.tsx](services/web-kpa-society/src/components/auth/HubGuard.tsx))

**라우트**: `/store-hub`, `/store-hub/*` 영역

```typescript
if (!isAuthenticated || !user) → /login                              (L30)
if (hasAnyRole(user.roles, PLATFORM_ROLES)) → /operator              (L34)  ⚠️ multi-role 위험
if (hasAnyRole(user.roles, STORE_OWNER_ROLES)) → <MembershipGate>    (L39)  ← 통과
default → /pharmacy                                                  (L42)  ← stale JWT 시 트리거
```

**핵심 결함**:
- L37: **단일 check** (`hasAnyRole(user.roles, STORE_OWNER_ROLES)`)
- PharmacyGuard 의 dual check (`isStoreOwnerDual(roles, 'kpa:store_owner', user.isStoreOwner)`) 와 불일치
- → JWT 의 `user.roles` 에만 의존, KPA context (isStoreOwner) fallback 부재
- → stale JWT 시 무조건 /pharmacy 로 redirect

### 2-2. PharmacyGuard ([components/auth/PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx))

**라우트**: `/store`, `/store/*` 영역

```typescript
hasStoreRole = isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)  ← dual check ✅
isPlatformOnlyUser = !hasStoreRole && hasAnyRole(user.roles, PLATFORM_ROLES)
needsApiCheck = !hasStoreRole && !isPlatformOnlyUser

if (isLoading) → loading                                                          (L69)
if (!isAuthenticated) → /login                                                    (L77)
if (hasStoreRole) → <MembershipGate>                                              (L83)  ← 통과
if (isPlatformOnlyUser) → 접근 차단 안내 (operator/admin 단독)                    (L88)
if (apiCheck === 'loading' || 'idle') → loading                                   (L99)
if (apiCheck === 'approved') → checkAuth() + <MembershipGate>                     (L107) ← stale JWT 회복!
default → /pharmacy                                                               (L111) ← stale JWT 시 트리거 가능
```

**핵심**:
- `apiCheck` = `getMyRequestsCached().find(r => r.status === 'approved')`
- → **수동 신청 (pharmacy_request) 가 있는 사용자만 fallback 회복**
- 자동 부여 사용자는 pharmacy_request row **없음** → apiCheck 'denied' → /pharmacy redirect

### 2-3. PharmacyPage ([pages/pharmacy/PharmacyPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx))

**라우트**: `/pharmacy`

```typescript
hasStoreRole = hasAnyRole(user.roles, STORE_OWNER_ROLES)                    ← 단일 check
isAdminOrOperator = user.roles.some(r => NON_PHARMACIST_ROLES.includes(r))

useEffect:
  if (isAdminOrOperator) → setApprovalStatus('none')
  else → pharmacyRequestApi.getMyRequests() → 'approved'/'pending'/'rejected'/'none'

분기:
  if (!user) → 로그인 안내
  if (isAdminOrOperator) → 접근 불가 안내
  if (hasStoreRole) → /store ← 정상 경로 ✅
  if (approvalStatus === 'loading') → 로딩
  if (approvalStatus === 'approved') → 새로고침 안내 (코멘트: "hasStoreRole=true면 위에서 리다이렉트됨")
  if (approvalStatus === 'pending') → 대기 안내
  if (approvalStatus === 'rejected') → 재신청 안내
  if (approvalStatus === 'error') → 에러 안내
  default ('none') → Navigate to /pharmacy/approval                              ← 본 증상 trigger
```

**핵심 결함**:
- L26: 단일 check (HubGuard 와 동일)
- `approvalStatus = 'none'` 분기 (default) 가 자동 부여 사용자에게도 적용 → /pharmacy/approval

### 2-4. PharmacyApprovalGatePage ([pages/pharmacy/PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx))

**라우트**: `/pharmacy/approval`

```typescript
if (!user) → /login?returnTo=/pharmacy/approval                  (L104)
if (user.activityType !== 'pharmacy_owner') → /pharmacy           (L108) ← loop 차단 시도
... 신청 폼 표시 (자동 부여 사용자에게도 노출 ⚠️) ...
```

**핵심 결함**:
- L108 의 loop 차단이 `activityType` 만 체크 — pharmacy_owner 이면 통과
- **자동 부여 사용자 (activityType=pharmacy_owner, role 보유) 도 신청 폼 노출**
- 신청 시 backend (pharmacy-request.controller) 가 `organization_members(role='owner')` 중복 체크로 거부 → "이미 가입됨" 에러 → UX 혼란

---

## 3. Guard 비교 매트릭스

| 항목 | HubGuard | PharmacyGuard | PharmacyPage | PharmacyApprovalGatePage |
|---|:---:|:---:|:---:|:---:|
| Route | `/store-hub` | `/store` | `/pharmacy` | `/pharmacy/approval` |
| Role check 방식 | **단일** (roles only) | **dual** (roles + isStoreOwner) | **단일** (roles only) | activityType check |
| Stale JWT 회복 fallback | ❌ 없음 | ✅ API check (pharmacy_request) → checkAuth() | ❌ 없음 | ❌ 없음 |
| 자동 부여 사용자 (role 보유, stale JWT) 동작 | /pharmacy redirect ⚠️ | API check → pharmacy_request 없으면 /pharmacy redirect ⚠️ | hasStoreRole false → /pharmacy/approval ⚠️ | activityType=pharmacy_owner 통과 → 신청 폼 ⚠️ |
| 자동 부여 사용자 (role 보유, fresh JWT) 동작 | 통과 ✅ | 통과 ✅ | hasStoreRole true → /store ✅ | activityType=pharmacy_owner 통과, 신청 폼 (불필요) ⚠️ |
| 수동 신청 승인 사용자 (role 보유, fresh JWT) 동작 | 통과 ✅ | 통과 ✅ | /store ✅ | 통과 (재신청 시도 가능 — UX 노이즈) ⚠️ |
| 수동 신청 미승인 (pending) 사용자 | /pharmacy redirect | API check → 'pending' → /pharmacy redirect | 'pending' 안내 화면 | 신청 폼 (재신청) |

→ **Guard 일관성 부재**: HubGuard / PharmacyPage 가 단일 check, PharmacyGuard 만 dual check + API fallback.

---

## 4. Role/Organization 생성 검증 매트릭스

> ⚠️ 본 IR 은 코드 흐름만 매핑. **실제 운영 데이터 검증은 별도 작업 필요** (Cloud SQL gcloud connect 등으로 확인).

| 단계 | 코드 흐름 (예상 동작) | 검증 방법 |
|---|---|---|
| 가입 (W1) | `users.businessInfo` insert + `kpa_members.pending` insert + `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` | DB SELECT (가입 직후) |
| 운영자 승인 (자동 부여) | `member.controller.ts:550-614` — 조건: `activity_type='pharmacy_owner'` + `businessInfo.businessNumber` + `(businessName OR pharmacy_name)` 모두 존재 시 → `ensureOrganization` + `organization_members(owner)` + `role_assignments(kpa:store_owner)` | DB SELECT (승인 직후): organizations / organization_members / role_assignments 모두 존재 확인 |
| 사용자 로그인 (JWT 발급) | JWT 의 `user.roles` 가 role_assignments 의 active rows 반영해야 함 | JWT decode 후 roles array 확인 |
| `/store-hub` 접근 | HubGuard L37 통과 (kpa:store_owner 보유) | 브라우저 검증 |

**가설 검증 시나리오** (가장 유력):
1. 가입 → backend OK (kpa_members.pending + businessInfo)
2. 운영자 승인 → backend OK (role_assignments + organizations + organization_members 모두 생성)
3. **사용자 로그인 → JWT 발급 시점에 fresh role_assignments 로드 정상** (login service 가 정상이라면)
4. ✅ `/store-hub` 접근 → HubGuard 통과 → 정상

만약 본 IR 의 증상 발생 시:
- **Step 3 의 JWT 가 fresh 가 아니거나 user.roles 가 빈 array 또는 stale**
- 또는 Step 2 의 auto-activation 이 `graceful skip + warn` 으로 role_assignments 미생성 (businessNumber 누락 시)
- 또는 다른 미식별 path

---

## 5. /pharmacy/approval Legacy 판정

| 영역 | 판정 | 근거 |
|---|---|---|
| `/pharmacy/approval` route (App.tsx) | **ALIVE** | route 등록 + lazy import 활성 |
| PharmacyApprovalGatePage 컴포넌트 | **ALIVE** | 신청 폼 + state 관리 + API 호출 정상 |
| Backend pharmacy-request.controller (POST / PATCH approve) | **ALIVE** | sister IR 확인 — manual fallback 으로 유효 |
| Auto-activation 사용자에게 노출 | ⚠️ **정책 위반** | PharmacyPage default fallthrough 가 무조건 노출 |
| 사용자가 신청 시 backend 동작 | UX 부조리 | `organization_members(owner)` 중복 체크 (pharmacy-request.controller:58-68) 로 거부 → "이미 가입" 에러 |

→ **/pharmacy/approval 은 legacy 가 아닌 fallback 경로** (자동 부여 실패 / 다른 직역). 단 자동 부여 성공 사용자에게 노출되는 게 결함. **Guard 강화 필요** (rename/제거 아님).

---

## 6. Sister IR (`IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1`) 의 진단 정정

Sister IR L62-65 결론:
> 핵심:
> - `kpa:store_owner` role 만 있으면 어디서든 즉시 통과
> - pharmacy_request 의 승인 상태는 **role 이 없는 사용자의 fallback** 또는 **stale JWT 갱신 트리거**일 뿐
> - **자동 부여로 role 이 생긴 사용자는 신청 흐름과 100% 무관하게 진입 가능**

**본 IR 정정**:
- Sister IR 의 마지막 statement ("100% 무관하게 진입 가능") 는 **JWT 가 role 을 반영한 경우만**
- JWT stale 시 다음 chain 트리거: HubGuard 차단 → PharmacyPage → /pharmacy/approval
- **stale JWT 회복 fallback** (PharmacyGuard 의 getMyRequestsCached) 도 **자동 부여 사용자에게는 동작 안 함** (pharmacy_request 없음)
- → Sister IR 의 가정 일부 부정확. 자동 부여 사용자도 일정 조건에서 신청 흐름에 갇힘

---

## 7. Multi-Role 사용자 추가 위험

본 IR 추가 발견:

**Multi-role 사용자 (`operator + store_owner`) 의 자기 매장 접근**:

```
/store-hub 접근
  ↓
HubGuard L33: hasAnyRole(user.roles, PLATFORM_ROLES) → 'operator' 포함 → true
  ↓
Navigate to /operator (자기 매장 차단!)
```

PharmacyGuard 는 L88 에서 `isPlatformOnlyUser` (store_owner 없는 단독 platform role) 만 차단 — store_owner 도 가진 multi-role 은 통과. 그러나 HubGuard 는 PLATFORM_ROLES 우선 차단.

→ **HubGuard 가 multi-role 사용자의 자기 매장 접근을 방해**. (PharmacyGuard 와 정책 불일치)

이는 본 증상과 별개 위험이나, Guard 일관성 정렬 시 함께 정비 필요.

---

## 8. 후속 WO 후보

> 본 IR 은 조사 — WO 작성 / 코드 수정 / commit 금지. 아래는 향후 정비 방향 후보.

### Phase 1: 회귀 차단 (긴급, 작은 작업)

**WO-O4O-KPA-PHARMACY-PAGE-DUAL-ROLE-CHECK-V1**: PharmacyPage 의 `hasStoreRole` 를 PharmacyGuard 와 동일한 `isStoreOwnerDual(roles, 'kpa:store_owner', user.isStoreOwner)` 로 통일. stale JWT 시 KPA context 로 회복.

**WO-O4O-KPA-HUB-GUARD-DUAL-ROLE-CHECK-V1**: HubGuard 도 동일 dual check 적용 + multi-role (operator+store_owner) 의 자기 매장 접근 허용.

### Phase 2: stale JWT 근본 회복

**WO-O4O-KPA-AUTO-ACTIVATION-JWT-REFRESH-V1**: 운영자 승인 시점에 사용자의 JWT 무효화 또는 next request 시 fresh role_assignments 강제 로드.

또는 frontend 의 `checkAuth()` 를 일정 주기 자동 호출 → stale role 갱신.

### Phase 3: PharmacyApprovalGate UX 정렬

**WO-O4O-KPA-PHARMACY-APPROVAL-GATE-ACCESS-RESTRICT-V1**: PharmacyApprovalGatePage 의 L108 가드를 강화 — 이미 `kpa:store_owner` role 보유 또는 `organization_members(owner)` 존재 시 → `/store` 로 redirect (신청 폼 미노출).

### Phase 4: 운영 데이터 검증 (선행 prerequisite)

**개별 운영 검증 (별도 작업)**:
- 사용자 보고 케이스의 실제 데이터 확인 (Cloud SQL):
  - `role_assignments` 에 `(user_id, role='kpa:store_owner', is_active=true)` 존재?
  - `organizations(code='kpa-pharm-{bizno}')` 존재?
  - `organization_members(user_id, role='owner')` 존재?
- 만약 위 row 들 미존재 → backend auto-activation 자체 실패 (다른 root cause)
- 만약 row 들 존재하나 JWT 의 user.roles 에 없음 → JWT stale 확정

---

## 9. 위험 매트릭스

| # | 위험 | 영향 | 심각도 | 즉시 처리 가능? |
|---|---|---|:---:|:---:|
| R1 | 자동 부여 사용자가 /pharmacy/approval 로 강제 redirect | UX 부조리 + 사용자 혼란 | 🔴 HIGH | ✅ Phase 1 |
| R2 | HubGuard 와 PharmacyGuard 의 role check 일관성 부재 | predictability 결여 | 🔴 HIGH | ✅ Phase 1 |
| R3 | stale JWT 회복 메커니즘 부재 (자동 부여 사용자) | role 부여 후에도 화면 차단 | 🔴 HIGH | Phase 2 (큰 작업) |
| R4 | PharmacyApprovalGatePage 가 이미 승인된 사용자에게 신청 폼 노출 | 중복 신청 → backend error → UX 혼란 | 🟠 MID | ✅ Phase 3 |
| R5 | Multi-role 사용자 (operator + store_owner) 자기 매장 접근 차단 | 다중 권한 사용자 대응 부재 | 🟠 MID | ✅ Phase 1 (HubGuard 정비 시 동시) |
| R6 | auto-activation graceful skip 시 운영자 알림 없음 | 일부 사용자 silent fail | 🟠 MID | 별도 WO (Phase 5 권장 — 선행 IR §10-7 참조) |

---

## 10. 본 IR 범위 외 (후속)

1. **실제 운영 데이터 검증** — 사용자 보고 케이스의 DB row 존재 여부 (role_assignments / organizations / organization_members)
2. **JWT 발급 코드 추적** — login service 의 user.roles 채우는 정확한 위치 (현재는 코드 흐름 매핑만)
3. **`getMyRequestsCached` cache 동작 검증** — 잘못된 cache hit 가능성
4. **MembershipGate 동작** — store_owner role 있어도 service_memberships(kpa-society, active) 가 없으면 차단되는지
5. **사용자 가입 직후의 JWT 발급 시점 trace** — pending 상태에서 발급된 JWT 가 활성 후에도 사용되는지
6. **`pharmacy-request.controller` 의 중복 체크 동작** — 자동 부여 사용자가 신청 시 정확한 에러 메시지

---

## 11. 참조

### 핵심 코드
- [HubGuard.tsx](services/web-kpa-society/src/components/auth/HubGuard.tsx) — L37 단일 check, L42 /pharmacy redirect
- [PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx) — dual check + API fallback
- [PharmacyPage.tsx:26-130](services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx#L26-L130) — hasStoreRole 단일 check, L278 default fallthrough
- [PharmacyApprovalGatePage.tsx:108](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx#L108) — activityType 만 체크
- [member.controller.ts:550-614](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L550-L614) — auto-activation
- [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) — manual approval + organization_members 중복 체크

### 연관 IR
- [IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1](docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md) — Sister IR (auto-activation 흐름)
- [IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1](docs/investigations/IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1.md) — Auto-activation prerequisite (§7)
- [IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1](docs/investigations/IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1.md) — store_owner prerequisite (§12-1)

### Canonical 기준
- `STORE_OWNER_ROLES = ['kpa:store_owner']` ([lib/role-constants.ts](services/web-kpa-society/src/lib/role-constants.ts))
- `isStoreOwnerDual()` ([packages/auth-utils](packages/auth-utils/src/isStoreOwnerDual.ts))

---

*조사 전용 — 코드 / DB / migration / UI / contract 수정 없음. 본 IR 단계에서 후속 WO 작성 금지. **commit/push 금지** (IR 정책) — IR 파일은 working tree 에 두고 결정 대기.*
