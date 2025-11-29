# Forum App 프론트엔드 코드 추출 현황

**작성일**: 2025-11-29
**목적**: Forum 앱을 별도 패키지로 분리하기 위한 프론트엔드 파일 목록 및 의존성 조사

---

## 1. Admin Dashboard 파일 목록

### 1.1 페이지 컴포넌트 (Pages)

#### `/apps/admin-dashboard/src/pages/apps/forum/`
메인 Forum 관리 페이지들:

| 파일 | 설명 | 주요 기능 |
|------|------|-----------|
| `ForumBoardList.tsx` | 게시글 목록 | 게시글 CRUD, 필터링, 검색 |
| `ForumPostDetail.tsx` | 게시글 상세 | 게시글 조회, 댓글 관리 |
| `ForumPostForm.tsx` | 게시글 작성/수정 | 에디터, 카테고리 선택, 태그 |
| `ForumCategories.tsx` | 카테고리 관리 | 카테고리 CRUD, 순서 변경 |

#### `/apps/admin-dashboard/src/pages/apps/`
Forum 관련 최상위 페이지:

| 파일 | 설명 | 주요 기능 |
|------|------|-----------|
| `ForumApp.tsx` | Forum 메인 라우터 | 라우팅, 통계 대시보드, 빠른 작업 |
| `ForumReports.tsx` | 포럼 신고 관리 | 신고 검토, 모더레이션 |

#### `/apps/admin-dashboard/src/pages/cpt-acf/`
CPT-ACF 방식 Forum 관리 (레거시):

| 파일 | 설명 | 비고 |
|------|------|------|
| `ForumPostArchive.tsx` | CPT 게시글 목록 | 레거시, 마이그레이션 필요 |
| `ForumCategoryArchive.tsx` | CPT 카테고리 목록 | 레거시, 마이그레이션 필요 |
| `forms/ForumPostForm.tsx` | CPT 게시글 폼 | 레거시, 마이그레이션 필요 |
| `forms/ForumCategoryForm.tsx` | CPT 카테고리 폼 | 레거시, 마이그레이션 필요 |

**참고**: CPT-ACF 방식과 신규 `/apps/forum` 방식이 혼재되어 있음. 통합 필요.

---

### 1.2 공통 컴포넌트 (Components)

#### Dashboard 통계 카드
- `src/pages/dashboard/components/StatsOverview/ForumStatsCard.tsx`
  - 역할: 메인 대시보드에서 Forum 통계 표시
  - 의존성: Forum API (통계 조회)
  - 이동 여부: Forum 앱 내부로 이동 (또는 위젯 형태로 노출)

#### 라우트 가드
- `src/components/AppRouteGuard.tsx`
  - 역할: 앱 설치/활성화 여부에 따라 라우트 접근 제어
  - 의존성: `useAppStatus` 훅, App Registry API
  - 이동 여부: 코어 기능이므로 그대로 유지

---

### 1.3 API 클라이언트

#### `/apps/admin-dashboard/src/api/apps/forum.ts`
Forum API 서비스 클래스:

```typescript
export interface ForumStats {
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  todayPosts: number;
  pendingModeration: number;
}

export class ForumService {
  async getStats(): Promise<ForumStats>
  async getPosts(params): Promise<ForumPost[]>
  async getPost(id: string): Promise<ForumPost>
  async createPost(data): Promise<ForumPost>
  async updatePost(id: string, data): Promise<ForumPost>
  async deletePost(id: string): Promise<void>
  async getCategories(): Promise<ForumCategory[]>
  async createCategory(data): Promise<ForumCategory>
  async updateCategory(id, data): Promise<ForumCategory>
  async deleteCategory(id): Promise<void>
  async getModerationQueue(params): Promise<ModerationItem[]>
  async moderateContent(id, action, reason): Promise<void>
  async bulkDeletePosts(ids): Promise<void>
  async bulkMovePostsToCategory(postIds, categoryId): Promise<void>
}
```

**이동 대상**: Forum App 패키지 내부 `frontend/api/`

---

### 1.4 설정 파일

#### `/apps/admin-dashboard/src/config/apps.config.ts`
Forum API 엔드포인트 정의:

```typescript
forum: {
  stats: '/forum/stats',
  posts: '/forum/posts',
  categories: '/forum/categories',
  users: '/forum/users',
  moderation: '/forum/moderation',
}
```

