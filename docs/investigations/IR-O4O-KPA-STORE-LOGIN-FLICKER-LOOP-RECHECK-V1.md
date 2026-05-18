# IR-O4O-KPA-STORE-LOGIN-FLICKER-LOOP-RECHECK-V1

**상태**: 조사 완료 — 수정 후보 확정  
**조사일**: 2026-05-18  
**조사 대상**: KPA store_owner 로그인 및 `/store` 진입 시 API 무한 반복 호출 (깜빡임)  
**기존 fix 3개 적용 후에도 잔존하는 루프 원인 재조사**

---

## 0. 배경 — 기존 fix 요약

| fix | 위치 | 내용 | 효과 |
|-----|------|------|------|
| Fix-1 | `KpaGlobalHeader.tsx:72` | `creditApi.getMyBalance()` deps → `[user?.id]` | `/credits/me` 중복 횟수 감소 |
| Fix-2 | `notifications.ts:64` | 429 → 0 반환 (re-throw 금지) | 429 전파 차단 |
| Fix-3 | `PharmacyGuard.tsx:35,72` | `staleJwtRecoveryAttemptedRef` (1회 guard) | **동일 mount 내** 무한 checkAuth 차단 |

---

## 1. 관측된 네트워크 패턴

스크린샷 2종에서 확인된 반복 패턴:

```
[Cycle A]  me(304) → unread-count(429) → favicon(200)
[Cycle B]  me(304) → unread-count(429) → info(304) → info(304) → capabilities(304) → favicon(200)
```

Cycle A / Cycle B가 교번 반복. 135 requests → 1727 requests 수준.

- `me` = **URL 마지막 세그먼트만 표시** (Chrome DevTools "Name" 컬럼)
- `unread-count` = `/api/v1/notifications/unread-count?serviceKey=kpa-society`
- `info x2` = `/api/v1/kpa/pharmacy/info` (확인) + 두 번째 미확인 (§2-C)
- `capabilities` = `useStoreCapabilities()` → `/api/v1/kpa/store-hub/capabilities` 추정
- `favicon` = **브라우저 navigation 이벤트**. 매 cycle마다 등장 = route 변경 발생 중

---

## 2. 핵심 발견

### 2-A. "me" 의 정체 — 이중 해석 가능성 (Critical Ambiguity)

Chrome DevTools "Name" 컬럼은 URL 마지막 path segment만 표시한다.  
`me`로 표시될 수 있는 엔드포인트가 두 개 존재한다:

| 엔드포인트 | 호출자 | 트리거 |
|-----------|--------|--------|
| `/api/v1/auth/me` | `checkAuth()` in `AuthContext` | `useEffect([checkAuth])` — mount 1회. 또는 `PharmacyGuard` recovery |
| `/api/v1/kpa/credits/me` | `creditApi.getMyBalance()` in `KpaGlobalHeader` | `useEffect([user?.id])` — **KpaGlobalHeader 신규 mount 시마다** |

두 번째 경로가 핵심: **`KpaGlobalHeader`가 새 컴포넌트 인스턴스로 mount될 때마다** `credits/me` + `unread-count` 동시 발생. 이것이 Cycle A/B의 `me → unread-count` 쌍을 만든다.

### 2-B. KpaGlobalHeader가 두 곳에 독립 존재

```
/store/* 경로  → <PharmacyGuard><KpaStoreLayoutWrapper /></PharmacyGuard>
                                 └─ <KpaGlobalHeader />  ← KpaStoreLayoutWrapper 내부

기타 경로     → <Layout serviceName={...}>...</Layout>
               └─ <KpaGlobalHeader />  ← Layout 내부 (별도 인스턴스)
```

사용자가 `/store` ↔ 커뮤니티 경로 사이를 이동할 때마다 두 인스턴스가 교대로 mount된다.

- `/store` 진입 → `KpaStoreLayoutWrapper`의 `KpaGlobalHeader` 신규 mount
  → `credits/me` + `unread-count` 발생
  → `getPharmacyInfo()` + `useStoreCapabilities()` 발생 (Cycle B 패턴)

- `/store` 이탈 → `Layout`의 `KpaGlobalHeader` 신규 mount
  → `credits/me` + `unread-count` 발생 (Cycle A 패턴 — store 콘텐츠 없음)

