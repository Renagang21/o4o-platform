# Organization-Core API 설계

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core REST API 명세

---

## 📋 목차

1. [API 개요](#1-api-개요)
2. [Organization API](#2-organization-api)
3. [OrganizationMember API](#3-organizationmember-api)
4. [권한 검증](#4-권한-검증)
5. [에러 처리](#5-에러-처리)
6. [페이지네이션](#6-페이지네이션)

---

## 1. API 개요

### 1.1 Base URL

```
/api/organization
```

### 1.2 인증

모든 API는 **Bearer Token 인증** 필요:

```http
Authorization: Bearer <JWT_TOKEN>
```

### 1.3 응답 형식

**성공 응답:**
```json
{
  "success": true,
  "data": { ... }
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "조직을 찾을 수 없습니다."
  }
}
```

---

## 2. Organization API

### 2.1 조직 목록 조회

**Endpoint:**
```
GET /api/organization
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | string | ❌ | 조직 유형 (`national`, `division`, `branch`) |
| `parentId` | string | ❌ | 상위 조직 ID (하위 조직만 조회) |
| `isActive` | boolean | ❌ | 활성 여부 (기본값: true) |
| `search` | string | ❌ | 조직명/코드 검색 |
| `page` | number | ❌ | 페이지 번호 (기본값: 1) |
| `limit` | number | ❌ | 페이지 크기 (기본값: 20) |

**요청 예시:**
```http
GET /api/organization?type=division&isActive=true&page=1&limit=20
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "org-seoul",
        "name": "서울지부",
        "code": "SEOUL",
        "type": "division",
        "parentId": "org-national",
        "level": 1,
        "path": "/national/seoul",
        "metadata": {
          "address": "서울특별시 강남구 테헤란로 123",
          "phone": "02-1234-5678"
        },
        "isActive": true,
        "childrenCount": 5,
        "createdAt": "2025-01-15T09:00:00Z",
        "updatedAt": "2025-01-20T14:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

**권한:**
- `organization.read` (읽기 권한)

---

### 2.2 조직 상세 조회

**Endpoint:**
```
GET /api/organization/:id
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `includeParent` | boolean | ❌ | 상위 조직 정보 포함 (기본값: false) |
| `includeChildren` | boolean | ❌ | 하위 조직 목록 포함 (기본값: false) |
| `includeMemberCount` | boolean | ❌ | 멤버 수 포함 (기본값: false) |

**요청 예시:**
```http
GET /api/organization/org-seoul?includeParent=true&includeChildren=true
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "org-seoul",
    "name": "서울지부",
    "code": "SEOUL",
    "type": "division",
    "parentId": "org-national",
    "level": 1,
    "path": "/national/seoul",
    "metadata": {
      "address": "서울특별시 강남구 테헤란로 123",
      "phone": "02-1234-5678",
      "email": "seoul@yaksa.or.kr"
    },
    "isActive": true,
    "childrenCount": 5,
    "parent": {
      "id": "org-national",
      "name": "대한약사회",
      "code": "NATIONAL",
      "type": "national"
    },
    "children": [
      {
        "id": "org-gangnam",
        "name": "강남분회",
        "code": "GANGNAM",
        "type": "branch",
        "level": 2
      },
      {
        "id": "org-gangseo",
        "name": "강서분회",
        "code": "GANGSEO",
        "type": "branch",
        "level": 2
      }
    ],
    "memberCount": 120,
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z"
  }
}
```

**권한:**
- `organization.read` (읽기 권한)

---

### 2.3 조직 생성

**Endpoint:**
```
POST /api/organization
```

**Request Body:**

```json
{
  "name": "서울지부",
  "code": "SEOUL",
  "type": "division",
  "parentId": "org-national",
  "metadata": {
    "address": "서울특별시 강남구 테헤란로 123",
    "phone": "02-1234-5678",
    "email": "seoul@yaksa.or.kr"
  }
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ✅ | 조직명 (최대 255자) |
| `code` | string | ✅ | 조직 코드 (최대 100자, 고유값) |
| `type` | string | ✅ | 조직 유형 (`national`, `division`, `branch`) |
| `parentId` | string | ❌ | 상위 조직 ID (null = 최상위) |
| `metadata` | object | ❌ | 확장 필드 (주소, 연락처 등) |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "org-seoul",
    "name": "서울지부",
    "code": "SEOUL",
    "type": "division",
    "parentId": "org-national",
    "level": 1,
    "path": "/national/seoul",
    "metadata": {
      "address": "서울특별시 강남구 테헤란로 123",
      "phone": "02-1234-5678",
      "email": "seoul@yaksa.or.kr"
    },
    "isActive": true,
    "childrenCount": 0,
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  }
}
```

**검증 규칙:**
- `code`는 고유값 (중복 불가)
- `name`은 1자 이상 255자 이하
- `type`은 `national`, `division`, `branch` 중 하나
- `parentId`가 있는 경우 존재하는 조직 ID여야 함
- `parentId`가 자기 자신을 참조할 수 없음

**권한:**
- `organization.manage` (관리 권한)

---

### 2.4 조직 수정

**Endpoint:**
```
PUT /api/organization/:id
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Request Body:**

```json
{
  "name": "서울특별시지부",
  "metadata": {
    "address": "서울특별시 강남구 테헤란로 456",
    "phone": "02-9876-5432",
    "email": "seoul@yaksa.or.kr",
    "website": "https://seoul.yaksa.or.kr"
  }
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ❌ | 조직명 |
| `metadata` | object | ❌ | 확장 필드 (병합됨) |
| `isActive` | boolean | ❌ | 활성 여부 |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "org-seoul",
    "name": "서울특별시지부",
    "code": "SEOUL",
    "type": "division",
    "parentId": "org-national",
    "level": 1,
    "path": "/national/seoul",
    "metadata": {
      "address": "서울특별시 강남구 테헤란로 456",
      "phone": "02-9876-5432",
      "email": "seoul@yaksa.or.kr",
      "website": "https://seoul.yaksa.or.kr"
    },
    "isActive": true,
    "childrenCount": 5,
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z"
  }
}
```

**제약사항:**
- `code`, `type`, `parentId`, `level`, `path`는 수정 불가 (불변)
- `metadata`는 병합(merge) 방식 (기존 값 유지)

**권한:**
- `organization.manage` (관리 권한)
- 또는 해당 조직의 `admin` 역할

---

### 2.5 조직 삭제

**Endpoint:**
```
DELETE /api/organization/:id
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `force` | boolean | ❌ | 강제 삭제 (기본값: false) |

**요청 예시:**
```http
DELETE /api/organization/org-gangnam
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "org-gangnam"
  }
}
```

**삭제 규칙:**
- 하위 조직이 있는 경우 **삭제 불가** (에러 반환)
- 소속 멤버가 있는 경우 **삭제 불가** (에러 반환)
- `force=true`인 경우에도 하위 조직은 삭제 불가

**에러 예시:**
```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_HAS_CHILDREN",
    "message": "하위 조직이 존재하여 삭제할 수 없습니다.",
    "details": {
      "childrenCount": 3
    }
  }
}
```

**권한:**
- `organization.manage` (관리 권한)
- 또는 해당 조직의 `admin` 역할

---

### 2.6 하위 조직 조회 (계층)

**Endpoint:**
```
GET /api/organization/:id/descendants
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `maxDepth` | number | ❌ | 최대 깊이 (기본값: 무제한) |
| `includeInactive` | boolean | ❌ | 비활성 조직 포함 (기본값: false) |

