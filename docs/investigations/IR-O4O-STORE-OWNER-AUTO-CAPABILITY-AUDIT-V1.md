# IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- O4O 현재 정책: 매장 경영자(Store Owner)는 별도 "매장 운영 권한 신청" 없이 자동으로 `/store` · Store HUB 접근 가능
- KPA-Society `/mypage/profile` 의 "매장 운영 권한 신청" capability 카드 / pharmacy_request 흐름의 레거시 여부

**연관 작업**:
- WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1 (commit `6a6f9426e`) — 회원 승인 시 자동 store_owner 활성화 도입
- WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1 — 현재 capability 카드 UI 도입
- WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1 — `isStoreOwnerDual()` 공통 helper

---

## 0. 결론 요약

**부분 레거시 (Partial Legacy)** 상태로 판정.

- **Backend pharmacy_request 흐름**: 모두 살아있고 정상 동작 (POST 신청 / GET 조회 / PATCH 승인·반려). 운영자 처리 화면 / 다른 직역 수동 신청 / 자동 부여 실패 시 fallback 경로로 유효.
- **Frontend MyProfilePage capability 카드**: 자동 부여 정책 도입 후에도 모든 `hasPharmacistInfo=true` 사용자(약사면허 보유자)에게 표시됨. 자동 부여로 role 이 이미 있는 사용자에게는 `deriveStoreOwnerStatus()` 가 `'approved'` 로 강제 오버라이드하므로 결과적으로 올바르나, "신청 → 승인" 메타포 자체가 의미를 잃은 상태.
- **`/store`·`/store-hub` 접근 판정**: 순수 `kpa:store_owner` role 기반(HubGuard) 또는 role 우선·API fallback(PharmacyGuard). **role 만 있으면 신청 흐름과 무관하게 통과**.

→ 자동 부여 대상(`activity_type='pharmacy_owner'`) 사용자에게는 capability 카드가 **UX 노이즈**. 다른 직역 / 자동 부여 실패 fallback 으로는 **여전히 유효**. 단순 제거가 아닌 **조건부 표시**가 정답.

---

## 1. 현재 capability 흐름 구조 요약

두 흐름이 공존:

| 흐름 | 위치 | 트리거 | 결과 |
|------|------|--------|------|
| **자동 부여** | [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) PATCH `/kpa/members/:id/status` (pending→active 분기, L550-614) | 운영자가 회원 승인 + `activity_type='pharmacy_owner'` + businessNumber/pharmacyName 존재 | organizations(type='pharmacy') ensure + organization_members(owner) + role_assignments(`kpa:store_owner`) |
| **수동 신청** | [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/pharmacy-request.controller.ts) POST `/` (L40-101) → PATCH `/:id/approve` (L169-251) | 사용자가 `/pharmacy` 에서 신청 → 운영자가 승인 | 동일 (organizations + organization_members + role_assignments) |

### 1-A. MyProfilePage capability 카드

[MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx)

| 항목 | 라인 | 내용 |
|------|------|------|
| 타입 | L29 | `StoreOwnerCapStatus = 'unknown' \| 'unsubmitted' \| 'pending' \| 'approved' \| 'rejected'` |
| 상태 도출 | L38-47 | `deriveStoreOwnerStatus(items, hasStoreOwnerRole)` — `hasStoreOwnerRole=true` 면 **API 결과 무시하고 즉시 `'approved'` 반환** |
| 상태 fetch | L116-137 | `pharmacyRequestApi.getMyRequests()` 호출 + `user.roles.includes('kpa:store_owner')` 체크 병행 |
| 렌더 조건 | L458-683 영역 | `activeTab === 'role' && hasPharmacistInfo` (직역 탭 + 약사면허 정보 있음) 안에서 view mode 시 capability section 표시 — `isPharmacyOwner` 조건과 **무관** |
| UI 분기 | L645-656 | 상태별 CTA: `unsubmitted` → "매장 운영 권한 신청" Link / `pending` → "내 신청 보기" / `approved` → "내 매장으로 이동" / `rejected` → "다시 신청하기" |

→ **모든 약사면허 보유자**에게 카드가 노출됨. `isPharmacyOwner` 조건은 카드 노출 여부에 영향 없고, 그 위쪽 약국 정보 표시 분기에만 사용.

