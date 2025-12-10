# CMS Taxonomy Specification

> cms-core Taxonomy (Category/Tag) 스펙 문서

## 1. 개요 (Overview)

Taxonomy는 콘텐츠를 분류하는 체계이다.
cms-core는 두 가지 기본 Taxonomy를 제공한다:

| Taxonomy | 유형 | 적용 대상 | 설명 |
|----------|------|-----------|------|
| Category | 계층적 (Hierarchical) | Post | 폴더처럼 중첩 가능한 분류 |
| Tag | 비계층적 (Flat) | Post | 단순 키워드 라벨링 |

---

## 2. Category (카테고리)

### 2.1 Entity 구조

```typescript
interface Category {
  id: string;              // UUID
  name: string;            // 카테고리명
  slug: string;            // URL 경로 (/category/tech)
  description?: string;    // 설명
  parentId?: string;       // 부모 카테고리 ID (계층 구조)
  order: number;           // 정렬 순서
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 계층 구조 예시

```
Tech (id: 1, parentId: null)
├── Frontend (id: 2, parentId: 1)
│   ├── React (id: 3, parentId: 2)
│   └── Vue (id: 4, parentId: 2)
└── Backend (id: 5, parentId: 1)
    ├── Node.js (id: 6, parentId: 5)
    └── Python (id: 7, parentId: 5)
```

### 2.3 API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/categories` | 카테고리 목록 (트리 구조 옵션) |
| GET | `/api/cms/categories/:id` | 카테고리 상세 |
| GET | `/api/cms/categories/slug/:slug` | 슬러그로 조회 |
| POST | `/api/cms/categories` | 카테고리 생성 |
| PUT | `/api/cms/categories/:id` | 카테고리 수정 |
| DELETE | `/api/cms/categories/:id` | 카테고리 삭제 |
| GET | `/api/cms/categories/:id/posts` | 카테고리별 포스트 |

### 2.4 조회 옵션

```typescript
// 플랫 목록
GET /api/cms/categories

// 트리 구조
GET /api/cms/categories?tree=true

// 특정 깊이까지만
GET /api/cms/categories?tree=true&depth=2
```

---

## 3. Tag (태그)

### 3.1 Entity 구조

```typescript
interface Tag {
  id: string;              // UUID
  name: string;            // 태그명
  slug: string;            // URL 경로 (/tag/javascript)
  description?: string;    // 설명
  color?: string;          // 표시 색상 (optional)
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/tags` | 태그 목록 |
| GET | `/api/cms/tags/:id` | 태그 상세 |
| GET | `/api/cms/tags/slug/:slug` | 슬러그로 조회 |
| POST | `/api/cms/tags` | 태그 생성 |
| PUT | `/api/cms/tags/:id` | 태그 수정 |
| DELETE | `/api/cms/tags/:id` | 태그 삭제 |
| GET | `/api/cms/tags/:id/posts` | 태그별 포스트 |
| GET | `/api/cms/tags/popular` | 인기 태그 목록 |

### 3.3 자동 생성

포스트 저장 시 새로운 태그는 자동 생성된다:

```typescript
// POST /api/cms/posts
{
  title: "My Post",
  content: {...},
  tags: ["javascript", "react", "newTag"]  // newTag가 없으면 자동 생성
}
```

---

## 4. Post-Taxonomy 관계

### 4.1 관계 테이블

```typescript
// Post-Category (N:M)
interface PostCategory {
  postId: string;
  categoryId: string;
}

// Post-Tag (N:M)
interface PostTag {
  postId: string;
  tagId: string;
}
```

### 4.2 Post에서 Taxonomy 할당

```typescript
// POST /api/cms/posts
{
  title: "My Post",
  content: {...},
  categories: ["category-id-1", "category-id-2"],
  tags: ["tag-id-1", "tag-id-2", "새로운태그"]
}
```

---

## 5. Extension App에서 Taxonomy 확장

### 5.1 새 Taxonomy 정의

```typescript
// forum-yaksa/manifest.ts
export const manifest: AppManifest = {
  appId: 'forum-yaksa',

  taxonomies: [
    {
      name: 'pharmacist_specialty',
      displayName: '전문 분야',
      type: 'hierarchical',  // 또는 'flat'
      appliesTo: ['yaksa_post'],  // 적용 대상 CPT
    },
    {
      name: 'drug_category',
      displayName: '의약품 분류',
      type: 'hierarchical',
      appliesTo: ['yaksa_post', 'drug_info'],
    },
  ],
};
```

### 5.2 기존 CPT에 새 Taxonomy 적용

```typescript
// 다른 Extension App이 cms-core의 post에 새 taxonomy 추가
{
  taxonomyExtensions: [
    {
      taxonomy: 'pharmacist_specialty',
      targetCpt: 'post',  // cms-core의 post
    },
  ],
}
```

---

## 6. 쿼리 예시

### 6.1 카테고리로 포스트 필터링

```typescript
// 단일 카테고리
GET /api/cms/posts?category=tech

// 복수 카테고리 (OR)
GET /api/cms/posts?category=tech,design

// 하위 카테고리 포함
GET /api/cms/posts?category=tech&includeChildren=true
```

### 6.2 태그로 포스트 필터링

```typescript
// 단일 태그
GET /api/cms/posts?tag=javascript

// 복수 태그 (AND - 모든 태그 포함)
GET /api/cms/posts?tag=javascript,react&tagMatch=all

// 복수 태그 (OR - 하나라도 포함)
GET /api/cms/posts?tag=javascript,react&tagMatch=any
```

### 6.3 카테고리 + 태그 조합

```typescript
GET /api/cms/posts?category=tech&tag=javascript
```

---

## 7. SEO 고려사항

### 7.1 카테고리/태그 아카이브 페이지

각 카테고리와 태그는 아카이브 페이지 URL을 갖는다:

```
/category/{slug}      → 카테고리별 포스트 목록
/category/{parent}/{child}  → 계층적 카테고리 URL
/tag/{slug}           → 태그별 포스트 목록
```

### 7.2 메타데이터

```typescript
interface TaxonomySEO {
  metaTitle?: string;       // SEO 타이틀
  metaDescription?: string; // SEO 설명
  ogImage?: string;         // Open Graph 이미지
  canonicalUrl?: string;    // 정규 URL
}
```

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [cms-cpt-overview.md](./cms-cpt-overview.md) | CPT 전체 개요 |
| [cms-media-spec.md](./cms-media-spec.md) | Media CPT 스펙 |
| [engine-spec.md](./engine-spec.md) | CMS Engine 아키텍처 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 신규 생성*
