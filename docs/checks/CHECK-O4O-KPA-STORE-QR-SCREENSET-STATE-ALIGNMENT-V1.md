# CHECK-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1

> WO: `WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1`
> 대상: KPA 매장 Screen Set(태블릿 코너 화면) ↔ 코너 QR 상태·상품 노출·목록·미리보기 정합
> 상태: **완료** — M-1 포함 전 범위 LIVE + 인증 프로덕션 E2E 통과(§8-B).
> E2E 중 같은 계열 우회 2건(`/print`, `화면 세트 열기` dead action)을 발견해 수정·배포까지 마쳤다(§8-B B-4).
>
> 이력: 1차(`90aef6023`)는 M-1 을 병렬 세션 파일 충돌로 보류했고, 병렬 세션이 `b3aae68b1`
> (`feat(pharmacy-hub): add store execution assets`)로 QR service 추출을 커밋한 뒤 **같은 WO 를 재개**해 M-1 을 마감했다.

---

## 0. 결론 요약

| 항목 | 범위 | 상태 |
|---|---|---|
| M-5 공개 QR 상품 fallback 제거 | 서버 resolver | ✅ 완료 |
| M-2 활성 QR KPI 산식 | 서버 analytics | ✅ 완료 |
| M-3 QR 목록 `태블릿 코너` 필터 | 프론트 | ✅ 완료 |
| E-1 QR 목록 → 화면 세트 편집 이동 | 프론트 | ✅ 완료 |
| M-4 편집기 QR 모바일 미리보기 정합 | 공유 편집기 + 매장 소비처 | ✅ 완료 |
| §6 명칭·홈 진입점·dead 파일·주석 정비 | 프론트 | ✅ 완료 |
| **M-1 보관 QR 상태 표시·출력 차단** | 공통 QR service + 라우트 + 프론트 | ✅ 완료 (2차) |

### 이 WO 가 실제로 고친 것 (정정)

보관/복원 **lifecycle 자체는 이미 구현되어 있었다**(`WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1` — §7).
이번에 발견된 진짜 문제는 **QR 관리 화면과 출력 경로가 그 lifecycle 을 소비하지 않았다**는 것이다.

| 소비처 | 이전 판정 | 실제(공개 랜딩) 판정 | 결과 |
|---|---|---|---|
| QR 목록 | `is_active` | 이중 게이트 | 보관 QR **완전 소실** |
| 홈 활성 QR KPI | `is_active` | 이중 게이트 | 랜딩 불가 QR 과다 집계 |
| `/image` 출력 | 게이트 **없음** | 이중 게이트 | 화면 차단 우회 다운로드 |
| `/export`·`/print`·`/flyer` | `is_active` | 이중 게이트 | 세트 보관+QR 활성 시 죽은 QR 인쇄 |

→ 목록 · KPI · 출력 · 공개 랜딩 **4곳이 같은 판정식**(`QR_LANDABLE_CONDITION`)을 쓰도록 통일했다.

---

## 1. M-5 — 공개 QR 상품 노출 fallback 제거

### 원인

`store-public-screen-set-resolve.ts` 의 `product_list` 처리에서, **명시 선택(`source:'selected_products'`) 이 없는
legacy config** 는 QR 경로(`tabletContext` 없음)에서 다음 두 단계로 **매장 전체 상품**을 끌어왔다.

1. `queryTabletVisibleProducts(..., configured=false)` → 매장 org 전체 supplier 상품
   (이 Screen Set 이 코너에 적용돼 있지 않으면 진열로 좁힐 태블릿 자체가 없어 항상 org 전체).
2. `resolveScreenSetLocalProducts()` → 코너 진열이 없으면 **매장 전체 활성 로컬 상품 LIMIT 50** 으로 폴백.

→ 결과: "미적용 Screen Set" 또는 "선택 상품 0건" 인 코너 QR 을 스캔하면 **그 코너와 무관한 매장 전체 상품**이
표시됐고, 다른 코너의 상품도 함께 유입됐다.

### 수정

- QR/모바일 경로(`!tabletContext`)는 **직접 선택된 상품만** 노출. 선택이 없으면 `EMPTY_QR_PRODUCT_SECTION`
  (`products: []`, `selectedCount: 0`, `localProductsEndpoint: null`) 을 내려보낸다.
  → 공개 뷰어(`PublicScreenSetViewer`)는 `products.length === 0` 이면 상품 섹션을 렌더하지 않는다(빈 상태 = 코너 콘텐츠만).
