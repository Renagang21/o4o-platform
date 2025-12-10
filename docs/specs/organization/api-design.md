# Organization API Design

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

Organization-Core의 REST API 명세입니다.
모든 API는 Module Loader를 통해 자동 등록되며, 표준 응답 형식을 따릅니다.

### Base URL

```
/api/v1/organization
```

### 인증

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 2. 공통 규격

### 성공 응답

```typescript
// 목록
{ data: T[], meta: { total, page, pageSize, totalPages } }

// 단일
{ data: T }
```

### 에러 응답

```typescript
{ error: { code: string, message: string } }
```

---

## 3. Organization API

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/organization` | 조직 목록 |
| GET | `/api/v1/organization/:id` | 조직 상세 |
| POST | `/api/v1/organization` | 조직 생성 |
| PUT | `/api/v1/organization/:id` | 조직 수정 |
| DELETE | `/api/v1/organization/:id` | 조직 삭제 |
| GET | `/api/v1/organization/:id/children` | 하위 조직 |
| GET | `/api/v1/organization/:id/tree` | 조직 트리 |

### Query Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| type | string | 조직 유형 (national/division/branch) |
| parentId | string | 상위 조직 ID |
| isActive | boolean | 활성 여부 |
| search | string | 검색어 |
| page | number | 페이지 번호 |
| limit | number | 페이지 크기 |

---

## 4. OrganizationMember API

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/organization/:orgId/members` | 멤버 목록 |
| POST | `/api/v1/organization/:orgId/members` | 멤버 추가 |
| PUT | `/api/v1/organization/:orgId/members/:userId` | 멤버 수정 |
| DELETE | `/api/v1/organization/:orgId/members/:userId` | 멤버 삭제 |

---

## 5. Admin API

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/admin/organization/stats` | 통계 |
| GET | `/api/v1/admin/organization/all` | 전체 조직 |

---

## 6. 에러 코드

| 코드 | 설명 |
|------|------|
| `ORG_NOT_FOUND` | 조직 없음 |
| `ORG_DUPLICATE_CODE` | 중복 코드 |
| `ORG_INVALID_PARENT` | 잘못된 상위 조직 |
| `ORG_CIRCULAR_REFERENCE` | 순환 참조 |
| `ORG_MEMBER_EXISTS` | 이미 멤버 |

---

## 7. 규칙

1. **표준 응답 형식**: `{ data, meta }` 형식 준수
2. **인증 필수**: 모든 API는 Bearer Token 인증 필요
3. **버전 prefix**: `/api/v1/` prefix 사용
4. **계층 구조**: parentId를 통한 조직 계층 관리

---
*최종 업데이트: 2025-12-10*
