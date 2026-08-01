# WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1 — CHECK

> **선행**: `docs/investigations/IR-O4O-ADMIN-DEEP-LINK-REFRESH-AUTH-BOOTSTRAP-V1.md` (commit `5dc8a8a34`)
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `b8ddda3b7`

---

## 1. 작업 기준

| 항목 | 값 |
|---|---|
| 대상 패키지 | **`packages/auth-context`** (공용) |
| 소비 앱 | `admin-dashboard`(cookie) · `forum-web`(localStorage) · `main-site`(localStorage) |
| 변경 파일 | **1** (`src/AuthProvider.tsx`) |
| 백엔드·hosting·route·권한·DB 변경 | **0** |

시작 시 작업 트리 clean. 조사 문서에서 확정한 코드 구조가 현재 main 과 **일치**함을 확인(중지 조건 #1 미해당).

---

## 2. 확정 원인

```
백엔드  auth-account.controller.ts:298  BaseController.ok(res, { authenticated, user })
        base.controller.ts:50-55        → { success: true, data: { authenticated, user } }
                                          (CLAUDE.md §8 표준 봉투)

프런트  AuthProvider.tsx (cookie 분기, 수정 전)
        const statusData = response.data;              // = { success, data:{...} }
        if (statusData.authenticated && statusData.user)   ← 항상 undefined
        else { setUser(null); localStorage.removeItem('admin-auth-storage'); }
                                                            ↓
        AdminProtectedRoute → navigate('/login')
```

`/auth/status` 가 **200** 으로 정상 응답하는데도 봉투를 벗기지 않아 항상 else 로 빠져
**유효한 세션 캐시를 스스로 파기**했다. 새로고침·직접 입력·새 탭 등 **모든 하드 내비게이션**에서 발생.

---

## 3. 변경 내용

`packages/auth-context/src/AuthProvider.tsx` cookie 분기만 수정.

### 3-1. 봉투/비봉투 양립

```ts
const responseBody = response.data as any;
const statusData = (responseBody?.data ?? responseBody) as any;
```

### 3-2. 세 상태 분리

```ts
const isAuthenticatedFlag =
  typeof statusData?.authenticated === 'boolean' ? statusData.authenticated : null;
```

| 상태 | 조건 | 사용자 | **캐시 삭제** |
|---|---|---|:--:|
| **A. 인증 복원 성공** | `authenticated === true` **및** `user` 존재 | 복원 | **아니오** |
| **B. 서버가 미인증 확인** | `authenticated === false` (명시적 boolean) | `null` | **예** (기존 정상 로그아웃 유지) |
| **C. 판정 불가** | 그 외 — 구조 이상 / `authenticated` 가 boolean 아님 / `true` 인데 `user` 없음 | 캐시 있으면 유지, 없으면 `null` | **아니오** |

**핵심**: `authenticated` 가 **명시적 `false`** 일 때만 캐시를 지운다.
판정 불가(C)에서는 지우지 않아, 일시적 응답 이상으로 정상 세션이 파기되지 않는다.

무한 loading·무한 redirect 방지: C 에서 캐시가 없으면 `setUser(null)` 로 확정하고,
`setIsLoading(false)` 는 분기와 무관하게 기존대로 실행된다. guard 는 자체 유예(100/500ms) 후 판단한다.

### 3-3. 무변경 확인 (diff 검증)

- `localStorage` 전략 분기 — **무변경**
- `login` 경로(봉투 처리 이미 존재) — **무변경**
- `401 interceptor` · `AdminProtectedRoute` 유예시간 · 쿠키 설정 — **무변경**

---

## 4. 범위 확인

| 항목 | 변경 수 |
|---|---:|
| 백엔드 | **0** |
| route | **0** |
| 권한·역할 | **0** |
| DB | **0** |
| 쿠키 설정 | **0** |
| hosting | **0** |
| `pnpm-lock.yaml` | **0** |

---

## 5. 응답 형태별 검증

`packages/auth-context` 에 테스트 인프라가 **없어**(test script·테스트 파일 0),
WO 지침대로 새 인프라를 만들지 않고 **판정식을 그대로 옮긴 최소 재현 검증**을 수행했다.

| # | 응답 형태 | 기대 상태 | 실제 | 캐시 삭제 | 결과 | (수정 전) |
|---|---|---|---|:--:|:--:|---|
| 1 | `{success,data:{authenticated:true,user}}` | A | A_RESTORED | false | **PASS** | ❌ SESSION_EXPIRED(캐시삭제) |
| 2 | `{authenticated:true,user}` (비봉투) | A | A_RESTORED | false | **PASS** | RESTORED |
| 3 | `{success,data:{authenticated:false,user:null}}` | B | B_UNAUTHENTICATED | **true** | **PASS** | ❌ (캐시삭제) |
| 4 | `{authenticated:false}` (비봉투) | B | B_UNAUTHENTICATED | **true** | **PASS** | (캐시삭제) |
| 5 | `{success,data:{}}` | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 6 | `{success:true}` | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 7 | `authenticated:true` 인데 `user` 없음 | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 8 | `authenticated` 가 boolean 아님 | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |

**8 pass / 0 fail.** 수정 전 로직은 8건 중 6건에서 캐시를 잘못 삭제했다(2·4 제외).

---

## 6. 앱별 회귀 검증

| 앱 | 인증 전략 | typecheck | 코드 경로 영향 | 판정 |
|---|---|:--:|---|:--:|
| `packages/auth-context` | — | **0 error** | 변경 지점 | ✅ |
| `admin-dashboard` | **cookie** | **0 error** | 수정 대상 분기 | ✅ |
| `forum-web` | localStorage | **0 error** | cookie 분기 미진입 — 무영향 | ✅ |
| `main-site` | localStorage | **0 error** | 동일 | ✅ |

`strategy: 'cookie'` 를 쓰는 앱은 `admin-dashboard` 단독임을 재확인했다.
전체 monorepo build 는 실행하지 않았다(좁은 검증으로 충분).

---

## 7~12.

*(배포 후 기록)*
