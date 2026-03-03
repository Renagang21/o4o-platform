# IR-NETURE-IDENTITY-ONBOARDING-FLOW-AUDIT-V1

> Neture 공급자/파트너 가입 → 승인 → 로그인 가능 구조 비교 조사
> Audit Date: 2026-02-28 | Status: READ-ONLY INVESTIGATION

---

## 1️⃣ 공급자(Supplier) 온보딩 프로세스

### A. 전체 흐름: 2단계 가입 구조

Neture 공급자 온보딩은 **독립된 2단계**로 구성된다:

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 플랫폼 회원가입 (Identity Layer)                         │
│                                                                 │
│  POST /api/v1/auth/register                                     │
│  Body: { email, password, name, phone, companyName,             │
│          businessNumber?, role: 'supplier', service: 'neture' } │
│      │                                                          │
│      ▼                                                          │
│  users 생성                                                     │
│    status = PENDING (기본값)                                     │
│    serviceKey = 'neture'                                        │
│    businessInfo = { businessNumber, businessName }              │
│  role_assignments 생성                                          │
│    role = 'supplier'                                            │
│                                                                 │
│  ❌ NetureSupplier 생성 안 됨                                    │
│  ❌ 로그인 불가 (status = PENDING)                               │
│  → /register/pending 리다이렉트                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                      관리자가 users.status → ACTIVE 변경
                      (admin dashboard: PATCH /admin/users/:id/status)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: 공급자 등록 (Supplier Layer)                             │
│                                                                 │
│  로그인 성공 후                                                   │
│  POST /api/v1/neture/supplier/register                          │
│  Body: { name, slug, contactEmail }                             │
│  Auth: requireAuth                                              │
│      │                                                          │
│      ▼                                                          │
│  neture_suppliers 생성                                          │
│    status = PENDING                                             │
│    userId = 인증 사용자 ID                                       │
│                                                                 │
│  → 공급자 대시보드 접근 가능 (읽기: requireLinkedSupplier)        │
│  → 상품 등록 불가 (쓰기: requireActiveSupplier 차단)             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                      Neture 관리자가 Supplier.status → ACTIVE
                      (POST /neture/admin/suppliers/:id/approve)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 공급자 활성화                                            │
