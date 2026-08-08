# CHECK — WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1` (매장 실행 자산 — QR / POP / 태블릿 / 사이니지 / 상품 설명서) |
| 검증일 | 2026-08-08 |
| 환경 | 로컬 (typecheck · build) — **프로덕션 배포·smoke 미수행** |
| 결과 | **PARTIAL** — 5개 축 중 **2개 완료(QR · 상품 설명서)**, 1개 중지(태블릿), 2개 미착수(POP · 디지털 사이니지) |

> 이 문서는 **완료 보고가 아니다.** 완료된 축과 완료되지 않은 축을 분리해 기록한다.
> 작업요청서 §완료 기준 14개 중 충족한 것은 아래 §7 에 표로 남긴다.

---

## 0. 축별 결론 요약

| 축 | 상태 | 근거 |
|---|---|---|
| A. QR | **완료** (backend + frontend + 공개 랜딩 + 메뉴) | §2 |
| E. 상품 설명서 | **완료** (조회 전용, 설명서 write 0) | §3 |
| C. 태블릿 | **중지** — 작업요청서 중지 조건 "병행 세션 파일과 실제 충돌" 해당 | §4 |
| B. POP | **미착수** — 중지 조건 아님. 이번 세션에서 구현하지 못했다 | §5 |
| D. 디지털 사이니지 | **미착수** — 중지 조건 아님. 이번 세션에서 구현하지 못했다 | §5 |

작업요청서는 "한 자산 유형이 중지 조건에 걸렸다고 전체를 중단하지 않는다" 고 지시한다.
따라서 독립적으로 안전한 QR · 설명서는 완결했고, 태블릿은 근거를 남기고 중지했다.
**POP · 사이니지는 막힌 것이 아니라 완료하지 못한 것이다** — 이 구분을 흐리지 않는다.

---

## 1. Canonical SSOT 조사 결과 (5개 축 전부)

실제 저장소 조사로 확정한 원장·API·조직 해석이다. 판정 기준이 둘 이상인 축은 없었다.

| 축 | 저장 SSOT | 공통 API 위치 | 기존 조직 해석 |
|---|---|---|---|
| QR | `store_qr_codes` + `store_qr_scan_events` | `o4o-store/controllers/store-qr-landing.controller.ts` (`/pharmacy/qr/*`, `/qr/public/:slug`) | `createRequireStoreOwner` ❌ |
| POP | `store_pops` (사본 row) + PDF 생성기 | `pop.controller.ts` (slug staff) · `store-pop.controller.ts` (`/pharmacy/pop/generate`) | slug + `created_by` / KPA util ❌ |
| 태블릿 | `store_tablets` · `store_tablet_displays` · `store_tablet_screen_sets` | `platform/store-tablet.routes.ts` (`/api/v1/store/tablets`, `/screen-sets`) | `createRequireStoreOwner` (serviceKey **미지정**) ❌ |
| 사이니지 | `store_playlists` (+items) — 매장 소유. `signage_media` 는 **서비스 단위 원본**(매장 소유 아님) | `o4o-store/controllers/store-playlist.controller.ts` (`/store-playlists`) | `resolveStoreAccess` ❌ |
| 설명서 | `shared_product_descriptions` (`description_type='STORE'`, `status='canonical'`) + `product_landings` | `platform/store-handled-products.routes.ts` (`/handled-products/qr`) · `ProductLandingService` | `resolveStoreAccess` ❌ |

### 1-1. QR 이 두 개로 보이는 것에 대한 판정 — 중복 아님

`store_qr_codes`(매장 발행 QR, `/qr/{slug}`) 와 제품 Landing QR(`/p/{key}`) 은 **다른 계층**이다.

- 제품 Landing QR = F12 계층1 **Product Resource** (master 기준 고정 · 매장 무관 · QR 비저장 동적 생성)
- 매장 QR = F12 계층2 **Store Production Material** (매장 소유 · slug 원장 · 스캔 추적)

