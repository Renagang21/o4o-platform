# Digital Signage Role Access Policy V1

> Role Reform (RR-1)
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Digital Signage의 **역할별 접근 정책**을 정의합니다.
각 역할이 접근할 수 있는 리소스와 수행할 수 있는 작업을 명확히 합니다.

---

## 2. 역할 정의

### 2.1 역할 계층

```
                    ┌──────────────┐
                    │    Admin     │
                    │  (Platform)  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────┴──────┐          ┌──────┴──────┐
       │  Operator   │          │  Supplier   │
       │    (HQ)     │          │  (Vendor)   │
       └──────┬──────┘          └─────────────┘
              │
       ┌──────┴──────┐
       │    Store    │
       │  (Branch)   │
       └─────────────┘
```

### 2.2 역할 식별자

| 역할 | Permission Key | 범위 |
|------|----------------|------|
| Admin | `signage:admin` | Platform-wide |
| Operator | `signage:{serviceKey}:operator` | Per Service |
| Store | `signage:store:{organizationId}` | Per Organization |
| Supplier | `signage:supplier:{supplierId}` | Per Supplier |

---

## 3. Admin 접근 정책

### 3.1 허용 리소스

| 리소스 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| System Settings | ✓ | ✓ | ✓ | ✗ |
| Extensions | ✓ | ✓ | ✓ | ✓ |
| Suppliers | ✓ | ✓ | ✓ | ✓ |
| System Analytics | ✓ | ✗ | ✗ | ✗ |
| All Services Stats | ✓ | ✗ | ✗ | ✗ |

### 3.2 금지 리소스

| 리소스 | 이유 |
|--------|------|
| HQ Playlists | Operator 전용 |
| HQ Media | Operator 전용 |
| Store Playlists | Store 전용 |
| Store Schedules | Store 전용 |
| Store Devices | Store 전용 |

### 3.3 API 접근

```
✓ GET  /api/signage/admin/*
✓ POST /api/signage/admin/*
✓ PATCH /api/signage/admin/*
✓ DELETE /api/signage/admin/*

✗ /api/signage/:serviceKey/hq/*      (Operator only)
✗ /api/signage/:serviceKey/playlists (Store only - CRUD)
✗ /api/signage/:serviceKey/schedules (Store only)
```

### 3.4 UI 접근

```
✓ /digital-signage/monitoring
✓ /digital-signage/settings
✓ /digital-signage/extensions
✓ /digital-signage/suppliers
✓ /digital-signage/analytics
✓ /digital-signage/operations/*

✗ /signage/hq/*       (Operator frontend)
✗ /signage/store/*    (Store frontend)
```

---

## 4. Operator (HQ) 접근 정책

### 4.1 허용 리소스

| 리소스 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| HQ Playlists | ✓ | ✓ | ✓ | ✓ |
| HQ Media | ✓ | ✓ | ✓ | ✓ |
| Templates | ✓ | ✓ | ✓ | ✓ |
| Content Blocks | ✓ | ✓ | ✓ | ✓ |
| Layout Presets | ✓ | ✓ | ✓ | ✓ |
| Community (Review) | ✓ | ✗ | ✓* | ✓* |
| Forced Items | ✓ | ✓ | ✓ | ✓ |
| HQ Analytics | ✓ | ✗ | ✗ | ✗ |

*Community: 승인/거부만 가능

### 4.2 금지 리소스

| 리소스 | 이유 |
|--------|------|
| System Settings | Admin 전용 |
| Extensions | Admin 전용 |
| Suppliers | Admin 전용 |
| Store Playlists (CRUD) | Store 전용 |
| Store Schedules | Store 전용 |
| Store Devices | Store 전용 |
| Other Service Data | 서비스 격리 |

### 4.3 API 접근