│                                                                 │
│  neture_suppliers.status = ACTIVE                               │
│  → 상품 등록 가능 (requireActiveSupplier 통과)                   │
│  → 프로필 수정 가능                                              │
│  → 콘텐츠 생성 가능                                              │
└─────────────────────────────────────────────────────────────────┘
```

### B. 핵심 발견: 승인이 2회 필요

| 승인 단계 | 대상 | 승인 주체 | 변경 테이블 | 결과 |
|----------|------|----------|-----------|------|
| 1차 승인 | users.status | 플랫폼 관리자 | users | PENDING → ACTIVE → 로그인 가능 |
| 2차 승인 | supplier.status | Neture 관리자 | neture_suppliers | PENDING → ACTIVE → 상품 등록 가능 |

### C. 로그인 가능 조건

로그인 게이트 ([authentication.service.ts:177](apps/api-server/src/services/authentication.service.ts#L177)):
```
user.status === ACTIVE || user.status === APPROVED
```

| users.status | 로그인 가능 | supplier.status | 대시보드 접근 | 상품 등록 |
|:------------:|:----------:|:---------------:|:------------:|:---------:|
| PENDING | ❌ | — | ❌ | ❌ |
| ACTIVE | ✅ | (미생성) | ❌ (NO_SUPPLIER) | ❌ |
| ACTIVE | ✅ | PENDING | ✅ (읽기만) | ❌ |
| ACTIVE | ✅ | ACTIVE | ✅ | ✅ |
| ACTIVE | ✅ | INACTIVE | ✅ (읽기만) | ❌ |
| ACTIVE | ✅ | REJECTED | ✅ (읽기만) | ❌ |
| SUSPENDED | ❌ | — | ❌ | ❌ |

### D. 프론트엔드 접근 제어

| 가드 | 위치 | 검증 대상 | 효과 |
|------|------|----------|------|
| SupplierDashboardLayout | App.tsx:465 | `user.roles.includes('supplier')` | role_assignments 기반 |
| requireActiveSupplier (API) | neture.routes.ts:176 | `supplier.status === ACTIVE` | 쓰기 차단 |
| requireLinkedSupplier (API) | neture.routes.ts:204 | `supplier.userId === user.id` | 읽기 허용 (모든 상태) |

### E. 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [auth.controller.ts:282-448](apps/api-server/src/modules/auth/controllers/auth.controller.ts#L282-L448) | `register()` — User + RoleAssignment 생성 |
| [authentication.service.ts:177](apps/api-server/src/services/authentication.service.ts#L177) | 로그인 게이트 (status 검증) |
| [user.service.ts:127-139](apps/api-server/src/modules/auth/services/user.service.ts#L127-L139) | `updateUserStatus()` — 관리자 승인 |
| [neture.service.ts:135-193](apps/api-server/src/modules/neture/neture.service.ts#L135-L193) | `registerSupplier()` — Supplier 엔티티 생성 |
| [neture.service.ts:198-232](apps/api-server/src/modules/neture/neture.service.ts#L198-L232) | `approveSupplier()` — Supplier 활성화 |
| [SupplierDashboardLayout.tsx:53-63](services/web-neture/src/pages/supplier/SupplierDashboardLayout.tsx#L53-L63) | 프론트 역할 가드 |

---

## 2️⃣ 파트너(Partner) 온보딩 프로세스

### A. 전체 흐름: 2단계 가입 + 모집 신청 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 플랫폼 회원가입 (Identity Layer)                         │
│                                                                 │
│  POST /api/v1/auth/register                                     │
│  Body: { email, password, name, phone, companyName,             │
│          role: 'partner', service: 'neture' }                   │
│      │                                                          │
│      ▼                                                          │
│  users 생성                                                     │
│    status = PENDING (기본값)                                     │
│  role_assignments 생성                                          │
│    role = 'partner'                                             │
│                                                                 │
│  ❌ Partner 엔티티 없음 (Application도 없음)                     │
│  ❌ 로그인 불가 (status = PENDING)                               │
│  → /register/pending 리다이렉트                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                      관리자가 users.status → ACTIVE
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: 모집 참여 신청 (Partner Application)                     │
│                                                                 │
│  로그인 성공 후                                                   │
│  GET /api/v1/neture/partner/recruitments?status=recruiting      │
│  → 모집 목록 조회                                                │
│                                                                 │
│  POST /api/v1/neture/partner/applications                       │
│  Body: { recruitmentId }                                        │
│  Auth: requireAuth                                              │
│      │                                                          │
│      ▼                                                          │
│  neture_partner_applications 생성                               │
│    status = pending                                             │
│    partnerId = user.id                                          │
│    recruitmentId = 선택한 모집 UUID                               │
│                                                                 │
│  (중복 체크: recruitmentId + partnerId unique)                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                      판매자(Seller)가 승인
                      (POST /partner/applications/:id/approve)
                      ※ 관리자 아닌 모집 주체(Seller)가 승인
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 파트너 활성화 (트랜잭션)                                  │
│                                                                 │
│  BEGIN TRANSACTION                                              │
│    1. ACTIVE_CONTRACT_EXISTS 중복 계약 검증                      │
│    2. Application.status → approved                             │
│    3. NetureSellerPartnerContract 생성                           │
│       (commissionRate 스냅샷)                                    │
│    4. NeturePartnerDashboardItem 생성                            │
│  COMMIT                                                         │
│                                                                 │
│  → 파트너 대시보드에 상품 자동 등록                               │
│  → 계약 기반 운영 시작                                           │
└─────────────────────────────────────────────────────────────────┘
```

### B. 핵심 발견: 승인 주체가 다름

| 승인 단계 | 대상 | 승인 주체 | 변경 테이블 | 결과 |
|----------|------|----------|-----------|------|
| 1차 승인 | users.status | 플랫폼 관리자 | users | PENDING → ACTIVE → 로그인 가능 |
| 2차 승인 | application.status | **Seller** (모집 주체) | applications + contracts + dashboard_items | pending → approved → 파트너 운영 가능 |

### C. 로그인 가능 조건

| users.status | 로그인 가능 | Application | 대시보드 접근 | 계약 존재 |
|:------------:|:----------:|:-----------:|:------------:|:---------:|
| PENDING | ❌ | — | ❌ | ❌ |
| ACTIVE | ✅ | (미신청) | ✅ (빈 대시보드) | ❌ |
| ACTIVE | ✅ | pending | ✅ (빈 대시보드) | ❌ |
| ACTIVE | ✅ | approved | ✅ (상품 표시) | ✅ active |
| ACTIVE | ✅ | rejected | ✅ (빈 대시보드) | ❌ |

### D. 프론트엔드 접근 제어

| 가드 | 위치 | 검증 대상 | 효과 |
|------|------|----------|------|
| SupplierDashboardLayout | App.tsx:465 | `user.roles.includes('partner')` | 공급자와 동일 레이아웃 공유 |
| API 엔드포인트 | neture.routes.ts | `requireAuth` | 인증만 필요 (별도 상태 가드 없음) |
| 데이터 필터 | neture.service.ts | `partnerUserId = req.user.id` | 자신의 데이터만 조회 |

