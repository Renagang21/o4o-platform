# API 서버 구현 요구사항

## 📋 필요한 엔드포인트 목록

### 1. 게시글 관련 API

#### POST /api/posts
- **설명**: 새 게시글 생성
- **요청 본문**:
```json
{
  "title": "string",
  "content": [
    {
      "id": "string",
      "type": "string",
      "content": "any",
      "attributes": {}
    }
  ],
  "excerpt": "string (optional)",
  "status": "draft | published | scheduled | private",
  "featuredImageId": "string (optional)",
  "categoryIds": ["string"],
  "tagIds": ["string"],
  "settings": {
    "allowComments": true,
    "allowPingbacks": true,
    "sticky": false
  }
}
```
- **응답**: Post 객체

#### GET /api/posts/:id
- **설명**: 특정 게시글 조회
- **응답**: Post 객체

#### PUT /api/posts/:id
- **설명**: 게시글 수정
- **요청 본문**: POST와 동일 (부분 업데이트 가능)
- **응답**: 수정된 Post 객체

#### DELETE /api/posts/:id
- **설명**: 게시글 삭제
- **응답**: { success: true }

#### POST /api/posts/:id/publish
- **설명**: 게시글 발행
- **응답**: 발행된 Post 객체

#### POST /api/posts/draft 또는 /api/posts/:id/draft
- **설명**: 임시 저장
- **요청 본문**: POST와 동일
- **응답**: 저장된 Post 객체

#### POST /api/posts/:id/autosave
- **설명**: 자동 저장 (5초마다)
- **요청 본문**: 변경된 필드만
- **응답**: { success: true, lastSaved: "timestamp" }

#### GET /api/posts
- **설명**: 게시글 목록 조회
- **쿼리 파라미터**:
  - page: number
  - pageSize: number  
  - status: string
  - author: string
  - category: string
  - tag: string
  - search: string
- **응답**:
```json
{
  "posts": [Post],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### 2. 미디어 관련 API

#### POST /api/media/upload
- **설명**: 파일 업로드
- **요청**: multipart/form-data (file)
- **응답**:
```json
{
  "id": "string",
  "url": "string",
  "thumbnailUrl": "string",
  "filename": "string",
  "mimeType": "string",
  "size": number,
  "width": number,
  "height": number
}
```

#### GET /api/media
- **설명**: 미디어 라이브러리 조회
- **쿼리 파라미터**:
  - page: number
  - pageSize: number
  - type: image | video | document
- **응답**: Media[] 배열

#### DELETE /api/media/:id
- **설명**: 미디어 삭제
- **응답**: { success: true }

### 3. 카테고리/태그 API

#### GET /api/categories
- **설명**: 카테고리 목록 조회
- **응답**: Category[] 배열

#### POST /api/categories
- **설명**: 카테고리 생성
- **요청 본문**:
```json
{
  "name": "string",
  "description": "string (optional)",
  "parent": "string (optional)"
}
```
- **응답**: 생성된 Category 객체

#### GET /api/tags
- **설명**: 태그 목록 조회
- **응답**: Tag[] 배열

#### POST /api/tags
- **설명**: 태그 생성
- **요청 본문**:
```json
{
  "name": "string",
  "description": "string (optional)"
}
```
- **응답**: 생성된 Tag 객체

## 🔒 인증 관련

### 헤더
- `Authorization: Bearer {token}` 형식으로 JWT 토큰 전달
- 또는 쿠키 기반 세션 인증

### 에러 응답
- 401: 인증 필요
- 403: 권한 없음
- 404: 리소스 없음
- 422: 유효성 검사 실패
- 500: 서버 오류

## 📊 데이터베이스 스키마 제안

### posts 테이블
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  content JSONB, -- 블록 데이터를 JSON으로 저장
  excerpt TEXT,
  status VARCHAR(50),
  visibility VARCHAR(50),
  password VARCHAR(255),
  author_id UUID REFERENCES users(id),
  featured_image_id UUID REFERENCES media(id),
  published_at TIMESTAMP,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  meta JSONB, -- views, likes, comments 등
  seo JSONB, -- SEO 메타데이터
  settings JSONB -- 게시글 설정
);
```

### media 테이블
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size INTEGER,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

### categories 테이블
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  post_count INTEGER DEFAULT 0
);
```

### tags 테이블
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  post_count INTEGER DEFAULT 0
);
```

### post_categories 관계 테이블
```sql
CREATE TABLE post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
```

### post_tags 관계 테이블
```sql
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
```

## 🚀 구현 우선순위

1. **Phase 1 (필수)**
   - POST /api/posts (생성)
   - GET /api/posts/:id (조회)
   - PUT /api/posts/:id (수정)
   - POST /api/posts/draft (임시저장)

2. **Phase 2 (중요)**
   - POST /api/media/upload (미디어 업로드)
   - GET /api/categories (카테고리 목록)
   - GET /api/tags (태그 목록)

3. **Phase 3 (선택)**
   - DELETE /api/posts/:id (삭제)
   - POST /api/posts/:id/autosave (자동저장)
   - GET /api/media (미디어 라이브러리)
   - POST /api/categories (카테고리 생성)
   - POST /api/tags (태그 생성)

## 📝 테스트 시나리오

1. **게시글 작성 플로우**
   - 새 게시글 생성 → 블록 추가/편집 → 임시 저장 → 발행

2. **미디어 업로드 플로우**
   - 이미지 선택 → 업로드 → Featured Image 설정

3. **자동 저장 플로우**
   - 5초마다 변경사항 자동 저장

4. **에러 처리**
   - 네트워크 오류 시 재시도
   - 인증 만료 시 로그인 페이지로 리다이렉트

## 🔧 개발 팁

- CORS 설정 필요 (프론트엔드: localhost:3001)
- 개발 환경에서는 모든 API에 대해 로그 남기기
- Postman/Insomnia 컬렉션 제공하면 테스트 편리
- WebSocket 지원 시 실시간 협업 가능

---

이 문서를 API 서버 개발자에게 전달하여 구현을 요청하세요.