```
✓ GET  /api/signage/:serviceKey/global/*    (Global content read)
✓ POST /api/signage/:serviceKey/hq/*        (HQ content CRUD)
✓ PATCH /api/signage/:serviceKey/hq/*
✓ DELETE /api/signage/:serviceKey/hq/*
✓ GET  /api/signage/:serviceKey/templates
✓ POST /api/signage/:serviceKey/templates
✓ PATCH /api/signage/:serviceKey/templates/:id
✓ DELETE /api/signage/:serviceKey/templates/:id
✓ PATCH /api/signage/:serviceKey/community/:id/approve

✗ /api/signage/admin/*                    (Admin only)
✗ /api/signage/:serviceKey/playlists      (Store CRUD)
✗ /api/signage/:serviceKey/schedules      (Store only)
✗ /api/signage/:otherService/*            (Service isolation)
```

### 4.4 UI 접근

```
✓ /signage/hq
✓ /signage/hq/playlists
✓ /signage/hq/media
✓ /signage/hq/templates
✓ /signage/hq/community
✓ /signage/hq/forced-items
✓ /signage/hq/analytics

✗ /digital-signage/*    (Admin dashboard)
✗ /signage/store/*      (Store frontend)
```

---

## 5. Store 접근 정책

### 5.1 허용 리소스

| 리소스 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| Own Playlists | ✓ | ✓ | ✓ | ✓ |
| Own Media | ✓ | ✓ | ✓ | ✓ |
| Own Schedules | ✓ | ✓ | ✓ | ✓ |
| Own Devices | ✓ | ✓ | ✓ | ✓ |
| Global Content | ✓ | ✗ | ✗ | ✗ |
| Clone Global | ✗ | ✓ | ✗ | ✗ |
| Templates | ✓ | ✗ | ✗ | ✗ |
| Community Submit | ✗ | ✓ | ✗ | ✗ |

### 5.2 금지 리소스

| 리소스 | 이유 |
|--------|------|
| HQ Content (CRUD) | Operator 전용 |
| Other Store Data | 매장 격리 |
| Templates (CRUD) | Operator 전용 |
| System Settings | Admin 전용 |
| Forced Items (Remove) | HQ 보호 |

### 5.3 특수 제한: Forced Items

```
┌─────────────────────────────────────────────────┐
│ Forced Item Actions                              │
├─────────────────────────────────────────────────┤
│ 삭제        ✗ 불가                              │
│ 내용 수정    ✗ 불가                              │
│ 순서 변경    ✓ (강제 아이템끼리만)                 │
│ 비활성화    ✗ 불가                              │
└─────────────────────────────────────────────────┘
```

### 5.4 API 접근

```
✓ GET  /api/signage/:serviceKey/playlists         (Own only)
✓ POST /api/signage/:serviceKey/playlists
✓ PATCH /api/signage/:serviceKey/playlists/:id    (Own only)
✓ DELETE /api/signage/:serviceKey/playlists/:id   (Own only)
✓ GET  /api/signage/:serviceKey/global/*          (Read only)
✓ POST /api/signage/:serviceKey/playlists/:id/clone
✓ POST /api/signage/:serviceKey/media/:id/clone
✓ GET  /api/signage/:serviceKey/schedules         (Own only)
✓ POST /api/signage/:serviceKey/schedules
✓ PATCH /api/signage/:serviceKey/schedules/:id    (Own only)
✓ DELETE /api/signage/:serviceKey/schedules/:id   (Own only)
✓ GET  /api/signage/:serviceKey/templates         (Read only)
✓ POST /api/signage/:serviceKey/community/submit

✗ /api/signage/admin/*                          (Admin only)
✗ /api/signage/:serviceKey/hq/*                 (Operator only)
✗ POST /api/signage/:serviceKey/templates       (Operator only)
```

### 5.5 UI 접근

```
✓ /signage/store
✓ /signage/store/playlists
✓ /signage/store/global
✓ /signage/store/media
✓ /signage/store/schedules
✓ /signage/store/devices

✗ /digital-signage/*    (Admin dashboard)
✗ /signage/hq/*         (Operator frontend)
```

