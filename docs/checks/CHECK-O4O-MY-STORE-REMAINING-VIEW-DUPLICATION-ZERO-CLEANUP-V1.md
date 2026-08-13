# CHECK-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1

**대상 WO**: WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
**선행 CHECK**: [`CHECK-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1`](CHECK-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1.md)
**작성일**: 2026-08-13
**범위**: 최종 census 잔여 `VIEW_DUPLICATED 7건` (채널 / QR / 블로그 / KPA 상품설명) 일괄 정리 + 재 census

---

## 0. 요약

`VIEW_DUPLICATED 7 → 0`. 모집단 138 유지(route 추가/삭제 0).
**"내 매장 전체 공통화 완료" 선언 조건을 모두 충족한다** (§9).

---

## 1. 기준 모집단 drift 확인 (WO §1)

선행 census 의 모집단·route 를 현재 코드로 재대조했다.

| 항목 | 결과 |
|---|---|
| 5서비스 `App.tsx` · `routes/*` 변경 | **0건** (`git status --porcelain -- "services/*/src/App.tsx" "services/*/src/routes"` 무출력) |
| 대상 7 page route 등록 | 전부 유지 — §7 grep |
| 모집단 | **138 유지** (KCos 30 · GP 37 · KPA 43 · PH 25 · Neture 3) |

route drift 없음 → 선행 census 의 판정표를 그대로 기준으로 사용했다.

---

## 2. 처리 결과 — 7건

### A. 채널 콘솔 (KCos + GP)

신규 공통 `StoreChannelsView` (`@o4o/store-ui-core/components/channels`).
**diff 실측 67줄**의 실제 차이는 업무 규칙이 아니라 아래 5가지뿐이었다.

| 차이 | 수렴 방식 |
|---|---|
| accent (pink-* vs blue-*) | `theme` — **완성된 Tailwind class 문자열** 10개 (동적 조합 금지) |
| 대시보드 route/라벨 (`/store` "대시보드로 이동" vs `/store/hub` "매장 HUB으로 이동") | `routes` + `labels` |
| GP 전용 SIGNAGE Quick Action("디지털사이니지 운영") | `renderExtraQuickActions` slot |
| 명사 2곳 (매장/약국 코드 · 콘텐츠 empty 힌트) | `labels` |
| guide serviceKey / GuideBlock / GuideEditableSection | `fetchGuideSections` + `renderGuideBlock` · `renderHeroDescription` slot |

- **prop 나열이 아니라 성격별 object 로 묶었다**: `api`(13개 함수) · `theme`(10) · `routes`(5) · `labels`(3) · slot 3.
- `guideblock-page-help` JSON 파싱·fallback 로직은 **Core 가 보유**한다(서비스 중복 재작성 방지).
- [A]탭 · [B]KPI · [C]Quick Actions · [D]제품목록/추가모달/순서변경 · [E]노출자산 전 블록 보존.

### B. QR 콘솔 (KCos + GP)

신규 공통 `StoreQrConsoleView` (`@o4o/store-ui-core/components/qr`).
**diff 실측 178줄** 중 실제 차이는 4가지뿐이고 나머지는 주석·공백이었다.

| 차이 | 수렴 방식 |
|---|---|
| API prefix (`/cosmetics` vs `/glycopharm`) | `api` adapter (list/create/update/remove/downloadImage) |
| accent (`#db2777`/`#fdf2f8` vs `#0d9488`/`#f0fdfa`) | `theme` 2토큰 |
| 명사 2곳 | `labels` 2개 |
| template registry 경로 | `findTemplate` 주입 |

**QR URL / identifier 의미 변경 없음** — `/qr/{slug}` 공개 URL, `toSlug`/`generateSlug` 규칙,
landing type 4종, PNG 512 다운로드, 편집 모드(`WO-O4O-QR-EDITOR-GP-KCOS-PARITY-V1` PUT/POST 분기) 전부 원본 그대로 Core 로 이동.

#### KPA QR superset 조사 결과 → **3서비스 공통화 안 함 (근거 기록)**

`web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` (2,067L) 는 **업무 모델 자체가 다르다.**

