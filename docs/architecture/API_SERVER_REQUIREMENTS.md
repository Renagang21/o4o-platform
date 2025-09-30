# API Server 작업 요구사항 문서
## 구텐베르크 편집기 연동을 위한 Post Management API

### 📋 개요
Admin Dashboard의 구텐베르크 스타일 편집기와 연동하기 위한 백엔드 API 구현 요구사항입니다.

---

## 1. 데이터 모델

### Post Schema
```typescript
interface Post {
  id: string;                    // UUID
  title: string;                  // 제목
  content: string;                // HTML 또는 Gutenberg 블록 데이터
  excerpt?: string;               // 요약
  slug: string;                   // URL 슬러그
  status: 'publish' | 'draft' | 'private' | 'trash';
  author_id: string;              // 작성자 ID
  categories: string[];           // 카테고리 ID 배열
  tags: string[];                 // 태그 ID 배열
  featured_media?: string;        // 대표 이미지 ID
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;                // 상단 고정 여부
  template?: string;              // 템플릿 파일
  meta?: Record<string, any>;     // 메타 데이터
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}
```

### Category Schema
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;                // 부모 카테고리 ID
  count: number;                   // 포스트 수
  meta?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
```

### Tag Schema
```typescript
interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count: number;                   // 포스트 수
  meta?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
```

---

## 2. API 엔드포인트

### Posts API

#### 2.1 포스트 목록 조회
```
GET /api/posts
```

**Query Parameters:**
- `page` (number): 페이지 번호 (default: 1)
- `per_page` (number): 페이지당 항목 수 (default: 10)
- `status` (string): 상태 필터 (all|publish|draft|private|trash)
- `author` (string): 작성자 ID
- `categories` (string): 카테고리 ID (쉼표 구분)
- `tags` (string): 태그 ID (쉼표 구분)
- `search` (string): 검색어
- `orderby` (string): 정렬 기준 (date|title|modified|author)
- `order` (string): 정렬 순서 (asc|desc)

**Response:**
```json
{
  "data": [Post],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 10,
    "total_pages": 10
  }
}
```

#### 2.2 포스트 생성
```
POST /api/posts
```

**Request Body:**
```json
{
  "title": "제목",
  "content": "내용 또는 Gutenberg 블록 JSON",
  "status": "draft",
  "categories": ["cat-id-1"],
  "tags": ["tag-id-1"],
  "excerpt": "요약",
  "featured_media": "media-id"
}
```

**Response:**
```json
{
  "data": Post,
  "message": "Post created successfully"
}
```

#### 2.3 포스트 조회
```
GET /api/posts/:id
```

**Response:**
```json
{
  "data": Post
}
```

#### 2.4 포스트 수정
```
PUT /api/posts/:id
```

**Request Body:** (업데이트할 필드만)
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "status": "publish"
}
```

**Response:**
```json
{
  "data": Post,
  "message": "Post updated successfully"
}
```

#### 2.5 포스트 삭제
```
DELETE /api/posts/:id
```

**Query Parameters:**
- `force` (boolean): true면 완전 삭제, false면 휴지통으로 이동

**Response:**
```json
{
  "message": "Post deleted successfully"
}
```

#### 2.6 포스트 자동 저장
```
POST /api/posts/:id/autosave
```

**Request Body:**
```json
{
  "title": "자동 저장된 제목",
  "content": "자동 저장된 내용"
}
```

**Response:**
```json
{
  "data": {
    "id": "autosave-id",
    "post_id": "post-id",
    "saved_at": "2025-01-05T12:00:00Z"
  }
}
```

#### 2.7 포스트 미리보기 URL 생성
```
POST /api/posts/:id/preview
```

**Response:**
```json
{
  "preview_url": "https://example.com/preview?token=xxx",
  "expires_at": "2025-01-05T13:00:00Z"
}
```

#### 2.8 대량 작업
```
POST /api/posts/bulk
```

**Request Body:**
```json
{
  "ids": ["id1", "id2", "id3"],
  "action": "delete" | "trash" | "restore" | "publish",
  "data": {}  // action에 따른 추가 데이터
}
```

**Response:**
```json
{
  "success": ["id1", "id2"],
  "failed": ["id3"],
  "message": "Bulk action completed"
}
```

---

### Categories API

#### 3.1 카테고리 목록 조회
```
GET /api/categories
```

**Query Parameters:**
- `page` (number): 페이지 번호
- `per_page` (number): 페이지당 항목 수
- `search` (string): 검색어
- `parent` (string): 부모 카테고리 ID
- `orderby` (string): name|count|slug
- `order` (string): asc|desc

**Response:**
```json
{
  "data": [Category],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 10,
    "total_pages": 5
  }
}
```

#### 3.2 카테고리 생성
```
POST /api/categories
```

**Request Body:**
```json
{
  "name": "카테고리명",
  "slug": "category-slug",
  "description": "설명",
  "parent": "parent-id"
}
```

#### 3.3 카테고리 수정
```
PUT /api/categories/:id
```

#### 3.4 카테고리 삭제
```
DELETE /api/categories/:id
```

#### 3.5 카테고리 대량 삭제
```
POST /api/categories/bulk-delete
```

**Request Body:**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

---

### Tags API

#### 4.1 태그 목록 조회
```
GET /api/tags
```

**Query Parameters:**
- `page` (number): 페이지 번호
- `per_page` (number): 페이지당 항목 수
- `search` (string): 검색어
- `orderby` (string): name|count|slug
- `order` (string): asc|desc

