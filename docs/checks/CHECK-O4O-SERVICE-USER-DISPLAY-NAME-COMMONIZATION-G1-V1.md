# CHECK-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1

> WO: `WO-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1`
> 작업일: 2026-08-10 · 결과: **PASS (구현 완료)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `0442dfa0c` (clean · `HEAD == origin/main`) |
| 실제 커밋 부모 | `b00484c25` — 작업 중 병렬 세션이 공유 작업트리의 main 을 진행시켰다 |
| 결과 commit | §10 |

> 병렬 세션의 개입 커밋(`4f483ede2` · `23c04ef56` · `b00484c25`)은 전부
> `apps/admin-dashboard/**` 범위이며 본 WO 가 다루는 `packages/account-ui` ·
> `services/web-*` 와 겹치지 않는다. §7 의 테스트·빌드는 그 커밋들이 반영된 트리에서 실행됐다.

---

## 2. 조사 — 중복 구현과 소비처

**공통 함수는 이미 존재했다.** [`packages/account-ui/src/utils/getUserDisplayName.ts`](../../packages/account-ui/src/utils/getUserDisplayName.ts)
(`WO-O4O-NAME-NORMALIZATION-V1` · `WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1`)가 정본이고
`@o4o/account-ui` 에서 export 된다. 이번 WO 는 **새 함수를 만든 것이 아니라 정본을 복제한 7곳을 회수**한 것이다.

| # | 위치 | 형태 | 소비처 | 판정 |
|---:|---|---|---|:--:|
| 1 | `web-kpa-society/components/KpaGlobalHeader.tsx:41` | 로컬 `getUserDisplayName` | 자기 컴포넌트 | **SAME** |
| 2 | `web-neture/components/NetureGlobalHeader.tsx:37` | 로컬 | 자기 컴포넌트 | **SAME** |
| 3 | `web-glycopharm/components/GlycoGlobalHeader.tsx:38` | 로컬 | 자기 컴포넌트 | **SAME** |
| 4 | `web-k-cosmetics/components/KCosGlobalHeader.tsx:31` | 로컬 | 자기 컴포넌트 | **SAME** |
| 5 | `web-kpa-society/components/store/StoreUserDropdown.tsx:21` | 로컬 | 자기 컴포넌트 (Store TopBar) | **SAME** |
| 6 | `web-kpa-society/components/KpaUserMenu.tsx:36` | **export** `getKpaUserDisplayName` | `MobileBottomNav.tsx:23,280` | **SAME** |
| 7 | `web-neture/components/NetureUserMenu.tsx:42` | **export** `getNetureUserDisplayName` | `NetureBottomNav.tsx:21,200` | **SAME** |
| — | `web-neture/components/AccountMenu.tsx:16` | **이미 `@o4o/account-ui` import** | — | 선례 (무변경) |

7개 모두 정본과 **문자 단위로 동일한 분기**였다 (시그니처와 `const ext = user as any` 별칭만 차이).

### 2-1. SERVICE_SPECIFIC — 의도적으로 유지한 다른 계산

우선순위·fallback 이 실제로 다르므로 통합하지 않았다. 통합하면 표시 결과가 바뀐다.

| 위치 | 계산 | 정본과의 차이 |
|---|---|---|
| `web-kpa-society/pages/mypage/MyDashboardPage.tsx:37` | `user.name \|\| '사용자'` | displayName·성명·email 단계 없음 (주석에 의도 명시) |
| `web-glycopharm/pages/operator/UsersPage.tsx:161` · `web-k-cosmetics/pages/operator/UsersPage.tsx:140` | `name \|\| 성+이름 \|\| email prefix` | **name 이 최우선**, `name !== email` 검사 없음 |
| `web-glycopharm/pages/mypage/MyProfilePage.tsx:65` · `MyPageHub.tsx:81` | `(lastName && firstName) ? 성+이름 : name` | displayName·email fallback 없음 |
| `web-pharmacy-hub/pages/store-owner/AccountPage.tsx:133` | `name \|\| nickname \|\| email` | **nickname** 축 — 정본에 없는 필드 |
| `mobile-app/app/(app)/index.tsx:18` | `displayName ?? email ?? '운영자'` | 최종 fallback 문구가 `'운영자'` · 워크스페이스 분리 앱 |

