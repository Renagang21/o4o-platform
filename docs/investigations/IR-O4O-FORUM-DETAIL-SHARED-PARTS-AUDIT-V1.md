# IR-O4O-FORUM-DETAIL-SHARED-PARTS-AUDIT-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 4서비스 사용자-facing forum detail page의 공통화 가능 영역과 서비스 고유 영역을 분리하고, 다음 WO 범위를 확정한다. 바로 `ForumDetailTemplate`을 만들지 않고 shared parts 단위로 조사한다.
> **작성일:** 2026-06-13 · 기준 HEAD `d1d1d8405`
> **선행:** forum Hub/Request/List/Write(create·edit) 공통화 완료 (`WO-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1` 까지)

---

## 1. 조사 개요

forum 사용자-facing 축에서 Hub·Request·List·Write(create/edit)가 공통화되었고, 남은 큰 축이 **detail page**다. detail은 comment CRUD·appreciation·edit/delete·closed-forum·contactSection·error shape 등 서비스 차이가 커서, 전면 template 전에 **shared parts 단위**로 경계를 조사한다. 본 IR은 read-only.

**핵심 결론(요약):**
- **4서비스 모두 detail이 이미 구현됨.** 공통화 = "3~4개 자체 구현을 공통 presentational로 수렴"이지 신규 도입이 아니다.
- **이미 공통화된 1건:** **AppreciationPanel**(`@o4o/shared-space-ui`)을 4서비스 모두 사용(테마만 상이: KPA blue / GP emerald / KCos pink / Neture는 contact 중심). → detail은 이미 공통 부품 1개를 가짐.
- **두 부류로 갈린다:**
  - **KPA·Neture = 풀 인터랙션 detail** (comment 작성·like·edit/delete·ownership 가드).
  - **GP·KCos = read-only detail** (comment **list만**, 작성/like/edit/delete API 자체가 없음 — 의도된 최소 구현).
- **가장 안전한 1차 공통화 = "presentational primitives"** (content 렌더·header·error/loading/not-found) — 4서비스 공통 + API/정책 분기 없음. **comment 작성·action·contactSection·closed-forum은 제외**(API contract·정책·서비스 고유 차이).
- **권장 1차 WO = `ForumPostContent` + `ForumPostHeader` + `ForumDetail{Loading,Error,NotFound}State` shared parts 추출** (list-primitives-first가 통했던 패턴 반복). 전면 `ForumDetailTemplate`·comment 공통화는 보류.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `d1d1d840533edd600b8fff7f30efa52ffdb5b5e2` |
| `git status --short` | (clean) |
| origin/main ahead/behind | `0 / 0` |
| 다른 세션 WIP | 없음(현재 워킹트리 clean) |
| 조사 기준 commit | **`d1d1d8405`** |

> 본 IR은 read-only. 코드/문서 무수정, 본 IR 1개 문서만 신규 생성.

---

## 3. 조사 대상 파일

