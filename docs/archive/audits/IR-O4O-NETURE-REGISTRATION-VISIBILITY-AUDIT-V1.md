# IR-O4O-NETURE-REGISTRATION-VISIBILITY-AUDIT-V1

> Neture Operator 가입 신청 데이터 가시성 감사
> 조사일: 2026-03-15
> 상태: **조사 완료 — Critical Bug 확인**

---

## Executive Summary

| 질문 | 답변 | 판정 |
|------|------|------|
| 가입 신청 데이터가 DB에 있는가? | YES — `users` + `service_memberships` 테이블에 존재 | **확인** |
| Operator 페이지가 올바른 API를 호출하는가? | **NO** — `product_approvals` 테이블을 조회 | **Critical Bug** |
| API 응답과 UI 데이터 구조가 일치하는가? | **NO** — 필드 불일치 (email, name, role 전부 undefined) | **Critical Bug** |
| Admin KPI와 동일 소스인가? | **NO** — Admin KPI도 `product_approvals` 기반 (같은 오류) | **확인** |

---

## 1. Root Cause — DATA SOURCE MISMATCH

### 문제의 핵심

| 레이어 | 기대값 | 실제값 |
|--------|--------|--------|
| **Frontend** | 사용자 가입 신청 (email, name, phone, role) | — |
| **API Endpoint** | `GET /api/v1/neture/admin/requests` | — |
| **Backend SQL** | `users` + `service_memberships` WHERE status='pending' | **`product_approvals` WHERE approval_type='private'** |
| **반환 필드** | email, name, phone, role, companyName | **supplierId, supplierName, productName, offerId** |

**Frontend는 사용자 가입 데이터를 기대하지만, Backend는 상품 승인 요청 데이터를 반환한다.**

---

## 2. 데이터 체인 추적

### Layer 1: DB — 실제 가입 데이터 위치

사용자 가입은 **두 테이블**에 저장된다:

**`users` 테이블:**

| 컬럼 | 설명 |
|------|------|
| `id` | UUID PK |
| `email` | 이메일 |
| `name` | 이름 |
| `phone` | 전화번호 |
| `status` | `PENDING` / `ACTIVE` (기본값: PENDING) |
| `business_info` | JSONB (licenseNumber, businessNumber, businessName) |
| `created_at` | 가입일시 |

**`service_memberships` 테이블:**

| 컬럼 | 설명 |
|------|------|
| `user_id` | FK → users.id |
| `service_key` | 'neture', 'kpa' 등 |
| `status` | 'pending' / 'active' |
| `role` | 가입 신청 역할 |

**가입 흐름:**
```
RegisterModal → POST /api/v1/auth/register
→ users INSERT (status=PENDING)
→ service_memberships INSERT (status='pending', service_key='neture')
```

### Layer 2: Backend API — 잘못된 데이터 소스

**파일:** `apps/api-server/src/modules/neture/services/admin.service.ts:18-56`

```sql
-- 실제 실행되는 쿼리 (WRONG)
SELECT pa.id, pa.approval_status AS status,
       spo.supplier_id AS "supplierId",
       ns.name AS "supplierName",
       pm.marketing_name AS "productName",
       pa.offer_id AS "offerId"
FROM product_approvals pa
JOIN supplier_product_offers spo ON spo.id = pa.offer_id
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers ns ON ns.id = spo.supplier_id
WHERE pa.approval_type = 'private'
ORDER BY pa.created_at DESC
```

이 쿼리는 **상품 private 승인 요청**을 반환한다. 사용자 가입 신청이 아니다.

### Layer 3: Frontend API — 정상

**파일:** `services/web-neture/src/lib/api/admin.ts:830-846`

```typescript
adminRegistrationApi.getRequests()
→ GET /api/v1/neture/admin/requests
→ response.data (배열)
```

API 호출 자체는 정상이지만, 엔드포인트가 잘못된 데이터를 반환한다.

### Layer 4: Frontend 매핑 — 필드 불일치

**파일:** `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx:87-102`

```typescript
const mapped = data.map((r: any) => ({
  email: r.email || '',        // ← undefined (API는 email 반환 안 함)
  name: r.name || '',          // ← undefined
  phone: r.phone || '',        // ← undefined
  role: r.role || 'consumer',  // ← undefined → 'consumer' fallback
  companyName: r.companyName,  // ← undefined
  status: r.status || 'PENDING', // ← 'pending' (소문자, 대문자 불일치 가능)
}));
```

