# Digital Signage Routing Map V2

> Phase 2 Refinement (R-1)
> Version: 2.0
> Date: 2026-01-17
> Status: Active

---

## 1. 라우팅 구조 개요

Digital Signage는 세 개의 독립된 라우팅 영역으로 분리됩니다:

1. **Admin Dashboard** - 시스템 관리자 전용
2. **Service Frontend** - HQ 운영자 전용
3. **Store Dashboard** - 매장 전용

---

## 2. Admin Dashboard 라우팅

**Base URL**: `admin.neture.co.kr/digital-signage`

```
/digital-signage
├── /                           # 시스템 대시보드 (모니터링)
├── /settings                   # 시스템 설정
│   ├── /general               # 일반 설정
│   ├── /defaults              # 기본값 설정
│   └── /policies              # 정책 관리
├── /suppliers                  # 공급자 관리
│   ├── /                      # 공급자 목록
│   ├── /new                   # 공급자 등록
│   └── /:supplierId           # 공급자 상세/편집
├── /extensions                 # 확장 앱 관리
│   ├── /                      # 설치된 확장 목록
│   ├── /marketplace           # 마켓플레이스
│   └── /:extensionId          # 확장 설정
├── /templates                  # 글로벌 템플릿
│   ├── /                      # 템플릿 목록
│   ├── /new                   # 템플릿 생성
│   └── /:templateId           # 템플릿 편집
├── /layout-presets             # 레이아웃 프리셋
│   ├── /                      # 프리셋 목록
│   ├── /new                   # 프리셋 생성
│   └── /:presetId             # 프리셋 편집
├── /content-blocks             # 콘텐츠 블록
│   ├── /                      # 블록 목록
│   └── /:blockId              # 블록 편집
├── /analytics                  # 분석/리포트
│   ├── /                      # 대시보드
│   ├── /usage                 # 사용량 분석
│   └── /content               # 콘텐츠 성과
└── /operations                 # 운영 (Phase 12 레거시)
    ├── /                      # 운영 대시보드
    ├── /history               # 액션 히스토리
    ├── /display-status        # 디스플레이 상태
    └── /problems              # 문제 추적
```

### Admin Router 구현

```typescript
// apps/admin-dashboard/src/pages/digital-signage/AdminSignageRouter.tsx

export default function AdminSignageRouter() {
  return (
    <AdminGuard>
      <Routes>
        {/* System Dashboard */}
        <Route path="/" element={<SystemDashboard />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<GeneralSettings />} />
          <Route path="defaults" element={<DefaultSettings />} />
          <Route path="policies" element={<PolicySettings />} />
        </Route>

        {/* Suppliers */}
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:supplierId" element={<SupplierForm />} />

        {/* Extensions */}
        <Route path="extensions" element={<ExtensionList />} />
        <Route path="extensions/marketplace" element={<ExtensionMarketplace />} />
        <Route path="extensions/:extensionId" element={<ExtensionSettings />} />

        {/* Templates */}
        <Route path="templates" element={<TemplateList />} />
        <Route path="templates/new" element={<TemplateBuilder />} />
        <Route path="templates/:templateId" element={<TemplateBuilder />} />

        {/* Layout Presets */}
        <Route path="layout-presets" element={<LayoutPresetList />} />
        <Route path="layout-presets/new" element={<LayoutPresetEditor />} />
        <Route path="layout-presets/:presetId" element={<LayoutPresetEditor />} />

        {/* Content Blocks */}
        <Route path="content-blocks" element={<ContentBlockLibrary />} />
        <Route path="content-blocks/:blockId" element={<ContentBlockEditor />} />

        {/* Analytics */}
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="analytics/usage" element={<UsageAnalytics />} />
        <Route path="analytics/content" element={<ContentAnalytics />} />

        {/* Operations (Legacy) */}
        <Route path="operations" element={<OperationsDashboard />} />
        <Route path="operations/history" element={<ActionHistory />} />
        <Route path="operations/display-status" element={<DisplayStatusMap />} />
        <Route path="operations/problems" element={<ProblemTracking />} />
      </Routes>
    </AdminGuard>
  );
}
```

---

## 3. Service Frontend 라우팅 (HQ 운영자)

**Base URL**: `{service-domain}/signage/hq`

각 서비스 Frontend에서 HQ 운영자가 접근합니다.

