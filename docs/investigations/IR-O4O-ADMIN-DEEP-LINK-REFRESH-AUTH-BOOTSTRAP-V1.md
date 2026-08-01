# IR-O4O-ADMIN-DEEP-LINK-REFRESH-AUTH-BOOTSTRAP-V1

> **성격**: 조사 전용 — 인증 로직·route·메뉴·API·DB·배포 **변경 0건**
> **대상**: `apps/admin-dashboard` = `admin.neture.co.kr`
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `18dc0dab0`

---

## 1. 결론 요약

**판정: `B. SESSION_PERSISTENCE_FAILURE`**

원인은 타이밍 경합도, 401 도, hosting fallback 도 아니다.
**`GET /api/v1/auth/status` 가 200 으로 정상 응답하는데도, 프런트가 응답 봉투(envelope)를 잘못 읽어
"세션 만료" 로 오판하고 캐시된 사용자 정보를 스스로 삭제한 뒤 `/login` 으로 보낸다.**

```
백엔드 응답  : { success: true, data: { authenticated: true, user: {...} } }
프런트 읽기  : response.data.authenticated      ← undefined
                                                  ↓
                              else 분기 = "Session expired"
                              setUser(null) + localStorage.removeItem('admin-auth-storage')
                                                  ↓
                              AdminProtectedRoute → navigate('/login')
```

---

## 2. 증상 재현표 (프로덕션 read-only)

| route | 메뉴 클릭(SPA) | 새로고침 | 새 탭 딥링크 | 최종 URL | 판정 |
|---|:--:|:--:|:--:|---|---|
| `/home` | ✅ 정상 | ❌ | — | `/login` | 재현 |
| `/admin/ops/metrics` | ✅ 정상 | ❌ | — | `/login` | 재현 |
| `/admin/platform/hub` | ✅ 정상 | ❌ | — | `/login` | 재현 |
| `/admin/store-network` | ✅ 정상 | ❌ | ❌ | `/login` | 재현 |
| `/admin/physical-stores` | ✅ 정상 | ❌ | — | `/login` | 재현 |

**5/5 전 route 에서 100% 재현.** 특정 화면의 회귀가 아니라 **관리자 앱 전역 현상**이다.
오래 전부터 메뉴에 있던 `/admin/ops/metrics` 도 동일하므로, 최근 메뉴 연결 작업
(`WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1`, `5fa30352e`)과 **무관**함이 확인된다.

### 결정적 관측 — localStorage 가 새로고침 중에 사라진다

| 시점 | `admin-auth-storage` |
|---|:--:|
| 로그인 직후 | **있음** |
| 새로고침 직전 | **있음** |
| 새로고침 직후 | **없음** |

앱이 **스스로 지운다.** 브라우저가 잃어버리는 것이 아니다.

---

## 3. 인증 bootstrap 실행 순서 (실측)

```
1. 로그인  POST /api/v1/auth/login → 200
   ↳ 쿠키 발급: accessToken · refreshToken · sessionId
     (전부 httpOnly=true, secure=true, sameSite=None, domain=.neture.co.kr)
   ↳ localStorage: admin-auth-storage 에 사용자 캐시 기록
   ↳ localStorage 에 토큰은 저장되지 않음 (accessToken/token/authToken 전부 없음)

2. 하드 내비게이션(새로고침·직접입력·새 탭)
   ↳ App mount → AuthProvider 초기화
       user      = getInitialStateFromStorage()  → 캐시 있음
       isLoading = false                          (캐시 있으면 즉시 렌더)
   ↳ useEffect: strategy==='cookie' 분기
       GET /api/v1/auth/status → **200**
       statusData = response.data
       if (statusData.authenticated && statusData.user)   ← 모두 undefined
       else → setUser(null); localStorage.removeItem('admin-auth-storage')
   ↳ AdminProtectedRoute: !isLoading && !isAuthenticated
       hasStoredAuth() → localStorage 키 전부 없음 → false
       delay 100ms 후 navigate('/login', { state:{ from: pathname } })
```

**메뉴 클릭(SPA 이동)이 멀쩡한 이유**: 하드 내비게이션이 아니라 bootstrap 이 다시 돌지 않는다.

---