- `selectionMode: 'selected'` 표식을 유지해 kiosk/미리보기가 `/tablet/products` 자체 조회로 되돌아가지 않게 한다.
- 매장 전체 로컬 폴백 헬퍼 `resolveScreenSetLocalProducts()` **삭제**(유일 호출부 제거로 dead).
- 태블릿 runtime(`tabletContext` 있음)은 **무변경** — 코너 진열(`store_tablet_displays`) 기준 그대로.
  legacy 분기에 남아 있던 `!tabletContext` 조건부 코드(도달 불가)는 정리.
- `ResolveScreenSetInput.productMode` 주석 정정: `'org'` 는 더 이상 "매장 org 전체"가 아니다.

**불변 유지**: 공개 GET DB write 0 / ProductMaster·OPL·StoreLocalProduct 구조 무변경 / schema·migration 무변경.

---

## 2. M-2 — 활성 QR KPI 산식

### 원인

`store-analytics.controller.ts` 의 `activeQrCount` 는 `is_active = true` 단독 집계였다.
그런데 공개 `/qr/:slug` 는 **이중 게이트**(QR `is_active` + Screen Set 유효)를 통과해야 랜딩된다
(`store-qr-landing.controller.ts` → `resolveScreenSetSections` 가 `origin='store' AND deleted_at IS NULL
AND status <> 'archived'` 미충족 시 `SCREEN_SET_UNAVAILABLE` 404).
→ `is_active=true` 인데 대상 Screen Set 이 보관·삭제된 코너 QR 은 **랜딩 불가인데 활성으로 집계**됐다.

### 수정

판정식을 `store-screen-set-qr.service.ts` 에 **SSOT 로 신설**하고 KPI 가 그것을 쓴다.

```
SCREEN_SET_QR_JOIN            -- qs = store_tablet_screen_sets (qs.id::text = qr.landing_target_id, org 일치, origin='store')
QR_LANDABLE_CONDITION         -- is_active AND (landing_type <> 'screen_set' OR 대상 세트가 유효)
ARCHIVED_SCREEN_SET_QR_CONDITION  -- 보관 세트 종속 QR (M-1 에서 소비 예정, 현재 미사용)
```

`landing_target_id` 는 varchar(링크 QR = URL 등 비-UUID 가능)이므로 `qs.id::text` 방향으로만 캐스팅한다.

> ~~부분 반영 주의~~ **해소됨(2차/M-1)**: 목록도 같은 `landable` 판정을 내려주고, 목록 상단에
> `활성 N건 · 보관 M건` 을 표기해 홈 KPI 와 화면에서 직접 대조된다(§6-3).

---

## 3. M-3 · E-1 — QR 목록 필터 / 화면 세트 편집 이동

- `StoreQRPage` 필터 탭에 **`태블릿 코너`**(`landingType === 'screen_set'`) 추가.
  기존 `전체 / 콘텐츠 연결 / AI 설명` 구분 유지 → 일반 QR · AI 설명 QR · 코너 QR 3구분 보존.
- 코너 QR 행에 **`화면 세트 열기`** 액션 추가(`LayoutTemplate` 아이콘).
  `landingTargetId` = `store_tablet_screen_sets.id` 를 그대로 사용(추가 API 없음).
- 이동 계약: `/store/commerce/tablet-displays` + `state = { tab:'contents', editScreenSetId, highlightScreenSetId }`.
  - `StoreTabletDisplaysPage`: `editScreenSetId` 수신 → `contents` 탭 자동 선택 + `autoEditScreenSetId` 전달,
    기존대로 소비 후 history state 제거.
  - `TabletScreenSetManager`: 신규 `autoEditId` prop → `useRef` 가드로 **1회만** 편집기 자동 오픈.
    보관·삭제 세트는 상세 조회 404 → 목록에 머물고 토스트 안내(기존 `openEdit` 경로 그대로).
- `수정`(QR 설정) · `출력`(QR export) 은 기존대로 행에 **직접 노출** 유지(메뉴 뒤 은닉 없음).

---

## 4. M-4 — 편집기 QR 모바일 미리보기

### 원인

`QR 모바일 화면` 미리보기도 **태블릿 kiosk 렌더러**(`TabletKioskPage`)로 그렸다.
실제 코너 QR 랜딩은 **모바일 세로형 공개 뷰어**(`PublicScreenSetViewer`)라 배치·섹션 처리가 달랐고,
미리보기에 QR 주소가 전혀 표시되지 않아 "이 화면이 어느 QR 로 열리는지" 확인할 수 없었다.

### 수정

