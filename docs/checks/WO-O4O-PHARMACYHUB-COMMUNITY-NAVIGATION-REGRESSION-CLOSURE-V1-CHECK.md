# WO-O4O-PHARMACYHUB-COMMUNITY-NAVIGATION-REGRESSION-CLOSURE-V1 — CHECK

- 작성일: 2026-08-24
- 기준 커밋: `4571c3269` (= `origin/main` tip, 조사 시점)
- 판정: **`CAPABILITY_CONTRACT_CHANGED` + `STALE_TEST`** (두 route 모두 `ACTIVE_ROUTE`)
- 코드 변경: **0** — 이번 WO 는 **재조사·재증명 + 종결 기록**이다. 실패는 `26d0d2ed8` 에서 이미 교정됐고 본 CHECK 가 그 교정의 정당성을 독립 검증한다.

---

## 0. 요약

| 질문 | 답 |
|---|---|
| 구현 회귀인가? | **아니다.** 두 href 는 `children` 배열 안에만 있었고, 공통 `GlobalHeader` 에는 submenu 렌더러가 없어 **한 번도 렌더된 적이 없다.** |
| route 가 죽었는가? | **아니다.** 둘 다 `App.tsx` 에 등재·page·API consumer 존재 = `ACTIVE_ROUTE`. |
| 왜 테스트가 깨졌나? | 테스트가 `navigation.ts` **소스 문자열**을 고정했는데, 그 문자열이 **렌더되지 않는 config** 였다. 구현 정리(`a0f8cc48c`)가 dead config 를 지우자 assertion 만 남아 깨졌다. |
| main 은 green 인가? | **그렇다.** tip `4571c3269` CI Pipeline / CodeQL / Deploy API 전부 `success`. |

---

## 1. 실패 재현과 기준선 (§3)

### 1-1. 최초 failing assertion 2건 (원문)

CI run **`32488018335`** (`d9ecc678a`, 2026-08-21T13:49:18Z) 로그 원문:

```text
FAIL src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts
  ● §14 navigation — 기능 존재 + 진입점 없음 상태를 남기지 않는다
      › /forum/request 가 공개 navigation 에 노출된다
    Expected substring: "href: '/forum/request'"
    Received string:    "/** ...(navigation.ts 전문)
    at src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts:162:24

  ● §14 navigation — 기능 존재 + 진입점 없음 상태를 남기지 않는다
      › /forum/my-dashboard 가 공개 navigation 에 노출된다
    Expected substring: "href: '/forum/my-dashboard'"
    Received string:    "/** ...(navigation.ts 전문)
    at src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts:162:24
```

- expected href: `/forum/request` · `/forum/my-dashboard`
- 실패 대상 파일: `services/web-pharmacy-hub/src/config/navigation.ts` (raw text read)

### 1-2. 실패 구간

| 항목 | commit | CI Pipeline |
|---|---|---|
| 직전 green | `1de680f42` 이전 구간 | — |
| **원인 commit** | **`a0f8cc48c`** `refactor(ui): remove unused global header children contract` | `cancelled` (동시 push concurrency) |
| 중간 3커밋 | `146e08d1c` · `9e1bc02ef` · `d98533518` | 전부 `cancelled` → **실패가 늦게 드러남** |
| **최초 실측 실패** | `d9ecc678a` | **`failure`** (run `32488018335`) |
| **교정 commit** | **`26d0d2ed8`** `fix(test): children 제거로 깨진 PH navigation 계약 테스트 교정` | **`success`** |
| 현재 tip | `4571c3269` | **`success`** |

> 원인 commit 자체의 CI 가 `cancelled` 이라 실패가 3커밋 뒤에야 드러났다.
> "언제부터 red 였나" 를 run 결과만으로 보면 `d9ecc678a` 로 오귀속되므로 여기 명시한다.

### 1-3. 현재 재현 결과

`origin/main` tip 기준 로컬 재실행 — **재현되지 않는다** (24 tests PASS).
이번 WO 가 지목한 red 는 **이미 닫힌 상태**다.

---

## 2. 두 Route 실재 여부 (§4·§10) — **독립 판정**

### `/forum/request`

