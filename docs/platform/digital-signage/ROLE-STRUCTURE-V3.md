# Digital Signage Role Structure V3

> Role Reform (RR-1)
> Version: 3.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Digital Signage 시스템의 **최종 역할 구조**를 정의합니다.
V2에서 발견된 역할 혼선을 완전히 제거하고, Admin/Operator/Store의 경계를 명확히 합니다.

### 핵심 원칙

1. **Admin**: 플랫폼 시스템 관리만 (HQ/Store 콘텐츠 관리 X)
2. **Operator (HQ)**: 글로벌 콘텐츠 생산/관리만 (Admin 설정 X, Store 개별 데이터 X)
3. **Store**: 매장 콘텐츠 관리만 (HQ 콘텐츠 생산 X)

---

## 2. 역할 정의 (최종)

### 2.1 Admin (시스템 관리자)

**위치**: `admin.neture.co.kr`
**권한 ID**: `signage:admin`

#### 허용 기능

| 기능 | 설명 |
|------|------|
| 시스템 설정 | Signage 글로벌 설정 관리 |
| Extension 관리 | 확장 앱 설치/제거/설정 |
| 공급자 관리 | Supplier 계정 승인/관리 |
| 전체 모니터링 | 시스템 레벨 상태 모니터링 |
| 전사 분석 | 전체 서비스 통합 분석 |

#### 금지 기능 (Admin에서 제거해야 함)

| 기능 | 이동 대상 |
|------|----------|
| HQ 플레이리스트 생성/편집 | → Operator |
| HQ 미디어 업로드 | → Operator |
| Store 플레이리스트 관리 | → Store |
| Store 스케줄 관리 | → Store |
| Store 디스플레이 설정 | → Store |

### 2.2 Operator (HQ 운영자)

**위치**: 각 서비스 Frontend (`/signage/hq/*`)
**권한 ID**: `signage:{serviceKey}:operator`

#### 허용 기능

| 기능 | 설명 |
|------|------|
| HQ 플레이리스트 CRUD | 글로벌 콘텐츠 생산 |
| HQ 미디어 CRUD | 글로벌 미디어 관리 |
| 강제 콘텐츠 설정 | Forced Item 지정 |
| Community 승인 | 커뮤니티 콘텐츠 심사 |
| 글로벌 스케줄 | 기본 스케줄 템플릿 |
| HQ 분석 | 글로벌 콘텐츠 성과 |

#### 금지 기능

| 기능 | 이유 |
|------|------|
| Admin 시스템 설정 | Admin 전용 |
| Store 개별 데이터 접근 | Store 전용 |
| Store 플레이리스트 편집 | Store 전용 |

### 2.3 Store (매장 사용자)

**위치**: 각 서비스 Frontend (`/signage/store/*`)
**권한 ID**: `signage:{serviceKey}:{organizationId}:store`

#### 허용 기능

| 기능 | 설명 |
|------|------|
| 내 플레이리스트 CRUD | 매장 자체 콘텐츠 |
| 글로벌 콘텐츠 Clone | HQ/Supplier/Community 복제 |
| 복제 콘텐츠 편집 | 복제 후 수정 |
| 스케줄 관리 | 매장 스케줄 |
| 디스플레이 관리 | 매장 장치 설정 |
| 미디어 라이브러리 | 매장 미디어 |

#### 제한 기능

| 기능 | 제한 |
|------|------|
| 강제 콘텐츠 | 순서 변경만 가능 |
| HQ 콘텐츠 | 읽기 전용 (Clone 가능) |

---

## 3. 라우팅 구조 (최종)

### 3.1 Admin Routes

**Base**: `admin.neture.co.kr/digital-signage`

```
/digital-signage
├── /                      # 시스템 대시보드
├── /settings              # 시스템 설정
├── /extensions            # 확장 앱 관리
├── /suppliers             # 공급자 관리
├── /analytics             # 전사 분석
└── /monitoring            # 시스템 모니터링
```

**제거된 경로** (V2 → V3):
- ~~`/templates`~~ → Operator로 이동 또는 Extension화
- ~~`/preview/store/*`~~ → 제거 (Store Frontend에서 접근)
- ~~`/preview/hq/*`~~ → 제거 (Operator Frontend에서 접근)

### 3.2 Operator (HQ) Routes

**Base**: `{service}.domain/signage/hq`

```
/signage/hq
├── /                      # HQ 대시보드
├── /playlists             # 글로벌 플레이리스트
│   ├── /new
│   └── /:id
├── /media                 # 글로벌 미디어
│   ├── /upload
│   └── /:id
├── /templates             # 서비스 템플릿
│   ├── /new
│   └── /:id
├── /community             # 커뮤니티 승인
├── /forced-items          # 강제 콘텐츠
└── /analytics             # HQ 분석
```

### 3.3 Store Routes

**Base**: `{service}.domain/signage/store`

```
/signage/store
├── /                      # 매장 대시보드
├── /playlists             # 내 플레이리스트
│   ├── /new
│   └── /:id
├── /global                # 글로벌 콘텐츠 브라우저
│   ├── /hq
│   ├── /supplier
│   └── /community
├── /media                 # 미디어 라이브러리
│   ├── /upload
│   └── /:id
├── /schedules             # 스케줄 관리
│   ├── /new
│   └── /:id
└── /devices               # 디바이스 관리
    ├── /new
    ├── /:id
    └── /channels
```

