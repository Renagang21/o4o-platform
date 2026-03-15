# IR-O4O-NETURE-REGISTRATION-CODE-COMPLEXITY-AUDIT-V1

> Neture 가입 신청 시스템 8-Layer 코드 복잡성 감사
> 조사일: 2026-03-15
> 상태: **조사 완료 — Critical Bug 4건 확인**

---

## Executive Summary

| # | 발견 | 심각도 | 위치 |
|---|------|--------|------|
| B1 | **DATA SOURCE MISMATCH** — API가 `product_approvals` 테이블 조회 | **Critical** | Layer 4 (Service) |
| B2 | **FIELD MAPPING FAILURE** — 반환 필드와 UI 필드 완전 불일치 | **Critical** | Layer 4↔Layer 1 |
| B3 | **APPROVE/REJECT NOT CONNECTED** — 승인/거부가 로컬 state만 변경 | **Critical** | Layer 1 (Page) |
| B4 | **SCOPE MISMATCH** — Operator 페이지가 Admin 권한 요구 | **High** | Layer 3 (Controller) |

---

## 1. 전체 데이터 흐름도

### 가입 저장 경로 (WRITE — 정상)

```
RegisterModal.tsx / RegisterPage.tsx
  │
  ├─ POST /api/v1/auth/check-email  (이메일 중복 확인)
  │
  └─ POST /api/v1/auth/register
       │
       ├─ NEW USER:
       │   ├─ INSERT users (status='PENDING')
       │   ├─ INSERT service_memberships (status='pending', role=선택역할)
       │   └─ Return 201
       │
       └─ EXISTING USER:
           ├─ Password 검증
           ├─ INSERT service_memberships (status='pending')
           └─ Return 201
```

**저장 위치**: `users` + `service_memberships` 테이블

### 가입 조회 경로 (READ — BROKEN)

```
RegistrationRequestsPage.tsx          ← Layer 1: Frontend Page
  │
  └─ adminRegistrationApi.getRequests()  ← Layer 2: Frontend API Client
       │
       └─ GET /api/v1/neture/admin/requests  ← Layer 3: Backend Route
            │
            ├─ requireAuth                    ← 인증 확인
            ├─ requireNetureScope('neture:admin')  ← ❌ Admin 권한 요구
            │
            └─ adminService.listAdminRequests()  ← Layer 4: Backend Service
                 │
                 └─ SELECT FROM product_approvals  ← ❌ WRONG TABLE
                      JOIN supplier_product_offers
                      JOIN product_masters
                      JOIN neture_suppliers
                      WHERE approval_type = 'private'
                      │
                      └─ RETURNS: supplierId, supplierName,  ← ❌ WRONG FIELDS
                                  productName, offerId,
                                  sellerId, serviceId
```

---

## 2. Layer별 상세 분석

### Layer 1: Frontend Page

**파일**: `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx`

#### 코드 구조

```typescript
interface RegistrationRequest {
  id: string;
  email: string;          // ← API에서 undefined
  name: string;           // ← API에서 undefined
  phone: string;          // ← API에서 undefined
  role: UserRole;         // ← API에서 undefined → 'consumer' fallback
  service: string;        // ← API에서 undefined → 'neture' fallback
  companyName?: string;   // ← API에서 undefined
  businessNumber?: string;// ← API에서 undefined
  licenseNumber?: string; // ← API에서 undefined
  status: 'PENDING' | 'APPROVED' | 'REJECTED';  // ← API: 'pending' (소문자)
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectReason?: string;
}
```

#### 매핑 로직 (Line 87-102)

```typescript
const mapped = (data || []).map((r: any) => ({
  id: r.id,
  email: r.email || '',              // product_approvals에 email 없음 → ''
  name: r.name || '',                // product_approvals에 name 없음 → ''
  phone: r.phone || '',              // product_approvals에 phone 없음 → ''
  role: r.role || 'consumer',        // product_approvals에 role 없음 → 'consumer'
  service: r.service || 'neture',    // product_approvals에 service 없음 → 'neture'
  companyName: r.companyName || r.company_name,  // 없음 → undefined
  status: r.status || 'PENDING',     // 'pending' (소문자) ≠ 'PENDING' (대문자)
  createdAt: r.createdAt || r.created_at || new Date().toISOString(),
}));
```

#### 승인/거부 로직 (Line 115-163) — **❌ B3: 로컬 state만 변경**

