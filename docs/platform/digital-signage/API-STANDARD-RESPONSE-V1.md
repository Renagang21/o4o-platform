# Digital Signage API Standard Response V1

> Phase 2 Refinement (R-3)
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Digital Signage API의 응답 표준을 정의합니다.
모든 API는 이 표준을 따라야 합니다.

---

## 2. 응답 구조

### 2.1 단일 리소스 응답

```typescript
interface SingleResponse<T> {
  data: T;
}

// 예시
{
  "data": {
    "id": "playlist-001",
    "name": "Morning Rotation",
    "status": "active",
    "itemCount": 5,
    "createdAt": "2026-01-17T09:00:00.000Z"
  }
}
```

### 2.2 목록 리소스 응답

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 예시
{
  "data": [
    { "id": "playlist-001", "name": "Morning" },
    { "id": "playlist-002", "name": "Afternoon" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2.3 에러 응답

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// 예시: 일반 에러
{
  "error": "Playlist not found"
}

// 예시: 코드 포함
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": "Name is required",
    "status": "Invalid status value"
  }
}
```

### 2.4 생성/수정 응답

```typescript
// POST 응답 (201 Created)
{
  "data": {
    "id": "playlist-003",
    "name": "New Playlist",
    "createdAt": "2026-01-17T10:00:00.000Z"
  }
}

// PATCH 응답 (200 OK)
{
  "data": {
    "id": "playlist-001",
    "name": "Updated Playlist",
    "updatedAt": "2026-01-17T10:05:00.000Z"
  }
}
```

### 2.5 삭제 응답

```typescript
// DELETE 응답 (204 No Content)
// Body 없음

// 또는 Soft Delete (200 OK)
{
  "data": {
    "id": "playlist-001",
    "deletedAt": "2026-01-17T10:10:00.000Z"
  }
}
```

---

## 3. HTTP 상태 코드

### 3.1 성공 응답

| 코드 | 설명 | 사용 시점 |
|------|------|----------|
| 200 | OK | GET, PATCH, 일부 POST |
| 201 | Created | POST (리소스 생성) |
| 204 | No Content | DELETE |

### 3.2 에러 응답

| 코드 | 설명 | 사용 시점 |
|------|------|----------|
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복/충돌 |
| 422 | Unprocessable Entity | 유효성 검증 실패 |
| 500 | Internal Server Error | 서버 오류 |

---

## 4. 필드명 규칙

### 4.1 기본 규칙

| 규칙 | 올바른 예 | 잘못된 예 |
|------|----------|----------|
| camelCase | `createdAt` | `created_at` |
| 일관된 약어 | `id`, `url` | `ID`, `URL` |
| 복수형 배열 | `items` | `itemList` |

### 4.2 공통 필드

```typescript
interface BaseEntity {
  id: string;              // UUID
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
  deletedAt: string | null; // Soft delete
  createdByUserId: string | null;
  updatedByUserId: string | null;
  deletedByUserId: string | null;
}
```

### 4.3 관계 필드

```typescript
// ID 참조
{
  playlistId: string;      // 단수 ID
  mediaId: string;
  organizationId: string;
}

// 중첩 객체
{
  playlist: PlaylistDto;   // 전체 객체
  items: PlaylistItemDto[];
}
```

### 4.4 Boolean 필드

```typescript
{
  isActive: boolean;       // is 접두사
  isForced: boolean;
  isPublic: boolean;
  loopEnabled: boolean;    // Enabled 접미사
}
```

### 4.5 Count 필드

```typescript
{
  itemCount: number;       // Count 접미사
  totalDuration: number;   // Total 접두사
  likeCount: number;
  downloadCount: number;
}
```

---

## 5. 날짜/시간 형식

### 5.1 ISO 8601 형식

```typescript
{
  createdAt: "2026-01-17T09:00:00.000Z",
  updatedAt: "2026-01-17T10:30:00.000Z",
  startTime: "09:00:00",      // 시간만
  endTime: "18:00:00",
  startDate: "2026-01-01",    // 날짜만
  endDate: "2026-01-31"
}
```

### 5.2 Duration (초 단위)

```typescript
{
  duration: 300,              // 5분 = 300초
  totalDuration: 1800,        // 30분 = 1800초
  defaultItemDuration: 10     // 10초
}
```

---

## 6. Global Content 필드

### 6.1 Source 필드

```typescript
type ContentSource = 'hq' | 'supplier' | 'community' | 'store';

{
  source: 'hq'  // 콘텐츠 출처
}
```

### 6.2 Scope 필드

```typescript
type ContentScope = 'global' | 'store';

{
  scope: 'global'  // 접근 범위
}
```

### 6.3 Parent 필드

```typescript
// Playlist
{
  parentPlaylistId: string | null;  // Clone 원본
}

// Media
{
  parentMediaId: string | null;     // Clone 원본
}
```

---

## 7. API 엔드포인트 규칙

### 7.1 URL 구조

```
/api/signage/:serviceKey/{resource}
/api/signage/:serviceKey/{resource}/:id
/api/signage/:serviceKey/{resource}/:id/{action}
```

### 7.2 예시

```
GET    /api/signage/pharmacy/playlists          # 목록
GET    /api/signage/pharmacy/playlists/123      # 상세
POST   /api/signage/pharmacy/playlists          # 생성
PATCH  /api/signage/pharmacy/playlists/123      # 수정
DELETE /api/signage/pharmacy/playlists/123      # 삭제
POST   /api/signage/pharmacy/playlists/123/clone  # 액션
```

### 7.3 쿼리 파라미터

```
GET /api/signage/:serviceKey/playlists?
  page=1&
  limit=20&
  search=keyword&
  status=active&
  source=hq&
  sortBy=createdAt&
  sortOrder=desc
```

---

## 8. Pagination 표준

### 8.1 요청

```typescript
interface PaginationQuery {
  page?: number;     // 기본값: 1
  limit?: number;    // 기본값: 20, 최대: 100
}
```

### 8.2 응답

```typescript
interface PaginationMeta {
  page: number;      // 현재 페이지
  limit: number;     // 페이지당 항목 수
  total: number;     // 전체 항목 수
  totalPages: number; // 전체 페이지 수
  hasNext: boolean;  // 다음 페이지 존재
  hasPrev: boolean;  // 이전 페이지 존재
}
```

---

## 9. 검색/필터 표준

### 9.1 검색

```
?search=keyword     # 이름, 설명에서 검색
```

### 9.2 필터

```
?status=active      # 상태 필터
?source=hq          # 소스 필터
?mediaType=video    # 미디어 타입 필터
?category=promo     # 카테고리 필터
```

### 9.3 정렬

```
?sortBy=createdAt   # 정렬 기준
?sortOrder=desc     # 정렬 방향 (asc/desc)
```

---

## 10. 타입 정의

### 10.1 Playlist Response

```typescript
interface PlaylistResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  loopEnabled: boolean;
  defaultItemDuration: number;
  transitionType: string;
  transitionDuration: number;
  isPublic: boolean;
  itemCount: number;
  totalDuration: number;
  likeCount: number;
  downloadCount: number;
  thumbnailUrl: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface GlobalPlaylistResponseDto extends PlaylistResponseDto {
  source: ContentSource;
  scope: ContentScope;
  parentPlaylistId: string | null;
}
```

### 10.2 Media Response

```typescript
interface MediaResponseDto {
  id: string;
  name: string;
  description: string | null;
  mediaType: 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';
  sourceType: 'upload' | 'url' | 'embed' | 'template';
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  resolution: { width: number; height: number } | null;
  fileSize: number | null;
  mimeType: string | null;
  status: 'processing' | 'active' | 'error' | 'archived';
  tags: string[];
  category: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface GlobalMediaResponseDto extends MediaResponseDto {
  source: ContentSource;
  scope: ContentScope;
  parentMediaId: string | null;
}
```

---

## 11. 구현 체크리스트

### 11.1 기존 API 점검

- [x] Playlist API 표준 준수
- [x] Media API 표준 준수
- [x] Schedule API 표준 준수
- [x] Template API 표준 준수
- [x] Global Content API 표준 준수
- [x] Clone API 표준 준수
- [x] HQ API 표준 준수

### 11.2 응답 구조 점검

- [x] PaginatedResponse 통일
- [x] ErrorResponse 통일
- [x] 날짜 형식 통일 (ISO 8601)
- [x] 필드명 camelCase 통일

---

## 12. 관련 문서

- [Core/Extension Structure](./CORE-EXTENSION-STRUCTURE-V1.md)
- [Role Structure V2](./ROLE-STRUCTURE-V2.md)
- [Global Content Flow V2](./GLOBAL-CONTENT-FLOW-V2.md)

---

*Last Updated: 2026-01-17*
