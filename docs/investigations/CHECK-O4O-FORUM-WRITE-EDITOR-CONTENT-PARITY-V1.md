# CHECK-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1

> **작업명:** WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1
> **유형:** forum write 공통화 선행 정렬 — KCos editor(textarea→RichTextEditor) + GP content format(HTML string→blocks)
> **결과: PASS — KCos textarea→RichTextEditor, GP content→blocks(htmlToBlocks) 정렬. 4서비스 write editor=RichTextEditor·content=blocks 통일. postType/create-only 유지, KPA/Neture 미수정.**
> 선행: `IR-O4O-FORUM-WRITE-POSTTYPE-POLICY-V1`(C/G) — 2026-06-12

---

## 1. 목적

forum write form 공통화 전, **KCos plain textarea → RichTextEditor**, **GP content HTML string → blocks** 정렬. shared ForumWriteForm 생성·postType 정책·edit route·detail 은 범위 밖.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `59f63d888`(IR 커밋 후) · origin 동기화 · staged 없음 · pnpm-lock/package.json clean |

다른 세션 WIP(미접촉): `CHECK-...-ORDER-VIEW-LOOP` 문서 M. path-specific 격리.

## 3. 정렬 기준 (KPA/Neture 패턴)

KPA/Neture write 의 canonical 패턴: `RichTextEditor`(@o4o/content-editor) `onChange={(c)=>setState(c.html)}` → submit `htmlToBlocks(html)`(@o4o/forum-core/utils) → content=Block[]. KCos/GP 를 이에 맞춤.

## 4. 적용 — K-Cosmetics (editor parity, C)

- `services/web-k-cosmetics/src/pages/forum/ForumWritePage.tsx`:
  - **textarea 제거**(`<textarea>` 0 확인) → **RichTextEditor**(value=content(html), onChange=content.html, minHeight 300, preset compact).
  - local `textToBlocks` 제거 → submit `htmlToBlocks(content)`.
  - content empty 검증: `!content.trim()` → html 기준(`content==='<p></p>' || strip(html).trim()===''`, GP 동일).
  - **postType select 유지**(POST_TYPES 5종), title/redirect/create-only 유지.
- `services/web-k-cosmetics/src/services/forumApi.ts`: `createForumPost.content: Array<{type,content}>|string` → `unknown[]|string`(htmlToBlocks Block[] 수용, string 호환).
- `package.json`: `@o4o/forum-core: workspace:*` 추가.

## 5. 적용 — GlycoPharm (content format, G)

- `services/web-glycopharm/src/pages/forum/ForumWritePage.tsx`:
  - RichTextEditor UI **유지**. submit `content: content`(html string) → **`content: htmlToBlocks(content)`**(blocks).
  - postType select·title·redirect·validation·create-only 유지.
- `services/web-glycopharm/src/services/forumApi.ts`: `createForumPost.content: string` → `unknown[]|string`.
- `package.json`: `@o4o/forum-core: workspace:*` 추가.

## 6. 의존성 / install

- GP/KCos 에 `@o4o/forum-core` workspace dep 추가(htmlToBlocks 사용 위함; 기존 미링크). `pnpm install` 로 symlink + lockfile 갱신.
- **pnpm-lock.yaml diff = forum-core link 2건만**(glycopharm-web·@o4o/web-k-cosmetics → link:../../packages/forum-core). 타 dep 변동 없음.
- forum-core dist/utils 기빌드(Neture 소비 중) — 런타임 import 안전.

## 7. 검증

- **TypeScript:** web-glycopharm · web-k-cosmetics · web-kpa-society · web-neture **각각 0 errors** ✅.
- **정적:**
  - KCos `<textarea>` 0, RichTextEditor + htmlToBlocks 사용 확인. content blocks 전송.
  - GP submit `htmlToBlocks(content)` 확인(html string 미전송).
  - **postType select 유지**(GP/KCos POST_TYPES), **create-only 유지**.
  - **KPA/Neture ForumWritePage 미변경**(git status 확인).
  - route/menu/backend/API/DB/migration 변경 없음. shared ForumWriteForm 미생성.
- **browser smoke:** 미수행 — dev 서버 미기동·인증 guard. write 는 인증·실데이터 write 라 production smoke 회피. editor/blocks 전환은 tsc + 정적(KPA/Neture 동일 패턴)으로 검증. (KCos editor UI 변경(textarea→rich)은 배포 후 렌더 확인 권장.)
- **무변경:** KPA/Neture · backend · route · postType 정책 · edit route · detail.

## 8. 완료 판정

**PASS.** KCos editor parity(textarea→RichTextEditor) + GP content blocks 정렬 완료. 4서비스 write 가 RichTextEditor·blocks 로 통일됨. postType/create-only 유지, KPA/Neture·backend 무변경, typecheck(4) 통과. **`WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1`(create-only, optional showPostType, 확장 slot) 진입 기반 확보.**

## 9. 후속

1. `WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1` — shared `ForumWriteForm`(title + RichTextEditor + optional showPostType + Neture contact/KPA storeSave slot), create-only.
2. `WO-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1` — edit route 통일(KPA param/Neture searchParam) + 공통 form edit.
3. (선택) browser smoke — KCos `/forum/write`(editor 렌더)·GP `/forum/write`(blocks payload).
4. (잔여) KCos `styles.textarea` 미사용(객체 property, tsc 무오류) — 선택적 cleanup.

---

*Date: 2026-06-12 · WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1 · KCos editor + GP content blocks 정렬 PASS. postType/create-only 유지. KPA/Neture·backend 무변경. editor UI 변경은 후속 smoke 권장.*