| 축 | 실측 |
|---|---|
| route 등록 | `services/web-pharmacy-hub/src/App.tsx:359` `path="/forum/request"` |
| page | `pages/forum/RequestForumPage.tsx` (공통 `ForumRequestForm` wrapper) |
| API consumer | `createPharmacyHubForumCategoryRequest` → `POST /forum/category-requests` (`serviceCode: 'pharmacy-hub'`) |
| navigation entry | header **없음** / **ForumHubPage `infoLinks[0]`** · **MyForumDashboardPage `requestFormHref`** |
| deep link | 가능 |
| 인증 | `MembershipGate` 뒤 (App.tsx 359~) |
| 소속 | 공통 forum 계약의 PH 인스턴스 (KPA·Neture 도 동일 경로명 보유) |
| **판정** | **`ACTIVE_ROUTE`** |

### `/forum/my-dashboard`

| 축 | 실측 |
|---|---|
| route 등록 | `App.tsx:367` `path="/forum/my-dashboard"` (+ `:forumId/members` `App.tsx:375`) |
| page | `pages/forum/MyForumDashboardPage.tsx` (공통 `ForumOwnerDashboard` wrapper) |
| API consumer | `createForumOwnerApi` / `createForumOwnerMembershipApi` → `/pharmacy-hub/forum/categories/mine` 등 |
| navigation entry | header **없음** / **ForumHubPage `infoLinks[1]`** · **ForumMemberManagementPage `backHref`** · **RequestForumPage `backTo`/`onSuccess` navigate** |
| deep link | 가능 |
| 인증 | `MembershipGate` 뒤 |
| 소속 | 공통 forum owner 영역의 PH 인스턴스 (GlycoPharm·K-Cosmetics 동일 route 명) |
| **판정** | **`ACTIVE_ROUTE`** |

**둘 다 살아 있으나, 둘의 진입 표면은 서로 다르다** — request 는 dashboard 에서도 들어가지만 dashboard 는 request 에서 들어가지 않는다(단방향). 그래서 ForumHub `infoLinks` 가 dashboard 의 **1차 진입점**이다.

---

## 3. Community Capability 계약 (§5)

| 기능 | route | 진입 표면 | 상태 |
|---|---|---|---|
| forum 허브 | `/forum` | Footer '서비스' · CommunityHome 카드 | ACTIVE |
| forum 목록 | `/forum/posts` | ForumHub 카테고리 카드 | ACTIVE |
| post 상세 | `/forum/posts/:id` | 목록 · CommunityHome 최근글 | ACTIVE |
| forum 개설 신청 | `/forum/request` | ForumHub infoLinks · MyDashboard | ACTIVE |
| 내 포럼(대시보드) | `/forum/my-dashboard` | ForumHub infoLinks | ACTIVE |
| 회원 관리 | `/forum/my-dashboard/:forumId/members` | 대시보드 내부 | ACTIVE |
| 내 글 | `/forum/my-posts` | CommunityHome 카드 | ACTIVE |
| 자료실 | `/resources` | Footer · CommunityHome 카드 | ACTIVE |
| 운영자 심사 큐 | `/forum/operator/*` (API) | operator 영역 | ACTIVE |

### §5 4문항 종결

| 질문 | 답 |
|---|---|
| 두 링크가 **공개** 진입점인가? | **아니다.** 둘 다 `MembershipGate` 뒤이며, 비로그인에게 노출할 대상이 아니다. |
| 로그인 후에만 노출돼야 하는가? | **그렇다.** ForumHub(`/forum`) 자체가 게이트 뒤이고, infoLinks 는 그 안에서만 보인다. |
| 기능이 retire 됐는가? | **아니다.** route·page·API 전부 살아 있다. |
| 다른 canonical route 로 대체됐는가? | **아니다.** 경로 자체는 그대로이고, **노출 위치만** header config → 화면 내 표면으로 확정됐다. |

---

## 4. Navigation 계약 실측 (§6)

### 4-1. 생성 흐름

```text
PH_PUBLIC_NAV (config/navigation.ts)
  → GlobalHeader publicNav  → PrimaryNav (desktop)  → item.label / item.href 만 사용
                            → mobile drawer         → item.label / item.href 만 사용
PH_CONTEXTUAL_NAV → filterContextualNav → toNavItem() = { label, href } 로 정규화
PH_FOOTER_SECTIONS → Footer
```

