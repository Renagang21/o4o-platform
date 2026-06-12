# IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1

> **유형:** Read-only 설계 IR (코드/UI/API/DB/route/menu 무변경)
> **목적:** 4서비스 사용자-facing forum page(hub/list/detail/write/request) 공통화의 **범위·단위·순서**를 확정하여 1차 WO 기준선을 만든다. 공통 추출 범위와 서비스 고유 유지 범위를 분리한다.
> **상위:** `IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1`(§9 page JSX 포크가 최대 잔여 편차) · forum 보안/정합 축 완료
> **작성일:** 2026-06-12

---

## 1. 조사 개요

forum 축의 backend 보안·정합 선행(PII / edit-delete / closed bypass / 신청 API dedup / serviceKey / category=forum,tag boundary / label cleanup / tag input parity / search visibility)이 모두 완료되었다. 남은 핵심은 **page-level UI 공통화**다. 본 IR 은 코드를 고치지 않고, 어느 화면을 어떤 단위로 공통화할지와 KPA 고유/서비스 subset 경계를 확정한다.

**핵심 결론:**
1. **HUB 는 이미 공통화 완료(A)** — 4서비스 모두 `ForumHubTemplate`(@o4o/shared-space-ui) 사용. 추가 작업 불요.
2. **REQUEST(포럼 개설 신청) 가 1차 공통화 최적** — GP/KCos/Neture 3종이 직전 `WO-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1` 로 ~95% 동일해짐. 최저 위험·최고 readiness.
3. **LIST 는 2차** — pagination/formatDate 가 4서비스 중복(quick win), 단 URL 파라미터·컬럼·필터 편차로 config 추상화 필요.
4. **WRITE 는 3차(선행 정책 필요)** — GP/KCos 가 `postType` select 를 추가(KPA canonical `CATEGORY-FULL-REMOVAL-V2` 와 drift), KCos 는 plain textarea(thin). editor·postType 정합 선결.
5. **DETAIL 은 최후** — 서비스 특이성 최대(error shape·AppreciationPanel 유무·contactSection·comment CRUD·ClosedForumAccessBlocker).

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `7eb12af9f37b63af61b40d45d3c0b3d60bd0ded3` |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | `7eb12af9f` |

**다른 세션 WIP(미접촉):** legal/PolicyPage·legalDocument 작업, CHECK-...-ORDER-VIEW-LOOP M, untracked 다수. 본 IR 은 신규 문서 1건만 생성.

---

## 3. 조사 대상 서비스/파일

