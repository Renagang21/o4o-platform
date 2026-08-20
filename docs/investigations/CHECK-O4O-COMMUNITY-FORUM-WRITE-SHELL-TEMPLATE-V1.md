# CHECK-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1

- **WO**: `WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1`
- **일자**: 2026-08-20
- **시작 commit**: `685508ec1`
- **선행 CHECK**: `CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1.md` · `CHECK-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1.md`
- **범위**: 커뮤니티 최종 census 의 마지막 `VIEW_DUPLICATED` blocker — **B8 Forum Write Shell (K-Cosmetics ↔ GlycoPharm 2 cell)**. 커뮤니티 전체 재감사는 하지 않는다.

---

## 1. B8 모집단 재측정 (§2)

현재 `origin/main` 기준 재측정. 과거 329L/322L 수치를 그대로 쓰지 않았다.

| service | route | page/component | lines | create/edit | API client | shared primitive | service-specific difference | 재측정 판정 |
|---|---|---|---:|---|---|---|---|---|
| K-Cosmetics | `/forum/write` · `/forum/edit/:postId` | `src/pages/forum/ForumWritePage.tsx` | 329 | 통합(같은 페이지, `postId` 유무) | `src/services/forumApi` (`createForumPost` · `fetchForumPostById` · `updateForumPost` · `fetchWritableForums`) | `@o4o/shared-space-ui` `ForumWriteForm` · `forumContentToHtml` | 영문 라벨 · 상세 route `/forum/post/:id` · theme `pink` · `fetchForumPostById` · 에러 메시지에 서버 error 노출 | `VIEW_DUPLICATED` |
| GlycoPharm | `/forum/write` · `/forum/edit/:postId` | `src/pages/forum/ForumWritePage.tsx` | 322 | 통합(같은 페이지, `postId` 유무) | `src/services/forumApi` (`createForumPost` · `fetchForumPost` · `updateForumPost` · `fetchWritableForums`) | 동일 | 한글 라벨 · 상세 route `/forum/posts/:id` · theme `emerald` · `fetchForumPost` · create 응답 `data.id` fallback | `VIEW_DUPLICATED` |

미조사: **0**

### 1-1. 대상 아님으로 확인한 인접 화면

| 화면 | 판정 | 근거 |
|---|---|---|
| GlycoPharm `src/pages/business/BusinessForumWritePage.tsx` (87L) | 대상 외 | 일반 포럼 write 가 아닌 **사업 논의 전용 진입/준비 안내 페이지**. 폼·mutation 없음(`WO-O4O-GLYCOPHARM-BUSINESS-DISCUSSION-BOARD-SEPARATION-V1`). B8 2 cell 에 포함되지 않는다. |
| KPA · Neture write 화면 | 대상 외 | 최종 census `ACCEPTED_CORE_ONLY`(상호 유사도 0.20) + 본 WO §17 제외 범위. |

---

## 2. 두 화면의 실제 차이 분해 (§2·§7)

라인 단위로 비교한 결과, **차이는 라벨/route/theme/API 심볼명뿐**이고 화면 골격은 동일했다.

| 축 | K-Cosmetics | GlycoPharm | 처리 |
|---|---|---|---|
| page/container/heading 스타일 | 동일 | 동일 | 공통 셸로 승격 |
| 로그인 게이트 | 동일 구조(영문) | 동일 구조(한글) | 공통 셸 + `labels` |
| edit 초기값 로딩 화면 | `Loading...` | `불러오는 중...` | 공통 셸 + `labels` |
| 작성자 표시명 블록 | 동일 구조 | 동일 구조 | 공통 셸 + `labels` |
| 게시판 selector | 동일(로딩/빈 목록/안내 문구까지 동일 분기) | 동일 | 공통 셸 + `labels` + `selectId` |
| 폼 본문 | `ForumWriteForm` | `ForumWriteForm` | **이미 공통** — 변경 없음 |
| 로컬 `styles` 객체 | 130L | 121L | 공통 셸로 이관 + dead entry 제거 |
| 상세 route | `/forum/post/:id` | `/forum/posts/:id` | wrapper 유지(§11) |
| theme | `pink` | `emerald` | `ForumWriteForm` prop 유지 |

→ 업무 흐름·정보 구조·상태 계약이 동일하므로 §18 중지 조건(업무 상이 · backend 변경 필요 · 조건문 대량 · 에디터 상이)에 해당하지 않는다.

---

## 3. 기존 공통 자산 우선 조사 (§3)

| 자산 | 결과 |
|---|---|
| `@o4o/shared-space-ui` `ForumWriteForm` | **재사용** — 폼 본문(제목·에디터·postType·액션·validation)은 이미 공통. 재구현하지 않았다. |
| `@o4o/shared-space-ui` `forumContentToHtml` | **재사용** — edit 초기값 변환. |
| `@o4o/content-editor` `RichTextEditor` | **재사용** — 두 서비스 모두 동일 editor(`preset: 'compact'`). 에디터 교체·통일은 하지 않았다(§10·§17). |
| `@o4o/shared-space-ui` `ForumDetailStates` | 미사용 — 문서상 **detail 전용 부품**이며 write 셸의 로딩 표기와 look 이 다르다. 시각 변경을 만들지 않기 위해 채택하지 않았다. |
| `ForumListTemplate` · `ForumHubTemplate` · `ForumRequestForm` | 대상 아님(목록/허브/요청). |

