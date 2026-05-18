# IR-O4O-KPA-STORE-NAVIGATION-TRACE-AUDIT-V1

**상태**: trace 삽입 완료 — 브라우저 콘솔 확인 대기  
**작성일**: 2026-05-18  
**목적**: `/store` 진입 시 route 변경·remount·redirect 흐름을 runtime trace로 추적해 navigation 유발자 확정

---

## 1. 삽입된 Trace 위치

### 1-A. PharmacyGuard.tsx

| Trace | 위치 | 출력 내용 |
|-------|------|----------|
| `[TRACE][PharmacyGuard] MOUNT` | `useEffect([], [])` mount | pathname, roles, isStoreOwner, isAuthenticated |
| `[TRACE][PharmacyGuard] UNMOUNT` | 위 effect cleanup | pathname |
| `[TRACE][PharmacyGuard] state` | 매 render (no-deps effect) | hasStoreRole, apiCheck, needsApiCheck, roles, isStoreOwner, pathname |
| `[TRACE][PharmacyGuard] RECOVERY` | staleJwtRecovery effect 실행 직전 | apiCheck, hasStoreRole |
| `[TRACE][PharmacyGuard] NAVIGATE → /pharmacy` | `<Navigate to="/pharmacy">` 직전 | — |

### 1-B. AuthContext.tsx

| Trace | 위치 | 출력 내용 |
|-------|------|----------|
| `[TRACE][checkAuth] START` | `checkAuth()` 첫 줄 | 호출 스택 (caller 식별) |
| `[TRACE][checkAuth] Phase1: setUser` | `/auth/me` 응답 후 `setUser(userData)` 직전 | userId, roles, isStoreOwner |
| `[TRACE][checkAuth] setIsKpaContextLoaded(false) → fetchKpaContext()` | Phase1 완료 직후 | — |
| `[TRACE][checkAuth] END` | `finally` 블록 | — |
| `[TRACE][fetchKpaContext] START` | `fetchKpaContext()` 첫 줄 | — |
| `[TRACE][fetchKpaContext] Phase2: isStoreOwner=` | `/kpa/me-context` 응답 후 setUser 직전 | isStoreOwner 값 |
| `[TRACE][fetchKpaContext] END → setIsKpaContextLoaded(true)` | `finally` 블록 | — |

### 1-C. App.tsx — PostLoginRedirect

| Trace | 위치 | 출력 내용 |
|-------|------|----------|
| `[TRACE][PostLoginRedirect] effect` | effect 최상단 | isAuthenticated, isKpaContextLoaded, justLoggedIn, didRedirect, pathname |
| `[TRACE][PostLoginRedirect] NAVIGATE →` | `navigate(targetRoute)` 직전 | targetRoute, isStoreOwner, roles |

### 1-D. App.tsx — KpaStoreLayoutWrapper

| Trace | 위치 | 출력 내용 |
|-------|------|----------|
| `[TRACE][KpaStoreLayoutWrapper] MOUNT` | `useEffect([], [])` | userId |
| `[TRACE][KpaStoreLayoutWrapper] UNMOUNT` | 위 effect cleanup | — |
| `[TRACE][KpaStoreLayoutWrapper] getPharmacyInfo() fetch` | `getPharmacyInfo()` 호출 직전 | — |

### 1-E. KpaGlobalHeader.tsx

| Trace | 위치 | 출력 내용 |
|-------|------|----------|
| `[TRACE][KpaGlobalHeader] MOUNT` | `useEffect([], [])` | userId, pathname |
| `[TRACE][KpaGlobalHeader] UNMOUNT` | 위 effect cleanup | pathname |
| `[TRACE][KpaGlobalHeader] credits/me effect` | `useEffect([user?.id])` 최상단 | userId, hasUser |

---

## 2. 브라우저 콘솔 확인 방법

1. 개발자도구 → Console 탭 열기
2. Filter: `[TRACE]` 입력 (다른 로그 필터링)
3. 로그인 후 `/store` 진입
4. Console 출력 순서 확인

### 정상 케이스 (루프 없음) 예상 순서

```
[TRACE][checkAuth] START  ← AuthContext mount 1회
[TRACE][checkAuth] Phase1: setUser {roles:[...,'kpa:store_owner'], isStoreOwner:false}
[TRACE][checkAuth] setIsKpaContextLoaded(false) → fetchKpaContext()
[TRACE][fetchKpaContext] START
[TRACE][checkAuth] END
[TRACE][fetchKpaContext] Phase2: isStoreOwner= true
[TRACE][fetchKpaContext] END → setIsKpaContextLoaded(true)
// --- 로그인 후 /store 진입 ---
[TRACE][PharmacyGuard] MOUNT {roles:[...,'kpa:store_owner'], isStoreOwner:true}
[TRACE][PharmacyGuard] state {hasStoreRole:true, apiCheck:'idle', needsApiCheck:false}
[TRACE][KpaStoreLayoutWrapper] MOUNT
[TRACE][KpaStoreLayoutWrapper] getPharmacyInfo() fetch  ← 1회
[TRACE][KpaGlobalHeader] MOUNT  ← 1회 (KpaStoreLayoutWrapper 내부)
[TRACE][KpaGlobalHeader] credits/me effect {hasUser:true}
// 이후 추가 trace 없음 = 정상
```

