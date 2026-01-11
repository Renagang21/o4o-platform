# Neture Step 1 조사 보고서 v0.1

**Work Order**: WO-NETURE-STEP1-INVESTIGATION
**Phase**: Step 1 (현황 판정)
**Date**: 2026-01-11
**Investigator**: Claude Code
**Purpose**: 코드 기준 사실 확인 (판단/수정 없음)

---

## A. 서비스 범위 확인 (Service Boundary)

### A-1. 서비스 진입점

#### 운영 URL (Production)
```
https://neture.co.kr           # 메인 웹사이트
https://www.neture.co.kr       # 메인 (www)
https://admin.neture.co.kr     # 관리자 대시보드
https://shop.neture.co.kr      # 쇼핑몰 (예정)
https://forum.neture.co.kr     # 포럼 (예정)
```

#### API 엔드포인트
```
https://api.neture.co.kr/api/v1/neture/*
```

#### 실제 라우트 (현재 활성)

**Frontend (web-neture):**
```tsx
// App.tsx - P1 라우트 (활성)
/ → HomePage
/suppliers → SupplierListPage
/suppliers/:slug → SupplierDetailPage
/partners/requests → PartnershipRequestListPage
/partners/requests/:id → PartnershipRequestDetailPage
/content → 준비 중 플레이스홀더
```

**Backend (api-server):**
```ts
// P1 API 엔드포인트 (활성)
GET /api/v1/neture/suppliers
GET /api/v1/neture/suppliers/:slug
GET /api/v1/neture/partnership/requests
GET /api/v1/neture/partnership/requests/:id

// P0/Legacy 엔드포인트 (코드 존재, 라우트 미등록)
POST /api/v1/neture/payments/*  (payment.controller.ts)
```

### A-2. 서비스 독립성

**현재 상태:**
- ✅ Neture 단독으로 의미 있는 사용자 플로우 존재 (공급자 정보 조회, 제휴 요청 조회)
- ✅ 다른 서비스 없이도 기본 흐름 성립 (Read-only 정보 플랫폼)
- ⚠️ 확장 기능(주문/결제/포럼)은 타 서비스 의존성 필요 (현재 비활성)

**의존성 성격:**
- 다른 서비스: **선택 연계** (필수 아님)
- Core (Auth/User): **필수 의존** (확장 시 필요, P1에서는 미사용)

---

## B. 기능 활성화 상태 조사 (Live / Dead)

### B-1. 사용자 기능 (Frontend)

#### ✅ 실제 접근 가능 (P1 - Live)
```
HomePage                          # 메인 페이지 (o4o 소개 + Neture 역할)
SupplierListPage                  # 공급자 목록
SupplierDetailPage                # 공급자 상세
PartnershipRequestListPage        # 제휴 요청 목록
PartnershipRequestDetailPage      # 제휴 요청 상세
```

#### ❌ 코드 존재, UI 접근 없음 (P0 Legacy - Dead)
```
LoginPage                         # 로그인
AdminDashboardPage                # 관리자 대시보드
SupplierDashboardPage             # 공급자 대시보드
PartnerDashboardPage              # 파트너 대시보드
SupplierOverviewPage              # 공급자 개요
PartnerOverviewPage               # 파트너 개요
ProcurementHomePage               # B2B 조달 홈
CategoryListPage                  # 카테고리 목록
ProductDetailPage                 # 상품 상세
TrialListPage                     # 체험단 목록
TrialDetailPage                   # 체험단 상세
FulfillmentStatusPage             # 주문 배송 상태
ShippingAddressPage               # 배송지 관리
SupplierProductSettingsPage       # 공급자 상품 설정
SupplierContentDetailPage         # 공급자 콘텐츠 상세
ContactSettingsPage               # 연락처 설정
ForumPage                         # 포럼 메인
ForumPostPage                     # 포럼 글 상세
ForumWritePage                    # 포럼 글 작성
```

**판정:**
- P1 활성 페이지: 5개
- Legacy 코드 페이지: 19개
- 비율: 활성 21% / Dead 79%

### B-2. 관리자 기능

#### ❌ 관리자 전용 화면 (코드만 존재)
```
AdminDashboardPage     # /dashboard/admin (라우트 없음)
```

#### ❌ 관리자 API (코드만 존재, 라우트 미등록)
```
payment.controller.ts  # POST /payments/* (createNetureRoutes에서 제외됨)
```

---

## C. 데이터 책임 조사 (Data Ownership)

### C-1. Neture가 생성하는 데이터