- 공유 편집기(`@o4o/tablet-screen-set-editor`)에 **`renderMobilePreview?: (screen) => ReactNode`** 주입 prop 신설.
  패키지가 서비스 계층 컴포넌트를 import 하지 않도록(계층 역전 금지) **소비처가 렌더러를 주입**한다.
  - 매장(`TabletScreenSetManager`) → `PublicScreenSetViewer` 주입 = **실제 `/qr/:slug` 와 동일 컴포넌트**.
  - 운영자·공급자 제작기 → 미주입 → 기존 kiosk 렌더 그대로(**회귀 0**).
- 사이드 고정 미리보기 · 전체화면 모달 두 곳 모두 `renderMobileScreen()` 단일 경로로 통일
  (`stripIdleForMobilePreview` = 공개 QR 과 동일하게 대기영상 제외).
- **QR 주소 표기**(`QrIdentityNote`):
  - 저장본(`initialDetail.publicQrSlug` 있음) → `실제 QR 주소: /qr/{slug}` 표시.
  - 미저장·slug 미발급 → `초안 — 아직 저장되지 않은 화면입니다. 저장하면 코너 QR 주소가 열립니다.`(amber 배경).
- 모달 하단 문구를 "저장 전 미리보기" → "편집 중인 내용 기준 미리보기"로 정정(수정 모드에서 사실과 달랐음).

> 미리보기 sections 는 `POST /screen-sets/preview`(draft) 산출이고, 실제 랜딩은 공용 resolver 산출이다.
> 두 경로는 선택 상품 판정을 `resolveSelectedProductListSection` **동일 함수**로 공유하므로 상품 표시가 일치한다.

---

## 5. §6 — 최소 UI 정비

| 항목 | 결과 |
|---|---|
| `태블렛` → `태블릿` | 18개 파일 173곳 치환(KPA + 공유 패키지 + Neture 공급자). GlycoPharm·K-Cosmetics 미접촉(WO 제외). 이전 WO 의 "'태블렛' 철자 통일" 주석도 폐기 명시. |
| 홈 활성 QR KPI | 링크 없는 유일한 카드 → `/store/marketing/qr` 링크 카드로 변경(숫자 ↔ 목록 대조 가능). |
| 홈 실행 흐름 QR 진입 | `매장에 적용하기` Step 3 에 `QR 코드` 진입 추가(사이니지·태블릿·판매 설정과 나란히). |
| dead `HubSubNav.tsx` | 삭제. 삭제 전 전 저장소 참조 0 확인(자기 정의 + `packages/ui` 주석 언급뿐). |
| 오래된 주석 정정 | `StoreTabletDisplaysPage` 2곳의 "공개 뷰어가 아직 화면 세트를 소비하지 않아…" → 실제로는 태블릿 runtime·코너 QR 모두 `resolveScreenSetSections` 로 세트를 소비하며, legacy 값은 **세트 미적용 코너의 fallback** 만 결정한다고 정정. |

---

## 6. M-1 — 보관 QR 상태 표시 · 출력 차단 (2차, 재개 후 완료)

병렬 세션이 `b3aae68b1` 로 `store-qr.service.ts` 추출을 커밋해 충돌이 해소된 뒤 재개했다.
**새 WO 를 만들지 않고 같은 WO 를 이어서** 마감했다. schema·migration 변경 0.

### 6-1. 목록 소실 수정 — `listStoreQrCodes()`

`WHERE qr.is_active = true` → `WHERE qr.is_active = true OR ARCHIVED_SCREEN_SET_QR_CONDITION`.
§2 에서 신설해 둔 SSOT 조각(`SCREEN_SET_QR_JOIN` / `ARCHIVED_SCREEN_SET_QR_CONDITION`)을 그대로 재사용했다.

- 보관 Screen Set 의 코너 QR → 목록에 **'보관' 상태로 유지**(주소·row 불변).
- 사용자가 직접 삭제한 일반 QR(`is_active=false`, Screen Set 무관) → 기존대로 숨김.
- `total` 카운트 쿼리도 **동일 WHERE** 로 맞춤(페이지네이션 정합).
- additive 응답 필드: `screenSetId` / `screenSetStatus`('active'|'archived'|null) / `landable`.

> **공통 모듈 영향 확인(CLAUDE.md Shared Module Rule)**: `listStoreQrCodes` 소비처는
> KPA 공통 라우트 + `PharmacyHubStoreQrController` 2곳. Pharmacy-Hub 는 태블릿·Screen Set 축이 없어
> (병렬 세션이 `storeMenuConfig.ts` 에 "태블릿은 이 회차 제외" 명시) `landing_type='screen_set'` 행이 0건 →
> **결과 집합 불변**. 추가 필드는 additive 라 기존 프론트 계약 무영향.

### 6-2. 출력 우회 차단 — `findStoreQrCode()` + `/image`

두 가지를 함께 닫았다.

