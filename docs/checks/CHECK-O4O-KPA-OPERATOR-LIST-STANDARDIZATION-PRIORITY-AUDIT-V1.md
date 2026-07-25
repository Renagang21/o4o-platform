# CHECK-O4O-KPA-OPERATOR-LIST-STANDARDIZATION-PRIORITY-AUDIT-V1

> WO: KPA 운영자 목록 화면 7개의 **DataTable/Pagination/ActionBar 표준화 우선순위 감사** +
> 1순위 화면이 기존 API·표준 컴포넌트만으로 안전하게 정비 가능하면 **해당 화면까지 구현**.
> 표준 정의: `DataTable` + `defineActionPolicy`/`buildRowActions` + `RowActionMenu` + `ActionBar`/`useBatchAction`/`BulkResultModal` (`@o4o/operator-ux-core` · `@o4o/ui`).
> 페이지네이션은 표준 페이지도 **수동 이전/다음**을 쓴다(별도 `Pagination` 컴포넌트 미사용) — 이 관행을 표준으로 유지.

---

## 1. 감사 — 화면별 구조 (7개)

| # | 화면 | 파일 | 구조 | 서버 페이지네이션 | 표준 여부 |
|---|------|------|------|:---:|:---:|
| 1 | 매장 HUB 블로그 | `operator/blog/OperatorBlogListPage.tsx` | DataTable + policy + ActionBar 일괄 | ✅ (`meta.total`) | ✅ 표준 |
| 2 | 매장 HUB POP | `operator/pop/OperatorPopListPage.tsx` | DataTable + policy + ActionBar 일괄 | ✅ | ✅ 표준 |
| 3 | 매장 HUB QR | `operator/qr/OperatorQrListPage.tsx` | DataTable + policy + ActionBar 일괄 | ✅ | ✅ 표준 |
| 4 | 매장 HUB 동영상 | `operator/video/OperatorVideoListPage.tsx` | DataTable + policy + ActionBar 일괄 | ✅ | ✅ 표준 |
| **5** | **매장 HUB 다국어 상품 콘텐츠** | `operator/multilingual-product-content/OperatorMultilingualContentListPage.tsx` | **수동 `<table>` + 인라인 버튼** | ✅ (`meta.total` 이미 존재) | ❌ → **본 WO 정비** |
| 6 | 매장 HUB 태블렛 화면 세트 원본 | `operator/tablet/OperatorTabletScreenSetsPage.tsx` | 수동 `<table>`, 페이지네이션 없음 | ❌ (전량 반환) | ❌ 비표준 |
| 7 | 판매자 모집 노출 승인 | `operator/RecruitmentExposureApprovalPage.tsx` | `RecruitmentExposureConsole` wrapper (카드형 큐) | — | ⚠️ 의도적 비목록 |

검증(grep): 1~4 = `DataTable`+`defineActionPolicy` 존재·raw `<table>` 0 / 5·6 = raw `<table>` 존재·`DataTable` 0(정비 전) / 7 = 둘 다 0(콘솔 wrapper).

## 2. 우선순위 (1–7)

1. **#5 다국어 상품 콘텐츠 (본 WO 구현 대상)** — 비표준(수동 table)이면서 **서버 페이지네이션 API(`listOperatorMlcGroups` → `meta.total`)가 이미 존재**하고, 상태·HUB 노출·발행 언어 등 정보량이 많아 표준화 가치가 가장 크며 신규 백엔드 0으로 안전.
2. **#6 태블렛 화면 세트 원본** — 비표준이나 데이터 소량·서버 페이지네이션 없음. 표준화하려면 리스트 API에 `page/limit/total` 추가(백엔드 변경 수반) → 별도 WO.
3. **#7 판매자 모집 노출 승인** — `RecruitmentExposureConsole` 기반 **의도적 카드형 큐**(승인 워크플로 UX). 목록 테이블 표준 대상 아님. 표준화 불필요(현행 유지 판정).
4–7. #1~#4 (blog/pop/qr/video) — **이미 표준**. 조치 불필요.

> 요약: 실질 표준화 대상은 #5·#6 둘뿐이고, 그중 신규 API 없이 안전한 #5 를 본 WO 에서 구현. #6 은 백엔드 페이지네이션 선행 필요로 후속.

## 3. 구현 — #5 표준화 (OperatorMultilingualContentListPage)

`OperatorBlogListPage` 패턴을 **그대로 미러**(삭제 API 없는 다국어 특성만 반영):