따라서 "QR/POP/tablet/signage 의 canonical SSOT 가 불명확하거나 중복됨" 중지 조건은 **해당하지 않는다.**
QR 화면은 전자를 쓰지 않고, 설명서 화면은 후자를 쓰지 않는다.

### 1-2. 공통 조직 해석을 그대로 쓸 수 없는 이유 (5개 축 공통)

`utils/store-owner.utils.ts` 의 `isStoreOwner()` 는

```sql
SELECT organization_id, role FROM organization_members
 WHERE user_id = $1 AND role IN ('owner','admin','manager') AND left_at IS NULL LIMIT 1
```

로 조직을 고른다 — **ORDER BY 없음 · service enrollment 조건 없음**. 다중 조직 계정에서 Pharmacy-Hub
enrollment 조직과 일치한다는 보장이 없다. 공통 가드 변경은 작업요청서 금지 항목이므로,
W7/W8 과 동일하게 **공통 service 추출 + PH service-scoped adapter** 를 적용했다.

---

## 2. 범위 A — QR (완료)

### 2-1. 공통 service 추출

`apps/api-server/src/services/store/store-qr.service.ts` **신규**

| 함수 | 역할 |
|---|---|
| `resolvePublicQrLanding` | 공개 랜딩 데이터 해석 + 스캔 이벤트 기록 (page/product/video/screen_set/link 분기) |
| `listStoreQrCodes` | 목록 (scanCount 집계 · aiDescriptionMode 파생) |
| `getStoreQrAnalytics` | 스캔 통계 (전체/오늘/7일 + 기기별) |
| `findStoreQrCode` | 출력 대상 단건 조회 (`requireActive` 옵션) |
| `createStoreQrCode` | 생성 (screen_set 멱등 재사용 · product 검증 · page 사본 가드 · 파생 기록 · marketing graph) |
| `updateStoreQrCode` | 수정 (slug 전역 unique 충돌 검사) |
| `deactivateStoreQrCode` | 비활성화 (soft delete) |

기존 공통 컨트롤러 `store-qr-landing.controller.ts` 는 자체 구현을 제거하고 **전부 위임**한다.
로직 복제 0. 응답 형태는 기존 nested envelope 그대로 유지했고, `screen_set` 재사용 시
`200 + reused:true`, 신규 시 `201` 이라는 기존 계약도 보존했다.

> 소비처 영향: KPA · GlycoPharm · K-Cosmetics 3개 서비스가 이 컨트롤러를 마운트한다.
> **인터페이스·응답·상태코드 무변경**의 기계적 위임 전환이며, 조직 해석(`createRequireStoreOwner`)은 손대지 않았다.

### 2-2. Pharmacy-Hub adapter

`controllers/pharmacy-hub/PharmacyHubStoreQrController.ts` **신규** — 조직 결정 + 연결 대상 검증 + envelope 매핑만 담당.

| 라우트 | 설명 |
|---|---|
| `GET /store-owner/qr` | 목록 (+`storeConnection`, `publicOrigin`) |
| `GET /store-owner/qr/sources` | 연결 대상 (자료함 · 매장 콘텐츠 · 매장 경영활용 제품) |
| `POST /store-owner/qr` | 생성 (slug 서버 발급) |
| `PUT /store-owner/qr/:id` | 이름·설명·상담 CTA 수정 |
| `DELETE /store-owner/qr/:id` | 비활성화 |
| `GET /store-owner/qr/:id/analytics` | 스캔 통계 |
| `GET /store-owner/qr/:id/export` | PNG / SVG / 인쇄용 PDF |
| `GET /qr/public/:slug` | **공개** 랜딩 (인증 없음) |

설계 판단 3가지:

1. **slug 는 서버가 발급한다.** `store_qr_codes.slug` 는 전역 unique 라 프론트가 정하면 다른 매장과 충돌한다.
2. **연결 대상은 매장 소유만 통과한다.** `resolveTarget()` 이 `store_execution_assets` /
   `kpa_store_contents(direct)` / `organization_product_listings` 를 각각 `organization_id` 로 검증한다.
   작업요청서 §상품 연결 원칙대로 `/store-owner/products` 의 **B2B 공급 offer 를 실행 자산 SSOT 로 쓰지 않는다** —
   매장이 취급 등록한 listing 만 연결한다.