**요청 예시:**
```http
GET /api/organization/org-national/descendants?maxDepth=2
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "org-seoul",
        "name": "서울지부",
        "code": "SEOUL",
        "type": "division",
        "level": 1,
        "path": "/national/seoul",
        "childrenCount": 5
      },
      {
        "id": "org-gangnam",
        "name": "강남분회",
        "code": "GANGNAM",
        "type": "branch",
        "level": 2,
        "path": "/national/seoul/gangnam",
        "childrenCount": 0
      }
    ],
    "total": 25
  }
}
```

**권한:**
- `organization.read` (읽기 권한)

---

## 3. OrganizationMember API

### 3.1 조직 멤버 목록 조회

**Endpoint:**
```
GET /api/organization/:id/members
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `role` | string | ❌ | 역할 필터 (`admin`, `manager`, `member`, `moderator`) |
| `includeLeft` | boolean | ❌ | 탈퇴 멤버 포함 (기본값: false) |
| `page` | number | ❌ | 페이지 번호 (기본값: 1) |
| `limit` | number | ❌ | 페이지 크기 (기본값: 20) |

**요청 예시:**
```http
GET /api/organization/org-seoul/members?role=admin&page=1&limit=20
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "orgmem-123",
        "organizationId": "org-seoul",
        "userId": "user-kim",
        "role": "admin",
        "isPrimary": true,
        "metadata": {
          "position": "지부장",
          "department": "총무부"
        },
        "joinedAt": "2025-01-15T09:00:00Z",
        "leftAt": null,
        "user": {
          "id": "user-kim",
          "email": "kim@example.com",
          "name": "김약사",
          "profileImage": "https://cdn.example.com/profiles/kim.jpg"
        },
        "createdAt": "2025-01-15T09:00:00Z",
        "updatedAt": "2025-01-15T09:00:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

