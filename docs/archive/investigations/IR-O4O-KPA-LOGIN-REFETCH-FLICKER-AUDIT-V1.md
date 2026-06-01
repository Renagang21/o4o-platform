# IR-O4O-KPA-LOGIN-REFETCH-FLICKER-AUDIT-V1

**목적**: KPA 로그인 직후 `/me`, `/info`, `/capabilities`, `/unread-count` 반복 호출 및 화면 깜빡임 원인 조사  
**날짜**: 2026-05-18  
**상태**: 조사 완료 — 코드 수정 없음  
**범위**: `services/web-kpa-society/src/` + `packages/account-ui/src/notifications/`

---

## 1. 각 API 호출 위치

### 1-1. `/auth/me`

| 항목 | 내용 |
|------|------|
| 파일 | `contexts/AuthContext.tsx:301` |
| 함수 | `checkAuth()` |
| 트리거 | `useEffect([checkAuth])` — AuthProvider 마운트 시 1회 |
| 추가 호출 | 없음. login() 성공 후에는 호출 안 함 |

**흐름**:
```
AuthProvider mount → useEffect([checkAuth]) → checkAuth()
  → token 없으면 즉시 return (401 방지 guard 존재)
  → token 있으면 /auth/me → setUser + fetchKpaContext()
```

`checkAuth`는 `useCallback([fetchKpaContext])`로 memoize. `fetchKpaContext`는 `useCallback([])`로 안정적이므로 `checkAuth`도 재생성 없음. **초기 마운트 1회 호출이 정상**.

---

### 1-2. `/kpa/me-context`

| 항목 | 내용 |
|------|------|
| 파일 | `contexts/AuthContext.tsx:256-287` |
| 함수 | `fetchKpaContext()` |
| 트리거 1 | `checkAuth()` 완료 후 (페이지 초기 로드) |
| 트리거 2 | `login()` 완료 후 (라인 348) |
| 트리거 3 | `setActivityType()` 호출 후 (라인 400-401) |

**핵심**: 로그인 시 `/auth/me`는 호출하지 않고 **login API 응답에서 직접 user를 구성**하지만, `fetchKpaContext()`는 별도로 한 번 더 호출됨. 즉 로그인 직후 API 호출 순서:

```
login() 호출
  └─ POST /auth/login                         ← 1회
     └─ setUser(userData) + setIsKpaContextLoaded(false)
        └─ void fetchKpaContext()
           └─ GET /kpa/me-context             ← 1회 (isStoreOwner, activityType 보강)
              └─ setUser(prev => {...}) + setIsKpaContextLoaded(true)
```

`/kpa/me-context`는 **로그인 1회당 1번** 호출. 중복 아님.

---

### 1-3. `/store-hub/capabilities`

| 항목 | 내용 |
|------|------|
| 파일 | `hooks/useStoreCapabilities.ts` → `App.tsx:KpaStoreLayoutWrapper` |
| 트리거 | `/store/*` 경로 진입 시 컴포넌트 마운트 → `useEffect([])` 1회 |

로그인 후 `/store`로 redirect되는 계정(store_owner)에서만 발생. route 변경 → 컴포넌트 마운트 → 1회 호출. **반복 아님**.

---

### 1-4. `/notifications/unread-count?serviceKey=kpa-society`

| 항목 | 내용 |
|------|------|
| 파일 | `packages/account-ui/src/notifications/useNotifications.ts:137` |
| 호출 위치 | `KpaGlobalHeader.tsx:74` — `useNotifications(notificationsApi, { enabled: !!user, ... })` |
| 폴링 | `pollIntervalMs = 0` (기본값) → **폴링 없음** |
| 트리거 | `useEffect([enabled, api, pollIntervalMs, refetchCount])` |

**중복 호출 원인**:

`refetchCount`는 `useCallback([api, enabled])`로 정의됨 (라인 69-80). `enabled`가 변화하면 `refetchCount`가 재생성되고, 이 `useEffect`가 재실행된다.

로그인 흐름에서 `enabled = !!user`가 변화하는 시점:

```
T0: user = null → enabled = false
T1: login() → setUser(userData) → enabled = true → refetchCount 재생성 → unread-count 호출 [1회]
T2: fetchKpaContext() → setUser(prev→{...}) → user 객체 참조 변경
    → enabled = !!user 값은 그대로 true이지만
    → KpaGlobalHeader 리렌더 → useNotifications 재실행?
```

`useNotifications`는 `enabled` 값(boolean)으로 guard. `user` 객체 참조 변경이 `enabled` 값을 바꾸지 않으므로 T2에서는 `useEffect` 재실행 없음.

**결론**: `/unread-count`는 로그인 이벤트당 **1회** 호출. 반복 아님.

단, route 변경으로 `KpaGlobalHeader`가 unmount/remount되면 다시 1회 호출됨. PostLoginRedirect가 navigate()를 실행하는 경우가 해당.

---

### 1-5. `/credits/me`

