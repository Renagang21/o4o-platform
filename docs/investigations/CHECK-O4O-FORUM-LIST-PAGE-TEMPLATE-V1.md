# CHECK-O4O-FORUM-LIST-PAGE-TEMPLATE-V1

> **작업명:** WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1
> **유형:** forum list page 공통화 — shared `ForumListTemplate` 생성 + GP/KCos/Neture 적용
> **결과: PASS — `ForumListTemplate`(presentational) 신설, GP/KCos/Neture 3서비스 list 적용(서비스 전이므로 Neture inline→Tailwind 시각 정렬 허용). KPA 미수정(BaseTable 보존). 기능/route/basePath/fetch/filter 무변경.**
> 선행: `WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1`(ForumListItem) · `WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1` — 2026-06-12

---

## 1. 목적

GP/KCos/Neture forum list 의 반복 table/loading/empty/error + pagination JSX 를 단일 presentational `ForumListTemplate` 으로 공통화. KPA 는 BaseTable 고유라 제외. backend/route/fetch 무변경.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `4f07529a0` · origin 동기화 · staged 없음 |

다른 세션 WIP(미접촉): api-server(register-routes/connection/contact-inquiry), web-glycopharm/k-cosmetics `App.tsx`·`DashboardLayout`, operator-core-ui, CHECK 문서. **모두 forum ForumPage.tsx 외 파일** — path-specific 격리.

## 3. 범위 결정 (사용자 승인)

서비스 정식 오픈 전이므로 **Neture inline-style table → 공통 Tailwind template 시각 정렬 허용**(option 2). 3서비스 일괄 적용으로 list 구조를 동일 presentational structure 로 정렬. 기능/route/basePath/fetch/filter/query param 은 무변경.

## 4. ForumListTemplate 설계

- **위치:** `packages/shared-space-ui/src/ForumListTemplate.tsx`, index.ts export.
- **순수 presentational** — `posts: ForumListItem[]` + pagination 상태만 받음. API client/router 미import. fetch/filter/sort/route 계산 없음.
- **props:** posts · pinnedPosts? · currentPage/totalPages/onPageChange · onPostClick(post→page navigate post.routeTo) · loading/error/onRetry · renderEmpty?(slot) · showPostType · renderTypeBadge?(slot) · renderTitleBadge?(slot, GP HOT) · showLikeCount/showCommentCount · pinnedLabel · accentColor.
- **렌더:** loading skeleton / error / pinned 섹션 / 본 목록(empty=renderEmpty) / `HubPagination`(showFirstLast·align center·bordered false·accentColor). 컬럼: [유형(opt)] 제목(+배지+댓글수) 작성자 작성일 [좋아요] 댓글.
- 최소 slot(renderTypeBadge/renderTitleBadge/renderEmpty)으로 서비스 차이 흡수 — KPA 흡수용 과도 slot 없음.

## 5. 서비스별 적용

| 서비스 | showPostType | pinned 소스 | 타이틀 배지 | type 배지 | accent | empty |
|--------|:---:|------|------|------|------|------|
| **GlycoPharm** | ❌ | `hotPosts`(isHot, page1·무필터) | `renderTitleBadge`=HOT(isHot) | — | `var(--color-primary)`(녹색) | 검색없음(전체보기) / 아직없음 |
| **K-Cosmetics** | ✅ | `pinnedPosts`(isPinned, 무필터) | 기본(isPinned→'고정') | `renderTypeBadge`(className) | `var(--color-primary)`(핑크) | 검색없음(전체보기) / 아직없음(글쓰기) |
| **Neture** | ✅ | `pinnedPosts`(무필터) | 기본('고정') | `renderTypeBadge`(inline bg/color) | `PRIMARY`(#2563EB) | 검색없음(전체보기) / 아직없음(`${basePath}/write` 글쓰기) |
| **KPA** | (미수정) | — | — | — | — | — |

- **GP HOT**: ForumListItem 에 없는 `isHot` → `renderTitleBadge={(post)=>(post as ForumPost).isHot ? <HOT> : null}` 로 hot 섹션·본 목록 모두 표시. hotPosts 를 pinnedPosts 슬롯으로 전달(amber 강조 동일).
- **Neture type 배지**: inline `s.badge`(bg/color) 를 renderTypeBadge slot 으로 유지 — 배지 자체 색은 보존, 테이블 골격만 Tailwind 로 정렬.
- **info bar**(총 N개/검색 N건 + 페이지) 는 page-local 유지(서비스 상태 의존). pagination 은 template 으로 이동(page 의 별도 HubPagination 블록 제거).

## 6. KPA 미수정 (적용 제외)

`web-kpa-society/.../ForumListPage.tsx` **미변경**(git status 확인). BaseTable·ActionBar·bulk·popular-tags·forum-filter·tags 인라인·appreciation·mobile card 고유. 향후 template + KPA 확장 슬롯 별도 판단.

## 7. 검증

- **TypeScript:** shared-space-ui · web-kpa-society · web-glycopharm · web-k-cosmetics · web-neture **각각 0 errors** ✅.
- **정적:**
  - GP/KCos/Neture 3서비스 `ForumListTemplate` 사용 확인. inline pagination/table JSX 제거.
  - KPA `ForumListPage.tsx` 미변경 확인.
  - **Neture `routeTo: ${basePath}/post/${slug}` 유지**(line 44) → supplier/partner/user basePath 경계 보존.
  - postType 표시(KCos/Neture true, GP false)·viewCount(테이블 미표시, 정책 유지)·like/comment 컬럼 유지.
  - fetch/filter/page/query param 로직 무변경(GP limit 50 client · KCos/Neture server page · type filter 그대로).
- **browser smoke:** **미수행** — dev 서버 미기동 + 인증/서비스 guard. **시각 변경 동반**(특히 Neture inline→Tailwind, 버튼/테이블 골격이 KCos/GP 와 동일 Tailwind 로 정렬) → 배포 후 또는 후속 smoke 권장(CHECK §9). 동작/route/필드는 tsc+정적 보존 확인.
- **무변경:** backend/API/DB/migration/route/menu ✅ · ForumListItem shape ✅ · Forum Detail/Write/Request ✅.

## 8. 완료 판정

**PASS.** `ForumListTemplate` 신설 + GP/KCos/Neture 적용(Neture 시각 정렬 허용), KPA 미수정. fetch/filter/route/basePath/backend 무변경, typecheck(5) 통과. forum list page 공통화 본체 1차 완료.

## 9. 후속 / 잔여

1. **browser smoke**(GP/KCos/Neture `/forum/posts`) — 시각 변경(Neture 정렬·버튼 32px 등) 렌더 확인. 배포 후 권장.
2. **Neture 잔여 dead style props** — `s.tableWrapper/table/th/td/row/pinnedRow/skeleton/errorBox/...` 등 일부 미사용(객체 property라 tsc 무오류). 선택적 cleanup 후속.
3. (정책) GP/KCos/Neture tag 인라인 표시 parity / GP fetch 전략(limit 50→server) — 별도.
4. forum 사용자-facing page 공통화는 KPA 억지 흡수 대신 **write postType 정책 IR** 또는 **detail shared parts** 로 이동 권장.

---

*Date: 2026-06-12 · WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1 · ForumListTemplate + GP/KCos/Neture 적용 PASS(Neture 시각 정렬 허용). KPA 미수정. backend/route/fetch 무변경. 시각 변경은 후속 smoke 권장.*