#### 4.2 태그 생성
```
POST /api/tags
```

**Request Body:**
```json
{
  "name": "태그명",
  "slug": "tag-slug",
  "description": "설명"
}
```

#### 4.3 태그 수정
```
PUT /api/tags/:id
```

#### 4.4 태그 삭제
```
DELETE /api/tags/:id
```

#### 4.5 태그 대량 삭제
```
POST /api/tags/bulk-delete
```

---

## 3. 구현 우선순위

### Phase 1 (필수 - 즉시 구현)
1. **Posts CRUD API** (생성, 조회, 수정, 삭제)
2. **자동 저장 API** - 편집기에서 주기적으로 호출
3. **포스트 상태 변경** (draft ↔ publish)
4. **Categories/Tags 목록 조회** - 편집기에서 선택용

### Phase 2 (중요 - 1주 내)
1. **Categories CRUD API**
2. **Tags CRUD API**
3. **대량 작업 API**
4. **검색 및 필터링**
5. **미리보기 URL 생성**

### Phase 3 (선택 - 추후 구현)
1. **리비전 관리**
2. **미디어 라이브러리 연동**
3. **댓글 관리**
4. **사용자 권한 관리**

---

## 4. 프론트엔드 연동 포인트

### 편집기 통합 위치
- **파일**: `/apps/admin-dashboard/src/components/editor/GutenbergBlockEditor.tsx`
- **저장 버튼**: `handleSave()` 함수
- **발행 버튼**: `handlePublish()` 함수  
- **미리보기 버튼**: `handlePreview()` 함수

### API 클라이언트 구현 위치
- **디렉토리**: `/apps/admin-dashboard/src/services/api/`
- 필요 파일:
  - `posts.ts` - 포스트 관련 API 호출
  - `categories.ts` - 카테고리 관련 API 호출
  - `tags.ts` - 태그 관련 API 호출

### 상태 관리
- **Context**: `/apps/admin-dashboard/src/contexts/PostContext.tsx`
- 자동 저장 타이머 (30초마다)
- 저장 상태 표시 (저장 중, 저장됨, 오류)

---

## 5. 보안 고려사항

1. **인증/인가**
   - JWT 토큰 기반 인증
   - 역할 기반 접근 제어 (RBAC)
   - Admin만 발행 가능, Editor는 draft만 가능

2. **입력 검증**
   - XSS 방지를 위한 HTML 정제
   - SQL Injection 방지
   - 파일 업로드 크기 제한

3. **Rate Limiting**
   - 자동 저장 API: 분당 10회 제한
   - 일반 API: 분당 100회 제한

---

## 6. 테스트 요구사항

### 단위 테스트
- 각 엔드포인트별 성공/실패 케이스
- 입력 검증 테스트
- 권한 검증 테스트

### 통합 테스트
- 포스트 생성 → 수정 → 발행 플로우
- 카테고리/태그 연결 테스트
- 자동 저장 및 복구 테스트

### 부하 테스트
- 동시 사용자 100명 시뮬레이션
- 자동 저장 부하 테스트

---

## 7. 데이터베이스 스키마 (PostgreSQL 예시)

```sql
-- Posts 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  author_id UUID REFERENCES users(id),
  featured_media UUID,
  comment_status VARCHAR(20) DEFAULT 'open',
  ping_status VARCHAR(20) DEFAULT 'open',
  sticky BOOLEAN DEFAULT FALSE,
  template VARCHAR(100),
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Categories 테이블
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  count INTEGER DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags 테이블
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  count INTEGER DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post-Category 관계 테이블
CREATE TABLE post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Post-Tag 관계 테이블
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 자동 저장 테이블
CREATE TABLE post_autosaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  excerpt TEXT,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_published ON posts(published_at);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_tags_slug ON tags(slug);
```

---

## 8. 예상 응답 시간 요구사항

- 포스트 목록 조회: < 200ms
- 단일 포스트 조회: < 100ms
- 포스트 저장: < 500ms
- 자동 저장: < 300ms
- 검색: < 500ms
- 대량 작업: < 2000ms

---

## 9. 에러 처리

### 표준 에러 응답 형식
```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "The requested post was not found",
    "details": {},
    "timestamp": "2025-01-05T12:00:00Z"
  }
}
```

### 주요 에러 코드
- `UNAUTHORIZED` - 인증 실패
- `FORBIDDEN` - 권한 없음
- `NOT_FOUND` - 리소스 없음
- `VALIDATION_ERROR` - 입력 검증 실패
- `CONFLICT` - 중복 또는 충돌
- `INTERNAL_ERROR` - 서버 에러

---

## 10. 연동 예시 코드

### Frontend (TypeScript/React)
```typescript
// /apps/admin-dashboard/src/services/api/posts.ts
export const postsAPI = {
  // 포스트 생성
  create: async (data: CreatePostDto): Promise<Post> => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // 자동 저장
  autosave: async (id: string, data: AutosaveDto): Promise<void> => {
    await fetch(`/api/posts/${id}/autosave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
  },

  // 발행
  publish: async (id: string): Promise<Post> => {
    const response = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ status: 'publish' })
    });
    return response.json();
  }
};
```

---

이 문서를 백엔드 팀에 전달하여 API 서버 구현을 진행하시면 됩니다.
필요한 추가 사항이나 수정 사항이 있으면 알려주세요.