# CHECK-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1

> **작업명:** WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1
> **유형:** forum list 데이터 shape 정규화 — shared `ForumListItem` 타입 + 서비스 adapter 정렬 (Option B-lite)
> **결과: PASS — shared `ForumListItem` 신설, GP/KCos/Neture adapter·render 를 `ForumListItem` 기준으로 정렬(routeTo 흡수). KPA 는 template 비대상으로 미수정(고유 BaseTable 보존). UI 구조 무변경.**
> 선행: `IR-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1`(Option B-lite) · `WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1` — 2026-06-12

---

## 1. 목적

forum list template 공통화 선행으로, KPA `ForumPost` ↔ GP/KCos/Neture `DisplayPost` shape 차이를 shared `ForumListItem` 기준으로 정규화. template 생성·UI/route/fetch 변경은 범위 밖.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `6256b50ad`(IR 기준) → 작업 시작 HEAD `eee9f6bc0`(IR 커밋 후) · origin 동기화 · staged 없음 |

다른 세션 WIP(미접촉, store-orders 축): `store-ui-core/src/index.ts`, `PharmacyOrders.tsx`, `StoreOrdersPage.tsx`(KCos·KPA), CHECK 문서. 모두 forum 외 파일 — path-specific 으로 격리.

## 3. shared 타입 추가

- **신규:** `packages/shared-space-ui/src/forumListItem.ts` — `ForumListItem`(필수 7필드 id/title/authorName/createdAt/commentCount/likeCount/isPinned + `routeTo`, optional viewCount/postType/tags/appreciationCount/excerpt/updatedAt) + `ForumListItemPostType`(discussion|question|announcement|poll|guide inline union). index.ts export.
- shared 에는 **타입만**(raw adapter 미포함) — 각 service page 가 local 매핑(WO: "raw 전용 adapter 를 shared 에 억지로 넣지 않는다"). @o4o/types 의존 추가 없음(union inline).

## 4. 서비스별 정규화

| 서비스 | local 타입 | adapter | render 변경 | routeTo |
|--------|-----------|---------|-------------|---------|
| **GlycoPharm** | `type ForumPost = ForumListItem & { isHot }` | `normalizePost`: author→**authorName**, views→**viewCount**, likes→**likeCount**, comments→**commentCount**, isPinned 추가, **routeTo** + isHot 파생 | `post.author→authorName`·`views→viewCount`(sort)·`likes→likeCount`·`comments→commentCount`·route→`post.routeTo` | `/forum/posts/${id}` |
| **K-Cosmetics** | `type DisplayPost = ForumListItem` | `toDisplayPost`: type→**postType**, slug 제거, **routeTo** | `TYPE_BADGES[post.type]→[post.postType ?? 'discussion']`·`p.type→p.postType`(filter)·handlePostClick→`post.routeTo` | `/forum/post/${id}` |
| **Neture** | `type DisplayPost = ForumListItem` | `toDisplayPost(post, **basePath**)`: type→postType, slug 제거, **routeTo**(basePath+slug) | 동일(postType) + `.map(p=>toDisplayPost(p, basePath))`·handlePostClick→`post.routeTo` | `${basePath}/post/${slug}` |
| **KPA** | (미변경) | — | — | — |

- **GP isHot**: ForumListItem 에 미포함, GP 로컬 확장(`& { isHot }`)으로 유지(HOT 배지·hotPosts 필터) — WO "isHot local derived" 부합.
- **routeTo 흡수(D)**: GP/KCos=id 경로, Neture=basePath+slug → 각 adapter 가 `routeTo` 계산, handlePostClick 은 `post.routeTo` 단일 사용. Neture supplier/partner basePath 경계 보존.
- **slug**: KCos/Neture 의 라우팅 키였으나 routeTo 로 흡수되어 item 에서 제거(render 미사용 확인 — tsc).

## 5. KPA 처리 (option B — template 비대상)

KPA `ForumListPage.tsx` 는 **미수정**. 사유: BaseTable(O4OColumn)·ActionBar(bulk link/AI-copy/delete)·selectable·popular tags·forum filter combobox·tags 인라인·appreciation(🎁) batch·mobile card 등 **고유 기능 다수**(IR §8 E). 공통 template 비대상이므로 shape 정규화 강제 불요. ForumListItem 은 KPA `ForumPost`(id/title/authorName/createdAt/commentCount/likeCount/viewCount/tags/appreciationCount + forumId flatten)의 **공통 부분 집합 기준**으로 정의됨(reference). KPA 고유(BaseTable/bulk/appreciation/tags/mobile)는 향후 template + KPA 확장 슬롯 별도 판단.

## 6. 검증

- **TypeScript:** shared-space-ui · web-kpa-society · web-glycopharm · web-k-cosmetics · web-neture **각각 0 errors** ✅.
- **정적:**
  - `ForumListItem`/`ForumListItemPostType` index.ts export 확인.
  - GP/KCos/Neture display item = `ForumListItem`(alias/확장) 정렬 확인. GP old-field(post.author/views/likes/comments) 잔재 0(raw.* 제외).
  - `routeTo` 4 adapter(GP/KCos/Neture)에서 생성·handlePostClick 에서 사용 확인. Neture basePath+slug 유지.
  - KPA `ForumListPage.tsx` 미변경 확인(git status).
- **UI 구조 변경:** 없음 — 필드 접근명만 정규화, JSX 구조/컬럼/배지/레이아웃 동일.
- **fetch/filter/page/query param:** 무변경(GP limit 50 client·KCos·Neture server page·type filter 그대로).
- **browser smoke:** 미수행 — UI 구조 변경이 아닌 shape 정규화라 tsc + 정적으로 충분(WO 허용). 필드 rename 은 tsc 가 누락 가드.
- **무변경:** backend/API/DB/migration/route/menu ✅ · pagination ✅ · formatDate ✅ · Forum Detail/Write/Request ✅.

## 7. 완료 판정

**PASS.** shared `ForumListItem` 신설 + GP/KCos/Neture adapter·render 정렬(routeTo 로 route 차이 흡수), KPA 는 template 비대상으로 미수정(고유 BaseTable 보존). UI/route/fetch 무변경, backend 무변경, typecheck(5) 통과. **다음 `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` 의 `ForumListItem[]` 소비 기반 확보.**

## 8. 후속

1. `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` — `ForumListItem[]` + pagination 메타 + config(컬럼/배지/route) presentational `ForumListTemplate`. GP/KCos/Neture 우선, KPA 는 BaseTable 유지/확장 슬롯 별도.
2. (정책) GP/KCos/Neture tag 인라인 표시 parity / GP fetch 전략(limit 50→server) 정렬 — 별도.
3. (선택) browser smoke — 정규화 후 list 렌더 확인(배포 후).

---

*Date: 2026-06-12 · WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1 · shared ForumListItem + GP/KCos/Neture 정규화 PASS. KPA 미수정(template 비대상). UI/backend 무변경.*