**이동 대상**: Forum App 패키지 내부 설정 파일

---

### 1.5 상태 관리

**현재 상태**: React Query 사용 (전역 상태 관리 없음)

- Query Keys:
  - `['installedApps']` - 앱 설치 목록
  - `useQuery`를 개별 컴포넌트에서 사용

**특징**:
- 전역 상태 관리 라이브러리 미사용 (Zustand, Recoil 등)
- 서버 상태는 React Query로 캐싱
- 로컬 상태는 `useState`로 관리

**이동 계획**: Forum App 내부에서 동일한 패턴 유지

---

### 1.6 라우트 정의

#### `/apps/admin-dashboard/src/App.tsx`

Forum 관련 라우트:

```typescript
// App.tsx 라우트 정의
<Route path="/forum/*" element={
  <AppRouteGuard appId="forum">
    <ForumApp />
  </AppRouteGuard>
} />

// ForumApp.tsx 내부 서브 라우트
<Route path="/" element={<ForumBoardList />} />
<Route path="/posts/new" element={<ForumPostForm />} />
<Route path="/posts/:id" element={<ForumPostDetail />} />
<Route path="/posts/:id/edit" element={<ForumPostForm />} />
<Route path="/categories" element={<ForumCategories />} />
```

**URL 구조**:
- `/forum` - 게시글 목록 / 대시보드
- `/forum/posts/new` - 새 게시글 작성
- `/forum/posts/:id` - 게시글 상세
- `/forum/posts/:id/edit` - 게시글 수정
- `/forum/categories` - 카테고리 관리

**이동 계획**: Forum App 패키지 내부에서 동일한 라우트 구조 유지

---

### 1.7 메뉴 정의

#### `/apps/admin-dashboard/src/config/wordpressMenuFinal.tsx`

**현재 메뉴 위치**: 메뉴에 포함되지 않음 (앱 마켓에서만 접근)

**메뉴 제어 방식**:
- `src/hooks/useAdminMenu.ts`에서 `useAppStatus`를 통해 앱 활성화 여부 확인
- 활성화된 앱만 메뉴에 표시

**향후 메뉴 추가 필요**:
```typescript
{
  id: 'forum',
  label: '포럼',
  icon: <MessageSquare className="w-5 h-5" />,
  path: '/forum',
  appId: 'forum' // 앱 활성화 여부로 표시 제어
}
```

---

## 2. Main Site 파일 목록

### 2.1 Forum 관련 컴포넌트

**검색 결과**: Main Site에는 Forum 전용 페이지/컴포넌트 없음

**관련 파일**:
- `src/components/layout/AdminBar.tsx` - 관리 바에서 Forum 링크 포함 (간접 참조)
- `src/utils/context-detector.ts` - 컨텍스트 감지 유틸 (Forum 언급)

**결론**: Main Site는 Forum 기능을 직접 구현하지 않고, 별도 도메인(`forum.neture.co.kr`)으로 분리할 예정으로 보임.

---

## 3. 의존성 분석

### 3.1 코어 의존성

| 의존성 | 용도 | 위치 | 분리 가능 여부 |
|--------|------|------|----------------|
| `authClient` | 인증/권한 | `@o4o/auth-client` | ❌ (코어 유지) |
| `api` (base) | HTTP 클라이언트 | `src/api/base.ts` | ❌ (코어 유지) |
| `unified-client` | API 통합 클라이언트 | `src/api/unified-client.ts` | ❌ (코어 유지) |
| `useAppStatus` | 앱 상태 조회 | `src/hooks/useAppStatus.ts` | ❌ (코어 유지) |
| `AppRouteGuard` | 라우트 가드 | `src/components/AppRouteGuard.tsx` | ❌ (코어 유지) |

### 3.2 UI 컴포넌트 의존성

| 의존성 | 용도 | 분리 가능 여부 |
|--------|------|----------------|
| `@/components/ui/*` | Shadcn UI 컴포넌트 | ❌ (코어 UI 라이브러리) |
| `lucide-react` | 아이콘 | ❌ (코어 아이콘 라이브러리) |
| React Router | 라우팅 | ❌ (코어 라우터) |
| React Query | 서버 상태 관리 | ❌ (코어 데이터 페칭) |

