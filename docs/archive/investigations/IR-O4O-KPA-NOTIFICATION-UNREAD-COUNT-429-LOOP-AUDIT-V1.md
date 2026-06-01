# IR-O4O-KPA-NOTIFICATION-UNREAD-COUNT-429-LOOP-AUDIT-V1

**목적**: KPA 로그인 이후 `/unread-count?serviceKey=kpa-society` 반복 호출 및 429 Too Many Requests 발생 원인 조사  
**날짜**: 2026-05-18  
**상태**: 조사 완료 — 코드 수정 없음  
**범위**: `packages/account-ui/src/notifications/` + `services/web-kpa-society/src/`

---

## 1. 관련 파일 및 역할

| 파일 | 역할 |
|------|------|
| `packages/account-ui/src/notifications/useNotifications.ts` | 알림 fetch 훅 (공용) |
| `packages/account-ui/src/components/NotificationBell.tsx` | 알림 벨 UI 컴포넌트 (props-only, 자체 fetch 없음) |
| `services/web-kpa-society/src/api/notifications.ts` | KPA 전용 NotificationApiClient 구현 |
| `services/web-kpa-society/src/api/client.ts` | ApiClient — fetch 실행 + 에러 처리 |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | useNotifications 사용 위치 |
| `services/web-kpa-society/src/App.tsx` | 라우트 구조 — Layout vs KpaStoreLayoutWrapper |

---

## 2. 각 레이어별 호출 흐름

### 2-1. useNotifications 훅

**파일**: `packages/account-ui/src/notifications/useNotifications.ts`

```typescript
// 라인 69-80
const refetchCount = useCallback(async () => {
  if (!enabled || !api) return;
  try {
    const count = await api.getUnreadCount({...});
    setUnreadCount(...);
  } catch {
    // silent — bell never blocks
  }
}, [api, enabled]);                           // ← deps

// 라인 135-145
useEffect(() => {
  if (!enabled || !api) return;
  void refetchCount();
  if (pollIntervalMs > 0) {
    const id = setInterval(() => void refetchCount(), pollIntervalMs);
    return () => clearInterval(id);
  }
}, [enabled, api, pollIntervalMs, refetchCount]);  // ← refetchCount도 포함
```

**핵심 구조**:
- `refetchCount`는 `useCallback([api, enabled])`로 정의됨
- 이 `refetchCount`가 effect deps에 포함됨 (라인 145)
- `api` 또는 `enabled`가 변경되면 → `refetchCount` 재생성 → effect 재실행 → API 호출

**폴링**: `pollIntervalMs` 기본값 0 → KpaGlobalHeader에서 `pollIntervalMs` 미전달 → **폴링 없음**

**에러 처리**: `catch { // silent }` — 429 포함 모든 에러를 무음 처리. 상태 변화 없음.

---

### 2-2. KPA notifications API 어댑터

**파일**: `services/web-kpa-society/src/api/notifications.ts:45-57`

```typescript
export const notificationsApi: NotificationApiClient = {
  async getUnreadCount(params) {
    try {
      const res = await coreApiClient.get<UnreadCountResponse>(
        '/notifications/unread-count',
        { serviceKey: params?.serviceKey, ... }
      );
      return res?.data?.count ?? 0;
    } catch (err) {
      if (isUnauthorized(err)) return 0;   // 401 → 0 반환
      throw err;                           // 429 포함 그 외 → 재던짐
    }
  },
```

- `notificationsApi`는 **모듈 레벨 상수** — 참조 안정. 재렌더로 재생성되지 않음.
- 401은 삼켜 0 반환. **429는 re-throw** → useNotifications까지 전파.

---

### 2-3. ApiClient — 429 처리 여부

**파일**: `services/web-kpa-society/src/api/client.ts:64-107`

```typescript
const maxRetries = fetchOptions.method === 'GET' ? 2 : 0;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  const response = await fetch(url, ...);

  if (response.status === 404 && attempt < maxRetries) {
    await new Promise(r => setTimeout(r, 500));
    continue;                  // 404만 재시도
  }

  if (!response.ok) {
    if (response.status === 401) { /* token refresh + retry */ }
    // ... 나머지 에러:
    throw error;               // 429 → 즉시 throw (retry/backoff 없음)
  }

  return response.json();
}
```

