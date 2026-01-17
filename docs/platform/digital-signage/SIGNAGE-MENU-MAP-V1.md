# Digital Signage Menu Map V1

> Role Reform (RR-1)
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Digital Signage의 **네비게이션 메뉴 구조**를 정의합니다.
Admin, Operator (HQ), Store 별로 독립된 메뉴 구조를 가집니다.

---

## 2. Admin 메뉴 (admin.neture.co.kr)

### 2.1 사이드바 구조

```
Digital Signage
├── 📊 모니터링          /digital-signage/monitoring
├── ⚙️ 설정             /digital-signage/settings
├── 🧩 확장 앱          /digital-signage/extensions
├── 🏭 공급자 관리       /digital-signage/suppliers
├── 📈 분석             /digital-signage/analytics
└── 🔧 운영
    ├── 대시보드         /digital-signage/operations
    ├── 히스토리         /digital-signage/operations/history
    ├── 디스플레이 상태   /digital-signage/operations/display-status
    └── 문제 추적        /digital-signage/operations/problems
```

### 2.2 메뉴 아이템 정의

| 메뉴 | 아이콘 | 경로 | 설명 |
|------|--------|------|------|
| 모니터링 | `Monitor` | `/digital-signage/monitoring` | 시스템 상태 모니터링 |
| 설정 | `Settings` | `/digital-signage/settings` | 시스템 설정 |
| 확장 앱 | `Puzzle` | `/digital-signage/extensions` | Extension 관리 |
| 공급자 관리 | `Building` | `/digital-signage/suppliers` | Supplier 관리 |
| 분석 | `BarChart` | `/digital-signage/analytics` | 전사 분석 |
| 운영 | `Wrench` | `/digital-signage/operations` | 운영 대시보드 |

### 2.3 Admin 메뉴 접근 권한

```typescript
// Required permission
permission: 'signage:admin'

// Or role
role: 'admin' | 'super_admin'
```

---

## 3. Operator (HQ) 메뉴 (Service Frontend)

### 3.1 사이드바 구조

```
사이니지 관리
├── 📊 대시보드          /signage/hq
├── 📝 플레이리스트      /signage/hq/playlists
├── 🖼️ 미디어           /signage/hq/media
├── 📋 템플릿           /signage/hq/templates
├── 👥 커뮤니티          /signage/hq/community
├── ⚡ 강제 콘텐츠        /signage/hq/forced-items
└── 📈 분석             /signage/hq/analytics
    ├── 다운로드 통계    /signage/hq/analytics/downloads
    └── 참여도 분석     /signage/hq/analytics/engagement
```

### 3.2 메뉴 아이템 정의

| 메뉴 | 아이콘 | 경로 | 설명 |
|------|--------|------|------|
| 대시보드 | `LayoutDashboard` | `/signage/hq` | HQ 대시보드 |
| 플레이리스트 | `ListVideo` | `/signage/hq/playlists` | 글로벌 플레이리스트 |
| 미디어 | `Image` | `/signage/hq/media` | 글로벌 미디어 |
| 템플릿 | `FileText` | `/signage/hq/templates` | 서비스 템플릿 |
| 커뮤니티 | `Users` | `/signage/hq/community` | 커뮤니티 콘텐츠 승인 |
| 강제 콘텐츠 | `Zap` | `/signage/hq/forced-items` | 강제 항목 관리 |
| 분석 | `BarChart` | `/signage/hq/analytics` | HQ 콘텐츠 분석 |

### 3.3 Operator 메뉴 접근 권한

```typescript
// Required permission
permission: `signage:${serviceKey}:operator`

// Example
permission: 'signage:pharmacy:operator'
```

---

## 4. Store 메뉴 (Service Frontend)

### 4.1 사이드바 구조

```
사이니지
├── 📊 대시보드          /signage/store
├── 📝 내 플레이리스트    /signage/store/playlists
├── 🌐 글로벌 콘텐츠
│   ├── 전체            /signage/store/global
│   ├── HQ             /signage/store/global/hq
│   ├── 공급자          /signage/store/global/supplier
│   └── 커뮤니티        /signage/store/global/community
├── 🖼️ 미디어           /signage/store/media
├── 📅 스케줄           /signage/store/schedules
└── 📺 디바이스
    ├── 디스플레이       /signage/store/devices
    └── 채널            /signage/store/devices/channels
```