**권한:**
- `organization.read` (읽기 권한)
- 또는 해당 조직의 멤버

---

### 3.2 조직 멤버 추가

**Endpoint:**
```
POST /api/organization/:id/members
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |

**Request Body:**

```json
{
  "userId": "user-park",
  "role": "manager",
  "isPrimary": false,
  "metadata": {
    "position": "총무부장",
    "department": "총무부"
  }
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | string | ✅ | 회원 ID (UUID) |
| `role` | string | ✅ | 역할 (`admin`, `manager`, `member`, `moderator`) |
| `isPrimary` | boolean | ❌ | 주 소속 조직 여부 (기본값: false) |
| `metadata` | object | ❌ | 확장 필드 (직책, 부서 등) |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "orgmem-456",
    "organizationId": "org-seoul",
    "userId": "user-park",
    "role": "manager",
    "isPrimary": false,
    "metadata": {
      "position": "총무부장",
      "department": "총무부"
    },
    "joinedAt": "2025-01-20T10:00:00Z",
    "leftAt": null,
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-01-20T10:00:00Z"
  }
}
```

**검증 규칙:**
- `userId`는 존재하는 사용자 ID여야 함
- 동일한 `(organizationId, userId)` 조합 중복 불가
- `isPrimary=true`인 경우 기존 주 소속 조직을 자동으로 해제

**권한:**
- `organization.manage` (관리 권한)
- 또는 해당 조직의 `admin` 역할

---

### 3.3 조직 멤버 수정

**Endpoint:**
```
PUT /api/organization/:id/members/:memberId
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |
| `memberId` | string | ✅ | 멤버 ID (UUID) |

**Request Body:**

```json
{
  "role": "admin",
  "metadata": {
    "position": "지부장",
    "department": "총무부"
  }
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `role` | string | ❌ | 역할 변경 |
| `isPrimary` | boolean | ❌ | 주 소속 조직 변경 |
| `metadata` | object | ❌ | 확장 필드 변경 |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": "orgmem-456",
    "organizationId": "org-seoul",
    "userId": "user-park",
    "role": "admin",
    "isPrimary": false,
    "metadata": {
      "position": "지부장",
      "department": "총무부"
    },
    "joinedAt": "2025-01-20T10:00:00Z",
    "leftAt": null,
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-01-22T15:30:00Z"
  }
}
```

**권한:**
- `organization.manage` (관리 권한)
- 또는 해당 조직의 `admin` 역할

---

### 3.4 조직 멤버 삭제 (탈퇴)

**Endpoint:**
```
DELETE /api/organization/:id/members/:memberId
```

**Path Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `id` | string | ✅ | 조직 ID (UUID) |
| `memberId` | string | ✅ | 멤버 ID (UUID) |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `permanent` | boolean | ❌ | 영구 삭제 여부 (기본값: false, soft delete) |

**요청 예시:**
```http
DELETE /api/organization/org-seoul/members/orgmem-456
```

**응답 예시 (Soft Delete):**
```json
{
  "success": true,
  "data": {
    "id": "orgmem-456",
    "organizationId": "org-seoul",
    "userId": "user-park",
    "leftAt": "2025-01-25T16:00:00Z"
  }
}
```

**응답 예시 (Permanent Delete):**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "orgmem-456"
  }
}
```

**권한:**
- `organization.manage` (관리 권한)
- 또는 해당 조직의 `admin` 역할
- 또는 본인 탈퇴 (userId가 본인)

---

### 3.5 사용자의 조직 목록 조회

**Endpoint:**
```
GET /api/organization/my
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `includeLeft` | boolean | ❌ | 탈퇴 조직 포함 (기본값: false) |