- `landingType='screen_set'` 태블릿 코너 QR — 자동 생성 전용, 수동 생성 경로 없음
- `screenSetStatus='archived'` lifecycle 판정(`isArchivedCornerQr`) → 출력·다운로드 차단 (서버 409 선반영)
- 스캔 통계(`getQrAnalytics`: total/today/weekly/deviceStats)
- 인쇄 템플릿 모달 + A4 PDF 일괄 출력(`QR_EXPORT_PRESETS` · `downloadQrExport`)
- 자료 선택 모달(`StoreAssetSelectorModal`) 기반 생성 · AI 설명 연동 · DataTable 목록 · 필터 4종

→ KCos/GP 의 "링크 QR 생성/삭제/다운로드" 와 같은 축이 아니다. **SERVICE_SPECIFIC 유지**(선행 census 판정과 동일).

### C. 블로그 관리 (KCos + GP, KPA 부분 채택)

신규 공통 3종 (`@o4o/store-ui-core/components/blog`):

| 컴포넌트 | 소비처 |
|---|---|
| `StoreBlogManageView` (list/editor/settings 3-mode 본체) | KCos · GP |
| `StoreBlogEditorPanel` | KCos · GP · **KPA** |
| `StoreBlogSettingsPanel` | KCos · GP · **KPA** |
| `storeBlogTypes` (타입 · 상태맵 · 공용 style 4종 · formatDate) | 3서비스 |

KCos/GP 차이(diff 75줄)는 slug resolver · service 파라미터 · 명사 · GP 전용 버튼 `title` 속성뿐 → adapter/labels 로 수렴.

#### KPA 블로그 조사 결과 → **목록은 SERVICE_SPECIFIC 유지, editor/settings 만 공통화**

`PharmacyBlogPage` (928L) 의 **list view** 는 KCos/GP 의 카드 목록과 다른 모델이다.

- `DataTable` + `ActionBar` + `BulkResultModal` + `useBatchAction` 기반 **일괄 발행/보관/삭제**
- 선택(selectedKeys) 상태 · 제작 흐름(production router state) 진입 · derivation source 보존

→ 하나의 View 로 강제 흡수하면 KCos/GP 를 DataTable 로 바꾸거나 KPA 의 일괄 실행을 없애야 한다(WO §5 금지).
**실제로 동일한 관리 업무인 editor/settings 만** 공통 Panel 로 이관했다. 목록은 KPA 전용으로 남긴다.

### D. KPA 상품 상세설명 관리

기존 공통 `StoreProductDescriptionsView` 를 **기능 손실 없이 adoption**. 새 View 를 만들지 않았다.

Core 에 추가한 것은 두 개의 **구조화된 override** 뿐이고, 기본값은 KCos/GP 현행 그대로다.

| 계약 | 내용 |
|---|---|
| `labels?: Partial<StoreProductDescriptionsLabels>` | 13개 항목(breadcrumb 2 · title · subtitle · notice · sidebarTitle(count) · listError 2 · empty 2 · toast · placeholder 2). **미지정 시 `storeNoun` 기반 기존 기본값** → KCos/GP adapter 무변경 |
| `theme?: Partial<StoreProductDescriptionsTheme>` | 13토큰(accent · accentText · textStrong/Body/Muted/Subtle · sidebarTitleColor · breadcrumbSeparator · divider · inputBorder · surface · templateBadge 2). `DEFAULT_THEME` = KCos/GP 현행 값 |

- KPA 는 **이관 전 원문 문구를 그대로** adapter 에 넣었다(§6 문자열 등가 검증으로 기계 증명).
- KPA palette 는 `styles/theme` 의 `colors.*` 를 그대로 주입 — slate 계열 + primary `#2563EB`, templateBadge `#eef2ff`/`#4f46e5`.
- `mediaApi.upload` 기반 이미지 업로드는 기존 `renderEditor` slot 으로 보존(신규 주입점 불필요).

---

## 3. 새/기존 공통 Core

