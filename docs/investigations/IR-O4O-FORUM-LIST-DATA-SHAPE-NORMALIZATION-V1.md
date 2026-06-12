# IR-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1

> **유형:** Read-only 설계 IR (코드/UI/API/DB/route/menu 무변경)
> **목적:** 4서비스 forum list page 의 데이터 shape 차이를 정리하고, 향후 `ForumListTemplate` 공통화를 위한 **normalized `ForumListItem` 기준 + 정규화 위치**를 확정한다.
> **상위:** `IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1`(§17-2) · `WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1` · `WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1`
> **작성일:** 2026-06-12

---

## 1. 조사 개요

forum list 의 작은 primitive(formatForumDate·pagination)는 공통화 완료. list page **전체 template** 추출 전에는 KPA `ForumPost` ↔ GP/KCos/Neture `DisplayPost` shape 차이를 정규화해야 한다. 본 IR 은 template 을 만들지 않고, **정규화 기준(normalized type·위치)** 만 확정한다.

**핵심 결론:**
1. **공통 코어 필드는 6개**(id·title·authorName·createdAt·commentCount·likeCount) + isPinned — 단 **GP 는 필드명이 다름**(author/views/likes/comments) → **frontend adapter 정규화 필요(B)**.
2. **route target 이 서비스별 상이** — KPA/KCos/GP=`id`(경로만 다름), **Neture=`slug` + basePath** → normalized 에 **`routeTo: string`** 으로 흡수(D).
3. **선택 필드는 서비스별 subset** — viewCount(KPA·GP), type 배지(KCos·Neture), tags·appreciation(KPA 단독) → normalized **optional + 조건부 렌더**(G/H).
4. **정규화 위치 = Option B-lite**(shared `ForumListItem` 타입 + 서비스별 adapter; 기존 normalizePost/toDisplayPost 재활용). **backend 변경(C) 불요**.
5. KPA BaseTable/ActionBar/bulk/popular-tags/forum-filter/mobile-card/appreciation 은 **template 제외(E)** — KPA 고유.
6. **데이터 fetch 전략 편차**(GP=limit 50 전량 client 필터 / KCos·Neture=server page + client type 필터 / KPA=server 필터)는 template 전 **선행 정리 필요(H)** 또는 template 이 list 만 받고 fetch 는 page 책임으로 분리.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `6256b50ad` · origin 동기화(0/0) · staged 없음 |

다른 세션 WIP(미접촉): `packages/store-ui-core/src/index.ts` M, CHECK-...-ORDER-VIEW-LOOP M. 본 IR 은 신규 문서 1건만 생성.

## 3. 조사 대상 파일

| 서비스 | list page | API client / 타입 |
|--------|-----------|-------------------|
| KPA | `pages/forum/ForumListPage.tsx` | `api/forum.ts`(getPosts) · `types/index.ts:60-77`(ForumPost flatten) |
| GlycoPharm | `pages/forum/ForumPage.tsx` | `services/forumApi.ts`(ApiForumPost) + local `ForumPost`(20-30) + `normalizePost`(32-44) |
| K-Cosmetics | `pages/forum/ForumPage.tsx` | `services/forumApi.ts`(ApiForumPost) + local `DisplayPost`(27-37) + `toDisplayPost`(39-53) |
| Neture | `pages/forum/ForumPage.tsx` | `services/forumApi.ts`(ApiForumPost) + local `DisplayPost`(28-38) + `toDisplayPost`(40-54) |

## 4. 4서비스 list page 사용 필드 매트릭스 (렌더 기준)

