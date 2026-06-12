# IR-O4O-FORUM-WRITE-POSTTYPE-POLICY-V1

> **유형:** Read-only 설계 IR (코드/UI/API/DB/route/menu 무변경)
> **목적:** 4서비스 forum write/edit page 의 `postType` 정책·editor 사용 현황을 조사하고, write page 공통화의 선행 기준(postType 정책 / editor parity / content format / edit route)을 확정.
> **상위:** `IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1`(§8 WRITE C/J) · `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1`
> **작성일:** 2026-06-12

---

## 1. 조사 개요

forum 사용자-facing list 축(hub/request/list primitives/shape/template)은 GP/KCos/Neture 공통화 완료, KPA list 는 BaseTable 고유로 제외. 다음은 **write page** 이나, postType·editor·edit route 편차가 있어 정책 선결이 필요하다. 본 IR 은 write 공통화 전 기준을 확정한다(코드 무변경).

**핵심 결론:**
1. **`postType` 은 drift 아니라 실제 backend 필드** — `ForumPost.type`(enum PostType, default DISCUSSION). create/update controller 가 `type` 을 수용. KPA/Neture 는 write 에서 미노출(→backend default DISCUSSION), GP/KCos 는 5-option select 노출. **"잘못된 필드"가 아니라 UX 노출 차이.**
2. **list 배지와의 정합**: KCos/Neture list 는 type 배지 표시(write 입력↔list 배지 연결 O for KCos), **GP list 는 type 배지 미표시**(GP write 입력이 list 에 안 보임 — 약한 불일치), KPA/Neture write 무입력.
3. **권장 = Option B(postType optional)** — shared write form `showPostType?` 로 GP/KCos opt-in, KPA/Neture opt-out. list template 의 `showPostType` 패턴과 일치, KCos 배지 의미 보존.
4. **editor drift(C, 선행)**: **KCos 만 plain `<textarea>`**, KPA/GP/Neture 는 RichTextEditor(@o4o/content-editor). write 공통화 전 **KCos editor parity** 필요.
5. **content format drift(G)**: **GP 는 content 를 HTML string 으로 전송**, KPA/KCos/Neture 는 blocks. 공통화 전 GP 정렬 권장.
6. **edit route 불일치(D)**: KPA `/forum/edit/:id`(param) · Neture `?edit=`(searchParam) · GP/KCos 없음 → **1차는 create-only 공통화**, edit 후속.
7. **서비스 고유(E/F)**: KPA `showStoreSave`(role) · Neture `showContactOnPost`+contactSection → shared form 확장 slot.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `ad3eef8bd` · origin 동기화(0/0) · staged 없음 |

다른 세션 WIP(미접촉): `CHECK-...-ORDER-VIEW-LOOP` 문서 M. 본 IR 은 신규 문서 1건만 생성.

## 3. 조사 대상 파일

| 서비스 | write page | API |
|--------|-----------|-----|
| KPA | `pages/forum/ForumWritePage.tsx` | `forumApi.createPost`/`updatePost` |
| GlycoPharm | `pages/forum/ForumWritePage.tsx` | `createForumPost` |
| K-Cosmetics | `pages/forum/ForumWritePage.tsx` | `createForumPost` |
| Neture | `pages/forum/ForumWritePage.tsx` | `createForumPost`/`updateForumPost` |
| backend | `controllers/forum/ForumPostController.ts`(create:256/292, update:358/376) · `forum-core entities/ForumPost.ts`(type:75-76) | — |

## 4. 서비스별 write page 필드 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| title | ✅ | ✅ | ✅ | ✅ |
| content editor | **RichTextEditor**(HTML→blocks) | **RichTextEditor**(HTML **string**) | **textarea**(text→blocks) | **RichTextEditor**(HTML→blocks) |
| postType select | ❌ | ✅(5종) | ✅(5종, 영문 label) | ❌ |
| postType in payload | ❌(→default) | ✅ `type` | ✅ `type` | ❌ |
| tags | ❌ | ❌ | ❌ | ❌ |
| forum/category 선택 | ❌(slug from route) | ❌ | ❌ | categorySlug |
| edit mode | ✅ `/forum/edit/:id`(param) | ❌ create-only | ❌ create-only | ✅ `?edit=`(searchParam) |
| 고유 | `showStoreSave`(role) | — | — | `showContactOnPost`+contactSettings |
| success redirect | `/forum/post/:id`·`/forum/:slug` | `/forum/post/:id` | `/forum/post/:id` | `${base}/post/${slug}` |

## 5. postType API/backend contract

- **ForumPost.type**: `@Column enum PostType default DISCUSSION`(ForumPost.ts:75-76). **실제 영속 필드.**
- **create**(ForumPostController:256,292): body `type` 추출 → 저장(미전달 시 default DISCUSSION).
- **update**(:358,376): `if (type !== undefined) post.type = type`.
- **PostType union**: `discussion|question|announcement|poll|guide`(@o4o/types forum.ts:35) + `FORUM_POST_TYPE_LABELS`.
- → GP/KCos 가 `type` 전송은 **정상 계약 사용**. KPA/Neture 미전송은 default DISCUSSION. **postType 은 유효 필드이며 invalid drift 아님.**

