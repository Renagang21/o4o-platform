# STORE-ROLE-ACCESS-REPORT-V1

> WO-ROLE-ACCESS-AUDIT-STORE-V1
> 조사일: 2026-02-20
> 성격: 현 상태 기록 (수정/제안 없음)

---

## 1. 라우트 보호 표

### A. Frontend 라우트 (App.tsx 기준)

| 경로 | Layout | 보호 컴포넌트 | allowedRoles | 실제 접근 가능 역할 | 비로그인 접근 |
|------|--------|--------------|-------------|-------------------|-------------|
| `/store` | MainLayout | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/hub` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/identity` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/products` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/orders` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/content` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/services` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/settings` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/apply` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/display` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/display/playlists` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/display/schedules` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/display/media` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/display/forum` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/signage/library` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/signage/playlist/:id` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/signage/media/:id` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/signage/my` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/signage/preview` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/market-trial` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/b2b-order` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/requests` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/funnel` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/management` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |
| `/store/management/b2b` | StoreLayoutWrapper | ProtectedRoute | `['pharmacy']` | pharmacy | 차단 → `/login` |

### B. Consumer Store 라우트 (별도 경로)

| 경로 | Layout | 보호 컴포넌트 | allowedRoles | 실제 접근 가능 역할 | 비로그인 접근 |
|------|--------|--------------|-------------|-------------------|-------------|
| `/store/:pharmacyId` | StoreLayout | 없음 | 없음 | 전체 | 허용 (Public) |
| `/store/:pharmacyId/products` | StoreLayout | 없음 | 없음 | 전체 | 허용 (Public) |
| `/store/:pharmacyId/products/:productId` | StoreLayout | 없음 | 없음 | 전체 | 허용 (Public) |
| `/store/:pharmacyId/cart` | StoreLayout | 없음 | 없음 | 전체 | 허용 (Public) |
| `/store/:pharmacyId/kiosk` | KioskLayout | 없음 | 없음 | 전체 | 허용 (Public) |
| `/store/:pharmacyId/tablet` | TabletLayout | 없음 | 없음 | 전체 | 허용 (Public) |

---

## 2. 역할 매핑 구조

### mapApiRoleToWebRole() (AuthContext.tsx:101-113)

| API 서버 역할 | Web 역할 매핑 | `/store` 접근 |
|-------------|-------------|-------------|
| `pharmacy` | `pharmacy` | ✅ 가능 |
| `seller` | `pharmacy` | ✅ 가능 |
| `customer` | `pharmacy` | ✅ 가능 |
| `user` | `pharmacy` | ✅ 가능 |
| `admin` | `operator` | ❌ 불가 |
| `super_admin` | `operator` | ❌ 불가 |
| `supplier` | `supplier` | ❌ 불가 |
| `partner` | `partner` | ❌ 불가 |
| (기타) | `consumer` | ❌ 불가 |

### 매핑 영향 분석

- `seller`, `customer`, `user` 역할이 모두 `pharmacy`로 매핑됨
- 이 역할로 로그인한 사용자는 `/store` 전체에 접근 가능
- `admin`/`super_admin`은 `operator`로 매핑되어 `/store` 접근 불가

---

## 3. RoleGuard 동작 구조 (RoleGuard.tsx)

```
1. isLoading → 스피너 표시
2. !isAuthenticated → Navigate to /login
3. allowedRoles 존재 && user.roles에 포함 안 됨 → Navigate to /
4. 통과 → children 렌더
```

### 역할 비교 방식

```typescript
user.roles.some(r => allowedRoles.includes(r))
```

- `user.roles`는 배열 (복수 역할 가능)
- 하나라도 일치하면 통과

---

## 4. Backend API 보호 구조

### GlycoPharm Store API (`/api/v1/glycopharm/stores`)

| 유형 | 보호 수준 |
|------|---------|
| 상품 조회 (GET) | Public (4-gate visibility) |
| 스토어 설정 변경 (PUT) | `authenticate` + `created_by_user_id === userId` |
| 관리 기능 | `requireGlycopharmScope` |

### GlycoPharm Pharmacy API (`/api/v1/glycopharm/pharmacy`)

| 유형 | 보호 수준 |
|------|---------|
| 상품/주문/고객 조회 | `requireAuth` + `created_by_user_id` 기반 필터 |

### 소유권 검증 패턴

```typescript
// Backend에서 약국 소유자 확인
const pharmacy = await getPharmacyByUserId(userId);
if (pharmacy.created_by_user_id !== userId) → 403
```

---

## 5. 보호 누락 여부

### Frontend

| 항목 | 상태 | 비고 |
|------|------|------|
| `/store` (Entry) | ✅ 보호됨 | ProtectedRoute + `['pharmacy']` |
| `/store/*` (하위 전체) | ✅ 보호됨 | 부모 Route에 ProtectedRoute 적용 |
| 비로그인 직접 URL 접근 | ✅ 차단 | RoleGuard → `/login` redirect |
| operator 역할 접근 | ✅ 차단 | `operator` ∉ `['pharmacy']` |
| consumer 역할 접근 | ✅ 차단 | `consumer` ∉ `['pharmacy']` |

### Backend

| 항목 | 상태 | 비고 |
|------|------|------|
| 상품 조회 API | ⚠️ Public | 4-gate visibility로 보호하나 인증 불필요 |
| 설정 변경 API | ✅ 보호됨 | authenticate + 소유자 확인 |
| 역할 기반 API 필터 | ⚠️ 간접적 | `created_by_user_id` 기반 (역할 직접 검사 아님) |

---

## 6. 정책과 실제 일치 여부

### 설계 의도: `/store` = pharmacy 전용

| 검증 항목 | 일치 여부 |
|----------|---------|
| Frontend 라우트 보호 | ✅ 일치 |
| 비로그인 차단 | ✅ 일치 |
| operator 접근 차단 | ✅ 일치 |
| admin 접근 차단 | ✅ 일치 (admin → operator 매핑) |
| supplier/partner 차단 | ✅ 일치 |
| Consumer Store 분리 | ✅ 일치 (`/store/:pharmacyId`는 별도 Public 경로) |

---

## 7. 위험 요소 존재 여부

| 항목 | 존재 여부 | 설명 |
|------|---------|------|
| 역할 매핑 확대 | **Yes** | `seller`, `customer`, `user`가 모두 `pharmacy`로 매핑되어 `/store` 접근 가능 |
| Backend 역할 미검증 | **Yes** | Backend pharmacy API는 `requireAuth`만 사용, 역할 직접 검사 없이 `created_by_user_id` 기반 필터 |
| JS disabled 우회 | **No** | SPA 구조상 JS 없으면 화면 자체 렌더링 불가 |
| Direct URL 우회 | **No** | RoleGuard가 모든 `/store/*` 경로에 적용 |
| Layout 우회 가능성 | **No** | `/store` exact는 MainLayout, 하위는 StoreLayoutWrapper - 모두 ProtectedRoute 통과 필수 |

---

## 부록: ProtectedRoute(RoleGuard) 적용 구조도

```
/store (exact)
  └─ MainLayout
       └─ ProtectedRoute allowedRoles=['pharmacy']
            └─ StoreEntryPage

/store/* (하위)
  └─ ProtectedRoute allowedRoles=['pharmacy']
       └─ StoreLayoutWrapper
            ├─ /store/hub → StoreOverviewPage
            ├─ /store/identity → StoreMainPage
            ├─ /store/products → PharmacyProducts
            ├─ /store/orders → PharmacyOrders
            ├─ /store/management → PharmacyManagement
            └─ ... (22개 하위 라우트)

/store/:pharmacyId (Consumer)
  └─ StoreLayout (Public, 보호 없음)
       ├─ index → StoreFront
       ├─ products → StoreProducts
       └─ cart → StoreCart
```