### 4-2. 핵심 실측 — `children` 은 렌더 경로가 없었다

- `packages/ui/src/layout/GlobalHeader.tsx` 의 `GlobalHeaderNavItem` 은 현재 `{ label, href }` 뿐이다.
- 파일에 남은 `children`(456·461·471행)은 **`GlobalHeaderMenuItem` 의 `React.ReactNode`** — nav 계약과 **무관한 별개 필드**다.
- `filterContextualNav` 의 `toNavItem` 은 `{ label, href }` 로 정규화하므로 children 을 **구조적으로 버린다**.
- 5개 서비스 `src/config/navigation.ts` 의 `children:` producer = **0** (PH 의 주석 2줄만 잔존, 코드 아님).

→ **`a0f8cc48c` 이전에도 두 href 는 desktop·mobile 어디에도 렌더되지 않았다.**
문자열이 config 에 있었을 뿐이며, 이것이 "문자열 존재 ≠ 실제 노출"(§6)의 정확한 사례다.

### 4-3. 현재 실제 도달 경로 (dead link 0)

| 경로 | 홉 |
|---|---|
| Header `커뮤니티` → `/community` → CommunityHome `포럼` 카드 → `/forum` → infoLinks → **두 route** | 3 |
| Footer `서비스` → `포럼` → `/forum` → infoLinks → **두 route** | 2 |
| `/forum/my-dashboard` → `requestFormHref` → `/forum/request` | 1 |
| `/forum/my-dashboard/:forumId/members` → `backHref` → `/forum/my-dashboard` | 1 |

`InfoLinksSection`(`packages/shared-space-ui/src/ForumHubTemplate.tsx:346`)은 조건 분기 없이 렌더되고 `flexWrap: 'wrap'` 이라 **desktop·mobile 동일 노출**이다 (breakpoint 게이팅 없음).

---

## 5. 테스트 계약 판정 (§7)

**변경 전 = `OVER_SPECIFIED_TEST` → 실질 `STALE_TEST`**

```ts
const navigation = read(`${PH_WEB}/config/navigation.ts`);   // raw text
expect(navigation).toContain("href: '/forum/request'");       // 렌더 안 되는 문자열을 고정
```

- 검사 대상이 **렌더 결과가 아니라 소스 문자열**이었다.
- 더 나쁜 것은 그 문자열이 **dead config** 였다는 점 — 테스트가 "진입점 존재"가 아니라 **"죽은 config 의 존재"** 를 지키고 있었다.
- describe 명은 `기능 존재 + 진입점 없음 상태를 남기지 않는다` 인데, assertion 은 `header nav 에 있을 것` 을 요구했다. **이름과 assertion 이 불일치**했다.

**변경 후 = `VALID_CONTRACT_TEST`** (`26d0d2ed8`)

```ts
it.each(NEW_ROUTES)('%s 가 실제 진입 UI(ForumHub infoLinks)에 노출된다', (route) => {
  expect(forumHubPage).toContain(`href: '${route}'`);
});
it('진입 표면인 ForumHub 자체가 공개 navigation 에서 도달 가능하다', () => {
  expect(navigation).toContain("href: '/forum'");
});
```

- assertion 삭제가 아니라 **표면 이동 + 도달성 테스트 1건 추가** → 가드가 약해지지 않았다.
- 이번 WO 는 이 교정을 **재검증만** 하고 다시 손대지 않는다 (통과 중인 테스트를 범위 외로 재작성하지 않는다).

> **약점 1건 (숨기지 않고 기록)**: 도달성 테스트가 `navigation.ts` 전체에서 `href: '/forum'` 을 찾으므로
> **header 인지 footer 인지 구분하지 않는다.** 현재 실체는 `PH_FOOTER_SECTIONS`(navigation.ts:92) 이고
> header 에는 `/community` 만 있다. 계약상 문제는 없으나(footer 도 공개 navigation),
> 블록을 좁히면 더 정확해진다 → §9 후속 후보.

---

## 6. Git History 원인 (§8)