## 4. `/login` redirect 발생 지점 전수

| # | 발생 코드 | 조건 | 실행 시점 | 딥링크 | 새로고침 |
|---|---|---|---|:--:|:--:|
| 1 | `AdminProtectedRoute.tsx:64-70` `navigate('/login')` | `!isLoading && !isAuthenticated && !hasStoredAuth()` (100/500ms 지연 후 재확인) | guard 렌더 후 | ✅ | ✅ |
| 2 | `AuthProvider.tsx:113-115` `removeItem('admin-auth-storage')` | `/auth/status` 200 이지만 `statusData.authenticated` falsy | bootstrap | **원인** | **원인** |
| 3 | `AuthProvider.tsx:121-124` | `apiError.response.status === 401` | bootstrap | 해당 없음(200) | 해당 없음 |
| 4 | `unified-client.ts:200` `removeItem('admin-auth-storage')` | API 401 interceptor | 요청 시 | 미발생 | 미발생 |

> **#1 은 결과이고 #2 가 원인이다.** guard 자체는 `isLoading` 처리와 `hasStoredAuth()` 유예(100/500ms)를
> 갖춘 방어적 구현이며, 문제는 그 시점에 **이미 저장소가 비워져 있다**는 것이다.

---

## 5. 확정 원인 — 응답 봉투 불일치

### 백엔드

`modules/auth/controllers/auth-account.controller.ts:298`

```ts
return BaseController.ok(res, { authenticated, user: userData });
```

`common/base.controller.ts:50-55`

```ts
protected static ok<T>(res: Response, data: T): Response {
  return res.json({ success: true, data });   // ← 봉투로 한 겹 감싼다
}
```

→ 실제 body: `{ success: true, data: { authenticated: true, user: {...} } }`
(CLAUDE.md §8 표준 `{ success: true, data: T }` 를 정확히 따른다.)

### 프런트

`packages/auth-context/src/AuthProvider.tsx:101-116`

```ts
const response = await authClient.api.get('/auth/status');
const statusData = response.data as any;              // = { success, data:{...} }
if (statusData.authenticated && statusData.user) { ... }
else {
  setUser(null);
  localStorage.removeItem('admin-auth-storage');      // ← 유효한 세션을 파기
}
```

`response.data.authenticated` 는 항상 `undefined` → **항상 else**.
올바른 접근은 `response.data.data.authenticated` 다.

### 같은 파일 안의 모순 — login 은 봉투를 처리한다

`AuthProvider.tsx:170-173`

```ts
// API 응답 구조: { success, data: { user, accessToken, refreshToken } }
const loginData = (response as any).data || response;
```

**login 경로는 봉투를 알고 벗기는데, status 부트스트랩만 벗기지 않는다.**
그래서 로그인은 되고 새로고침만 깨지는, 관측된 그대로의 증상이 나온다.

---

## 6. 네트워크·콘솔 관측

- `GET /api/v1/auth/status` → **200** (401·403 없음)
- 인증 쿠키 3종이 요청 시점에 정상 존재 (httpOnly 이므로 값은 확인하지 않았고 필요도 없다)
- 콘솔 오류 0 — **조용히 로그아웃**되므로 운영자는 원인을 알 수 없다
- hosting fallback 정상: 딥링크에서 SPA 가 정상 로드된 뒤 앱 내부에서 `/login` 으로 이동한다

> 민감값 미기록 — 쿠키·토큰의 **이름·속성·존재 여부만** 확인했다.

---

## 7. 책임 구분

| 계층 | 판정 |
|---|---|
| **frontend** | **원인** — `packages/auth-context/src/AuthProvider.tsx` 의 cookie 분기 |
| backend | **정상** — 표준 봉투를 따르며 200·쿠키 발급 모두 정상. **변경 불필요** |
| hosting/router | **정상** — SPA fallback 동작 확인. **변경 불필요** |

---

## 8. 판정

### **B. `SESSION_PERSISTENCE_FAILURE`**

새로고침·새 탭·직접 입력 시 인증 상태가 복원되지 않는다.
단, 통상적인 "복원 실패" 가 아니라 **유효한 세션을 앱이 능동적으로 파기**하는 형태다.

