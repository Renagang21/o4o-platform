# CHECK — GlobalHeader 미사용 `children` 계약 제거

> **WO**: WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1
> **일자**: 2026-08-21
> **성격**: 구현 WO (공통 타입 제거 + PH config 정리)
> **최종 계약**: **`GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVED`**

선행 판정: [CHECK-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1](CHECK-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1.md)
(`REMOVE_UNUSED_CHILDREN`) · 표준: [GLOBAL-HEADER-STANDARD-V1](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md)

---

## 0. 시도 이력 — 본 실행은 **2차 시도**다

본 WO 는 이전에 한 번 실행되어 **중단(BLOCKED)** 된 이력이 있다. 그 기록을 지우지 않고 여기 명시한다.

| 시도 | commit | 결과 | 요지 |
|:---:|--------|------|------|
| 1차 | `146e08d1c` (기준 main `adaa7ff1a`) | **BLOCKED** | `children` 제거 **미수행**. §10 문서 경로 정정 1건만 수행 |
| 2차 | 본 실행 (기준 main `5e3b3f205`) | **완료** | 타입·config 제거 수행 |

**1차 중단 사유** (WO §21): 당시 `services/web-pharmacy-hub/src/config/navigation.ts` 가
다른 세션의 미커밋 WIP(`WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1`) 소유
dirty 상태였고, 그 WIP 가 바로 커뮤니티 `children` 블록에 `/resources` 를 **추가하는 중**이었다.
타입을 제거하면 그 작업트리가 즉시 타입 오류로 깨지므로 중단은 타당했다.

1차 CHECK 원문은 `git show 146e08d1c:docs/checks/CHECK-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1.md`
에 보존돼 있다. 본 문서는 동일 WO 의 최종 상태를 기록한다.

### 1차가 명시한 재시도 조건 — 3/3 충족 확인

| # | 1차가 요구한 조건 | 현재 상태 | 근거 |
|:-:|-------------------|:---------:|------|
| 1 | 해당 WIP 가 커밋되어 `navigation.ts` 가 clean | **충족** | `4a150c784` · `5bc8f0ba2` 로 커밋 완료. 본 실행 시작 시 `git status` 상 `navigation.ts` **clean** (dirty 는 `lib/api/pharmacyHubResources.ts` 등 별개 파일) |
| 2 | 현재 main 기준 producer / consumer / 고유 child route 수 **재계산** | **충족** | §2 에서 전수 재계산. 1차 예측대로 children 6→7, 고유 route 9→10 |
| 3 | consumer 가 여전히 0 임을 재확인 | **충족** | §2-3 — 렌더·필터·라우팅·분석·테스트 전 축 0 |