**확인 사항**:
- GET 요청에 `maxRetries=2` 존재하나, **재시도 조건은 `status === 404`만**
- 429 수신 시: 즉시 에러 객체 생성 → throw (Retry-After 헤더 무시, backoff 없음)
- throw된 에러가 `notificationsApi.getUnreadCount()`를 통과해 `useNotifications.refetchCount()` catch 블록에서 소멸

---

### 2-4. NotificationBell — 자체 fetch 여부

**파일**: `packages/account-ui/src/components/NotificationBell.tsx`

- 순수 UI 컴포넌트. props로 데이터를 받음.
- `handleToggle()`: dropdown 열 때 `onOpen()` 콜백 호출 → KpaGlobalHeader에서 `notif.refetchList` 연결
- `refetchList`는 `/notifications` (목록) 조회 — `/unread-count`와 별개
- **자체 fetch 없음. 폴링 없음. retry 없음.**

---

## 3. 실제 호출 횟수 분석

### 3-1. store_owner 로그인 시나리오

```
T0: 로그인 전 커뮤니티 홈
  AuthGate → isLoading=false, user=null → Layout+KpaGlobalHeader 마운트
  useNotifications: enabled=false → 호출 없음

T1: login() 완료
  setUser(Phase1) → KpaGlobalHeader 재렌더 → enabled: false→true
  refetchCount 재생성(enabled 변경) → effect 재실행
  GET /unread-count?serviceKey=kpa-society [1회]

T2: fetchKpaContext() 완료 (WO-O4O-KPA-LOGIN-REFETCH-MINIMIZE-V1 완료 후)
  setUser(Phase2) → !!user 여전히 true → enabled 값 불변
  refetchCount 재생성 없음 → effect 재실행 없음 → 추가 호출 없음

T3: PostLoginRedirect → navigate('/store')
  Layout+KpaGlobalHeader 언마운트
  KpaStoreLayoutWrapper+KpaGlobalHeader 마운트 (새 인스턴스)
  새 useNotifications: enabled=true (초기값부터), api=notificationsApi
  effect 마운트 실행 → GET /unread-count?serviceKey=kpa-society [2회]

총계: store_owner 로그인 1회당 2회 호출
```

### 3-2. 비 store_owner 로그인 시나리오

```
T1: login() → enabled: false→true → /unread-count [1회]
T2: fetchKpaContext() → enabled 값 불변 → 추가 호출 없음
(PostLoginRedirect: targetRoute가 / 또는 없음 → navigate 없음 → 레이아웃 유지)

총계: 1회
```

### 3-3. 라우트 이동마다 호출 여부

- `/store` 하위 라우트 간 이동 (`/store/info`, `/store/marketing/qr` 등):
  - `<Route path="/store" element={<PharmacyGuard><KpaStoreLayoutWrapper /></PharmacyGuard>}>`
  - 부모 레이아웃 컴포넌트(`KpaStoreLayoutWrapper`) 유지 → KpaGlobalHeader 유지 → 추가 호출 없음

- 커뮤니티 페이지 간 이동 (`/forum`, `/resources` 등):
  - 모두 `<Layout serviceName={SERVICE_NAME}>` 래핑 → 다른 Layout 인스턴스가 마운트될 때마다 KpaGlobalHeader 마운트
  - React Router v6: 같은 `element` 비교 — **포럼 페이지마다 `<Layout serviceName={SERVICE_NAME}>` JSX가 새 인스턴스**로 선언됨
  - Layout 컴포넌트 함수는 동일하나, `element` prop에 JSX 표현식이 인라인으로 생성되므로 라우트 전환 시 재마운트 여부는 React Router 내부 keying에 달림

---

## 4. 반복 호출의 직접 원인

### 원인 A: 마운트 시 무조건 fetch (캐시/guard 없음)

`useNotifications` effect는 마운트 시 **항상** `refetchCount()`를 호출한다. 마지막 fetch 시각, 성공 여부, 이전 결과와 관계없이 항상 새 요청을 발행한다. 캐시 유효 기간(TTL) 검사가 없다.