| 구분 | 산출물 | LOC |
|---|---|---|
| 신규 | `components/channels/StoreChannelsView.tsx` | 1,294 |
| 신규 | `components/qr/StoreQrConsoleView.tsx` | 598 |
| 신규 | `components/blog/StoreBlogManageView.tsx` | 484 |
| 신규 | `components/blog/StoreBlogEditorPanel.tsx` | 119 |
| 신규 | `components/blog/StoreBlogSettingsPanel.tsx` | 195 |
| 신규 | `components/blog/storeBlogTypes.ts` | 106 |
| 기존 확장 | `components/product-descriptions/StoreProductDescriptionsView.tsx` | labels/theme 계약 추가 |

### 3-1. 서비스 page LOC (thin adapter 수렴)

| 파일 | BEFORE | AFTER |
|---|---:|---:|
| KCos `StoreChannelsPage` | 1,130 | **98** |
| GP `StoreChannelsPage` | 1,139 | **112** |
| KCos `StoreQrPage` | 550 | **78** |
| GP `StoreQrPage` | 654 | **86** |
| KCos `StoreBlogManagePage` | 602 | **84** |
| GP `PharmacyBlogPage` | 629 | **93** |
| KPA `StoreProductDescriptionsPage` | 702 | **115** |
| KPA `PharmacyBlogPage` (editor/settings 만 이관) | 928 | **760** |
| **합계** | **6,334** | **1,426** |

### 3-2. 공통화 계약 원칙 (선행 WO 계약 유지)

- **`@o4o/store-ui-core` 의 dependency 를 늘리지 않았다.** `package.json` · lockfile 변경 **0**
  (CLAUDE.md 중지 조건 회피). 아래는 전부 주입 또는 구조적 타입이다.
  - `GuideBlock`(`@o4o/shared-space-ui`) · `GuideEditableSection`(서비스) · `fetchGuidePageContent`(서비스) → slot/prop
  - `RichTextEditor`(`@o4o/content-editor`) · `getAccessToken`(`@o4o/auth-client`) · `API_BASE_URL` → slot/adapter
  - `StoreAssetItem`/`ChannelMap`(`@o4o/store-asset-policy-core`) → **구조적 부분집합 타입** `StoreChannelAssetItem`
- 구조적 interface 에 `[key: string]: unknown` 인덱스 시그니처를 쓰지 않았다(선행 WO 실패 원인).
- Tailwind accent 는 **완성된 class 문자열**로 주입 — 4서비스 `tailwind.config.js` 의 `content` 에
  `packages/store-ui-core/src/**` 가 이미 포함돼 있어 **설정 변경 0**.
- backend · route · permission · API 계약 변경 **0**. DB/migration **0**. 신규 기능 **0**.

---

## 4. 함께 정리한 중복 (WO §4)

| 대상 | 처리 |
|---|---|
| `toSlug` / `generateSlug` / `formatDate` / `LANDING_TYPE_CONFIG` (QR ×2) | Core 단일화 |
| `CHANNEL_TABS` / `STATUS_CONFIG` / `PUBLISH_CONFIG` / `CHANNEL_DESC` / `isForcedActive` / `formatPrice` (채널 ×2) | Core 단일화 |
| `AddProductModal` / `ChannelPublicUrlCard` (채널 ×2) | Core 내부 컴포넌트로 단일화 |
| `btnStyle` / `smallBtn` / `labelStyle` / `inputStyle` (블로그 ×3) | `storeBlog*Style` 로 단일화. KPA 로컬 `labelStyle`/`inputStyle` 은 사용처 소멸 → **삭제** |
| loading/error/empty 블록 (7화면) | Core 단일화 |
| duplicate interface (`QrItem` · `ChannelProduct` · `StaffBlogPost` 부분집합 등) | Core 구조적 타입으로 단일화 |
| 사용처 사라진 import/local | `noUnusedLocals: true` (3서비스 전부 활성) 로 **0 증명** |

### 4-1. 의도적으로 통합하지 **않은** 중복

- **블로그 상태 라벨**: KCos/GP = `임시저장 / 발행됨 / 보관`, KPA = `초안 / 발행 / 보관`
  (`WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1`). 색상만 동일하다.
  → 공통 상수는 KCos/GP 원문을 보유하고 **KPA 는 자기 map 을 유지**한다. 통합하면 어느 한쪽 문구가 조용히 바뀐다.
