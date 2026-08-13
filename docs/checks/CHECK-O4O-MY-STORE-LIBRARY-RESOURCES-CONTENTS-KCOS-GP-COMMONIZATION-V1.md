# CHECK — WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1

- 작업일: 2026-08-13
- 작업 브랜치: `work/commonization-my-store` → remote `work/commonization-my-store-shell-parts` (main 병합 없음)
- 범위: K-Cosmetics / GlycoPharm 내 자료함 **Resources + Contents 2화면** 공통화

---

## 1. 조사 — 업무 규칙 차이 vs config 차이

`diff -u` 로 두 서비스 4개 화면을 직접 대조했다.

| 화면 | 서비스 간 차이 | 판정 |
|---|---|---|
| Resources | 헤더 주석 · import 경로(`../../api` vs `@/api`) · GP만 링크형 자료에 `LinkIcon` 사용 | **config 차이** |
| Contents | 헤더 주석 · import 경로 · target 상수명 · `defaultTemplateId` 2건 | **config 차이** |

- 문구(breadcrumb / 제목 / subtitle / empty title·hint)는 두 서비스가 **문자열까지 동일**했다. 그래도 서비스 소유로 두기 위해 Core 에 하드코딩하지 않고 `StoreLibraryLabels` 로 주입한다.
- 업무 규칙 차이는 없었다 → 화면 본체 전량을 Core 로 이관 가능.

### 원본에 없던 것 (이번에 추가하지 않음)

두 화면 모두 **검색 · 필터 · 정렬 · pagination · route state/query 사용이 전혀 없었다.**
`limit: 100` 평면 목록 + 4상태 분기가 전부다. WO 의 "신규 기능 추가 금지" 에 따라 Core 에도 만들지 않았다.
(WO 검증 항목의 "검색·필터 / pagination" 은 **해당 없음** 으로 기록한다 — 없는 기능을 PASS 로 적지 않는다.)

### API client

`storeLibrary.ts` 는 GP 쪽에 CRUD(`create/update/delete/getStoreLibraryItem`) + `NetureLibraryItem` 가 더 있고 다른 소비처가 있어 **병합하지 않았다.** Core 는 `fetchResources` / `fetchContents` adapter 만 받는다 (endpoint · request · response 는 서비스 소유, 계약 무변경).

---

## 2. 공통 Core 구조 — `@o4o/store-ui-core/components/library` (637L, 10 파일)

큰 단일 컴포넌트 하나가 아니라 재사용 단위로 분리했고, **Resources·Contents 두 화면이 shell/hook/helper/style 을 다시 공유**한다.

| 파일 | L | 역할 | 공유 |
|---|--:|---|:--:|
| `types.ts` | 41 | `StoreLibraryResourceItem` / `StoreLibraryContentItem` / `StoreLibraryLabels` | 양쪽 |
| `libraryStyles.ts` | 149 | 공통 style map + badge/row/meta 변형 | 양쪽 |
| `libraryHelpers.ts` | 39 | `formatLibraryDate` · `getLibraryItemIcon` · `filterActiveResources` · `readContentDescription` | 양쪽 |
| `useStoreLibraryList.ts` | 31 | 목록 로드 4상태(loading/loadError/items/reload) | **양쪽** |
| `StoreLibraryPageShell.tsx` | 89 | breadcrumb·제목·새로고침 + loading/error/empty/list 분기 + footer slot | **양쪽** |
| `StoreLibraryResourceRow.tsx` | 58 | 자료 행 | Resources |
| `StoreLibraryContentRow.tsx` | 42 | 콘텐츠 행 + 제작 시작 | Contents |
| `StoreLibraryResourcesView.tsx` | 58 | Resources 화면 본체 | — |
| `StoreLibraryContentsView.tsx` | 90 | Contents 화면 본체 + `StartProductionModal` | — |
| `index.ts` | 40 | barrel | — |

- 4상태 계약 유지: 조회 실패는 `LoadError`(@o4o/ui) + `onRetry`, empty 로 위장하지 않는다.
- `StartProductionModal` 은 shell 의 `footer` slot 으로 렌더 → 원본과 동일하게 4상태와 무관하게 항상 마운트된다.
- Contents 행 meta 는 원본에 `flexWrap` 이 없었으므로 `libraryContentMetaStyle` 로 분리해 기존 wrapping 동작을 그대로 보존했다.

