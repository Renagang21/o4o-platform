# CMS CPT Overview

> cms-core Custom Post Type (CPT) 스펙 문서

## 1. 개요 (Overview)

cms-core는 O4O Platform의 기본 콘텐츠 관리 기능을 제공하는 Core App이다.
WordPress의 Post Type 개념을 현대적으로 재해석하여, 다음 3가지 기본 CPT를 제공한다:

| CPT | 설명 | 테이블 |
|-----|------|--------|
| `page` | 정적 페이지 (About, Contact 등) | `cms_pages` |
| `post` | 동적 콘텐츠 (블로그 포스트, 뉴스 등) | `cms_posts` |
| `media` | 미디어 파일 (이미지, 동영상, 문서) | `cms_media` |

---

## 2. CPT: Page

### 2.1 목적

정적인 단일 페이지를 관리한다. 홈페이지, 회사 소개, 이용약관 등.

### 2.2 Entity 구조

```typescript
interface Page {
  id: string;              // UUID
  title: string;           // 페이지 제목
  slug: string;            // URL 경로 (/about, /contact)
  content: JSONContent;    // Block-based 콘텐츠 (TipTap JSON)
  status: 'draft' | 'published' | 'archived';
  templateId?: string;     // 적용된 템플릿 ID
  parentId?: string;       // 부모 페이지 (계층 구조 지원)
  order: number;           // 정렬 순서
  metadata?: Record<string, any>;  // SEO, OG 등 메타데이터
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;       // 작성자 User ID
}
```

### 2.3 주요 기능

- 계층적 페이지 구조 (parent/child)
- 템플릿 적용
- SEO 메타데이터 관리
- 슬러그 기반 URL 라우팅
- Draft/Published 상태 관리

### 2.4 API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/pages` | 페이지 목록 |
| GET | `/api/cms/pages/:id` | 페이지 상세 |
| GET | `/api/cms/pages/slug/:slug` | 슬러그로 조회 |
| POST | `/api/cms/pages` | 페이지 생성 |
| PUT | `/api/cms/pages/:id` | 페이지 수정 |
| DELETE | `/api/cms/pages/:id` | 페이지 삭제 |
| POST | `/api/cms/pages/:id/publish` | 페이지 발행 |

---

## 3. CPT: Post

### 3.1 목적

동적인 콘텐츠를 관리한다. 블로그 포스트, 뉴스, 공지사항 등.

### 3.2 Entity 구조

```typescript
interface Post {
  id: string;              // UUID
  title: string;           // 포스트 제목
  slug: string;            // URL 경로
  excerpt?: string;        // 요약문
  content: JSONContent;    // Block-based 콘텐츠
  status: 'draft' | 'published' | 'archived';
  featuredImage?: string;  // 대표 이미지 URL
  categories: string[];    // 카테고리 ID 배열
  tags: string[];          // 태그 배열
  metadata?: Record<string, any>;
  viewCount: number;       // 조회수
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
}
```

### 3.3 주요 기능

- 카테고리/태그 분류
- 대표 이미지
- 조회수 트래킹
- 요약문 관리
- 발행 스케줄링 (향후)

### 3.4 API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cms/posts` | 포스트 목록 (페이지네이션) |
| GET | `/api/cms/posts/:id` | 포스트 상세 |
| GET | `/api/cms/posts/slug/:slug` | 슬러그로 조회 |
| GET | `/api/cms/posts/category/:categoryId` | 카테고리별 조회 |
| POST | `/api/cms/posts` | 포스트 생성 |
| PUT | `/api/cms/posts/:id` | 포스트 수정 |
| DELETE | `/api/cms/posts/:id` | 포스트 삭제 |
| POST | `/api/cms/posts/:id/publish` | 포스트 발행 |

---

## 4. CPT: Media

### 4.1 목적

미디어 파일을 중앙 관리한다. 이미지, 동영상, PDF 등.

상세 스펙: [cms-media-spec.md](./cms-media-spec.md)

### 4.2 Entity 구조 (요약)

```typescript
interface Media {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  uploadedBy: string;
}
```

---

## 5. Taxonomy (분류 체계)

### 5.1 Category

계층적 분류 체계. Post에 적용.

상세 스펙: [cms-taxonomy-spec.md](./cms-taxonomy-spec.md)

### 5.2 Tag

비계층적 키워드 분류. Post에 적용.

---

## 6. CPT 확장 가이드

### 6.1 Extension App에서 CPT 확장

Extension App은 cms-core의 CPT를 **확장**할 수 있다 (수정은 불가).

```typescript
// forum-yaksa/manifest.ts
export const manifest: AppManifest = {
  appId: 'forum-yaksa',
  dependencies: { core: ['cms-core', 'forum-core'] },

  // CPT 확장 예시
  cptExtensions: [
    {
      targetCpt: 'post',  // cms-core의 post CPT
      acfGroups: [
        {
          id: 'yaksa-post-fields',
          fields: [
            { name: 'yaksa_category', type: 'select', options: [...] },
            { name: 'featured_pharmacist', type: 'relation' },
          ],
        },
      ],
    },
  ],
};
```

### 6.2 새 CPT 정의 (Extension/Service App)

```typescript
// forum-yaksa/manifest.ts
export const manifest: AppManifest = {
  appId: 'forum-yaksa',

  cpt: [
    {
      name: 'yaksa_post',
      displayName: '약사 게시글',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'json' },
        { name: 'pharmacist_id', type: 'relation' },
      ],
    },
  ],
};
```

---

## 7. Block 콘텐츠 구조

모든 CPT의 `content` 필드는 TipTap JSON 형식을 사용한다.

```json
{
  "type": "doc",
  "content": [
    {
      "type": "o4o/paragraph",
      "content": [
        { "type": "text", "text": "Hello, World!" }
      ]
    },
    {
      "type": "o4o/image",
      "attrs": {
        "src": "/uploads/image.jpg",
        "alt": "Sample Image"
      }
    }
  ]
}
```

상세 Block 스펙: [engine-spec.md](./engine-spec.md)

---

## 8. 관련 문서

| 문서 | 설명 |
|------|------|
| [cms-media-spec.md](./cms-media-spec.md) | Media CPT 상세 스펙 |
| [cms-taxonomy-spec.md](./cms-taxonomy-spec.md) | Taxonomy(Category/Tag) 스펙 |
| [engine-spec.md](./engine-spec.md) | CMS Engine 아키텍처 |
| [cms-overview.md](../../design/architecture/cms-overview.md) | CMS 2.0 개요 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 신규 생성*