## 6. KPA canonical 확인

- KPA write 의 `WO-O4O-FORUM-CATEGORY-FULL-REMOVAL-V2` 주석 + migration `20260906300000-ForumFullCategoryRemoval` 은 **forum CATEGORY 제거**(forum_category 테이블·카테고리 선택)이지 **postType 제거가 아니다.** KPA write 에 postType 이 없는 것은 "category 제거 후 단순화"의 결과이며 **명시적 postType 제거 canonical 은 부재**. backend type 은 여전히 존재(default DISCUSSION).
- KPA list 도 type 배지 미표시(자체 BaseTable). → KPA 는 postType 을 UX 에서 다루지 않는 일관 상태(누락 아닌 단순화).

## 7. GP/KCos postType drift 판정

- **KCos**: write postType 입력 ✅ + **list type 배지 표시 ✅**(WO-LIST-TEMPLATE showPostType) → **입력↔표시 정합**. postType 유지 가치 O.
- **GP**: write postType 입력 ✅ + **list type 배지 미표시 ❌**(GP showPostType=false) → **입력이 list 에 안 보임**(약한 불일치). GP 는 type 을 저장하나 시각 노출 0.
- → "drift" 의 실체: **invalid 필드가 아니라 (a) GP 의 입력↔표시 단절, (b) KPA/Neture 무입력 vs GP/KCos 입력의 서비스 간 비대칭.** 정책으로 정렬 필요(§12).

## 8. editor 사용 현황 (C — 선행 필요)

| 서비스 | editor | content format |
|--------|--------|----------------|
| KPA | RichTextEditor | htmlToBlocks → **blocks** |
| GlycoPharm | RichTextEditor | **HTML string**(content.html 직접) |
| K-Cosmetics | **textarea** | textToBlocks → blocks |
| Neture | RichTextEditor | htmlToBlocks → blocks |

- **KCos 만 textarea**(rich 편집·이미지·AI 미지원). 공통 write form 은 단일 editor 를 가지므로 **KCos→RichTextEditor 정렬이 write 공통화 선행(C)**.
- **GP content=HTML string**(나머지 blocks). 백엔드 `content` 는 jsonb(blocks) — GP 는 string 을 jsonb 에 저장 → detail ContentRenderer 가 string/blocks 둘 다 처리하나 **format 불일치(G)**. 공통화 전 GP 를 blocks 로 정렬 권장.

## 9. edit route parity (D)

| 서비스 | edit 방식 |
|--------|-----------|
| KPA | `/forum/edit/:id`(useParams id) |
| Neture | `?edit=<id>`(searchParams) |
| GlycoPharm | 없음(create-only) |
| K-Cosmetics | 없음(create-only) |

→ 4서비스 **create 는 공통, edit 는 2서비스만·방식 상이.** **1차 공통화는 create-only**(전 서비스 공통), edit 는 후속(route 통일 + 공통 form edit 지원).

## 10. KPA 고유 기능 분리 (E)

- `showStoreSave={role kpa:store_owner}`(RichTextEditor prop) · `showCommunitySave` · forumSlug 라우팅 · edit param. → 공통 write form 의 **확장 slot/optional prop** 로 흡수하거나 KPA 별도 유지. 무리한 흡수 금지.

## 11. Neture 고유 확장 분리 (F)

- `showContactOnPost` 체크박스 + `contactSettings` fetch(WO-NETURE-EXTERNAL-CONTACT-V1) + categorySlug + basePath redirect + `?edit=`. → 공통 form 의 **renderExtra/contact slot** + basePath/categorySlug props 로 흡수. supplier/partner 맥락 유지.

## 12. 정책 옵션 비교 (postType)

| 옵션 | 내용 | 장 | 단 | 판정 |
|------|------|----|----|:---:|
| A 제거 | GP/KCos postType select 제거(전 서비스 무입력, backend default) | write 단순·tag/category 정책과 충돌 감소 | **KCos list type 배지 무의미화**(모두 DISCUSSION) — KCos 입력↔표시 단절 | 부분(GP만 적합) |
| **B optional** | shared form `showPostType?` — GP/KCos opt-in, KPA/Neture opt-out | KCos 배지 보존·list template `showPostType` 와 일치·기존 UX 보존 | 공통 form 분기 1개(저복잡) | **권장** |
| C 전 서비스 표준화 | 4서비스 postType 도입 | list 배지·write 정합 | KPA/Neture UX 부담·현 단순화 역행 | 비권장 |

## 13. 권장 정책