**결론**: Cycle A = 커뮤니티 경로에 있을 때 / Cycle B = `/store` 경로에 있을 때.  
루프 = 두 경로 사이를 왔다갔다 하는 **navigation loop**이 존재한다.

### 2-C. info x2 의 정체

`/store` 진입 시 두 개의 `info` 호출이 발생하는 원인:

- **info-1**: `KpaStoreLayoutWrapper.useEffect([], [])` → `getPharmacyInfo()` → `/kpa/pharmacy/info`
- **info-2**: 미확인. 후보:
  - `StoreHomePage` (index route)가 독립적으로 `getPharmacyInfo()` 호출
  - `/kpa/me-context` (fetchKpaContext) — 단, 이것은 "me-context"로 표시됨
  - `PharmacyInfoPage`가 index route 아님에도 동시 mount되는 케이스

runtime 트레이싱 필요.

### 2-D. Fix-3 (staleJwtRecoveryAttemptedRef)의 한계

Fix-3는 **동일 mount 내 무한루프**만 방지한다.

```
PharmacyGuard Mount-1:
  staleJwtRecoveryAttemptedRef = false
  → checkAuth() 호출 (1회)  ← Fix-3로 1회 제한됨
  → Phase1: isStoreOwner=false → hasStoreRole=false → 로딩 화면 (KpaStoreLayoutWrapper 숨김)
  → Phase2: isStoreOwner=true → hasStoreRole=true → 정상 렌더

PharmacyGuard 재-Mount (이유 미확인):
  staleJwtRecoveryAttemptedRef = false  ← 컴포넌트 재생성으로 초기화!
  → checkAuth() 다시 호출
  → 동일 Phase1/Phase2 사이클 반복
```

PharmacyGuard가 unmount → remount 되면 ref가 초기화되어 루프가 재시작된다.

### 2-E. PostLoginRedirect — `didRedirectRef` 영구 false 상태

**위치**: `App.tsx:320-350`

```typescript
useEffect(() => {
  const justLoggedIn = !wasAuthenticatedRef.current && isAuthenticated;
  wasAuthenticatedRef.current = isAuthenticated;  // ← Phase1에서 즉시 업데이트됨

  if (!isAuthenticated) { didRedirectRef.current = false; return; }
  if (!justLoggedIn && !didRedirectRef.current) return;  // ← LINE 330: Phase2에서 항상 early return
  if (!isKpaContextLoaded || !userRef.current) return;   // ← Phase1에서 여기서 return
  if (didRedirectRef.current) return;
  ...
  navigate(targetRoute);
  didRedirectRef.current = true;
}, [isAuthenticated, isKpaContextLoaded, navigate, location.pathname, onLoginSuccess]);
```

**Phase1 → Phase2 실행 순서 분석**:

| 실행 시점 | justLoggedIn | didRedirectRef | 결과 |
|-----------|-------------|----------------|------|
| Phase1 (isKpaContextLoaded=false) | `true` (false→true 감지) | `false` | line 331에서 RETURN (context 미완료) |
| Phase2 (isKpaContextLoaded=true) | `false` (wasAuthRef이미 true로 갱신됨) | `false` | **line 330에서 EARLY RETURN** |

Phase2에서 `didRedirectRef`는 **영원히 false**로 남는다.

**결과**: 
- LoginModal이 `/store`로 navigate한 경우 — 이미 이동했으므로 문제없음
- 그러나 `isKpaContextLoaded`가 false→true로 재순환될 때마다 PostLoginRedirect effect가 re-run되어도, line 330 early return이 항상 막아준다

**직접적인 navigate 루프를 유발하지는 않는다.** 하지만 `didRedirectRef=false`로 남아 있어 잠재적 위험 상태다.

---

## 3. 루프 원인 트리

```
[루프 발생 조건]
  사용자가 /store ↔ 커뮤니티 경로 사이를 반복 이동
        ↓
  KpaGlobalHeader 신규 mount (인스턴스 교체)
        ↓
  creditApi.getMyBalance() → "me"
  useNotifications refetchCount → "unread-count"
  (Cycle B) getPharmacyInfo() → "info", useStoreCapabilities() → "capabilities"

[미확인: 무엇이 navigation을 유발하는가?]
  후보-A: PharmacyGuard.apiCheck='denied' → <Navigate to="/pharmacy" replace />
          └─ /pharmacy에서 무언가가 /store로 다시 navigate
  후보-B: PharmacyGuard Phase1 phase (hasStoreRole=false) 중에
          발생하는 다른 navigate 호출
  후보-C: PostLoginRedirect가 예상과 다른 경로로 navigate 실행
  후보-D: 브라우저 back/forward 버튼 (사용자 액션) — 자동 루프 아님
```

