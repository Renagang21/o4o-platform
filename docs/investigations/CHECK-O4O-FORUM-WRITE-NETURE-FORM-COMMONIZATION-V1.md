# CHECK-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1
> **선행:** WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1 (KPA/GP/KCos 완료)
> **작성:** 2026-06-13
> **판정:** **PASS** (create-only, edit 미변경)

---

## 1. Neture 적용 방식

Neture forum **create** 경로를 공통 `ForumWriteForm` 으로 전환하고, **edit** 경로는 기존 inline form 을 그대로 유지(분기)했다.

- `ForumWritePage` 의 return 을 `isEditMode ? (기존 inline <form>) : (<ForumWriteForm .../>)` 로 분기.
- 외곽 chrome(breadcrumb / header / notice 배너 / error 배너 / container)은 두 모드 공통으로 유지.
- create 제출은 신규 `handleCreateSubmit(payload)` 가 담당 — 기존 흐름(`htmlToBlocks` → `createForumPost` → basePath redirect, contact payload) 을 **그대로 보존**.
- edit 제출은 기존 `handleSubmit` 그대로(미변경).

> 데이터 흐름 정책: 본 WO 는 "기존 create API 호출 유지 / backend 무변경" 범위이므로, 선행 3서비스가 raw HTML 을 보내는 것과 달리 **Neture 는 기존대로 `htmlToBlocks(editorHtml)` → `content: Block[]`** 을 유지했다. `ForumWriteForm` 은 raw `editorHtml` 을 payload 로 넘기고, **변환은 Neture wrapper(handleCreateSubmit)에서** 수행한다. 따라서 공통 폼은 여전히 forum-core-free 이고, forum-core 의존(`htmlToBlocks`)은 Neture 페이지에만 남는다(기존 상태 유지, backend payload 형태 무변경).

## 2. ForumWriteForm 추가 prop/slot 여부

- **추가 prop: 1개** — `renderContentMeta?: (state: { html: string; textLength: number }) => ReactNode`
  - 에디터 바로 아래 렌더. 폼 내부 `editorHtml` 을 인자로 live 호출 → Neture charCount/최소길이 안내 재현용.
  - **optional, default 미지정 → 미노출.** 기존 소비처(KPA/GP/KCos)는 미전달 → **렌더/동작 무변화**(web-glycopharm tsc PASS 로 확인).
- contactSection 은 **기존 `renderExtra` 슬롯**으로 주입(신규 prop 불필요).
- min-length **validation** 은 wrapper `handleCreateSubmit` 에서 처리(폼에 validation prop 추가하지 않음).
- `index.ts` export 변경 **불필요** — `ForumWriteForm`/`ForumWriteFormProps`/`ForumWriteFormPayload` 이미 export 됨. 신규 prop 은 `ForumWriteFormProps` 에 포함되어 자동 노출.

## 3. contactSection 유지 결과

✅ 유지. create 에서는 `renderExtra` 로 주입(`hasContactInfo ? 연락정보 표시 checkbox : 연락 설정 prompt`). `showContactOnPost` state · `fetchUserContactSettings` · `createForumPost({ showContactOnPost })` payload 모두 보존. edit inline form 의 contact 블록은 미변경.

## 4. min-length / notice 유지 결과

✅ 유지.
- **notice 배너**("이 포럼은 상품 홍보나 고객 문의를 위한 공간이 아닙니다…"): 폼 외곽 chrome 으로 두 모드 공통 유지.
- **최소 길이 안내**: `contentLabel="내용 (최소 5자)"` + `renderContentMeta` 의 live charCount/"(최소 N자 더 필요)" 경고로 재현.
- **최소 길이 validation**: `handleCreateSubmit` 에서 stripped-text length < `MIN_CONTENT_LENGTH(5)` 면 error 후 중단.
  - 참고: 기존 inline 은 `editorHtml.length`(HTML 길이) 기준이었으나, create 경로는 **stripped text 길이** 기준으로 통일(보다 합리적). 임계값(5)·동작 의도는 동일하게 유지.

## 5. basePath / categorySlug 유지 결과

✅ 유지. `handleCreateSubmit` 가 `backPath`(basePath) 로 redirect base 계산, `categorySlug` 를 createForumPost 에 전달, `postSegment` 로 detail path 구성. supplier/partner/user route 경계는 `ForumWritePage` props(`categorySlug`/`backPath`/`postSegment`)로 그대로 흐름.

## 6. edit route 미변경 확인

✅ edit branch(`isEditMode`)는 기존 inline form + 기존 `handleSubmit`/`updateForumPost` 그대로. `?edit=` param 처리, `loadPostForEdit`, edit redirect 모두 미변경. edit route parity 작업 미수행(범위 외).

