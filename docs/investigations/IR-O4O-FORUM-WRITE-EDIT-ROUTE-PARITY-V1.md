# IR-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1

> **유형:** Read-only 조사 (코드/UI/API/DB/migration/route 변경 없음, 문서 1개만 생성)
> **목적:** forum write/edit 화면의 edit route·edit form 처리 방식 서비스별 차이를 조사하고, 공통 `ForumWriteForm`을 edit까지 확장할 수 있는지 기준을 확정한다.
> **작성일:** 2026-06-13
> **선행 WO:** `WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1`, `WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1`, `WO-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1`

---

## 1. 조사 개요

create 축은 4서비스 모두 공통 `ForumWriteForm` 기준으로 닫혔다. 본 IR은 **edit(게시글 수정)** 축의 서비스별 현황을 조사하고, edit form을 공통 폼으로 확장할지·route를 통일할지를 결정한다.

**핵심 결론(요약):**
- **edit이 존재하는 서비스는 KPA·Neture 2개뿐.** GP·K-Cosmetics는 **edit 기능이 아예 없다**(route·update API·detail CTA 전무, 코드 주석 "create-only" = 의도된 상태).
- **KPA edit는 이미 공통 `ForumWriteForm`을 쓴다** — create commonization WO 때 form body가 create/edit 공용(initial props)으로 정리됨. 별도 inline form 없음.
- **Neture edit만 레거시 inline form으로 남아 있다** — 직전 Neture WO가 create만 `ForumWriteForm`으로 전환하고 edit은 기존 inline `<form>`으로 분기 보존했다.
- 따라서 "edit form 공통화"의 **실제 미정리분은 Neture edit 단 1개**다. KPA는 이미 정렬됨.
- **권장 = Option A (form만 공통화, route 유지).** 구체 1차 WO = **Neture edit → ForumWriteForm 전환**(KPA가 이미 검증한 패턴 적용). GP/KCos edit 신설은 별도 정책 WO(Option C), route 통일(Option B)은 장기 과제로 분리.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `b83a7ec449b84056d6cb941a27e1ae3ca3da90eb` |
| origin/main ahead/behind | `0 / 0` (동기화) |
| `git status --short` | 다른 세션 WIP만 존재 (아래) |
| 조사 기준 commit | **`b83a7ec449`** |

**워킹트리 상태(다른 세션 WIP — 미접촉):**
- `D packages/store-ui-core/src/components/b2b-catalog/B2BCatalogHub.tsx`
- `M packages/store-ui-core/src/index.ts`
- `M services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx`
- `M services/web-k-cosmetics/src/pages/hub/HubB2BPage.tsx`
- `?? docs/work-orders/WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md`
- `?? packages/store-ui-core/src/components/supply-catalog/`

> 본 IR은 read-only. 어떤 코드/문서도 수정하지 않으며 다른 세션 WIP를 건드리지 않는다. 본 IR 문서 1개만 신규 생성.

---

## 3. edit route 매트릭스

| 서비스 | create route | edit 방식 | update API client | detail edit CTA | edit 기능 |
|--------|--------------|-----------|-------------------|-----------------|:--------:|
| **KPA** | `/forum/write`, `/forum/:slug/write` | **전용 route** `/forum/edit/:id` (`useParams.id`) | ✅ `forumApi.updatePost(id, data)` (`api/forum.ts`) | ✅ `ForumDetailPage.tsx:278` → `/forum/edit/${id}` "수정" | **있음** |
| **Neture** | `/forum/write` (+ `/supplier`·`/partner`·`/workspace/forum/write` basePath) | **query param** `?edit=<id>` (`searchParams.get('edit')`) | ✅ `updateForumPost(id, payload)` (`services/forumApi.ts:658`) | ✅ `ForumPostPage.tsx:436/460` → `${basePath}/write?edit=${id}` "수정" | **있음** |
| **GlycoPharm** | `/forum/write`, `/business/forum/write` | **없음** | ❌ **부재**(createForumPost만) | ❌ 없음 | **없음** |
| **K-Cosmetics** | `/forum/write` | **없음** | ❌ **부재**(read + create만) | ❌ 없음 | **없음** |