---

## 2. 실제 `/store` 접근 판정 기준

| 라우트 | 가드 파일 | 판정 기준 |
|--------|----------|-----------|
| `/store-hub` (Hub) | [HubGuard.tsx](services/web-kpa-society/src/components/auth/HubGuard.tsx) L37 | **순수 role**: `hasAnyRole(user.roles, STORE_OWNER_ROLES)` ← `STORE_OWNER_ROLES = ['kpa:store_owner']` |
| `/store` (약국 관리) | [PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx) L37-38 | **role 우선**: `isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)` — JWT roles 또는 KPA context 중 하나 |
| `/store` (role 없는 fallback) | PharmacyGuard L40-67 | role 없을 때만 `getMyRequestsCached()` 호출 → `apiCheck === 'approved'` 이면 `checkAuth()` 재실행하여 stale JWT 갱신 |
| `/pharmacy` (신청 페이지) | 없음 (자체 폼) | 신청 폼 표시 또는 상태 분기 (pending/approved/rejected) |

핵심:
- `kpa:store_owner` role 만 있으면 어디서든 즉시 통과
- pharmacy_request 의 승인 상태는 **role 이 없는 사용자의 fallback** 또는 **stale JWT 갱신 트리거**일 뿐
- **자동 부여로 role 이 생긴 사용자는 신청 흐름과 100% 무관하게 진입 가능**

---

## 3. 자동 부여 정책과 capability 카드의 충돌 지점

| # | 충돌 / 모순 | 영향 |
|---|------------|------|
| 1 | 자동 부여 사용자는 pharmacy_request row 가 생성되지 않음 → `getMyRequests()` 가 빈 배열 반환 → `deriveStoreOwnerStatus([], true)` → role 기반 오버라이드로 `'approved'` 강제 | **외관상 정상**이지만 "신청한 적 없는데 승인됨" 의 메타포 붕괴 |
| 2 | 운영자가 회원을 active 로 승인하면 자동 부여 진행 — 사용자는 본인이 신청한 적 없이 권한이 생김. capability 카드는 그 후에도 `'approved'` 로만 표시 (CTA: "내 매장으로 이동") | **결과는 옳음**, 다만 사용자에게 "신청 절차" 라는 메시지 자체가 노이즈 |
| 3 | 자동 부여가 실패(businessNumber 누락 등)하면 silent fail. role 미부여 → capability 카드의 `deriveStoreOwnerStatus` 가 `'unsubmitted'` 로 표시 → 사용자가 신청 시도 → POST 에서 `organization_members(user_id, role='owner')` 중복 체크 통과 (org 미생성이라) → 수동 흐름으로 보완 | **fallback 경로로 정상 동작**. 자동 부여 실패 알림 미비가 별도 이슈 |
| 4 | activity_type 갈라짐 — 자동 부여는 `pharmacy_owner` 전용. 다른 직역(`pharmacy_employee` 등)이 매장 운영을 하려면 여전히 수동 신청 필요. 그러나 자동 부여가 의도하는 "약사면허 + 사업자등록 = 자동 owner" 모델에선 다른 직역 케이스가 정책상 존재하지 않을 가능성 | **정책 확인 필요** — 다른 직역도 매장 운영 권한 가능 여부 |

---

## 4. dead code / dead flow 식별

| 항목 | 판정 | 근거 |
|------|------|------|
| Backend `pharmacy-request.controller.ts` (POST/GET/PATCH) | **활성** | 자동 부여 실패 fallback, 다른 직역, 운영자 처리 화면 모두 사용 |
| Backend `pharmacy_request` 테이블 | **활성** | 기존 신청 레코드 보존 + 신규 신청 가능 |
| Frontend `pharmacyRequestApi.ts` | **활성** | PharmacyGuard fallback, MyProfilePage 상태 조회, /pharmacy 신청 페이지 |
| Frontend `/pharmacy` 신청 페이지 (`PharmacyPage`) | **반쯤 죽음** | 자동 부여 약국 개설 직역에겐 진입 불필요. 다른 직역 / 자동 부여 실패 / 재신청 경로로만 유효 |
| Frontend MyProfilePage capability 카드 | **반쯤 죽음** | 자동 부여 사용자에겐 의미 손실. 다만 다른 직역 / fallback 사용자에겐 유효 |
| Frontend PharmacyGuard 의 API fallback (`getMyRequestsCached`) | **부분 레거시** | 약국 개설 단일 직역 환경이라면 불필요. 다른 직역 지원하려면 유지 |
| 운영자 측 pharmacy_request 승인 화면 | **활성 (조사 추가 필요)** | 운영자가 수동 신청을 처리하는 화면이 존재하는지 별도 확인 필요 |

