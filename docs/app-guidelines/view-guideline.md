# View Guideline

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

앱의 View Component 구조와 등록 규칙을 정의한다.
페이지(Page) 기반이 아닌 Component 기반 UI 구성 방법을 안내한다.

## 2. Overview

- View는 앱의 화면 구성 단위이다.
- 페이지를 직접 생성하지 않고 View Component를 등록한다.
- Navigation Registry와 자동 연결되어 라우팅이 생성된다.

## 3. View Types

| 타입 | 용도 | 예시 |
|------|------|------|
| **ListView** | 데이터 목록 표시 | PostListView |
| **DetailView** | 단일 데이터 상세 | PostDetailView |
| **FormView** | 데이터 생성/수정 폼 | PostFormView |
| **DashboardView** | 대시보드/통계 | ForumDashboard |

## 4. Directory Structure

```
packages/{app-name}/
└── src/
    └── frontend/
        └── views/
            ├── PostListView.tsx
            ├── PostDetailView.tsx
            └── PostFormView.tsx
```

## 5. View Component Example

```tsx
// frontend/views/PostListView.tsx
import { ListView, useData } from '@o4o/ui';

interface PostListViewProps {
  organizationId?: string;
}

export function PostListView({ organizationId }: PostListViewProps) {
  const { data, loading } = useData('forum-post', { organizationId });

  if (loading) return <Loading />;

  return (
    <ListView
      data={data}
      columns={['title', 'author', 'createdAt']}
      onRowClick={(item) => navigate(`/forum/posts/${item.id}`)}
    />
  );
}
```

## 6. Registration

```typescript
// manifest.ts
viewTemplates: [
  'PostListView',
  'PostDetailView',
  'PostFormView'
],

navigation: {
  admin: [
    { path: '/forum', label: 'Forum', view: 'PostListView' },
    { path: '/forum/:id', label: 'Post Detail', view: 'PostDetailView' }
  ]
}
```

## 7. Rules

1. **Component 기반**: 페이지 파일을 직접 생성하지 않는다.
2. **manifest 등록**: 모든 View는 manifest.viewTemplates에 등록한다.
3. **표준 타입 활용**: ListView/DetailView/FormView 표준 컴포넌트를 활용한다.
4. **props 명확화**: View props는 명확하게 타입을 정의한다.
5. **@o4o/ui 사용**: 공통 UI 컴포넌트는 @o4o/ui 패키지에서 가져온다.

---

## Related Documents

- [app-overview.md](./app-overview.md)
- [cms-integration.md](./cms-integration.md)
- [docs/design/architecture/view-system.md](../design/architecture/view-system.md)

---
*최종 업데이트: 2025-12-10*