1. **`/pharmacy/qr/:id/image` 만 게이트가 없었다** → `requireActive: true` 적용.
   화면에서는 출력이 막혀도 URL 직접 호출로 이미지가 나오던 우회 제거.
2. **`requireActive` 자체를 archive 판정으로 승격** — `is_active` 만 보면 공개 랜딩과 어긋난다.
   코너 QR 은 `landingType='screen_set'` 일 때 대상 세트가 유효한지(`origin='store'`, 미삭제, 미보관)
   추가 확인하고, 아니면 **409 `SCREEN_SET_ARCHIVED`** + 복원 안내를 돌려준다.
   → `/image` · `/export` · `/print` · `/flyer` 4개 출력 경로가 공개 랜딩과 같은 기준을 쓴다.

### 6-3. 프론트 (StoreQRPage)

- 코너 QR 행에 **`보관` 배지** + 안내문("화면 세트가 보관되어 이 QR은 열리지 않습니다 · 주소는 유지되며 보관 해제 시 다시 열립니다").
- 출력 버튼 → **`출력 불가`(disabled)** 로 대체(서버 409 와 동일 판정. 왕복 낭비 방지).
- 일괄 출력: `전체 선택` 분모를 출력 가능 건수로 변경, 선택에 보관 QR 이 섞이면 **조용히 빼지 않고**
  토스트로 알린 뒤 제외.
- 목록 상단에 `활성 N건 · 보관 M건 — 홈의 '활성 QR' 숫자와 같은 기준입니다` 표기 →
  **KPI ↔ 목록 대조가 화면에서 바로 가능**(§2 의 부분 반영 주의 해소).

> `landable` 미제공(구버전 응답) 시 `isActive` 로 안전 폴백 — 배포 순서 무관하게 화면이 깨지지 않는다.

---

## 7. 이미 성립하는 계약(재확인, 무변경)

`WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1` 로 이미 구현되어 있어 이번 WO 에서 손대지 않았다.

- 보관(`DELETE /screen-sets/:id`, `PATCH {status:'archived'}`) → 같은 트랜잭션에서 `setScreenSetQrActive(false)`.
  **slug · QR row · `landing_target_id` 불변** (재생성·삭제 없음).
- 복원(`PATCH {status:'active'}`) → `deleted_at = NULL` + `setScreenSetQrActive(true)` → **동일 slug 재개방**.
- 공개 랜딩: 보관 QR 은 `410 SCREEN_SET_INACTIVE`(종료 안내), 일반 비활성 QR 은 `404`.
  `Cache-Control: no-store` 로 archive/restore 즉시 반영.
- QR 중복 생성 금지: `ensureScreenSetQr` 멱등(partial unique + 위반 catch 후 재조회).
- `publicQrSlug` 불변 / 공개 GET DB write 0(`WO-O4O-SCREEN-SET-QR-WRITE-BOUNDARY-FIX-V1`).

---

## 8. 검증

| 항목 | 결과 |
|---|---|
| `web-kpa-society` tsc --noEmit | ✅ PASS (0) |
| `web-neture` tsc --noEmit (편집기 3번째 소비자) | ✅ PASS (0) |
| `api-server` tsc --noEmit (`build:types` 선행) | ✅ PASS (0) |
| eslint (변경 5개 주요 파일) | ✅ 0 errors / 2 warnings — **둘 다 기존 경고**(stash 대조로 확인, 라인 번호만 이동) |
| `store-public/__tests__` vitest | ⚠️ **기존 실패** — `describe is not defined`(vitest globals 미설정). 본 변경 stash 후 동일 실패 확인 → **무관**. CLAUDE.md 중지 조건 "현재 변경과 무관한 test 실패" 에 따라 미수정. |

### 2차(M-1) 검증

| 항목 | 결과 |
|---|---|
| `web-kpa-society` tsc --noEmit | ✅ PASS (0) |
| `api-server` tsc --noEmit | ✅ PASS (0) |
| `node scripts/lint-ratchet.mjs` (CI gate) | ✅ **102 errors = baseline 102** → 회귀 0 |
| `services/store/__tests__/store-qr.service.test.ts` | ⚠️ **기존 실패** — `jest is not defined`(병렬 세션의 **미추적 WIP** 테스트가 vitest 러너에서 `jest.mock` 사용). 본 변경 stash 후 동일 실패 확인 → **무관**. 타 세션 소유 파일이라 미수정. |

> 그 테스트 파일은 create/update/deactivate/resolvePublicQrLanding 만 다루고
> `listStoreQrCodes`·`findStoreQrCode` 는 다루지 않아, 본 변경과 계약 충돌도 없다.
| 브라우저 E2E (프로덕션) | ⏸ 미실시 — M-1 미착수로 WO 검증 항목 일부(보관 QR 목록 표시·출력 차단·KPI↔목록 일치)를 확인할 수 없어, **사용자 결정에 따라 M-1 완료 후 일괄 수행** |

