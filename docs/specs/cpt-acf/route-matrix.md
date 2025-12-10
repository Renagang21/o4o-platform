# CPT/ACF Route Matrix

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

CPT/ACF 시스템의 API 라우트 구조를 정의합니다.
모든 라우트는 `/api/v1/` prefix를 사용하며, Module Loader가 자동 등록합니다.

---

## 2. 표준 라우트 구조

### CPT 기본 라우트

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/{cpt}` | 목록 조회 |
| GET | `/api/v1/{cpt}/:id` | 단일 조회 |
| POST | `/api/v1/{cpt}` | 생성 |
| PUT | `/api/v1/{cpt}/:id` | 수정 |
| DELETE | `/api/v1/{cpt}/:id` | 삭제 |

### Admin 라우트

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/admin/{cpt}` | 관리자 목록 |
| GET | `/api/v1/admin/{cpt}/stats` | 통계 조회 |

---

## 3. 표준 응답 형식

### 목록 조회

```typescript
{
  data: T[],
  meta: {
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }
}
```

### 단일 조회

```typescript
{
  data: T,
  meta?: { }
}
```

---

## 4. 라우트 등록 방식

라우트는 앱의 manifest.ts에서 선언되며, Module Loader가 자동 등록합니다.

```typescript
// manifest.ts
export const manifest = {
  routes: {
    prefix: '/api/v1/products',
    controller: ProductController
  }
};
```

---

## 5. 규칙

1. **버전 prefix 필수**: 모든 API는 `/api/v1/` prefix 사용
2. **자동 등록**: manifest 선언 시 Module Loader가 자동 등록
3. **표준 응답**: `{ data, meta }` 형식 준수
4. **RESTful 규칙**: HTTP Method와 리소스 명명 규칙 준수

---
*최종 업데이트: 2025-12-10*
