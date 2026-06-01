# IR-O4O-NETURE-ROLE-ONBOARDING-FLOW-AUDIT-V1

**조사 일자**: 2026-05-12  
**조사 범위**: Neture 역할 기반 회원가입 및 Onboarding 흐름 전체  
**목적**: 역할별 onboarding 흐름이 실제로 어디까지 구현되어 있는지 코드 기준으로 정확히 파악  
**조사 방법**: 정적 코드 분석 (RegisterModal, AuthRegisterController, OperatorRegistrationService, 역할별 페이지)  
**구현 작업**: 포함하지 않음 (조사·판단만)

---

## 1. 회원가입 Modal 구조

**파일**: `services/web-neture/src/components/RegisterModal.tsx`

### Step 구조 (3단계)

| Step | 역할 | 구현 상태 |
|------|------|---------|
| Step 1 | 역할 선택 (user / supplier / partner / seller) | ✅ 완전 구현 |
| Step 2 | 회원 정보 입력 (공통 + 비-user 사업자 정보) | ✅ 완전 구현 |
| Step 3 | 가입 완료 확인 (3초 자동 종료) | ✅ 완전 구현 |

### 역할 선택 UI (Step 1)

```tsx
// RegisterModal.tsx:24-49
const roleOptions = [
  { role: 'user',     label: '일반 사용자', description: '서비스를 이용하는 일반 사용자',   emoji: '👤' },
  { role: 'supplier', label: '공급자',     description: '제품을 공급하는 공급사/제조사',   emoji: '🏭' },
  { role: 'partner',  label: '파트너',     description: '제품을 홍보하는 파트너',          emoji: '🤝' },
  { role: 'seller',   label: '셀러',       description: '매장을 운영하는 판매자',          emoji: '🏪' },
];
```

**Step 1 → Step 2**: 역할 버튼 클릭 즉시 `setStep(2)` 전환. 역할별 추가 Step 없음.

### Step 2 필드 구조

**공통 필드**: 이메일, 비밀번호(강도 검증), 비밀번호 확인, 성, 이름/담당자명, 핸드폰번호  
**비-user 추가 필드** (`selectedRole !== 'user'`):
- 회사명 (필수)
- 사업자등록번호 (선택)
- 업종 (선택: 화장품/건강식품/의료기기/식품/기타)

**동의 항목**: 이용약관(필수), 개인정보처리방침(필수), 마케팅 수신(선택)

### Step 3 메시지 분기

```tsx
// RegisterModal.tsx:599-604
selectedRole === 'user'
  ? '로그인하여 서비스를 이용하실 수 있습니다.'
  : '운영자 승인 후 서비스를 이용하실 수 있습니다. 승인 완료 시 이메일로 안내드리겠습니다.'
```

### 상태 관리

- `useState` 직접 사용 (별도 상태 관리 라이브러리 없음)
- `existingAccountMode`: 타 서비스에 기가입된 계정 감지 → 비밀번호 재입력 UX
- `autoCloseCount`: Step 3에서 3초 카운트다운 후 자동 종료

---

## 2. 역할별 Onboarding 흐름 상세

### 2-1. 공통 구조: 역할별 별도 onboarding 없음

회원가입 이후 역할별 별도 Step/Form/Onboarding 페이지가 존재하지 않는다.  
모든 역할은 동일한 3-Step 회원가입 → pending → 운영자 승인 구조를 공유한다.

### 2-2. 역할별 구현 상태 비교

| 역할 | 가입 Form | pending 상태 | 승인 후 이동 | 전용 대시보드 | Backend 연결 | 판정 |
|------|---------|-----------|-----------|------------|------------|------|
| **user** | ✅ 완성 | ❌ (즉시 active) | 홈 (`/`) | ❌ (일반 사용자) | ✅ | ✅ usable |
| **supplier** | ✅ 완성 | ✅ pending | SupplierOrdersPage | ✅ `pages/supplier/` | ✅ | ✅ usable (2-step 주의) |
| **partner** | ✅ 완성 | ✅ pending | PartnerHubDashboardPage | ✅ `pages/partner/` | ✅ | ✅ usable |
| **seller** | ✅ 완성 | ✅ pending | ❓ 명확한 대시보드 없음 | ⚠️ 마케팅/정보 페이지만 | ⚠️ 부분 | ⚠️ 부분 구현 |

