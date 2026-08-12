# CHECK — 인증 컨텍스트 · 라우트 가드 공통화 최종 마감

- **WO**: `WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1`
- **일자**: 2026-08-12
- **대상**: `kpa-society` / `neture` / `k-cosmetics` / `glycopharm` / `pharmacy-hub` (5개 서비스)
- **성격**: 신규 설계 아님 — 이미 만든 공통 기반(`@o4o/auth-react`, `@o4o/account-ui`)의 **소비 전환 마감**
- **판정**: **PASS_WITH_REPORTED_ITEMS** (남은 항목 2건은 확대하지 않고 보고만 — §6)

---

## 1. 선행 공통화의 `main` 반영 여부

`WO-...-COMMONIZATION-V1`(선행) 커밋이 모두 `origin/main` 조상임을 확인했다.

| 커밋 | 내용 |
|---|---|
| `265c57780` | `@o4o/auth-react` 신설 (`useServiceAuth` · `createRouteGuard`) |
| `bcdb1cf9b` | KPA · Neture AuthContext Core 소비 전환 |
| `9d9dfbb0b` | K-Cosmetics · GlycoPharm RoleGuard 전환 |
| `f990923c2` | Pharmacy-Hub AuthContext 전환 |
| `66520eda6` | 5개 서비스 Dockerfile 의 `packages/auth-react` COPY 누락 보완 |
| `2cefa2aa7` | 로그인 호출부(result object) 정합 |

→ **선행분 재구현 없음.** 이번 WO 는 남은 편차만 정비했다.

## 2. 소비 상태 (전환 전 조사 결과)

| 축 | kpa-society | neture | k-cosmetics | glycopharm | pharmacy-hub |
|---|---|---|---|---|---|
| `useServiceAuth` 소비 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `createRouteGuard` 소비 | ✅ | ✅ | ✅ | ✅ | 해당 없음(§4) |
| `@o4o/auth-react` 의존·Dockerfile COPY | ✅ | ✅ | ✅ | ✅ | ✅ |
| `getUserDisplayName` 소비 | 부분 | 부분 | 부분 | 부분 | ❌ → ✅ |

## 3. 이번에 정비한 남은 편차

### 3-1. 역할 전환·사용자 부분 갱신 3중 중복 → Core 승격

Neture(`switchRole`) · K-Cosmetics(`switchRole`) · GlycoPharm(`selectRole`) 가
**글자 단위로 동일한** 구현을 각자 보유했다. `@o4o/auth-react` 에 `useRoleSelection` 을 신설해 흡수했다.

- 판정 규칙 불변: 미로그인·미보유 역할은 무음 무시 / 선택 역할만 `roles[0]` 으로 승격 / 역할 **집합은 불변**.
- GlycoPharm 만 허용 축이 `availableRoles`(인증 시점 스냅샷)이라 `options.availableRoles` 로 **명시 주입**했다 — 차이를 지우지 않고 설정으로 분리.

### 3-2. `logoutAll` 서비스별 차이 → 설정 1개로 분리

Neture · K-Cosmetics · GlycoPharm 은 "서버 호출만 하고 로컬 user 는 유지" 동작을 각자
`api.post('/auth/logout-all')` 로 재구현하고 있었다(Core 의 `logoutAll` 은 로컬 세션까지 정리).
`ServiceAuthConfig.clearSessionOnLogoutAll`(기본 `true`)을 추가하고 3서비스는 `false` 를 주입한다.
**동작은 전후 동일**하며 중복 구현만 사라졌다. (`api === authClient.api` 임을 확인 — 엔드포인트·인터셉터 동일.)

### 3-3. 사용자 표시명 → `getUserDisplayName` 수렴

임시 체인 `user?.name || user?.email` 5곳을 공통 함수로 교체했다.

| 위치 | 비고 |
|---|---|
| `services/web-kpa-society/src/App.tsx` | 매장 셸 `userName` |
| `services/web-glycopharm/src/App.tsx` | 〃 |
| `services/web-k-cosmetics/src/App.tsx` | 〃 |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | 〃 |
| `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` | 매장 요약 카드 |

- `user` 가 없을 때의 빈 문자열 표시는 **그대로 보존**했다(`user ? getUserDisplayName(user) : ''`) — 공통 함수의 `'사용자'` 기본값이 비로그인 화면에 새로 나타나지 않게 한다.
- 로그인 사용자에서는 이름이 이메일과 같을 때 **email prefix** 로 표시된다 — 각 서비스 헤더 드롭다운이 이미 쓰던 규칙과 같은 축으로 맞춘 것이다.
- **제외**: `services/web-kpa-society/src/pages/forum/ForumWritePage.tsx` — 포럼 공개 표시명(`nickname` 우선 · 기본값 `'익명'`)은 다른 축이라 건드리지 않았다. 폼 기본값(`name: user?.name || ''`) 계열도 표시명이 아니므로 제외.

### 3-4. Tailwind 스캔 누락 보완

- `services/web-pharmacy-hub/tailwind.config.js` 에 `../../packages/account-ui/src/**/*.{ts,tsx}` 추가 (나머지 4개 서비스에는 이미 존재).
- `packages/auth-react/src` 는 어떤 서비스 config 에도 없으나 **클래스를 생성하지 않는다**(`className` 0건 — `renderLoading`/`renderDenied` 는 서비스가 주입). 항목 추가 불필요로 판정하고 기록만 남긴다.

### 3-5. dead export 정리

