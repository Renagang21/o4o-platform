# [CMS 호환성 조사 결과 — forum-core]

**조사 완료일**: 2025-12-07
**조사자**: Claude (AI Agent)
**대상 패키지**: `packages/forum-app` (forum-core)

---

## 1. View Template 구조 상태

### 🔴 **불합격 — View Template 구조 없음**

**조사 결과:**
- `/templates/` 디렉토리 존재하지 않음
- CMS Template 기반 UI 없음
- 게시판/카테고리/게시글 화면이 **admin-ui React 컴포넌트로만 구현**됨
- main-site용 public-facing UI가 없음 (admin-dashboard 전용 UI만 존재)

**발견된 파일 구조:**
```
forum-app/src/
├── admin-ui/          ← admin-dashboard용 UI만 존재
│   ├── pages/
│   │   ├── ForumBoardList.tsx
│   │   ├── ForumPostDetail.tsx
│   │   ├── ForumPostForm.tsx
│   │   ├── ForumCategories.tsx
│   │   └── ForumReports.tsx
│   └── widgets/
│       └── ForumStatsCard.tsx
├── backend/           ← Entities & Services만
└── (templates 없음)
```

**문제점:**
1. CMS Page Builder에서 렌더링할 Template이 전무
2. main-site에서 포럼 게시글을 보여줄 방법이 없음
3. Yaksa/Neture 확장 앱이 forum UI를 커스터마이징할 수 없음

**리팩토링 필요:**
- ✅ `/templates/` 디렉토리 생성 필수
- ✅ `post-single.tsx`, `category-archive.tsx`, `post-list.tsx` 등 Template 구현
- ✅ Template이 CMS Page Builder 규칙을 따르도록 재설계

---

## 2. Routing & Page Builder 호환성

### 🔴 **불합격 — CMS Routing과 충돌**

**조사 결과:**
- manifest.ts에 정의된 routes가 **admin-dashboard 전용**
- main-site용 public route가 없음
- CMS 규칙(`/view/:pageId`)과 통합되지 않음

**현재 routes (manifest.ts:72-80):**
```typescript
routes: [
  '/admin/forum',
  '/admin/forum/posts',
  '/admin/forum/posts/:id',
  '/admin/forum/posts/:id/edit',
  '/admin/forum/posts/new',
  '/admin/forum/categories',
  '/admin/forum/reports',
],
```

**문제점:**
1. `/admin/forum/*` routes만 있음 → public 게시판 접근 불가
2. `/forum/post/{slug}` 같은 public route 없음
3. Page Builder가 forum 페이지를 동적으로 생성할 수 없음
4. Yaksa가 `/yaksa/forum/*` 경로를 사용하려 해도 충돌

**리팩토링 필요:**
- ✅ public routes 추가: `/forum/:slug`, `/forum/category/:categorySlug`
- ✅ CMS Page와 통합 가능한 route 구조로 재설계
- ✅ Dynamic route conventions 준수

---

## 3. Dynamic Loader 호환성

### 🟡 **부분 합격 — backend는 호환, admin-ui는 불호환**

**조사 결과:**

**✅ backend/index.ts (호환됨):**
```typescript
// Export entities
export * from './entities/index.js';

// Export services
export * from './services/index.js';

export const entities = Object.values(Entities);
export const services = Services;
```
- Module Loader 규칙을 따름
- entities, services가 제대로 export됨

**❌ admin-ui (불호환):**
```typescript
// index.ts
export * from './pages/index';
export * from './widgets/index';
export * from './api/index';
```
- Component가 Dynamic Loader 방식으로 export되지 않음
- main-site에서 import 불가능
- CMS Loader가 `forum-core/ForumPostList` 같은 형태로 호출할 수 없음

**문제점:**
1. admin-ui 컴포넌트가 admin-dashboard에 하드코딩됨
2. main-site UI가 없어서 동적 로딩이 불가능
3. Yaksa/Neture가 forum 컴포넌트를 재사용할 수 없음

**리팩토링 필요:**
- ✅ main-site용 UI 컴포넌트를 `/src/components/` 에 추가
- ✅ Dynamic Loader 규칙에 맞게 export 재구성
- ✅ admin-ui와 public-ui 분리

---

## 4. Block/Metadata 구조

### 🔴 **불합격 — WordPress 잔재 + Block 미적용**

**조사 결과:**

**ForumPost Entity (ForumPost.ts:44, 88-89):**
```typescript
@Column({ type: 'text' })
content!: string;  // ← raw text, Block 기반 아님

@Column({ type: 'json', nullable: true })
metadata?: Record<string, unknown>;  // ← "any" 타입
```

**문제점:**
1. `content`가 `text` 타입 → CMS Block Editor와 호환되지 않음
2. `metadata`가 `Record<string, unknown>` → 타입 안전성 없음
3. ACF(Advanced Custom Fields) 잔재 구조 (manifest.ts:70: `acf: []`)
4. Block 기반 content 구조 없음