| 항목 | 내용 |
|---|---|
| 제거 commit | **`a0f8cc48c`** `refactor(ui): remove unused global header children contract` |
| 함께 제거된 항목 | `PH_PUBLIC_NAV` children **3블록 13항목** (커뮤니티 7 · 교육 3 · 이용 안내 3) |
| 함께 변경 | `GlobalHeaderNavItem.children` 타입 제거 · 4개 서비스 navigation.ts 주석 1줄씩 |
| route 제거 | **0** |
| 테스트 수정 | **누락됨** — consumer 조사를 식별자(`GlobalHeaderNavItem`/`PH_PUBLIC_NAV`)로만 해서, 파일을 **raw text 로 읽는** 이 spec 이 검색에 걸리지 않았다 |

**원인 판정: `COMMONIZATION_SIDE_EFFECT` + `TEST_NOT_UPDATED`**
(제거 자체는 `INTENTIONAL_REMOVAL` 이며 dead config 정리로 타당하다.)

> **재발 방지 관점**: raw-text spec 은 식별자 grep 에 걸리지 않는다. 공통 계약 제거 시
> `git grep` 대상에 **경로 문자열·href 리터럴**도 포함해야 한다.

---

## 7. 회귀 범위 (§11)

### PharmacyHub

| 항목 | 결과 |
|---|---|
| forum 기본 진입 `/forum` | Footer · CommunityHome 카드 — 유지 |
| forum 목록 · 상세 | 무변경 |
| `/forum/request` | infoLinks · MyDashboard — 유지 |
| `/forum/my-dashboard` | infoLinks — 유지 |
| desktop | PrimaryNav 4항목(홈/커뮤니티/교육/이용 안내) — 변화 없음 |
| mobile | drawer 동일 4항목, 아코디언 없음 — 변화 없음 |
| **비로그인 도달성** | **변화 없음** (children 은 원래 렌더 0) |

### 타 서비스

| 서비스 | children producer | 코드 영향 |
|---|:---:|---|
| KPA Society | 0 | 주석 1줄(문서 경로 대소문자) — 런타임 0 |
| GlycoPharm | 0 | 동일 |
| K-Cosmetics | 0 | 동일 |
| Neture | 0 | 동일 |

**타 서비스 navigation 회귀 0.**
`/forum/request`·`/forum/my-dashboard` 는 KPA·Neture·GlycoPharm·K-Cosmetics 도 각자 route 를 갖고 있으며 **모두 header 가 아니라 ForumHub/ForumHome 화면에서 진입**한다 → PH 는 이번 정리로 **자매 서비스와 오히려 정합**해졌다.

---

## 8. 검증 결과

### 8-1. 테스트 (§12)

| 대상 | 결과 |
|---|---|
| `pharmacy-hub-community-capability-adoption.spec.ts` | **PASS** (24 tests) |
| `pharmacy-hub-lms-learner-adoption.spec.ts` | PASS |
| `pharmacy-hub-content-resource-adoption.spec.ts` | PASS |
| `pharmacy-hub-community-baseline.spec.ts` | PASS |
| `pharmacy-hub-member-model-contract.spec.ts` | PASS |
| `forum-owner-area-commonization.spec.ts` | PASS |
| `community-*` 5 spec | PASS |
| **합계** | **10 suites / 163 tests PASS / 0 FAIL** |

**기존 2 FAIL → 0 FAIL.** 테스트 삭제로 green 을 만들지 않았다(assertion 총수 유지 + 1건 추가).

### 8-2. typecheck / build (§13)

이번 WO 의 **소스 코드 변경이 0** 이므로 로컬 build 를 재실행하지 않았다.
근거: tip `4571c3269` 의 CI Pipeline(= typecheck·lint·test 포함)이 **`success`** 다.

### 8-3. main CI (§13)

| commit | CI Pipeline | CodeQL | Deploy API |
|---|---|---|---|
| `26d0d2ed8` (교정) | **success** | success | success |
| `b91f47196` | **failure** | success | success |
| `4571c3269` (tip) | **success** | success | success |

- `b91f47196` 의 failure 는 **`lms-public-course-service-scope.spec.ts`** — 본 WO 와 **무관한 독립 실패**이며 다음 커밋 `4571c3269` (`fix(test): LMS 정적 가드 대상을 실렌더 경로로 이동`) 에서 해소됐다.
- PharmacyHub navigation assertion failure = **0**.
- **현재 main = green.**