3. **연결 대상과 slug 는 생성 후 수정 불가.** 이미 인쇄해 매장에 붙인 QR 이 조용히 다른 곳을
   가리키는 상황을 만들지 않기 위해서다. 목적지를 바꾸려면 새 QR 을 만든다.

V1 연결 유형은 `page` · `product` · `link` 로 제한했다. `video` · `screen_set` 은 Pharmacy-Hub 에
매장 동영상·태블릿 화면 세트 축이 아직 없어 **스캔하면 빈 화면이 되는 QR** 이 되기 때문이다.

### 2-3. 프론트엔드

| 파일 | 역할 |
|---|---|
| `lib/api/pharmacyHubStoreQr.ts` | API 클라이언트 (blob 다운로드 포함) |
| `pages/store-owner/QrPage.tsx` | 목록 · 생성 · 이름수정 · 내리기 · 스캔통계 · PNG/SVG/PDF 다운로드 |
| `pages/QrLandingPage.tsx` | **공개** `/qr/:slug` 랜딩 (셸 없음, 로그인 없음) |

공개 랜딩을 같은 WO 에서 함께 연 이유: QR payload 가 `https://pharmacyhub.co.kr/qr/{slug}` 이므로
이 화면이 없으면 매장이 인쇄한 QR 이 **아무 데도 닿지 못한다.** 관리 화면만 만드는 것은 미완성이다.

본문 렌더는 공통 `ContentRenderer` 를 쓰고, 매장용 설명서(sd-* 마크업)는 공통
`hasStoreDescriptionMarkup()` 으로 판별해 `variant="store-description"` 을 준다 —
이걸 빠뜨리면 CSS 스코프 래퍼 `.store-desc-content` 가 붙지 않아 **무스타일로 렌더**된다.

---

## 3. 범위 E — 상품 설명서 (완료, 조회 전용)

`controllers/pharmacy-hub/PharmacyHubStoreManualController.ts` **신규**

| 라우트 | 설명 |
|---|---|
| `GET /store-owner/manuals` | 매장 경영활용 제품 + 설명서 보유 언어 (검색·페이지네이션) |
| `GET /store-owner/manuals/:listingId` | 상세 (언어별 본문 · 이미 발급된 Landing) |
| `POST /store-owner/manuals/:listingId/qr` | 상품 QR 멱등 발급 |

canonical 판정은 **하나뿐**이며 새로 만들지 않았다:

```
shared_product_descriptions
  description_type = 'STORE' AND status = 'canonical' AND deleted_at IS NULL
  master_id = organization_product_listings.master_id
```

같은 기준을 공통 `ProductLandingService.getPublicLanding()` 과 공통
`store-handled-products.routes.ts` 가 이미 쓰고 있다. 본 컨트롤러는 그 기준을 **읽기만** 한다.

### 3-1. DB write 회계

- **설명서 write 0.** 생성·번역·수정 경로를 만들지 않았다.
- 유일한 write 는 `POST .../qr` 의 `product_landings` **멱등 발급**이며 사용자가 명시적으로
  QR 을 요청했을 때만 일어난다. 목록·상세 조회는 순수 읽기다 (`getByMaster()` — mint 하지 않음).
  KPA 의 `GET /handled-products/qr` 는 조회 시점에 mint 하지만, 여기서는 조회를 읽기로 유지했다.

### 3-2. 구현 중 발견해 고친 것

`shared_product_descriptions` 에는 **`title` 컬럼이 없다** (본문 = `content`, 요약 = `summary`).
초안에서 `SELECT title` 을 넣었다가 엔티티 확인 후 제거했다 — 그대로 뒀으면 상세 조회가 500 이 된다.

### 3-3. F12 정합