---

## 5. 제거 가능 UI vs 보존 로직 구분

| 항목 | UI 처리 | 로직 처리 | 권장 |
|------|--------|----------|------|
| MyProfilePage capability 카드 | **조건부 렌더링** 권장 | API 유지 | `!hasStoreOwnerRole` 일 때만 카드 표시. role 보유 시 카드 자체 숨김 (또는 "이미 활성화됨" 한 줄 표시로 축소) |
| capability 카드 안 "별도 승인 절차 필요" 문구 | role 보유 시 표시 X | — | 위와 동시 처리 |
| `unsubmitted` / `pending` / `rejected` 상태 CTA | role 보유 사용자에게 미표시 | — | 동일 |
| `approved` 상태 CTA "내 매장으로 이동" | role 보유 시도 유지 가능 | — | 진입 편의 — 단 마이페이지 상단에 매장 메뉴가 이미 있으면 중복 |
| `/pharmacy` 신청 페이지 | 자동 부여 약국 개설자에겐 redirect | 유지 | role 보유 + already-owner 면 `/store` 로 redirect (이미 PharmacyPage 가 일부 처리할 가능성 — 확인 필요) |
| pharmacy_request API 엔드포인트 | — | 유지 | 다른 직역 / fallback / 운영자 처리 |
| pharmacy_request 테이블 / 마이그레이션 | — | 유지 | 기존 레코드 보존 + 신규 활용 가능 |
| PharmacyGuard `getMyRequestsCached` fallback | — | **조건부 단순화 가능** | 멀티 직역 미지원 정책이면 제거 가능. 현 정책 확인 필요 |

---

## 6. 다른 서비스 동일 패턴 — KPA-Society 단독

| 서비스 | MyProfilePage | capability 카드 | 자동 부여 |
|--------|--------------|----------------|-----------|
| `web-kpa-society` | 있음 (700+ lines) | **있음** (capabilitySection, L620+) | **있음** (member.controller 자동 활성화) |
| `web-glycopharm` | 있음 (간단) | **없음** | **없음** |
| `web-k-cosmetics` | 있음 (매우 간단) | **없음** | **없음** |
| `web-neture` | (조사 범위 외) | — | — |

→ 본 IR 결론은 KPA-Society 한정. 다른 서비스로 횡전개 우려 없음.

---

## 7. 위험 신호 / 추가 확인 필요

| # | 항목 | 영향 |
|---|------|------|
| 1 | **자동 부여 실패 silent fail** — businessNumber/pharmacyName 누락 시 try/catch 로 격리되어 회원 승인은 성공, 자동 활성화만 실패. 사용자는 capability 카드에 `unsubmitted` 가 표시되어 수동 신청 가능 → fallback 정상 동작이지만, 운영자에게 자동 부여 실패 사실이 노출되지 않음 | 운영자 알림 또는 dashboard 플래그 보강 권장 (별도 WO) |
| 2 | **다른 직역(pharmacy_employee 등) 매장 운영 정책 불명** — 자동 부여는 `pharmacy_owner` 전용. 다른 직역도 매장 운영 가능한가? 정책 확정 필요 | 정책 확정 후 capability 카드 조건 설계 |
| 3 | **PharmacyGuard 의 API fallback 무의미성** — 약국 개설 단일 직역 정책이면 fallback 제거 가능. 다른 직역도 지원하면 유지 필요 | 위 #2 와 묶어서 결정 |
| 4 | **운영자 측 pharmacy_request 승인 화면 존재 여부 미확인** — 본 IR 범위 외. 있다면 자동 부여 정책 도입 후에도 유효한지 검토 필요 | 별도 IR 또는 dry-run |
| 5 | **자동 부여 + 수동 승인 동시 경로의 멱등성** — Explore 검토상 organization ensure 및 role_assignments upsert 모두 멱등이라 안전. 추가 검증 불필요 | 안전 |
| 6 | **`/pharmacy` 페이지가 already-owner 사용자에게 redirect 하는지** — 본 IR 미확인. role 보유 사용자가 capability 카드 "내 매장으로 이동" 대신 직접 URL `/pharmacy` 입력 시 신청 폼이 다시 나오면 UX 혼란 | 별도 확인 |