- **KPA `formatDate`**: `toLocaleDateString('ko-KR', {…2-digit})` 출력이 KCos/GP(`YYYY.MM.DD`)와 다르다 → 로컬 유지.

---

## 5. 변경 금지 항목 준수 (WO §5)

| 금지 항목 | 결과 |
|---|---|
| 업무 의미 변경 | 없음 — §6 문자열/색상 등가 8/8 |
| route / permission 변경 | 없음 — `App.tsx`·`routes/*` diff 0 |
| backend API 계약 변경 | 없음 — 호출 endpoint·method·body 동일 |
| DB / migration | 없음 |
| 신규 기능 추가 | 없음 |
| QR URL / identifier 의미 변경 | 없음 — `/qr/{slug}` · slug 생성 규칙 동일 |
| 블로그 publish 정책 변경 | 없음 — publish/archive/delete endpoint·조건 동일 |
| KPA 문구/기능의 공통 기본값 치환 | 없음 — §6 에서 기계 검증 |
| 서비스별 기능 개수 동일화 | 없음 — GP 전용 Quick Action·KPA 전용 업로드/배지/일괄실행 전부 slot 으로 보존 |
| 브라우저 확인 곤란을 이유로 한 기능 삭제 | 없음 |

---

## 6. 정적 등가성 검증 (문구·palette 무단 변경 배제)

선행 WO 가 7건을 남긴 핵심 사유가 "문구·palette 가 조용히 바뀌는 것을 확인할 수 없다" 였으므로,
**기계적 전수 대조**를 먼저 수행했다.

`git show HEAD:<file>` (BEFORE) 의 주석 제외 본문에서 **한글 문구 · hex 색상 · Tailwind accent 클래스**를
추출해, AFTER(공통 Core + 서비스 adapter) 조합에 전부 존재하는지 검사했다.

| 케이스 | 문구 | hex | TW class | 결과 |
|---|---:|---:|---:|:---:|
| KCos StoreChannelsPage | 113 | 11 | 64 | OK |
| GP StoreChannelsPage | 114 | 11 | 64 | OK |
| KCos StoreQrPage | 52 | 14 | 10 | OK |
| GP StoreQrPage | 52 | 14 | 10 | OK |
| KCos StoreBlogManagePage | 50 | 20 | 0 | OK |
| GP PharmacyBlogPage | 53 | 20 | 0 | OK |
| KPA StoreProductDescriptionsPage | 33 | 13 | 0 | OK |
| KPA PharmacyBlogPage | 59 | 22 | 0 | OK |
| **합계** | **526** | **125** | **148** | **8/8 등가** |

### 6-1. 이 검증이 실제로 잡아낸 회귀 2건 (수정 완료)

이 절차는 형식적 통과가 아니라 **실제 결함 2건을 발견해 수정**했다.

1. **채널 제품 추가 모달 empty 문구 오기입** — 원본
   `"추가할 수 있는 상품이 없습니다" / "모든 상품이 이미 추가되었거나,<br/>HUB에서 신청한 상품의 승인이 아직 완료되지 않았습니다."`
   를 다른 문구로 잘못 옮겼다. 원문으로 복원.
2. **블로그 상태 라벨 무단 치환** — 공통 상수를 KPA 값(`초안/발행`)으로 두면
   **KCos·GP 의 `임시저장/발행됨` 이 조용히 바뀐다.** §4-1 정책으로 정정.

---

## 7. 검증 (WO §7)

