# CHECK-O4O-STORE-HUB-SUPPLIER-CONTENT-EXPLORER-COMMONIZATION-V1

- **WO**: WO-O4O-STORE-HUB-SUPPLIER-CONTENT-EXPLORER-COMMONIZATION-V1
- **작업일**: 2026-08-13
- **작업 브랜치**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`)
- **판정**: **C(콘텐츠 진열 화면) + A(가져오기 라이브러리 화면)** — 아래 §7
- **backend / DB / migration 변경**: **0건**

---

## 1. 서비스별 기존 구조 비교 (코드 실측)

매장 HUB "공급자·운영자 콘텐츠 탐색"은 **두 개의 서로 다른 화면군**으로 이미 갈라져 있다.

### 1-A. 콘텐츠 진열 화면 (`/store-hub/content`)

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm(참고) | PharmacyHub |
|---|---|---|---|---|
| route | `/store-hub/content` | `/store-hub/content` | `/store-hub/content` | **없음** |
| page | `pages/pharmacy/HubContentLibraryPage.tsx` | `pages/hub/HubContentPage.tsx` | `pages/hub/HubContentListPage.tsx` | — |
| 공통 컴포넌트 | `ContentHubTemplate` (`@o4o/shared-space-ui`) | 동일 | 동일 | — |
| 목록 API | `GET /api/v1/hub/contents?serviceKey=kpa&sourceDomain=kpa_content\|cms` | `…serviceKey=k-cosmetics&sourceDomain=cms` | `…serviceKey=glycopharm&sourceDomain=cms` | — |
| 검색·필터 | 소스 탭 2개(`filtersAsSourceTabs`) + 검색 | 검색만(`showTypeFilters:false`) | 검색만 | — |
| 가져오기 | `assetSnapshotApi.copy({ sourceService:'kpa', sourceAssetId, assetType:'content'\|'cms' })` | `assetSnapshotApi.copy({ assetType:'cms' })` | 동일 | — |
| 사본 | `o4o_asset_snapshots` row | 동일 | 동일 | — |
| 중복 정책 | 이미 복사한 id 를 `loadCopiedIds` 로 표시하고 **재복사 허용**(`recopyLabel`) | 동일 | 동일 | — |

→ **이 화면군은 이미 공통 Core(`ContentHubTemplate`, 816L)를 3(+Neture 1) 서비스가 소비**하고 있다.
서비스 차이는 전부 `ContentHubConfig`(fetchItems / loadCopiedIds / onCopy / 문구 / accent)로 흡수돼 있다.
**이번 WO 에서 새로 만들 것이 없다.**

### 1-B. 가져오기 라이브러리 화면 (`/store-hub/blog|pop|qr`)

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm(참고) | PharmacyHub |
|---|---|---|---|---|
| route | `/store-hub/{blog,pop,qr}` | 동일 | 동일 | **없음** |
| page | `pages/pharmacy/Hub{Blog,Pop,Qr}LibraryPage.tsx` | `pages/hub/Hub{Blog,Pop,Qr}LibraryPage.tsx` | `pages/hub/…` | — |
| 원본 source | `hub_contents` view(운영자 발행 blog/pop/qr 원본) | 동일 | 동일 | — |
| 목록 API | `GET /api/v1/hub/contents?serviceKey=kpa&sourceDomain=blog\|pop\|qr` | `serviceKey=k-cosmetics` (클라이언트 상수) | `serviceKey=glycopharm` | — |
| 검색·필터·분류 | **없음** (페이지네이션만) | 없음 | 없음 | — |
| 미리보기·상세 | 행 클릭 → `BaseDetailDrawer` | 동일 | 동일 | — |
| 가져오기(단건) | `importOperator{Blog,Pop,Qr}(slug, sourceId)` | 동일 | 동일 | — |
| 가져오기(일괄) | 단건 endpoint `Promise.allSettled` fan-out + `useBatchAction` | 동일 | 동일 | — |
| 생성되는 사본 | blog/pop: 매장 소유 초안(author_role='store') · qr: `store_qr_codes` row(매장 slug 신규 발급) | 동일 | 동일 | — |
| 중복 가져오기 | **제한 없음** (매번 새 사본 생성 · 이미 가져왔는지 표시하지 않음) | 동일 | 동일 | — |
| 원본-사본 연결 | blog/pop: 사본 row 의 source id 보존 · qr: 변환 INSERT (양방향 동기화 없음) | 동일 | 동일 | — |
| UI 차이 | `Pagination`(operator-ux-core) · `Download`/`Plus` 아이콘 · "내 약국" 문구 | 손수 만든 이전/다음 버튼 · `Copy` 아이콘 · pink accent · "내 매장" 문구 | KCos 와 거의 동일(teal accent) | — |

→ 이 6 페이지의 **상태 기계(조회·페이지·loading/error·slug·선택·단건/일괄 가져오기)는 실질적으로 동일**하고,
차이는 문구·아이콘·accent·페이지네이션 UI 뿐이다. **여기가 이번 WO 의 실제 중복 영역**이다.

---

## 2. 공급자 원본 vs 매장 사본 (코드 기준)

- HUB 목록(`GET /api/v1/hub/contents`)은 **public read-only**다. 탐색 경로에 원본 write 는 존재하지 않는다.
- 가져오기는 항상 **새 row 를 만드는 write** 다 — `o4o_asset_snapshots`(콘텐츠 진열) 또는
  매장 blog/pop 초안·`store_qr_codes`(가져오기 라이브러리). **원본 row 를 갱신하지 않는다.**
- 사본 수정 경로(`/store/content/*`, `/store/marketing/qr`)는 매장 소유 테이블만 write 하며 원본으로 역류하지 않는다.
- **원본 수정 → 기존 사본 자동 변경 없음 / 사본 수정 → 원본 변경 없음** 이 코드상 성립한다.
  자동 동기화 코드는 어느 경로에도 없다. (WO §2 원칙과 현재 구현이 **일치** — 기록만 하고 구조 변경 없음)

---

## 3. 중복 가져오기 정책 (현행 유지)

| 화면군 | 현행 정책 | 이번 WO |
|---|---|---|
| 콘텐츠 진열(`/store-hub/content`) | 복사 이력 표시(`loadCopiedIds`) + **재복사 허용** | 그대로 |
| 가져오기 라이브러리(blog/pop/qr) | **이력 표시 없음 · 무제한 재가져오기** | 그대로 |

공통 Core 는 "이미 가져왔는지"를 판단하지 않는다. 새 중복 정책을 만들지 않았다.

---

## 4. PharmacyHub — NOT_IMPLEMENTED (후속 WO)

WO §6 판단 근거(실측):

1. `services/web-pharmacy-hub/src/App.tsx` 의 `/store-hub` 하위는 **index(홈) 뿐**이다. 콘텐츠 탐색 route 가 없다.
2. 프론트엔드에 `hubContentApi` · `assetSnapshotApi` 소비처가 **0건**이다.
3. backend `/assets`(asset snapshot copy) 컨트롤러는 **kpa · cosmetics · glycopharm · neture 에만 mount** 돼 있고
   `pharmacy-hub` 라우터에는 없다.
4. PharmacyHub store-owner 의 content/library/blog 는 **매장이 직접 작성하는 CRUD**(`PharmacyHubStoreContentController`)이며
   HUB 조회·복사 개념이 없다.
5. 프로덕션 실측: `GET /api/v1/hub/contents?serviceKey=pharmacy-hub&sourceDomain={cms,blog,pop,qr}` → 전부 `total=0`.

→ **공급자 콘텐츠 원천 자체가 없다.** WO §6 에 따라 가짜 화면·placeholder API 를 만들지 않았다.
후속 WO 로 분리한다(§9).

---

## 5. Neture · GlycoPharm

- **Neture**: 공급자 원천/계약 확인만 수행. `services/web-neture/src/pages/library/ContentLibraryPage.tsx` 가
  동일한 `ContentHubTemplate` 을 소비한다. **코드 변경 0건.**
- **GlycoPharm**: WO 상 공식 적용 대상 제외. 페이지 **변경 0건**, 공통 패키지 회귀만 확인(§8).

---

## 6. 이번에 만든 공통 구조

`packages/store-ui-core/src/components/hub-import/useHubImportLibrary.ts` (신규, headless hook)

```
useHubImportLibrary<T>({ fetchPage, resolveStoreSlug, importOne, messages, limit })
  ├ 목록/페이지/loading/error  → 기존 Core `useSupplyProductList` 재사용 (WO #2 산출물)
  ├ 매장 slug 확인 (마운트 1회)
  ├ 선택 상태(Set) + 페이지 이동 시 초기화
  ├ 단건 가져오기 상태 (singleImporting)
  └ 일괄 가져오기 = importOne fan-out + useBatchAction 결과
```

- **Core 가 갖지 않는 것**: 가져오기 API(=`importOne` adapter 주입) · 중복 정책 · 컬럼/카드/문구/accent · 원본 write.
- 서비스 차이는 전부 **adapter + `messages`** 로 주입한다. 거대 만능 컴포넌트를 만들지 않았다(뷰 계층 미통합).
- 신규 dependency 0 (`@o4o/error-handling`·`@o4o/operator-ux-core` 는 store-ui-core 기존 의존).

### 서비스별 adapter/config

| 페이지 | fetchPage | importOne | messages 차이 |
|---|---|---|---|
| KPA blog/pop/qr | `hubContentApi.list({serviceKey:'kpa', sourceDomain})` | `importOperator{Blog,Pop,Qr}` | "내 약국" · QR 은 성공 문구에 발급 slug 포함 |
| KCos blog/pop/qr | `hubContentApi.list({sourceDomain})` (serviceKey 는 클라이언트 상수) | 동일 | "내 매장" |

---

## 7. 판정 (WO §9)

- **콘텐츠 진열 화면(`/store-hub/content`)** → **C. 기존 공통 컴포넌트 재사용**.
  `ContentHubTemplate` 이 이미 Core 이며 3+1 서비스가 소비 중 → **신규 구조 0**.
- **가져오기 라이브러리 화면(blog/pop/qr)** → **A. 상태 Core 만 공통화**.
  목록 View 는 서비스별 컬럼·accent·페이지네이션 UI 가 달라 통합하지 않았다(가장 작은 구조).

---

## 8. 변경 파일 · 검증

### 변경 파일

| 파일 | 구분 |
|---|---|
| `packages/store-ui-core/src/components/hub-import/useHubImportLibrary.ts` | 신규 (Core) |
| `packages/store-ui-core/src/index.ts` | export 추가 |
| `services/web-kpa-society/src/pages/pharmacy/Hub{Blog,Pop,Qr}LibraryPage.tsx` | Core 소비로 교체 |
| `services/web-k-cosmetics/src/pages/hub/Hub{Blog,Pop,Qr}LibraryPage.tsx` | Core 소비로 교체 |

**backend 0 · DB 0 · migration 0 · package.json 0 · lockfile 0 · route 0 · API 계약 0.**
순증감: **+311 / −657** (6 페이지에서 중복 상태 기계 제거).

### 검증 결과

| 항목 | 결과 |
|---|---|
| `tsc -b` — KPA / K-Cosmetics / GlycoPharm / PharmacyHub | **4/4 PASS** |
| `vite build` — KPA / K-Cosmetics / GlycoPharm / PharmacyHub | **4/4 PASS** |
| HUB 목록 계약(프로덕션 read) `serviceKey=kpa&sourceDomain=blog` | `total=1` — 조회 계약 정상 |
| 동 `pop`/`qr`, `serviceKey=k-cosmetics` 전 도메인 | `total=0` — **기존 상태**(이번 변경과 무관) |
| 원본 write 경로 부재 | 탐색 경로에 원본 UPDATE 없음 (코드 확인) |
| 사본 write 경로 분리 | `importOperator*` / `assetSnapshotApi.copy` 만 write, 원본 미변경 (코드 확인) |
| GlycoPharm 회귀 | 페이지 무변경 + typecheck/build PASS |
| Neture 침범 | 코드 변경 0건 |

**미수행(숨기지 않고 기록):**

- **실 브라우저 smoke 미수행** — Playwright 가 쓰는 Chrome 프로필이 사용자 세션에 잠겨 있어
  (`Failed to launch … 이미 다른 세션에서 사용 중`) dev 서버 기동 후에도 브라우저를 띄우지 못했다. 2회 재시도 실패.
- **가져오기 실행 검증(사본 생성) 미수행** — 프로덕션 데이터 write 이므로 사용자 승인 없이 수행하지 않았다
  (CLAUDE.md §0). 가져오기 호출부(`importOperator*`)는 이번 변경에서 **인자·호출 순서·에러 처리 모두 동일**하며
  toast 문구도 문자열 단위로 보존했다.

---

## 9. 남은 중복 · 후속 WO

**남은 중복**

- KPA `HubSignageLibraryPage`(미디어+플레이리스트 2목록) · `HubVideoLibraryPage` · `HubScreenSetLibraryPage` — 목록 형태가 달라 제외.
- GlycoPharm blog/pop/qr 3 페이지 — WO 상 적용 대상 제외(코드 무변경). 동일 Core 로 흡수 가능.
- 목록 View(컬럼·drawer·안내 박스)는 여전히 서비스별로 중복. 통합하려면 카드/테이블 표현 통일 결정이 선행돼야 한다.

**후속 WO 제안**

1. `WO-O4O-PHARMACY-HUB-STORE-HUB-CONTENT-SOURCE-V1` — PharmacyHub 의 공급자 콘텐츠 **원천**(hub_contents 발행 경로 · asset snapshot mount) 도입 여부 결정. 화면은 그다음.
2. `WO-O4O-STORE-HUB-IMPORT-LIBRARY-VIEW-COMMONIZATION-V1` — 가져오기 라이브러리 **View 계층**(컬럼·drawer·페이지네이션 UI) 공통화 + GlycoPharm 3 페이지 흡수.
3. `WO-O4O-STORE-HUB-IMPORT-DUPLICATE-POLICY-V1` — blog/pop/qr 의 무제한 재가져오기 정책을 콘텐츠 진열(복사 이력 표시)과 맞출지 결정.

---

## 10. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```
