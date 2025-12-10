# Admin Dashboard Routing Guide

> **업데이트:** 2025-12-10
> **상태:** CMS 2.0 View System 기준으로 업데이트

---

## 1. Overview

Admin Dashboard의 라우팅은 **View System** 기반으로 동작한다.
앱이 manifest에서 View를 등록하면, Navigation Registry가 자동으로 라우트를 생성한다.

## 2. Routing Architecture

### View System 기반 라우팅

```
앱 manifest.viewTemplates 등록
         ↓
Navigation Registry 자동 구성
         ↓
Dynamic Router 라우트 생성
         ↓
View Component 렌더링
```

### 주요 라우트

| 경로 | View Component | 설명 |
|------|----------------|------|
| `/posts/*` | PostListView, PostDetailView | 게시물 관리 |
| `/pages/*` | PageListView, PageDetailView | 페이지 관리 |
| `/users/*` | UserListView, UserFormView | 사용자 관리 |
| `/media/*` | MediaLibraryView | 미디어 관리 |
| `/forum/*` | ForumListView (앱별) | 포럼 (앱 설치 시) |

## 3. View Registration

manifest.ts에서 View를 등록:

```typescript
// manifest.ts
viewTemplates: ['PostListView', 'PostDetailView', 'PostFormView'],

navigation: {
  admin: [
    { path: '/posts', label: 'Posts', view: 'PostListView' },
    { path: '/posts/:id', view: 'PostDetailView' }
  ]
}
```

## 4. Component Organization

### 권장 구조

```
packages/{app-name}/
└── src/
    └── frontend/
        └── views/
            ├── PostListView.tsx
            ├── PostDetailView.tsx
            └── PostFormView.tsx
```

### View Types

| 타입 | 용도 | 예시 |
|------|------|------|
| ListView | 목록 표시 | PostListView |
| DetailView | 상세 표시 | PostDetailView |
| FormView | 생성/수정 | PostFormView |
| DashboardView | 대시보드 | ForumDashboard |

## 5. Rules

1. **View Component 기반**: 페이지 파일을 직접 생성하지 않는다.
2. **manifest 등록 필수**: 모든 View는 manifest.viewTemplates에 등록한다.
3. **Navigation Registry 활용**: 메뉴와 라우트는 Navigation Registry에서 자동 생성.
4. **@o4o/ui 사용**: 공통 UI 컴포넌트는 @o4o/ui 패키지에서 가져온다.
5. **독립적 구조**: 앱 간 View 충돌이 발생하지 않도록 독립적으로 유지.

---

## Related Documents

- [view-system.md](../../design/architecture/view-system.md) - View System 아키텍처
- [view-guideline.md](../../app-guidelines/view-guideline.md) - View 개발 가이드
- [manifest-guideline.md](../../app-guidelines/manifest-guideline.md) - Manifest 작성 가이드

---

*최종 업데이트: 2025-12-10*