> 출처: KPA `App.tsx:585-587`, Neture `App.tsx:674/789/842/923`, GP `App.tsx:559/623`, KCos `App.tsx:423-430`. update client: KPA `api/forum.ts:65`, Neture `services/forumApi.ts:658-671`. detail CTA: KPA `ForumDetailPage.tsx:278`, Neture `ForumPostPage.tsx:436/460`.

---

## 4. KPA edit flow

- **route:** 전용 `/forum/edit/:id` → 동일 `ForumWritePage` 컴포넌트(`useParams.id` → `isEdit = !!id`).
- **data load:** `forumApi.getPost(id)` → `post.content`가 Block[]이면 `blocksToHtml(post.content)`로 HTML 복원 → `title`/`editorHtml` 버퍼에 채움 → 로딩 게이트 후 `ForumWriteForm`에 `initialTitle`/`initialContentHtml`로 전달 (`ForumWritePage.tsx:31-44, 116-118`).
- **form:** create/edit **단일 `ForumWriteForm`** (분기 없음). `submitLabel`만 `isEdit ? '수정하기' : '등록하기'`. `editorProps.showStoreSave`(kpa:store_owner)·`showCommunitySave`는 create/edit 공통 유지.
- **submit:** `handleSave(payload)` 내부에서 `isEdit ? forumApi.updatePost(id, submitData) : forumApi.createPost(submitData)`. **submitData는 create/update 동일** = `{ title, content: payload.editorHtml(HTML string), forumSlug? }`. content는 raw HTML 전송(백엔드 normalizeContent 정규화).
- **판단:** **KPA edit는 이미 공통 폼 기준으로 완전 정렬됨.** 추가 공통화 불필요.

---

## 5. Neture edit flow

- **route:** query param `?edit=<id>` (전용 route 아님). `ForumPostPage` "수정" → `${basePath}/write?edit=${id}`.
- **data load:** `fetchForumPostBySlug(editPostId)` → `content` 텍스트를 `<p>...</p>`로 감싸 `editorHtml` 구성, `showContactOnPost` 복원 (`ForumWritePage.tsx:74-99`).
- **form:** **create는 `ForumWriteForm`, edit은 기존 inline `<form onSubmit={handleSubmit}>`** 로 분기(`isEditMode ? inline : ForumWriteForm`). 즉 **edit만 레거시 inline form** 유지 — 직전 WO(NETURE-FORM-COMMONIZATION)가 create-only로 닫고 edit은 보존.
- **submit(edit):** `handleSubmit` → `htmlToBlocks(editorHtml)` → `updateForumPost(id, { title, content: blocks, categorySlug })`. **`showContactOnPost`는 update payload에 미포함** → edit에서 contact 표시 토글 변경은 저장되지 않음(기존 한계).
- **contact in edit:** inline form에 contact 체크박스/prompt는 렌더되나(상태 복원), update API가 전송하지 않아 **edit 시 contact 변경 비영속**.
- **판단:** **Neture edit이 유일한 form-commonization 미정리분.** create와 동일하게 `ForumWriteForm`(initial props + renderExtra/renderContentMeta) 으로 전환 가능. (옵션으로 contact edit 영속화는 update payload 확장이 필요 — 별도 판단.)

---

## 6. GP/KCos edit 부재 확인

