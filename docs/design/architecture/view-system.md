# View System

> O4O Platform View System Architecture Specification

## 1. 목적 (Purpose)

기존 페이지(Page) 기반 구조가 아닌, **View Component 기반 렌더링 체계**를 제공하여
앱 개발자가 화면(View)을 선언적·모듈 방식으로 구성할 수 있도록 한다.
앱이 View를 등록하면 CMS와 Navigation이 자동으로 라우팅과 메뉴를 구성한다.

---

## 2. 개요 (Overview)

- View System은 **앱이 선언한 View Component를 기반으로 화면을 렌더링**하는 구조이다.
- 앱은 manifest.ts에서 viewTemplates를 정의하며, CMS와 Navigation이 이를 자동 구성한다.
- Next.js의 file-based routing을 사용하지 않고, **앱 기반 동적 라우팅**을 적용한다.
- 여러 앱이 공존하는 Multi-App 환경에서도 구조가 깨지지 않도록 설계되었다.

---

## 3. 핵심 구성요소 (Key Components)

### 3.1 View Registry

**책임**: View Component의 중앙 등록 및 조회

| 메서드 | 설명 |
|--------|------|
| `register(appId, viewId, config)` | 앱의 View 등록 |
| `get(appId, viewId)` | View 조회 |
| `getByApp(appId)` | 앱별 View 목록 |
| `unregister(appId)` | 앱의 모든 View 해제 |

```typescript
// View Registry 사용 예시
viewRegistry.register('forum-app', 'post-list', {
  component: PostListView,
  title: '게시글 목록',
  path: '/forum/posts',
  permissions: ['forum.post.read'],
});
```

### 3.2 Navigation Registry

**역할**: 앱이 등록한 메뉴/뷰 정보를 기반으로 프론트엔드 메뉴 자동 구성

| 기능 | 설명 |
|------|------|
| 메뉴 자동 구성 | manifest.menus 기반 네비게이션 생성 |
| 권한 기반 필터링 | 사용자 권한에 따른 메뉴 표시 |
| 앱별 메뉴 그룹 | Multi-App 환경 메뉴 분리 |
| 동적 업데이트 | 앱 활성화/비활성화 시 메뉴 갱신 |

```typescript
// Navigation Registry 사용 예시
navigationRegistry.register('forum-app', [
  { id: 'forum-posts', title: '게시판', path: '/forum', icon: 'MessageSquare' },
  { id: 'forum-categories', title: '카테고리', path: '/forum/categories', icon: 'Folder' },
]);
```

### 3.3 Dynamic Router

**구조**: manifest.viewTemplates를 기반으로 자동 라우팅 생성

| 책임 | 설명 |
|------|------|
| Route 자동 생성 | View 등록 시 자동으로 Route 생성 |
| Path 매핑 | viewTemplates.path → React Router 경로 |
| 파라미터 처리 | `:id`, `:slug` 등 동적 파라미터 지원 |
| 권한 검증 | Route 접근 시 권한 체크 |

```typescript
// Dynamic Router 자동 생성 구조
// manifest.viewTemplates 정의:
viewTemplates: [
  { id: 'post-list', path: '/forum/posts', component: 'PostListView' },
  { id: 'post-detail', path: '/forum/posts/:id', component: 'PostDetailView' },
]
// → 자동으로 React Router 경로로 변환
```

### 3.4 Data Binding Layer

- CMS Registry에서 필요한 CPT/ACF 데이터를 불러와 View에 주입
- 앱은 데이터 구조를 선언적으로만 정의
- View는 데이터 로딩 로직을 직접 포함하지 않음

### 3.5 UI Composition Layer

- View Component는 UI 컴포넌트들과 조합해 최종 화면 렌더링
- 앱 간 UI 충돌이 발생하지 않도록 독립적 구조 유지
- 공통 UI는 @o4o/ui 패키지에서 제공

---

## 4. Data Flow (핵심 흐름)

### 4.1 Manifest → View → Routing → Rendering

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        View System Data Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                       │
│  │  manifest.ts │ ─── viewTemplates 정의                                │
│  └──────┬───────┘                                                       │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Module Loader                                │  │
│  │  • manifest 파싱                                                   │  │
│  │  • viewTemplates 추출                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ├────────────────┬────────────────┬─────────────────┐           │
│         ▼                ▼                ▼                 ▼           │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐    │
│  │   View     │   │ Navigation │   │  Dynamic   │   │    CPT/    │    │
│  │  Registry  │   │  Registry  │   │   Router   │   │ ACF Registry│    │
│  │            │   │            │   │            │   │            │    │
│  │ Component  │   │ Menu 구성   │   │ Route 생성 │   │ Data 연결  │    │
│  │ 등록/조회   │   │ 권한 필터   │   │ Path 매핑  │   │ 스키마 참조 │    │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘    │
│        │                │                │                │            │
│        └────────────────┴────────────────┴────────────────┘            │
│                                    │                                    │
│                                    ▼                                    │
│                         ┌──────────────────┐                           │
│                         │   Rendering      │                           │
│                         │                  │                           │
│                         │ • Data Binding   │                           │
│                         │ • UI Composition │                           │
│                         │ • Final Render   │                           │
│                         └──────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 View 등록 및 렌더링 흐름