| 화면 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| HUB | forum/ForumHomePage | forum/ForumHubPage | forum/ForumHubPage | forum/ForumHubPage |
| LIST | forum/ForumListPage | forum/ForumPage | forum/ForumPage | forum/ForumPage |
| DETAIL | forum/ForumDetailPage | forum/ForumPostDetailPage | forum/PostDetailPage | forum/ForumPostPage |
| WRITE | forum/ForumWritePage | forum/ForumWritePage | forum/ForumWritePage | forum/ForumWritePage |
| REQUEST | mypage/RequestCategoryPage | forum/RequestCategoryPage | forum/RequestCategoryPage | supplier/RequestCategoryPage |
| (KPA 고유) | ForumFeedPage(/forum/:slug), components/forum/* | — | — | (supplier/partner 변형) |

---

## 4. 현재 공통 컴포넌트 사용 현황

| 공통 자산 | 사용 화면 | 비고 |
|-----------|----------|------|
| `@o4o/shared-space-ui` **ForumHubTemplate** | HUB(4서비스) | hub 공통화 핵심 |
| `@o4o/shared-space-ui` **AppreciationPanel** | DETAIL(KPA·GP·KCos) | **Neture 미사용**(편차) |
| `@o4o/content-editor` **ContentRenderer** | DETAIL(4서비스) | 본문 렌더 공통 |
| `@o4o/forum-core/utils` **blocksToHtml** | DETAIL(KPA·Neture) | GP/KCos 는 local 변환 |
| `@o4o/ui` PageSection/PageContainer | LIST/DETAIL(4서비스) | 레이아웃 래퍼 공통 |
| `@o4o/ui` **BaseTable/ActionBar** | LIST(**KPA 단독**) | 타 서비스는 table JSX 포크 |
| `@o4o/content-editor` **RichTextEditor** | WRITE(KPA·GP·Neture) | **KCos 는 textarea**(thin) |

---

## 5. Forum Hub 공통화 상태 → **A(완료)**

- 4서비스 모두 `ForumHubTemplate` config 주입. KPA=full(custom renderCategory/Activity/Search/WritePrompt + headerAction), GP/KCos=default(fetchCategories/fetchRecentPosts 어댑터 + infoLinks), **Neture=basePath-aware**(`/forum` vs `/supplier/forum` vs `/partner/forum` 재사용 — best practice).
- → **공통화 대상 아님(이미 완료).** 다른 화면 공통화의 **참조 패턴**(config 주입 + 서비스 어댑터).

## 6. Forum List page 비교

| 항목 | KPA | GP | KCos | Neture |
|------|-----|----|----|--------|
| 공통 import | @o4o/ui **BaseTable/ActionBar** | PageSection/Container | 〃 | 〃(+inline styles) |
| 레이아웃 | Table+Card(BaseTable) | table JSX | table JSX + type pills | table JSX(inline) + category select |
| URL 파라미터 | q·tag·forum·page | q·sort·page | q·type·sort·page | q·category·type·sort·page |
| tag 표시 | ✅(inline + popular bar) | ❌ | ❌ | ❌ |
| pagination | 5-visible prev/next/first/last | 동일 | 동일 | 동일 |
| empty/loading/error | ✅ | ✅ | ✅ | ✅ |
| 포크 수준 | **A**(BaseTable) | B(포크) | B(포크) | B(포크 inline) |

- **중복 핫스팟:** pagination JSX(4서비스 거의 동일), `formatDate`(3서비스 재정의), loading skeleton, URL param reset 로직.
- **편차:** KPA tag/forum 필터·BaseTable bulk action(link/AI-copy/delete) = KPA 고유(G). 데이터 shape: KPA `ForumPost` vs GP/KCos/Neture `DisplayPost`(정규화 어댑터) — F(client shape 불일치).

## 7. Forum Detail page 비교

| 항목 | KPA | GP | KCos | Neture |
|------|-----|----|----|--------|
| 본문 렌더 | ContentRenderer+blocksToHtml | ContentRenderer | local blocksToHtmlInline | blocksToHtml+ContentRenderer |
| 댓글 | 목록(편집/삭제 없음) | 목록 | 목록 | **풀 CRUD**(CommentItem 인라인 편집/삭제) |
| like/appreciation | Like + AppreciationPanel(blue) | AppreciationPanel(emerald) | AppreciationPanel(pink) | Like만(**AppreciationPanel 없음**) |
| closed 접근 | **ClosedForumAccessBlocker** | ❌ | ❌ | ❌ |
| 작성자 연락 | ❌ | ❌ | ❌ | **contactSection**(Kakao) |
| error 처리 | err.message(Promise) | err.response.data.error | 〃 | generic |
| 포크 수준 | B | B | B | B(최대 특이) |

- **서비스 특이성 최대** → 공통화 최후. error shape 정규화(F)·AppreciationPanel 유무·comment CRUD·contactSection·ClosedForumAccessBlocker 가 모두 서비스별 분기.

## 8. Forum Write/Edit page 비교

| 항목 | KPA(canonical) | GP | KCos | Neture |
|------|-----|----|----|--------|
| editor | RichTextEditor | RichTextEditor | **plain textarea** | RichTextEditor |
| postType | ❌(제거됨) | **select 추가** | **select 추가** | ❌ |
| tags | ❌ | ❌ | ❌ | ❌ |
| edit mode | `/forum/edit/:id` | ❌ | ❌ | `?edit=<id>` |
| 특이 | showStoreSave(role) | — | — | contactSection + min-length |
| 포크 수준 | B(기준) | C(postType drift) | C(thin) | B(확장) |

- **선행 정책 필요(J):** GP/KCos 의 `postType` select 는 KPA canonical(`WO-O4O-FORUM-CATEGORY-FULL-REMOVAL-V2`)과 **drift** — postType 이 유효 필드인지/제거 대상인지 결정 전에는 write 공통화 불가. editor 통일(textarea→RichTextEditor)도 KCos 선행.
- edit route 비대칭(KPA route param vs Neture searchParam vs GP/KCos 부재) = route parity(D).

## 9. Forum Request page 비교 → **1차 공통화 최적**

| 항목 | KPA | GP | KCos | Neture |
|------|-----|----|----|--------|
| 위치 | mypage/ | forum/ | forum/ | supplier/ |
| 필드 | name·desc·reason·**forumType**·tags | name·desc·reason·tags | 동일 | 동일 |
| tags(자유입력 1~5) | ✅ | ✅(직전 WO) | ✅ | ✅ |
| forumType(open/closed) | ✅ | ❌ | ❌ | ❌ |
| 성공 redirect | /mypage/my-requests | /forum/my-requests | /forum/my-dashboard | /supplier/my-forum |
| 포크 수준 | B(+forumType) | **거의 동일** | **거의 동일** | **거의 동일** |

- **GP/KCos/Neture 3종은 직전 tag-input parity WO 로 ~95% 동일**(필드·validation·tag UI 동일, 차이는 placeholder·redirect·basePath·테마색뿐). KPA 는 forumType + mypage 위치만 추가.
- → **단일 shared component + props 주입**으로 추출 readiness 최고. props: `serviceCode`, `basePath`, `onSuccessPath`, `showForumType?`, `placeholderExamples`, `themeColor`. KPA 는 `showForumType` 로 opt-in.

## 10. API client/response shape 비교

| 항목 | 현황 | 분류 |
|------|------|:---:|
| 신청 create payload | 4서비스 `{name,description,reason,tags(,forumType)}` + serviceCode — **정렬됨** | A |
| list 데이터 shape | KPA `ForumPost` vs GP/KCos/Neture `DisplayPost`(어댑터 정규화) | F |
| detail error shape | KPA Promise `err.message` vs GP/KCos `err.response.data.error` vs Neture generic | F |
| api client | KPA `authClient`/`apiClient`(/api/v1/kpa) vs GP `apiClient`(/api/v1) vs KCos/Neture `api`(/api/v1) | F(base 상이, 기능 동일) |

- 신청 payload 는 정렬 완료(A) → request 공통화 시 client shape 장애 없음.
- list/detail 는 데이터/에러 shape 불일치(F) → 공통화 전 어댑터/정규화 레이어 필요.

## 11. route parity 확인

| route | KPA | GP | KCos | Neture |
|-------|-----|----|----|--------|
| hub | /forum | forum | forum | /forum |
| list | /forum/**all** | forum/posts | forum/posts | /forum/posts |
| detail | /forum/post/**:id** | forum/posts/**:id** | forum/post/**:postId** | /forum/post/**:slug** |
| write | /forum/write(+/:slug/write) | forum/write | forum/write | /forum/write |
| **edit** | **/forum/edit/:id** | ❌ | ❌ | ?edit= |
| request | /forum/request | forum/request-category | forum/request-category | /supplier/forum/request-category |
| 동적 feed | /forum/:slug (ForumFeedPage) | — | — | board props |