### 3.3 Forum 전용 의존성

**현재**: 없음 (모든 의존성이 코어 또는 공통 라이브러리)

**향후 Forum App 패키지화 시 추가 가능**:
- 에디터 라이브러리 (Tiptap, Quill 등)
- 마크다운 파서
- 구문 강조 (Code syntax highlighting)
- 이미지 업로드 유틸

---

## 4. 통합 필요 사항

### 4.1 중복 코드 제거

**문제**: CPT-ACF 방식과 `/apps/forum` 방식이 혼재

**해결**:
1. `/pages/cpt-acf/Forum*` 파일들을 `/pages/apps/forum`으로 통합
2. CPT-ACF 엔드포인트를 일반 REST API로 변경
3. ACF 필드를 TypeORM 엔티티로 마이그레이션

### 4.2 라우트 통합

**현재 문제점**:
- `/cpt/forum` (CPT 방식)
- `/forum` (신규 방식)

**통합 계획**:
- 모든 라우트를 `/forum/*` 아래로 통합
- CPT 라우트 제거

---

## 5. Forum App 패키지화 시 이동 대상 파일

### ✅ 완전 이동 가능 (Forum 전용)

```
apps/admin-dashboard/src/
├── pages/apps/forum/
│   ├── ForumBoardList.tsx
│   ├── ForumPostDetail.tsx
│   ├── ForumPostForm.tsx
│   └── ForumCategories.tsx
├── pages/apps/
│   ├── ForumApp.tsx
│   └── ForumReports.tsx
└── api/apps/
    └── forum.ts
```

### ⚠️ 부분 이동 또는 재구성 필요

```
apps/admin-dashboard/src/
├── pages/cpt-acf/
│   ├── ForumPostArchive.tsx         # → 통합 후 제거
│   ├── ForumCategoryArchive.tsx     # → 통합 후 제거
│   └── forms/
│       ├── ForumPostForm.tsx        # → 통합 후 제거
│       └── ForumCategoryForm.tsx    # → 통합 후 제거
├── pages/dashboard/components/StatsOverview/
│   └── ForumStatsCard.tsx           # → 위젯으로 재구성
└── config/
    └── apps.config.ts               # → Forum 부분만 추출
```

### ❌ 코어에 유지 (분리 불가)

```
apps/admin-dashboard/src/
├── components/
│   └── AppRouteGuard.tsx
├── hooks/
│   └── useAppStatus.ts
├── api/
│   ├── base.ts
│   └── unified-client.ts
└── components/ui/*
```

---

## 6. 예상 패키지 구조 (프론트엔드)

```
packages/forum-app/
├── frontend/
│   ├── pages/
│   │   ├── BoardList.tsx
│   │   ├── PostDetail.tsx
│   │   ├── PostForm.tsx
│   │   ├── Categories.tsx
│   │   ├── Reports.tsx
│   │   └── Dashboard.tsx
│   ├── components/
│   │   ├── PostCard.tsx
│   │   ├── CommentList.tsx
│   │   ├── CategorySelect.tsx
│   │   └── StatsCard.tsx
│   ├── hooks/
│   │   ├── useForumStats.ts
│   │   ├── usePosts.ts
│   │   └── useCategories.ts
│   ├── api/
│   │   └── forum-client.ts
│   └── types/
│       └── forum.types.ts
├── manifest.ts
└── package.json
```

---

## 7. 마이그레이션 체크리스트

### 프론트엔드 마이그레이션

- [ ] `/apps/forum/*` 페이지들을 Forum App 패키지로 이동
- [ ] CPT-ACF 방식 Forum 페이지 통합 후 제거
- [ ] Forum API 클라이언트 분리
- [ ] Forum 전용 타입 정의 분리
- [ ] 라우트 설정을 App Manifest로 이동
- [ ] 메뉴 설정을 App Manifest로 이동
- [ ] 대시보드 통계 위젯을 Forum App으로 이동
- [ ] 코어 의존성 확인 및 최소화

### 테스트

- [ ] 앱 설치/삭제 시 라우트 접근 제어 동작 확인
- [ ] 앱 활성화/비활성화 시 메뉴 표시/숨김 확인
- [ ] 모든 Forum 페이지 정상 작동 확인
- [ ] API 호출 정상 작동 확인

---

**문서 끝**
