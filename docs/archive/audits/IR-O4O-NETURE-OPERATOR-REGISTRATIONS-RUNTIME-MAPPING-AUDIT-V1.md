# IR-O4O-NETURE-OPERATOR-REGISTRATIONS-RUNTIME-MAPPING-AUDIT-V1

> **조사 일자**: 2026-03-15
> **심각도**: HIGH — 코드 수정은 정확하나, 인증 스코프 불일치로 API가 403 반환 가능
> **조사 범위**: 코드만 분석, 수정 없음

---

## 1. 조사 배경

WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1 + WO-O4O-NETURE-OPERATOR-COPILOT-REGISTRATION-V1 완료 후,
`/workspace/operator/registrations` 화면이 여전히 **"조건에 맞는 가입 신청이 없습니다"** 를 표시.

> 핵심 질문: **"이 화면을 실제로 만드는 파일이 무엇인가"**
> 핵심 의심: **"수정한 코드가 전혀 반영되지 않았다"**

---

## 2. Route 매핑 분석

### 2-1. 프론트엔드 라우트 체인

```
App.tsx:308-309  lazy(() => import('./pages/operator/registrations')
                           .then(m => ({ default: m.RegistrationRequestsPage })))

registrations/index.ts:5  export { default as RegistrationRequestsPage } from './RegistrationRequestsPage'

RegistrationRequestsPage.tsx:70  export default function RegistrationRequestsPage()

App.tsx:658  <Route path="/workspace/operator/registrations" element={<RegistrationRequestsPage />} />
```

### 2-2. 라우트 래퍼

```tsx
// App.tsx:650-654
<Route element={
  <ProtectedRoute allowedRoles={['admin', 'operator']}>
    <OperatorLayout />
  </ProtectedRoute>
}>
  <Route path="/workspace/operator/registrations" element={<RegistrationRequestsPage />} />
  ...
</Route>
```

- `ProtectedRoute` = `RoleGuard` (App.tsx:391)
- `RoleGuard`: `user.roles.some(r => ['admin', 'operator'].includes(r))` → 프론트엔드 렌더링 허용

### 2-3. 결론

| 항목 | 결과 |
|------|------|
| 라우트 경로 | `/workspace/operator/registrations` ✅ |
| 렌더링 컴포넌트 | `RegistrationRequestsPage.tsx` ✅ |
| Lazy import | `./pages/operator/registrations` → barrel → default export ✅ |
| 중복 파일 | 없음 (Glob 확인) ✅ |

**결론: 수정한 RegistrationRequestsPage.tsx가 이 URL을 렌더링하는 파일이 맞다.**

---

## 3. UI 문자열 역추적

| 문자열 | 위치 | 유일성 |
|--------|------|--------|
| `가입 신청 관리` | `RegistrationRequestsPage.tsx:2,265` | 유일 ✅ |
| `조건에 맞는 가입 신청이 없습니다` | `RegistrationRequestsPage.tsx:341` | 유일 ✅ |
| `가입 승인` (사이드바) | `OperatorLayout.tsx:47` | 유일 ✅ |

**결론: 이 문자열을 표시하는 파일은 하나뿐이며, 수정한 파일과 동일하다.**

---

## 4. 중복 페이지 조사

```
Glob: services/web-neture/src/pages/**/Registration* → 1 결과
Glob: services/web-neture/src/pages/**/registration* → 0 결과
```

유일한 Registration 관련 페이지:
`services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx`

**결론: 중복 페이지 없음.**

---

## 5. Legacy Redirect 분석

```tsx
// App.tsx:718-719
<Route path="/operator" element={<Navigate to="/workspace/operator" replace />} />
<Route path="/operator/*" element={<Navigate to="/workspace/operator" replace />} />
```

- `/operator/registrations` → `/workspace/operator` (NOT `/workspace/operator/registrations`)
- 그러나 사용자가 접근하는 경로는 `/workspace/operator/registrations` 이므로 redirect 대상 아님
- React Router는 구체적인 경로(`/workspace/operator/registrations`)를 먼저 매칭

**결론: Legacy redirect가 이 경로에 영향 없음.**

---

## 6. API 호출 경로 분석

### 6-1. 프론트엔드 API 클라이언트