```typescript
const handleApprove = async (request: RegistrationRequest) => {
  // ❌ API 호출 없음 — 로컬 state만 업데이트
  setRequests(prev =>
    prev.map(r =>
      r.id === request.id
        ? { ...r, status: 'APPROVED' as const, processedAt: new Date().toISOString() }
        : r
    )
  );
  setMessage({ type: 'success', text: `${request.name}님의 가입 신청이 승인되었습니다.` });
};

const handleReject = async (request: RegistrationRequest) => {
  // ❌ API 호출 없음 — 로컬 state만 업데이트
  setRequests(prev =>
    prev.map(r =>
      r.id === request.id
        ? { ...r, status: 'REJECTED' as const, ... }
        : r
    )
  );
};
```

**문제**: 페이지 새로고침 시 승인/거부 상태가 리셋된다. DB에 반영되지 않는다.

#### 필터 로직 (Line 166-174) — 정상 구현

```typescript
const filteredRequests = requests.filter(request => {
  const matchesSearch = request.name.includes(searchQuery) || request.email.includes(searchQuery) || ...;
  const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
  const matchesRole = roleFilter === 'ALL' || request.role === roleFilter;
  return matchesSearch && matchesStatus && matchesRole;
});
```

필터 자체는 정상이나, 모든 필드가 빈 문자열이므로 검색이 무의미하다.

#### status 대소문자 불일치

| 위치 | status 값 | 형식 |
|------|-----------|------|
| Frontend type | `'PENDING' \| 'APPROVED' \| 'REJECTED'` | 대문자 |
| User entity | `PENDING`, `ACTIVE`, `APPROVED` | 대문자 |
| ServiceMembership | `'pending'`, `'active'`, `'rejected'` | 소문자 |
| product_approvals | `'pending'`, `'approved'`, `'rejected'` | 소문자 |

Frontend는 대문자를 기대하지만, 실제 DB 데이터는 소문자이다. `r.status || 'PENDING'` fallback으로 소문자 `'pending'`이 그대로 들어가면 statusFilter 매칭 실패.

---

### Layer 2: Frontend API Client

**파일**: `services/web-neture/src/lib/api/admin.ts:830-846`

```typescript
export const adminRegistrationApi = {
  async getRequests(filters?: { status?: string }): Promise<any[]> {
    try {
      const qs = filters?.status ? `?status=${filters.status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/requests${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];      // ← 403/401 시 빈 배열 반환 (에러 숨김)
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] ...', error);
      return [];                         // ← 네트워크 오류 시 빈 배열
    }
  },
};
```

**문제 1**: `any[]` 반환 타입 — 컴파일 타임에 필드 불일치를 감지할 수 없다.
**문제 2**: `!response.ok` 시 빈 배열 반환 — 403 오류(권한 부족)를 정상 응답(데이터 없음)으로 위장.
**문제 3**: 엔드포인트 이름 `admin/requests` — "admin" prefix이지만 Operator 페이지에서 호출.

---

### Layer 3: Backend Controller

**파일**: `apps/api-server/src/modules/neture/controllers/admin.controller.ts:600-618`

```typescript
router.get('/requests',
  requireAuth,
  requireNetureScope('neture:admin'),  // ← ❌ B4: Admin 스코프 요구
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, supplierId, serviceId } = req.query;
    const rows = await adminService.listAdminRequests({
      status: status as string | undefined,
      supplierId: supplierId as string | undefined,
      serviceId: serviceId as string | undefined,
    });
    res.json({ success: true, data: rows });
  }
);
```

**문제 (B4)**: `requireNetureScope('neture:admin')` — Admin 권한이 필요하다.
Operator 사용자는 `neture:operator` 스코프를 가진다.
→ Operator가 이 API를 호출하면 **403 Forbidden**.
→ Frontend API Client가 `return []`로 처리 → 빈 목록 표시.

**WO 주석**: `WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기`
→ 이 엔드포인트는 **상품 승인 요청** 전용으로 설계되었음을 명시적으로 표시.

---

### Layer 4: Backend Service — **ROOT CAUSE**

**파일**: `apps/api-server/src/modules/neture/services/admin.service.ts:18-56`

```sql
SELECT pa.id, pa.approval_status AS status,
       spo.supplier_id AS "supplierId",
       ns.name AS "supplierName",
       pa.organization_id AS "sellerId",
       pa.service_key AS "serviceId",
       pm.marketing_name AS "productName",
       pa.offer_id AS "offerId",
       pa.created_at AS "requestedAt"
