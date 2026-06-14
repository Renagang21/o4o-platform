# CHECK-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1
> **선행:** IR-O4O-CONTENT-STANDARD-MODULE-CROSSSERVICE-ALIGNMENT-V1 · IR-O4O-CONTENT-ROUTE-LIVE-SURFACE-RECHECK-V1
> **작성:** 2026-06-14 · 기준 HEAD `6dcdf1f0e`
> **판정:** **PASS** (Phase 1 — 회원 작성 form shell 추출. GP/KCos 무변경. list/detail/search 는 Phase 2 분리)

---

## 1. 작업 개요

KPA `/content` 회원 작성형 콘텐츠 구조 중 **가장 핵심이자 가장 self-contained 한 작성 폼**을 service-neutral 순수 form shell `CommunityContentWriteShell` 로 추출(`@o4o/shared-space-ui`). **KPA 만 적용, GP/KCos route/화면 무변경.** `InstructorCourseFormShell`(LMS) 선례와 동일 패턴(API client 미 import, onSubmit 주입, 서비스 고유=slot).

> **범위 결정:** WO §11.2 는 list/write/detail/search/tag shell 을 "가능하면" 추출로 제시. 실제 코드 결합도 분석 결과 **write 폼이 가장 깨끗하게 분리 가능**(순수 form). list(ContentDocumentsPage)·detail(AppreciationPanel 등)은 `@o4o/ui` BaseTable·contentApi·assetSnapshotApi·AppreciationPanel 에 강결합 → 한 WO 에 묶으면 회귀 리스크 큼. 검증된 "1 shell / WO" 케이던스(InstructorCourseFormShell)에 따라 **Phase 1 = write shell**, list/detail/search 는 Phase 2 후속(§9).

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `6dcdf1f0e` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `6dcdf1f0e` |

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx` | **신규** — 순수 작성 form shell |
| `packages/shared-space-ui/src/index.ts` | shell + 타입 export |
| `services/web-kpa-society/src/pages/contents/ContentWritePage.tsx` | 580줄 → **~150줄** thin wrapper(shell 위임) |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend / DB / migration / API / route / menu / GP / KCos / Neture / package.json / pnpm-lock / Dockerfile / 기타 KPA 페이지.

## 4. 추출한 shell

`CommunityContentWriteShell`(@o4o/shared-space-ui `community/`):
- **순수 form UI** — 제목 / AI 보조 배너(+`AiContentModal`) / 본문(`RichTextEditor`) / 요약 / 태그(chip 입력) / 매장 가져가기 정책(radio) / 액션(취소·임시저장·공개). inline 스타일(KPA canonical 그대로 이식).
- **API client·router·toast 미 import** — 저장은 wrapper 주입 `onSubmit(values, status)`. shell 은 검증(제목 필수·태그 최소 1)·저장 진행(saving)·인라인 에러만 소유.
- **서비스 고유 = `guideSlot`** — KPA `GuideBlock` 를 wrapper 가 주입(shell 은 guide 내용 모름).
- **config 주입** — mode/requireTags/reusablePolicyField/aiBanner/라벨·placeholder.

```ts
CommunityContentWriteValues { title; body; summary; tags: string[]; reusablePolicy: 'platform'|'restricted' }
props: { initialValues?; config?; aiRequestHeaders?; guideSlot?; onSubmit(values,status); onCancel?; disabled? }
```

## 5. KPA wrapper 구조

```
ContentWritePage (KPA)
  ├─ guide fetch/state (KPA 고유) → guideSlot=<GuideBlock .../>
  ├─ edit 모드 contentApi.detail + 소유권 체크 → initialValues
  ├─ 인증 redirect
  ├─ aiRequestHeaders (KPA 토큰)
  ├─ onSubmit = contentApi.create/update + toast + navigate (content_type='information'/sub_type='content' 고정)
  └─ <CommunityContentWriteShell ... />  (page chrome: 제목 h1 + padding 만 유지)