### 배포 · CI (커밋 `90aef6023`)

| 워크플로 | 커밋 | 결과 |
|---|---|---|
| Deploy Web Services (Cloud Run) | `90aef6023` | ✅ success |
| Deploy Admin Dashboard (Cloud Run) | `90aef6023` | ✅ success |
| Deploy API Server (Cloud Run) | `90aef6023` | ✅ success |
| CI Pipeline | `90aef6023` | ⚠️ **cancelled** — 실패 아님(아래 주) |
| CodeQL Security Analysis | `90aef6023` | ⚠️ **cancelled** — 실패 아님(아래 주) |
| CI Pipeline | `a414d9ff6` | ✅ success |
| CodeQL Security Analysis | `a414d9ff6` | ✅ success |

> **취소 사유**: 본 커밋 직후 병렬 세션이 **docs-only** 커밋 `a414d9ff6`
> ("의약품 접근정책 확정 + 운영 DB 노출 실측")를 push 했고, CI Pipeline·CodeQL 의
> `concurrency: cancel-in-progress` 정책이 이전 실행을 대체했다.
> `a414d9ff6` 는 문서만 변경해 **코드 트리가 `90aef6023` 과 동일**하므로,
> 그 커밋의 CI Pipeline·CodeQL success 가 본 변경의 CI 검증에 해당한다.
> (취소된 실행 자체를 "통과"로 기록하지 않는다 — 대체 실행 결과로 확정.)

**프로덕션 반영 상태**: 3개 배포 모두 success → M-2·M-5(서버) + M-3·M-4·§6(프론트) LIVE.
M-1 은 미반영(§6 참조).

---

## 8-A. 프로덕션 실측 (운영 DB read-only + 무인증 공개 URL)

검증 스크립트: `scripts/audits/qr-screenset-state-alignment-verify.sql` (READ-ONLY, 세션 고정).
접속: Cloud SQL Auth Proxy v2 (`--token $(gcloud auth print-access-token)`).

### A-1. 판정식이 운영 데이터에서 바꾸는 것 (M-1·M-2 근거)

`screen_set` QR 전량 상태 분포:

| QR `is_active` | Screen Set 상태 | 건수 | 의미 |
|:---:|:---:|---:|---|
| `true` | active | 12 | 정상 활성 (구·신 판정 동일) |
| `true` | **archived** | **6** | ⚠️ 구 KPI 가 활성으로 **과다 집계**하던 건 (공개 랜딩은 404) |
| `false` | archived | 16 | 구 목록에서 **완전히 사라지던** 건 |

매장별 구/신 대조:

| 매장 | 구 `is_active` 집계 | 신 `landable` | 신규 목록 노출(보관) |
|---|---:|---:|---:|
| 테스트 약국 | 27 | **21** | **20** |
| Sohae 약국 | 0 | 0 | **2** |

→ **M-2**: 활성 QR KPI 과다 집계 **6건** 실제로 존재했고 정정된다.
→ **M-1**: 보이지 않던 보관 코너 QR **22건**이 '보관' 상태로 복귀한다.

> 데이터 특성 확인: 보관분 중 3건은 `status='draft'` + `deleted_at IS NOT NULL` 이다.
> `ARCHIVED_SCREEN_SET_QR_CONDITION` 을 `status='archived'` 단독이 아니라
> **`(deleted_at IS NOT NULL OR status='archived')`** 로 둔 판단이 실데이터로 검증됐다
> (status 만 봤으면 이 3건을 놓쳤다).

### A-2. 공개 QR 랜딩 실측 (무인증 `GET /qr/public/:slug`)

**M-5 — 상품 fallback 제거 (1차 배포분 `90aef6023` 이미 LIVE)**

| slug | 코너 적용 | product_list config | 결과 |
|---|:---:|---|---|
| `tablet-corner-14` (감기 코너) | 미적용 | `legacy_tablet_displays` | `products=0` ✅ |
| `tablet-corner-13` (위장약) | 미적용 | `legacy_tablet_displays` | `products=0` ✅ |
| `tablet-corner-8` · `-11` | 미적용 | `(none)` | `products=0` ✅ |
| `tablet-corner-2` · `-5` | **적용됨** | legacy | `products=0` ✅ |

전부 `selectionMode=selected` · `localProductsEndpoint=null` — 소비처가 매장 전체 상품을 재조회할 경로가 없다.
동시에 `corner_description + content_list + qr_guide` 섹션은 그대로 내려온다
→ **"상품 0건이면 빈 상태 또는 코너 콘텐츠만 표시"** 계약 성립. 다른 코너 상품 유입 0.