| 서비스 | detail page | forum API client |
|--------|-------------|------------------|
| KPA | `services/web-kpa-society/src/pages/forum/ForumDetailPage.tsx` | `src/api/forum.ts` |
| Neture | `services/web-neture/src/pages/forum/ForumPostPage.tsx` | `src/services/forumApi.ts` |
| GlycoPharm | `services/web-glycopharm/src/pages/forum/ForumPostDetailPage.tsx` | `src/services/forumApi.ts` |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/forum/PostDetailPage.tsx` | `src/services/forumApi.ts` |
| 공통(이미) | `AppreciationPanel` @ `@o4o/shared-space-ui` · `ContentRenderer` @ `@o4o/content-editor` · `blocksToHtml` @ `@o4o/forum-core/utils` | — |

---

## 4. detail route / key 매트릭스

| 항목 | KPA | Neture | GlycoPharm | K-Cosmetics |
|------|-----|--------|-----------|-------------|
| detail route | `/forum/post/:id` | `/forum/post/:slug` (+ supplier/partner/workspace basePath) | `/forum/posts/:id` | `/forum/post/:postId` |
| key | **id** | **slug** | id | id |
| basePath | 없음 | **있음**(`/forum` 기본, supplier/partner 변형) | 없음 | 없음 |
| edit CTA | `/forum/edit/:id` | `${basePath}/write?edit=${id}` | **없음** | **없음** |
| back | `/forum` | `/forum`(or basePath) | `/forum/posts` | `/forum` |
| delete 후 redirect | `/forum` | `navigate(basePath)` | **없음** | **없음** |

> **G 분류(route/basePath):** key가 id(3) vs slug(1), Neture만 basePath 변형. detail 공통 부품은 **데이터·콜백 주입**으로 흡수하고, 진입/이동 route는 wrapper가 결정(`routeTo`/config). 부품이 route를 직접 알 필요 없음.

---

## 5. API / client contract 비교

| API | KPA | Neture | GlycoPharm | K-Cosmetics |
|-----|-----|--------|-----------|-------------|
| get detail | `getPost(id)` | `fetchForumPostBySlug(slug)` | `fetchForumPost(id)` | `fetchForumPostById(postId)` |
| comment **list** | `getComments` | `fetchForumComments` | `fetchPostComments` | `fetchForumComments` |
| comment **create** | ✅ `createComment` | ✅ `createForumComment` | ❌ | ❌ |
| comment **update** | ❌ | ✅ `updateForumComment`(PATCH) | ❌ | ❌ |
| comment **delete** | ✅ `deleteComment` | ✅ `deleteForumComment` | ❌ | ❌ |
| like | ✅ `likePost` | ✅ `toggleForumPostLike` | ❌ | ❌ |
| delete post | ✅ `deletePost` | ✅ `deleteForumPost` | ❌ | ❌ |
| update post | ✅(write page) | ✅(write page) | ❌ | ❌ |

> **E 분류(API contract 차이로 보류):** comment **작성/수정/삭제·like·delete**는 KPA·Neture만 존재, GP·KCos는 **API 자체가 없음**. comment **list 렌더**는 4서비스 공통(presentational 가능). 따라서 comment **section은 "list 표시"만 공통화 후보**, **작성/CRUD는 보류(E)**. endpoint는 모두 `/forum/*` 동일 패턴이나 함수·response shape 어댑터 차이 존재.

---

## 6. 렌더 영역 매트릭스

| 영역 | KPA | Neture | GP | KCos | 공통화 분류 |
|------|:--:|:--:|:--:|:--:|:--:|
| title | ✅ | ✅ | ✅ | ✅ | **A** |
| author name | ✅ | ✅ | ✅ | ✅ | **A** (파생식 상이→어댑터 B) |
| createdAt | ✅ | ✅ | ✅ | ✅ | **A** |
| content body | ✅ | ✅ | ✅ | ✅ | **A/B** (§9) |
| comment **list** | ✅ | ✅ | ✅ | ✅ | **A**(표시) |
| back button | ✅ | ✅ | ✅ | ✅ | **A** |
| **AppreciationPanel** | ✅ | (contact) | ✅ | ✅ | **이미 공통** |
| commentCount | ✅ | ✅ | ✅(별도) | ✅ | A/B |
| viewCount | ✅ | ❌ | ✅ | ❌ | C(옵션) |
| likeCount | ✅ | ✅ | ✅(>0) | ❌ | C(옵션) |
| pinned/notice badge | ✅ | ✅ | ❌ | ❌ | C(슬롯) |
| type/postType badge | ❌(category) | ✅ | ❌ | ❌ | C(슬롯) |
| tags | ✅ | ❌ | ❌ | ❌ | D(KPA 고유) |
| contactSection | ❌ | ✅ | ❌ | ❌ | C 슬롯 / D |
| comment **write form** | ✅ | ✅ | ❌ | ❌ | **E** |
| like button | ✅ | ✅ | ❌ | ❌ | **E** |
| edit/delete CTA | ✅ | ✅ | ❌ | ❌ | **F**(정책) |
| closed-forum blocker | ✅ | ❌ | ❌ | ❌ | D(KPA 고유) |

---

## 7. comment section 비교

- **공통(표시):** 4서비스 모두 comment **list**(작성자·날짜·본문)를 렌더 — presentational `ForumCommentList` 후보.
- **분기(작성/CRUD):**
  - KPA: create + delete (update 없음).
  - Neture: **full CRUD**(create/update/delete, `CommentItem` 서브컴포넌트에 inline edit).
  - GP·KCos: **read-only**(작성/수정/삭제 API·폼 없음).
- **판단:** comment **write/CRUD 공통화는 E(보류)**. GP·KCos에 comment 작성을 부여하는 것은 **F(정책 결정)**. 1차에서는 comment **list 표시만** 공통 후보로 두되, 작성 폼/액션은 각 서비스 보존.

---

## 8. post action / edit / delete 비교

- KPA: `isAuthor = user.id === post.authorId || isAdmin(platform roles)` → edit(`/forum/edit/:id`)·delete 노출.
- Neture: `isAdmin('neture:admin'|'platform:super_admin') || authorId===currentUserId` → edit(`?edit=`)·delete(데스크톱 버튼 + 모바일 ⋮ 메뉴).
- GP·KCos: **edit/delete 없음**(read-only, ownership 가드 없음).
- **판단:** ownership 가드 로직(KPA·Neture)이 **거의 동일** → 공통 helper/hook 후보(B). 단 **actions UI 자체는 GP·KCos 부재**라 공통 부품에서는 **슬롯/옵션(C)**, GP·KCos에 강제 금지(F 정책).

---

## 9. content renderer 비교

| 서비스 | 변환 메커니즘 | 최종 렌더 |
|--------|--------------|----------|
| KPA | `blocksToHtml(@o4o/forum-core)` (Block[]) / string passthrough | `<ContentRenderer html>` |
| Neture | 커스텀 `contentToHtml()`(blocksToHtml + legacy escape + string) | `<ContentRenderer html>` |
| GP | `extractTextContent()` + `post.body` | `<ContentRenderer html>` |
| KCos | **로컬** `blocksToHtmlInline()`(p/heading/quote만) | `<ContentRenderer html>` |

- **공통점:** **4서비스 모두 최종 렌더는 `ContentRenderer`(@o4o/content-editor)** — 렌더 컴포넌트는 이미 공통.
- **차이:** "post.content(Block[]/string) → html" **변환 단계만 4종**으로 분기(KPA/Neture는 forum-core blocksToHtml, GP는 extractText, KCos는 자체 inline 변환).
- **판단:** **A/B 최우선 공통화 대상.** 단일 `forumContentToHtml(content)` util(@o4o/forum-core 또는 shared-space-ui)로 4종 변환을 수렴 + 얇은 `ForumPostContent` 부품(변환 + ContentRenderer). KCos `blocksToHtmlInline`는 옵션으로 흡수. **가장 가치 높고 위험 낮은 1순위.**

---

## 10. 서비스 고유 기능 분리

| 기능 | 소유 | 분류 |
|------|------|:--:|
| AppreciationPanel | 4서비스(이미 shared) | 공통(완료) |
| ClosedForumAccessBlocker(403 CLOSED_FORUM 게이트) | **KPA 고유** | D |
| tags 렌더 | **KPA 고유** | D |
| pin/notice 액션 | KPA(+Neture badge) | C/D |
| contactSection(카카오 링크) | **Neture 고유** | C 슬롯 / D |
| basePath(supplier/partner/workspace) | **Neture 고유** | G |
| postType badge(normalizePostType) | Neture | C 슬롯 |
| full comment CRUD(inline edit) | Neture | E |
| AI 과제 채점·YouTube | GP(LMS 측, forum detail 무관) | — |
| read-only 최소 detail | GP·KCos | F(정책) |

---

## 11. 공통화 가능 단위 후보 (전면 template 전)

| 후보 부품 | 내용 | 분류 | 1차 포함 |
|-----------|------|:--:|:--:|
| **ForumPostContent** | content(Block[]/string)→html 변환 + ContentRenderer | **A/B** | ✅ |
| **ForumDetailLoadingState** | 로딩 표시(스피너/스켈레톤 통일) | **A** | ✅ |
| **ForumDetailErrorState / NotFound** | 공통 not-found 카피("게시글을 찾을 수 없습니다") + back | **A** | ✅ |
| **ForumPostHeader** | title + author + createdAt + (옵션)badge/meta | **A**(+C 슬롯) | ✅(코어) |
| ForumPostMeta | view/like/comment count(present subset 상이) | B/C | △ |
| ForumPostActions | edit/delete(ownership) | C/F | ❌(보류) |
| ForumCommentList | comment 표시 | A | △(2차) |
| ForumCommentForm/CRUD | 작성·수정·삭제 | **E** | ❌ |
| ForumDetailLayout(전면 template) | 전체 조립 | H | ❌(보류) |
| contactSection slot | Neture | C/D | ❌(보존) |
| ClosedForumBlocker | KPA | D | ❌(보존) |

> appreciation은 이미 공통이므로 1차 대상 아님.

---

## 12. 권장 1차 WO

### 권장: **전면 template 아님 — presentational primitives부터** (list-primitives-first 패턴 반복)

**`WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1`**
- **추출 대상(순수 presentational, 데이터·콜백 주입):**
  - **ForumPostContent** — `forumContentToHtml()` util 수렴 + ContentRenderer(가장 높은 가치, §9).
  - **ForumDetailLoadingState / ErrorState / NotFound** — 공통 카피·shape.
  - **ForumPostHeader** — title/author/createdAt 코어 + badge/meta는 옵션 슬롯.
- **위치:** 기존 forum 공통 패키지 규약 따라 `@o4o/shared-space-ui`(또는 forum 전용 부품 디렉터리). client/API **직접 import 금지** — wrapper가 데이터 주입.
- **적용 순서:** KPA(reference) → Neture → GP → KCos. 각 서비스는 자기 데이터/route를 주입.
- **제외(1차 미포함):** comment 작성/CRUD(E), like/edit/delete actions(F·정책), contactSection(Neture 슬롯), closed-forum(KPA), 전면 ForumDetailTemplate(H).
- **근거:** 4서비스 공통 + API/정책 분기 없는 영역만 먼저 닫아 회귀 위험 최소화. content 변환 수렴은 단독으로도 4서비스 일관성 가치가 큼.

### 비권장(1차)
- **전면 `ForumDetailTemplate`:** comment CRUD(E)·actions(F)·contactSection·closed-forum 등 분기를 한 번에 흡수 → 슬롯 폭발·회귀 위험. shared parts 안정화 후 2차.
- **comment 공통화:** GP·KCos API 부재(E) + 작성 권한 정책(F) 선결 필요.

---

## 13. 후속 WO 후보

| 우선 | WO 후보 | 분류 | 내용 |
|:---:|--------|:--:|------|
| **1** | `WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1` | A/B | ForumPostContent(+util)·Header·Loading/Error/NotFound 추출 + 4서비스 적용 |
| 2 | `WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1` | A | comment **표시** 부품(ForumCommentList) 공통화(작성/CRUD 제외) |
| 3 | `IR-O4O-FORUM-COMMENT-CRUD-CONTRACT-V1` | E/F | KPA·Neture comment CRUD 계약 + GP·KCos 작성 부여 정책 결정 |
| 4 | `WO-O4O-FORUM-DETAIL-ACTIONS-OWNERSHIP-HELPER-V1` | C/F | edit/delete ownership 가드 helper 공통화(KPA·Neture, 슬롯) |
| 5 | `WO-O4O-FORUM-DETAIL-TEMPLATE-V1` | H | shared parts 안정화 후 전면 layout template |
| 6 | (보존 확인) Neture contactSection·KPA closed-forum slot 처리 방식 결정 | C/D | — |

---

## 14. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| detail page가 사용자에게 포럼 글 상세로 명확한가 | **YES.** 4서비스 모두 title/author/content/comment 렌더, not-found 카피 일관 |
| service-specific 기능을 공통화로 훼손하지 않는가 | **충족(권장안).** 1차는 순수 presentational만 — comment CRUD·contact·closed-forum·actions는 보존 |
| KPA 고유 기능을 다른 서비스에 강제하지 않는가 | **충족.** ClosedForumBlocker·tags·appreciation은 D/슬롯 — GP·KCos 강제 없음 |
| Neture supplier/partner/user basePath 경계가 유지되는가 | **충족.** route/basePath는 wrapper 결정(G), 부품은 미관여 |
| comment/action 권한이 안전한가 | **충족.** 1차에 comment 작성·action 미포함 → 권한 경계 불변. ownership 가드는 후속(4번) |
| closed forum 정보 노출 정책과 충돌하지 않는가 | **충족.** KPA closed-forum blocker 미변경(D 보존) |
| 공통화가 1인 유지보수성을 높이는가 | **YES.** content 변환 4종 → 1 util, loading/error/notfound 통일로 분기 축소 |
| template보다 shared parts부터 가는 것이 안전한가 | **YES.** detail 분기(comment/actions/contact/closed)가 커서 전면 template은 슬롯 폭발 위험. primitives부터가 정합 |

**결론:** detail 축의 안전한 진입은 **전면 template이 아니라 presentational primitives(content·header·error/loading/not-found)**다. comment 작성/CRUD(E)·edit/delete actions(F)·Neture contactSection·KPA closed-forum은 분기가 커 1차에서 제외하고, content 변환 수렴을 최우선으로 닫는다(가치 높고 위험 낮음). appreciation은 이미 공통이므로 detail은 이미 첫 공통 부품을 가지고 있다.

---

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-FORUM-DETAIL-SHARED-PARTS-AUDIT-V1.md`)
- [x] 코드/UI/API/DB/route 변경 없음 (read-only)
- [x] 4서비스 detail route/key 매트릭스 (§4)
- [x] API/client contract 비교 (§5)
- [x] 렌더 영역 매트릭스 (§6)
- [x] comment section 비교 (§7)
- [x] action/edit/delete 비교 (§8)
- [x] content renderer 비교 (§9)
- [x] 서비스 고유 기능 분리 (§10)
- [x] 공통화 가능 shared parts 후보 (§11)
- [x] 권장 1차 WO + 후속 (§12·§13)
- [x] 다른 세션 WIP 없음(§2)

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only). 본 IR 1개 문서만 생성.
- **생성 IR 경로:** `docs/investigations/IR-O4O-FORUM-DETAIL-SHARED-PARTS-AUDIT-V1.md`
- **조사 기준 commit:** `d1d1d8405`
- **detail route 매트릭스:** KPA `/forum/post/:id` · Neture `/forum/post/:slug`(+basePath) · GP `/forum/posts/:id` · KCos `/forum/post/:postId`
- **렌더 영역 비교:** 공통 = title·author·createdAt·content·comment list·back·**AppreciationPanel(이미 공통)**. 분기 = like/edit/delete/comment-write(KPA·Neture만), badge/tags/contact(서비스별)
- **comment 비교:** KPA(create+delete)·Neture(full CRUD)·GP·KCos(read-only list) → 작성/CRUD는 E 보류
- **action/edit/delete:** KPA·Neture ownership 가드(거의 동일, helper 후보) / GP·KCos 부재(F 정책)
- **content renderer:** 4종 변환 → 모두 `ContentRenderer` 귀결. 변환 수렴이 1순위(A/B)
- **서비스 고유:** KPA ClosedForumBlocker·tags / Neture contactSection·basePath·slug·postType badge
- **공통화 shared parts 후보:** ForumPostContent(+util)·ForumPostHeader·ForumDetail{Loading,Error,NotFound}State (1차) → ForumCommentList(2차) → actions/template(후속)
- **권장 1차 WO:** `WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1`(전면 template 아님)
- **git status:** clean(내 변경 0, 다른 세션 WIP 없음)

---

*End of IR-O4O-FORUM-DETAIL-SHARED-PARTS-AUDIT-V1*
