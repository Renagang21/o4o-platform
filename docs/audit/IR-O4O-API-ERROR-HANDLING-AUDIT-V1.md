# IR-O4O-API-ERROR-HANDLING-AUDIT-V1

O4O Platform API Error Handling Audit Report

**Date:** 2026-03-17
**Status:** Complete
**Scope:** Backend (api-server) + Frontend (5 web services)

---

## Executive Summary

O4O 플랫폼 전체의 에러 처리 현황을 조사했다.
플랫폼은 구조적 안정화 단계에 진입했으나, **에러 처리는 4개 이상의 호환 불가능한 포맷**이 혼재하고 있다.

### 핵심 수치

| 지표 | 값 | 등급 |
|------|------|------|
| Generic `throw new Error()` | 661건 / 131파일 | P2 |
| `console.error()` 호출 | 661건 / 131파일 | P3 |
| Silent `.catch(() => {})` | 11건 | P1 |
| Error Response 포맷 종류 | 4개 (비호환) | P1 |
| BaseController 채택률 | ~30% | P2 |
| Frontend Toast/Notification | 0개 서비스 | P2 |
| Frontend `alert()` 사용 | 33건+ | P3 |
| 서비스별 고유 에러 메시지 | 166건+ | P3 |

---

## 1. Backend Error Patterns

### 1.1 Generic Error 사용 (P2)

**661건**의 `throw new Error(message)` — Custom Error Class 대신 범용 Error 사용.

**최다 사용 파일:**

| 파일 | 건수 | 예시 |
|------|------|------|
| `cosmetics-store.service.ts` | 45+ | `throw new Error('PENDING_APPLICATION_EXISTS')` |
| `signage.service.ts` | 16 | `throw new Error('Playlist not found')` |
| `neture.service.ts` | 16+ | `throw new Error('Insufficient stock for product')` |
| `seller-offer.service.ts` | 15+ | Offer validation errors |
| `glycopharm.service.ts` | 10+ | `throw new Error('SKU_DUPLICATE')` |

**문제:** Error.message를 문자열 비교하여 HTTP status 분기 → 취약하고 유지보수 어려움.

```typescript
// CURRENT (문제)
throw new Error('PENDING_APPLICATION_EXISTS');
// Controller에서:
if (error.message === 'PENDING_APPLICATION_EXISTS') {
  return errorResponse(res, 409, 'STORE_012', '...');
}

// SHOULD BE
throw new ConflictError('PENDING_APPLICATION_EXISTS', '이미 신청이 존재합니다');
```

### 1.2 Silent Error Swallowing (P1)

**11건**의 `.catch(() => {})` — 에러 완전 무시:

| 파일 | 위치 | 설명 |
|------|------|------|
| `cockpit.controller.ts` | L797,815,833 | actionLogService 실패 무시 |
| `hub-trigger.controller.ts` | 7곳 | background task 실패 무시 |
| `branch-public.controller.ts` | L228 | auto-listing 실패 무시 |

### 1.3 AuditLog Silent Failures (P2)

KPA 컨트롤러에서 AuditLog 실패를 console.error만 하고 무시:

```typescript
} catch (e) { console.error('[KPA AuditLog] Failed:', e); }
```

위치: `application.controller.ts`, `branch-admin-dashboard.controller.ts`, `member.controller.ts`

### 1.4 Global Error Handler (GOOD)

`common/middleware/error-handler.middleware.ts` — 잘 구현됨:
- `AppError` 클래스 (statusCode, code, details)
- Stack trace: dev only
- 표준 응답: `{ success: false, error, code, details }`
- **문제:** BaseController 채택률 ~30% → 대부분 컨트롤러가 직접 에러 처리

---

## 2. HTTP Status Code 분석

### 2.1 사용 현황

| Status | 건수 | 평가 |
|--------|------|------|
| 200 | 39 (explicit) | 정상 |
| 201 | 199 | 정상 |
| 400 | 612 | 정상 |
| 401 | 299 | 정상 |
| 403 | 231 | 정상 |
| 404 | 634 | 정상 |
| 409 | 74 | 정상 |
| 500 | 1,203 | **과다** |

### 2.2 Status Code 오용 (P1)

**catch 블록 500 남용:** 모든 catch에서 500 반환 — 400/404여야 할 에러도 500:

```typescript
// CURRENT (문제)
} catch (error) {
  res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
}
// 실제로는 validation error (400) 또는 not found (404)일 수 있음
```