KpaGlobalHeader가 리마운트될 때마다 — route 변경, 레이아웃 전환, auth 상태 변화에 의한 조건부 렌더링 — 새 `/unread-count` 요청이 발행된다.

### 원인 B: refetchCount가 effect deps에 포함됨

**라인 145**: `}, [enabled, api, pollIntervalMs, refetchCount]);`

`refetchCount`는 `useCallback([api, enabled])`로 정의(라인 80). `api`(안정) 또는 `enabled`(로그인/로그아웃 시 변경)가 바뀌면 `refetchCount` 함수 참조가 재생성되고, 이 변화가 effect를 재실행시킨다.

현재 `notificationsApi`는 모듈 레벨 상수로 안정적이고, `enabled` 변화는 실제 auth 전환 시에만 발생하므로 **현재 구현에서는 circular loop를 일으키지 않는다**. 단, 향후 `api` 참조가 불안정해지면 loop가 발생할 수 있는 구조적 취약점이다.

### 원인 C: 429 수신 후 처리 부재

429 발생 경로:
```
ApiClient.request() → response.status=429 → throw error(status=429)
  → notificationsApi.getUnreadCount() → isUnauthorized(err)=false → throw
    → useNotifications.refetchCount() → catch { /* silent */ }
```

- **No backoff**: 429 이후 대기 없음
- **No retry-after**: `Retry-After` 헤더 무시
- **No error state**: 429 발생 사실을 컴포넌트에 알리지 않음
- **No cooldown**: 이후 KpaGlobalHeader 재마운트 시 바로 재요청

429 수신 자체가 즉각적인 재시도 loop를 만들지는 않는다(silent catch → 상태 변화 없음 → 리렌더 없음). **그러나 429 후 컴포넌트가 재마운트되면 backoff 없이 즉시 재요청**된다.

### 원인 D: KpaGlobalHeader 이중 위치

| 위치 | 코드 |
|------|------|
| `components/Layout.tsx:22` | `<KpaGlobalHeader />` |
| `App.tsx:458` | `KpaStoreLayoutWrapper` 내 `<KpaGlobalHeader />` |

두 인스턴스는 **상호 배타적** (Layout은 `/store` 외, KpaStoreLayoutWrapper는 `/store` 전용). 동시에 마운트되지 않으므로 이중 fetch가 상시 발생하지는 않는다. 단, store_owner 로그인 시 PostLoginRedirect의 navigate()가 Layout→KpaStoreLayoutWrapper 전환을 유발, 각각 한 번씩 → 2회.

---

## 5. 429 발생 시나리오 재구성

### 시나리오 1: 빠른 반복 로그인 (page refresh + re-login)

```
1회 로그인 = /unread-count 최대 2회 (store_owner)
브라우저 새로고침 = checkAuth() 초기화 → 재마운트 → +1회
```

rate-limit window(예: 60초) 내에 여러 번 페이지 새로고침 + 로그인 조합 시:
- 새로고침마다 checkAuth → Phase1 user → 1회
- store_owner의 경우 navigate('/store') → 추가 1회

### 시나리오 2: 빠른 라우트 전환 (커뮤니티 페이지 다수 탐색)

App.tsx에서 커뮤니티 페이지 라우트들은 모두 독립적인 인라인 JSX element로 선언:
```tsx
<Route path="/forum" element={<Layout serviceName={SERVICE_NAME}><ForumHomePage /></Layout>} />
<Route path="/forum/all" element={<Layout serviceName={SERVICE_NAME}><ForumListPage /></Layout>} />
```

React Router가 동일 `element` 타입으로 인식하면 Layout을 재사용하지만, 실제 동작은 구현에 따라 다름. 각 라우트가 Layout을 새로 마운트한다면 페이지 이동마다 KpaGlobalHeader 마운트 → `/unread-count` 발행 → 짧은 시간 내 다수 호출.

### 시나리오 3: checkAuth 초기화 + 불안정 auth 상태

