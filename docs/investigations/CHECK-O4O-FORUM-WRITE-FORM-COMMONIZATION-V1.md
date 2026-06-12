# CHECK-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1

> **작업명:** WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1
> **유형:** forum write CREATE 화면 공통화 — shared `ForumWriteForm` 도입 + GP / KCos / KPA 적용
> **결과: PASS — `@o4o/shared-space-ui` ForumWriteForm 신설, GlycoPharm / K-Cosmetics / KPA write 를 공통 폼 기반으로 전환. create-only. Neture 는 이번 범위 제외(사유 §6). typecheck(5) 0 errors.**
> 선행: `WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1`(PASS) — 2026-06-12

---

## 1. 목적

4서비스 forum write CREATE 화면을 shared `ForumWriteForm` 으로 공통화한다. **create-only.** edit route parity / edit form 공통화 / detail page / postType 정책 변경은 범위 밖.

## 2. 사전 git 상태 · 동시 세션 좌표

| 항목 | 값 |
|------|------|
| branch | `main` · 작업 base `87d6515` |
| HEAD(커밋 시점) | `649f167` — 동시 세션(동일 Opus 4.8)이 forum-core Docker 정합 커밋 3건 선행 |

**동시 세션 선행 커밋 (working dir 공유):**
- `32e429f` remove unused forum-core dep from GP/KCos (unblock Docker)
- `efb26a4c` **add forum-core+organization-core to GP/KCos Docker build (restore dep)** — GP/KCos Dockerfile 이 `packages/forum-core` 를 COPY 하도록 수정 + dep 복구
- `649f167` CHECK(CONTACT-AUTO-REPLY) + forum-core Docker build-fix note

**격리:** 동시 세션 WIP(`CHECK-...-ORDER-VIEW` M, `IR-*` untracked, PNG, c:tmp script)은 path-specific 커밋으로 미접촉.

## 3. 핵심 설계 결정 — ForumWriteForm 은 forum-core 의존 없음

초기 설계는 폼이 `htmlToBlocks(editorHtml)` 로 `content: Block[]` 변환하는 안이었으나, 다음 근거로 **forum-core 미의존(HTML string 전송)** 으로 확정:

1. **백엔드가 이미 정규화한다.** `apps/api-server/src/controllers/forum/ForumPostController.ts` create(L262) / update(L369) 가 `normalizeContent(content)` 호출 → HTML string 을 `htmlToBlocks` 로 **Block[] 서버측 정규화**. 프론트 변환은 중복.
2. **Docker 의존 surface 최소.** shared-space-ui 는 GP/KCos/KPA/Neture 외 다수 소비처를 가진 중앙 UI 패키지. 여기에 forum-core 를 의존시키면 **모든 소비처 Dockerfile 이 forum-core+organization-core 를 COPY** 해야 하는 광범위한 빌드 위험이 생긴다. forum-core-free 면 이 위험이 0.
3. **아키텍처 정합.** 공통 UI 폼이 forum domain core 에 의존하지 않는 것이 계층상 깨끗하다.

→ `ForumWriteForm` payload = `{ title, editorHtml, type? }`. content 변환 안 함. 저장 결과(Block[])는 백엔드 정규화로 **무회귀**.

## 4. 신설 — `packages/shared-space-ui/src/ForumWriteForm.tsx`

순수 표현 컴포넌트. **API client / router / 백엔드 route / 서비스 role helper / forum-core 미 import.**

- 자체 상태: `title` / `editorHtml` / `postType` / `submitting`.
- 구성: (선택)postType select + 제목 input + `RichTextEditor`(@o4o/content-editor) + (선택)`renderExtra` 슬롯 + 액션(cancel/submit).
- 빈 입력 검증: title trim + html 기준(`'<p></p>'` / strip-tags) → `onInvalid('title'|'content')` 콜백(서비스별 toast 매핑).
- `editorProps?: Partial<Omit<ContentEditorProps,'value'|'onChange'>>` — KPA 의 `aiRequestHeaders` / `showCommunitySave` / `showStoreSave` 전달 통로.
- theme: `'blue'|'emerald'|'pink'|'primary'` accent + `submitColor` override(KPA `colors.primary`).
- `initialTitle/initialContentHtml/initialType` — edit 재사용 대비(KPA create/edit 공용 form body). create-only 범위지만 form body 자체는 create/edit 무관.
- export: `index.ts` 에 `ForumWriteForm` + 타입 5종.

## 5. 적용 (create-only)

| 서비스 | theme | postType | 특이 | content 전송 |
|--------|-------|:--------:|------|------|
| **GlycoPharm** | emerald | ✅(한글 5종) | preset compact | `payload.editorHtml`(HTML string) |
| **K-Cosmetics** | pink | ✅(영문 5종) | preset compact | `payload.editorHtml` |
| **KPA** | primary(override) | ❌ | PageHeader/Card/authorInfo wrapper 유지 · `editorProps`(ai/community/store save) · create+edit wrapper 분기 유지 · 404/403/401 에러 매핑 | `payload.editorHtml` |