### E. 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [NeturePartnerApplication.entity.ts](apps/api-server/src/modules/neture/entities/NeturePartnerApplication.entity.ts) | Application 엔티티 |
| [NeturePartnerRecruitment.entity.ts](apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts) | Recruitment 엔티티 |
| [NetureSellerPartnerContract.entity.ts](apps/api-server/src/modules/neture/entities/NetureSellerPartnerContract.entity.ts) | Contract 엔티티 |
| [NeturePartnerDashboardItem.entity.ts](apps/api-server/src/modules/neture/entities/NeturePartnerDashboardItem.entity.ts) | DashboardItem 엔티티 |
| neture.service.ts:approvePartnerApplication() | 트랜잭션 승인 로직 |

---

## 3️⃣ 가입 신청 화면 입력 항목 조사

### A. 공급자/파트너 공통 가입 화면

**파일**: [RegisterPage.tsx](services/web-neture/src/pages/RegisterPage.tsx)

공급자와 파트너는 **동일한 가입 폼**을 사용한다. Step 1에서 역할을 선택한다.

| 필드 | 라벨 | 필수 | 검증 | DTO 매핑 |
|------|------|:----:|------|---------|
| `email` | 이메일 | ✅ | 이메일 형식 | RegisterRequestDto.email |
| `password` | 비밀번호 | ✅ | 8자+, 대소문자+숫자+특문 | RegisterRequestDto.password |
| `passwordConfirm` | 비밀번호 확인 | ✅ | 일치 검증 | RegisterRequestDto.passwordConfirm |
| `name` | 담당자명 | ✅ | 비어있지 않음 | → lastName/firstName 분리 |
| `phone` | 연락처 | ✅ | 숫자만, 10-11자리 | RegisterRequestDto.phone |
| `companyName` | 회사명 | ✅ | 비어있지 않음 | RegisterRequestDto.businessName |
| `businessNumber` | 사업자등록번호 | ❌ | 000-00-00000 형식 | RegisterRequestDto.businessNumber |
| `businessType` | 업종 | ❌ | cosmetics/health/medical/food/other | (미전달) |
| `agreeTerms` | 이용약관 동의 | ✅ | 체크 필수 | RegisterRequestDto.tos |
| `agreePrivacy` | 개인정보 동의 | ✅ | 체크 필수 | RegisterRequestDto.privacyAccepted |
| `agreeMarketing` | 마케팅 동의 | ❌ | — | RegisterRequestDto.marketingAccepted |

**역할 선택**: Step 1에서 "공급자" 또는 "파트너" 클릭 → `role: 'supplier' | 'partner'`

**API 호출**: `POST /api/v1/auth/register` (service: 'neture')

**파일 업로드**: ❌ 없음

### B. 파트너십 요청 화면 (별도)

**파일**: [PartnershipRequestCreatePage.tsx](services/web-neture/src/pages/partners/requests/PartnershipRequestCreatePage.tsx)

이것은 회원가입이 아닌 **제휴 요청 폼**이다. 로그인 후 접근 가능.

| 필드 | 라벨 | 필수 | 비고 |
|------|------|:----:|------|
| `sellerName` | 판매자/파트너명 | ✅ | 유일한 필수 필드 |
| `sellerServiceType` | 서비스 유형 | ❌ | glycopharm/k-cosmetics/other |
| `sellerStoreUrl` | 스토어 URL | ❌ | |
| `periodStart/End` | 제휴 기간 | ❌ | |
| `revenueStructure` | 수수료 조건 | ❌ | |
| `promotionSns/Content/Banner` | 프로모션 범위 | ❌ | 체크박스 |
| `productName1/2` | 상품명 | ❌ | 최대 2개 |
| `contactEmail/Phone/Kakao` | 연락처 | ❌ | |

**API 호출**: `POST /api/v1/neture/partnership/requests`

※ 이 요청은 `NeturePartnershipRequest` 엔티티에 저장됨 (NeturePartnerApplication과 별개)

### C. 비교 분석

| 항목 | 공급자 | 파트너 |
|------|:------:|:------:|
| 사업자번호 입력 | ❌ (선택) | ❌ (선택) |
| 계약 조건 입력 | ❌ (가입 시 없음) | ❌ (가입 시 없음, 제휴 요청 시 있음) |
| 소개/프로필 | ❌ (가입 시 없음, 승인 후 설정) | ❌ |
| 검증 필드 | email 형식, password 강도, phone 길이 | 동일 (같은 폼) |
| 파일 업로드 | ❌ | ❌ |
| 승인 판단 자료 | 회사명 + 사업자번호(선택) + 연락처 | 동일 |