설명서는 계층1 Product Resource (master 기준) 이므로 **매장별 사본을 만들지 않았다.**
매장은 자기가 취급 등록한 제품의 것만 조회한다. 상품 QR 도 매장 QR 이 아니라 master 기준 고정
Landing(`/p/{key}`)이며 QR 이미지는 저장하지 않는다 (불변식 ③④).

---

## 4. 범위 C — 태블릿 (중지)

**중지 조건 해당: "병행 세션 파일과 실제 충돌"**

작업 중 `git status` 확인 결과, 다른 세션이 태블릿·Screen Set 축을 **동시에 수정 중**이다
(세션 시작 시점에는 clean 이었고, 작업 중 나타났다):

```
M apps/api-server/src/routes/platform/store-tablet.routes.ts
M apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts
M apps/api-server/src/routes/platform/store-screen-set-qr.service.ts
M packages/tablet-kiosk-core/src/TabletKioskPage.tsx
M packages/tablet-screen-set-editor/src/index.tsx
M services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx  (외 KPA/Neture screen-set 화면 다수)
D services/web-kpa-society/src/components/pharmacy/HubSubNav.tsx
```

Pharmacy-Hub 태블릿을 구현하려면 `store-tablet.routes.ts`(2,325줄)에서 tablet/screen-set 계약을
공통 service 로 추출해야 하는데, **그 파일이 다른 세션의 dirty 상태**다. 접촉하면 그 세션의 작업을
훼손한다. 다른 세션 파일 불가침 원칙에 따라 **조사까지만 하고 수정하지 않았다.**

부수적으로, 이 축에는 별도 관찰 사항이 있다 (아래 §6 부채 ①).

---

## 5. 범위 B(POP) · D(사이니지) — 미착수

**중지 조건에 걸린 것이 아니다.** 두 축 모두 병행 세션과 충돌하지 않고, SSOT 도 명확하며
(§1 표), 재사용 계약도 확인되어 있다. 이번 세션에서 구현을 완료하지 못했을 뿐이다.

착수 시 필요한 것은 조사 완료 상태로 남아 있다:

- **POP**: `store_pops` 사본 원장 + `/pharmacy/pop/generate` PDF 생성기 재사용.
  단, Pharmacy-Hub 에는 운영자 HUB POP 원본이 없어(운영자 콘솔이 회원 승인까지만 구현)
  기존 **import 흐름만으로는 목록이 항상 비게 된다** — 매장 직접 작성(POST) 계약이 함께 필요하다.
  이는 공통 컨트롤러가 "본 WO 범위 외" 로 남겨둔 부분이라 신규 계약 추가에 해당한다.
- **사이니지**: `StorePlaylistRepository` 가 이미 존재해 PH 컨트롤러는 얇다.
  `addItemFromLibrary`(매장 `store_execution_assets`) 경로가 Pharmacy-Hub 의 유효한 입력이고,
  `addItemFromSignage`(서비스 단위 `signage_media`) 는 PH 원본이 없어 V1 대상 아님.

---

## 6. 발견 부채 (후속 WO 대상 — 이번 범위에서 고치지 않음)

① **`/api/v1/store/tablets` · `/screen-sets` 의 조직 해석이 service scope 없이 열려 있다.**
`store-tablet.routes.ts:215` 는 `createRequireStoreOwner(dataSource)` 를 **serviceKey 없이** 호출한다.
back-compat 경로라 `ALL_STORE_OWNER_ROLES`(= `pharmacy-hub:store_owner` 포함) 를 전부 통과시키고,
조직은 정렬 없는 `organization_members LIMIT 1` 로 정해진다. 즉 다중 조직 계정에서 **의도하지 않은
자기 조직**이 선택될 수 있다. (타 사용자 매장 노출은 아니다 — 교차 사용자 누출이 아니라
같은 사용자의 다른 서비스 조직이 선택되는 문제다.)
공통 가드 변경은 본 작업요청서 금지 항목이므로 손대지 않았다. **별도 WO 필요.**