---

## 4. API 권한 구조

### 4.1 Admin API

**Prefix**: `/api/signage/admin/*`
**Guard**: `AdminGuard`

```typescript
// Admin 전용 API
router.use('/admin/*', adminGuard);

POST   /api/signage/admin/settings
GET    /api/signage/admin/extensions
POST   /api/signage/admin/extensions/:id/install
DELETE /api/signage/admin/extensions/:id
GET    /api/signage/admin/suppliers
POST   /api/signage/admin/suppliers
GET    /api/signage/admin/analytics
```

### 4.2 Operator (HQ) API

**Prefix**: `/api/signage/:serviceKey/hq/*`
**Guard**: `OperatorGuard`

```typescript
// HQ 운영자 전용 API
router.use('/:serviceKey/hq/*', operatorGuard);

POST   /api/signage/:serviceKey/hq/playlists
PATCH  /api/signage/:serviceKey/hq/playlists/:id
DELETE /api/signage/:serviceKey/hq/playlists/:id
POST   /api/signage/:serviceKey/hq/media
PATCH  /api/signage/:serviceKey/hq/media/:id
POST   /api/signage/:serviceKey/hq/forced-items
PATCH  /api/signage/:serviceKey/community/:id/approve
```

### 4.3 Store API

**Prefix**: `/api/signage/:serviceKey/store/*` (명시적) 또는 기존 API
**Guard**: `StoreGuard`

```typescript
// Store 사용자 API
router.use('/:serviceKey/playlists', storeGuard);
router.use('/:serviceKey/schedules', storeGuard);
router.use('/:serviceKey/media', storeGuard);

GET    /api/signage/:serviceKey/playlists
POST   /api/signage/:serviceKey/playlists
PATCH  /api/signage/:serviceKey/playlists/:id
DELETE /api/signage/:serviceKey/playlists/:id
POST   /api/signage/:serviceKey/playlists/:id/clone
GET    /api/signage/:serviceKey/global/playlists  // 읽기 전용
```

### 4.4 권한 매트릭스 (최종)

| API Group | Admin | Operator | Store |
|-----------|-------|----------|-------|
| `/admin/*` | ✓ | ✗ | ✗ |
| `/hq/*` | ✗ | ✓ | ✗ |
| `/global/*` (READ) | ✓ | ✓ | ✓ |
| `/playlists/*` (CRUD) | ✗ | ✗ | ✓ (own) |
| `/*/clone` | ✗ | ✗ | ✓ |
| `/schedules/*` | ✗ | ✗ | ✓ (own) |

---

## 5. Guard 구현

### 5.1 AdminGuard

```typescript
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user?.permissions?.includes('signage:admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
```

### 5.2 OperatorGuard

```typescript
export function operatorGuard(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const { serviceKey } = req.params;

  const hasPermission = user?.permissions?.includes(`signage:${serviceKey}:operator`);

  if (!hasPermission) {
    return res.status(403).json({ error: 'Operator access required' });
  }

  next();
}
```

### 5.3 StoreGuard

```typescript
export function storeGuard(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const { serviceKey } = req.params;
  const organizationId = req.headers['x-organization-id'] || req.body?.organizationId;

  // 해당 매장 소속 확인
  const belongsToOrg = user?.organizationId === organizationId ||
                       user?.organizations?.includes(organizationId);

  if (!belongsToOrg) {
    return res.status(403).json({ error: 'Store access required' });
  }

  next();
}
```

---

## 6. 프론트엔드 Guard

### 6.1 AdminSignageGuard

```tsx
export function AdminSignageGuard({ children }: { children: React.ReactNode }) {
  const { user, hasPermission } = useAuth();

  if (!hasPermission('signage:admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### 6.2 OperatorSignageGuard

```tsx
export function OperatorSignageGuard({
  serviceKey,
  children
}: {
  serviceKey: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(`signage:${serviceKey}:operator`)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### 6.3 StoreSignageGuard

```tsx
export function StoreSignageGuard({
  organizationId,
  children
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  const { user, belongsToOrganization } = useAuth();

  if (!belongsToOrganization(organizationId)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

---

## 7. 마이그레이션 체크리스트

### 7.1 Admin에서 제거할 항목

- [ ] `/digital-signage/preview/store/*` 라우트 제거
- [ ] `/digital-signage/preview/hq/*` 라우트 제거
- [ ] `/digital-signage/templates` → Extension 또는 제거
- [ ] `/digital-signage/v2/*` 레거시 리다이렉트 제거

### 7.2 Operator에 추가할 항목

- [ ] `/signage/hq` 라우터 생성 (Service Frontend)
- [ ] HQContentManager 이동
- [ ] HQ 플레이리스트/미디어 CRUD 화면

### 7.3 Store에 확인할 항목

- [ ] `/signage/store` 라우터 존재 확인
- [ ] StoreSignageDashboard 정상 동작
- [ ] Global Content 3탭 브라우저

---

## 8. 관련 문서

- [Signage Routing Map V3](./SIGNAGE-ROUTING-MAP-V3.md)
- [Role Access Policy V1](./ROLE-ACCESS-POLICY-V1.md)
- [Signage Menu Map V1](./SIGNAGE-MENU-MAP-V1.md)

---

*Last Updated: 2026-01-17*