페이지 초기 로드 시:
- `isLoading=true` → AuthGate 반환 `null` → KpaGlobalHeader 없음
- 토큰 확인 완료 → `isLoading=false, user!=null` → Layout+KpaGlobalHeader 마운트 → Phase1 user → `/unread-count [1]`
- fetchKpaContext 완료 → `isKpaContextLoaded=true` (Phase2) → enabled 값 유지 → 추가 없음

총 1회지만, 토큰 만료 → refresh → 다시 로드 패턴에서 반복 가능.

---

## 6. 화면 깜빡임과의 연관성

429 자체는 silent catch되어 상태 변화가 없으므로 **직접적인 깜빡임을 일으키지 않는다**.

깜빡임 주 원인 (이전 IR-O4O-KPA-LOGIN-REFETCH-FLICKER-AUDIT-V1과 동일):
1. `isKpaContextLoaded: false→true` 전환 시 조건부 컴포넌트 리렌더
2. KpaGlobalHeader 재마운트(PostLoginRedirect navigate) 시 레이아웃 전환
3. 429 후 `unreadCount=0` 유지 → badge 사라짐 → 이후 성공 응답 시 badge 복원: 이 toggling이 미세 깜빡임

---

## 7. React Query / SWR / refetchInterval 여부

**없음.** `useNotifications`는 자체 구현 훅이며:
- React Query / SWR / TanStack Query **미사용**
- App.tsx에 `QueryClientProvider`는 있으나(라인 4-8, `refetchOnWindowFocus: false, retry: 1`), notification 훅은 이를 사용하지 않음
- `refetchInterval`: 없음
- `useEffect` 기반 단순 fetch, 폴링 기본값 0

---

## 8. 동일 컴포넌트 중복 마운트 여부

**KpaGlobalHeader가 동시에 2개 마운트되는 시점은 없다** (Layout과 KpaStoreLayoutWrapper는 상호 배타적 라우트).

다만 라우트 전환 중 React의 unmount/mount 순서상 매우 짧은 시간 동안 둘 다 존재할 수 있다 (Concurrent Mode에서). 이 경우 `/unread-count`가 2개 동시에 발행될 수 있다.

---

## 9. 최소 수정 후보

### [P1] 429 backoff — notificationsApi 어댑터 수정

**파일**: `services/web-kpa-society/src/api/notifications.ts`  
**리스크**: 낮음 — KPA 전용 어댑터, 다른 서비스 영향 없음

```typescript
async getUnreadCount(params) {
  try {
    const res = await coreApiClient.get<UnreadCountResponse>(
      '/notifications/unread-count', { ... }
    );
    return res?.data?.count ?? 0;
  } catch (err: any) {
    if (isUnauthorized(err)) return 0;
    if (err?.status === 429) return 0;   // ← 추가: 429는 0으로 처리 (loop 차단)
    throw err;
  }
},
```

**효과**: 429 발생 시 re-throw 대신 0 반환 → useNotifications에서 `setUnreadCount(0)` → 상태 변화 → 리렌더 없음(값 동일 시). 추가 호출 차단.  
**한계**: Retry-After 준수 없음. 429 이후 마운트 시 재시도는 여전히 발생.

---

### [P2] 최소 fetch 간격(cooldown) — useNotifications 훅 수정

**파일**: `packages/account-ui/src/notifications/useNotifications.ts`  
**리스크**: 중간 — 공용 패키지, 전 서비스 영향

```typescript
const lastFetchRef = useRef<number>(0);

const refetchCount = useCallback(async () => {
  if (!enabled || !api) return;
  const now = Date.now();
  if (now - lastFetchRef.current < 5000) return;  // 5초 내 재호출 방지
  lastFetchRef.current = now;
  try {
    const count = await api.getUnreadCount({...});
    setUnreadCount(typeof count === 'number' ? count : 0);
  } catch {
    // silent
  }
}, [api, enabled]);
```

**효과**: 마운트/재마운트 간격이 5초 미만이면 skip. 빠른 라우트 전환 시 burst 차단.  
**리스크**: `enabled` 변경 시 cooldown 초기화 여부 설계 필요.

---

### [P3] refetchCount를 effect deps에서 제거

**파일**: `packages/account-ui/src/notifications/useNotifications.ts:145`  
**리스크**: 낮음