**결과:**
- 상품 승인 데이터가 없으면 → 빈 배열 → "조건에 맞는 가입 신청이 없습니다"
- 상품 승인 데이터가 있더라도 → email/name/phone 전부 빈 문자열

---

## 3. 원인 판정

| 원인 | 판정 |
|------|------|
| DB 데이터 없음 | **아님** — `users`/`service_memberships`에 데이터 존재 |
| API 필터 문제 | **아님** — 필터 자체는 정상 동작 |
| **API 데이터 소스 오류** | **이것** — `product_approvals` 테이블을 조회 |
| **필드 매핑 불일치** | **이것** — 반환 필드와 UI 필드 불일치 |
| Frontend 필터 | **아님** — 데이터가 도착하지 않으므로 필터 이전 문제 |

### 결론

**`GET /api/v1/neture/admin/requests` 엔드포인트가 `product_approvals` 테이블을 조회하고 있다.**

이 엔드포인트는 원래 **상품 Private 승인 요청** 용도로 만들어졌고,
**사용자 가입 신청**과는 완전히 다른 데이터이다.

사용자 가입 신청을 조회하려면 `users` + `service_memberships` 테이블에서
`status = 'pending'` AND `service_key = 'neture'` 조건으로 조회해야 한다.

---

## 4. 수정 방향

### Option A: 기존 엔드포인트 수정 (권장)

`GET /api/v1/neture/admin/requests`의 SQL을 다음으로 교체:

```sql
SELECT u.id, u.email, u.name, u.phone,
       sm.role, sm.status,
       u.business_info->>'businessName' AS "companyName",
       u.business_info->>'businessNumber' AS "businessNumber",
       u.business_info->>'licenseNumber' AS "licenseNumber",
       u.created_at AS "createdAt"
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = 'neture'
  AND sm.status = 'pending'
ORDER BY u.created_at DESC
```

### Option B: 새 엔드포인트 생성

```
GET /api/v1/neture/operator/registrations
```

기존 `/admin/requests`는 상품 승인 전용으로 유지하고,
사용자 가입 신청 전용 엔드포인트를 신규 생성.

---

## 5. 관련 파일

### Frontend

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx` | 가입 신청 UI (email, name, role 기대) |
| `services/web-neture/src/lib/api/admin.ts:830-846` | `adminRegistrationApi.getRequests()` |

### Backend

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/controllers/admin.controller.ts:597-618` | `GET /admin/requests` 라우트 |
| `apps/api-server/src/modules/neture/services/admin.service.ts:18-56` | `listAdminRequests()` — **product_approvals SQL** |
| `apps/api-server/src/modules/auth/controllers/auth.controller.ts` | `POST /register` — 가입 처리 |
| `apps/api-server/src/modules/auth/entities/User.ts` | users 엔티티 (status: PENDING/ACTIVE) |
| `apps/api-server/src/modules/auth/entities/ServiceMembership.ts` | service_memberships 엔티티 |

### 가입 흐름

```
RegisterModal.tsx
  → POST /api/v1/auth/register
  → AuthController.register()
  → INSERT users (status=PENDING)
  → INSERT service_memberships (status='pending', service_key='neture')
```

### 조회 흐름 (현재 — BROKEN)

```
RegistrationRequestsPage.tsx
  → adminRegistrationApi.getRequests()
  → GET /api/v1/neture/admin/requests
  → AdminService.listAdminRequests()
  → SELECT FROM product_approvals  ← WRONG TABLE
  → 반환: supplierId, productName  ← WRONG FIELDS
  → UI: email='', name='', role='consumer'  ← ALL EMPTY
```

### 조회 흐름 (정상 — SHOULD BE)

```
RegistrationRequestsPage.tsx
  → GET /api/v1/neture/admin/requests (또는 새 엔드포인트)
  → SELECT FROM users JOIN service_memberships
     WHERE sm.service_key = 'neture' AND sm.status = 'pending'
  → 반환: email, name, phone, role, companyName
  → UI: 정상 표시
```

---

## 6. 후속 WO

### WO-O4O-NETURE-REGISTRATION-API-FIX-V1

```
목적: 가입 신청 API를 users + service_memberships 기반으로 수정
대상: AdminService.listAdminRequests() SQL 교체
검증: Operator 가입 승인 페이지에서 pending 사용자 표시 확인
```

---

*IR-O4O-NETURE-REGISTRATION-VISIBILITY-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete — Critical Bug Confirmed*