### 2-2. UNUSED

실행 경로에서 사용되지 않는 표시명 구현은 **0건**이다 (7개 전부 live 소비처 보유).

---

## 3. 서비스별 기존 표시명 계약

4개 서비스가 **동일한 계약**을 갖고 있었다 — 서비스명 분기가 필요 없다는 뜻이며, 이것이 통합 가능 판정의 근거다.

```text
displayName  >  lastName+firstName (구분자 없이 이어붙이고 trim)  >
name (단, name !== email 일 때만)  >  email prefix (@ 앞)  >  '사용자'
```

경계 동작도 4개 서비스가 동일했다.

- `displayName` 이 **공백 문자열이면 그대로 반환**한다 (trim 하지 않음 — 기존 계약).
- `lastName`/`firstName` 이 공백뿐이면 trim 결과가 빈 문자열이라 **다음 단계로 넘어간다.**
- `name === email` 이면 name 을 건너뛰고 email prefix 를 쓴다.

사용자 객체 타입은 서비스마다 다르지만(`web-kpa-society` 의 `User` 는 `displayName`·`lastName`·`firstName` 을
선언하지 않아 로컬 구현이 `as any` 로 읽고 있었다), 정본의 `DisplayNameUser` 가 **전 필드 optional 최소 입력 타입**이라
구조적으로 그대로 흡수된다. 인증 계약 변경은 필요하지 않았다 (WO §6 "단순한 타입 차이" 해당).

---

## 4. 공통 함수의 위치와 책임

| 항목 | 값 |
|---|---|
| 위치 | `packages/account-ui/src/utils/getUserDisplayName.ts` (**기존 파일 · 무변경**) |
| export | `@o4o/account-ui` → `getUserDisplayName`, `DisplayNameUser` |
| 형태 | 순수 함수 — React·라우터·스토어·API 의존 0 |
| 입력 | `DisplayNameUser \| null \| undefined` (전 필드 optional) |

4개 서비스 모두 `@o4o/account-ui` 를 **이미 `workspace:*` 로 의존**하고 실사용 중이었다
(KPA 16 · Neture 11 · GlycoPharm 12 · K-Cosmetics 13 파일). → **의존성·lockfile 변경 0.**

---

## 5. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | 로컬 함수 삭제 → 정본 import. 미사용이 된 `type User as UserType` import 제거 |
| `services/web-neture/src/components/NetureGlobalHeader.tsx` | 로컬 함수 삭제 → 정본 import |
| `services/web-glycopharm/src/components/GlycoGlobalHeader.tsx` | 동상 |
| `services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx` | 동상 |
| `services/web-kpa-society/src/components/store/StoreUserDropdown.tsx` | 동상 (`UserType` 은 `isSuperOperator` 가 계속 사용 → 유지) |
| `services/web-kpa-society/src/components/KpaUserMenu.tsx` | `getKpaUserDisplayName` 본문을 정본 위임으로 교체 (§5-1) |
| `services/web-neture/src/components/NetureUserMenu.tsx` | `getNetureUserDisplayName` 동상 |
| `packages/account-ui/__tests__/getUserDisplayName.test.ts` | **신규** — 단위 테스트 20건 |
| `packages/account-ui/jest.config.cjs` | **신규** — 패키지 로컬 jest config (§7-1) |
| `packages/account-ui/package.json` | `test` 스크립트 1줄 추가 (**의존성 변경 없음 · lockfile 무변경**) |

합계 **−105 / +28** (테스트·config 제외).

### 5-1. 위임을 남긴 이유 (2곳)