FROM product_approvals pa
JOIN supplier_product_offers spo ON spo.id = pa.offer_id
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers ns ON ns.id = spo.supplier_id
WHERE pa.approval_type = 'private'
ORDER BY pa.created_at DESC
```

**이 SQL은 상품 Private 승인 요청을 조회한다. 사용자 가입 신청이 아니다.**

#### API 반환 필드 vs Frontend 기대 필드

| API 반환 필드 | Frontend 기대 필드 | 매칭 |
|---------------|-------------------|------|
| `id` | `id` | ✅ |
| `status` (`'pending'`) | `status` (`'PENDING'`) | ⚠️ 대소문자 불일치 |
| `supplierId` | `email` | ❌ |
| `supplierName` | `name` | ❌ |
| `sellerId` | `phone` | ❌ |
| `serviceId` | `role` | ❌ |
| `productName` | `companyName` | ❌ |
| `offerId` | `businessNumber` | ❌ |
| `requestedAt` | `createdAt` | ❌ (key name 불일치) |
| — | `licenseNumber` | ❌ |
| — | `service` | ❌ |

**11개 필드 중 1개만 정확히 매칭 (id), 1개 부분 매칭 (status), 9개 완전 불일치.**

---

### Layer 5: 가입 저장 경로 (Auth API)

**파일**: `apps/api-server/src/modules/auth/controllers/auth.controller.ts:335-557`

```
POST /api/v1/auth/register
  │
  ├─ 기존 회원 확인 (email 기준)
  │
  ├─ NEW USER:
  │   ├─ const user = userRepo.create({
  │   │     email, password: hashed,
  │   │     name, phone, status: 'PENDING',
  │   │     businessInfo: { licenseNumber, businessName, businessNumber, businessType }
  │   │   })
  │   ├─ await userRepo.save(user)
  │   │
  │   ├─ const membership = membershipRepo.create({
  │   │     userId: user.id,
  │   │     serviceKey: service || 'neture',
  │   │     status: 'pending',
  │   │     role: role  ← (user, supplier, partner, seller)
  │   │   })
  │   └─ await membershipRepo.save(membership)
  │
  └─ EXISTING USER:
      ├─ 비밀번호 검증
      ├─ const membership = membershipRepo.create({
      │     userId: user.id,
      │     serviceKey: service || 'neture',
      │     status: 'pending',
      │     role: role
      │   })
      └─ await membershipRepo.save(membership)
```

**저장 테이블**: `users` + `service_memberships`
**저장 필드**: email, name, phone, role, businessInfo (JSON), status='pending'

→ `product_approvals` 테이블과 **완전히 분리된** 데이터 경로.

---

### Layer 6: DB Entity 스키마

#### users 테이블

**파일**: `apps/api-server/src/modules/auth/entities/User.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | — |
| `email` | varchar UNIQUE | 이메일 |
| `name` | varchar | 이름 |
| `phone` | varchar | 전화번호 |
| `status` | enum (PENDING/ACTIVE/APPROVED/SUSPENDED) | 계정 상태 |
| `businessInfo` | jsonb | `{licenseNumber, businessName, businessNumber, businessType}` |
| `created_at` | timestamp | 가입일시 |
| `approved_at` | timestamp | 승인일시 |
| `approved_by` | uuid | 승인자 |

Core Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)

#### service_memberships 테이블

**파일**: `apps/api-server/src/modules/auth/entities/ServiceMembership.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | — |
| `user_id` | uuid FK→users | 사용자 |
| `service_key` | varchar(100) | 'neture', 'kpa-society' 등 |
| `status` | enum (pending/active/suspended/rejected) | 멤버십 상태 |
| `role` | varchar | 서비스 내 역할 (user, supplier, partner, seller) |
| `approved_by` | uuid | 승인자 |
| `approved_at` | timestamp | 승인일시 |
| `rejection_reason` | text | 거부 사유 |
| `created_at` | timestamp | 생성일시 |

UNIQUE: `(user_id, service_key)` — 사용자당 서비스별 1개
INDEX: `(service_key, status)` — 승인 대기 조회용 인덱스 존재

#### product_approvals 테이블 (현재 잘못 조회하는 테이블)

**파일**: `apps/api-server/src/entities/ProductApproval.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | — |
| `offer_id` | uuid FK→supplier_product_offers | 상품 오퍼 |
| `organization_id` | uuid | 판매 조직 |
| `service_key` | varchar | 서비스 키 |
| `approval_type` | enum (service/private) | 승인 유형 |
| `approval_status` | enum (pending/approved/rejected/revoked) | 상태 |
| `requested_by` | uuid | 요청자 |
| `decided_by` | uuid | 결정자 |