---

## 8. 후속 WO 초안

### 8-A. WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1 (UX 정렬 — 권장 1차)

```text
WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1

목적:
자동 store_owner 부여 정책 도입 후, MyProfilePage 의 "매장 운영 권한 신청"
capability 카드가 role 보유 사용자에게 "신청 → 승인" 메타포로 잘못 보이는
UX 모순 해소.

근거: docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md

작업 범위:
- services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx
  · capability 카드 렌더링 조건을 `!hasStoreOwnerRole` 일 때만 표시로 변경
  · 또는 role 보유 시 "내 매장으로 이동" 한 줄 축소 카드로 변경
  · 사용 안 하는 상태값 (unsubmitted/pending/rejected) UI 및 관련 mock label 정리
  · deriveStoreOwnerStatus / pharmacyRequestApi.getMyRequests 호출은 그대로 유지
    (다른 직역·fallback 경로용)

작업 외:
- backend pharmacy-request controller / 테이블 무수정
- /pharmacy 신청 페이지 무수정
- PharmacyGuard 무수정
- 다른 서비스 무수정

검증:
- TypeScript clean
- /mypage/profile 직역 탭 — role 보유 사용자는 capability 카드 미표시
  또는 축소 카드만 표시
- role 미보유 + activity_type=pharmacy_employee 등 사용자는 기존 카드 유지
- /store, /store-hub 접근 정상 (role 기반 통과 유지)
```

### 8-B. WO-O4O-STORE-OWNER-POLICY-ALIGN-V1 (정책 확정 — 권장 2차)

다른 직역(`pharmacy_employee` 등)이 매장 운영 권한을 가질 수 있는지 정책 확정. 결과에 따라:
- 다른 직역 미지원 → PharmacyGuard fallback / pharmacy_request 수동 신청 경로 단순화
- 다른 직역 지원 → 자동 부여 조건 확장 vs 수동 신청 유지 결정

### 8-C. (선택) WO-O4O-KPA-STORE-OWNER-AUTO-ACTIVATION-OPERATOR-NOTICE-V1

자동 부여 실패(businessNumber 누락 등) 시 운영자 알림 또는 dashboard 플래그 보강.

---

## 9. 본 IR 범위 외 (후속 확인)

- 운영자 측 pharmacy_request 승인 화면 존재 여부 + 자동 부여 정책 도입 후 유효성
- `/pharmacy` 페이지의 already-owner redirect 동작
- web-neture 서비스의 매장 운영 관련 흐름 (조사 범위에서 제외했음)
- 데이터 확인: 자동 부여 도입 후 pharmacy_request 테이블에 신규 row 가 얼마나 생기는지 (수동 신청 잔재량)

---

## 10. 참조

- `apps/api-server/src/routes/kpa/controllers/member.controller.ts` L550-614 (자동 부여 진입점)
- `apps/api-server/src/routes/kpa/pharmacy-request.controller.ts` (수동 신청 처리)
- `services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx` L29-47, L458-683 (capability 카드)
- `services/web-kpa-society/src/components/auth/PharmacyGuard.tsx` (role + API fallback)
- `services/web-kpa-society/src/components/auth/HubGuard.tsx` (순수 role)
- `services/web-kpa-society/src/api/pharmacyRequestApi.ts` (Frontend API client)
- `services/web-kpa-society/src/lib/role-constants.ts` (`STORE_OWNER_ROLES`)
- `@o4o/auth-utils` (`isStoreOwnerDual`)
- WO 추적:
  - `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1` (commit `6a6f9426e` — 자동 부여 도입)
  - `WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1` (capability 카드 도입)
  - `WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1` (isStoreOwnerDual helper)
- 연관 IR:
  - `IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1` (회원 승인 흐름)

---

*조사 전용 — 코드/DB 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