| 항목 | 결과 |
|---|:---:|
| `packages/store-ui-core` `npx tsc --build --force` | **PASS** (exit 0) |
| `web-k-cosmetics` `tsc --noEmit` | **PASS** |
| `web-glycopharm` `tsc --noEmit` | **PASS** |
| `web-kpa-society` `tsc --noEmit` | **PASS** |
| `web-pharmacy-hub` `tsc --noEmit` (공통 package 회귀) | **PASS** |
| `web-neture` `tsc --noEmit` (공통 package 회귀) | **PASS** |
| `web-k-cosmetics` `vite build` | **PASS** (21.82s) |
| `web-glycopharm` `vite build` | **PASS** (23.37s) |
| `web-kpa-society` `vite build` | **PASS** (27.95s) |
| 대상 7 page 소비처 전수 grep | route 등록 전부 유지 · 추가/삭제 0 |
| 신규 공통 View 소비처 전수 grep | §3 표대로 (KCos 3 · GP 3 · KPA 3) |
| local duplicate type/helper/style 재검색 | 잔여는 전부 **대상 화면군 밖**(KPA 채널/QR/사이니지 SERVICE_SPECIFIC, 타 서비스 operator 화면) |

> `noUnusedLocals: true` 가 3서비스 모두 활성이므로 dead import/local 0 은 typecheck 로 증명된다.

### 7-1. 브라우저 smoke (WO §6) — **수행함**

**프로덕션 계정 로그인은 불가하다.** `docs/local/TEST-ACCOUNTS.local.md` §2·§4 기준
모든 (계정 × 서비스) L2 credential 이 `unknown / needs verification` 이며, 문서가
"서비스 웹 로그인(모든 서비스) ❌ 불가" 로 명시한다. 추측 대입은 금지다.

대신 **이번 빌드 산출물(dist)** 을 로컬 `vite preview` 로 띄우고,
Playwright 로 세션 주입 + API stub 을 걸어 **새 공통 Core 코드가 실제 브라우저에서 렌더되는지** 실측했다.

- 대상: 7 화면 + KPA 블로그 = **10 화면**, 상태 2종(**list / empty**) = **20 케이스**
- 결과: **20/20 OK** — 콘솔 오류 0 · pageerror 0 · 기대 문구 전수 일치
- 스크린샷: `c:/tmp/wo-viewdup/shots/` (list·empty × 10)

| 최소 확인 항목 (WO §6) | 결과 |
|---|:---:|
| 각 대상 route 진입 | ✅ 10/10 (StoreOwnerGuard 통과 후 화면 본체 렌더) |
| loading/error/empty 정상 | ✅ list·empty 양쪽 렌더 확인 |
| 주요 버튼/링크 목적지 | ✅ 채널 공개 URL(`/store/{code}`) · Quick Action route · 블로그 설정/새 글 |
| 모바일/데스크톱 기본 레이아웃 | ✅ 1440×900 desktop 실측. 모바일 뷰포트는 **미실측**(아래 한계) |
| KPA 상품설명 문구·palette 보존 | ✅ 스크린샷 실측 — breadcrumb "약국 경영지원 / 상품 설명", 제목 "상품 상세설명 관리", 사이드바 "매장 자체 상품 (2)", primary `#2563EB` |
| QR 주요 흐름 | ✅ 목록·카드·액션 4종·empty 렌더. accent 서비스별 분리 확인 |
| 블로그 주요 관리 액션 | ✅ 목록·상태 필터·URL복사/미리보기/수정/발행/보관/삭제 버튼 렌더 |
| 채널 콘솔 주요 상태 표시 | ✅ [A]탭+상태뱃지 [B]KPI 4종 [C]Quick Actions [D]진열제품표 [E]노출자산표 전부 렌더 |

**서비스별 accent 분리도 실측으로 증명됐다** — 동일 Core 에서 KCos 는 pink, GP 는 blue 로 렌더되고
`대시보드로 이동`(KCos) vs `매장 HUB으로 이동`(GP) 라벨도 분리됐다. Tailwind 가 주입된 완성 class 문자열을
정상 스캔했다는 뜻이다.

#### 이 smoke 가 **검증하지 못한 것** (허위 PASS 방지)

- 프로덕션 **실데이터** 왕복 — API 는 stub 이다.
- **실제 저장 결과**(QR 생성/수정, 블로그 발행, 설명 저장)의 서버 반영 — write 경로는 stub 응답까지만.
- **모바일 뷰포트** 레이아웃.
- 위 3가지는 L2 credential 이 해소된 뒤 프로덕션 계정으로 재확인이 필요하다.

---

## 8. 재 census (WO §8)

모집단·판정 기준은 선행 CHECK §1-4 와 동일. **route 추가/삭제 0 이므로 모집단은 138 유지.**