**이 테이블은 상품 판매 승인 관리용이다. 사용자 가입과 무관하다.**

---

## 3. 복잡성 분석

### 코드 경로 복잡성 매트릭스

| Layer | 파일 | 복잡성 | 문제 |
|-------|------|--------|------|
| L1: Frontend Page | `RegistrationRequestsPage.tsx` (489행) | **Medium** | `any` 타입 매핑, 로컬 state만 변경 |
| L2: Frontend API | `admin.ts:830-846` (17행) | **Low** | `any[]` 반환, 에러 숨김 |
| L3: Controller | `admin.controller.ts:600-618` (19행) | **Low** | Admin 스코프 하드코딩 |
| L4: Service | `admin.service.ts:18-56` (39행) | **Low** | 잘못된 테이블 조회 |
| L5: Auth Save | `auth.controller.ts:335-557` (222행) | **High** | 다중 분기 (신규/기존/KPA) |
| L6: User Entity | `User.ts` (338행) | **High** | 많은 필드, computed getters |
| L7: Membership Entity | `ServiceMembership.ts` (68행) | **Low** | 단순 구조 |
| L8: ProductApproval Entity | `ProductApproval.ts` | **Medium** | 3단 JOIN 구조 |

### 왜 이 버그가 발생했는가?

**가설**: `GET /admin/requests` 엔드포인트는 원래 **상품 승인 요청** 조회 용도로 생성되었다.
WO 주석이 이를 명시: `WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기`.

이후 **가입 신청 관리 UI** (`RegistrationRequestsPage.tsx`)를 만들 때,
이 엔드포인트를 "가입 신청 API"로 **오인**하여 연결한 것으로 추정된다.

**근거**:
1. 엔드포인트 이름 `/admin/requests` — "requests"라는 모호한 이름
2. Frontend API 객체 이름 `adminRegistrationApi` — "Registration"이라고 명명했지만 실제 호출 대상은 상품 승인
3. Service 메서드 `listAdminRequests()` — "admin requests"라는 범용 이름으로 상품 승인을 감싸버림

**즉, 엔드포인트가 없는 것이 아니라 "잘못된 엔드포인트를 연결"한 것이다.**

---

## 4. Bug 상세

### B1: DATA SOURCE MISMATCH (Critical)

| 항목 | 값 |
|------|------|
| **위치** | `admin.service.ts:39-53` |
| **현상** | 가입 신청 조회 시 `product_approvals` 테이블 조회 |
| **기대** | `users` JOIN `service_memberships` WHERE `sm.service_key='neture'` AND `sm.status='pending'` |
| **영향** | 모든 가입 신청 데이터가 표시되지 않음 |

### B2: FIELD MAPPING FAILURE (Critical)

| 항목 | 값 |
|------|------|
| **위치** | `RegistrationRequestsPage.tsx:87-102` ↔ `admin.service.ts:40-45` |
| **현상** | API 반환 필드 (supplierId, productName 등)와 UI 필드 (email, name 등) 완전 불일치 |
| **영향** | 11개 필드 중 9개 `undefined`, 모든 행이 빈 데이터 |

### B3: APPROVE/REJECT NOT CONNECTED (Critical)

| 항목 | 값 |
|------|------|
| **위치** | `RegistrationRequestsPage.tsx:115-163` |
| **현상** | `handleApprove()`/`handleReject()`가 로컬 React state만 변경 |
| **기대** | API 호출 → `service_memberships.status` = 'active'/'rejected' + `users.status` = 'ACTIVE' 변경 |
| **영향** | 승인/거부 클릭해도 DB에 반영 안 됨, 새로고침 시 리셋 |

### B4: SCOPE MISMATCH (High)

| 항목 | 값 |
|------|------|
| **위치** | `admin.controller.ts:600` |
| **현상** | `requireNetureScope('neture:admin')` — Admin 권한 요구 |
| **기대** | Operator 페이지이므로 `'neture:operator'` 또는 별도 엔드포인트 |
| **영향** | Operator 사용자 → 403 → Frontend `return []` → "신청 없음" 표시 |

---

## 5. 올바른 SQL (수정 시 참조)

### 가입 신청 목록 조회 (SHOULD BE)

```sql
SELECT u.id,
       u.email,
       u.name,
       u.phone,
       sm.role,
       sm.status,
       u.business_info->>'businessName' AS "companyName",
       u.business_info->>'businessNumber' AS "businessNumber",
       u.business_info->>'licenseNumber' AS "licenseNumber",
       sm.service_key AS "service",
       u.created_at AS "createdAt",
       sm.approved_at AS "processedAt",
       sm.approved_by AS "processedBy",
       sm.rejection_reason AS "rejectReason"
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = 'neture'
  AND ($1::text IS NULL OR sm.status = $1)
ORDER BY u.created_at DESC
```