**현재 CPT 정의 (manifest.ts:38-67):**
```typescript
cpt: [
  {
    name: 'forum_post',
    storage: 'entity' as const,  // ← Entity storage는 맞음
    primaryKey: 'id',
    label: '포럼 게시글',
    supports: ['title', 'content', 'author', 'categories', 'tags', 'comments'],
    // ← Block 구조가 없음
  },
  // ...
],
```

**리팩토링 필요:**
- ✅ `content` 필드를 Block 기반으로 변경
- ✅ `metadata` 타입을 CMS Field 구조로 재정의
- ✅ `acf` 제거, CMS Field로 대체
- ✅ CPT schema가 CMS 규칙과 일치하도록 수정

---

## 5. Menu/Navigation 구조

### 🟡 **부분 합격 — Menu 정의는 있으나 CMS 통합 없음**

**조사 결과:**

**현재 menu 정의 (manifest.ts:104-137):**
```typescript
menu: {
  id: 'forum',
  label: '포럼',
  icon: 'MessageSquare',
  path: '/forum',
  position: 100,
  children: [
    {
      id: 'forum-dashboard',
      label: '대시보드',
      icon: 'LayoutDashboard',
      path: '/forum',
    },
    {
      id: 'forum-posts',
      label: '게시글 관리',
      icon: 'FileText',
      path: '/forum',
    },
    {
      id: 'forum-categories',
      label: '카테고리',
      icon: 'Folder',
      path: '/forum/categories',
    },
    {
      id: 'forum-reports',
      label: '신고 검토',
      icon: 'Shield',
      path: '/forum/reports',
    },
  ],
},
```

**문제점:**
1. menu 정의는 있지만 **admin-dashboard에만 적용됨**
2. CMS 기반 menu 렌더링과 통합되지 않음
3. RoleSwitcher에서 forum 메뉴가 자동 인식되지 않음
4. Yaksa/Neture가 menu를 override할 수 없음

**리팩토링 필요:**
- ✅ CMS Menu System과 통합
- ✅ RoleSwitcher 연동
- ✅ Extension apps이 menu를 override 가능하도록 구조 개선

---

## 6. Permissions & RBAC 호환성

### 🟢 **합격 — organization-core와 제대로 통합됨**

**조사 결과:**

**forumPermissions.ts 구조:**
```typescript
import {
  canManageResource,
  isSuperAdmin,
  isOrganizationAdmin,
} from '@o4o/organization-core';

export async function canCreatePost(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  if (!organizationId) {
    return true;  // Global posts
  }
  return await canManageResource(
    dataSource,
    userId,
    'forum.write',
    organizationId
  );
}
```

**장점:**
1. ✅ organization-core의 RBAC 시스템을 제대로 사용
2. ✅ `canManageResource()`, `isSuperAdmin()`, `isOrganizationAdmin()` 활용
3. ✅ organizationId 기반 권한 체크
4. ✅ global posts와 organization posts 구분

**권한 정의 (manifest.ts:82-88):**
```typescript
permissions: [
  'forum.read',
  'forum.write',
  'forum.comment',
  'forum.moderate',
  'forum.admin',
],
```

**문제점:**
- 현재 permission 구조는 좋지만, **CMS 권한 렌더링 규칙과 통합되지 않음**
- Yaksa private board 기능이 CMS Exposure 규칙과 충돌 가능성 있음

**리팩토링 필요:**
- ⚠️ CMS Exposure 규칙과 통합 필요
- ⚠️ Private board visibility 로직을 CMS 규칙에 맞게 조정

---

## 7. Admin UI ↔ CMS UI 충돌 여부

### 🔴 **불합격 — 심각한 충돌**

**조사 결과:**