---

## 3. 공급자 (Supplier) Onboarding 상세

### Frontend 흐름

```
회원가입 (role: 'supplier')
  → POST /auth/register { role: 'supplier', service: 'neture', companyName, ... }
  → Step 3: "운영자 승인 후 서비스를 이용하실 수 있습니다"
  → RegisterPendingPage (또는 모달 종료 후 홈)
```

### Backend 처리 (auth-register.controller.ts)

1. `ServiceMembership` 생성: `{ serviceKey: 'neture', status: 'pending', role: 'supplier' }`
2. `users.businessInfo` JSONB에 회사명/사업자번호/업종 저장
3. `role_assignments` 생성 **없음** — 승인 시에만 생성

### 운영자 승인 흐름 (operator-registration.service.ts)

```
POST /api/v1/neture/operator/registrations/:userId/approve
  1. service_memberships.status: 'pending' → 'active'
  2. users.status: ACTIVE, approvedAt 기록
  3. role_assignments INSERT (role: 'supplier')
  4. neture_suppliers 레코드 자동 생성 (status: 'PENDING')  ← 2-step 포인트
  5. organizations 테이블에 공급자 조직 생성 (businessName 있는 경우)
```

### 중요: 공급자 승인 2단계 구조

```
1단계: 가입 승인 (membership pending → active + role_assignment 생성)
         → neture_suppliers.status = 'PENDING'  ← 아직 공급 불가
2단계: 공급 승인 (별도 운영자 액션으로 neture_suppliers.status → 'ACTIVE')
         → 실제 상품 공급/채널 운영 가능
```

**ISSUE**: 2단계 공급 승인 UI가 Frontend에서 어디 있는지 명확하지 않음.  
`AdminSupplierApprovalPage.tsx`가 존재하나 운영자 대시보드 연결 상태 별도 확인 필요.

### Supplier 접근 후 이용 가능 공간

`pages/supplier/` 디렉토리:
- `SupplierOrdersPage.tsx` — 공급자 운영 허브 (서비스별 주문 현황)
- `SupplierProductLibraryPage.tsx` — 상품 라이브러리
- `SupplierPartnerCommissionsPage.tsx` — 파트너 커미션 현황
- `SupplierB2BContentPage.tsx` — B2B 콘텐츠
- `SupplierCsvImportPage.tsx` — CSV 상품 등록
- `StoreSignagePage.tsx` — 사이니지
- `MyForumDashboardPage.tsx` — 포럼 대시보드
- `RequestCategoryPage.tsx` — 카테고리 신청

**결론**: 공급자 공간은 **실제 운영 가능** 수준으로 구현되어 있음.

---

## 4. 파트너 (Partner) Onboarding 상세

### Frontend 흐름

```
회원가입 (role: 'partner')
  → POST /auth/register { role: 'partner', companyName, ... }
  → pending → 운영자 승인
  → PartnerHubDashboardPage (/partner-hub)
```

### Backend 처리

가입 시 supplier와 동일: `ServiceMembership(pending, role='partner')` 생성.  
승인 시: `role_assignments(role='partner')` 생성.  
`neture_suppliers`는 **생성되지 않음** — supplier role만 해당.

### Partner 이용 가능 공간