- **불일치(D):** list 경로(`/all` vs `/posts`), detail param(`:id`/`:postId`/`:slug`), edit route 비대칭, request 위치(forum vs supplier). 공통 컴포넌트는 **route 를 props/basePath 로 주입**해 흡수 가능(Neture HubPage 패턴 참조) → route 통일은 필수 아님(공통화 후 자연 정렬).

## 12. KPA 고유 기능과 공통 기능 분리

- **KPA 고유(G — 이식 금지):** ForumFeedPage(`/forum/:slug` 동적 포럼 피드), ForumSearchBar/ForumSearchResults, ClosedForumAccessBlocker, BaseTable bulk action(link/AI-copy/delete), forumType(open/closed) 선택, 분회/quick-links/약사 커뮤니티 성격.
- **공통 기능(I — 추출 후보):** request form(필드+tag), pagination, formatDate, empty/loading/error 상태, ContentRenderer 본문 렌더, AppreciationPanel 연동(테마 주입), hub(완료).
- **subset 유지(H):** GP/KCos/Neture 는 KPA full forum UX 의 subset 으로 충분(분회/검색 특화 불요). closed forum 가입 UI 는 GP/KCos 정책 미정(별도).

## 13. Neture supplier-facing forum 경계

- Neture forum 은 `basePath` 로 `/forum`·`/supplier/forum`·`/partner/forum` 3변형 재사용(ForumPage/ForumPostPage/ForumWritePage props). request 는 supplier 경로(`/supplier/forum/request-category`).
- supplier/partner workspace forum 과 일반 user forum 은 **동일 컴포넌트 + basePath 주입**으로 분리 — 혼합 없음. 공통화 시 basePath prop 패턴 유지(이미 Neture 가 best practice).
- operator forum console 과도 분리 양호(선행 IR 확인).