**요청 예시:**
```http
GET /api/organization/my
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "orgmem-123",
        "organizationId": "org-seoul",
        "userId": "user-kim",
        "role": "admin",
        "isPrimary": true,
        "joinedAt": "2025-01-15T09:00:00Z",
        "organization": {
          "id": "org-seoul",
          "name": "서울지부",
          "code": "SEOUL",
          "type": "division",
          "level": 1,
          "path": "/national/seoul"
        }
      },
      {
        "id": "orgmem-789",
        "organizationId": "org-gangnam",
        "userId": "user-kim",
        "role": "member",
        "isPrimary": false,
        "joinedAt": "2025-01-18T14:00:00Z",
        "organization": {
          "id": "org-gangnam",
          "name": "강남분회",
          "code": "GANGNAM",
          "type": "branch",
          "level": 2,
          "path": "/national/seoul/gangnam"
        }
      }
    ],
    "total": 2
  }
}
```

**권한:**
- 인증된 사용자 (본인의 조직 목록만 조회)

---

## 4. 권한 검증

### 4.1 권한 체계

| 권한 | 설명 | 대상 API |
|------|------|----------|
| `organization.read` | 조직 읽기 | GET /api/organization, GET /api/organization/:id |
| `organization.manage` | 조직 관리 | POST, PUT, DELETE /api/organization |
| `organization.member.read` | 조직 멤버 읽기 | GET /api/organization/:id/members |
| `organization.member.manage` | 조직 멤버 관리 | POST, PUT, DELETE /api/organization/:id/members |

### 4.2 조직 스코프 권한

**전역 권한 (scopeType: 'global'):**
```typescript
{
  userId: "user-admin",
  role: "super_admin",
  scopeType: "global",
  scopeId: null
}
// → 모든 조직에 대한 관리 권한
```

**조직 권한 (scopeType: 'organization'):**
```typescript
{
  userId: "user-seoul-admin",
  role: "admin",
  scopeType: "organization",
  scopeId: "org-seoul"
}
// → 서울지부에 대한 관리 권한만
```

### 4.3 권한 검증 예시

```typescript
// OrganizationController.ts
@Put(':id')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('organization.manage')
async updateOrganization(
  @Param('id') id: string,
  @Body() dto: UpdateOrganizationDto,
  @CurrentUser() user: User
) {
  // 1. 전역 권한 체크
  if (await this.authService.hasGlobalPermission(user.id, 'organization.manage')) {
    return await this.service.update(id, dto);
  }

  // 2. 조직 권한 체크
  if (await this.authService.hasOrganizationPermission(user.id, 'organization.manage', id)) {
    return await this.service.update(id, dto);
  }

  throw new ForbiddenException('권한이 없습니다.');
}
```

---

## 5. 에러 처리

### 5.1 에러 코드

| 코드 | HTTP 상태 | 설명 |
|------|-----------|------|
| `ORGANIZATION_NOT_FOUND` | 404 | 조직을 찾을 수 없음 |
| `ORGANIZATION_CODE_DUPLICATE` | 409 | 조직 코드 중복 |
| `ORGANIZATION_HAS_CHILDREN` | 400 | 하위 조직 존재 (삭제 불가) |
| `ORGANIZATION_HAS_MEMBERS` | 400 | 소속 멤버 존재 (삭제 불가) |
| `MEMBER_NOT_FOUND` | 404 | 멤버를 찾을 수 없음 |
| `MEMBER_ALREADY_EXISTS` | 409 | 이미 조직에 가입됨 |
| `INVALID_PARENT_ORGANIZATION` | 400 | 유효하지 않은 상위 조직 |
| `CIRCULAR_REFERENCE` | 400 | 순환 참조 (자기 자신을 상위 조직으로 지정) |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 |

### 5.2 에러 응답 예시

**조직을 찾을 수 없음:**
```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "조직을 찾을 수 없습니다.",
    "details": {
      "organizationId": "org-invalid"
    }
  }
}
```

**조직 코드 중복:**
```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_CODE_DUPLICATE",
    "message": "이미 존재하는 조직 코드입니다.",
    "details": {
      "code": "SEOUL"
    }
  }
}
```

**하위 조직 존재 (삭제 불가):**
```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_HAS_CHILDREN",
    "message": "하위 조직이 존재하여 삭제할 수 없습니다.",
    "details": {
      "childrenCount": 5
    }
  }
}
```

---

## 6. 페이지네이션

### 6.1 요청 형식

```http
GET /api/organization?page=2&limit=20
```

### 6.2 응답 형식

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 2,
    "limit": 20,
    "totalPages": 8
  }
}
```

### 6.3 기본값

- `page`: 1 (첫 페이지)
- `limit`: 20 (한 페이지당 20개)
- `maxLimit`: 100 (최대 100개)

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
