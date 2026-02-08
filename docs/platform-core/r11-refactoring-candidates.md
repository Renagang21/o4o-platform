# R11 Refactoring Candidate Extraction

> **Status**: Complete
> **Created**: 2025-12-25
> **Purpose**: G10 리팩토링 범위 확정

---

## 1. 조사 개요

### 1.1 조사 대상

| 앱 | 위치 | 상태 |
|----|------|------|
| Forum API Alpha | `apps/forum-api/` | G7 완료 |
| Commerce API Alpha | `apps/commerce-api/` | G9 완료 |
| App API Reference | `apps/app-api-reference/` | FROZEN |

### 1.2 조사 질문

> 2회 이상 반복된 항목 중, app-api-reference에 흡수할 항목은 무엇인가?

---

## 2. 반복 항목 분석

### 2.1 100% 동일 코드 (복사-붙여넣기)

| 항목 | Forum | Commerce | 동일성 | 흡수 대상 |
|------|-------|----------|--------|-----------|
| `ValidationError` interface | ✅ | ✅ | 100% | **YES** |
| `ValidationResult` interface | ✅ | ✅ | 100% | **YES** |
| `PAGINATION_LIMITS` const | ✅ | ✅ | 100% | **YES** |
| `validatePagination()` | ✅ | ✅ | 100% | **YES** |
| `ApiErrorResponse` interface | ✅ | ✅ | 100% | **YES** |
| `sendValidationError()` | ✅ | ✅ | 100% | **YES** |
| `sendUnauthorizedError()` | ✅ | ✅ | 100% | **YES** |
| `sendForbiddenError()` | ✅ | ✅ | 100% | **YES** |
| `sendNotFoundError()` | ✅ | ✅ | 100% | **YES** |
| `sendInternalError()` | ✅ | ✅ | 100% | **YES** |
| `sendError()` | ✅ | ✅ | 100% | **YES** |

### 2.2 구조 동일, 값만 다름

| 항목 | Forum | Commerce | 차이점 | 흡수 대상 |
|------|-------|----------|--------|-----------|
| `ErrorCodes` const | ✅ | ✅ | 도메인별 코드 추가 | **YES** (기본만) |
| Domain-specific validators | `validateCreateThread` | `validateCreateOrder` | 도메인 로직 | **NO** |

### 2.3 Reference 타입 불완전

| 항목 | Reference 현재 | 수정 필요 | 흡수 대상 |
|------|---------------|-----------|-----------|
| `UserContext.name` | 없음 | `name?: string` 추가 | **YES** |
| `response.data` 타입 | `unknown` | 제네릭 추가 | **YES** |
| `error: any` | 사용 | `error: unknown` + 타입가드 | **YES** |
| `isAuthenticated` → `authenticated` | 불일치 | 통일 | **YES** |

---

## 3. G10 허용 범위 (확정)

### 3.1 app-api-reference 수정 허용 항목

#### utils/validation.ts (신규)

```typescript
// 흡수 대상:
export interface ValidationError { field, message, code }
export interface ValidationResult { valid, errors }
export const PAGINATION_LIMITS = { ... }
export function validatePagination(query): { page, limit }
```

#### utils/errors.ts (신규)

```typescript
// 흡수 대상 (기본 코드만):
export const ErrorCodes = {
  VALIDATION_ERROR, INVALID_INPUT,
  UNAUTHORIZED, TOKEN_EXPIRED, TOKEN_INVALID,
  FORBIDDEN, INSUFFICIENT_PERMISSIONS,
  NOT_FOUND,
  CONFLICT, DUPLICATE_ENTRY,
  INTERNAL_ERROR, DATABASE_ERROR, EXTERNAL_SERVICE_ERROR
}

export interface ApiErrorResponse { ... }
export function sendValidationError(res, errors)
export function sendUnauthorizedError(res, message?)
export function sendForbiddenError(res, message?)
export function sendNotFoundError(res, code?, message?)
export function sendInternalError(res, message?)
export function sendError(res, statusCode, code, message, details?)
```

#### middleware/auth.middleware.ts (수정)

```typescript
// 수정 대상:
export interface UserContext {
  id: string;
  email: string;
  name?: string;  // 추가
  roles: string[];
}

// isAuthenticated → authenticated 통일
export interface AuthenticatedRequest extends Request {
  user?: UserContext;
  authenticated?: boolean;  // 변경
}

// 타입 개선
interface CoreAPIVerifyResponse { ... }  // 추가
function isAxiosError(error: unknown): ... // 추가
// error: any → error: unknown 변경
```

#### routes/health.routes.ts (수정)

```typescript
// 타입 개선:
axios.get<{ status: string }>(...) // 제네릭 추가
error: unknown // any → unknown
```

### 3.2 G10 금지 항목

| 항목 | 이유 |
|------|------|
| 도메인별 Validator | 앱 고유 로직 |
| 도메인별 ErrorCodes 확장 | 앱에서 확장 |
| main.ts 구조 변경 | 안정성 |
| Express 미들웨어 순서 변경 | 안정성 |
| 새로운 의존성 추가 | 범위 초과 |

---

## 4. 흡수 위치 정리

| 파일 | 작업 | 위치 |
|------|------|------|
| `utils/validation.ts` | 신규 생성 | app-api-reference |
| `utils/errors.ts` | 신규 생성 | app-api-reference |
| `middleware/auth.middleware.ts` | 수정 | app-api-reference |
| `routes/health.routes.ts` | 수정 | app-api-reference |

---

## 5. G10 Work Order 범위 (사전 확정)

```
G10 허용 작업:
- [x] utils/validation.ts 신규 생성 (4개 항목)
- [x] utils/errors.ts 신규 생성 (11개 항목)
- [x] auth.middleware.ts UserContext.name 추가
- [x] auth.middleware.ts authenticated 필드명 통일
- [x] auth.middleware.ts 타입 개선 (CoreAPIVerifyResponse, isAxiosError)
- [x] health.routes.ts axios 제네릭 타입 추가
- [x] health.routes.ts error: unknown 변경

G10 금지 작업:
- [ ] 도메인별 validator 추가
- [ ] 도메인별 error code 추가
- [ ] main.ts 구조 변경
- [ ] 새 의존성 추가
- [ ] Express 설정 변경
```

---

## 6. G10 이후 예상 효과

### Before (매 앱마다)
```
1. Reference 복사
2. validation.ts 작성 (반복)
3. errors.ts 작성 (반복)
4. auth.middleware.ts 타입 수정 (반복)
5. health.routes.ts 타입 수정 (반복)
```

### After (G10 완료 후)
```
1. Reference 복사
2. 도메인 라우트만 작성
```

---

## 7. 결론

**R11 조사 결과**: 15개 항목이 2회 이상 반복 확인됨
**G10 허용 항목**: 15개 전체 흡수 가능
**G10 금지 항목**: 도메인 로직, 구조 변경, 의존성 추가

**Status: G10 진행 가능**

---

*Investigation ID: IR-20251225-R11-REFACTOR-CANDIDATES*
*Completed: 2025-12-25*