② `store-qr-landing.controller.ts` 에 **NUL 바이트 1개**가 있어 git 이 이 파일을 binary 로 취급한다
(`git diff` 가 텍스트로 표시되지 않는다). HEAD 에도 동일하게 존재하는 **기존 상태**이며 이번 변경과 무관하다.
리뷰 가시성을 해치므로 별도 정리 권장.

③ Pharmacy-Hub QR 의 `video` · `screen_set` 연결 유형은 해당 축(매장 동영상 · 태블릿)이
Pharmacy-Hub 에 생긴 뒤 열어야 한다. 공통 service 는 이미 지원하므로 PH 컨트롤러의
`ALLOWED_LANDING_TYPES` 확장만으로 열린다.

---

## 7. 작업요청서 §완료 기준 대조

| # | 기준 | 결과 |
|:--:|---|---|
| 1 | QR 관리 정상 | ✅ 구현 완료 (프로덕션 smoke 미수행) |
| 2 | POP 관리 정상 | ❌ 미착수 |
| 3 | 태블릿 screen-set 관리 정상 | ❌ 중지 (병행 세션 충돌) |
| 4 | 디지털 사이니지 관리 정상 | ❌ 미착수 |
| 5 | 상품 설명서 조회 정상 | ✅ 구현 완료 (프로덕션 smoke 미수행) |
| 6 | 전부 PH enrollment 조직으로 격리 | ✅ 구현된 2개 축 모두 `resolvePharmacyHubStoreOrganization()` 단일 경로 |
| 7 | 원본·사본 독립성 유지 | ✅ page QR 은 `ensureStoreCopyForPageTarget` 로 매장 사본 참조. 설명서는 사본을 만들지 않는 계층1 자산 |
| 8 | 미연결·ambiguous write 0 | ✅ 코드 경로상 write 전부 `sendWriteBlocked` 선행 — **실계정 실측 미수행** |
| 9 | 메뉴·route 정합 | ✅ '매장 실행' 그룹에 QR · 상품 설명서만 추가 |
| 10 | dead link · 준비 중 화면 0 | ✅ POP/태블릿/사이니지는 **메뉴를 만들지 않았다** |
| 11 | W1~W8 및 타 서비스 회귀 0 | ⚠️ typecheck·build 통과. **런타임 회귀 검증 미수행** (§8) |
| 12 | 테스트 자산 원상 복구 | — 해당 없음 (DB write 미수행) |
| 13 | 배포 · production smoke PASS | ❌ **미수행** |
| 14 | CHECK · commit · push 완료 | ⚠️ CHECK 작성 · commit 완료 / **push 보류** (§8) |

---

## 8. 검증 실측 결과 — 수행한 것과 하지 않은 것

### 수행

| 항목 | 결과 |
|---|---|
| `tsc -p apps/api-server/tsconfig.json --noEmit` | **PASS** (exit 0) |
| `pnpm --filter pharmacy-hub-web type-check` | **PASS** |
| `pnpm --filter pharmacy-hub-web build` | **PASS** (3,478 modules) |
| 병행 세션 파일 격리 확인 | 내 변경 4개 파일에 타 세션 hunk 없음 (텍스트 diff 대조) |
| SPD 스키마 실측 | `title` 컬럼 부재 확인 후 쿼리 수정 (§3-2) |

### 하지 않음 — 숨기지 않고 명시한다

| 항목 | 사유 |
|---|---|
| 프로덕션 배포 | 미수행 |
| 프로덕션 브라우저 smoke | 미수행 |
| 미연결(renagang21) · AMBIGUOUS 계정 실측 | 미수행 — 코드 경로 검토만 |
| 교차 조직 격리 실측 (2개 자산 유형) | 미수행 |
| W1~W8 런타임 회귀 | 미수행 — typecheck/build 만 |
| KPA · GlycoPharm · K-Cosmetics QR 회귀 실측 | **미수행** — 공통 컨트롤러를 위임 전환했으므로 배포 전 필수 |
| QR 단위/통합 테스트 | 저장소에 QR 테스트가 **존재하지 않음** (신규 작성도 하지 않음) |