기각한 후보:
- **A(로딩 경합)** — `/auth/status` 는 완료된다. 경합이 아니라 완료된 응답의 오독이다.
- **C(401 redirect)** — 200 이다.
- **D(router/hosting)** — SPA 가 정상 로드된 뒤 앱 내부에서 이동한다.
- **E(return path)** — `navigate('/login', { state:{ from } })` 로 목적지는 보존한다. 다만 재로그인 후
  복원 여부는 §11 미검증.
- **F(복수 원인)** — 단일 원인으로 전 증상이 설명된다.

---

## 9. 영향 범위

| 항목 | 범위 |
|---|---|
| 영향 route | **관리자 route 전체** (표본 5/5, `/home` 포함) |
| 진입 방식 | 새로고침 · 새 탭 · 주소 직접 입력 — **모든 하드 내비게이션** |
| 정상 동작 | 로그인 직후 · 메뉴 클릭(SPA 이동) |
| 영향 앱 | **`apps/admin-dashboard` 단독** — `strategy: 'cookie'` 를 쓰는 유일한 앱 |
| 공용 패키지 | `packages/auth-context` 는 `forum-web`·`main-site` 도 사용하나 **cookie 분기를 타지 않는다**(localStorage 분기) |

> ⚠️ **중지 조건 §3 해당** — 수정 대상이 공용 패키지다.
> 다만 변경 지점이 `strategy === 'cookie'` 분기 내부라 다른 앱은 코드 경로가 갈린다.
> 그럼에도 **공용 패키지 변경이므로 수정 WO 에서 소비처 3개 앱 회귀 검증이 필요**하다.

---

## 10. 최소 수정 권고안 (이번 IR 에서 구현하지 않음)

| 항목 | 내용 |
|---|---|
| 대상 파일 | `packages/auth-context/src/AuthProvider.tsx` (cookie 분기, L101-116) |
| 변경 | `/auth/status` 응답에서 봉투를 벗겨 읽는다. login 경로와 동일하게 `response.data.data ?? response.data` 형태로 **양쪽 shape 을 모두 허용**하면 계약 변경 없이 안전하다 |
| 함께 볼 것 | 봉투를 벗긴 뒤에도 `authenticated`/`user` 가 없을 때만 세션 파기. **"판정 불가"와 "만료"를 분리** |
| 백엔드 변경 | **불필요** |
| hosting 변경 | **불필요** |
| 회귀 위험 | 공용 패키지 — `forum-web`·`main-site` 는 localStorage 분기라 영향 낮으나 **회귀 검증 필수** |
| 필요한 검증 | 로그인 → 새로고침 → 새 탭 → 세션 만료 시 정상 로그아웃 → 재로그인 후 원 route 복귀 |

부수 개선 후보(별도): guard 의 100/500ms 타이머 기반 판정은 봉투 문제 해결 후 재평가.

---

## 11. 미검증

- 재로그인 후 `state.from` 으로 **원래 route 복귀가 실제로 되는지** 미확인 (E 축)
- **실제 세션 만료** 시 정상 로그아웃되는지 미확인 (만료 세션을 만들려면 쓰기·대기 필요)
- 비관리자 계정에서의 동작 미확인 (super_admin 1계정)
- `unified-client.ts:200` 의 401 interceptor 경로는 이번 재현에서 발동하지 않아 미검증

---

## 12. 후속 WO 제안

```text
WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1
목표: /auth/status 응답 봉투 파싱 교정으로 딥링크·새로고침 세션 유지 복구
대상: packages/auth-context/src/AuthProvider.tsx (cookie 분기)
제외: 백엔드·hosting·guard 타이머 구조·다른 strategy 분기
검증: admin 로그인→새로고침→새 탭→재로그인 복귀 +
      forum-web·main-site 회귀(localStorage 분기 무영향 확인)
위험: 공용 패키지 변경 — 소비처 3앱 회귀 필요
독립 실행: 예 (단일 원인·단일 파일)
```

---

## 13. 변경 0 확인

코드 **0** · DB **0** · 운영 데이터 **0** · 배포 **0** · 쓰기 endpoint 실행 **0** ·
민감값(토큰·쿠키 값) 기록 **0**

*조사 전용 IR*