- **GlycoPharm:** `ForumWritePage`에 `useParams`/`searchParams` edit 감지 없음, edit 분기 없음, post load 없음. `services/forumApi.ts`에 **update 함수 부재**(createForumPost만). detail `ForumPostDetailPage.tsx`에 edit 링크 없음(목록/홈만). 코드 주석 `ForumWriteForm 기반(create-only)`.
- **K-Cosmetics:** 동일 — create-only handler(`handleCreate`)만, update 함수 부재, detail `PostDetailPage.tsx`에 edit CTA 없음. 주석 `create-only`.
- **판단:** GP/KCos는 **edit route 없음 + update API 없음 + detail CTA 없음**으로 **일관된 "edit 미보유" 상태**다. "route만 있고 안 쓰는" 누락이 아니라, **edit 기능 자체가 의도적으로 미구현**(create-only). edit 신설 여부는 **제품/정책 결정 영역**이며, 본 IR의 "기존 edit parity" 범위 밖이다.

---

## 7. update API contract

| 서비스 | create payload | update payload | 차이 |
|--------|----------------|----------------|------|
| **KPA** | `{ title, content: HTML, forumSlug? }` | `{ title, content: HTML, forumSlug? }` (`updatePost`, PUT) | **동일** (content=raw HTML) |
| **Neture** | `{ title, content: Block[], categorySlug, showContactOnPost }` | `{ title, content: Block[], categorySlug }` (`updateForumPost`, PUT `/forum/posts/:id`) | update는 **`showContactOnPost` 미포함**, content=htmlToBlocks(Block[]) |
| **GP/KCos** | `{ title, content: HTML, ... }` (create only) | — (없음) | — |

**핵심:**
- KPA는 create/update payload가 완전히 동일 → 공통 폼 onSubmit에서 분기만 하면 됨(이미 그러함).
- Neture는 create/update가 거의 동일하나 ① content 변환 방식(`htmlToBlocks` → Block[])을 wrapper가 유지, ② update가 `showContactOnPost`를 누락. 공통 폼 전환 시 이 두 가지를 wrapper onSubmit에서 그대로(또는 contact 포함하도록 개선) 처리하면 됨.
- 공통 폼(`ForumWriteForm`)의 payload(`{ title, editorHtml, type? }`)는 create/edit 무관하게 동일 → **폼 자체는 update를 위한 추가가 필요 없다**(wrapper가 payload→update API 변환).

---

## 8. ForumWriteForm edit 재사용 가능성

- `ForumWriteForm`은 이미 `initialTitle` / `initialContentHtml` / `initialType` props를 보유하고, 폼 body는 create/edit 공용으로 설계됨(컴포넌트 doc 주석: "form body 자체는 create/edit 공용이므로 parent가 initial* + onSubmit로 재사용 가능").
- **KPA가 이를 실제로 검증** — edit에서 loaded post를 `initialTitle`/`initialContentHtml`로 주입, `onSubmit`에서 update 호출. 정상 동작.
- 따라서 **edit 확장은 새 prop이 거의 불필요**. Neture edit 전환 시 필요한 것은:
  - `initialTitle`/`initialContentHtml`에 loaded post 주입(로딩 게이트 후 마운트, KPA 패턴).
  - `renderExtra`(contact)·`renderContentMeta`(charCount)는 create에서 이미 쓰는 슬롯 재사용.
  - `onSubmit` = update 분기(`updateForumPost`), `submitLabel`='수정하기'.
- **결론:** `ForumWriteForm`은 edit 재사용에 **충분**하다. 신규 prop 추가 없이 Neture edit 전환 가능(단 contact edit 영속화를 원하면 update payload에 showContactOnPost 추가 — wrapper/백엔드 영역, 폼과 무관).

---

## 9. route 통일 필요성 판단

- 현재 edit 진입 방식: KPA=전용 route(`/forum/edit/:id`), Neture=query param(`?edit=`). **메커니즘이 다르다.**
- **route 통일(Option B)은 form 공통화와 독립적이며 비용이 크다:** detail CTA·router·(필요 시) menu를 함께 변경해야 하고 smoke가 필요하다. form body 공통화에는 route 통일이 **불필요**하다(공통 폼은 진입 방식과 무관하게 initial props만 받으면 됨 — KPA route param·Neture query param 둘 다 같은 폼을 쓸 수 있음).
- **판단:** route 통일은 **현 단계 불필요**. 기존 route를 유지하고 form body만 공통화하는 것이 "clean & simple"·"최소 변경" 원칙에 부합. route parity는 장기 과제로 분리.