### 가입 승인 처리 (SHOULD BE)

```sql
-- Transaction
UPDATE service_memberships
   SET status = 'active', approved_by = $1, approved_at = NOW()
 WHERE id = $2 AND service_key = 'neture';

UPDATE users
   SET status = 'ACTIVE', approved_at = NOW(), approved_by = $1
 WHERE id = $3 AND status = 'PENDING';
```

### 가입 거부 처리 (SHOULD BE)

```sql
UPDATE service_memberships
   SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2
 WHERE id = $3 AND service_key = 'neture';
```

---

## 6. 관련 파일 목록

### WRITE Path (가입 저장 — 정상)

| # | 파일 | 역할 |
|---|------|------|
| W1 | `services/web-neture/src/components/RegisterModal.tsx` | 가입 모달 (POST /auth/register) |
| W2 | `services/web-neture/src/pages/RegisterPage.tsx` | 가입 페이지 (POST /auth/register) |
| W3 | `services/web-neture/src/pages/RegisterPendingPage.tsx` | 가입 대기 안내 |
| W4 | `apps/api-server/src/modules/auth/controllers/auth.controller.ts:335-557` | register 핸들러 |
| W5 | `apps/api-server/src/modules/auth/entities/User.ts` | users 엔티티 |
| W6 | `apps/api-server/src/modules/auth/entities/ServiceMembership.ts` | service_memberships 엔티티 |

### READ Path (가입 조회 — BROKEN)

| # | 파일 | 역할 | 문제 |
|---|------|------|------|
| R1 | `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx` | 가입 신청 UI | B2, B3 |
| R2 | `services/web-neture/src/lib/api/admin.ts:830-846` | API 클라이언트 | any[], 에러 숨김 |
| R3 | `apps/api-server/src/modules/neture/controllers/admin.controller.ts:600-618` | 라우트 핸들러 | B4 |
| R4 | `apps/api-server/src/modules/neture/services/admin.service.ts:18-56` | SQL 쿼리 | **B1 (ROOT CAUSE)** |

### 관련 Entity (참조)

| # | 파일 | 역할 |
|---|------|------|
| E1 | `apps/api-server/src/entities/ProductApproval.ts` | product_approvals 엔티티 (현재 잘못 조회) |
| E2 | `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` | 상품 승인 서비스 (올바른 용도) |

---

## 7. 수정 방향 (코드 수정 없음 — WO에서 수행)

### Option A: 기존 엔드포인트 분리 (권장)

1. `GET /admin/requests` → 상품 승인 전용으로 유지 (현재 그대로)
2. **새 엔드포인트 생성**: `GET /operator/registrations`
   - `requireNetureScope('neture:operator')` 사용
   - `users` + `service_memberships` 조회
3. Frontend: `adminRegistrationApi` → 새 엔드포인트로 변경
4. 승인/거부 API 신규 생성:
   - `POST /operator/registrations/:id/approve`
   - `POST /operator/registrations/:id/reject`

### Option B: 기존 엔드포인트 교체

1. `GET /admin/requests`의 SQL을 `users + service_memberships` 기반으로 교체
2. 스코프를 `neture:operator`로 변경
3. 승인/거부 엔드포인트 추가

**권장: Option A** — 기존 상품 승인 기능을 보존하고, 가입 관리를 독립 엔드포인트로 분리.

---

## 8. 후속 WO

### WO-O4O-NETURE-REGISTRATION-API-FIX-V1

```
목적: 가입 신청 조회/승인/거부 API를 올바른 데이터 소스로 구현
대상:
  - Backend: 새 엔드포인트 (GET/POST /operator/registrations)
  - Frontend API: 새 API 클라이언트 메서드
  - Frontend Page: 승인/거부 핸들러를 실제 API 호출로 연결
  - status 대소문자 정규화
검증:
  - Operator 로그인 → 가입 승인 페이지 → pending 사용자 표시 확인
  - 승인 클릭 → DB 반영 확인 (service_memberships.status='active')
  - 거부 클릭 → DB 반영 확인 (service_memberships.status='rejected')
```

---

*IR-O4O-NETURE-REGISTRATION-CODE-COMPLEXITY-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete — 4 Bugs Confirmed (3 Critical, 1 High)*