### 2.3 Error Code 누락 (P2)

일부 500 응답에서 `code` 필드 없음:
```typescript
// MISSING CODE
res.status(500).json({ success: false, error: 'Failed to fetch users' });
// SHOULD BE
res.status(500).json({ success: false, error: 'Failed to fetch users', code: 'INTERNAL_ERROR' });
```

---

## 3. Error Response 구조 비교 (P1)

### 4개 비호환 포맷 혼재

| 포맷 | 비율 | 사용 서비스 |
|------|------|-----------|
| **Format A:** `{ error: { code, message } }` | 46.5% | GlycoPharm, KPA, GlucoseView, Cosmetics |
| **Format B:** `{ success: false, error: string }` | 31.2% | Neture, Forum, Store Console |
| **Format C:** `{ error: 'string' }` | 12.3% | Signage, Legacy controllers |
| **Format D:** `{ success: true/false, ...spread }` | 10% | 일부 Operator 응답 |

### 서비스별 비교

| 항목 | Neture | GlycoPharm | KPA | GlucoseView | Cosmetics |
|------|--------|-----------|-----|-------------|-----------|
| Error 구조 | `{success:false, error:'CODE'}` | `{error:{code,msg}}` | 혼합 | `{error:{code,msg}}` | `{error:{code,msg,details}}` |
| 404 포맷 | `success:false, error:'NOT_FOUND'` | `error:{code:'NOT_FOUND'}` | `error:{code:'NOT_FOUND'}` | `error:{code:'NOT_FOUND'}` | nested object |
| Validation | Basic string | Nested + details | Full details | Basic + details | Full details |
| catch 패턴 | String error | Nested error object | 혼합 | Nested error object | Nested + details |

### Auth Error 구조 불일치

```typescript
// Middleware (표준)
{ success: false, error: { code: 'UNAUTHORIZED', message: '...' } }

// Neture (다름)
{ success: false, error: 'UNAUTHORIZED', message: '...' }

// GlycoPharm (다름)
{ error: { code: 'UNAUTHORIZED', message: '...' } }
```

---

## 4. Frontend Error Handling

### 4.1 Error Display 방식 비교

| 기능 | Neture | GlycoPharm | GlucoseView | K-Cosmetics | KPA Society |
|------|--------|-----------|------------|------------|------------|
| Toast/알림 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Inline Error (setError) | ✅ | ✅ | ✅ | ✅ | ✅ |
| ErrorState 컴포넌트 | ❌ | ✅ | ❌ | ❌ | ❌ |
| Error Boundary | ❌ | ❌ | ❌ | ❌ | ❌ |
| alert() 사용 | 6건 | 8건 | 5건 | 2건 | 12건 |
| Error Swallowing | 8건 | 6건 | 4건 | 2건 | 5건 |
| 고유 에러 메시지 | 35개 | 42개 | 15개 | 9개 | 65개 |

### 4.2 401/403 Frontend 처리

| 기능 | Neture | GlycoPharm | GlucoseView | K-Cosmetics | KPA Society |
|------|--------|-----------|------------|------------|------------|
| Auto-Refresh (401) | ✅ authClient | ✅ authClient | ✅ authClient | ✅ authClient | ✅ custom |
| Manual 401 체크 | ❌ | ✅ (2 pages) | ✅ (1 page) | ❌ | ❌ |
| 403 구분 처리 | ❌ | ✅ (일부) | ✅ (일부) | ❌ | Guards |
| Login redirect | ❌ | ✅ | ❌ | ❌ | ✅ |

### 4.3 주요 문제

1. **Toast/Notification 시스템 없음** — 모든 에러가 컴포넌트 state에 갇힘
2. **Error Boundary 없음** — 컴포넌트 crash 시 전체 페이지 백화현상
3. **alert() 남용 (33건+)** — 워크플로우 차단
4. **에러 메시지 하드코딩 (166건+)** — 중앙 관리 불가

---

## 5. API Client 비교

### 5.1 HTTP Client

| 서비스 | Client | Auth | Error 전파 |
|--------|--------|------|-----------|
| Neture | Axios (authClient) | auto interceptor | throw (Axios) |
| GlycoPharm | Axios (authClient) | auto interceptor | throw (custom obj) |
| GlucoseView | Axios (authClient) | auto interceptor | return `{success:false}` |
| K-Cosmetics | Axios (authClient) | auto interceptor | throw (Axios) |
| KPA Society | Fetch (custom) | manual Bearer | throw (custom obj) |

