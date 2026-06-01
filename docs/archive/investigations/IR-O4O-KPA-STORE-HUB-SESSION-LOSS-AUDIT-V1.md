# IR-O4O-KPA-STORE-HUB-SESSION-LOSS-AUDIT-V1

> **조사 일자**: 2026-05-26  
> **목적**: KPA에서 `/store-hub` 진입 시 세션이 반복 소실되고 공개 레이아웃("로그인" 버튼)으로 렌더링되는 원인 조사  
> **결과**: 코드 변경 없음 (IR 전용) — 후속 WO 권장

---

## 1. 핵심 발견 요약

**세션 소실이 아니다.** 세션(토큰)은 유효하다.

증상은 **인증 초기화 중 발생하는 헤더 깜빡임(FOUH — Flash Of Unauthenticated Header)** 이다.  
원인은 `KpaGlobalHeader`가 `isLoading` 상태를 읽지 않아, 인증 해석 완료 전에 `user=null`로 `GlobalHeader`를 렌더링하기 때문이다.

---

## 2. 근본 원인 체인

### 2-1. AuthContext 초기 상태

```typescript
// services/web-kpa-society/src/contexts/AuthContext.tsx:252
// WO-O4O-KPA-AUTH-ISLOADING-SMART-INIT-V1
const [isLoading, setIsLoading] = useState(() => !!getAccessToken());
const [user, setUser] = useState<User | null>(null);
```

- 토큰이 있는 로그인 사용자: **`isLoading=true`, `user=null`** 으로 시작
- 비동기 토큰 검증이 완료되어야 `user`가 채워지고 `isLoading=false`가 됨
- 이 초기화 기간은 일반적으로 100–500ms

### 2-2. KpaGlobalHeader — isLoading 미수신

```typescript
// services/web-kpa-society/src/components/KpaGlobalHeader.tsx:55
const { user, logout } = useAuth();  // isLoading 읽지 않음
```

- `user`만 읽는다. `isLoading`을 읽지 않는다.
- `user=null`인 동안 `headerUser = null`로 계산된다.

### 2-3. GlobalHeader — user=null → 로그인 버튼 렌더

```typescript
// packages/ui/src/layout/GlobalHeader.tsx:94
const isAuthenticated = isAuthProp ?? !!user;
// → user=null이면 isAuthenticated=false
```

- `isAuthenticated=false`이면 `User 아이콘` 대신 `로그인` 버튼을 렌더링한다 (line 291).
- `KpaGlobalHeader`는 `isAuthenticated` prop을 명시적으로 주입하지 않으므로 `user=null` 단계에서 공개 헤더가 보인다.

### 2-4. Layout — 인증 가드 없이 즉시 렌더

```typescript
// services/web-kpa-society/src/components/Layout.tsx
export function Layout({ children }: LayoutProps) {
  return (
    <div>
      <KpaGlobalHeader />   {/* ← 인증 상태와 무관하게 즉시 렌더 */}
      <main>{children}</main>
      ...
    </div>
  );
}
```

`Layout`은 인증 컨텍스트를 알지 못하며, 항상 `KpaGlobalHeader`를 즉시 렌더링한다.

### 2-5. /store-hub 라우트 구조 — Layout이 HubGuard를 감싼다

```typescript
// services/web-kpa-society/src/App.tsx
<Route path="/store-hub/*" element={
  <Layout serviceName={SERVICE_NAME}>    {/* ← 먼저 렌더 */}
    <HubGuard>                           {/* ← 그 다음 인증 체크 */}
      <PharmacyHubLayout />
    </HubGuard>
  </Layout>
} />
```

`Layout`이 `HubGuard`를 **감싸고 있어** 인증 해석 전에 공개 헤더가 렌더된다.

### 2-6. 대조: /store 라우트 — Layout이 Guard 내부에 있다

```typescript
// services/web-kpa-society/src/App.tsx
<Route path="/store/*" element={
  <PharmacyGuard>                        {/* ← 먼저 인증 체크 */}
    <KpaStoreLayoutWrapper />            {/* ← 인증 후 레이아웃 */}
  </PharmacyGuard>
} />
```

`PharmacyGuard`가 `isLoading=true` 동안 로딩 div를 반환하므로 공개 헤더가 절대 보이지 않는다.

---

## 3. 결론

| 항목 | 상태 |
|------|------|
| 세션(토큰) 유효성 | ✅ 유효 — 소실 없음 |
| 인증 해석 완료 후 접근 | ✅ HubGuard가 정상 통과 |
| 공개 헤더 표시 | ⚠️ `isLoading=true` 구간(100–500ms) 동안 일시 표시 |
| 원인 | `KpaGlobalHeader`가 `isLoading`을 읽지 않아 `user=null` 상태를 공개로 해석 |