→ **신규 패키지 생성 없음.** 기존 `@o4o/shared-space-ui` 에 파일 1개만 추가했다.

---

## 4. 신규 공통 셸 (§4·§5)

`packages/shared-space-ui/src/ForumWritePageShell.tsx` (233L) — presentational only.

```
mode: 'create' | 'edit'
isAuthenticated · isLoading · authorName
showForumSelect · forums · forumId · forumsLoading · onForumChange · selectId
labels (11개 문구, 한글 기본값)
children  ← 폼 본문(ForumWriteForm)
```

금지 항목 준수(정적 테스트로 고정):

- `fetch` / `axios` / 서비스 API import **없음**
- `react-router` 의존 **없음** (cancel/navigation 은 전부 wrapper callback)
- `serviceKey` 분기 · `if (service === ...)` · `switch(serviceType)` **없음**

`index.ts` 에 `ForumWritePageShell` + `ForumWritePageShellProps` / `ForumWritePageShellLabels` / `ForumWritePageShellForumOption` export 추가(추가만, 기존 export 무변경).

---

## 5. create / edit 계약 (§6)

두 서비스 모두 이미 **같은 페이지의 create/edit 통합 구조**였다. 셸은 그 계약을 그대로 받는다.

| 항목 | 처리 |
|---|---|
| `mode` | heading 선택 + 게시판 selector 기본 노출 여부만 결정 |
| 게시판 selector | 기본 `create` 에서만 노출 (기존 두 서비스 동작과 동일). `showForumSelect` 로 override 가능 |
| 초기값 | wrapper 가 `initialTitle` / `initialContentHtml` 로 `ForumWriteForm` 에 주입(기존과 동일) |
| 편집 상태 소유 | `ForumWriteForm` (변경 없음) |
| submit/cancel | wrapper callback (`handleCreate` / `handleUpdate` / `navigate(-1)`) |

---

## 6. selector · validation · editor (§8·§9·§10)

- **selector**: source API 는 두 서비스 각각의 `fetchWritableForums()`(`{FORUM_BASE}/categories?limit=100`, service scope 유지). option shape `{id,name,slug}` 동일. 기본 선택 = 첫 항목, edit 시 미노출 — 기존 동작 유지. **공통 셸은 전달받은 option 을 렌더만 한다.**
- **validation**: 두 서비스 규칙 동일(title 필수 · content 필수 · forum 미선택 시 create 차단). title/content 는 기존대로 `ForumWriteForm` 의 `onInvalid` 로 wrapper 가 toast 문구를 결정하고, forum 미선택은 wrapper `handleCreate` 가 판정한다. **공통 셸에 서비스 정책을 새로 넣지 않았다.**
- **editor**: 두 서비스 모두 `RichTextEditor` + `preset: 'compact'` 로 동일 → 별도 `editorSlot` 없이 기존 공통 폼 그대로 사용.

### 6-1. 관측 사항 (수정하지 않음)

`ForumWriteForm` 의 제목/내용 `<label>` 에 `htmlFor` 연결이 없다(기존 코드부터). 접근성 개선 후보이나 본 WO 는 셸 승격 범위이므로 손대지 않았다. 셸이 새로 만든 게시판 `<label htmlFor>` 는 연결되어 있다.

---

## 7. adoption 결과 · 중복 제거 수치 (§12·§13)

| 파일 | 전 | 후 | 차이 |
|---|---:|---:|---:|
| K-Cosmetics `pages/forum/ForumWritePage.tsx` | 329 | 170 | −159 |
| GlycoPharm `pages/forum/ForumWritePage.tsx` | 322 | 166 | −156 |
| **wrapper 합계** | **651** | **336** | **−315** |
| 신규 shared `ForumWritePageShell.tsx` | — | 233 | +233 |
| **제품 코드 합계** | **651** | **569** | **−82** |

- **제거한 duplicated lines: 315** (2벌로 복제돼 있던 셸 ≈156L × 2 → 공통 1벌 233L 로 수렴, dead style entry 제거분 포함)
- 남은 duplicated block: **0** — wrapper 는 data 로딩 · mutation · navigation · 라벨 config 만 소유하고 반복 JSX 가 없다.
- **dead local code 제거**(§13): 두 파일의 로컬 `styles` 중 소비처 0 이던 `form` · `input` · `textarea` · `actions` · `cancelBtn` · `submitBtn` 항목(폼 본문이 `ForumWriteForm` 으로 옮겨간 뒤 남아 있던 잔재)과 `CSSProperties` import 제거. Forum write 밖 코드는 건드리지 않았다.