### 5.2 Token Refresh 실패 처리

| 서비스 | Refresh 실패 시 |
|--------|----------------|
| Neture/GlycoPharm/GlucoseView/K-Cosmetics | authClient가 silent 처리 → user null |
| KPA Society | `clearAllTokens()` + `auth:token-cleared` 이벤트 |

### 5.3 주요 격차

- **KPA만 fetch 기반** — 나머지 4개는 Axios (authClient)
- **GlucoseView만 safe return** — 나머지는 throw
- **403 구분 없음** — 전체 서비스에서 403을 일반 에러로 처리
- **KPA: PASSWORD_MISMATCH 미지원** — 비밀번호 동기화 불가

---

## 6. 위험도 분류

### P0 — 서버 Crash 가능

없음. Global error handler가 uncaught exception을 잡고 있음.

### P1 — 잘못된 API Response

| # | 문제 | 위치 | 설명 |
|---|------|------|------|
| 1 | Error Response 4개 포맷 혼재 | 전체 | Frontend가 에러 파싱 불가능 |
| 2 | catch 블록 500 남용 | 전체 컨트롤러 | 400/404→500 오분류 |
| 3 | Silent `.catch(() => {})` | cockpit, hub-trigger | 에러 완전 무시 |
| 4 | Auth Error 구조 불일치 | 서비스별 | 같은 401이지만 다른 JSON 구조 |

### P2 — 디버깅 어려움

| # | 문제 | 위치 | 설명 |
|---|------|------|------|
| 5 | Generic Error 661건 | 131 파일 | error.message 문자열 비교 |
| 6 | Error Code 누락 | 500 응답 일부 | machine-readable code 없음 |
| 7 | BaseController 채택률 30% | controllers | 표준 미적용 |
| 8 | Frontend Toast 없음 | 5개 서비스 | 에러 표시 일관성 없음 |
| 9 | Error Boundary 없음 | 5개 서비스 | 컴포넌트 crash → 백화 |

### P3 — 코드 정리 필요

| # | 문제 | 위치 | 설명 |
|---|------|------|------|
| 10 | console.error 661건 | 전체 | 구조화된 로깅 필요 |
| 11 | alert() 33건+ | 5개 프론트엔드 | Toast로 교체 필요 |
| 12 | 에러 메시지 166건+ | 5개 프론트엔드 | 중앙 관리 필요 |
| 13 | AuditLog silent fail | KPA controllers | 로깅 개선 필요 |

---

## 7. 표준화 대상 목록 (WO-O4O-ERROR-HANDLING-STANDARDIZATION 입력)

### Backend 표준화

| 항목 | 현재 | 목표 |
|------|------|------|
| Error Class | `new Error(msg)` | `AppError` / `ValidationError` / `NotFoundError` / `ConflictError` |
| Error Response | 4개 포맷 | `{ success: false, error: { code, message, details? } }` 단일 포맷 |
| HTTP Status | catch→500 | Error Class별 자동 매핑 |
| Error Code | 산발적 | `ErrorCode` enum 중앙 관리 |
| Global Handler | 존재하나 30% 활용 | 100% 활용 (throw → handler가 응답) |

### Frontend 표준화

| 항목 | 현재 | 목표 |
|------|------|------|
| Error Display | setError + alert() | Toast (react-hot-toast) |
| Error Boundary | 없음 | React ErrorBoundary 전체 적용 |
| Error Messages | 하드코딩 166건+ | ErrorMessage enum/constants |
| 401 처리 | authClient silent | 명시적 redirect + retry UI |
| 403 처리 | 미구분 | 권한 부족 전용 UI |
| API Error Format | 서비스별 다름 | `{ code, message, status }` 통일 |

---

## 8. 후속 작업

이 IR 결과를 기반으로 다음 WO 생성:

```
WO-O4O-ERROR-HANDLING-STANDARDIZATION-V1
```

**Phase 1:** Backend Error Classes + ErrorCode enum
**Phase 2:** Error Response 포맷 통일
**Phase 3:** Frontend Toast + Error Boundary
**Phase 4:** API Client Error 표준화

---

*Audit completed: 2026-03-17*
*Auditor: Claude Opus 4.6*