### 8-4. Production 검증 (§14)

**재배포·프로덕션 검증 미수행 — 의도적이다.**
이번 WO 의 변경은 **문서 1건뿐**이고 runtime 변경이 0 이다 (§14 단서: "runtime 변경이 없다면 불필요한 배포를 하지 않는다").
runtime 을 바꾼 `a0f8cc48c` 는 자체 WO 에서 5서비스 build PASS + PH desktop/mobile smoke 를 수행했고, 그 이후 tip 까지 Deploy 가 전부 success 다.

> **검증 한계 (숨기지 않고 기록)**: 로그인 상태의 ForumHub `infoLinks` 실브라우저 실측은
> 이번 세션에서 수행하지 않았다. 정적 근거(§4-3: 조건 분기 없는 배열 · breakpoint 게이팅 없음)와
> `a0f8cc48c` WO 의 smoke 기록으로 대체했다.

---

## 9. 최종 판정표 (§10)

| Route | Runtime | Consumer | Navigation 계약 | 최종 판정 |
|---|---|---|---|---|
| `/forum/request` | `ACTIVE_ROUTE` (App.tsx:359 + `RequestForumPage`) | `POST /forum/category-requests` (`serviceCode=pharmacy-hub`) | header 미노출이 **정상** · 실제 진입 = ForumHub `infoLinks` + MyDashboard `requestFormHref` | **`CAPABILITY_CONTRACT_CHANGED`** (테스트 측 `STALE_TEST`) |
| `/forum/my-dashboard` | `ACTIVE_ROUTE` (App.tsx:367 + `MyForumDashboardPage`) | `/pharmacy-hub/forum/categories/mine` 외 owner API | header 미노출이 **정상** · 실제 진입 = ForumHub `infoLinks` (1차, 단일) | **`CAPABILITY_CONTRACT_CHANGED`** (테스트 측 `STALE_TEST`) |

- `IMPLEMENTATION_REGRESSION` **아님** — 렌더된 적 없는 config 제거이므로 사용자에게 사라진 링크가 없다.
- `ROUTE_RETIRED` **아님** — route·page·API 전부 살아 있다.
- **DEAD_REFERENCE 0** — 두 href 를 가리키는 dangling 참조 없음, 제거된 children 이 유일 route 였던 항목 없음.
- **UNKNOWN 0.**

---

## 10. 완료 기준 대조 (§17)

| 기준 | 결과 |
|---|:---:|
| 두 route 판정 완료 | ✅ (독립 판정) |
| 실제 capability 와 navigation 정합 | ✅ |
| stale assertion 0 | ✅ |
| 필요한 navigation link 누락 0 | ✅ (10/10 도달) |
| DEAD_REFERENCE 0 | ✅ |
| UNKNOWN 0 | ✅ |
| PH Community 관련 테스트 PASS | ✅ 163/163 |
| main CI green | ✅ tip `4571c3269` |
| runtime 변경 시 production 정상 | 해당 없음 (runtime 변경 0) |

---

## 11. 후속 후보 (본 WO 범위 밖 — 실행하지 않음)

1. `§14` 도달성 테스트를 `PH_FOOTER_SECTIONS` 블록으로 좁혀 header/footer 를 구분한다 (§5 약점).
2. raw-text spec 목록을 정리해 공통 계약 제거 시 **href 리터럴 grep** 을 절차에 넣는다 (§6 재발 방지).
3. CI concurrency 로 원인 commit 의 run 이 `cancelled` 되어 실패 귀속이 3커밋 밀리는 문제 — 실패 귀속 규칙 문서화.
4. PH header 에 `/forum` parent 승격이 제품적으로 필요한지 UX 판단 (현재는 `/community` 경유 3홉).
5. 자매 4서비스도 forum 진입이 header 에 없다 — cross-service 공통 IA 로 확정할지 판단.

---

## 12. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건
```

기준 문서(`docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md`)는 `a0f8cc48c` 에서 `GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVED` 로 이미 갱신돼 현재 코드와 일치한다 — drift 없음.