`pages/partner/` 디렉토리:
- `PartnerHubDashboardPage.tsx` — 파트너 HUB 대시보드 (KPI: 커미션, 정산)
- `PartnerAccountDashboardPage.tsx` — 계정 대시보드
- `PartnerContentsPage.tsx` — 콘텐츠
- `PartnerStoresPage.tsx` — 파트너 매장
- `ReferralLinksPage.tsx` — 레퍼럴 링크
- `SettlementsPage.tsx` — 정산
- `PartnerSettlementBatchPage.tsx` — 정산 배치
- `ProductPoolPage.tsx` — 상품 풀

`pages/partners/requests/` (신규):
- `PartnershipRequestCreatePage.tsx`
- `PartnershipRequestListPage.tsx`
- `PartnershipRequestDetailPage.tsx`

**결론**: 파트너 공간은 **운영 가능** 수준. 커미션/정산 API 연결 완성.  
단, 가입 후 파트너 공간으로의 명시적 라우팅 안내(onboarding guide)는 없음.

---

## 5. 셀러 (Seller) Onboarding 상세

### Frontend 흐름

```
회원가입 (role: 'seller')
  → POST /auth/register { role: 'seller', companyName, ... }
  → pending → 운영자 승인
  → ??? (명확한 셀러 전용 대시보드 없음)
```

### Backend 처리

- 가입: `ServiceMembership(pending, role='seller')` 생성
- 승인: `role_assignments(role='seller')` 생성
- **`neture_suppliers` 미생성** (supplier role만 해당)
- **seller 전용 백엔드 API 없음** — 별도 seller 모듈 미존재

### Seller 페이지 현황

`pages/seller/` 디렉토리:
- `MedicalOverviewPage.tsx` — 의료기관 설명 페이지 (마케팅/정보)
- `SellerOverviewByIndustry.tsx` — 업종별 설명 (마케팅/정보)
- `MyHandledProductsPage.tsx` — 취급 상품 (구현 상태 미확인)
- `SignageContentHubPage.tsx` — 사이니지 콘텐츠

**핵심 문제**:
- MedicalOverviewPage, SellerOverviewByIndustry는 로그인 불필요한 **마케팅 페이지**
- 셀러 승인 후 이동할 **운영 대시보드가 없음**
- RoleGuard에서 `SUPPLIER_ROLES = ['neture:supplier', 'supplier', 'partner', 'seller']` — seller가 supplier 공간에 접근 가능하나, 의도된 구조인지 불명확

### Seller ↔ Supplier ↔ Partner 역할 경계 문제

```typescript
// RoleGuard.tsx:31
export const SUPPLIER_ROLES = [NETURE_ROLES.SUPPLIER, 'supplier', 'partner', 'seller'];
```

세 역할이 동일한 `SupplierRoute` guard를 공유한다.  
즉, 승인된 seller는 supplier 공간에 접근 가능하다.  
역할 개념과 실제 접근 가능 공간이 불일치한다.

---

## 6. API 연결 구조

### Frontend에서 실제 호출하는 API

| API | 파일 | 역할 |
|-----|------|------|
| `POST /auth/check-email` | RegisterModal.tsx:164 | 이메일 중복/멀티서비스 확인 |
| `POST /auth/register` | RegisterModal.tsx:192 | 회원가입 (role 포함) |

**가입 Request Body**:
```typescript
{
  email, password, passwordConfirm?,
  name: `${lastName}${firstName}`,
  phone,           // 숫자만
  role,            // 'user' | 'supplier' | 'partner' | 'seller'
  service: 'neture',
  companyName?,    // 비-user
  businessNumber?, // 비-user
  businessType?,   // 비-user
  agreeTerms, agreePrivacy, agreeMarketing,
}
```

### Backend API 현황