- 각 wrapper: authorInfo/PageHeader/breadcrumb/로그인 가드 등 **서비스 chrome 은 wrapper 에 유지**, 폼 body 만 ForumWriteForm 으로 치환.
- KPA: `useParams id` 기반 create/edit 분기, edit 초기값 로드(`forumApi.getPost` → `blocksToHtml` → `initialContentHtml`)는 wrapper 에 유지. 제출은 `handleSave(payload)` 가 create/update 분기. **edit route 변경 없음**(범위 밖).
- KCos: textarea 제거 잔재 없음(선행 parity WO 에서 완료). stale JSDoc 헤더 정리.
- GP: stale JSDoc 헤더 정리.

## 6. Neture 제외 사유

Neture write(`services/web-neture/src/pages/forum/ForumWritePage.tsx`)는 form body 내부에 **live charCount(editorHtml 길이 표시) + 최소길이 inline 경고 + contact 체크박스(fetch settings 파생) + notice 배너 + loginModal flow** 가 얽혀 있어, "폼이 title/editorHtml 상태를 소유" 하는 공통 모델과 충돌(charCount 는 parent 가 editorHtml 을 실시간 참조해야 함). 무리한 치환은 검증/경고 UX 변경 위험. **후속 `WO-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1`** 로 분리(`renderExtra` + content-change 콜백 확장 검토). Neture 파일 **무변경**.

## 7. 검증

- **TypeScript 0 errors:** `packages/shared-space-ui` · `services/web-glycopharm` · `services/web-k-cosmetics` · `services/web-kpa-society` · `services/web-neture`(소비처 회귀 확인) **각각 0**.
- **정적:**
  - 3 wrapper 모두 `ForumWriteForm` 사용, 직접 `RichTextEditor` import 0(GP/KCos 의 "RichTextEditor" 매치는 JSDoc 주석뿐).
  - KPA `showStoreSave/showCommunitySave/aiRequestHeaders` 보존(editorProps 경유).
  - `ForumWriteForm` forum-core import 0(주석 3건은 설계 근거 설명).
  - `shared-space-ui/package.json` · `pnpm-lock.yaml` **무변경**(forum-core 의존 미도입 — 초기 시도 후 되돌림).
  - Neture / backend / route / menu / postType 정책 / edit route / detail **무변경**.
- **browser smoke:** 미수행 — dev 서버 미기동 · 인증 guard · production write. tsc + 정적(KPA/Neture 동일 RichTextEditor 패턴) + 백엔드 normalizeContent 경로로 검증. (배포 후 GP/KCos/KPA `/forum/write` 작성·저장 렌더 확인 권장.)

## 8. 관찰 / 잔여

1. **GP/KCos forum-core dep 미사용화:** 본 변경으로 GP/KCos write page 가 forum-core 를 직접 import 하지 않게 됨(폼이 변환 안 함). GP/KCos `package.json` 의 `@o4o/forum-core` 는 현재 다른 사용처 없음 → **unused dep**. 단 동시 세션이 `efb26a4c`(Dockerfile COPY + dep restore)로 의도적으로 복구한 직후이며, dep 존재+Dockerfile COPY 상태에서 빌드는 정상(unused 는 빌드 오류 아님). **인프라/타 세션 영역 충돌 회피 위해 GP/KCos package.json·Dockerfile 미접촉.** 정리 여부는 별도 판단(후속).
2. **잔여 unused 스타일 키:** GP/KCos/KPA wrapper 의 form-body 용 inline style 키(form/field/label/input/select/actions/buttons)는 폼 이관으로 미사용(객체 property, tsc 무오류). 선택적 cleanup.
3. KPA wrapper 의 `title`/`editorHtml` state 는 edit 초기값 버퍼로만 사용(폼 마운트=로딩 게이트 이후 initial* 전달).

## 9. 완료 판정

**PASS.** shared `ForumWriteForm`(forum-core-free, 백엔드 정규화 활용) 신설 + GP/KCos/KPA write CREATE 공통화. create-only, Neture 제외(후속), backend/route/postType 정책/edit route 무변경, typecheck(5) 통과. shared-space-ui 의존 그래프 무변경(Docker 위험 0).

## 10. 후속

1. `WO-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1` — Neture write 공통화(charCount/contact/notice 슬롯·content-change 콜백 확장).
2. `WO-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1` — edit route 통일(KPA param `/forum/edit/:id` · Neture `?edit=`) + 공통 폼 edit.
3. (선택) GP/KCos forum-core unused dep 정리 판단(인프라 영향 포함, 동시 세션 정합 후).
4. (선택) wrapper 잔여 form-body 스타일 키 cleanup.
5. (선택) browser smoke — GP/KCos/KPA `/forum/write` 작성·저장.

---

*Date: 2026-06-12 · WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1 · ForumWriteForm(create-only, forum-core-free) 신설 + GP/KCos/KPA 적용 PASS. Neture 후속. backend/route/postType/edit 무변경. typecheck(5) 0.*