1차의 판단 참고("`/resources` 추가는 submenu 를 쓰겠다는 신호가 아니라 여전히 렌더되지 않는 config 를
늘린 것 — REMOVE 판정을 뒤집을 근거가 아니다")도 2차에서 그대로 성립한다: consumer 는 여전히 0 이고,
1차가 재시도 시 확인하라고 지목한 **`/resources` 의 실제 진입 UI** 도 존재한다 (§7 — 커뮤니티 허브 카드 + Footer).

---

## 1. 시작 main commit

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 시작 commit | `5e3b3f205` (`HEAD == origin/main` 확인) |
| 방식 | `git fetch origin` → `git status -sb` → `git branch --show-current` |
| `git pull --ff-only` | **미수행** — `HEAD == origin/main` 로 이미 동기 상태 (dirty 트리에서 pull 하지 않는다) |
| 다른 세션 WIP | `apps/api-server/src/routes/cms-content/cms-content-query.handler.ts` · `services/web-pharmacy-hub/src/lib/api/pharmacyHubResources.ts` 2건 dirty — **접촉하지 않음** (수정·삭제·stash·stage 0) |

---

## 2. 수정 전 producer / consumer 재확인

선행 조사 이후 main 이 이동했으므로 현재 코드에서 전부 다시 계산했다.

### 2-1. 타입 정의 — 존재 확인

[packages/ui/src/layout/GlobalHeader.tsx](../../packages/ui/src/layout/GlobalHeader.tsx) 에 `children?: { label: string; href: string }[]` 가 그대로 존재했다.
저장소 전체 `GlobalHeader.tsx` 는 **1개뿐**(`find` 전수) — 다른 사본 없음.

### 2-2. producer — **PharmacyHub 1개 서비스 (변동 없음)**

5서비스 `src/config/navigation.ts` 전수 검색 결과 `children:` 은 PH 3곳뿐.
KPA / GlycoPharm / K-Cosmetics / Neture = **0**.

> ⚠️ **선행 조사 대비 변동 1건**: 커뮤니티 parent 의 children 이 **6 → 7** 로 늘어 있었다.
> `{ label: '자료실', href: '/resources' }` 가 `WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12`
> (commit `4a150c784`·`5bc8f0ba2`) 에서 추가됐다.
> 따라서 **children 항목 12 → 13**, **고유 child route 9 → 10** 이다.
> 새 producer 서비스는 아니므로 §21 중단 기준에 해당하지 않는다.

| parent | href | children 수 | 비고 |
|--------|------|:---:|------|
| 커뮤니티 | `/community` | 7 | `/resources` 추가분 포함 |
| 교육 | `/education` | 3 | |
| 이용 안내 | `/service-guide` | 3 | |

`children` 항목 13개 중 3개(`/community`·`/education`·`/service-guide`)는 parent 자신의 href 와 동일 → **고유 child route = 10**.

### 2-3. consumer — **0 (변동 없음)**

| 확인 대상 | 결과 |
|-----------|------|
| desktop PrimaryNav (`publicNav.map`) | `item.href` / `item.label` 만 사용 — children 미참조 |
| desktop contextualNav (`contextualNav?.map`) | 동일 |
| mobile drawer (`allNav.map`) | 동일 — nested section·아코디언 없음 |
| active 판정 | `isActive(item.href, pathname)` — parent href 단독 |
| `filterContextualNav` | `toNavItem` 이 `{ label, href }` 로 정규화하여 children 을 **버린다** |
| route matcher / breadcrumb / sidebar / analytics | `.children` 읽기는 전부 `AGSidebar` 의 `NavItem`(`path` 기반 · `types.ts`) 과 `apps/admin-dashboard` 관리자 메뉴 빌더 — **별개 타입** |
| tests / fixtures | `GlobalHeaderNavItem` · `PH_PUBLIC_NAV` · `filterContextualNav` 참조 spec/test **0건** |
| `GlobalHeaderMenuItem.children` | React `ReactNode` — nav 필드와 무관 |

> 코드 자체가 consumer 0 을 증언한다: [CommunityHomePage.tsx](../../services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx)
> 주석에 "공통 GlobalHeader 는 nav item 의 children 을 렌더하지 않는다(플랫폼 공통 제약).
> 따라서 자료실의 실제 진입점은 이 커뮤니티 홈 카드와 footer 가 담당한다" 가 이미 적혀 있다.

**§21 중단 기준 해당 없음** → 제거 진행.

---

## 3. 제거한 타입

[packages/ui/src/layout/GlobalHeader.tsx](../../packages/ui/src/layout/GlobalHeader.tsx)

```diff
+/**
+ * PrimaryNav 는 1단이다.
+ * WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1:
+ *   미사용 `children` 계약을 제거했다(GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVED).
+ *   상단 노출이 필요한 항목은 submenu 가 아니라 parent 항목으로 승격한다.
+ */
 export interface GlobalHeaderNavItem {
   label: string;
   href: string;
-  children?: { label: string; href: string }[];
 }
```

빌드 산출물에서도 확인: `packages/ui/dist/layout/GlobalHeader.d.ts` → `{ label, href }` 만 남았다.

---

## 4. PharmacyHub 에서 제거한 block

[services/web-pharmacy-hub/src/config/navigation.ts](../../services/web-pharmacy-hub/src/config/navigation.ts) — `PH_PUBLIC_NAV` 의 `children` 배열 **3블록(13항목)** 제거.

| parent | 제거한 children |
|--------|-----------------|
| 커뮤니티 | 커뮤니티 홈 · 포럼 · 검색 · 내 글 · 내 포럼 · 포럼 개설 신청 · 자료실 |
| 교육 | 교육 허브 · 내 수강 · 내 수료증 |
| 이용 안내 | 서비스 소개 · 이용 가이드 · 기능별 이용 방법 |

`PH_CONTEXTUAL_NAV` · `PH_FOOTER_SECTIONS` 는 **무변경**.

---

## 5. 유지한 parent nav

parent item 자체·href·label·순서 **전부 그대로**다.

```ts
export const PH_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '커뮤니티', href: '/community' },
  { label: '교육', href: '/education' },
  { label: '이용 안내', href: '/service-guide' },
];
```

role / permission / visibleWhen 변경 **0**.

---

## 6. 유지한 하위 route

**route 삭제 0.** `App.tsx` route 선언·page component·hub card·Footer·My Page nav 전부 무변경 (diff 에 해당 파일 없음).

---

## 7. 대체 진입경로 검증 — 고유 child route 10/10

| # | child route | 대체 진입경로 | 확인 방식 |
|:-:|-------------|---------------|-----------|
| 1 | `/forum` | Footer '서비스' · CommunityHomePage 카드 | 정적 + 브라우저 |
| 2 | `/community/search` | CommunityHomePage `appEntryCards` | 정적 (인증 필요 — 아래 주) |
| 3 | `/forum/my-posts` | CommunityHomePage `appEntryCards` | 정적 (동일) |
| 4 | `/forum/my-dashboard` | ForumHubPage `infoLinks` | 정적 (동일) |
| 5 | `/forum/request` | ForumHubPage `infoLinks` · MyForumDashboardPage `requestFormHref` | 정적 (동일) |
| 6 | `/resources` | **Footer '서비스'** · CommunityHomePage 카드 | 정적 + 브라우저 |
| 7 | `/account/enrollments` | Footer '서비스' · My Page nav · 사용자 드롭다운 | 정적 + 브라우저 |
| 8 | `/account/certificates` | Footer '서비스' · My Page nav | 정적 + 브라우저 |
| 9 | `/guide/intro` | Footer '이용 안내' · CommunityHomePage help | 정적 + 브라우저(실제 이동) |
| 10 | `/guide/features` | Footer '이용 안내' · CommunityHomePage help · StoreOwnerShell | 정적 + 브라우저 |

**10/10 대체 진입 유지 — 데드링크 0.**

> **주 — 2·3·4·5 의 브라우저 실측 한계 (숨기지 않고 기록한다)**
> `/community` · `/forum` 은 비로그인 시 **"로그인이 필요합니다"** 게이트를 렌더한다 (브라우저 실측 확인).
> 따라서 이 4개의 대체 진입 UI(허브 카드 · infoLinks)는 **로그인 상태에서만** 화면에 나타나며,
> 로컬 preview 는 `localhost` origin → 운영 API 가 **CORS 로 차단**되어 로그인 자체가 불가하다.
> - 이 게이트는 **본 WO 이전부터 존재하던 동작**이고, `children` 은 애초에 렌더된 적이 없으므로
>   **비로그인 도달성은 이번 변경으로 달라지지 않았다** (변경 전후 모두 Header 에 노출 0).
> - 해당 4개 링크는 조건 분기 없는 **정적 config 배열**(`appEntryCards` · `infoLinks`)이라
>   페이지가 렌더되면 항상 나온다 — 코드 정적 확인으로 검증했다.
> - 로그인 상태 실측은 배포 후 프로덕션에서 수행한다 (§13-3).

---

## 8. `filterContextualNav` 무변경

[packages/ui/src/layout/filterContextualNav.ts](../../packages/ui/src/layout/filterContextualNav.ts) **변경 0건**.

- `toNavItem` 이 이미 `{ label, href }` 만 반환하므로 `children` 제거 후에도 계약이 그대로 성립한다.
- WO §9 에 따라 재설계하지 않았다. dead import / dead type / 잘못된 주석도 없어 정리할 것이 없었다.
- `ContextualNavItem extends GlobalHeaderNavItem` 이므로 상속으로 딸려오던 `children` 도 자동 소멸한다.

---

## 9. 문서 경로 대소문자 정정 — **§10 대상은 1차에서 이미 처리됐다**

WO §10 이 지목한 `GlobalHeader.tsx` 의 소문자 참조는 **1차 시도(`146e08d1c`)에서 이미 정정**되어,
2차 시작 시점에는 정확한 대문자였다. WO §10 이 낡은 것이 아니라 **이미 실행된 항목**이다.

남아 있던 drift 는 1차 CHECK 가 "범위 밖 관찰 — 후속 제거 WO 에서 함께 정리 가능하다" 로
명시적으로 인계한 **4개 서비스 `config/navigation.ts`** 였다 (전수 검색으로 재확인).
본 실행이 그 "후속 제거 WO" 이므로 인계받은 대로 정리했다.

| 파일 | before | after |
|------|--------|-------|
| `services/web-neture/src/config/navigation.ts:5` | `global-header-standard-v1.md` | `GLOBAL-HEADER-STANDARD-V1.md` |
| `services/web-kpa-society/src/config/navigation.ts:5` | 동일 | 동일 정정 |
| `services/web-k-cosmetics/src/config/navigation.ts:5` | 동일 | 동일 정정 |
| `services/web-glycopharm/src/config/navigation.ts:5` | 동일 | 동일 정정 |
| `packages/ui/src/layout/GlobalHeader.tsx:5` | 1차에서 정정 완료 | 변경 없음 |
| `services/web-pharmacy-hub/src/config/navigation.ts:5` | 이미 정확 | 변경 없음 |

WO §10 의 목표는 "실제 파일명과 정확히 일치" 이므로 **drift 가 실재하는 4곳을 정정**했다.
파일당 **주석 1줄**이며 런타임·타입 영향 0.
WO §14 의 "KPA/Glyco/KCos/Neture 코드 수정 없음" 기대값에서 벗어나는 **유일한 항목**이라 여기 명시한다 —
`children` 이나 nav 항목을 건드린 것이 아니므로 §13 이 금지한 "다른 서비스 navigation 재구성" 이 아니다.

---

## 10. 표준 문서 갱신

[GLOBAL-HEADER-STANDARD-V1.md](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) — 해당 섹션만 최소 수정 (전체 재작성 없음).

- 제목 `하위 메뉴(submenu) 계약 — 결정 완료, 제거 대기` → `— 제거 완료`
- `REMOVE_UNUSED_CHILDREN` → **`REMOVED`**, 본 CHECK 링크 추가
- "실제 필드 제거는 후속 WO 에서 수행한다" 줄 삭제 → "상단 노출이 필요하면 parent 로 승격" 로 대체

---

## 11. 5서비스 영향

| 서비스 | 코드 변경 | children 의존 | Header 렌더 |
|--------|-----------|:---:|---|
| PharmacyHub | `navigation.ts` children 3블록 제거 | 0 | 변화 없음 (children 은 원래 렌더 안 됨) |
| KPA Society | 주석 1줄(문서 경로) | 0 | 변화 없음 |
| GlycoPharm | 주석 1줄 | 0 | 변화 없음 |
| K-Cosmetics | 주석 1줄 | 0 | 변화 없음 |
| Neture | 주석 1줄 | 0 | 변화 없음 |

GlobalHeader bridge import 정상 · navigation config 타입 정상 (전 서비스 빌드 PASS 로 실증).

---

## 12. Typecheck / Build

workspace 이름을 먼저 확인해 `No projects matched` 위양성을 배제했다.

| 대상 | package name | 명령 | 결과 |
|------|--------------|------|:----:|
| 공통 UI | `@o4o/ui` | `pnpm --filter @o4o/ui run build` (`tsc --build`) | **PASS** (exit 0) |
| PharmacyHub | `pharmacy-hub-web` | `run build` = `tsc -b && vite build` | **PASS** (exit 0, 1m 3s) |
| KPA Society | `@o4o/web-kpa-society` | `run build` = `tsc && vite build` | **PASS** (exit 0, 1m 11s) |
| GlycoPharm | `glycopharm-web` | `run build` = `tsc -b && vite build` | **PASS** (exit 0, 48.49s) |
| K-Cosmetics | `@o4o/web-k-cosmetics` | `run build` = `tsc && vite build` | **PASS** (exit 0, 44.01s) |
| Neture | `@o4o/web-neture` | `run build` = `tsc && vite build` | **PASS** (exit 0, 1m 5s) |

각 서비스의 `build` 는 `tsc` 를 포함하므로 **TypeScript error 0** 이 함께 실증된다.
`@o4o/ui` 를 선행 빌드해 서비스들이 갱신된 `dist/*.d.ts` 를 소비하도록 했다.

> chunk-size / browserslist 경고는 기존부터 있던 것으로 본 변경과 무관하다.

---

## 13. Browser Smoke

### 13-1. PharmacyHub (로컬 preview, 신규 빌드 산출물)

Desktop **1440×900** / Mobile **390×844**, Playwright 1.57.0.

| 항목 | 결과 |
|------|:----:|
| GlobalHeader 렌더 | PASS |
| parent `홈`·`커뮤니티`·`교육`·`이용 안내` 노출 | PASS — `nav=[홈 \| 커뮤니티 \| 교육 \| 이용 안내]` |
| PrimaryNav 1단 (child route 미노출) | PASS — `hrefs=[/ \| /community \| /education \| /service-guide]` |
| hover 시 dropdown 없음 | PASS (링크 수 4 → 4) |
| mobile drawer 정상 | PASS — 4개 parent 전부 노출 |
| mobile drawer 아코디언 없음 | PASS (`button[aria-expanded]` 0) |
| Header 메뉴 누락 | 없음 |
| horizontal overflow | **0px** (desktop·mobile) |
| footer 대체 진입 (`/forum`·`/resources`·`/account/enrollments`·`/account/certificates`·`/guide/intro`·`/guide/features`) | PASS |
| `/guide/intro` 실제 이동 | PASS |

**console error — 정직하게 기록**: `0` 이 아니다.
전부 `https://api.neture.co.kr/.../footer-legal` 에 대한 **CORS 차단**(`localhost:4307` origin)이며,
로컬 preview 환경 artifact다. 앱 자체 예외(`pageerror`)·렌더 오류는 **0** 이고, 본 변경과 무관하다.

### 13-2. 타 서비스 회귀 (§18)

| 서비스 | header | nav | 아코디언 | overflow | app error | net error(CORS) |
|--------|:---:|---|:---:|:---:|:---:|:---:|
| KPA | OK | 커뮤니티 \| 서비스 안내 \| About \| Contact | 0 | 0px | **0** | 2 |
| GlycoPharm | OK | 커뮤니티 \| 서비스 안내 \| Contact | 0 | 0px | **0** | 6 |
| K-Cosmetics | OK | 커뮤니티 \| 서비스 안내 \| Contact | 0 | 0px | **0** | 8 |
| Neture | OK | Home \| 이용 안내 \| Contact Us | 0 | 0px | **0** | 4 |

desktop·mobile 양쪽 동일 결과. net error 는 13-1 과 같은 CORS artifact 다.

### 13-3. 미실측 항목 (배포 후 수행)

로그인 상태에서만 보이는 대체 진입 UI 4건(`/community/search` · `/forum/my-posts` ·
`/forum/my-dashboard` · `/forum/request`)은 로컬 preview 의 CORS 제약으로 실측하지 못했다.
정적 확인은 완료(§7)했고, 배포 후 프로덕션 로그인 smoke 로 보완한다.

---

## 14. Git diff / check

```
packages/ui/src/layout/GlobalHeader.tsx            |  7 ++-
services/web-glycopharm/src/config/navigation.ts   |  2 +-
services/web-k-cosmetics/src/config/navigation.ts  |  2 +-
services/web-kpa-society/src/config/navigation.ts  |  2 +-
services/web-neture/src/config/navigation.ts       |  2 +-
services/web-pharmacy-hub/src/config/navigation.ts | 58 ++++++----------------
```

`git diff --check` — 본 WO 파일 whitespace 오류 **0**.
(다른 세션 dirty 2파일에 대한 CRLF 경고가 출력되나 본 WO 변경분이 아니다.)

정적 회귀 확인:

| 항목 | 결과 |
|------|:----:|
| `GlobalHeaderNavItem.children` 정의 | **0** |
| Global Header 계약 children producer | **0** |
| Global Header 계약 children consumer | **0** |
| PharmacyHub children block | **0** |
| 하위 route 삭제 | **0** |
| parent nav 3개(+홈) 유지 | 유지 |
| role / permission 변경 | **0** |
| `apps/admin-dashboard` · `AGSidebar` 의 별개 `.children` | **미접촉** |

---

## 15. 최종 계약 상태

```text
GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVED
```

- GlobalHeader submenu 기능 **없음** (구현하지 않았다 — WO §13 금지사항 전부 준수)
- 미사용 `children` 타입 **없음**
- PharmacyHub dead `children` config **없음**
- 하위 route 및 실제 진입 UI **유지** (route 삭제 0 · 대체 진입 10/10)
- Header/Footer 공통화 트랙 **`CLOSED` 판정 유지** (변경하지 않았다)

---

## 16. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

발견 1건 = 1차 시도가 "범위 밖 관찰"로 인계한 **4개 서비스 `navigation.ts` 의 소문자 경로 참조**.
본 실행이 그 후속 WO 이므로 WO §10 목표대로 인라인 정정했다 (§9).
`docs/` 기준 문서 자체의 상태 drift 는 발견되지 않았다 (표준 문서 갱신은 §10 — drift 정비가 아니라
본 WO 가 지시한 상태 반영이다).

> 본 CHECK 는 1차 시도(BLOCKED) 기록을 대체하는 것이 아니라 **동일 WO 의 최종 상태**를 기록한다.
> 1차 원문은 `146e08d1c` 에 그대로 보존돼 있으며 §0 에 그 결론과 재시도 조건 충족 여부를 남겼다.