| 필드 | KPA | GP | KCos | Neture | 비고 |
|------|:---:|:---:|:---:|:---:|------|
| id | ✅ | ✅ | ✅ | ✅ | 공통 |
| title | ✅ | ✅ | ✅ | ✅ | 공통 |
| authorName | ✅ | ✅(`author` 문자열) | ✅ | ✅ | GP 필드명 다름 |
| createdAt | ✅ | ✅ | ✅ | ✅ | 공통(formatForumDate) |
| commentCount | ✅ | ✅(`comments`) | ✅ | ✅ | GP 필드명 다름 |
| likeCount | ✅ | ✅(`likes`) | ✅ | ✅(regular row 미표시) | GP 필드명 다름 |
| isPinned | ✅(공지 배지) | ✅(HOT) | ✅(고정) | ✅(고정) | 표현만 상이 |
| viewCount | ✅ | ✅(`views`) | ❌ | ❌ | KPA·GP만 |
| type/postType 배지 | ❌ | ❌ | ✅ | ✅ | KCos·Neture만 |
| tags(인라인) | ✅(0~3) | ❌ | ❌ | ❌ | **KPA 단독** |
| appreciationCount(🎁) | ✅(별도 API batch) | ❌ | ❌ | ❌ | **KPA 단독** |
| slug | ❌(id 라우팅) | ❌ | ✅(보유, 라우팅엔 id) | ✅(**라우팅에 slug**) | Neture 라우팅 키 |
| isHot(파생) | ❌ | ✅(views≥50∥comments≥10) | ❌ | ❌ | GP adapter 계산 |

- **전 서비스 공통 렌더:** id·title·authorName·createdAt·commentCount·likeCount·isPinned (7).

## 5. 4서비스 API/client response shape 비교 (adapter)

| 서비스 | raw → display | 주요 변환 |
|--------|---------------|-----------|
| KPA | `ForumPost`(이미 flatten) | authorName/forumId/categoryName flatten(types:60-77), appreciation 별도 batch(appreciationApi.getSummary) |
| GP | `ApiForumPost` → local `ForumPost` | `normalizePost`: author?.nickname∥name→**author**, viewCount→**views**, likeCount→**likes**, commentCount→**comments**, **isHot 계산** |
| KCos | `ApiForumPost` → `DisplayPost` | `toDisplayPost`: slug 보존, `normalizePostType` 검증, `getAuthorName`→authorName |
| Neture | `ApiForumPost` → `DisplayPost` | KCos 와 동일(slug·type·authorName) |

- GP 만 engagement 필드명을 축약(views/likes/comments) + isHot 파생. KCos/Neture 는 동일 adapter. KPA 는 client 레벨에서 이미 flatten + appreciation 별도.

## 6. route target 차이

| 서비스 | detail 경로 | 키 | basePath |
|--------|------------|:---:|:---:|
| KPA | `/forum/post/${id}` | id | 고정 |
| GP | `/forum/posts/${id}` | id | 고정 |
| KCos | `/forum/post/${id}` | id(라우트 param `:postId`) | 고정 |
| Neture | `${basePath}/post/${slug}` | **slug** | **basePath prop**(/forum·/supplier/forum·/partner/forum) |

→ 경로 형태·키(id vs slug)·basePath 가 모두 상이. **normalized `routeTo: string`**(각 page 가 계산)으로 흡수 = 분류 D.

## 7. filter/query param 차이

| param | KPA | GP | KCos | Neture |
|-------|:---:|:---:|:---:|:---:|
| q(search) | ✅ server | ✅ client | ✅ client | ✅ server |
| sort | ❌ | ✅ client | ✅ client | ✅ server |
| tag | ✅ server(KPA 단독) | ❌ | ❌ | ❌ |
| forum/forumId | ✅ server(KPA 단독) | ❌ | ❌ | ❌ |
| type | ❌ | ❌ | ✅ client | ✅ server |
| category | ❌ | ❌ | ❌ | ✅ server(categoryId) |
| page | ✅ server | ⚠️ client(limit 50 전량) | ✅ server | ✅ server |

- **fetch 전략 편차(H):** GP 는 `limit:50` 전량 fetch 후 client 필터·페이징 / KCos·Neture 는 server page + client type 필터 / KPA 는 server 필터. → template 은 **이미 fetch·필터된 `ForumListItem[]` + pagination 메타만 받는** presentational 설계가 안전(fetch/filter 는 page 책임 유지).
- KPA tag/forum 필터, Neture category select 는 서비스 고유(G).

