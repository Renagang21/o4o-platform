# Digital Signage Role Structure V2

> Phase 2 Refinement (R-1)
> Version: 2.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

Digital Signage Phase 2에서 **관리자(Admin)**, **운영자(Operator)**, **매장(Store)** 역할을 명확히 구분합니다.

### 핵심 원칙

1. **관리자(Admin)**: 시스템 전체 관리, admin.neture.co.kr에서만 접근
2. **운영자(Operator)**: 서비스별 HQ 콘텐츠 관리, 각 서비스 Frontend에서 접근
3. **매장(Store)**: 개별 매장 콘텐츠 관리, Store Dashboard에서 접근

---

## 2. 역할별 권한 매트릭스

### 2.1 관리자 (Admin)

| 기능 | 권한 | 위치 |
|------|------|------|
| 서비스별 Signage 설정 | CRUD | Admin Dashboard |
| 공급자(Supplier) 권한 관리 | CRUD | Admin Dashboard |
| Extension App 설치/관리 | CRUD | Admin Dashboard |
| Analytics 확장 관리 | CRUD | Admin Dashboard |
| System-level 정책 관리 | CRUD | Admin Dashboard |
| 전체 디스플레이 모니터링 | Read | Admin Dashboard |
| 글로벌 템플릿 관리 | CRUD | Admin Dashboard |
| 레이아웃 프리셋 관리 | CRUD | Admin Dashboard |

### 2.2 운영자 (Operator / HQ)

| 기능 | 권한 | 위치 |
|------|------|------|
| HQ 글로벌 플레이리스트 생성 | CRUD | Service Frontend |
| HQ 글로벌 미디어 생성 | CRUD | Service Frontend |
| 커뮤니티 콘텐츠 승인/관리 | CRUD | Service Frontend |
| 강제 콘텐츠(Forced) 지정 | CRUD | Service Frontend |
| 서비스 이벤트/프로모션 제작 | CRUD | Service Frontend |
| 글로벌 스케줄 기본값 설정 | CRUD | Service Frontend |
| 매장 콘텐츠 모니터링 | Read | Service Frontend |

### 2.3 매장 (Store)

| 기능 | 권한 | 위치 |
|------|------|------|
| 내 플레이리스트 관리 | CRUD | Store Dashboard |
| 글로벌 콘텐츠 복제(Clone) | Create | Store Dashboard |
| 복제된 콘텐츠 편집 | Update | Store Dashboard |
| 스케줄 관리 | CRUD | Store Dashboard |
| 디스플레이/채널 설정 | CRUD | Store Dashboard |
| 미디어 라이브러리 관리 | CRUD | Store Dashboard |
| 강제 콘텐츠 수신 | Read | Store Dashboard |
| 강제 콘텐츠 순서 조정 | Update (순서만) | Store Dashboard |

---

## 3. 콘텐츠 소스별 권한

### 3.1 Source: HQ

| 역할 | Create | Read | Update | Delete | Clone |
|------|--------|------|--------|--------|-------|
| Admin | - | O | - | - | - |
| Operator | O | O | O | O | - |
| Store | - | O | - | - | O |

### 3.2 Source: Supplier

| 역할 | Create | Read | Update | Delete | Clone |
|------|--------|------|--------|--------|-------|
| Admin | O (권한부여) | O | - | O | - |
| Operator | - | O | - | - | - |
| Store | - | O | - | - | O |
| Supplier | O | O | O | O | - |

### 3.3 Source: Community

| 역할 | Create | Read | Update | Delete | Clone |
|------|--------|------|--------|--------|-------|
| Admin | - | O | - | O | - |
| Operator | - | O | O (승인) | O | - |
| Store | O (제출) | O | O (본인것) | O (본인것) | O |

### 3.4 Source: Store

| 역할 | Create | Read | Update | Delete | Clone |
|------|--------|------|--------|--------|-------|
| Admin | - | O | - | - | - |
| Operator | - | O | - | - | - |
| Store | O | O | O | O | - |

---

## 4. 강제 콘텐츠 (Forced Items) 규칙

### 4.1 강제 콘텐츠 지정

- **지정 권한**: Operator (HQ) 만 가능
- **적용 대상**: HQ 글로벌 플레이리스트의 아이템
- **필드**: `isForced: boolean`

### 4.2 매장에서의 강제 콘텐츠 처리

| 작업 | 허용 |
|------|------|
| 삭제 | X |
| 수정 | X |
| 순서 변경 | O (다른 강제 아이템과만) |
| 비활성화 | X |

### 4.3 Clone 시 강제 콘텐츠

- Clone된 플레이리스트에서 `isForced`는 **false**로 초기화
- 단, 원본 HQ 플레이리스트를 참조하는 경우 강제 아이템은 자동 동기화

---

## 5. API 권한 매핑

### 5.1 Admin 전용 API

```
POST   /api/signage/admin/settings
GET    /api/signage/admin/suppliers
POST   /api/signage/admin/suppliers
DELETE /api/signage/admin/suppliers/:id
GET    /api/signage/admin/analytics
```