### 4.2 메뉴 아이템 정의

| 메뉴 | 아이콘 | 경로 | 설명 |
|------|--------|------|------|
| 대시보드 | `LayoutDashboard` | `/signage/store` | 매장 대시보드 |
| 내 플레이리스트 | `ListVideo` | `/signage/store/playlists` | 매장 플레이리스트 |
| 글로벌 콘텐츠 | `Globe` | `/signage/store/global` | 글로벌 콘텐츠 브라우저 |
| 미디어 | `Image` | `/signage/store/media` | 미디어 라이브러리 |
| 스케줄 | `Calendar` | `/signage/store/schedules` | 스케줄 관리 |
| 디바이스 | `Monitor` | `/signage/store/devices` | 디바이스 관리 |

### 4.3 Store 메뉴 접근 권한

```typescript
// User must belong to the organization
user.organizationId === currentOrganizationId
// or
user.organizations.includes(currentOrganizationId)
```

---

## 5. 글로벌 콘텐츠 브라우저 (Store)

### 5.1 3탭 UI 구조

```
┌─────────────────────────────────────────────────┐
│  [ HQ ]  [ 공급자 ]  [ 커뮤니티 ]                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │     │  │     │  │     │  │     │            │
│  │     │  │     │  │     │  │     │            │
│  └─────┘  └─────┘  └─────┘  └─────┘            │
│  Playlist  Playlist  Playlist  Playlist         │
│                                                 │
│  [ Clone ]          [ Clone ]                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 탭 정의

| 탭 | 경로 | source 필터 | 설명 |
|----|------|-------------|------|
| HQ | `/signage/store/global/hq` | `hq` | 본부 제공 콘텐츠 |
| 공급자 | `/signage/store/global/supplier` | `supplier` | 공급업체 콘텐츠 |
| 커뮤니티 | `/signage/store/global/community` | `community` | 커뮤니티 공유 콘텐츠 |

### 5.3 카드 액션

```typescript
interface ContentCardActions {
  preview: () => void;      // 미리보기 팝업
  clone: () => void;        // 내 플레이리스트로 복제
  like: () => void;         // 좋아요 (커뮤니티)
  report: () => void;       // 신고 (커뮤니티)
}
```

---

## 6. 메뉴 컴포넌트 구현

### 6.1 Admin Menu Component

```tsx
// apps/admin-dashboard/src/components/signage/SignageAdminMenu.tsx

export const signageAdminMenuItems: MenuItem[] = [
  {
    id: 'signage-monitoring',
    label: '모니터링',
    icon: 'Monitor',
    path: '/digital-signage/monitoring',
  },
  {
    id: 'signage-settings',
    label: '설정',
    icon: 'Settings',
    path: '/digital-signage/settings',
  },
  {
    id: 'signage-extensions',
    label: '확장 앱',
    icon: 'Puzzle',
    path: '/digital-signage/extensions',
  },
  {
    id: 'signage-suppliers',
    label: '공급자 관리',
    icon: 'Building',
    path: '/digital-signage/suppliers',
  },
  {
    id: 'signage-analytics',
    label: '분석',
    icon: 'BarChart',
    path: '/digital-signage/analytics',
  },
  {
    id: 'signage-operations',
    label: '운영',
    icon: 'Wrench',
    path: '/digital-signage/operations',
    children: [
      { id: 'ops-dashboard', label: '대시보드', path: '/digital-signage/operations' },
      { id: 'ops-history', label: '히스토리', path: '/digital-signage/operations/history' },
      { id: 'ops-display', label: '디스플레이 상태', path: '/digital-signage/operations/display-status' },
      { id: 'ops-problems', label: '문제 추적', path: '/digital-signage/operations/problems' },
    ],
  },
];
```

### 6.2 Operator (HQ) Menu Component

```tsx
// apps/{service}-web/src/components/signage/SignageHQMenu.tsx