### 8-1. 판정 변경 항목 (7건, 전부 `VIEW_DUPLICATED` → `FULLY_COMMON`)

| # | 서비스 | 항목 | LOC | 판정 |
|---|---|---|---:|---|
| 1 | K-Cosmetics | StoreChannelsPage | 98 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 2 | GlycoPharm | StoreChannelsPage | 112 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 3 | K-Cosmetics | StoreQrPage | 78 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 4 | GlycoPharm | StoreQrPage | 86 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 5 | K-Cosmetics | StoreBlogManagePage | 84 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 6 | GlycoPharm | PharmacyBlogPage | 93 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |
| 7 | KPA-Society | StoreProductDescriptionsPage | 115 CORE | `VIEW_DUPLICATED` → **FULLY_COMMON** |

### 8-2. 판정 **유지** 항목 중 이번에 부분 공통화된 것

| 서비스 | 항목 | 판정 | 비고 |
|---|---|---|---|
| KPA-Society | PharmacyBlogPage | **SERVICE_SPECIFIC 유지** | editor/settings 는 공통 Panel 채택(168L 감소). **목록**이 DataTable+일괄실행 모델이라 본체는 여전히 KPA 전용 → `FULLY_COMMON` 기준(본체가 공통 패키지) 미충족 |

### 8-3. 최종 숫자

```text
전체 모집단: 138
FULLY_COMMON: 74
CORE_ONLY: 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 64
NOT_IMPLEMENTED: 0
OUT_OF_SCOPE: 0
미조사: 0
```

증감: `FULLY_COMMON 67 → 74 (+7)` · `VIEW_DUPLICATED 7 → 0 (-7)` · 나머지 불변.

**`CORE_ONLY: 0`** — 이번에 만든 공통 View 4종(+Panel 2종)은 전부 즉시 2개 이상 서비스가 소비한다
(`StoreChannelsView` 2 · `StoreQrConsoleView` 2 · `StoreBlogManageView` 2 · Editor/Settings Panel **3** ·
`StoreProductDescriptionsView` **3**). 소비처 0~1인 Core 없음.

**`SERVICE_SPECIFIC: 64`** — 전부 업무 차이 근거 유지. 이번 WO 에서 추가로 실측 확인한 근거:
KPA QR(screen_set 코너·스캔통계·PDF 일괄출력 — §2-B) · KPA 채널(`section` prop 기반 B2C 전용 2 route 재사용) ·
KPA 블로그 목록(일괄 실행 모델 — §2-C). 나머지는 선행 CHECK §5-2 근거 유지.

---

## 9. 완료 판정 (WO §9)

| 조건 | 충족 |
|---|:---:|
| 전체 census 재대조 | ✅ 138건 전수 |
| 미조사 0 | ✅ |
| `VIEW_DUPLICATED = 0` | ✅ |
| `CORE_ONLY = 0` | ✅ |
| `SERVICE_SPECIFIC` 전부 업무 차이 근거 유지 | ✅ (§8-3) |
| typecheck / build PASS | ✅ (§7 — 6 typecheck + 3 build) |
| 브라우저 smoke 수행 또는 불가 사유 명확 기록 | ✅ **수행 20/20** + 미검증 3항목 명시 (§7-1) |

### 판정

> **내 매장 전체 공통화 완료** — 선언한다.

단, §7-1 의 미검증 3항목(프로덕션 실데이터 · 실제 저장 결과 · 모바일 뷰포트)은
L2 credential 해소 후 프로덕션 계정 smoke 로 확인이 필요하다. **이번 WO 범위의 완료와는 별개**다.

---

## 10. DB / backend 변경

**없음.** migration 0 · schema 0 · seed 0 · backend 소스 0 · API 계약 0.
변경은 `packages/store-ui-core` 와 3서비스 frontend page 파일에 한정된다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- 별도 WO 제안: **L2 service credential 해소 후 내 매장 7화면 프로덕션 계정 smoke**
  (§7-1 미검증 3항목). `docs/local/TEST-ACCOUNTS.local.md` §2-1 절차 선행 필요.