1. **postType = Option B(optional)** — list template 의 `showPostType` 와 대칭. KCos=on(배지 정합), GP=**list 와 정렬**(GP list 가 배지 미표시이므로 GP write 도 off 로 단순화 OR on 유지는 GP 선택 — 권장: GP off 로 입력↔표시 일치), KPA/Neture=off. backend type 무변경(default DISCUSSION).
2. **editor parity 선행(C)** — KCos textarea → RichTextEditor. write 공통화의 필수 선행.
3. **content format 정렬(G)** — GP content 를 blocks(htmlToBlocks)로 정렬(나머지와 일치).
4. **edit = 후속(D)** — 1차 create-only 공통화. edit route 통일 + 공통 form edit 지원은 별도.
5. **고유 슬롯(E/F)** — KPA showStoreSave / Neture contactSection 은 공통 form 확장 slot.

## 14. 1차 WO 권장안

**선행 2건(write 공통화 전 정렬):**
- `WO-O4O-FORUM-WRITE-EDITOR-PARITY-V1`(C) — KCos textarea→RichTextEditor(+content blocks). frontend-only.
- `WO-O4O-FORUM-WRITE-GP-CONTENT-BLOCKS-ALIGN-V1`(G) — GP content HTML string→blocks. (또는 editor parity WO 에 포함.)

**본체:**
- `WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1`(H, create-only) — shared `ForumWriteForm`(title + RichTextEditor + optional `showPostType` + 확장 slot `renderExtra`(Neture contact)/editor extra prop(KPA store save)). GP/KCos/Neture 우선, KPA 는 showStoreSave slot 으로 포함 가능 또는 별도. edit 제외.

## 15. 후속 WO 후보

1. `WO-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1`(D) — edit route 통일(param vs searchParam) + 공통 form edit 지원.
2. (정책) GP postType 유지/제거 최종(list 배지 정합).
3. forum write 후 **detail shared parts**(AppreciationPanel parity·comment CRUD·error shape) 축.

## 16. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| forum write 가 단순·명확한가 | ⚠️ KCos textarea·GP postType-but-no-badge 등 비대칭 — Option B + editor parity 로 정렬 |
| postType 이 tag 와 중복/혼동되는가 | ✅ 아님 — postType=글 형식(discussion/question…), tag=자유분류. 직교 |
| KPA canonical 무리한 강제 안 함 | ✅ postType Option B optional(KPA off 유지), 강제 표준화(C) 비권장 |
| GP/KCos postType 실가치 확인 | ✅ KCos=list 배지 정합(가치 O), GP=표시 단절(정렬 필요) |
| Neture supplier/partner 맥락 유지 | ✅ contactSection/basePath/categorySlug slot 으로 보존 |
| editor 형식이 detail 렌더와 정합 | ⚠️ GP string vs blocks — detail 은 둘 다 처리하나 format 정렬 권장(G) |
| edit/create 무리한 동시 통합 회피 | ✅ 1차 create-only, edit 후속(D) |
| 공통화가 1인 유지보수성 향상 | ✅ editor 단일·content 단일·write form 공통 → 유지보수 단순화 |

**종합:** postType 은 **유효 backend 필드**이며 KPA/Neture 무입력 vs GP/KCos 입력의 **UX 비대칭**이 본질(invalid drift 아님). 권장은 **Option B(optional showPostType)** — list template `showPostType` 와 대칭·KCos 배지 보존. write 공통화 선행으로 **KCos editor parity(C)** + **GP content blocks 정렬(G)** 필요, edit 는 create-only 후 후속(D). KPA showStoreSave·Neture contactSection 은 확장 slot(E/F).

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-WRITE-POSTTYPE-POLICY-V1.md`
- **조사 기준 commit:** `ad3eef8bd` (main, origin 동기화)
- **write 필드 비교:** §4 매트릭스(KPA/Neture=postType 무입력+RichTextEditor / GP=postType+RichTextEditor(HTML string) / KCos=postType+textarea)
- **postType backend contract:** ForumPost.type enum(default DISCUSSION), create/update 수용 — **유효 필드(invalid drift 아님)**
- **KPA canonical:** CATEGORY-FULL-REMOVAL 은 카테고리 제거지 postType 제거 아님. KPA postType 무입력=단순화(누락 아님), backend default DISCUSSION
- **GP/KCos drift 판정:** KCos=write↔list 배지 정합 / **GP=입력 but list 배지 미표시(단절)** + 서비스 간 비대칭
- **editor 정합:** **KCos 만 textarea**(나머지 RichTextEditor), **GP content=HTML string**(나머지 blocks) → 선행 정렬 필요
- **edit route parity:** KPA param·Neture searchParam·GP/KCos 없음 → 1차 create-only
- **권장 정책:** **Option B(postType optional)** + KCos editor parity + GP content blocks 정렬, edit 후속
- **1차 WO:** (선행) editor parity / GP content align → (본체) write form 공통화 create-only
- **후속 WO:** edit route parity / GP postType 최종 / detail shared parts
- **git status:** 사전 상태 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