#### P1 Active Tables (modules/neture/entities)
```sql
neture_suppliers                # 공급자 정보
neture_supplier_products        # 공급자 상품
neture_partnership_requests     # 제휴 요청
neture_partnership_products     # 제휴 상품
```

**소유권:** Neture 완전 소유 (FK 없음, Soft reference only)

#### P0 Legacy Tables (routes/neture/entities - schema: neture)
```sql
neture_orders                   # 주문
neture_order_items              # 주문 아이템
neture_partners                 # 파트너
neture_products                 # 상품
neture_product_logs             # 상품 로그
```

**상태:** Entity 코드 존재, Migration 미실행, 실제 테이블 없음 (Dead)

### C-2. Neture가 참조만 하는 데이터

#### P1 구현
```ts
// NeturePartnershipRequest.entity.ts
@Column({ name: 'seller_id' })  // VARCHAR - Soft reference
sellerId: string;

@Column({ name: 'seller_service_type' })
sellerServiceType: string;
```

**참조 방식:** Soft FK (문자열 저장, FK 제약 없음)
**쓰기 권한:** 없음 (읽기 전용)

### C-3. 타 서비스 데이터에 대한 쓰기 여부

**조사 결과:** ❌ 없음

- P1 API는 GET only
- POST/PUT/DELETE 엔드포인트 전부 비활성
- Core DB 접근 코드 없음

---

## D. 역할·권한 실사용 조사 (RBAC Reality)

### D-1. 기획상 역할 vs 실제 통제

#### 기획서 정의 Role (AuthContext.tsx)
```ts
type UserRole = 'admin' | 'supplier' | 'partner' | 'user';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  supplier: '공급자',
  partner: '파트너',
  user: '일반 사용자',
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  supplier: '/dashboard/supplier',
  partner: '/dashboard/partner',
  user: '/',
};
```

#### 실제 API Guard
```ts
// P1 구현
❌ 없음 (No authentication required)
```

**불일치 사항:**
- 역할 정의: 있음
- API Guard: 없음
- UI 분기: 있음 (LoginPage, Dashboard)
- 라우트 보호: 없음

**판정:** "역할은 있는데 통제 없음"

### D-2. 관리자 개입 권한

**조사 결과:**
- 관리자 개입 지점: 정의 없음 (P1 Read-only)
- 상태 변경 API: 없음
- Admin UI: 코드만 존재, 접근 불가

---

## E. 주문·상태 흐름 조사 (State Flow)

### E-1. 주문 상태 전이 (Legacy - Dead)

```ts
// neture-order.entity.ts
export enum NetureOrderStatus {
  CREATED = 'created',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
```

**상태:** Entity 코드 존재, API 없음, Migration 미실행

### E-2. Partnership 상태 전이 (P1 - Active)

```ts
// NeturePartnershipRequest.entity.ts
export enum PartnershipStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  CLOSED = 'CLOSED',
}
```

**전이 로직:** ❌ 없음 (현재는 조회만 가능)
**관리자 개입:** 정의 없음

---

## F. 관리자 운영 관점 조사 (Ops Touchpoint)

### F-1. 운영자가 반드시 알아야 하는 정보

**현재 제공:**
- ❌ 없음 (P1은 관리자 기능 없음)

**Legacy 코드 존재:**
- AdminDashboardPage (라우트 없음)

### F-2. 운영자가 굳이 알 필요 없는 정보

**현재 노출:**
- N/A (관리자 화면 자체가 비활성)

---

## G. 연계 구조 조사 (Connection Readiness)

### G-1. 다른 서비스와의 연결 지점

#### 현재 연결 (P1)
```
배너/링크: ❌ 없음 (단독 운영)
사용자 공유: ⚠️ 준비됨 (seller_id soft reference)
데이터 공유: ❌ 없음 (Read-only, 외부 연계 없음)
```

#### 예상 연결 지점 (Legacy 코드 기반)
```
Forum: ForumPage, ForumPostPage, ForumWritePage
Procurement: ProcurementHomePage, CategoryListPage
Order: FulfillmentStatusPage, ShippingAddressPage
```

### G-2. Neture 제거 시 영향

**판정:**
- ✅ 다른 서비스 기능 중단 없음 (단독 서비스)
- ✅ 연결 지점만 사라짐 (현재 연결 없음)

**결론:** Neture는 **허브**가 아니라 **독립 서비스** 상태

---

## H. Step 1 조사 결과 요약 (서술형)

### 핵심 판정 (3문장)