```
/signage/hq
├── /                           # HQ 대시보드 (통계, 빠른 액션)
├── /playlists                  # HQ 플레이리스트 관리
│   ├── /                      # 플레이리스트 목록
│   ├── /new                   # 플레이리스트 생성
│   └── /:playlistId           # 플레이리스트 편집
├── /media                      # HQ 미디어 관리
│   ├── /                      # 미디어 라이브러리
│   ├── /upload                # 미디어 업로드
│   └── /:mediaId              # 미디어 상세
├── /community                  # 커뮤니티 콘텐츠 관리
│   ├── /                      # 승인 대기 목록
│   ├── /approved              # 승인된 콘텐츠
│   └── /:contentId            # 콘텐츠 상세/승인
├── /forced-items               # 강제 콘텐츠 관리
│   ├── /                      # 강제 콘텐츠 목록
│   └── /settings              # 강제 콘텐츠 정책
├── /schedules                  # 글로벌 기본 스케줄
│   ├── /                      # 스케줄 목록
│   └── /defaults              # 기본 스케줄 설정
└── /stats                      # 콘텐츠 통계
    ├── /                      # 통계 대시보드
    ├── /downloads             # 다운로드 통계
    └── /engagement            # 참여도 분석
```

### HQ Operator Router 구현

```typescript
// apps/{service}-web/src/pages/signage/HQSignageRouter.tsx

export default function HQSignageRouter() {
  const { serviceKey } = useServiceContext();

  return (
    <OperatorGuard serviceKey={serviceKey}>
      <Routes>
        {/* HQ Dashboard */}
        <Route path="/" element={<HQDashboard />} />

        {/* Playlists */}
        <Route path="playlists" element={<HQPlaylistList />} />
        <Route path="playlists/new" element={<HQPlaylistEditor />} />
        <Route path="playlists/:playlistId" element={<HQPlaylistEditor />} />

        {/* Media */}
        <Route path="media" element={<HQMediaLibrary />} />
        <Route path="media/upload" element={<HQMediaUpload />} />
        <Route path="media/:mediaId" element={<HQMediaDetail />} />

        {/* Community */}
        <Route path="community" element={<CommunityPendingList />} />
        <Route path="community/approved" element={<CommunityApprovedList />} />
        <Route path="community/:contentId" element={<CommunityContentReview />} />

        {/* Forced Items */}
        <Route path="forced-items" element={<ForcedItemList />} />
        <Route path="forced-items/settings" element={<ForcedItemSettings />} />

        {/* Schedules */}
        <Route path="schedules" element={<GlobalScheduleList />} />
        <Route path="schedules/defaults" element={<DefaultScheduleSettings />} />

        {/* Stats */}
        <Route path="stats" element={<ContentStatsDashboard />} />
        <Route path="stats/downloads" element={<DownloadStats />} />
        <Route path="stats/engagement" element={<EngagementStats />} />
      </Routes>
    </OperatorGuard>
  );
}
```

---

## 4. Store Dashboard 라우팅

**Base URL**: `{service-domain}/signage/store`

매장 사용자가 접근합니다.

```
/signage/store
├── /                           # 매장 사이니지 대시보드
├── /playlists                  # 내 플레이리스트
│   ├── /                      # 플레이리스트 목록
│   ├── /new                   # 플레이리스트 생성
│   └── /:playlistId           # 플레이리스트 편집
├── /global                     # 글로벌 콘텐츠 브라우저
│   ├── /                      # 전체 (탭 포함)
│   ├── /hq                    # HQ 콘텐츠
│   ├── /supplier              # 공급자 콘텐츠
│   └── /community             # 커뮤니티 콘텐츠
├── /schedules                  # 스케줄 관리
│   ├── /                      # 캘린더 뷰
│   ├── /new                   # 스케줄 생성
│   └── /:scheduleId           # 스케줄 편집
├── /media                      # 미디어 라이브러리
│   ├── /                      # 미디어 목록
│   ├── /upload                # 미디어 업로드
│   └── /:mediaId              # 미디어 상세
└── /devices                    # 디바이스/채널 관리
    ├── /                      # 디스플레이 목록
    ├── /new                   # 디스플레이 등록
    ├── /:displayId            # 디스플레이 상세
    └── /channels              # 채널 관리
```

### Store Router 구현