---

## 8. 권한 · 서비스 경계 보존 (§11)

- backend 변경 **0** · route 변경 **0** · guard 변경 **0** · DB migration **없음**.
- 각 서비스의 `forumApi` (`FORUM_BASE` service scope), `fetchWritableForums` 결과, create/update payload, 403(본인 글만 수정) 처리 모두 wrapper 에 그대로 남았다. generic unscoped API 로의 회귀 없음.
- K-Cosmetics `/forum/write`·`/forum/edit/:postId` 의 `ProtectedRoute` 래핑도 그대로다.
- 공통 셸의 `isAuthenticated` 는 wrapper 가 넘긴 값을 렌더 분기에만 쓰며, 권한을 새로 해석하지 않는다.

---

## 9. 테스트 (§14)

`packages/shared-space-ui/vitest.config.mjs` 신설 — 루트에 이미 설치된 vitest/jsdom/@testing-library 재사용, **package.json · lockfile 무변경** (`packages/ui` · `packages/operator-core-ui` 와 동일 방식).

실행: `npx vitest run --config packages/shared-space-ui/vitest.config.mjs` → **3 files / 27 tests PASS**

| 파일 | 수 | 내용 |
|---|---:|---|
| `__tests__/ForumWritePageShell.test.tsx` | 12 | create/edit heading · selector 노출 규칙 · 로딩 · 비로그인 게이트 · 작성자 블록 유무 · option 렌더/변경 callback · 로딩 중 비활성 · 빈 목록 안내 · labels config 전면 대체 · `showForumSelect` override · `selectId` |
| `__tests__/ForumWriteComposition.test.tsx` | 6 | 셸+폼 결합: create submit payload · edit 초기값 채움 · title/content validation · submitting 중 버튼 비활성/라벨 · cancel callback |
| `__tests__/forum-write-shell-adoption.test.ts` | 9 | KCos/GP wrapper 의 공통 셸 소비 · 로컬 중복 셸 부재(`const styles`/`CSSProperties`/`<select`/`loginPrompt`) · 서비스 API·forum context·selectId 유지 · 상세 route 분리 유지 · 셸 service-neutral · index export |

**Forum boundary 회귀(§15)**: `apps/api-server` jest — `community-forum-interaction-and-write-boundary-commonization` · `community-forum-orphan-write-guard` · `glycopharm-forum-service-boundary` · `community-forum-content-server-normalization` → **4 suites / 52 tests PASS**.

---

## 10. 정적 검증 (§15)

| 대상 | 결과 |
|---|---|
| `@o4o/shared-space-ui` typecheck | PASS |
| `@o4o/web-k-cosmetics` build (`tsc && vite build`) | PASS (14.92s) |
| `glycopharm-web` build (`tsc -b && vite build`) | PASS (15.17s) |
| 전이 소비처 typecheck — `@o4o/web-kpa-society` · `@o4o/web-neture` · `pharmacy-hub-web` · `@o4o/operator-core-ui` | PASS |
| api-server 전체 build | 미수행 — backend 변경 0 (§15 허용) |

### 10-1. 검증 중 처리한 부수 사항 2건

1. **로컬 `@o4o/account-ui` dist 가 stale** 해 KCos build 가 `resolveNotificationTarget` 등 미export 오류로 실패했다. 소스에는 존재하며 `pnpm --filter @o4o/account-ui build` 후 정상. 코드 변경 아님(로컬 산출물 재생성).
2. **`@o4o/operator-core-ui` 패키지 typecheck 실패 1건** — 직전 WO 에서 작성한 테스트의 `vi.fn(() => new Promise(() => {}))` 가 `ContentHubClient['list']` 로 좁혀지지 않았다. `new Promise<never>` 로 1줄 교정(테스트 33개 재실행 PASS). 제품 코드 무변경.

---

## 11. 최종 판정

| # | 영역 | service | route | 이전 | 최종 |
|---|---|---|---|---|---|
| 1 | B8 | K-Cosmetics | `/forum/write` · `/forum/edit/:postId` | `VIEW_DUPLICATED` | **`FULLY_COMMON`** |
| 2 | B8 | GlycoPharm | `/forum/write` · `/forum/edit/:postId` | `VIEW_DUPLICATED` | **`FULLY_COMMON`** |

```
조사 대상 cell: 2
FULLY_COMMON: 2
CORE_ONLY: 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 0
NOT_IMPLEMENTED: 0
OUT_OF_SCOPE: 0
미조사: 0

B8 VIEW_DUPLICATED 잔존: 0
전체 COMMUNITY MUST_FIX_BEFORE_CLOSE 예상 잔존: 0
```

선행 census 의 `MUST_FIX_BEFORE_CLOSE` 3건(① B8 ② B21 ③ C7) 중 ②③ 은 `CHECK-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1` 에서, ① 은 본 CHECK 에서 해소됐다. 다음 작업은 신규 공통화 구현이 아니라 **커뮤니티 최종 closure 재감사**다.

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