## 8. KPA 고유 list 기능 분리 (E — template 제외)

BaseTable(O4OColumn) + ActionBar(bulk link/AI-copy/delete) + selectable, popular tags bar, forum filter combobox, tags 인라인 pill, appreciation(🎁) 컬럼·batch API, active filter chips, mobile card 레이아웃, error+retry 배너. → **KPA-only, 공통 template 에 흡수 금지.** (KPA 는 자체 BaseTable 기반 유지 또는 template + KPA 확장 슬롯 별도 판단.)

## 9. Neture basePath/supplier 경계 (H — 유지)

Neture list 는 `basePath` prop 으로 `/forum`·`/supplier/forum`·`/partner/forum` 재사용 + detail 은 slug 라우팅. normalized `routeTo` 가 basePath+slug 를 page 에서 계산 → template 은 route-agnostic. supplier/partner workspace 경계 보존.

## 10. normalized `ForumListItem` 후보 (제안 — 본 IR 미구현)

```ts
interface ForumListItem {
  id: string;
  title: string;
  authorName: string;          // KPA flatten / GP author / KCos·Neture getAuthorName
  createdAt: string;           // ISO — formatForumDate
  commentCount: number;        // GP comments
  likeCount: number;           // GP likes
  isPinned: boolean;
  routeTo: string;             // detail 경로(서비스가 id/slug/basePath 계산) — D 흡수
  // optional (서비스 subset → 조건부 렌더)
  viewCount?: number;          // KPA·GP
  postType?: 'discussion'|'question'|'announcement'|'poll'|'guide'; // KCos·Neture 배지
  tags?: string[];             // KPA(인라인)
  appreciationCount?: number;  // KPA(🎁)
  excerpt?: string;
  updatedAt?: string;
}
```

- 필수 = 전 서비스 공통 렌더 7필드 + routeTo. 나머지 optional, template 이 presence/config 로 조건부 렌더.
- **본 IR 에서 type 파일·adapter 는 만들지 않는다**(필드 후보만).

## 11. 정규화 위치 옵션 비교

| 옵션 | 내용 | 장 | 단 | 판정 |
|------|------|----|----|:---:|
| A page-local adapter | 각 page 가 raw→ForumListItem | backend 무변경·점진·route 흡수 쉬움 | adapter 일부 중복 | 가능 |
| **B-lite shared type + adapter** | shared `ForumListItem` 타입 + 공용 adapter helper(GP/KCos/Neture 공유, KPA 별도 mapping) | 중복 감소·template 직결 | 서비스 raw 차이만큼 분기 | **권장** |
| C backend 정렬 | API 응답 동일 shape | 가장 깔끔 | API contract 변경·영향 큼·route 키(slug/id)는 여전히 frontend | **후순위(과함)** |

**권장: B-lite.** shared `ForumListItem` 타입을 두고, GP/KCos/Neture 는 거의 동일하므로 공용 adapter(raw `ApiForumPost`→ForumListItem) 1개를 공유, KPA 는 자체 client(flatten+appreciation)라 별도 mapping. `routeTo` 는 각 page 가 주입. backend(C)는 불요.

## 12. 분류표

| 항목 | 분류 | 비고 |
|------|:---:|------|
| id/title/createdAt/isPinned | A | 개념 정합(이름 동일) |
| authorName(GP author)·commentCount(comments)·likeCount(likes) | **B** | GP 필드명 정규화 |
| route target(id/slug/basePath) | **D** | `routeTo` props 주입 |
| viewCount / postType 배지 / tags / appreciation | **G/H** | 서비스 subset, optional+조건부 |
| KPA BaseTable/bulk/popular-tags/forum-filter/mobile/appreciation | **E** | template 제외(KPA 고유) |
| fetch/filter 전략(GP 전량 vs server page) | **H** | template 전 정리(또는 presentational 분리) |
| Neture supplier/partner basePath | **H** | routeTo 로 흡수, 경계 유지 |
| normalized `ForumListItem` | **C(필요)** | shared type 신설(B-lite) |
| backend response 정렬 | **F(후순위)** | 불요 |