| API | 구현 상태 | 역할 |
|-----|---------|------|
| `POST /auth/register` | ✅ 완전 구현 | 회원 + ServiceMembership 생성 |
| `POST /auth/check-email` | ✅ 완전 구현 | 멀티서비스 가입 UX |
| `GET /neture/operator/registrations` | ✅ 완전 구현 | 가입 신청 목록 (운영자) |
| `POST /neture/operator/registrations/:userId/approve` | ✅ 완전 구현 | 가입 승인 |
| `POST /neture/operator/registrations/:userId/reject` | ✅ 완전 구현 | 가입 거부 |
| `PATCH /neture/operator/registrations/:userId/notes` | ✅ 완전 구현 | 운영자 메모 |
| `GET /neture/operator/registrations/copilot` | ✅ 구현됨 | AI 우선순위 분류 |
| Seller 전용 API | ❌ 없음 | — |

---

## 7. Role Assignment 흐름

```
[가입 시]
  users 테이블: status='PENDING'
  service_memberships: status='pending', role='supplier'/'partner'/'seller'/'user'
  role_assignments: 생성 없음

[user 역할의 경우]
  별도 승인 불필요 — 가입 즉시 사용 가능 (코드 내 자동 처리 여부는 별도 확인 필요)

[운영자 승인 시]
  service_memberships.status → 'active'
  users.status → 'active'
  role_assignments INSERT (role: effectiveRole)
    - admin/operator: 'neture:admin' / 'neture:operator' (prefixed)
    - supplier/partner/seller: unprefixed ('supplier', 'partner', 'seller')

[공급자만 추가]
  neture_suppliers INSERT (status: 'PENDING')
  organizations INSERT (businessName 있는 경우)
  → 별도 공급 승인 필요 (neture_suppliers.status → 'ACTIVE')
```

**ISSUE**: `user` 역할의 경우 승인 없이 즉시 사용 가능하다고 Step 3에서 안내하지만,  
백엔드에서 user role도 `status='pending'`으로 생성된다.  
자동 승인 로직(service='neture', role='user' → immediate active) 별도 확인 필요.

---

## 8. Organization 생성 구조

**공급자 승인 시에만** organization이 생성된다.

```sql
-- operator-registration.service.ts:145-157
INSERT INTO organizations (name, code, type, is_active, created_at, updated_at)
VALUES ($bizName, 'neture-supplier-{uuid8}', 'supplier', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET is_active = true

UPDATE neture_suppliers SET organization_id = $orgId WHERE id = $supplierId
```

- **partner**: organization 생성 없음
- **seller**: organization 생성 없음
- **user**: organization 생성 없음

---

## 9. UX / 구조 문제 분석

| 항목 | 문제 | 심각도 |
|------|------|--------|
| seller 역할 정체성 | "매장을 운영하는 판매자"라고 설명하지만 승인 후 이동할 전용 공간 없음 | 높음 |
| seller/supplier/partner 가드 통합 | `SUPPLIER_ROLES`에 3가지 역할이 묶여 있어 역할 경계 불명확 | 중 |
| user 역할 자동 승인 여부 불명확 | Step 3에서 "로그인하면 사용 가능"이라고 안내하나, pending → active 자동 전환 로직 미확인 | 중 |
| 공급자 2단계 승인 미안내 | 가입 → 운영자 승인 → neture_suppliers(PENDING) → 공급 승인(ACTIVE) 구조를 사용자에게 설명하지 않음 | 중 |
| 역할별 onboarding 없음 | 승인 후 어디로 가야 하는지 안내 없음 | 낮음 |
| partner/seller 차이 불명확 | "제품을 홍보하는 파트너" vs "매장을 운영하는 판매자" — 실제 기능 차이가 현재 구현에 반영되지 않음 | 낮음 |

---

## 10. 역할별 usable 판정

| 역할 | 판정 | 근거 |
|------|------|------|
| **user** | ✅ usable | 일반 회원 가입 → 홈/포럼 접근 가능 (단, 자동 승인 여부 확인 필요) |
| **supplier** | ✅ usable | 가입 → 승인 → supplier 공간 운영 가능. 단, 2단계(공급 승인) 명시적 안내 필요 |
| **partner** | ✅ usable | 가입 → 승인 → 파트너 HUB, 커미션, 정산 운영 가능 |
| **seller** | ⚠️ 부분 구현 | 가입/승인은 되지만 전용 운영 공간 미완성. 마케팅 페이지만 존재 |