```typescript
// admin.ts:868-883
export const operatorRegistrationApi = {
  async getRegistrations(filters?: { status?: string }): Promise<RegistrationRecord[]> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/neture/operator/registrations${qs}`,
      { credentials: 'include' },
    );
    if (!response.ok) return [];  // ⚠️ 모든 HTTP 에러를 빈 배열로 처리
    const result = await response.json();
    return result.data || [];
  },
};
```

### 6-2. 백엔드 라우트 체인

```
main.ts:1164-1165
  app.use('/api/v1/neture', createNetureModuleRoutes(dataSource))

neture.routes.ts:72
  router.use('/operator', createOperatorRegistrationController(dataSource))

operator-registration.controller.ts:27-47
  router.get('/registrations', requireAuth, requireNetureScope('neture:operator'), ...)
```

**전체 경로**: `GET /api/v1/neture/operator/registrations` ← 프론트엔드 호출과 일치 ✅

### 6-3. RegistrationRequestsPage의 API 호출 변경 확인

```typescript
// RegistrationRequestsPage.tsx:22
import { operatorRegistrationApi } from '../../../lib/api';  // ✅ 새 API 클라이언트

// RegistrationRequestsPage.tsx:85
const data = await operatorRegistrationApi.getRegistrations();  // ✅ 새 엔드포인트 호출

// RegistrationRequestsPage.tsx:119
await operatorRegistrationApi.approve(request.id);  // ✅ 새 승인 API