**"세션 소실"이 아니라 "인증 초기화 중 공개 헤더 깜빡임(FOUH)"이다.**

---

## 4. 영향 범위

| 대상 | 영향 |
|------|------|
| `/store-hub/*` 전체 | ⚠️ 진입 시 ~100–500ms 동안 공개 헤더 노출 |
| `/store/*` | ✅ 영향 없음 (PharmacyGuard가 Layout을 래핑) |
| 커뮤니티 공개 페이지 | ✅ 영향 없음 (원래 공개 헤더가 맞음) |
| 세션 데이터 | ✅ 영향 없음 (토큰 유효) |

---

## 5. 수정 옵션

### Option A — KpaGlobalHeader에 isLoading guard 추가 (권장)

**변경 파일**: `services/web-kpa-society/src/components/KpaGlobalHeader.tsx`

```typescript
// 변경 전
const { user, logout } = useAuth();

// 변경 후
const { user, logout, isLoading } = useAuth();

// GlobalHeader 호출 시
<GlobalHeader
  ...
  isAuthenticated={isLoading || !!user}   // loading 중에는 인증된 것으로 처리
  user={headerUser}
  ...
/>
```

- `isLoading=true` 동안: `isAuthenticated=true` → 공개 헤더 숨김 (유저 아이콘 + 빈 메뉴 표시)
- 인증 완료 후: `user` 채워지면 정상 표시

**장점**: 단일 파일 1줄 변경. 하위 호환.  
**위험**: 없음. `isLoading=true` 중 user menu가 비어 있을 수 있으나 렌더링 순간 사용자 인터랙션 없음.

### Option B — /store-hub 라우트 구조 변경

`Layout`을 `HubGuard` 내부로 이동:

```typescript
// 변경 후
<Route path="/store-hub/*" element={
  <HubGuard>
    <Layout serviceName={SERVICE_NAME}>
      <PharmacyHubLayout />
    </Layout>
  </HubGuard>
} />
```

**장점**: 구조적으로 올바름. 인증 완료 후 Layout 렌더.  
**단점**: `HubGuard`가 `isLoading` 중 자체 로딩 UI를 보여주어 헤더 없는 빈 화면이 잠깐 보임. 추가 스타일링 필요.

### Option C — Layout에 isLoading prop 추가

Layout에 `isLoading` prop을 추가하여 KpaGlobalHeader로 전달.  
**단점**: Layout API 변경 → 모든 사용처 수정 필요. 범위 과다.

---

## 6. 권장 옵션: **Option A**

이유:
1. 단일 파일 1줄 변경 — 영향 범위 최소
2. `GlobalHeader` `isAuthenticated` prop이 이미 override를 지원하는 설계
3. FOUH 패턴의 표준 해결 방식 (loading 중 인증 상태 유지)
4. Option B는 기존 Layout 구조 변경이 필요하여 다른 라우트에 영향 가능

---

## 7. 후속 WO 권장

### WO-O4O-KPA-GLOBAL-HEADER-ISLOADING-GUARD-V1

**포함**:
```
services/web-kpa-society/src/components/KpaGlobalHeader.tsx
  - const { user, logout, isLoading } = useAuth();
  - GlobalHeader에 isAuthenticated={isLoading || !!user} 추가
```

**제외**:
```
packages/ui/src/layout/GlobalHeader.tsx  — 변경 불필요
services/web-kpa-society/src/App.tsx    — 변경 불필요
HubGuard.tsx / PharmacyGuard.tsx        — 변경 불필요
```

**TypeScript 검증**: `web-kpa-society` 단독 검증.  
**난이도**: 낮음 (1줄 변경).  
**사전 조건**: 없음.

---

## 8. 코드 변경 없음 확인

이번 IR에서 코드 파일을 수정하지 않았다.

```
수정된 파일: 없음
```

---

## 9. 참조 파일

```
services/web-kpa-society/src/contexts/AuthContext.tsx          (isLoading 초기 상태)
services/web-kpa-society/src/components/KpaGlobalHeader.tsx    (isLoading 미수신)
packages/ui/src/layout/GlobalHeader.tsx                        (isAuthenticated = !!user)
services/web-kpa-society/src/components/Layout.tsx             (인증 가드 없음)
services/web-kpa-society/src/App.tsx                          (라우트 구조)
services/web-kpa-society/src/components/auth/HubGuard.tsx      (isLoading 처리)
services/web-kpa-society/src/components/auth/PharmacyGuard.tsx (대조 구조)
```