### 루프 발생 케이스 예상 패턴

```
[TRACE][KpaGlobalHeader] MOUNT
[TRACE][KpaGlobalHeader] credits/me effect
[TRACE][KpaGlobalHeader] UNMOUNT  ← 여기서 navigate 발생
[TRACE][KpaGlobalHeader] MOUNT    ← 재-mount = 다른 route의 KpaGlobalHeader
[TRACE][KpaGlobalHeader] credits/me effect  ← 재호출
```

또는 stale JWT recovery 루프:
```
[TRACE][checkAuth] START  ← PharmacyGuard recovery에서 호출
[TRACE][PharmacyGuard] UNMOUNT  ← Phase1에서 children 숨김
[TRACE][KpaGlobalHeader] UNMOUNT
...
[TRACE][PharmacyGuard] MOUNT    ← 다시 mount? ref 초기화 위험
```

---

## 3. 확인해야 할 핵심 질문

콘솔 로그에서 다음을 확인한다:

### Q1. "me" 의 정체
- `[TRACE][checkAuth] START`가 반복되는가? → "me" = `/auth/me`
- `[TRACE][KpaGlobalHeader] credits/me effect`가 반복되는가? → "me" = `/credits/me`

### Q2. navigation 유발자
- `[TRACE][PharmacyGuard] NAVIGATE → /pharmacy`가 출력되는가?
  - 출력됨 → PharmacyGuard `apiCheck='denied'`가 navigate 발생
  - 미출력 → 다른 곳에서 navigate
- `[TRACE][PostLoginRedirect] NAVIGATE →`가 출력되는가?
  - 출력됨 → PostLoginRedirect가 navigate 실행

### Q3. KpaGlobalHeader 교대 mount 여부
- `[TRACE][KpaGlobalHeader] UNMOUNT` 후 즉시 `MOUNT`가 반복되는가?
- UNMOUNT 시 pathname과 MOUNT 시 pathname이 다른가?

### Q4. PharmacyGuard remount 여부
- `[TRACE][PharmacyGuard] UNMOUNT` → `MOUNT` 반복이 나타나는가?

### Q5. PharmacyGuard state 흔들림
- `[TRACE][PharmacyGuard] state {hasStoreRole:false, ...}` 가 반복 출력되는가?
  - `apiCheck='denied'`로 전환되는가?
  - `isStoreOwner=false` 상태가 장기 지속되는가?

### Q6. checkAuth 호출 스택
- `[TRACE][checkAuth] START {caller: '...'}` — caller 스택에서 호출자 확인
  - `PharmacyGuard`에서 호출? → recovery 경로
  - `AuthContext useEffect`에서 호출? → mount 경로
  - 다른 곳? → 새로운 caller 발견

---

## 4. Trace 제거 방법

조사 완료 후 다음 파일에서 `// IR-O4O-KPA-STORE-NAVIGATION-TRACE-AUDIT-V1` 주석과 해당 `console.log` 블록을 제거한다:

| 파일 | 제거 위치 |
|------|----------|
| `PharmacyGuard.tsx` | mount/unmount useEffect (lines ~31-38), state 추적 useEffect, RECOVERY log, NAVIGATE log |
| `AuthContext.tsx` | fetchKpaContext START/Phase2/END, checkAuth START/Phase1/setIsKpaContextLoaded/END |
| `App.tsx` | PostLoginRedirect effect 상단 log + NAVIGATE log, KpaStoreLayoutWrapper mount/unmount + fetch log |
| `KpaGlobalHeader.tsx` | mount/unmount useEffect, credits/me effect log |

---

## 5. 조사 후 예상 수정 방향

콘솔 결과에 따른 수정 후보:

| 확인 결과 | 수정 방향 |
|----------|----------|
| `PharmacyGuard NAVIGATE → /pharmacy` 반복 | apiCheck='denied' 조건 재검토. `getMyRequestsCached` 결과가 왜 'denied'인지 확인 |
| `KpaGlobalHeader UNMOUNT/MOUNT` 교대 반복 | KpaGlobalHeader를 route 외부 공통 layout으로 이동 (구조 수정) |
| `checkAuth START` 반복 (caller=PharmacyGuard) | Phase1 transient 상태에서 apiCheck='approved' && !hasStoreRole 조건 발생. isKpaContextLoaded 조건 추가 고려 |
| `PostLoginRedirect NAVIGATE →` 반복 | PostLoginRedirect 로직 재검토 및 didRedirectRef 설정 위치 수정 |
| `PharmacyGuard UNMOUNT → MOUNT` 반복 | 상위 route가 remount되는 원인 추적 (route key 변경, layout remount 등) |

---

*Trace 삽입 완료: 2026-05-18*  
*대상 파일: PharmacyGuard.tsx, AuthContext.tsx, App.tsx (PostLoginRedirect·KpaStoreLayoutWrapper), KpaGlobalHeader.tsx*  
*주의: 조사 완료 후 반드시 trace 제거 후 커밋*