---

## 6. Supplier 접근 정책

### 6.1 허용 리소스

| 리소스 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| Own Content | ✓ | ✓ | ✓ | ✓ |
| Pending Queue | ✓ | ✗ | ✗ | ✗ |
| Analytics (Own) | ✓ | ✗ | ✗ | ✗ |

### 6.2 API 접근

```
✓ GET  /api/signage/supplier/content
✓ POST /api/signage/supplier/content
✓ PATCH /api/signage/supplier/content/:id
✓ DELETE /api/signage/supplier/content/:id
✓ GET  /api/signage/supplier/analytics

✗ All other routes
```

---

## 7. 접근 검증 로직

### 7.1 서버 미들웨어

```typescript
// Admin check
function hasSignageAdminPermission(user: any): boolean {
  return user?.role === 'admin' ||
         user?.permissions?.includes('signage:admin');
}

// Operator check
function hasSignageOperatorPermission(user: any, serviceKey: string): boolean {
  if (hasSignageAdminPermission(user)) return true;
  return user?.permissions?.includes(`signage:${serviceKey}:operator`);
}

// Store check
function hasSignageStorePermission(user: any, organizationId: string): boolean {
  if (hasSignageAdminPermission(user)) return true;
  return user?.organizationId === organizationId ||
         user?.organizations?.includes(organizationId);
}
```

### 7.2 클라이언트 Guard

```tsx
// Admin Guard
<AdminSignageGuard>
  <Routes>...</Routes>
</AdminSignageGuard>

// Operator Guard
<OperatorSignageGuard serviceKey={serviceKey}>
  <Routes>...</Routes>
</OperatorSignageGuard>

// Store Guard
<StoreSignageGuard organizationId={organizationId}>
  <Routes>...</Routes>
</StoreSignageGuard>
```

---

## 8. 오류 응답

### 8.1 인증 오류

```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "NOT_AUTHENTICATED",
  "message": "Authentication required"
}
```

### 8.2 권한 오류

```json
{
  "success": false,
  "error": "Forbidden",
  "code": "SIGNAGE_ADMIN_REQUIRED",
  "message": "Signage admin permission required"
}
```

```json
{
  "success": false,
  "error": "Forbidden",
  "code": "SIGNAGE_OPERATOR_REQUIRED",
  "message": "Operator permission required for service: pharmacy"
}
```

```json
{
  "success": false,
  "error": "Forbidden",
  "code": "SIGNAGE_STORE_REQUIRED",
  "message": "You do not have access to this store"
}
```

---

## 9. 권한 매트릭스 요약

| 작업 | Admin | Operator | Store | Supplier |
|------|-------|----------|-------|----------|
| System Settings | ✓ | ✗ | ✗ | ✗ |
| Extension Management | ✓ | ✗ | ✗ | ✗ |
| Supplier Management | ✓ | ✗ | ✗ | ✗ |
| HQ Content CRUD | ✗ | ✓ | ✗ | ✗ |
| Template CRUD | ✗ | ✓ | ✗ | ✗ |
| Community Approve | ✗ | ✓ | ✗ | ✗ |
| Forced Item Set | ✗ | ✓ | ✗ | ✗ |
| Global Content Read | ✓ | ✓ | ✓ | ✗ |
| Store Content CRUD | ✗ | ✗ | ✓* | ✗ |
| Clone Global | ✗ | ✗ | ✓ | ✗ |
| Schedule CRUD | ✗ | ✗ | ✓* | ✗ |
| Device CRUD | ✗ | ✗ | ✓* | ✗ |
| Supplier Content CRUD | ✗ | ✗ | ✗ | ✓* |

*자신의 리소스만

---

## 10. 관련 문서

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Signage Routing Map V3](./SIGNAGE-ROUTING-MAP-V3.md)
- [Signage Menu Map V1](./SIGNAGE-MENU-MAP-V1.md)

---

*Last Updated: 2026-01-17*