export const signageHQMenuItems: MenuItem[] = [
  {
    id: 'hq-dashboard',
    label: '대시보드',
    icon: 'LayoutDashboard',
    path: '/signage/hq',
  },
  {
    id: 'hq-playlists',
    label: '플레이리스트',
    icon: 'ListVideo',
    path: '/signage/hq/playlists',
  },
  {
    id: 'hq-media',
    label: '미디어',
    icon: 'Image',
    path: '/signage/hq/media',
  },
  {
    id: 'hq-templates',
    label: '템플릿',
    icon: 'FileText',
    path: '/signage/hq/templates',
  },
  {
    id: 'hq-community',
    label: '커뮤니티',
    icon: 'Users',
    path: '/signage/hq/community',
  },
  {
    id: 'hq-forced',
    label: '강제 콘텐츠',
    icon: 'Zap',
    path: '/signage/hq/forced-items',
  },
  {
    id: 'hq-analytics',
    label: '분석',
    icon: 'BarChart',
    path: '/signage/hq/analytics',
  },
];
```

### 6.3 Store Menu Component

```tsx
// apps/{service}-web/src/components/signage/SignageStoreMenu.tsx

export const signageStoreMenuItems: MenuItem[] = [
  {
    id: 'store-dashboard',
    label: '대시보드',
    icon: 'LayoutDashboard',
    path: '/signage/store',
  },
  {
    id: 'store-playlists',
    label: '내 플레이리스트',
    icon: 'ListVideo',
    path: '/signage/store/playlists',
  },
  {
    id: 'store-global',
    label: '글로벌 콘텐츠',
    icon: 'Globe',
    path: '/signage/store/global',
    children: [
      { id: 'global-hq', label: 'HQ', path: '/signage/store/global/hq' },
      { id: 'global-supplier', label: '공급자', path: '/signage/store/global/supplier' },
      { id: 'global-community', label: '커뮤니티', path: '/signage/store/global/community' },
    ],
  },
  {
    id: 'store-media',
    label: '미디어',
    icon: 'Image',
    path: '/signage/store/media',
  },
  {
    id: 'store-schedules',
    label: '스케줄',
    icon: 'Calendar',
    path: '/signage/store/schedules',
  },
  {
    id: 'store-devices',
    label: '디바이스',
    icon: 'Monitor',
    path: '/signage/store/devices',
    children: [
      { id: 'devices-list', label: '디스플레이', path: '/signage/store/devices' },
      { id: 'devices-channels', label: '채널', path: '/signage/store/devices/channels' },
    ],
  },
];
```

---

## 7. 브레드크럼 구조

### 7.1 Admin 브레드크럼

```
Digital Signage > 모니터링
Digital Signage > 설정
Digital Signage > 운영 > 히스토리
```

### 7.2 Operator 브레드크럼

```
사이니지 관리 > 대시보드
사이니지 관리 > 플레이리스트 > 새 플레이리스트
사이니지 관리 > 템플릿 > Summer Template
```

### 7.3 Store 브레드크럼

```
사이니지 > 대시보드
사이니지 > 내 플레이리스트 > 편집
사이니지 > 글로벌 콘텐츠 > HQ
사이니지 > 스케줄 > 새 스케줄
```

---

## 8. 모바일 메뉴 (Store)

### 8.1 하단 탭 바

```
┌─────────────────────────────────────┐
│                                     │
│          [ Main Content ]           │
│                                     │
├─────────────────────────────────────┤
│  🏠   📝   🌐   📅   📺             │
│ 홈  리스트 글로벌 스케줄 기기         │
└─────────────────────────────────────┘
```

### 8.2 탭 정의

| 탭 | 아이콘 | 경로 |
|----|--------|------|
| 홈 | `Home` | `/signage/store` |
| 리스트 | `List` | `/signage/store/playlists` |
| 글로벌 | `Globe` | `/signage/store/global` |
| 스케줄 | `Calendar` | `/signage/store/schedules` |
| 기기 | `Monitor` | `/signage/store/devices` |

---

## 9. 관련 문서

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Signage Routing Map V3](./SIGNAGE-ROUTING-MAP-V3.md)
- [Store Dashboard V2 Spec](./STORE-DASHBOARD-V2-SPEC.md)

---

*Last Updated: 2026-01-17*