> ⚠️ **운영상 중요**: 현재 운영 DB 의 `product_list` 블록 **12개 전부가 legacy**(선택 상품 0)다
> (`selected_products` 사용 0건). 따라서 이 변경 이후 **모든 코너 QR 의 상품 노출이 0** 이며,
> 매장이 편집기에서 상품을 직접 고르는 시점부터 다시 표시된다. 이는 WO §5 가 지시한 계약 그대로다
> (과거에 보이던 상품은 그 코너의 상품이 아니라 매장 전체 폴백이었다).

**보관 QR 공개 랜딩 차단**

| slug | 상태 | 응답 |
|---|---|---|
| `tablet-corner-15` | `is_active=false` | **410** `SCREEN_SET_INACTIVE` + 종료 안내 ✅ |
| `tablet-corner-4` | `is_active=true` + 세트 보관 | **404** `SCREEN_SET_UNAVAILABLE` ✅ |
| `tablet-corner-2/5/8/11/13/14` | 활성 | **200** ✅ |

두 보관 변형 모두 **랜딩 불가**로 일치한다(코드 경로가 달라 상태코드만 410/404 로 갈린다).

### A-3. 인증 계정 — 해소 (기록 보존)

1차에서는 문서의 두 계정이 모두 실패해 인증 E2E 를 중지했다
(`sohae21@naver.com` 403 `ACCOUNT_NOT_ACTIVE` / `sohae2100@gmail.com` 401 `INVALID_CREDENTIALS`).
사용자가 `docs/local/TEST-ACCOUNTS.local.md` 를 갱신해 `renagang21@gmail.com` 로 **로그인 성공**,
아래 A-6 · A-7 로 인증 E2E 를 완료했다.

로그인 직후 확인(중지 조건 점검):

| 항목 | 값 |
|---|---|
| roles | `kpa:store_owner` 포함(외 6종) |
| `/pharmacy/qr` organizationId | **`9c87f46b-57a1-4afe-80bd-60782c49ce96`** = 테스트 약국 |

→ 검증 대상 매장 축과 일치. 중지 조건 미해당.

> ⚠️ **별건 발견 — 본 WO 범위 밖**: kpa-society 웹 로그인 폼은 `serviceKey:'kpa-society'` 를 함께 보내는데,
> **같은 계정·같은 비밀번호가 `serviceKey` 유무로 결과가 갈린다.**
>
> | 요청 | 결과 |
> |---|---|
> | `{email,password}` | **200 성공** |
> | `{email,password,serviceKey:'kpa-society',includeLegacyTokens:true}` | **401 `INVALID_CREDENTIALS`** |
>
> 운영 DB 확인 결과 **중복 사용자 레코드 없음(1건)** · `kpa-society` service_membership **active** ·
> 비밀번호 해시 1개 → 중복 계정도 멤버십 게이트도 아니다. 즉 **웹 UI 로는 이 계정이 로그인할 수 없다.**
> 인증 계약 문제라 본 WO 에서 고치지 않고 **후속 WO 대상**으로 남긴다.
> UI 검증은 정상 경로(`serviceKey` 미전송)로 받은 토큰을 SPA 저장소에 주입해 수행했다 —
> 검증 대상(목록 렌더·필터·이동·미리보기)은 동일 API 응답을 소비하므로 판정에 영향이 없다.

### A-4. M-1 배포 후 공개 랜딩 회귀 검사 (`4e9ccc303` API 배포 완료 후)

M-1 은 `listStoreQrCodes` / `findStoreQrCode`(인증 경로)만 바꿨고 공개 랜딩 경로는 건드리지 않았다.
배포 후 재실측으로 **회귀 0** 확인:

| 대상 | 결과 |
|---|---|
| 활성 코너 QR 6종(`-2` `-5` `-8` `-11` `-13` `-14`) | 전부 **200**, `products=0 selectionMode=selected endpoint=null`, 4개 섹션 유지 — 배포 전과 동일 |
| `tablet-corner-15`(is_active=false) | **410** 유지 |
| `tablet-corner-4`(세트 보관 + is_active=true) | **404** 유지 |

### A-5. 배포 · CI (`4e9ccc303`)

| 워크플로 | 결과 |
|---|---|
| Deploy Web Services (Cloud Run) | ✅ success |
| Deploy API Server (Cloud Run) | ✅ success |
| CodeQL Security Analysis | ✅ success |
| CI Pipeline | ⚠️ **cancelled** — 아래 주 |