---

## 11. 최종 상태 판정

```
판정: B — 일부만 구현된 상태
```

**근거**:
- 회원가입 UI + Backend API: 완전 구현 (A)
- supplier + partner: 운영 가능 공간 완성 (A)
- seller: UI는 있으나 운영 공간 미완성 (C)
- 역할별 onboarding 안내: 없음 (D)

전체 흐름은 **B** (공급자/파트너는 usable, 셀러는 UI only).

---

## 12. ISSUE 목록

| ID | 항목 | 심각도 | 현황 |
|----|------|--------|------|
| ONB-01 | seller 전용 운영 대시보드 없음 | 높음 | pages/seller/ = 마케팅 페이지만 |
| ONB-02 | user 역할 자동 승인 여부 미확인 | 중 | pending으로 생성 후 자동 active 여부 미확인 |
| ONB-03 | 공급자 2단계 승인 구조 미안내 | 중 | neture_suppliers(PENDING) 상태로 가입 승인만 받으면 사용 불가 가능 |
| ONB-04 | SUPPLIER_ROLES에 seller/partner 혼재 | 중 | 역할 경계 불명확. seller가 supplier 공간 접근 가능 |
| ONB-05 | 역할별 승인 후 첫 진입 경로 미정의 | 낮음 | 승인 이메일 수신 후 어디로 가야 하는지 안내 없음 |
| ONB-06 | partner/seller 기능 차이 미반영 | 낮음 | UI에서는 다른 역할로 표시하나 실제 차이가 구현에 없음 |

---

## 13. 다음 WO 추천

| 우선순위 | WO 제안 | 작업 내용 |
|---------|---------|---------|
| 즉시 | `WO-O4O-NETURE-USER-ROLE-AUTO-APPROVE-VERIFY-V1` | `user` 역할 가입 후 자동 active 전환 로직 확인 및 수정 |
| 단기 | `WO-O4O-NETURE-SELLER-DASHBOARD-V1` | seller 전용 운영 대시보드 설계 및 구현 |
| 단기 | `WO-O4O-NETURE-SUPPLIER-TWO-STEP-APPROVAL-UX-V1` | 공급 승인 2단계 흐름 운영자 UI + 사용자 안내 명확화 |
| 중기 | `WO-O4O-NETURE-ROLE-ONBOARDING-GUIDE-V1` | 역할별 승인 후 첫 진입 안내 페이지 또는 welcome flow |
| 중기 | `WO-O4O-NETURE-SELLER-PARTNER-BOUNDARY-V1` | seller/partner 역할 개념 정리 + `SUPPLIER_ROLES` 재정의 |

---

## 참고 — 조사한 파일 목록

| 파일 | 내용 |
|------|------|
| `services/web-neture/src/components/RegisterModal.tsx` | 3-Step 회원가입 모달 |
| `services/web-neture/src/components/auth/RoleGuard.tsx` | 역할 상수 + RouteGuard/RoleGuard/SupplierRoute |
| `services/web-neture/src/pages/RegisterPendingPage.tsx` | 승인 대기 안내 페이지 |
| `services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx` | 공급자 운영 허브 |
| `services/web-neture/src/pages/partner/PartnerHubDashboardPage.tsx` | 파트너 HUB 대시보드 |
| `services/web-neture/src/pages/seller/MedicalOverviewPage.tsx` | 셀러 마케팅 페이지 |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` | 회원가입 + email check 컨트롤러 |
| `apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts` | 가입 승인/거부 API |
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts` | 승인 서비스 (role_assignment + neture_suppliers 생성) |

---

*Status: INVESTIGATION COMPLETE — 구현 작업 미포함*  
*후속 작업 전제: ONB-02 (user 자동 승인) 검증 선행 권장*