```
┌──────────────┐
│   앱 설치     │
└──────┬───────┘
       ▼
┌──────────────────────────┐
│ manifest.viewTemplates   │
│ 파싱                      │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ View Registry            │
│ Component 등록            │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Dynamic Router           │
│ Route 자동 생성           │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Navigation Registry      │
│ Menu 자동 구성            │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ View Component 렌더링    │
│ + Data Binding           │
└──────────────────────────┘
```

### 4.3 핵심 요약

```
앱이 manifest에 View 선언 → Registry들이 자동 등록 → Router/Navigation 자동 구성 → 렌더링
```

---

## 5. View 계층 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         Page Layout                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌───────────────────┐     ┌─────────────┐ │
│  │ Navigation  │     │       View        │     │   Sidebar   │ │
│  │  Component  │     │     Component     │     │  Component  │ │
│  │             │     │                   │     │             │ │
│  │  • Menu     │     │  • ListView       │     │  • Widgets  │ │
│  │  • Breadcrumb│    │  • DetailView     │     │  • Filters  │ │
│  │             │     │  • FormView       │     │             │ │
│  └─────────────┘     └────────┬──────────┘     └─────────────┘ │
│                               │                                  │
│               ┌───────────────┼───────────────┐                 │
│               ▼               ▼               ▼                 │
│         ┌──────────┐   ┌──────────┐   ┌──────────┐             │
│         │ UI Comp  │   │ UI Comp  │   │ UI Comp  │             │
│         │ (Button) │   │ (Table)  │   │ (Modal)  │             │
│         └──────────┘   └──────────┘   └──────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. View Types

| View Type | 용도 | 예시 |
|-----------|------|------|
| `ListView` | 데이터 목록 표시 | PostListView, ProductListView |
| `DetailView` | 단일 데이터 상세 | PostDetailView, OrderDetailView |
| `FormView` | 생성/수정 폼 | PostFormView, ProfileFormView |
| `DashboardView` | 대시보드/통계 | ForumDashboard, SellerDashboard |
| `ArchiveView` | 아카이브/검색 | CategoryArchiveView |

---

## 7. 개발 규칙 (Development Rules)

### 7.1 필수 규칙

1. **manifest 선언 필수**: View는 반드시 manifest.viewTemplates에서 선언해야 한다.
2. **namespace 분리**: 앱 간 View 충돌이 없도록 appId prefix를 사용한다.
3. **Data Binding 분리**: View는 데이터 로딩 로직을 직접 포함하지 않고, 주입받는 구조로 작성한다.
4. **Navigation 자동화 활용**: 메뉴/라우팅은 수동 설정하지 않고, manifest 등록을 통해 자동 구성한다.
5. **UI Component 재사용**: 공통 UI는 @o4o/ui 패키지에서 가져와 사용하며, 앱별 중복 구현을 피한다.

### 7.2 manifest.viewTemplates 예시

```typescript
// manifest.ts
export const manifest: AppManifest = {
  appId: 'forum-app',
  // ...
  viewTemplates: [
    {
      id: 'post-list',
      path: '/forum/posts',
      component: 'PostListView',
      title: '게시글 목록',
      permissions: ['forum.post.read'],
    },
    {
      id: 'post-detail',
      path: '/forum/posts/:id',
      component: 'PostDetailView',
      title: '게시글 상세',
      permissions: ['forum.post.read'],
    },
    {
      id: 'post-form',
      path: '/forum/posts/new',
      component: 'PostFormView',
      title: '게시글 작성',
      permissions: ['forum.post.create'],
    },
  ],
};
```

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [appstore-overview.md](./appstore-overview.md) | AppStore 시스템 개요 |
| [module-loader-spec.md](./module-loader-spec.md) | Module Loader 명세 |
| [cms-overview.md](./cms-overview.md) | CMS 2.0 개요 |
| [manifest-specification.md](../../app-guidelines/manifest-specification.md) | Manifest 규격 |

---

## 9. 구현 현황

| 컴포넌트 | 상태 | 위치 |
|----------|------|------|
| View Registry | Skeleton | `packages/cms-core/src/view-system/view-registry.ts` |
| Navigation Registry | Skeleton | `packages/cms-core/src/view-system/navigation-registry.ts` |
| Dynamic Router | Skeleton | `packages/cms-core/src/view-system/dynamic-router.ts` |
| Type Definitions | Completed | `packages/cms-core/src/view-system/types.ts` |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 리팩토링 완료*