> **CI Pipeline 미확정 주의(정직 기록)**: 병렬 세션이 짧은 간격으로 계속 push 하고 있어
> `concurrency: cancel-in-progress` 로 **연속 6개 커밋의 CI Pipeline 이 전부 취소**됐다
> (`442646b87` · `e30358f92` · `79e611c57` · `4e9ccc303` · `a7486832a` · `89dc2599c`).
> 마지막 success 는 `a414d9ff6` 로, **M-1(`4e9ccc303`) 을 포함하지 않는다.**
> → 현시점에서 M-1 은 **CI Pipeline 으로 확인되지 않았다.** 대신 CI 의 실제 게이트를 로컬에서 동일하게 실행했다:
> `type-check:frontend`(kpa PASS) · api-server `type-check`(PASS) · `node scripts/lint-ratchet.mjs`(102 = baseline).
> 후속 커밋의 CI Pipeline 이 성공하면 그 시점에 확정된다(코드 트리에 M-1 포함).

---

## 8-B. 인증 프로덕션 E2E (최종 재개 — 별도 worktree)

작업 환경: worktree `C:/Users/sohae/o4o-kpa-qr-e2e`, 브랜치 `work/kpa-qr-screenset-e2e`.
계정 `renagang21@gmail.com` / 매장 org `9c87f46b…`(테스트 약국).

> **worktree 부트스트랩 함정 2건**(기록): 새 worktree 는 ① `pnpm` 자체가 실행되지 않는다
> (메인 저장소는 `node_modules/.bin/pnpm` 으로 해결되는데 새 worktree 엔 그게 없다 →
> `VOLTA_FEATURE_PNPM=1` 로 Volta 핀 활성화), ② `pnpm install` 만으로는 `type-check:frontend` 가
> `TS2307`(@o4o/auth-utils 등 dist 부재)로 실패한다 → CI 처럼 **`pnpm run build:packages` 선행** 필요.

### B-1. API E2E

| # | 검증 | 결과 |
|---|---|---|
| 1 | 목록에 보관 코너 QR 노출 | ✅ total **41**(구 21) — 보관 **20건** 복귀, 전부 `screenSetStatus=archived`·`landable=false` |
| 2 | 활성 코너 QR | ✅ 12건 `landable=true` |
| 3 | 활성 QR KPI ↔ 목록 활성 | ✅ **KPI 21 = 목록 landable 21** |
| 4 | `/image` 보관 차단 | ✅ **409 `SCREEN_SET_ARCHIVED`** |
| 5 | `/export` 보관 차단 | ✅ **409** |
| 6 | `/flyer` 보관 차단 | ✅ **409** |
| 7 | 활성 QR 출력 | ✅ `/image`·`/export` 200 (flyer 는 400 `NOT_PRODUCT_QR` — 코너 QR 은 상품 QR 이 아니므로 정상) |

**핵심 근거**: 차단 대상으로 쓴 `tablet-corner-4` 는 `is_active=true` + 세트 보관이다.
구 게이트(`is_active` 단독)라면 **통과**했을 케이스가 409 로 막히는 것을 실측했다 →
`is_active` 가 아니라 **Screen Set lifecycle 을 포함한 판정이 canonical** 임이 실데이터로 확정.

### B-2. 보관 → 복원 → 재보관 왕복 (`[QRLC] lifecycle test` 픽스처)

| 단계 | 공개 `/qr/qrlc-lifecycle-test` | `/image` | 목록 | KPI |
|---|---|---|---|---|
| 보관(초기) | **410** `SCREEN_SET_INACTIVE` | 404 | `landable=false` · 보관 20 | 21 |
| 복원(`PATCH status=active`) | **200** | **200** | `landable=true` · 보관 19 | **22** |
| 재보관(`DELETE`) | **410** | 404 | `landable=false` · 보관 20 | 21 |

- 복원 응답의 `publicQrSlug` **불변**(`qrlc-lifecycle-test`), 공개 랜딩의 **`qrId` 도 동일**(`8c4b4687…`)
  → **동일 QR row · 동일 slug 재개방 계약 성립**.
- KPI 가 21↔22 로 목록과 항상 연동.
- **운영 콘텐츠 미변경** — 테스트 픽스처만 사용했고 원래 상태로 되돌렸다.

### B-3. 브라우저 UI (Playwright · Chromium)