- `services/web-kpa-society/src/contexts/AuthContext.tsx` 의 `TEST_ACCOUNTS` · `TestAccountType` · `loginAsTestAccount` 제거 — 소비처 0건이며, API 호출 없이 로컬 상태만 인증된 것처럼 바꾸는 형태라 남길 이유가 없다.
- `TestUser` 타입은 **유지**한다 — 6개 화면이 표시용 `position` 필드를 읽는 데 쓰고 있다(타입체크로 확인).

## 4. Pharmacy-Hub 일반 라우트 가드 — 수렴 대상 없음(판정)

Pharmacy-Hub 는 일반 역할 가드를 갖고 있지 않다. 보호 경로는
① 공통 `StoreOwnerGuard`(`@o4o/store-ui-core`) + ② `MembershipGate`(가입 상태 축) 2단이며,
`MembershipGate` 는 미인증 시 **`/login` 으로 보내지 않고 같은 URL 에서 안내 + 가입 신청 CTA** 를 렌더한다.
이는 제한형 서비스의 의도된 UX 이고, 여기에 `createRouteGuard` 를 끼우면 **URL 과 사용자 동작이 바뀐다**(WO 의 "유지" 항목 위반).
→ **전환하지 않는다.** 나머지 `isAuthenticated` 참조는 라우트 가드가 아니라 페이지 내부 표시 분기다.

## 5. 남긴 서비스별 Extension (의도된 차이)

| 서비스 | Extension |
|---|---|
| kpa-society | `/kpa/me-context` 비동기 로딩(`isKpaContextLoaded`) · `setActivityType` · Service User 인증 축 · localStorage 전략 전용 authClient |
| neture | `NetureLoginResult`(role/roles 동반) · dashboard/role 상수 re-export |
| k-cosmetics | lazy `checkSession()` 계약(`isSessionChecked`) · `OperatorRoute` 의 2갈래 prefix 술어(`k-cosmetics:` / `cosmetics:`) |
| glycopharm | `availableRoles` 스냅샷 · `status` 기본값 `'approved'` · Service User 인증 축 · 전용 Guard(GlycoHubGuard / PharmacyStoreGuard) |
| pharmacy-hub | `MembershipGate` 안내형 게이트 · `StoreOwnerShell`(결제 콜백 경로의 `requireStoreOwnerRole=false`) |

가드 파일 4개(kpa/neture/kcos/glyco)는 이미 **스피너 · MembershipGate · 역할 술어**만 남은 얇은 설정이라 추가 수렴 대상이 없다.

## 6. 확대하지 않고 보고만 하는 항목

1. **KPA 의 Service User 인증 블록(약 90줄)이 dead 다.** `serviceUser` / `serviceUserLogin` / `serviceUserLogout` / `getServiceAccessToken` 모두 `AuthContext.tsx` 밖 소비처 0건이다. GlycoPharm 은 같은 블록을 `ServiceLoginPage` · `ServiceDashboardPage` 에서 **실제로 사용**한다. 제거는 인증 축 하나(`/api/v1/auth/service/login`)를 프런트에서 걷어내는 판단이라 이번 범위에서 수행하지 않았다. 유지/제거/공통화(2서비스 동일 구현)는 별도 WO 로 판단이 필요하다.
2. **GlycoPharm 의 `AUTH_TOKEN_CLEARED_EVENT` 리스너 중복.** Core 가 이미 같은 이벤트로 user 를 비운다. GlycoPharm 쪽 리스너는 `availableRoles` 까지 비우는 고유 부수효과가 있어 남겼다. 3-1 의 `availableRoles` 축 자체를 Core 로 올릴지와 함께 판단할 항목이다.

두 항목 모두 **인증 API·권한 의미 변경이 필요 없다**. 현재 동작에는 영향이 없다.

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| `packages/auth-react` typecheck | PASS |
| 5개 서비스 typecheck (`tsc -b`) | PASS (5/5) |
| `packages/auth-react` 테스트 | **44 PASS** (기존 36 + 신규 8: `useRoleSelection` 6 · `clearSessionOnLogoutAll` 2) |
| `packages/account-ui` 테스트 (`getUserDisplayName`) | 20 PASS |
| 5개 서비스 vite build | PASS (5/5) |
| 로그인/로그아웃/세션 복원 계약 | Core 무변경 — `useServiceAuth` 회귀 테스트 17건으로 고정 |
| 보호 라우트 · 역할 · 리다이렉트 | `createRouteGuard` 판정 순서 무변경 — 회귀 테스트 21건 유지 |
| 플랫폼 관리자 / 서비스 운영자 경계 | 판정 술어·역할 상수 무변경 (`isAdminOrAbove` / `isOperatorOrAbove` / MembershipGate bypass 동일) |

**브라우저 smoke 는 이번 CHECK 에 포함하지 않았다.** 배포 후 5개 서비스 로그인·새로고침 세션 복원·보호 라우트 접근을 실제 브라우저로 확인해야 최종 종료다(계정은 `docs/local/TEST-ACCOUNTS.local.md`).

## 8. 중복 감소량

| 구분 | 증감 |
|---|---|
| 서비스 5개 합계 | **+38 / −99 (순 −61줄)** |
| 공통 패키지 런타임 | +13줄(설정 1개 + export 2줄) + `useRoleSelection.ts` 62줄 신설 |
| 공통 패키지 테스트 | +132줄 (신규 파일 86 + 기존 파일 46) |

3중 중복이던 로직 2종(역할 전환/부분 갱신, logoutAll 변형)이 **각 1개 구현**으로 줄었고,
표시명 임시 체인 5곳이 공통 함수 1개로 수렴했다.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§6)