### 5.2 Operator (HQ) API

```
POST   /api/signage/:serviceKey/hq/playlists
PATCH  /api/signage/:serviceKey/hq/playlists/:id
DELETE /api/signage/:serviceKey/hq/playlists/:id
POST   /api/signage/:serviceKey/hq/media
PATCH  /api/signage/:serviceKey/hq/media/:id
DELETE /api/signage/:serviceKey/hq/media/:id
POST   /api/signage/:serviceKey/hq/forced-items
PATCH  /api/signage/:serviceKey/community/:id/approve
```

### 5.3 Store API

```
GET    /api/signage/:serviceKey/global/playlists
GET    /api/signage/:serviceKey/global/media
POST   /api/signage/:serviceKey/playlists/:id/clone
POST   /api/signage/:serviceKey/media/:id/clone
POST   /api/signage/:serviceKey/playlists
PATCH  /api/signage/:serviceKey/playlists/:id
DELETE /api/signage/:serviceKey/playlists/:id
POST   /api/signage/:serviceKey/schedules
PATCH  /api/signage/:serviceKey/schedules/:id
```

---

## 6. UI 접근 매핑

### 6.1 Admin Dashboard (admin.neture.co.kr)

```
/admin/digital-signage                  # 대시보드
/admin/digital-signage/settings         # 시스템 설정
/admin/digital-signage/suppliers        # 공급자 관리
/admin/digital-signage/extensions       # 확장 앱 관리
/admin/digital-signage/analytics        # 분석
/admin/digital-signage/templates        # 글로벌 템플릿
/admin/digital-signage/layout-presets   # 레이아웃 프리셋
```

### 6.2 Service Frontend (HQ 운영자)

```
/signage/hq                    # HQ 대시보드
/signage/hq/playlists          # HQ 플레이리스트 관리
/signage/hq/playlists/new      # HQ 플레이리스트 생성
/signage/hq/playlists/:id      # HQ 플레이리스트 편집
/signage/hq/media              # HQ 미디어 관리
/signage/hq/community          # 커뮤니티 콘텐츠 승인
/signage/hq/stats              # 콘텐츠 통계
```

### 6.3 Store Dashboard

```
/signage/store                 # 매장 대시보드
/signage/store/playlists       # 내 플레이리스트
/signage/store/playlists/new   # 플레이리스트 생성
/signage/store/playlists/:id   # 플레이리스트 편집
/signage/store/global          # 글로벌 콘텐츠 브라우저
/signage/store/schedules       # 스케줄 관리
/signage/store/media           # 미디어 라이브러리
/signage/store/devices         # 디스플레이/채널 관리
```

---

## 7. 권한 가드 구현

### 7.1 Admin Guard

```typescript
// Admin Dashboard에서 사용
const AdminSignageGuard: React.FC = ({ children }) => {
  const { user } = useAuth();

  if (!user?.roles?.includes('admin')) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

### 7.2 Operator Guard

```typescript
// Service Frontend에서 사용
const OperatorSignageGuard: React.FC<{ serviceKey: string }> = ({
  serviceKey,
  children
}) => {
  const { user, hasPermission } = useAuth();

  if (!hasPermission(`signage:${serviceKey}:operator`)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

### 7.3 Store Guard

```typescript
// Store Dashboard에서 사용
const StoreSignageGuard: React.FC<{ organizationId: string }> = ({
  organizationId,
  children
}) => {
  const { user, belongsToOrganization } = useAuth();

  if (!belongsToOrganization(organizationId)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

---

## 8. 마이그레이션 체크리스트

### 8.1 현재 상태 → 목표 상태

| 현재 경로 | 목표 경로 | 역할 |
|-----------|-----------|------|
| `/digital-signage/v2/hq` | Admin: `/admin/digital-signage/hq` 또는 Frontend: `/signage/hq` | Operator |
| `/digital-signage/v2/store` | `/signage/store` | Store |
| `/digital-signage/v2/monitoring` | Admin: `/admin/digital-signage` | Admin |
| `/digital-signage/v2/channels` | Store: `/signage/store/devices` | Store |
| `/digital-signage/v2/playlists` | Store: `/signage/store/playlists` | Store |
| `/digital-signage/v2/templates` | Admin: `/admin/digital-signage/templates` | Admin |

### 8.2 API 마이그레이션

- [x] HQ API 분리 완료 (Sprint 2-6)
- [x] Clone API 구현 완료 (Sprint 2-6)
- [ ] Admin 전용 API 분리 (R-1)
- [ ] 권한 미들웨어 적용 (R-1)

---

## 9. 관련 문서

- [Sprint 2-6 Work Order](../../../docs/_work-orders/WO-DIGITAL-SIGNAGE-GLOBAL-CONTENT-V2.md)
- [Sprint 2-7 Integration Test Plan](./SPRINT-2-7-INTEGRATION-TEST-PLAN.md)
- [Signage Routing Map V2](./SIGNAGE-ROUTING-MAP-V2.md)

---

*Last Updated: 2026-01-17*