## 7. KPA / GP / KCos 무회귀 확인

✅ 무회귀.
- 변경 파일에 KPA/GP/KCos write page **없음**(git diff 로 확인 — 내 변경은 `ForumWriteForm.tsx` + Neture `ForumWritePage.tsx` 2개뿐).
- `ForumWriteForm` 신규 prop 은 optional·default-off → 기존 3서비스 미영향.
- web-glycopharm tsc **PASS**(ForumWriteForm 을 source 로 컴파일하며 0 error).

## 8. TypeScript 검증 결과

| 패키지 | 결과 |
|--------|------|
| shared-space-ui (ForumWriteForm) | ✅ forum 관련 error 0 |
| web-neture | ✅ PASS (0 error) |
| web-glycopharm | ✅ PASS (0 error) |
| web-kpa-society | ⚠️ forum error 0 — 단, `packages/store-ui-core/.../b2b-catalog/B2BCatalogHub.tsx` 의 **미빌드 @o4o/* dist** 환경 error 만 존재(아래 주) |
| web-k-cosmetics | ⚠️ 동일 (b2b-catalog 환경 error 만) |

> **b2b-catalog error 주:** `@o4o/error-handling`·`@o4o/ui`·`@o4o/operator-ux-core` Cannot find module(TS2307) + 그에 따른 implicit any. 전부 병합 커밋 `a1c5df4a8`(다른 세션 "B2BCatalogHub 공통 추출")의 코드이며, 해당 패키지 dist 미빌드(local stale)에서 비롯된 **환경 문제**다. 본 WO diff 는 `store-ui-core` 를 전혀 건드리지 않으므로 forum 변경과 무관하며 pre-existing 이다. (해소는 `pnpm build:packages`/해당 패키지 dist 재빌드 — 별도 영역.)

## 9. browser smoke 여부

✅ 수행(제출 없음).
- `/forum/write` 미인증 → 로그인 요구 뷰 렌더(모듈/ForumWriteForm import 런타임 error 0).
- `sohae2100@gmail.com`(Neture) 로그인 후 → **create 폼이 ForumWriteForm 기반으로 정상 렌더**:
  제목 input · RichTextEditor · "내용 (최소 5자)" 안내 · live charCount("0자") · contactSection · 등록하기 버튼 · notice 배너 모두 확인.
- **등록(제출) 미수행** — 실제 글 생성 금지 준수.
- supplier/partner basePath write route 는 동일 `ForumWritePage` 컴포넌트(props 차이)로 같은 create 경로를 타므로 코드 경로상 동일 보장.

## 10. backend / API / DB / migration / route / menu 변경 없음 확인

✅ 변경 없음. 본 WO diff = `packages/shared-space-ui/src/ForumWriteForm.tsx` + `services/web-neture/src/pages/forum/ForumWritePage.tsx` 2개 프론트 파일뿐. backend/API/DB/migration/route/menu/postType 정책 무변경.

> **커밋 격리 주의:** 작업 중 다른 세션이 `apps/api-server/src/modules/lms/services/*.ts`(Course/Lesson/Quiz/RewardPolicy) 4파일을 동시 수정 중이었다. 이는 다른 세션 WIP 이므로 **건드리지 않고 커밋에서 제외**(path-specific commit).

## 11. 후속 후보

- `WO-O4O-FORUM-WRITE-EDIT-ROUTE-PARITY-V1` — 4서비스 edit 경로 공통화(현재 Neture edit 은 inline 유지).
- forum detail shared parts 공통화.
- (선택) Neture create 도 raw HTML 전송으로 전환해 forum-core(`htmlToBlocks`) 의존 제거 — backend normalizeContent 검증 후 별도 WO.
- (환경) `store-ui-core` b2b-catalog dist 미빌드 error 해소(별도 영역).

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| Neture create → ForumWriteForm | ✅ |
| edit 미변경 | ✅ |
| 추가 prop | renderContentMeta 1개(optional, default-off) |
| contactSection | ✅ renderExtra 유지 |
| min-length/notice | ✅ 유지 |
| basePath/categorySlug | ✅ 유지 |
| KPA/GP/KCos 무회귀 | ✅ |
| backend/API/DB/route/menu | 무변경 |
| TypeScript | web-neture/GP/shared PASS, KPA/KCos 는 무관한 b2b-catalog 환경 error 만 |
| browser smoke | ✅ 폼 렌더 확인(제출 없음) |
| 다른 세션 WIP | LMS 4파일 미포함 |