---

## 최종 산출물

### 1️⃣ 공급자 온보딩 구조 다이어그램

```
사용자                    플랫폼 관리자              Neture 관리자
  │                          │                          │
  │ POST /auth/register      │                          │
  │ (role: supplier)         │                          │
  ├────────────────►         │                          │
  │                          │                          │
  │  users 생성              │                          │
  │  status = PENDING        │                          │
  │  role = 'supplier'       │                          │
  │                          │                          │
  │ ❌ 로그인 불가            │                          │
  │                          │                          │
  │                    PATCH /admin/users/:id/status     │
  │                    status → ACTIVE                   │
  │                          │                          │
  │ ✅ 로그인 가능            │                          │
  │                          │                          │
  │ POST /neture/supplier/register                      │
  │ (name, slug)             │                          │
  ├──────────────────────────┼────────────►             │
  │                          │                          │
  │  neture_suppliers 생성   │                          │
  │  status = PENDING        │                          │
  │                          │                          │
  │ ✅ 대시보드 접근 (읽기)   │                          │
  │ ❌ 상품 등록 불가         │                          │
  │                          │                          │
  │                          │   POST /admin/suppliers/:id/approve
  │                          │   status → ACTIVE
  │                          │                          │
  │ ✅ 상품 등록 가능         │                          │
  │ ✅ 프로필 수정 가능       │                          │
```

### 2️⃣ 파트너 온보딩 구조 다이어그램

```
사용자                    플랫폼 관리자              판매자(Seller)
  │                          │                          │
  │ POST /auth/register      │                          │
  │ (role: partner)          │                          │
  ├────────────────►         │                          │
  │                          │                          │
  │  users 생성              │                          │
  │  status = PENDING        │                          │
  │  role = 'partner'        │                          │
  │                          │                          │
  │ ❌ 로그인 불가            │                          │
  │                          │                          │
  │                    PATCH /admin/users/:id/status     │
  │                    status → ACTIVE                   │
  │                          │                          │
  │ ✅ 로그인 가능            │                          │
  │                          │                          │
  │ GET /partner/recruitments │                          │
  │ (모집 목록 조회)          │                          │
  │                          │                          │
  │ POST /partner/applications│                          │
  │ (recruitmentId)          │                          │
  ├──────────────────────────┼────────────►             │
  │                          │                          │
  │  application 생성        │                          │
  │  status = pending        │                          │
  │                          │                          │
  │ ✅ 대시보드 접근 (빈)     │                          │
  │                          │                          │
  │                          │   POST /partner/applications/:id/approve
  │                          │   (Seller가 승인)
  │                          │                          │
  │  트랜잭션:               │                          │
  │  Application → approved  │                          │
  │  Contract 생성           │                          │
  │  Dashboard Item 생성     │                          │
  │                          │                          │
  │ ✅ 대시보드에 상품 표시   │                          │
  │ ✅ 계약 조회/해지 가능    │                          │
```

### 3️⃣ 로그인/권한 매트릭스

| 단계 | users.status | Supplier/Partner 상태 | 로그인 | 대시보드 | 핵심 기능 |
|------|:----------:|:-------------------:|:------:|:--------:|:---------:|
| 가입 직후 | PENDING | — | ❌ | ❌ | ❌ |
| 사용자 승인 후 | ACTIVE | Supplier 미생성 | ✅ | ❌ (NO_SUPPLIER) | ❌ |
| Supplier 등록 후 | ACTIVE | Supplier PENDING | ✅ | ✅ (읽기) | ❌ |
| Supplier 승인 후 | ACTIVE | Supplier ACTIVE | ✅ | ✅ | ✅ 상품 등록 |
| Partner 모집 미신청 | ACTIVE | Application 없음 | ✅ | ✅ (빈) | ❌ |
| Partner 모집 신청 후 | ACTIVE | Application pending | ✅ | ✅ (빈) | ❌ |
| Partner 승인 후 | ACTIVE | Application approved | ✅ | ✅ (상품) | ✅ 콘텐츠 연결 |

### 4️⃣ 구조 비교 표