---

## 4. 각 엔드포인트별 정상 호출 횟수 vs 실제

| 엔드포인트 | 정상 횟수 (로그인 1회 후) | 루프 시 패턴 |
|-----------|------------------------|------------|
| `/auth/me` | 1회 (AuthContext mount) | 미확인 — "me"가 credits/me인지 auth/me인지 구분 불가 |
| `/kpa/credits/me` | 1회 (KpaGlobalHeader mount) | KpaGlobalHeader 재-mount 시마다 +1 |
| `/notifications/unread-count` | 1회 | KpaGlobalHeader 재-mount 시마다 +1 (429 발생) |
| `/kpa/pharmacy/info` | 1회 (KpaStoreLayoutWrapper mount) | `/store` 재진입 시마다 +1 |
| `/kpa/store-hub/capabilities` | 1회 | `/store` 재진입 시마다 +1 |
| `/kpa/pharmacy-requests/my` | 1회 (5분 캐시) | PharmacyGuard remount 시 캐시 히트 (API 비호출) |

---

## 5. 이전 fix가 충분하지 않은 이유

| fix | 방어 범위 | 남은 문제 |
|-----|----------|----------|
| Fix-1 `[user?.id]` | `KpaGlobalHeader` 동일 인스턴스 내 deps 안정화 | **컴포넌트 재-mount 시 동작 안 함** (새 인스턴스는 항상 effect 초기 실행) |
| Fix-2 429 guard | 429 에러 전파 차단 | 루프 속도 감소 없음 (호출 횟수 그대로) |
| Fix-3 staleJwtRef | 동일 mount 내 recovery loop 차단 | **PharmacyGuard 재-mount 시 ref 초기화** — 재발 |

---

## 6. 최소 수정 후보

### 수정 후보-1 (필수): navigation loop 원인 제거 ★★★

**runtime 트레이싱으로 먼저 확인 필요**. 특히:
- `PharmacyGuard`가 `<Navigate to="/pharmacy" replace />`를 실행하는지 확인
- 어떤 route가 `/store`로 다시 navigate하는지 확인

console.log 삽입 포인트:
```typescript
// PharmacyGuard.tsx
console.log('[PharmacyGuard] render', { hasStoreRole, apiCheck, needsApiCheck });
// PharmacyGuard.tsx:111
console.log('[PharmacyGuard] NAVIGATE to /pharmacy'); // <Navigate to="/pharmacy" replace /> 직전
// App.tsx PostLoginRedirect navigate 호출 직전
console.log('[PostLoginRedirect] NAVIGATE to', targetRoute);
```

### 수정 후보-2 (구조): KpaGlobalHeader를 route 외부로 이동 ★★

현재: `/store` 경로와 커뮤니티 경로에 각각 별도 `KpaGlobalHeader` 인스턴스  
→ route 이동마다 unmount/remount → `credits/me` + `unread-count` 재발

개선 방향: `KpaGlobalHeader`를 `<Routes>` 외부 (혹은 상위 공통 layout)에 단일 인스턴스로 배치  
→ route 이동해도 KpaGlobalHeader는 유지됨 → effects 재발 없음

**영향 범위**: Layout 구조 변경 — 저리스크 아님. 신중한 설계 필요.

### 수정 후보-3 (안전장치): creditBalance를 Context로 승격 ★

`creditBalance` 상태를 `AuthContext` 또는 별도 `CreditContext`로 이동.  
`KpaGlobalHeader`가 mount될 때 상태가 이미 존재하면 API 재호출 없음.

리스크: 낮음. 독립 Context로 추출 가능.

### 수정 후보-4 (즉시): PharmacyGuard apiCheck='denied' 네비게이션 방어 ★

`<Navigate to="/pharmacy" replace />` 전에 `console.warn` 추가하여 실제 발생 여부 확인.  
만약 stale JWT 사용자가 `apiCheck='denied'`로 navigate된다면:  
→ `/pharmacy` 경로가 `/store`로 자동 redirect하는 로직 존재 시 무한루프 확정  
→ 해당 로직 제거 또는 조건 강화