```typescript
// apps/{service}-web/src/pages/signage/StoreSignageRouter.tsx

export default function StoreSignageRouter() {
  const { organizationId } = useOrganizationContext();

  return (
    <StoreGuard organizationId={organizationId}>
      <Routes>
        {/* Store Dashboard */}
        <Route path="/" element={<StoreDashboard />} />

        {/* Playlists */}
        <Route path="playlists" element={<StorePlaylistList />} />
        <Route path="playlists/new" element={<StorePlaylistEditor />} />
        <Route path="playlists/:playlistId" element={<StorePlaylistEditor />} />

        {/* Global Content Browser */}
        <Route path="global" element={<GlobalContentBrowser />}>
          <Route index element={<GlobalContentAll />} />
          <Route path="hq" element={<GlobalContentHQ />} />
          <Route path="supplier" element={<GlobalContentSupplier />} />
          <Route path="community" element={<GlobalContentCommunity />} />
        </Route>

        {/* Schedules */}
        <Route path="schedules" element={<StoreScheduleCalendar />} />
        <Route path="schedules/new" element={<StoreScheduleEditor />} />
        <Route path="schedules/:scheduleId" element={<StoreScheduleEditor />} />

        {/* Media */}
        <Route path="media" element={<StoreMediaLibrary />} />
        <Route path="media/upload" element={<StoreMediaUpload />} />
        <Route path="media/:mediaId" element={<StoreMediaDetail />} />

        {/* Devices */}
        <Route path="devices" element={<StoreDisplayList />} />
        <Route path="devices/new" element={<StoreDisplayForm />} />
        <Route path="devices/:displayId" element={<StoreDisplayDetail />} />
        <Route path="devices/channels" element={<StoreChannelList />} />
      </Routes>
    </StoreGuard>
  );
}
```

---

## 5. 현재 → 목표 라우팅 마이그레이션

### 5.1 Admin Dashboard 마이그레이션

| 현재 경로 | 목표 경로 | 상태 |
|-----------|-----------|------|
| `/digital-signage/operations` | `/digital-signage/` | 유지 |
| `/digital-signage/v2/monitoring` | `/digital-signage/` | 통합 |
| `/digital-signage/v2/templates` | `/digital-signage/templates` | 이동 |
| `/digital-signage/v2/content-blocks` | `/digital-signage/content-blocks` | 이동 |
| `/digital-signage/v2/layout-presets` | `/digital-signage/layout-presets` | 이동 |
| `/digital-signage/v2/hq` | 제거 (→ Service Frontend) | 이동 |

### 5.2 Store Dashboard 마이그레이션

| 현재 경로 | 목표 경로 | 상태 |
|-----------|-----------|------|
| `/digital-signage/v2/store` | `/signage/store/global` | 이동 |
| `/digital-signage/v2/channels` | `/signage/store/devices/channels` | 이동 |
| `/digital-signage/v2/playlists` | `/signage/store/playlists` | 이동 |
| `/digital-signage/v2/media` | `/signage/store/media` | 이동 |
| `/digital-signage/v2/schedules` | `/signage/store/schedules` | 이동 |

---

## 6. 네비게이션 메뉴 구조

### 6.1 Admin Dashboard 사이드바

```
Digital Signage
├── 대시보드
├── 설정
│   ├── 일반
│   ├── 기본값
│   └── 정책
├── 공급자 관리
├── 확장 앱
├── 템플릿
├── 레이아웃
├── 콘텐츠 블록
├── 분석
│   ├── 대시보드
│   ├── 사용량
│   └── 콘텐츠
└── 운영
    ├── 대시보드
    ├── 히스토리
    ├── 디스플레이 상태
    └── 문제 추적
```

### 6.2 HQ 운영자 사이드바 (Service Frontend)

```
사이니지 관리
├── 대시보드
├── 플레이리스트
├── 미디어
├── 커뮤니티
├── 강제 콘텐츠
├── 스케줄
└── 통계
```

### 6.3 Store Dashboard 사이드바

```
사이니지
├── 대시보드
├── 내 플레이리스트
├── 글로벌 콘텐츠
│   ├── HQ
│   ├── 공급자
│   └── 커뮤니티
├── 스케줄
├── 미디어
└── 디바이스
```

---

## 7. 권한별 라우트 가드

```typescript
// 라우트 가드 타입 정의
type RouteGuardConfig = {
  path: string;
  guard: 'admin' | 'operator' | 'store' | 'public';
  permissions?: string[];
};

// Admin Routes
const adminRoutes: RouteGuardConfig[] = [
  { path: '/digital-signage/**', guard: 'admin' },
];

// Operator Routes
const operatorRoutes: RouteGuardConfig[] = [
  { path: '/signage/hq/**', guard: 'operator', permissions: ['signage:hq:read'] },
];

// Store Routes
const storeRoutes: RouteGuardConfig[] = [
  { path: '/signage/store/**', guard: 'store', permissions: ['signage:store:read'] },
];
```

---

## 8. 관련 문서

- [Role Structure V2](./ROLE-STRUCTURE-V2.md)
- [Sprint 2-7 Integration Test Plan](./SPRINT-2-7-INTEGRATION-TEST-PLAN.md)
- [Admin Access Policy](./ADMIN-ACCESS-POLICY.md)

---

*Last Updated: 2026-01-17*