---

## 10. 권장 옵션

### 권장: **Option A — form만 공통화, route 유지**

- KPA `/forum/edit/:id` 유지, Neture `?edit=` 유지(제거/alias 안 함).
- **Neture edit form body를 `ForumWriteForm`(initial props 기반)으로 전환** — KPA가 이미 쓰는 패턴. 이로써 edit form도 4서비스(중 edit 보유 2서비스) 공통 폼 기준으로 정렬.
- GP/KCos edit 신설은 **하지 않음**(본 범위 밖, 별도 정책 WO).

**근거:**
- 최소 변경·route/menu/detail 무영향·위험 낮음.
- 실제 미정리분이 Neture edit 1개뿐이라 범위가 작고 명확.
- KPA가 동일 패턴을 이미 검증 → 회귀 위험 낮음.

### 비권장
- **Option B (route 통일):** detail CTA·router 영향 + smoke 필요. 현 단계 과함 → 장기 과제로 분리.
- **Option C (GP/KCos edit 신설):** 신규 기능 추가 + 소유자/권한 정책(작성자만 수정) 검증 필요. 공통화 범위 초과 → 별도 정책 WO.

---

## 11. 1차 WO 후보

**`WO-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1`** (= 사실상 Neture edit 전환)

- **대상:** `services/web-neture/src/pages/forum/ForumWritePage.tsx` 1파일(프론트). 필요 시 `ForumWriteForm`은 무변경(이미 충분).
- **내용:** Neture edit 분기를 inline `<form>` → `ForumWriteForm`(initialTitle/initialContentHtml + renderExtra contact + renderContentMeta + onSubmit=update)으로 전환. 로딩 게이트 후 마운트(KPA 패턴). create 경로는 직전 WO 그대로.
- **유지:** `?edit=` route·`updateForumPost` 호출·basePath/categorySlug redirect·contact 표시(복원). 
- **판단 포인트:** Neture update가 현재 `showContactOnPost` 미전송(edit contact 비영속) — 이 한계를 **그대로 둘지 / update payload에 포함해 영속화할지**를 WO에서 결정(후자는 백엔드 update 수용 확인 필요. 보수적으로는 현행 유지).
- **제외:** edit route 변경, GP/KCos edit 신설, KPA 수정(이미 정렬), backend/DB/route/menu.
- **검증:** shared/web-neture/(KPA·GP·KCos 무회귀) tsc + browser smoke(edit 폼 렌더, 실제 수정 저장은 최소).

---

## 12. 후속 WO 후보

| 우선 | WO 후보 | 옵션 | 내용 |
|:---:|--------|:---:|------|
| **1** | `WO-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1` | A | Neture edit → ForumWriteForm 전환 (KPA는 이미 정렬, 본 1차) |
| 2 | `WO-O4O-FORUM-EDIT-ROUTE-PARITY-V1` | B | edit 진입 방식 통일(KPA param ↔ Neture query) — detail CTA·router 정렬. 장기 |
| 3 | `WO-O4O-FORUM-GP-KCOS-EDIT-ENABLE-V1` | C | GP/KCos edit route + update API + detail CTA + 작성자 소유 권한 신설(정책 WO) |
| 4 | (선택) `WO-O4O-FORUM-NETURE-EDIT-CONTACT-PERSIST-V1` | — | Neture update payload에 showContactOnPost 포함(edit contact 영속화) |

> **착수 순서:** 후보 1(A) → 이후 필요 시 2(route)·3(GP/KCos 정책). 후보 4는 1과 합치거나 분리 선택.