**현재 구조:**
- **admin-ui/**만 존재 → admin-dashboard 전용
- main-site용 UI 없음
- CMS Design Token / Theme System 미적용

**admin-ui 컴포넌트 분석 (ForumBoardList.tsx):**
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
```
- admin-dashboard의 shadcn/ui 컴포넌트 직접 사용
- main-site의 Theme System과 분리됨

**문제점:**
1. 관리 UI가 admin-dashboard에 하드코딩됨
2. CMS Admin UI로 이동 불가능
3. CMS Theme와 전혀 연동되지 않음
4. Yaksa/Neture가 forum UI를 커스터마이징할 수 없음

**리팩토링 필요:**
- ✅ admin-ui와 public-ui 완전 분리
- ✅ public-ui를 CMS Theme System에 통합
- ✅ CMS Design Token 적용
- ✅ Extension apps이 UI를 override 가능하도록 구조 개선

---

## [총평]

### 🔴 **forum-core는 현재 CMS와 호환되지 않음**

**주요 문제:**
1. ❌ View Template 구조 없음 → CMS 렌더링 불가
2. ❌ admin-dashboard 전용 UI → main-site 사용 불가
3. ❌ Block 기반 content 없음 → CMS Block Editor 미지원
4. ❌ CMS Routing과 충돌 → Page Builder 사용 불가
5. ❌ Dynamic Loader 불호환 → 컴포넌트 재사용 불가
6. ⚠️ Menu/Permission은 정의되어 있으나 CMS 통합 안 됨

**CMS 호환성 점수: 2/7 (28%)**

---

## [요구되는 리팩토링 범위]

### 🔥 **Critical (필수 - CMS 호환 위해 반드시 필요)**

#### 1. Template 구조 추가 (Priority: P0)
```
forum-app/src/
└── templates/
    ├── post-single.tsx       ← 게시글 상세 Template
    ├── post-list.tsx         ← 게시글 목록 Template
    ├── category-archive.tsx  ← 카테고리별 목록 Template
    └── forum-home.tsx        ← 포럼 홈 Template
```

#### 2. Block 기반 content 구조로 변경 (Priority: P0)
```typescript
// Before
@Column({ type: 'text' })
content!: string;

// After
@Column({ type: 'json' })
content!: Block[];  // CMS Block 구조
```

#### 3. Public UI 컴포넌트 추가 (Priority: P0)
```
forum-app/src/
└── components/          ← main-site용 public UI
    ├── PostList.tsx
    ├── PostDetail.tsx
    ├── CommentSection.tsx
    └── CategoryNav.tsx
```

#### 4. Routing 재설계 (Priority: P0)
```typescript
// Before (admin only)
routes: ['/admin/forum/...']

// After (admin + public)
routes: [
  '/admin/forum/...',      // admin routes
  '/forum/:slug',          // public post
  '/forum/category/:slug', // public category
]
```

### ⚠️ **High (중요 - CMS 통합 위해 필요)**

#### 5. CMS Menu System 통합 (Priority: P1)
- menu 정의를 CMS Menu Loader와 연동
- RoleSwitcher 자동 인식 구조로 변경

#### 6. Metadata 타입 재정의 (Priority: P1)
```typescript
// Before
metadata?: Record<string, unknown>;

// After
metadata?: ForumPostMeta;

interface ForumPostMeta {
  isPinned?: boolean;
  isLocked?: boolean;
  allowComments?: boolean;
  customFields?: Record<string, any>;
}
```

### 📝 **Medium (권장 - 확장성 위해 필요)**

#### 7. Dynamic Loader 호환성 개선 (Priority: P2)
```typescript
// src/index.ts
export const components = {
  'PostList': () => import('./components/PostList'),
  'PostDetail': () => import('./components/PostDetail'),
  // ...
};
```

#### 8. CMS Theme System 적용 (Priority: P2)
- Design Token 사용
- shadcn/ui → CMS Theme 변경

---

## [추가 제안]

### 1. **forum-core V2 아키텍처 설계**

권장 구조:
```
forum-core/
├── backend/
│   ├── entities/       ← 현재 유지
│   ├── services/       ← 현재 유지
│   └── permissions/    ← 현재 유지
├── templates/          ← 🆕 추가 필요
│   ├── post-single.tsx
│   ├── post-list.tsx
│   └── category-archive.tsx
├── components/         ← 🆕 추가 필요 (public UI)
│   ├── PostList.tsx
│   ├── PostDetail.tsx
│   └── CommentSection.tsx
├── admin-ui/           ← 현재 유지 (admin만)
│   ├── pages/
│   └── widgets/
└── manifest.ts         ← 🔄 수정 필요
```

### 2. **Extension 포인트 명확화**

Yaksa/Neture가 override 가능한 포인트:
- ✅ Templates (post-single, category-archive 등)
- ✅ Components (PostList, CommentSection 등)
- ✅ Menu structure
- ✅ Permission rules
- ✅ Metadata schema

### 3. **Migration Path 제시**

**Phase 1: 백엔드 호환성 확보**
- Block 기반 content 구조 추가
- Metadata 타입 재정의
- Entity schema 수정

**Phase 2: Template 구조 추가**
- `/templates/` 생성
- CMS Page Builder 통합
- Public routing 추가

**Phase 3: UI 분리 및 재설계**
- admin-ui / public-ui 분리
- CMS Theme System 적용
- Dynamic Loader 호환성 확보

**Phase 4: Extension 지원**
- Extension 포인트 문서화
- Yaksa/Neture 확장 구조 설계

---

## 📌 **결론**

forum-core는 **대대적인 리팩토링이 필요**합니다.

현재 상태로는:
- ❌ CMS에서 사용 불가능
- ❌ main-site에 포럼 UI 렌더링 불가능
- ❌ Yaksa/Neture 확장 불가능

**권장 사항:**
forum-core를 **CMS 호환 구조로 전면 재설계**하고,
이후 forum-yaksa, forum-neture를 extension으로 구현하는 것을 권장합니다.

**예상 작업 범위:**
- Critical 항목: 2-3주
- High 항목: 1-2주
- Medium 항목: 1주
- **총 4-6주 예상**

---

**조사 완료**
다음 단계: **forum-core V2 구조 설계서** 작성