## 14. mock/TODO/no-op/dead surface 목록

- **KCos WRITE plain textarea** — RichTextEditor 미사용(thin, dead 아님). editor 통일 후보.
- **GP/KCos postType select** — KPA canonical 제거 정책과 drift(dead 아님, 정책 충돌 J).
- **Neture DETAIL AppreciationPanel 부재** — 기능 공백(parity).
- **GP/KCos DETAIL comment 편집/삭제 부재** — Neture 만 풀 CRUD(parity).
- live mock surface(가짜 데이터로 정상처럼 보임): **없음** — 4서비스 정직한 empty/loading/error.
- (forum-core dormant full-text search 는 별도 dead-scaffolding 후보 — 선행 search visibility CHECK §8 기록).

## 15. 공통화 후보 분류표

| 화면/기능 | 분류 | 비고 |
|-----------|:---:|------|
| HUB | **A** | ForumHubTemplate 완료 |
| REQUEST form | **I(→1차 WO)** | GP/KCos/Neture 95% 동일, KPA forumType opt-in |
| pagination/formatDate | **I** | 4서비스 중복 핫스팟(quick win) |
| LIST template | I/F | 데이터 shape(F)·URL param 편차 → config 추상화 |
| ContentRenderer 본문 | A | 이미 공통 |
| AppreciationPanel | B/F | Neture 부재(parity) + error shape 정규화 |
| DETAIL page | B/F | 서비스 특이성 최대, 최후 |
| WRITE page | C/J | postType drift·editor 정합 선결 |
| ForumFeed/SearchBar/ClosedBlocker | **G** | KPA 고유, 이식 금지 |
| supplier/partner forum 변형 | **H** | Neture basePath subset 유지 |
| list/detail error·data shape | **F** | 공통화 전 정규화 필요 |
| edit/list/detail route 불일치 | **D** | basePath/props 로 흡수, 통일 선택적 |

## 16. 1차 WO 권장안

**`WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1`** (최저 위험·최고 readiness)
- 범위: GP/KCos/Neture(+KPA opt-in) 포럼 개설 신청 폼을 **단일 shared component**(예: `@o4o/shared-space-ui` 의 `ForumRequestForm` 또는 forum-shared)로 추출.
- props: `serviceCode`, `basePath`, `onSuccessPath`, `showForumType?`(KPA), `placeholderExamples`, `themeColor`.
- 근거: 직전 tag-input parity 로 3종 95% 동일 · payload 정렬 완료(A) · KPA 고유는 forumType opt-in 으로 흡수 · route 는 props 주입 · 데이터/에러 shape 장애 없음(create 단일).
- 효과: 4중 유지보수 → 1 component + config. 1인 유지보수성 직접 개선.
- 주의: KPA 는 mypage 위치·forumType 유지(showForumType=true). Neture supplier basePath 유지. backend/route/menu 무변경(컴포넌트 추출 + 호출부 교체만).

