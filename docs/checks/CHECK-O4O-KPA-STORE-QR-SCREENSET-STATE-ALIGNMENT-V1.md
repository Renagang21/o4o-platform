# CHECK-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1

> WO: `WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1`
> 대상: KPA 매장 Screen Set(태블릿 코너 화면) ↔ 코너 QR 상태·상품 노출·목록·미리보기 정합
> 상태: **부분 완료** — M-1(보관 QR 목록·출력 차단) 은 **병렬 세션 파일 충돌로 미착수**(§중지 조건 발동)

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
| **M-1 보관 QR 상태 표시·출력 차단** | 서버 QR 목록/export | ⛔ **미착수 (중지 조건)** |

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

> ⚠️ **부분 반영 주의**: KPI 는 "실제 랜딩 가능 수"로 정정됐으나, **QR 목록은 여전히 `is_active=true` 기준**이다
> (M-1 미착수). 따라서 `is_active=true` + 세트 보관/삭제 인 QR 이 존재하는 매장에서는
> "KPI < 목록 표시 수" 가 될 수 있다. WO 검증 항목 "활성 QR KPI와 실제 활성 목록 수 일치" 는
> **M-1 완료 후에만 성립**한다. KPI 값 자체는 공개 랜딩 실동작과 일치한다(더 정확해짐).

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

## 6. ⛔ M-1 미착수 — 중지 조건 발동

**WO 중지 조건: "병렬 작업 핵심 파일 충돌"**

M-1(보관 QR 목록 노출 · 출력/다운로드 차단)의 수정 지점이 **다른 세션이 지금 편집 중인 파일**이다.

| 필요한 수정 | 파일 | 상태 |
|---|---|---|
| QR 목록에 보관 세트 종속 QR 포함 + `screenSetStatus`/`landable` 필드 | `apps/api-server/src/services/store/store-qr.service.ts` | **untracked (병렬 세션 신규 생성)** |
| `/pharmacy/qr/:id/image` 의 `isActive` 게이트 누락 보완 | `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts` | **dirty (병렬 세션 수정 중)** |

- 병렬 세션은 Pharmacy-Hub QR·매뉴얼 기능(`routes/pharmacy-hub`, `controllers/pharmacy-hub/*`,
  `services/web-pharmacy-hub/*`)을 위해 `store-qr-landing.controller.ts` 의 QR CRUD/목록/통계를
  `services/store/store-qr.service.ts` 로 추출하는 리팩터링을 진행 중이다(작업 중 실시간 갱신 확인).
- 해당 파일을 수정하면 병렬 세션의 미커밋 작업을 훼손하거나 반대로 덮어쓰일 수 있어 **미착수**로 남긴다.

### 확인된 M-1 결함(수정 대기 — 조사 결과 보존)

1. **목록 소실**: `GET /pharmacy/qr` 이 `WHERE qr.is_active = true` 라, Screen Set 보관 시
   `setScreenSetQrActive(..., false)` 로 비활성화된 코너 QR 이 **목록에서 완전히 사라진다**.
   QR row·slug 는 남아 있고 복원하면 같은 주소로 다시 열리는데(§7 확인), 매장은 그 사실을 확인할 수 없다.
   → 수정안: `SCREEN_SET_QR_JOIN` + `ARCHIVED_SCREEN_SET_QR_CONDITION`(§2 에서 이미 신설·미사용) 으로
   보관 세트 종속 QR 만 추가 노출. 사용자가 직접 삭제한 일반 QR(`is_active=false`, 세트 무관)은 계속 숨김.
2. **출력 게이트 비대칭**: `/pharmacy/qr/:id/export` · `/print` · `/flyer` 는 `isActive: true` 를 강제하지만
   **`/pharmacy/qr/:id/image` 만 `findOne({ id, organizationId })` 로 `isActive` 검사가 없다**
   → 보관 QR 의 PNG/SVG 다운로드가 가능하다. 나머지 3개와 동일하게 `isActive: true` 추가 필요.

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
| 브라우저 E2E (프로덕션) | ⏸ 미실시 — M-1 미착수로 WO 검증 항목 일부(보관 QR 목록 표시·출력 차단·KPI↔목록 일치)를 확인할 수 없어, M-1 완료 후 일괄 수행이 타당 |

### 미실시 E2E 항목(M-1 완료 후 수행 대상)

- 보관 시 QR 목록 보관 상태 표시 / 보관 QR 출력·다운로드 불가
- 활성 QR KPI ↔ 실제 활성 목록 수 일치
- 복원 후 동일 slug 재개방(코드상 성립 확인, 실측 대기)

### M-1 무관하게 실측 가능한 항목(E2E 대기)

- `태블릿 코너` 필터 / QR 목록 → 정확한 Screen Set 편집 화면 이동
- 편집기 모바일 미리보기 ↔ 실제 QR 랜딩 일치 / 초안 표기
- 미적용·상품 미선택 Screen Set QR 상품 0건 / 적용 세트는 선택 상품만
- 태블릿 공개 화면 회귀 없음

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