`getKpaUserDisplayName` · `getNetureUserDisplayName` 은 **모바일 하단 nav**(`MobileBottomNav` · `NetureBottomNav`)가
import 하는 공개 심볼이다. WO §5 가 `모바일 하단 메뉴 공통화 금지` 를 명시하므로 **소비처 파일을 건드리지 않기 위해**
심볼은 유지하고 본문만 정본 위임으로 바꿨다.

```ts
export function getKpaUserDisplayName(user: UserType | null): string {
  return getUserDisplayName(user);
}
```

중복의 실체인 **계산 로직은 제거**됐고 정본은 하나뿐이다. 심볼 자체의 정리는 하단 nav 가 범위에 포함되는
후속 WO 로 분리한다 (§11).

---

## 6. 변경 전·후 결과 비교

로컬 7개 구현(두 변형: `as any` 계열 / `any` 계열)과 정본을 **같은 입력 19케이스**에 돌려 대조했다.
스크립트는 각 소스에서 함수 본문을 그대로 옮긴 것이다.

| 서비스 | 대표 입력 | 변경 전 | 변경 후 | 결과 |
|---|---|---|---|:--:|
| KPA | `{name:'서상원', email:'sohae2100@gmail.com'}` | `서상원` | `서상원` | 동일 |
| K-Cosmetics | `{name:'ops@k-cosmetics.site', email:'ops@k-cosmetics.site'}` | `ops` | `ops` | 동일 |
| GlycoPharm | `{lastName:'김', firstName:'약사', name:'gp', email:'gp@…'}` | `김약사` | `김약사` | 동일 |
| Neture | `{displayName:'네처운영자', name:'n', email:'n@…'}` | `네처운영자` | `네처운영자` | 동일 |

경계값(15케이스)도 전부 동일했다.

| 입력 | 변경 전 = 변경 후 |
|---|---|
| `displayName` 이 모든 필드보다 우선 | `D` |
| `lastName` 단독 / `firstName` 단독 | `홍` / `길동` |
| `lastName`·`firstName` 이 공백뿐 → name 으로 | `이름` |
| 공백뿐 + name 없음 → email prefix | `abc` |
| `name === email` → email prefix | `abc` |
| `name` 빈 문자열 → email prefix | `abc` |
| `displayName` 빈 문자열 → 다음 단계 | `이름` |
| **`displayName` 공백문자열 → 그대로 반환** | `   ` |
| email 만 보유 | `only` |
| email 빈 문자열 / 빈 객체 / null / undefined / 전 필드 null | `사용자` |

**19 케이스 · 불일치 0건.**

---

## 7. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 공통 패키지 단위 테스트 | `pnpm --filter @o4o/account-ui run test` | ✅ **20 tests PASS** |
| 공통 패키지 typecheck | `tsc --noEmit` | ✅ exit 0 |
| 공통 패키지 build | `npx tsc --build` | ✅ exit 0 |
| KPA production build (`tsc && vite build`) | `pnpm run build` | ✅ exit 0 · `✓ built in 23.22s` |
| Neture production build | 동상 | ✅ exit 0 · `✓ built in 17.22s` |
| K-Cosmetics production build | 동상 | ✅ exit 0 · `✓ built in 17.72s` |
| GlycoPharm typecheck (`tsc -b`) | `pnpm run type-check` | ✅ exit 0 |
| GlycoPharm production build | `pnpm run build` | ✅ exit 0 · `✓ built in 18.30s` |

KPA · Neture · K-Cosmetics 는 별도 `type-check` 스크립트가 없고 `build` 가 `tsc && vite build` 이므로
**production build 가 typecheck 를 포함**한다.

### 7-1. 테스트 실행 경로 — 기존 결함 회피 기록