```typescript
// 변경 전
}, [enabled, api, pollIntervalMs, refetchCount]);

// 변경 후
}, [enabled, api, pollIntervalMs]);
// refetchCount 제거: api/enabled 변경으로 이미 재실행됨. 중복 의존 제거.
```

**효과**: `refetchCount` 함수 참조 변경만으로 effect가 재실행되는 경로 제거. 현재는 loop를 만들지 않으나, 향후 `api` 참조 불안정 시 방어.  
**주의**: `eslint-disable-line react-hooks/exhaustive-deps` 주석 필요.

---

### [P4] ApiClient — 429 처리 추가

**파일**: `services/web-kpa-society/src/api/client.ts`  
**리스크**: 중간 — 모든 API 호출 경로

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60_000;
  // GET 요청은 Retry-After만큼 대기 후 재시도하지 않음 (throw)
  // 단, 에러 객체에 retryAfter 포함
  const error: any = new Error(`Rate limited. Retry after ${waitMs}ms`);
  error.status = 429;
  error.retryAfterMs = waitMs;
  throw error;
}
```

**효과**: 호출 측에서 `err.retryAfterMs` 활용 가능. P1과 조합 시 cooldown 동적 설정 가능.

---

## 10. 수정 시 영향 범위

| 수정 항목 | 파일 수 | 다른 서비스 영향 | 리스크 |
|----------|---------|-----------------|--------|
| P1 429→0 (notificationsApi) | 1 (KPA 전용) | 없음 | **낮음** |
| P2 cooldown (useNotifications) | 1 (공용 패키지) | 전 서비스 | 중간 |
| P3 deps 단순화 | 1 (공용 패키지) | 전 서비스 | **낮음** |
| P4 ApiClient 429 구조화 | 1 (KPA 전용) | 없음 | 중간 |

---

## 11. 후속 WO 필요 여부

### 즉시 수정 가능 (저리스크)

**WO-O4O-KPA-NOTIFICATION-429-GUARD-V1**  
- P1: `notificationsApi.getUnreadCount()` — 429 → 0 반환 (re-throw 제거)  
- P3: `useNotifications` effect deps — `refetchCount` 제거  
- TypeScript clean + smoke test (로그인 후 bell 표시 확인)  
- 예상 효과: 429 발생 시 loop 차단, bell은 0 유지 (rate limit 해소 후 다음 fetch에서 복원)

### 중기 검토 (공용 패키지 변경)

**WO-O4O-NOTIFICATION-COOLDOWN-AND-CACHE-V1** (선택)  
- P2: useNotifications cooldown guard (5초)  
- P4: ApiClient 429 구조화 + Retry-After 전파  
- 전 서비스 smoke test 필요

---

## 결론

| 항목 | 상태 |
|------|------|
| 무한 retry loop (코드 내) | **없음** — 429 catch 후 상태 변화 없음 → 자동 재실행 없음 |
| 폴링 | **없음** — pollIntervalMs=0 |
| 진짜 원인 | **burst 누적** — 로그인 + 라우트 전환 시 빠른 연속 호출이 tight rate limit 초과 |
| 호출 횟수 (store_owner 1회 로그인) | **2회** (Phase1 마운트 1 + navigate 후 재마운트 1) |
| 호출 횟수 (비 store_owner) | **1회** |
| 페이지 이동마다 추가 호출 | **Layout 재마운트 시 1회** (커뮤니티 페이지 간 전환 패턴 의존) |
| 429 후 처리 | **없음** — 무음 삼킴, cooldown 없음, Retry-After 무시 |
| 즉시 수정 가능 여부 | ✅ P1+P3 (저리스크, 2개 파일) |
| 별도 구조 개편 필요 여부 | 선택적 (P2+P4는 체험 개선이지만 필수 아님) |

**핵심**: 429 loop는 코드가 능동적으로 재시도해서가 아니라, 짧은 시간 내 다수 마운트가 각각 독립적으로 fetch를 발행하고 이전 결과나 rate-limit 상태를 공유하지 않기 때문에 발생한다. **캐시/cooldown guard 부재**가 구조적 원인이며, **P1(429→0 변환)**이 가장 빠른 증상 차단 방법이다.