## 13. 1차 WO 권장안 / 후속 WO 후보

**1차: `WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1`** (Option B-lite)
- shared `ForumListItem` 타입(예: `@o4o/shared-space-ui` 또는 forum shared) 신설.
- GP/KCos/Neture: 기존 `normalizePost`/`toDisplayPost` 를 `ForumListItem` 출력으로 정렬(author→authorName, views→viewCount 등) + `routeTo` 주입. KPA: 자체 mapping→ForumListItem(또는 KPA 는 template 비대상으로 보류).
- **template 은 만들지 않음**(다음 WO). UI 렌더는 그대로(adapter 출력만 정렬). frontend-only, backend/route 무변경.

**후속:**
1. `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` — `ForumListItem[]` + pagination 메타 + config(컬럼/배지/route) 를 받는 presentational `ForumListTemplate`. GP/KCos/Neture 우선 적용, KPA 는 BaseTable 유지 또는 확장 슬롯 별도.
2. (정책) GP/KCos/Neture 에 tag 인라인 표시 도입 여부 — KPA parity vs subset 유지.
3. (정책) GP fetch 전략(limit 50 전량) server 페이징 정렬 — 별도.

## 14. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| forum list 가 포럼 활동 목록으로 명확한가 | ✅ 4서비스 title/author/date/engagement 목록 |
| KPA 고유 기능 무리한 강제 안 함 | ✅ BaseTable/bulk/tags/appreciation = E(제외) |
| GP/KCos/Neture subset 유지 | ✅ optional 필드 + 조건부 렌더로 subset 수용 |
| tag = 분류 키워드 유지 | ✅ tags optional(KPA), membership 무관 |
| closed forum 정보 list 노출 정책 충돌 | ✅ list 는 forumType 표시 안 함(KPA isPinned/badge만), 노출 정책 무관 |
| route/basePath 가 workspace 경계 보존 | ✅ `routeTo`+basePath 로 Neture supplier/partner 경계 유지(D/H) |
| 공통화가 1인 유지보수성 향상 | ✅ B-lite 로 GP/KCos/Neture adapter 통일, 중복↓ |
| backend 변경 없이 frontend 정규화 가능 | ✅ Option B-lite — backend(C) 불요 |

**종합:** 공통 코어 7필드는 정합하나 GP 필드명·route 키(slug/id)·서비스 subset 차이가 남는다. **Option B-lite**(shared `ForumListItem` + 서비스 adapter, `routeTo` 주입)로 backend 변경 없이 정규화 가능하며, KPA 고유(BaseTable/tags/appreciation)는 template 제외(E), Neture basePath 는 routeTo 흡수(D). 정규화(1차) → template(후속) 순.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1.md`
- **조사 기준 commit:** `6256b50ad` (main, origin 동기화)
- **사용 필드 매트릭스:** 공통 7(id·title·authorName·createdAt·commentCount·likeCount·isPinned) / KPA·GP viewCount / KCos·Neture type 배지 / KPA 단독 tags·appreciation
- **API/client shape:** GP `normalizePost`(author/views/likes/comments 축약+isHot) · KCos·Neture `toDisplayPost`(slug·type·authorName) · KPA flatten+appreciation batch
- **route target:** KPA/GP/KCos=id(경로 상이) · Neture=slug+basePath → `routeTo` 흡수(D)
- **filter/param:** KPA q/tag/forum(server) · GP q/sort(client 전량) · KCos q/type/sort(client) · Neture q/category/type/sort(server) — fetch 전략 편차(H)
- **normalized 후보:** `ForumListItem`(필수 7+routeTo, optional viewCount/postType/tags/appreciation)
- **정규화 위치 권장:** **Option B-lite**(shared type + 서비스 adapter, backend 불요)
- **즉시 WO:** `WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1`(type+adapter, template 미생성)
- **후속 WO:** `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` / tag 표시 parity 정책 / GP fetch 전략 정렬
- **git status:** 사전 상태 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
