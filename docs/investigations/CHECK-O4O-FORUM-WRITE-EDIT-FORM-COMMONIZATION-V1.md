# CHECK-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-FORUM-WRITE-EDIT-FORM-COMMONIZATION-V1
> **선행 IR:** IR-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1 (`46edaa55d`)
> **작성:** 2026-06-13
> **판정:** **PASS** (Neture edit → ForumWriteForm 통합, route/payload 불변)

---

## 1. Neture edit 적용 결과

Neture `ForumWritePage` 의 create/edit 두 분기를 **단일 공통 `ForumWriteForm`** 으로 통합했다.

- 기존: `{isEditMode ? (<inline <form>>) : (<ForumWriteForm create/>)}`
- 변경: 단일 `<ForumWriteForm>` — `isEditMode` 로 `initialTitle`/`initialContentHtml`(edit 시 로드값)·`submitLabel`·`submittingLabel`·`onSubmit` 만 분기.
- legacy inline `<form>`(title input·RichTextEditor·charCount·contact·actions) **완전 제거**.
- create 경로는 동일 폼·동일 props(`!isEditMode`)로 **동작 불변**.
- KPA 가 이미 쓰는 패턴(loading gate 후 마운트 → initial props 주입)과 동일하게 정렬.

**제거된 코드(미사용화):** `RichTextEditor` import(폼 내부에서만 쓰던 직접 사용 제거), `isSubmitting` state, `isFormValid`, 구 `handleSubmit`(edit inline 제출). **추가:** `handleUpdateSubmit(payload)`.

## 2. ForumWriteForm 신규 prop 필요 여부

- **없음.** `ForumWriteForm` 무수정. IR 판단대로 `initialTitle`/`initialContentHtml` + 기존 슬롯(`renderExtra`/`renderContentMeta`)으로 edit 재사용 충분.
- `packages/shared-space-ui/src/ForumWriteForm.tsx` 변경 0 (git diff 미포함 확인).

## 3. `?edit=` route 유지 확인

✅ 유지. `searchParams.get('edit')` → `editPostId` → `isEditMode` 그대로. detail "수정" CTA(`${basePath}/write?edit=${id}`)·router 무변경. browser smoke 에서 `/forum/write?edit=<slug>` 진입·렌더 확인.

## 4. updateForumPost payload 유지 확인

✅ 유지. `handleUpdateSubmit` 가 기존과 동일 payload 전송:
`updateForumPost(editPostId, { title, content: htmlToBlocks(editorHtml), categorySlug })`.
**`showContactOnPost` 미포함** — 기존 update 흐름 그대로(아래 §6 한계 참조). content 변환(`htmlToBlocks` → Block[])·basePath redirect(`${base}/${postSegment}/${slug}`) 보존.

## 5. contactSection 유지 결과

✅ 유지. create/edit 공통 `renderExtra` 로 contact UI 주입(`hasContactInfo ? 연락 정보 표시 checkbox : 연락 설정 prompt`). edit 진입 시 `showContactOnPost` 복원값으로 checkbox 렌더(browser smoke 확인). `fetchUserContactSettings`·`showContactOnPost` state 보존.

## 6. contact edit 영속화 한계

⚠️ **기존 한계 유지(의도).** update payload 에 `showContactOnPost` 가 없어 **edit 에서 contact 표시 토글 변경은 저장되지 않는다**. 이는 본 WO 이전부터의 동작이며(구 inline edit 도 동일), WO 범위상 backend/payload 확장은 하지 않았다. 영속화가 필요하면 별도 `WO-O4O-FORUM-NETURE-EDIT-CONTACT-PERSIST-V1`(update payload + 백엔드 수용)로 분리.

## 7. min-length / notice 유지 결과

✅ 유지.
- notice 배너("이 포럼은 상품 홍보나 고객 문의를 위한 공간이 아닙니다…"): 폼 외곽 chrome 으로 create/edit 공통 유지.
- min-length 안내: `contentLabel="내용 (최소 5자)"` + `renderContentMeta` live charCount/"(최소 N자 더 필요)".
- min-length validation: `handleUpdateSubmit`/`handleCreateSubmit` 에서 stripped-text < `MIN_CONTENT_LENGTH(5)` 면 중단.
- browser smoke 에서 edit 진입 시 "내용 (최소 5자)"·notice 렌더 확인.