```

- **loading 게이트**: 수정 모드는 `loading` 초기값 `isEditMode=true` → detail 로드 완료 후 shell mount(=초기값 1회 적용). 로드 전 빈 폼 mount 방지(shell 이 useState 로 initialValues 를 mount 시 1회만 읽는 문제 해소).

## 6. KPA 고유 요소 처리

| 고유 요소 | 처리 |
|-----------|------|
| GuideBlock(content.document.editor fetch) | **guideSlot 주입**(wrapper) |
| contentApi 저장 | **onSubmit 주입**(shell 미 import) |
| content_type='information' / sub_type='content' 고정 | wrapper payload 에서 고정 |
| 소유권 체크 / 인증 redirect / 라우팅 | wrapper |
| AppreciationPanel / LMS / survey | 본 WO 범위 밖(detail/list 페이지 — Phase 2) |

## 7. API / 제품 비종속 / GP·KCos

| 항목 | 결과 |
|------|------|
| API 통합 | ✅ 안 함 — shell 은 API 미 import, KPA 기존 contentApi 그대로(adapter=onSubmit) |
| 제품 비종속 | ✅ productId/제품 탭/필터/B2B·B2C 0 — shell·wrapper 모두 미도입 |
| GP/KCos route/화면 | ✅ **무변경**(shell 미소비) |
| 신규 패키지/dep/Dockerfile | ✅ 없음 — `@o4o/shared-space-ui` 기존 패키지(KPA 이미 소비, `@o4o/content-editor` 이미 의존, source-direct `main:src/index.ts` → dist 빌드 불요) |

## 8. 검증

| 항목 | 결과 |
|------|------|
| `@o4o/shared-space-ui` `tsc --noEmit` | ✅ PASS (exit 0) — shell 격리 컴파일 |
| `web-kpa-society` `tsc --noEmit` | ✅ PASS (exit 0) — wrapper + shell(source) 컴파일 |
| GP/KCos/Neture | shell 미 import → 영향 없음(추가-only export) |
| 기존 동작(작성/수정/검증/AI/RichText/저장/라우팅) | shell+wrapper 로 보존. **경미 정규화**: 검증/저장 실패 표시가 toast → **shell 인라인 에러**(자기완결 form 패턴, InstructorCourseFormShell 동일). 성공 toast·라우팅은 wrapper 유지 |
| 제품 UI 미추가 | ✅ |
| browser smoke | ⚠️ 라이브 미수행(배포 필요) — 권장: KPA `/content/documents/new`(작성: 제목/AI/본문/요약/태그/정책/임시저장·공개) · `/content/:id/edit`(수정 진입 시 기존값 prefill) |

## 9. 후속 작업 (Phase 2 + 표준 적용 라인)

| 후보 | 내용 |
|------|------|
| `WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1` | list(ContentDocumentsPage)·detail(ContentDetailPage)·SearchBar·TagList shell 추출(AppreciationPanel/BaseTable/copy-to-store slot 설계) |
| `IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1` | `/content`=회원 / browse=`/store-hub/content` 역할 재정의(GP 라이브 `/content` browse 충돌 입력) |
| `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` | GP `/library/content` alias 제거 + browse 이동 |
| `WO-O4O-GP/KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | GP/KCos 에 표준 모듈 적용(제품 go 후) — 본 shell 위에 |

> GP 는 라이브 `/content` 가 browse 점유 중 → GP/KCos 적용 전 route 역할 재정의 선행(IR-ROUTE-ROLE-REDEFINE).

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 추출 | `CommunityContentWriteShell`(@o4o/shared-space-ui) — 순수 form, onSubmit 주입, guideSlot |
| 적용 | KPA ContentWritePage thin wrapper(580→~150줄) |
| KPA 고유 | GuideBlock=slot, contentApi=onSubmit, 분류상수=wrapper |
| API/DB/route/menu | 무변경 |
| GP/KCos/Neture | 무변경 |
| 제품 비종속 | 유지 |
| 신규 패키지/dep/Dockerfile | 없음(기존 shared-space-ui) |
| TypeScript | shared-space-ui + web-kpa-society PASS |
| browser smoke | 라이브 보류(배포 필요) |
| 다른 세션 WIP | 미포함(path-specific) |
| 다음 | Phase 2(list/detail/search) → route 역할 재정의 → GP/KCos 적용 |