| 항목 | Supplier | Partner |
|------|:--------:|:-------:|
| **Application 분리** | ❌ (Supplier 자체가 신청서) | ✅ (NeturePartnerApplication 별도) |
| **승인 트랜잭션** | ❌ (단순 save) | ✅ (4단계 트랜잭션) |
| **Contract 생성** | ❌ 없음 | ✅ (NetureSellerPartnerContract) |
| **Dashboard 생성** | ❌ 없음 | ✅ (NeturePartnerDashboardItem) |
| **RBAC 연동** | ❌ (requireNetureScope 별도 체계) | ❌ (requireAuth만) |
| **승인 전 로그인 가능** | ✅ (users.status=ACTIVE 이후) | ✅ (users.status=ACTIVE 이후) |
| **승인 주체** | Neture 관리자 (neture:admin) | Seller (모집 주체) |
| **승인 대상** | NetureSupplier | NeturePartnerApplication |
| **가입 폼** | 공통 RegisterPage | 공통 RegisterPage |
| **중복 방지** | userId + slug | recruitmentId + partnerId |
| **비활성화 캐스케이드** | ✅ (approvals revoked, listings off) | — (계약 해지만) |

### 5️⃣ 입력 항목 적정성 평가

#### 승인 판단에 충분한가?

| 항목 | 현재 수집 | 승인 판단 활용 | 평가 |
|------|:--------:|:------------:|:----:|
| 이메일 | ✅ | 연락처 확인 | 적절 |
| 비밀번호 | ✅ | — | 적절 |
| 담당자명 | ✅ | 신원 확인 | 적절 |
| 연락처 | ✅ | 확인 연락 | 적절 |
| 회사명 | ✅ | 사업체 확인 | 적절 |
| 사업자등록번호 | ❌ (선택) | 사업자 검증 | **미수집** (선택이라 누락 가능) |
| 사업자등록증 사본 | ❌ | 서류 검증 | **미수집** |
| 대표자명 | ❌ | 법인 확인 | **미수집** |
| 주소 | ❌ | 소재지 확인 | **미수집** |
| 업종 | ❌ (선택) | 카테고리 분류 | **미수집** (선택이라 누락 가능) |
| 공급 가능 상품 정보 | ❌ | 적합성 판단 | **미수집** |

#### 불필요한 필드 존재하는가?

| 필드 | 필요성 | 비고 |
|------|:------:|------|
| nickname (DTO) | ❓ | 프론트에서 전송하지 않으나 DTO에 필수 정의 |
| lastName/firstName (DTO) | ❓ | 프론트는 `name` 하나로 전송, DTO는 성/이름 분리 |

#### Supplier vs Partner 가입 폼의 차이점

**차이 없음**. 공급자와 파트너가 완전히 동일한 입력 항목으로 가입한다.
역할 선택만 다르고, 수집 정보는 100% 동일하다.

---

## 부록: 구조상 모호 지점

| # | 지점 | 설명 | 위치 |
|---|------|------|------|
| I1 | **2회 승인의 비가시성** | 사용자 입장에서 "플랫폼 승인"과 "공급자 승인"이 2회 필요한 것이 UX에 노출되지 않음. /register/pending은 1회 승인만 안내 | RegisterPendingPage.tsx |
| I2 | **Supplier 엔티티 생성 시점 불명확** | users.status=ACTIVE 후 Supplier 등록 전 구간에서 SupplierDashboardLayout 접근 시 역할 가드 통과하나 API 401 발생 가능 | SupplierDashboardLayout.tsx:54 |
| I3 | **Partner는 별도 등록 없이 신청 가능** | Partner는 Supplier와 달리 별도 엔티티 등록 없이 바로 모집에 신청 가능. 구조적 비대칭 | neture.routes.ts (partner/applications) |
| I4 | **사업자번호 선택 입력** | B2B 플랫폼에서 사업자 검증이 선택 사항. 승인 판단 자료 부족 가능 | RegisterPage.tsx |
| I5 | **DTO와 프론트 필드 불일치** | RegisterRequestDto에 lastName/firstName 필수이나 프론트는 name 1개만 전송. DTO에 nickname 필수이나 프론트 미전송 | register.dto.ts vs RegisterPage.tsx |
| I6 | **비활성화 후 복원 경로 부재** | Supplier INACTIVE/REJECTED 후 재활성화 API 없음. Partner 거절 후 재신청은 중복 체크(recruitmentId+partnerId)로 차단 | neture.service.ts |
| I7 | **파트너 승인이 관리자가 아닌 Seller** | 플랫폼 관리자가 아닌 Seller(모집 주체)가 파트너를 승인. 플랫폼 차원의 파트너 자격 검증 부재 | neture.service.ts:approvePartnerApplication |

---

*Audit completed: 2026-02-28*
*Scope: Neture supplier + partner identity onboarding full flow*
*Changes: NONE (audit only)*