| 항목 | 변경 |
|------|------|
| 렌더 | 수동 `<table>`/`<thead>`/`<tbody>` → `DataTable<OperatorMlcGroup>` (`selectable`, `selectedKeys`, `tableId="operator-mlc-list"`) |
| 행 액션 | 인라인 아이콘 버튼 → `RowActionMenu` + `buildRowActions(mlcActionPolicy, …)` |
| 액션 정책 | `defineActionPolicy('kpa:operator-mlc', { inlineMax:2, rules:[edit, publish(visible !=published), archive(visible !=archived, confirm)] })` — **삭제 없음**(다국어 삭제 API 부재) |
| 일괄 | `ActionBar` + `useBatchAction` + `BulkResultModal`. 일괄 발행/일괄 보관(기존 단건 API `publish`/`archive` client-side fan-out, `Promise.allSettled`) |
| 컬럼 | 제목(Languages 아이콘+제목 클릭 이동) · HUB 노출 pill · 상태 pill · 발행 언어 · 수정일 · 작업 — **기존 6컬럼 정보 전부 보존** |

### 불변 보존 (다국어 고유)
- **발행 전 가드**: `publishedLocales(g).length===0` 이면 발행 차단 + 동일 toast 문구("발행된 언어 페이지가 없습니다…") — 단건·일괄 모두 적용(일괄은 발행 후보 필터 `status!=='published' && publishedLocales>0`).
- **HUB 노출 판정**(`hubVisibility`) 및 pill 라벨/색 불변.
- **보관 confirm 문구**("보관 처리하면 매장 HUB 에서 더 이상 노출되지 않습니다…") 불변(정책 confirm 으로 이동).
- 상태 필터(전체/초안/발행/보관), 수동 페이지네이션, 헤더/카피 불변.

### route/권한/기능 무변경 확인
- route `/operator/multilingual-product-contents` 및 `/new`·`/:id` 이동 경로 불변.
- backend API(`listOperatorMlcGroups`/`publishOperatorMlcGroup`/`archiveOperatorMlcGroup`) **호출 시그니처·엔드포인트 불변**(신규 API 0).
- 권한: RoleGuard/backend 그대로. UI 만 교체.
- 기능 델타 = **일괄 발행/보관 추가**(선택 체크박스). 단건 동작·판정·문구는 동일.

## 4. 검증

| 항목 | 결과 |
|------|------|
| web-kpa-society typecheck (`tsc --noEmit`) | ✅ 전체 **0 errors** |
| 대상 파일 오류 | ✅ 0 |
| vite build | ✅ **exit 0** (`OperatorRoutes` 청크 정상 빌드, 11.4s) |
| raw `<table>` 잔존 | ✅ 0 (grep 1건은 JSDoc 코멘트 문자열 "수동 `<table>`") |
| deploy-kpa-society (Cloud Run) | ✅ success (run 59bb84df5, 타 서비스 정상 skip) |
| 운영 smoke (operator 브라우저, 프로덕션) | ✅ **PASS** — 아래 §운영 smoke |

### 운영 smoke (2026-07-25, kpa-society.co.kr, operator sohae2100) — ✅ PASS
`/operator/multilingual-product-contents` 라이브 검증:
1. **DataTable 렌더** ✅ — 선택 체크박스(header+rows) · 정렬 컬럼(제목▴/수정일▴) · 시스템 작업 컬럼 · 5행 정상.
2. **RowActionMenu(행 액션)** ✅ — 초안행=수정·발행 인라인 + **더보기 오버플로우에 보관**(inlineMax=2) / 보관행=수정·발행만(archive `visible !=archived` 로 hidden → 오버플로우 없음). 더보기 클릭 시 보관 액션 노출 확인.
3. **일괄 ActionBar** ✅ — 전체선택 "5개 선택" → **"일괄 발행 (3)"**(발행 후보가 `publishedLocales>0 && status!=published` 정확 반영: 0-locale 2행 제외) · **"일괄 보관 (2)"**(미보관 초안 2행만, 보관 3행 제외). 후보 카운트로 발행 전 가드·상태 필터 로직 실증.
4. **상태 필터** ✅ — "보관" 클릭 → 보관 3행만 표시 + 선택 초기화(ActionBar 사라짐).
- 실제 발행/보관 **실행은 미수행**(프로덕션 PILOT 데이터 변형 회피). 단건 핸들러는 기존 `publishOperatorMlcGroup`/`archiveOperatorMlcGroup` 그대로라 회귀 없음. 가드·후보 산출은 UI 카운트로 완전 검증.

## 5. 산출물 / 후속

- 변경 파일 **1** (`OperatorMultilingualContentListPage.tsx`) + 본 CHECK. **backend·route·권한·migration 0**.
- commit: `59bb84df5` — path-specific(내 파일 1 + CHECK만, `_msm*.mjs` 타 세션 스크래치 제외). 배포 success + operator 브라우저 smoke PASS(§4).
- **후속 WO 순서**:
  1. `WO-…-OPERATOR-TABLET-SCREEN-SETS-LIST-STANDARDIZATION-V1` — #6 표준화. **선행**: 리스트 API 서버 페이지네이션(`page/limit/total`) 추가(백엔드).
  2. #7 은 카드형 큐 유지(표준화 비대상) — 변경 없음.