---

## 13. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| 공통 모듈 변경 시 모든 소비처 영향 검토했는가 | **N/A(조사).** 단 1차 WO는 `ForumWriteForm` 무변경(이미 충분) → KPA/GP/KCos 무영향. Neture 1파일만 변경 예정 |
| route 없는 기능을 만들거나 실기능 route를 숨기지 않는가 | **충족.** Option A는 route 불변. GP/KCos edit 부재는 route·기능 모두 없는 일관 상태(데드링크 0) |
| create/edit 공통화가 유지보수성을 높이는가 | **YES.** edit form을 공통 폼으로 모으면 4서비스 write 축이 단일 폼 기준으로 수렴. KPA가 이미 검증 |
| 최소 변경·decide-don't-overask 원칙에 부합하는가 | **YES.** 실제 미정리분(Neture edit 1개)만 닫고, route 통일·GP/KCos 신설은 분리 |
| 서비스 고유 기능을 공통화로 훼손하지 않는가 | **충족.** KPA showStoreSave/showCommunitySave(editorProps)·Neture contact/min-length(renderExtra/renderContentMeta)는 슬롯으로 보존 가능 |
| backend/DB/route/menu를 불필요하게 건드리지 않는가 | **충족.** 1차 WO는 프론트 1파일. update API/route 무변경(contact 영속화는 선택적 별도 판단) |

**결론:** edit 축에서 실제 공통화 미정리분은 **Neture edit 단 1건**이다(KPA는 이미 `ForumWriteForm` 정렬, GP/KCos는 edit 미보유 = 의도된 create-only). 따라서 **Option A(form만 공통화, route 유지)** 로 Neture edit을 KPA 패턴에 맞춰 전환하는 것이 최소 비용·최대 정합이다. edit route 통일(B)·GP/KCos edit 신설(C)은 가치/비용이 분리되므로 별도 WO로 미룬다.

---

## 14. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1.md`)
- [x] 코드/UI/API/DB/migration/route 변경 없음 (read-only)
- [x] 4서비스 edit route 매트릭스 (§3)
- [x] KPA/Neture edit flow 판단 (§4·§5)
- [x] GP/KCos edit 부재 확인 (§6)
- [x] update API contract (§7)
- [x] ForumWriteForm edit 재사용 가능성 (§8)
- [x] route 통일 필요성 판단 (§9)
- [x] 권장 옵션 + 1차/후속 WO 후보 (§10~§12)
- [x] 다른 세션 WIP 미접촉 (§2)

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only). 본 IR 1개 문서만 생성. 다른 세션 WIP 미접촉.
- **생성 IR 경로:** `docs/investigations/IR-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1.md`
- **조사 기준 commit:** `b83a7ec449`
- **edit route 매트릭스:** KPA=전용 `/forum/edit/:id`(있음) · Neture=`?edit=`(있음) · GP=없음 · KCos=없음
- **KPA edit flow:** 정상 동작, **이미 공통 `ForumWriteForm` 사용**(create/edit 공용) — 추가 공통화 불필요
- **Neture edit flow:** 정상 동작하나 **edit만 레거시 inline form** — 유일한 미정리분
- **GP/KCos edit 부재 판단:** route·update API·detail CTA 모두 없음 = **의도된 create-only(정책)**, 누락 아님
- **update API contract:** KPA create=update 동일(HTML) · Neture update는 showContactOnPost 미포함(Block[]) · GP/KCos update 부재
- **ForumWriteForm edit 재사용:** **가능**(initial props로 충분, KPA가 검증). 신규 prop 불필요
- **권장 옵션:** **A(form만 공통화, route 유지)** — Neture edit를 KPA 패턴으로 전환
- **1차 WO 후보:** `WO-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1`(Neture edit → ForumWriteForm)
- **git status:** 내 변경 0(다른 세션 WIP만 존재, 미접촉)

---

*End of IR-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1*