// RegistrationRequestsPage.tsx:141 (handleReject)
await operatorRegistrationApi.reject(request.id, rejectReason);  // ✅ 새 거부 API
```

**결론: 코드 변경은 올바르게 적용됨. 문제는 코드 수정이 아님.**

---

## 7. ROOT CAUSE: 인증 스코프 불일치 (B-CRITICAL)

### 7-1. 다른 Operator API vs Registration API 비교

| API | 인증 미들웨어 | 요구 역할 |
|-----|-------------|----------|
| Operator Copilot Dashboard (`/api/v1/operator/copilot/*`) | `authenticate` + `requireAdmin` | `admin`, `super_admin`, `operator` (레거시 역할) |
| Operator Supply Products (`/api/v1/neture/operator/supply-products`) | `requireAuth` (스코프 없음) | 로그인만 |
| **Registration API** (`/api/v1/neture/operator/registrations`) | `requireAuth` + `requireNetureScope('neture:operator')` | `neture:operator`, `neture:admin` (접두사 역할) |

### 7-2. 인증 체인 분석

```
requireNetureScope('neture:operator')
  = createMembershipScopeGuard(NETURE_SCOPE_CONFIG)('neture:operator')
```

**Membership Guard 체인**:
1. `platform:super_admin` + `platformBypass=true` → bypass ✅
2. `user.roles.some(r => r.startsWith('neture:'))` → bypass ✅
3. membership check: `serviceKey = 'neture'`, `status = 'active'`
4. 위 모두 실패 → **403 MEMBERSHIP_NOT_FOUND**

**Scope Guard 체인**:
1. `scopeRoleMapping['neture:operator']` = `['neture:operator', 'neture:admin']`
2. `platformBypass=true` → `rolesToCheck` += `'platform:super_admin'`
3. `userRoles.some(r => rolesToCheck.includes(r))`
4. 매칭 없음 → **403 FORBIDDEN**

### 7-3. 프론트엔드 vs 백엔드 불일치

```
프론트엔드 (RoleGuard):
  user.roles.some(r => ['admin', 'operator'].includes(r))
  → 'admin' 매칭 → ✅ 페이지 렌더링

백엔드 (requireNetureScope):
  user.roles.some(r => ['neture:operator', 'neture:admin', 'platform:super_admin'].includes(r))
  → 'admin' 매칭 실패 → ❌ 403 반환

프론트엔드 에러 처리:
  if (!response.ok) return [];  // 403을 빈 배열로 변환
  → 화면: "조건에 맞는 가입 신청이 없습니다"
```

### 7-4. 증거

| 시나리오 | 프론트엔드 | 백엔드 | 화면 결과 |
|---------|-----------|--------|----------|
| User `roles: ['admin']` | ✅ 렌더링 | ❌ 403 | "조건에 맞는 가입 신청이 없습니다" |
| User `roles: ['neture:admin']` | ✅ 렌더링 | ✅ 데이터 | 정상 표시 |
| User `roles: ['platform:super_admin']` | ❌ 리다이렉트 (ProtectedRoute) | ✅ bypass | 페이지 접근 불가 |
| User `roles: ['admin', 'neture:admin']` | ✅ 렌더링 | ✅ 데이터 | 정상 표시 |

---

## 8. 부가 발견: Silent Error Swallowing

```typescript
// admin.ts:876
if (!response.ok) return [];
```

모든 HTTP 에러(401/403/404/500)가 빈 배열로 변환됨.

- 콘솔 경고 없음 (try-catch의 catch만 warn 출력)
- 화면에 에러 피드백 없음
- 사용자 관점에서 "데이터 없음"과 "인증 실패"를 구분 불가

---

## 9. 배포 상태 미확인

이 IR은 **코드 정적 분석만** 수행. 다음은 확인 불가:

- Cloud Run 배포 완료 여부
- 실제 API 응답 HTTP 상태 코드
- 운영 환경의 사용자 JWT 역할 목록

---

## 10. 결론

### Q: "이 화면을 실제로 만드는 파일이 무엇인가?"

**A: `RegistrationRequestsPage.tsx`가 맞다.** 라우트 매핑, barrel export, lazy import 모두 정확.

### Q: "수정한 코드가 전혀 반영되지 않았다?"

**A: 코드 수정은 올바르게 반영됨.** 그러나 3가지 시나리오 중 하나가 원인:

| # | 시나리오 | 확률 | 검증 방법 |
|---|---------|------|----------|
| S1 | 배포 미완료 — 구 코드 실행 중 | 중 | Cloud Run 배포 로그 확인 |
| S2 | **인증 스코프 불일치 — 403 silent fail** | **높음** | `curl -v /api/v1/neture/operator/registrations` |
| S3 | 데이터 실제 부재 — service_memberships 빈 테이블 | 낮 | DB 직접 조회 |

---

## 11. 수정 방향 (참조용 — 이 IR에서 수정하지 않음)

### F1: 인증 미들웨어 교체 (HIGH)
`requireNetureScope('neture:operator')` → `requireAdmin` 또는 동등한 레거시 역할 가드.
다른 Operator API(`/api/v1/operator/copilot/*`)와 동일한 인증 수준 적용.

### F2: Silent Error Swallowing 제거 (MEDIUM)
```typescript
// Before
if (!response.ok) return [];

// After
if (!response.ok) {
  console.error(`[Operator API] Registration fetch failed: HTTP ${response.status}`);
  throw new Error(`HTTP_${response.status}`);
}
```
RegistrationRequestsPage에서 에러 상태를 표시하도록 변경.

### F3: ProtectedRoute 역할 정합성 (LOW)
프론트엔드 `allowedRoles` 와 백엔드 scope guard가 같은 역할 체계를 사용하도록 정리.

---

## 12. 조사 코드 추적 체인

```
[Frontend Route]
App.tsx:308-309 (lazy import)
  → registrations/index.ts:5 (barrel)
  → RegistrationRequestsPage.tsx:70 (component)
App.tsx:658 (route definition)
App.tsx:650-654 (ProtectedRoute wrapper)

[Frontend API]
RegistrationRequestsPage.tsx:22 (import operatorRegistrationApi)
RegistrationRequestsPage.tsx:85 (getRegistrations call)
admin.ts:868-883 (API client)
admin.ts:873 (URL: /api/v1/neture/operator/registrations)

[Backend Route]
main.ts:1164-1165 (neture module → /api/v1/neture)
neture.routes.ts:72 (router.use('/operator', ...))
operator-registration.controller.ts:27-47 (GET /registrations)

[Auth Chain]
RoleGuard.tsx:34 (frontend: admin/operator)
membership-guard.middleware.ts:43-100 (backend: neture:operator scope)
service-scope-guard.ts:37-113 (scope role mapping)
service-configs.ts:38-55 (NETURE_SCOPE_CONFIG)

[Comparison]
operator-copilot.controller.ts:27-28 (authenticate + requireAdmin)
permission.middleware.ts:189 (requireAdmin = admin/super_admin/operator)
```

---

*IR-O4O-NETURE-OPERATOR-REGISTRATIONS-RUNTIME-MAPPING-AUDIT-V1*
*Date: 2026-03-15*
*Status: Complete*