**push 를 보류한 이유**: 공통 `store-qr-landing.controller.ts` 위임 전환은 KPA · GlycoPharm ·
K-Cosmetics **3개 라이브 서비스**의 QR 경로에 영향을 준다. main push 는 CI 배포를 트리거하는데,
이 변경에 대한 런타임 회귀 검증이 아직 0 이다. 검증 없이 프로덕션에 내보내지 않는 편이 안전하다고 판단했다.

### 배포 전 반드시 확인해야 할 항목

1. KPA `/store/qr` — 목록 · 생성 · PNG/SVG/PDF 출력 · 스캔 통계 · 삭제
2. KPA 공개 랜딩 `/qr/:slug` — page · product · video · screen_set · 비활성(404) · screen_set 보관(410)
3. screen_set QR 멱등 재사용 (`200 + reused:true`) 및 `public_qr_slug` 동기화
4. GlycoPharm · K-Cosmetics QR 목록/생성 1건씩
5. Pharmacy-Hub `/store-owner/qr` · `/store-owner/manuals` · 공개 `/qr/:slug`

---

## 9. 변경 파일

### 신규

```
apps/api-server/src/services/store/store-qr.service.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStoreQrController.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStoreManualController.ts
services/web-pharmacy-hub/src/lib/api/pharmacyHubStoreQr.ts
services/web-pharmacy-hub/src/lib/api/pharmacyHubStoreManual.ts
services/web-pharmacy-hub/src/pages/store-owner/QrPage.tsx
services/web-pharmacy-hub/src/pages/store-owner/ManualsPage.tsx
services/web-pharmacy-hub/src/pages/store-owner/ManualDetailPage.tsx
services/web-pharmacy-hub/src/pages/QrLandingPage.tsx
docs/checks/CHECK-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1.md
```

### 수정

```
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts   (자체 구현 → 공통 service 위임)
apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts                    (+11 라우트)
packages/store-ui-core/src/config/storeMenuConfig.ts                              (PH '매장 실행' 그룹 — PH 블록만)
services/web-pharmacy-hub/src/App.tsx                                             (+4 라우트)
```

### 변경하지 않음 (금지 항목 준수)

DB schema · migration · PH 전용 실행자산 테이블 · 공통 `resolveStoreAccess` ·
공통 store-owner 가드 · ProductMaster 복제 · 설명서 신규 생성/번역 · 실제 결제 ·
실운영 태블릿 · 공급자/운영자 원본 · 원본·사본 row 공유 — **전부 무접촉.**

### `storeMenuConfig.ts` 의 커밋 귀속 (기록)

`packages/store-ui-core/src/config/storeMenuConfig.ts` 는 병행 세션도 같은 파일(다른 블록 — KPA 라벨)을
수정 중이었다. 내 hunk 만 선택 스테이징하려던 시점에 **병행 세션이 먼저 커밋(`90aef6023`)** 하면서
같은 파일의 Pharmacy-Hub '매장 실행' 메뉴 hunk 가 그 커밋에 함께 들어갔다.

- 내용 유실·중복 없음. 현재 파일에 PH '매장 실행' 그룹이 정상 반영되어 있음을 확인했다.
- 따라서 본 WO 커밋에는 이 파일이 포함되지 않는다 (이미 커밋됨).
- 그 세션 역시 반대 방향으로 중지 조건을 지켰다 — `90aef6023` 커밋 메시지의 M-1 항목이
  "수정 지점이 병렬 세션의 미커밋 파일(`store-qr-landing.controller.ts`, 신규 `store-qr.service.ts`)이라 미착수" 로
  기록되어 있다. **양 세션이 서로의 dirty 파일을 접촉하지 않았다.**

> 후속: `90aef6023` 의 CHECK §6 에 보존된 **M-1(보관 QR 목록 표시·출력 차단)** 은 이번에 위임 전환한
> `store-qr.service.ts` 를 수정 지점으로 삼는다. 본 커밋 이후 그 축에서 이어받을 수 있다.