---

## 3. 서비스 adapter 차이 (유지한 것)

| 항목 | K-Cosmetics | GlycoPharm |
|---|---|---|
| API prefix | `/cosmetics/*` | `/glycopharm/*` |
| import alias | 상대경로 `../../api` | `@/api` |
| 링크형 자료 아이콘 | 미사용(ExternalLink 고정) | `useLinkIcon` 주입(LinkIcon) |
| POP template | `kcos-pop-beauty-expert` | `glyco-pop-diabetes-info` |
| QR template | `kcos-qr-usage-guide` | `glyco-qr-glucose-management` |
| target 상수 | `COSMETICS_PRODUCTION_TARGETS` | `GLYCOPHARM_PRODUCTION_TARGETS` |

route(`/store/marketing/pop`, `/store/marketing/qr`) · 권한 · payload · 문구 · 사용자 동선 모두 무변경.

---

## 4. KPA / PharmacyHub — 적용하지 않음 (사유)

| 서비스 | 현재 구조 | 판정 |
|---|---|---|
| **KPA-Society** | Contents(251L)는 `useSearchParams` 제품 컨텍스트(`create=1&pType&pId&pName`), `ContentCreationGuideModal`, `CreateContentFromResourcesModal`, `StoreContentsSelector`, **local** `StartProductionModal`, `updatePublishStatus(id,'hidden')` 일괄 제거, 약국 자료함 문구. Resources 는 929L 로 자료 제작 흐름 자체가 화면에 있음 | **제외** — 목록 표시 화면이 아니라 자료 제작·선택·정책 화면이다. Core 를 강제하면 KPA 고유 asset-policy / 다국어 / 제작 흐름이 축소된다 (WO 금지 항목) |
| **PharmacyHub** | `LibraryResourcesPage`(383L)는 `createLibraryAsset` / `updateLibraryAsset` / `deactivateLibraryAsset` CRUD + `RichTextEditor`(@o4o/content-editor) + `StoreConnectionNotice` + 3 자산 유형(file/content/external-link) | **제외** — 자료함의 업무 의미가 "저작·관리"로 다르다. 읽기 전용 목록 Core 와 모델이 다름 |

두 서비스는 **회귀(typecheck + build) 확인만** 수행했다.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` | PASS |
| `store-ui-core` `tsc --build` | PASS |
| web-k-cosmetics typecheck / vite build | PASS / PASS (18.15s) |
| web-glycopharm typecheck / vite build | PASS / PASS (19.99s) |
| web-kpa-society 회귀 typecheck / build | PASS / PASS (28.35s) |
| web-pharmacy-hub 회귀 typecheck / build | PASS / PASS (18.52s) |
| Resources loading/error/empty/list | 정적 등가 확인 (`git show HEAD:<file>` 대조) |
| Contents loading/error/empty/list | 정적 등가 확인 |
| 검색·필터 / pagination | **해당 없음** — 원본에 존재하지 않았고 추가하지 않음 |
| 액션 목적지 | 원본 열기 `fileUrl` target=_blank / 제작 시작 route 2건 동일 |
| API endpoint·payload·response 처리 | 동일 (`getStoreLibraryItems({limit:100})` + `isActive` 필터, `assetSnapshotApi.list({type:'content',limit:100})`) |
| desktop/mobile wrapping | style map 이동 전후 동일값 (rowMeta `flexWrap` 차이만 원본대로 분리 보존) |
| 브라우저 smoke | **미수행** — 이 브랜치는 main 병합·배포 대상이 아니어서 배포된 화면이 없다. 허위 PASS 를 적지 않는다 |
| 단위 테스트 | 미수행 — 세 패키지 모두 test runner 부재. 도입은 package.json/lockfile 변경 = 중지 조건 |

---

## 6. 변경하지 않은 것

backend · DB · migration · route · permission · API 계약 · package.json · lockfile · dependency — **전부 무변경.** frontend 전용 변경이다.

---

## 7. 규모

| | before | after |
|---|--:|--:|
| KCos Resources | 257L | 31L |
| KCos Contents | 217L | 68L |
| GP Resources | 261L | 44L |
| GP Contents | 217L | 68L |
| 합계 | **952L** | **211L** (−741L) |
| 신규 Core | — | 637L (10 파일, 4서비스 재사용 가능) |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