루트 `jest.config.js` 는 `require` 를 쓰는데 루트 `package.json` 이 `"type": "module"` 이라
**ESM 충돌로 기동하지 않는다** (`ReferenceError: require is not defined in ES module scope`).
본 WO 범위 밖의 기존 결함이라 고치지 않고, `packages/asset-copy-core` · `packages/appearance-system` 과
동일한 **패키지 로컬 `jest.config.cjs`** 관행을 따랐다. `jest` · `ts-jest` 는 루트에 호이스트돼 있어
**devDependency 추가가 필요 없었다** (lockfile 무변경 실측).

### 7-2. 중복 잔존 검색

```text
로컬 `function getUserDisplayName` 정의        → account-ui 정본 외 1건
                                                 (MyDashboardPage — SERVICE_SPECIFIC, §2-1)
`email.split('@')[0]` 표시명 계산             → 2건 (GP·KCos operator UsersPage — SERVICE_SPECIFIC)
불필요해진 import                              → KpaGlobalHeader 의 `UserType` 제거 완료
```

---

## 8. 라우트 · 권한 · UI 변화 0 확인

- 변경은 **표시명 문자열을 만드는 순수 함수의 출처**만 바꿨다. 렌더 트리·className·레이아웃·아이콘·메뉴 항목
  구성은 한 글자도 바뀌지 않았다 (diff 는 함수 삭제와 import 한 줄뿐 — §5).
- 라우트·권한·guard·API·DB 파일 변경 0건.
- 로그인·로그아웃·알림(`NotificationBell` · `useNotifications`) 호출부 무변경.
- 서비스별 branding·헤더 구성 무변경.
- 모바일 하단 nav 파일 **미접촉** (§5-1).

---

## 9. 금지사항 준수

| 금지 | 준수 |
|---|:---:|
| 표시 문구·우선순위 임의 변경 | ✅ 없음 — 19케이스 동치 실측 (§6) |
| 사용자·인증 타입 대규모 개편 | ✅ 없음 (기존 `DisplayNameUser` 최소 입력 타입 사용) |
| 헤더 디자인·레이아웃 변경 | ✅ 없음 |
| 메뉴·라우트·권한 변경 | ✅ 없음 |
| 로그인·로그아웃 동작 변경 | ✅ 없음 |
| 알림 기능 변경 | ✅ 없음 |
| 서비스별 branding 변경 | ✅ 없음 |
| DB·API·schema·migration 변경 | ✅ 없음 |
| 모바일 하단 메뉴 공통화 | ✅ 없음 — 파일 미접촉 (§5-1) |
| 무관한 리팩터링 | ✅ 없음 (루트 jest 결함도 고치지 않고 기록만 — §7-1) |
| lockfile · 타 세션 파일 스테이징 | ✅ lockfile 무변경 · path-specific stage |
| 수동 배포 | ✅ 없음 |

---

## 10. commit / push

| 항목 | 값 |
|---|---|
| commit | §아래 |
| push | §아래 |
| 완료 조건 | 본 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

## 11. 후속 (본 WO 범위 아님)

1. **`WO-O4O-USER-MENU-DISPLAY-NAME-ALIAS-REMOVAL-V1`** — `getKpaUserDisplayName` ·
   `getNetureUserDisplayName` 위임 alias 제거 + `MobileBottomNav` · `NetureBottomNav` 의 import 를
   `@o4o/account-ui` 로 직접 전환. 하단 nav 가 범위에 포함될 때 수행.
2. **`WO-O4O-ROOT-JEST-CONFIG-ESM-FIX-V1`** — 루트 `jest.config.js` → `.cjs` 전환(또는 ESM 문법 전환).
   현재 루트 jest 는 기동 자체가 불가능하다 (§7-1).
3. **SERVICE_SPECIFIC 표시명 5종 정책 정리** — §2-1 의 서로 다른 우선순위가 의도된 것인지
   드리프트인지는 UX 정책 판단이 필요하다. 특히 GP·KCos operator `UsersPage` 는 `name` 최우선이라
   `name === email` 계정에서 헤더와 다른 문자열이 보인다.

---

*작성: 2026-08-10 · 기준 commit `0442dfa0c`*