## 8. KPA / GP / KCos 미수정 확인

✅ 미수정. git diff 결과 변경 파일에 `web-kpa-society/.../forum/*`·`web-glycopharm/.../forum/*`·`web-k-cosmetics/.../forum/*`·`shared-space-ui/.../ForumWriteForm.tsx` **없음**. 내 변경 = `services/web-neture/src/pages/forum/ForumWritePage.tsx` 1파일.

> KPA 는 IR 기준 이미 `ForumWriteForm` 사용(추가 작업 불필요), GP/KCos 는 의도된 create-only(edit 미보유) — 본 WO 범위 밖이므로 무변경.

## 9. backend / API / DB / migration / route / menu 변경 없음 확인

✅ 변경 없음. 내 변경 = 프론트 1파일. `updateForumPost`/route/menu/postType/backend/DB 무변경. contact 영속화 backend 확장 미수행(§6).

> **커밋 격리:** 작업 중 다른 세션이 다수 파일(`apps/api-server/.../contact*`, `kpa contact-request.controller`, `web-glycopharm/web-k-cosmetics education·mypage`, `web-neture App.tsx·operatorMenuGroups.ts·web-kpa AdminRoutes` 등)을 동시 수정 중이었다. 모두 다른 세션 WIP 이므로 **건드리지 않고 커밋에서 제외**(path-specific commit, ForumWritePage.tsx + 본 CHECK 만).

## 10. TypeScript 검증 결과

| 패키지 | 결과 |
|--------|------|
| web-neture | ✅ PASS (0 error) |
| shared-space-ui (ForumWriteForm) | ✅ 무수정 (변경 없음) |
| web-kpa-society / web-glycopharm / web-k-cosmetics | **미수정 확인**(forum/shared 미변경). 워킹트리에 다른 세션 WIP 다수 존재하여 전체 tsc 는 무관한 노이즈 → 변경 격리(diff)로 무회귀 확인 |

## 11. browser smoke 여부

✅ 수행(제출 없음).
- create: `/forum/write` 로그인 상태 → 단일 ForumWriteForm 으로 정상 렌더("의견 남기기"·등록하기·최소 5자·contact·0자·notice) — 통합이 create 무회귀.
- **edit:** `/forum/write?edit=forum-purpose-and-scope` → **게시글 수정** 헤더·**수정하기** 버튼·**제목 초기값 로드**("이 포럼은 무엇을 위한 공간인가")·**본문 초기값 로드**(에디터 콘텐츠)·contact·최소 5자·notice 렌더, 에러 없음.
- **수정 저장(제출) 미수행** — 실제 글 mutation 금지 준수.

## 12. 후속 후보

| WO 후보 | 내용 |
|--------|------|
| `WO-O4O-FORUM-NETURE-EDIT-CONTACT-PERSIST-V1` | edit update payload 에 showContactOnPost 포함(영속화) + 백엔드 수용 |
| `WO-O4O-FORUM-EDIT-ROUTE-PARITY-V1` | edit 진입 방식 통일(KPA param ↔ Neture query) — 장기 |
| `WO-O4O-FORUM-GP-KCOS-EDIT-ENABLE-V1` | GP/KCos edit route+update API+detail CTA 신설(정책) |
| (다음 축) forum detail shared parts 공통화 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| Neture edit → ForumWriteForm | ✅ (create/edit 단일 폼 통합) |
| ForumWriteForm prop 변경 | 없음(무수정) |
| `?edit=` route 유지 | ✅ |
| update payload 유지 | ✅ (showContactOnPost 미포함, 기존과 동일) |
| contactSection 유지 | ✅ (renderExtra) |
| contact edit 영속화 한계 | ⚠️ 기존 한계 유지(별도 WO) |
| min-length/notice 유지 | ✅ |
| KPA/GP/KCos 미수정 | ✅ |
| backend/API/DB/route/menu | 무변경 |
| TypeScript | web-neture PASS, shared/KPA/GP/KCos 미변경 |
| browser smoke | ✅ create+edit 렌더·초기값 로드 확인(제출 없음) |
| 다른 세션 WIP | 미포함(path-specific) |
