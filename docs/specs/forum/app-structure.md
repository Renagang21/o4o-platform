# Forum App Structure

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

Forum App의 패키지 구조와 모듈 구성을 정의합니다.
Core/Extension 패턴을 따르며, View System 기반으로 화면을 구성합니다.

---

## 2. 패키지 구조

```
packages/forum-app/
├── package.json
├── manifest.ts              # 앱 매니페스트
├── backend/
│   ├── entities/            # TypeORM 엔티티
│   │   ├── ForumPost.ts
│   │   ├── ForumCategory.ts
│   │   └── ForumComment.ts
│   ├── services/            # 비즈니스 로직
│   │   └── forum.service.ts
│   └── routes/              # API 라우트
│       └── forum.routes.ts
├── frontend/
│   ├── views/               # View Components
│   │   ├── PostListView.tsx
│   │   ├── PostDetailView.tsx
│   │   └── PostFormView.tsx
│   └── components/          # UI Components
│       ├── PostCard.tsx
│       └── CommentList.tsx
└── lifecycle/
    ├── install.ts
    └── activate.ts
```

---

## 3. Manifest 구조

```typescript
export const forumManifest: AppManifest = {
  appId: 'forum-core',
  name: 'Forum',
  type: 'core',
  version: '1.0.0',
  dependencies: ['organization-core'],
  cpt: ['forum-post', 'forum-category'],
  acf: ['post-fields', 'category-fields'],
  viewTemplates: ['PostListView', 'PostDetailView', 'PostFormView'],
  routes: {
    prefix: '/api/v1/forum',
    controller: ForumController
  },
  navigation: {
    admin: [{ path: '/forum', label: 'Forum', icon: 'message' }]
  }
};
```

---

## 4. View System 연동

ListView / DetailView / FormView는 View Component 기반으로 자동 렌더링됩니다.

| View | 용도 | 데이터 |
|------|------|--------|
| PostListView | 게시글 목록 | ForumPost[] |
| PostDetailView | 게시글 상세 | ForumPost + Comments |
| PostFormView | 게시글 작성/수정 | ForumPost (draft) |

---

## 5. Extension 구조

```
forum-core (Core App)
    └── forum-yaksa (Extension App)
            └── 약사회 특화 기능
    └── forum-cosmetics (Extension App)
            └── 화장품 커뮤니티 특화
```

---

## 6. 규칙

1. **manifest 선언**: 모든 CPT/ACF/View는 manifest.ts에서 선언
2. **View 기반 화면**: 페이지 직접 생성 대신 View Component 사용
3. **organizationId 연동**: 멀티테넌트 지원을 위한 조직 연결
4. **Extension 패턴**: Core 수정 없이 Extension으로 기능 확장

---
*최종 업데이트: 2025-12-10*