## 17. 후속 WO 후보

| 순위 | WO | 의존/선행 |
|:---:|----|----------|
| 2 | `WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1` — pagination/formatDate/상태 컴포넌트 추출(quick win) | list 데이터 shape 정규화(F) 선행 권장 |
| 3 | `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` — columns/badges/filters config 기반 list 템플릿 | F(DisplayPost 정규화) + D(URL param) |
| 4(정책) | `IR/WO-O4O-FORUM-WRITE-POSTTYPE-POLICY-V1` — GP/KCos postType vs KPA canonical 정합 + editor 통일(KCos) | write 공통화 선결(J) |
| 5 | `WO-O4O-FORUM-DETAIL-SHARED-PARTS-V1` — AppreciationPanel parity(Neture)·comment CRUD parity·error shape 정규화 후 detail 공통화 | F·parity 선행 |
| (별도) | forum-core dormant search 정리 · GP/KCos closed-forum 가입 UI 정책 | 독립 |

## 18. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| forum 이 사용자 참여 공간으로 작동하는가 | ✅ 4서비스 hub/list/detail/write/request 작동 |
| KPA 고유 성격을 무리하게 강제하지 않는가 | ✅ ForumFeed/SearchBar/ClosedBlocker/forumType 은 G(이식 금지)로 분리 |
| GP/KCos/Neture subset/공통 구분 | ✅ §12 — 공통(I) vs KPA고유(G) vs subset(H) 명확 |
| 사용자 forum 과 operator console 혼합 | ✅ 분리(선행 IR) |
| tag=분류, membership 무혼동 | ✅ request tag=자유입력 분류, forumType/membership 별도 |
| closed 접근권=forum membership | ✅ ClosedForumAccessBlocker(KPA) + search gate 모두 forum 기준 |
| 공통화가 1인 유지보수성 향상 | ✅ request 1차(4→1) 직접 개선, hub 이미 완료 |
| mock/dead 없이 정직한 표현 | ✅ live mock 0, empty/loading/error 정직 |

**종합:** HUB 는 이미 공통화(A). **REQUEST form 이 1차 공통화 최적**(3종 95% 동일, 위험 최저). LIST 는 primitives→template 2단계, WRITE 는 postType 정책 선결(J), DETAIL 은 parity·shape 정규화 후 최후. KPA 고유(ForumFeed/Search/ClosedBlocker/forumType)는 이식 금지(G), Neture supplier/partner 변형은 basePath subset 유지(H). 한 번에 하지 말고 request → list primitives → list template → write(정책 후) → detail 순.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1.md`
- **조사 기준 commit:** `7eb12af9f` (main, origin 동기화)
- **화면별 공통화 상태:** HUB=A(완료, ForumHubTemplate) · REQUEST=I(1차, 95% 동일) · LIST=I/F(중복 핫스팟+shape 편차) · WRITE=C/J(postType drift) · DETAIL=B/F(특이성 최대)
- **API client/response shape:** create payload 정렬(A) / list(DisplayPost vs ForumPost) · detail error shape 불일치(F)
- **route parity:** list(`/all` vs `/posts`)·detail param(`:id`/`:postId`/`:slug`)·edit 비대칭·request 위치 차(D) — props/basePath 로 흡수 가능
- **KPA 고유 분리:** ForumFeed·ForumSearchBar/Results·ClosedForumAccessBlocker·BaseTable bulk·forumType·분회/quick-links(G, 이식 금지)
- **Neture supplier forum 경계:** basePath 주입으로 user/supplier/partner 동일 컴포넌트 재사용(H) — 혼합 없음
- **mock/dead surface:** live mock 0. KCos write textarea·GP/KCos postType drift·Neture AppreciationPanel 부재·GP/KCos comment CRUD 부재 = parity/정책 항목
- **1차 WO 권장:** `WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1`(shared ForumRequestForm + props, KPA forumType opt-in)
- **후속:** list primitives → list template → write postType 정책(J) → detail parts(parity 후)
- **git status:** 사전 상태 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