| 항목 | 내용 |
|------|------|
| 파일 | `KpaGlobalHeader.tsx:61-66` |
| 트리거 | `useEffect([user])` — user 참조 변경 시마다 |

`fetchKpaContext()` 완료 후 `setUser(prev => {...})` → **user 객체 참조 변경** → `useEffect([user])` 재실행 → `/credits/me` 추가 호출.

```
T1: login() → setUser(userData)         → /credits/me 호출 [1회]
T2: fetchKpaContext() → setUser(prev→)  → user 참조 변경 → /credits/me 호출 [2회]
```

**`/credits/me`는 로그인 1회당 2번 호출됨 — 실질적 중복**.

---

## 2. 반복 호출을 만드는 직접 원인

### 원인 A: `user` 객체 참조 2단계 변경

`login()` 흐름에서 user 객체가 두 번 변경됨:

```
Phase 1: login() → setUser(createUserFromApiResponse(apiUser))
          → KPA context 없는 user 객체 (isStoreOwner 미확정)

Phase 2: fetchKpaContext() → setUser(prev => ({
            ...prev,
            isStoreOwner: ...,
            activityType: ...,
          }))
          → 새 객체 참조 → user 의존 모든 useEffect 재실행
```

이 2단계 설계는 `WO-KPA-LOGIN-LATENCY-CLEANUP-V1`의 의도적 구조 ("즉시 user 설정 → 화면 표시 차단 해제 → KPA context 비동기 후속 로딩"). 그러나 `useEffect([user])` 패턴을 사용하는 모든 컴포넌트가 Phase 2에서 재실행됨.

현재 `user` 참조 변경에 반응하는 useEffect:
- `KpaGlobalHeader.tsx:61` — creditApi.getMyBalance() **2회 호출**
- `App.tsx:315` — PostLoginRedirect **2회 실행** (Phase 1 bail → Phase 2 처리 또는 재bail)

### 원인 B: PostLoginRedirect navigate → KpaGlobalHeader remount

`PostLoginRedirect`가 navigate()를 실행하면 라우트가 변경되고, Layout 및 KpaGlobalHeader가 remount됨:

```
navigate('/store') 실행
  → CommunityHomePage + Layout unmount
  → StoreDashboardLayout + KpaGlobalHeader mount (새 인스턴스)
     → useNotifications 재초기화 → /unread-count [추가 1회]
     → creditApi.getMyBalance() → /credits/me [추가 1회]
     → useStoreCapabilities() → /store-hub/capabilities [추가 1회]
```

이 호출들은 route 변경에 의한 **정상적 mount 시 초기화**이나, 로그인 직후 연속으로 발생해 "과도한 요청"처럼 보임.

### 원인 C: `setIsKpaContextLoaded(false)` 중간 상태

`login()` 또는 `checkAuth()` 실행 중:

```
setUser(userData)            → isAuthenticated: true
setIsKpaContextLoaded(false) → KPA context: 미확정
void fetchKpaContext()       → 비동기 시작
```

`isKpaContextLoaded=false` 동안 `AuthGate`, `PharmacyGuard`, `HubGuard` 등 context 의존 컴포넌트가 조건부 렌더링 변화를 일으킬 수 있음. 이후 `setIsKpaContextLoaded(true)`로 복구 → 추가 리렌더.

---

## 3. 화면 깜빡임과의 연관성

### 깜빡임 발생 타임라인

```
T0  로그인 버튼 클릭
     └─ LoginModal: POST /auth/login (약 200-500ms)

T1  login() 완료
     └─ setUser(Phase1 user) + setIsKpaContextLoaded(false)
     └─ 모달 닫힘 (onClose)
     └─ [화면: 모달 사라짐, 커뮤니티 홈 표시]
     └─ KpaGlobalHeader: /credits/me [1회] — 배지 표시

T2  fetchKpaContext() 완료 (약 100-300ms 후)
     └─ setUser(Phase2 user + isStoreOwner) + setIsKpaContextLoaded(true)
     └─ KpaGlobalHeader: /credits/me [2회] — 배지 재렌더 (깜빡임 원인 중 하나)

T3  PostLoginRedirect: navigate('/store') 실행 (isKpaContextLoaded=true + store_owner 확정)
     └─ [화면 전환: 커뮤니티홈 → 스토어 대시보드]
     └─ 새 Layout/KpaGlobalHeader mount
        └─ /unread-count [추가 1회]
        └─ /credits/me [추가 1회]
        └─ /store-hub/capabilities [1회]

T4  최종 화면 안정
```

**깜빡임 원인 정리**:
1. `T1→T2`: `setIsKpaContextLoaded(false→true)` 사이 조건부 컴포넌트 렌더링 변화
2. `T2`: user 객체 참조 변경 → creditBalance 재fetch → 배지 일시 초기화
3. `T3`: navigate로 인한 레이아웃 전체 전환 (의도된 동작이지만 시각적으로 깜빡임)
4. 304 응답이더라도 네트워크 왕복은 발생 → 상태 재업데이트 → 미세 리렌더