| # | 검증 | 결과 |
|---|---|---|
| U6a | 목록 요약 표기 | ✅ `활성 21건 · 보관 20건` |
| U1a | `보관` 배지 | ✅ 20개 |
| U1b | 보관 안내문(주소 유지·복원 시 재개방) | ✅ |
| U2 | 출력 버튼 | ✅ `출력 불가` 20개, `disabled=true` |
| U3 | `태블릿 코너` 필터 | ✅ 동작(코너 32행) |
| U4a | `화면 세트 열기` 이동 | ✅ `/store/commerce/tablet-displays` |
| U4b | **활성** 세트 편집기 진입 | ✅ |
| U5a | 편집기 QR 모바일 미리보기 주소 표기 | ✅ `실제 QR 주소: https://kpa-society.co.kr/qr/tablet-corner-14` — 해당 행 slug 와 일치 |
| U6b | 홈 KPI ↔ 목록 활성 | ✅ **21 = 21** (화면 대조) |
| U6c | 홈 QR 링크 | ✅ 2개(KPI 카드 + 실행 흐름) |

4xx/콘솔 오류 0건(활성 경로). 스크린샷은 세션 scratchpad 에 보관.

### B-4. E2E 로 발견해 수정한 결함 2건

두 건 모두 **M-1 과 같은 계열의 잔여 우회**다 — 구현 시점 정적 분석으로는 드러나지 않았고 실서버 호출로 드러났다.

| # | 결함 | 조치 | 커밋 |
|---|---|---|---|
| D1 | `POST /pharmacy/qr/print` 만 `findStoreQrCode` 를 안 거치고 raw QueryBuilder 로 `is_active` 만 검사 → **보관 QR 이 200 으로 인쇄**(실측) | `screenSetQrPrintablePredicate()` 를 판정식 SSOT 에 추가(기존 `QR_LANDABLE_CONDITION` 은 JOIN 전제라 QueryBuilder 재사용 불가) 후 적용. 이어서 전량 보관 요청은 단건과 같은 **409 `SCREEN_SET_ARCHIVED`** 로 통일 | `48faea93e` · `028ec93d2` |
| D2 | QR 목록 `화면 세트 열기` 가 **보관 행에서 dead action** — `GET /screen-sets/:id` 가 `deleted_at IS NULL` 게이트로 404 → 토스트만 뜨고 목록에 머묾(실측) | 보관 행은 편집기 자동 진입 대신 **태블릿 콘텐츠 목록(보관 해제 지점)** 으로 이동 + title 변경. 활성 행은 기존대로 편집기 직행 | `028ec93d2` |

> D1 은 "화면에서 막았으니 됐다" 로 끝냈으면 남았을 **API 직접 호출 우회**다.
> 이로써 목록 · KPI · 출력 4경로 · 공개 랜딩이 모두 같은 판정을 쓴다.

### B-5. 수정 배포 후 재실측 (`028ec93d2` Web·API 배포 success)

**D1 — 출력 4경로 최종 상태**

| 경로 | 보관 코너 QR | 활성 코너 QR |
|---|---|---|
| `POST /pharmacy/qr/print` (전량 보관) | **409 `SCREEN_SET_ARCHIVED`** | 200 PDF |
| `GET /pharmacy/qr/:id/image` | **409** | 200 |
| `GET /pharmacy/qr/:id/export` | **409** | 200 |
| `GET /pharmacy/qr/:id/flyer` | **409** | 400 `NOT_PRODUCT_QR`(코너 QR ≠ 상품 QR — 정상) |

혼합 요청(`보관+활성`)은 200 으로 **유효분만** 인쇄된다 — 프론트가 보관분을 명시 제외·안내하므로
화면 경로로는 도달하지 않고, API 직접 호출에서도 보관 QR 은 결코 인쇄되지 않는다.

**D2 — 보관 행 액션 재실측**

| 확인 | 결과 |
|---|---|
| 액션 title | `태블릿 콘텐츠에서 보기 (보관 해제하면 편집·출력이 다시 열립니다)` |
| 이동 | ✅ `/store/commerce/tablet-displays` 태블릿 콘텐츠 탭 |
| 편집기 자동 진입 | ✅ 열리지 않음(의도대로) |
| 오류 토스트 | ✅ 없음 |
| 클릭 후 4xx | ✅ **0건** (수정 전에는 `GET /screen-sets/:id` 404) |

---

## 9. 병렬 세션 비접촉 확인

수정하지 않은 타 세션 소유 파일:

```
 M apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts
 M apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts
 M services/web-pharmacy-hub/src/App.tsx
?? apps/api-server/src/services/store/store-qr.service.ts
?? apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStore{Manual,Qr}Controller.ts
?? services/web-pharmacy-hub/src/{lib/api,pages}/...
```

`git commit -- <pathspec>` 로 **본 WO 산출물만** 커밋(다른 세션 stash·미추적 파일 미접촉).
기존 stash 2건(`wip-not-mine-cross-session`, `wip-kcos-operator-pages`) 도 그대로 보존.