1. **Neture는 현재 <u>읽기 전용 정보 플랫폼 (Read-Only Information Hub)</u> 역할을 수행하고 있다.**

2. **Neture가 반드시 책임지는 것은 <u>공급자 정보와 제휴 요청 정보의 표시 및 외부 연락 링크 제공</u>이다.**

3. **Neture가 관여하지 않아야 할 영역은 <u>주문/결제/상태 변경/사용자 관리/권한 통제</u>이다.**

---

## I. 특이 사항 (Critical Findings)

### I-1. 코드 이중 구조 발견

**현상:**
```
apps/api-server/src/
├── modules/neture/           # P1 - 활성 (GET only)
│   ├── entities/             # 4개 테이블
│   ├── neture.service.ts
│   └── neture.routes.ts
│
└── routes/neture/            # P0 Legacy - 비활성
    ├── entities/             # 5개 테이블 (schema: neture)
    ├── controllers/
    │   ├── neture.controller.ts (P1로 대체됨)
    │   └── payment.controller.ts (미사용)
    └── services/
```

**문제:**
- 동일 경로에 2개 구현체 공존
- Legacy 코드 79% (19/24 페이지)
- Entity 중복 정의 (modules vs routes)

### I-2. HARD RULES 준수 상태

**P1 구현 (modules/neture):**
```ts
✅ GET endpoints ONLY
✅ NO authentication required
✅ NO payment/order endpoints
✅ Read-only information platform
```

**Legacy 코드 (routes/neture):**
```ts
❌ POST /payments/* 존재 (비활성)
❌ Order Entity 존재 (미배포)
❌ Payment Controller 존재 (라우트 미등록)
```

**판정:** P1 구현은 HARD RULES 100% 준수, Legacy는 위반 (단, 비활성 상태)

---

## J. 다음 단계 권고 사항 (Step 2 준비)

### J-1. 우선 해결 필요 (Blocker)

**코드 이중 구조:**
- modules/neture (P1 - Keep)
- routes/neture (Legacy - Remove or Migrate)

**판단 필요:**
1. Legacy 코드 제거할 것인가?
2. P2로 마이그레이션할 것인가?
3. 보존할 것인가? (이유 필요)

### J-2. 연계 조사 대상 (Step 2)

**Neture와 연계 가능성 있는 서비스:**
```
Cosmetics     → 공급자/파트너 연결
Yaksa         → 포럼/콘텐츠 연계
Dropshipping  → B2B 조달 연계
Tourism       → 제휴 프로그램 연계
```

**조사 질문:**
- "이 연계는 자연스러운가?"
- "누가 누구에게 의존하는가?"
- "양방향 의존이 발생하는가?"

---

## K. 조사 메타데이터

**조사 방법:**
- 코드 읽기 (Read tool)
- 파일 패턴 검색 (Glob tool)
- 코드 내 패턴 검색 (Grep tool)
- 라우트 등록 확인 (main.ts, App.tsx)

**조사 범위:**
- Frontend: services/web-neture/src
- Backend: apps/api-server/src/modules/neture
- Backend Legacy: apps/api-server/src/routes/neture

**조사 제외:**
- UI 디자인/카피
- 성능/보안
- 테스트 코드
- 빌드 설정

**조사 시점:** 2026-01-11 (main branch, commit 3caa6969e)

---

## L. Decision Log (Post-Investigation Actions)

### L-1. Legacy Code Removal (2026-01-11)

**Decision**: Remove all legacy Neture commerce code (routes/neture/entities, trial-* extensions)

**Commit**: 24e7f2132 - "refactor(neture): remove legacy commerce code conflicting with Read-Only Hub identity"

**Removed Components:**
```
routes/neture/entities/ (5 files)
routes/neture/controllers/payment.controller.ts
routes/neture/services/
routes/neture/repositories/
routes/neture/dto/
extensions/trial-fulfillment/
extensions/trial-shipping/
adminDashboardController: Neture Order/Partner methods
```

**Rationale:**
1. Conflicts with confirmed P1 identity (Read-Only Information Hub)
2. HARD RULES violation (POST/payments in legacy code)
3. Code duplication (modules vs routes)
4. Test environment clarity

**Impact:**
- Build: ✅ PASS (0 TypeScript errors)
- Code reduction: -3,160 lines
- P1 implementation preserved intact (modules/neture)

**Future Path:**
Commerce features (if needed) belong to:
- Separate commerce service, OR
- Neture P2 module (after explicit approval)

---

*End of Report*