---

## 4. 최소 수정 후보

### [P1] KpaGlobalHeader: creditApi 의존성 정밀화

**파일**: `services/web-kpa-society/src/components/KpaGlobalHeader.tsx:61`

```typescript
// 현재
useEffect(() => {
  if (!user) { setCreditBalance(null); return; }
  creditApi.getMyBalance()...
}, [user]);  // ← user 객체 전체 참조 비교

// 개선
}, [user?.id]);  // user.id는 변경 없음 → Phase 2에서 재실행 방지
```

**효과**: `/credits/me` 2회 → 1회. 배지 깜빡임 제거.  
**리스크**: 낮음. `user.id`는 로그인 세션 중 불변.

---

### [P2] PostLoginRedirect: `user` 의존성 제거

**파일**: `services/web-kpa-society/src/App.tsx:345`

```typescript
// 현재
}, [isAuthenticated, isKpaContextLoaded, user, navigate, location.pathname, onLoginSuccess]);

// 개선
}, [isAuthenticated, isKpaContextLoaded, navigate, location.pathname, onLoginSuccess]);
// user 제거: isKpaContextLoaded=true일 때 user 존재 보장됨
// user 내부 내용이 바뀌어도 redirect 재실행 불필요
```

**효과**: Phase 2 user 참조 변경으로 인한 불필요한 useEffect 재실행 방지.  
**리스크**: 낮음. 실제 redirect 조건은 `isKpaContextLoaded` 변화로 충분.  
**주의**: `user` 내용을 직접 읽는 코드(getKpaPostLoginRoute)가 있으므로 useRef로 최신값 접근 패턴 검토 필요.

---

### [P3] fetchKpaContext 후 user 업데이트 방식 변경 (구조적 개선)

**파일**: `contexts/AuthContext.tsx`

현재 `fetchKpaContext()`가 `setUser(prev => {...})` (functional update) 를 호출하여 Phase 2 user 참조를 변경함. 이 대신:
- isStoreOwner, activityType을 별도 상태로 분리
- user 객체를 변경하지 않고 KPA context만 업데이트

**효과**: `useEffect([user])` 패턴의 모든 불필요한 재실행 근절.  
**리스크**: 높음. AuthContext 구조 변경 → 영향 범위 넓음 (WO 별도 필요).

---

## 5. 수정 시 영향 범위

| 수정 항목 | 파일 수 | 다른 서비스 영향 | 리스크 |
|----------|---------|-----------------|--------|
| P1 creditApi 의존성 | 1 (KpaGlobalHeader) | 없음 | 낮음 |
| P2 PostLoginRedirect 의존성 | 1 (App.tsx) | 없음 | 낮음 |
| P3 user 상태 분리 | 5+ (AuthContext, App, Guard 다수) | 없음 | 높음 |
| useNotifications 의존성 | 1 (packages/account-ui) | 전 서비스 | 중간 |

---

## 6. 후속 WO 필요 여부

### 즉시 수정 가능 (단일 파일, 저리스크)

**WO-KPA-A-LOGIN-REFETCH-MINIMIZE-V1**
- P1 + P2 동시 처리
- `KpaGlobalHeader.tsx`: `useEffect([user?.id])`
- `App.tsx`: PostLoginRedirect deps에서 `user` 제거
- TypeScript clean 확인, 로그인 시나리오 smoke test
- 예상 효과: `/credits/me` 호출 2→1, PostLoginRedirect 불필요 실행 감소

### 중기 검토 (구조 변경)

**WO-KPA-A-AUTH-CONTEXT-KPA-STATE-SPLIT-V1** (선택)
- `isStoreOwner`, `activityType`을 user 객체에서 분리 → 별도 kpaState 컨텍스트
- Phase 2 user 참조 변경 자체를 없앰
- AuthContext 구조 변경 → 영향 범위 크므로 별도 IR 선행 권장

---

## 결론

| API | 실제 호출 횟수 (로그인 1회) | 정상 여부 |
|-----|--------------------------|----------|
| POST /auth/login | 1 | ✅ |
| GET /kpa/me-context | 1 | ✅ |
| GET /credits/me | **2** | ❌ Phase 2 user 참조 변경 때문 |
| GET /unread-count | 1 (route 변경 시 +1) | ⚠️ route 변경 후 remount |
| GET /store-hub/capabilities | 1 (store_owner에 한함) | ✅ |

**화면 깜빡임 주 원인**: `fetchKpaContext()` 완료 후 user 객체 참조 변경 → creditBalance 재fetch (T1→T2), 이후 PostLoginRedirect navigate로 인한 레이아웃 전환 (T3).

**즉시 조치**: WO-KPA-A-LOGIN-REFETCH-MINIMIZE-V1 (2개 파일, 저리스크).  
**근본 해결**: user 상태와 KPA context 상태 분리 (별도 WO, 중기).