### 수정 후보-5 (PostLoginRedirect 버그): `didRedirectRef` 미설정 수정 ★

Phase2에서 `didRedirectRef=false`가 영구히 유지되는 것은 잠재적 위험.  
이미 `/store`에 있을 때도 `didRedirectRef=true` 로 명시적 설정하도록 수정:

```typescript
// PostLoginRedirect effect 내 early return 시 didRedirect 설정 추가
if (!justLoggedIn && !didRedirectRef.current) {
  // 이미 올바른 경로에 있다면 redirect 완료로 마킹
  if (isAuthenticated && isKpaContextLoaded && location.pathname.startsWith('/store')) {
    didRedirectRef.current = true;
  }
  return;
}
```

리스크: 낮음. 기존 guards 영향 없음.

---

## 7. 구조 수정 필요 여부

**필요하다.** 현재 구조는 근본적으로 취약하다:

1. **KpaGlobalHeader 이중 존재**: route 이동마다 side-effect 재실행이 설계에 내재됨
2. **PharmacyGuard phase1 렌더 gap**: stale JWT 사용자의 경우 매 checkAuth마다 store 콘텐츠가 순간 숨겨짐 (깜빡임)
3. **checkAuth Phase1이 isStoreOwner를 소거**: 모든 checkAuth 호출이 stale JWT 사용자에게 일시적 `hasStoreRole=false`를 유발

---

## 8. 저리스크 수정 가능 여부

| 후보 | 저리스크? | 이유 |
|------|----------|------|
| 후보-4 (console.warn) | ✅ 예 | 관찰만, 동작 변경 없음 |
| 후보-5 (didRedirectRef 설정) | ✅ 예 | 조건부 추가, 기존 flow 불변 |
| 후보-3 (creditContext) | ⚠️ 중간 | API 계약은 동일, context 추출 필요 |
| 후보-1 (navigation 제거) | ⚠️ 중간 | 원인 확인 후 가능 |
| 후보-2 (KpaGlobalHeader 이동) | ❌ 아님 | Layout 구조 변경, 넓은 영향 범위 |

---

## 9. 런타임 검증 필요 항목

다음은 **코드 정적 분석으로 확정 불가** — 반드시 브라우저에서 확인 필요:

1. **"me" 정체**: `/auth/me` vs `/kpa/credits/me` — 개발자도구 Full URL 확인 또는 console.log 삽입
2. **navigation 유발자**: `/store` 이탈 직전 호출 스택 확인 (`PharmacyGuard <Navigate>` 여부)
3. **두 번째 "info"**: `/store` index 진입 시 두 번째 `pharmacy/info`를 호출하는 컴포넌트 식별
4. **PharmacyGuard remount 빈도**: React DevTools Profiler로 mount/unmount 횟수 측정

---

## 10. 요약

| 항목 | 내용 |
|------|------|
| 루프 메커니즘 | `/store` ↔ 커뮤니티 경로 navigation loop → KpaGlobalHeader 교대 mount |
| 매 cycle 발생 API | `credits/me` + `unread-count` (항상) / `pharmacy/info` + `capabilities` (/store 진입 시) |
| navigation 원인 | **미확인** — PharmacyGuard `<Navigate to="/pharmacy">` 후 재redirect 가능성 높음 |
| Fix-3 한계 | 동일 mount 내 방어만. PharmacyGuard remount 시 재시작됨 |
| 즉시 적용 가능 fix | 후보-4 (관찰), 후보-5 (PostLoginRedirect 보강) |
| 구조 해결 필요 | KpaGlobalHeader 단일 인스턴스화 (후보-2) 또는 creditBalance Context 승격 (후보-3) |
| 다음 단계 | console.log 삽입 → 브라우저에서 navigation 유발자 확정 → 최소 수정 적용 |

---

*조사자: Claude Sonnet 4.6 + 코드 정적 분석*  
*조사 파일: PharmacyGuard.tsx, AuthContext.tsx, App.tsx (PostLoginRedirect·KpaStoreLayoutWrapper·route tree), KpaGlobalHeader.tsx, notifications.ts, useNotifications.ts, credit.ts, pharmacyInfo.ts, pharmacyRequestApi.ts*
