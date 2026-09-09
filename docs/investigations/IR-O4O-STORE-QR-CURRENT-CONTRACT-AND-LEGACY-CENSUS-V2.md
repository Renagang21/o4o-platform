# IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2

> **성격**: READ-ONLY 조사 기록 (코드 변경 0 / DB write 0)
> **WO**: `WO-O4O-STORE-QR-CANONICAL-TARGET-AND-PLACEMENT-DESIGN-V1`
> **작성일**: 2026-09-09
> **기준 커밋**: `3dfd68357` (origin/main)
> **설계 산출물**: [`docs/design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md`](../design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md)
> **선행 기준**: [`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1`](../baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md) · [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`](../baseline/O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md)

---

## §0. V1 census 와의 관계 — 무엇을 재사용하지 않는가

본 문서는 [`IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1`](IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1.md) 의 **QR 축만** 승계하고, 그 문서의 **Tablet 축 판정은 재사용하지 않는다.**

```text
Tablet KPA/PH canonical axis 는 이미 구현·배포·E2E 까지 CLOSED 다.
과거 Tablet census 의 미해소 판정을 현재 상태로 재사용하지 않는다.
```

V1 census 이후 실제로 바뀐 것 2가지 — 본 V2 는 최신 `origin/main` 을 직접 읽어 작성했다.

| 변화 | 근거 | 본 문서 반영 |
|---|---|---|
| **GlycoPharm 서비스 전면 삭제** | `86bf574ae` `WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1` | `services/web-glycopharm/**` QR 파일 전부 소멸. `@o4o/store-ui-core` QR/Tablet View 의 소비처가 **K-Cosmetics 단독**으로 축소 (§17) |
| **Tablet 축 CLOSED** | `7971407f0` · `e47a5e8ba` · `73c21813b` · `b97a4dcc6` · `f75dc8a34` · `be5eb5fa7` · `cb3d23af9` | §10 Tablet QR 판정을 "미해소"가 아니라 "**연결할 상대가 이미 정본**"으로 취급 |

---

## §1. QR 전체 census (2026-09-09 실측)

### 1-1. DB / Entity — QR 원장은 **3개**다

| # | 테이블 | migration | Entity | 역할 | 프로덕션 row |
|:-:|---|---|---|---|---:|
| ① | `store_qr_codes` | `20260304120000` (+`20261125000000` CTA, +`20270207000000` screen_set) | `routes/platform/entities/store-qr-code.entity.ts` | **매장 실행자산 QR**. organization-scoped. 공개 `/qr/{slug}` | **88** |
| ① | `store_qr_scan_events` | `20260304130000` | `routes/platform/entities/store-qr-scan-event.entity.ts` | ①의 스캔 로그 (append-only) | **65** |
| ② | `product_landings` | `20261225000000` | (엔티티 없음 — raw SQL) | **ProductMaster 대표 랜딩**. master 당 UNIQUE. 공개 `/p/{public_key}` | **272,040** |
| ③ | `foreign_visitor_partner_qr_codes` | `20261122000000` | `modules/foreign-visitor-partner/*.entity.ts` | 외국인 관광객 파트너 QR (별도 축) | **0** |
| ③ | `foreign_visitor_partner_qr_scan_events` | `20261123000000` | 〃 | 〃 | **0** |
| — | `operator_qr_templates` | `20260524224943` | `routes/o4o-store/entities/operator-qr-template.entity.ts` | 운영자 HUB QR 템플릿. **slug·scan tracking 없음** — 매장이 가져가는 시점에 ①로 발급 | **0** |

**`store_qr_codes` 실제 컬럼 14개** (information_schema 실측):

```
id · organization_id · type · title · description · library_item_id
landing_type · landing_target_id · slug · is_active
created_at · updated_at · consultation_cta_enabled · consultation_cta_label
```

→ **placement 관련 컬럼은 0개다.**

**`store_qr_scan_events` 컬럼 7개**: `id · organization_id · qr_code_id · device_type · user_agent · referer · ip_hash · created_at`
→ **스캔 시점에 시스템이 아는 식별자는 `slug`(→ `qr_code_id`) 하나뿐이다.** 이것이 §7 placement 설계의 결정적 제약이다.

### 1-2. Backend — `store_qr_codes` 소비처 30개 파일

| 계층 | 파일 | 역할 |
|---|---|---|
| **계약 SSOT** | `services/store/store-qr.service.ts` | QR CRUD·검증·공개 landing resolve. `VALID_QR_LANDING_TYPES` 정의 |
| 계약 SSOT | `services/qr-print.service.ts` | PNG/SVG/PDF 생성. `QrExportPreset` = `small\|medium\|large\|a4\|a4_4up` |
| 계약 SSOT | `routes/platform/store-screen-set-qr.service.ts` | `QR_LANDABLE_CONDITION` · `SCREEN_SET_QR_JOIN` — **활성 QR 판정식 SSOT** |
| KPA 라우트 | `routes/o4o-store/controllers/store-qr-landing.controller.ts` (621L) | 공개 `/qr/public/:slug` + 매장 CRUD + analytics + image + print |
| KPA 라우트 | `routes/o4o-store/controllers/qr.controller.ts` (279L) | 운영자 템플릿 → 매장 QR **가져오기(사본) 전용** |
| PH 라우트 | `controllers/pharmacy-hub/PharmacyHubStoreQrController.ts` (604L) | PH 전용 조직 결정 + 대상 검증. **저장 계약은 공통 service 호출** |
| 연계 | `routes/o4o-store/controllers/store-pop.controller.ts` | POP PDF 에 QR URL embed (`qrId` 1개를 모든 아이템에 동일 적용) |
| 연계 | `routes/o4o-store/controllers/product-marketing.controller.ts` | 상품 ↔ 마케팅 자산 그래프. `assetType='qr'` 로 QR 조회 |
| 연계 | `routes/o4o-store/controllers/store-analytics.controller.ts` | 매장 KPI · TOP QR · device · 일별 추이 |
| 연계 | `routes/o4o-store/services/store-asset-derivation.service.ts` | 원본 → QR 파생 기록 (`store_asset_derivations`) |
| 연계 | `routes/o4o-store/controllers/operator-qr.controller.ts` | 운영자 템플릿 CRUD |
| 연계 | `modules/hub-content/hub-content.{controller,service}.ts` | HUB 콘텐츠 QR lead |
| 마운트 | `routes/kpa/kpa.routes.ts` · `routes/cosmetics/cosmetics.routes.ts` · `routes/pharmacy-hub/pharmacy-hub.routes.ts` · `routes/platform/store-tablet.routes.ts` | |
| 공개 | `routes/platform/store-public/{store-public-utils,store-public-screen-set-resolve}.ts` | |

### 1-3. Frontend — QR 파일 32개 / 총 9,153L

| 서비스 | 주요 파일 | 라인 | 상태 |
|---|---|---:|---|
| KPA | `pages/pharmacy/StoreQRPage.tsx` | 2,070 | 최대·최신 세대 (canonical 후보) |
| KPA | `components/store/StoreAssetSelectorModal.tsx` | — | **QR target source 5종 선택기** |
| KPA | `pages/qr/QrLandingPage.tsx` | 622 | 공개 랜딩 |
| KPA | `pages/pharmacy/StoreQrAiDescriptionPage.tsx` | 657 | `/store/marketing/qr/ai-description` |
| KPA | `pages/pharmacy/QrPrintTemplateModal.tsx` | 228 | 출력 preset UI |
| KPA | `components/store/StoreQrCreateModal.tsx` | 224 | |
| KPA | `pages/pharmacy/StoreProductQrModal.tsx` | 325 | 상품 QR |
| PH | `pages/store-owner/QrPage.tsx` | 617 | KPA 대비 축소판 |
| PH | `pages/QrLandingPage.tsx` | 120 | |
| KCos | `pages/store/StoreQrPage.tsx` | 78 | **`@o4o/store-ui-core` 위임** |
| 공통 | `packages/store-ui-core/src/components/qr/StoreQrConsoleView.tsx` | 598 | **소비처 = KCos 1곳뿐** |
| 공통 | `packages/store-ui-core/src/components/pop/PopQrSelector.tsx` | 40 | |
| 공통 | `packages/operator-core-ui/.../OperatorQrTemplateWritePage.tsx` | 439 | 운영자 템플릿 |
| Neture | `pages/store/QrLandingPage.tsx` · `pages/SellerQRGuidePage.tsx` | 133 / 629 | |
| KPA·PH | `ForeignVisitorPartnerQrCodesPage.tsx` | 354 / 354 | 제3 축 |

**GlycoPharm QR 파일 = 0** (서비스 삭제됨).

---

## §2. `type` vs `landing_type` — 최종 판정

### 2-1. 코드 상 소비 전수

| 위치 | `type` | `landing_type` |
|---|---|---|
| `store-qr.service.ts:757` (create) | `type: type || landingType` — **입력이 없으면 landingType 을 그대로 복사** | 검증 대상 (`VALID_QR_LANDING_TYPES`) |
| `store-qr.service.ts:840` (update) | 전달되면 그대로 저장 | 전달되면 저장 + 대상 재검증 |
| `store-qr.service.ts:124 / 452` (SELECT) | `qr.type` 을 응답에 포함 | `qr.landing_type AS "landingType"` |
| **분기 로직** | **0건** — `.type ===` / `switch` 로 분기하는 코드가 백엔드·프론트 전체에 **하나도 없다** | `landingType === 'screen_set' \| 'product' \| 'video' \| 'page'` 로 **모든 렌더링·검증이 분기** |
| KPA `StoreQRPage.tsx` | 응답 인터페이스에 존재하나 화면에서 미사용. `type: 'video'` 를 1곳에서 write | 목록 필터·라벨·생성 폼 전부 |
| PH `QrPage.tsx` | 미사용 | 전면 사용 |
| `StoreQrConsoleView.tsx` | **전송조차 하지 않음** | `StoreQrLandingType = 'link'\|'product'\|'promotion'\|'page'` |

### 2-2. 프로덕션 실측 (read-only, 2026-09-09)

```sql
SELECT type, landing_type, count(*), count(*) FILTER (WHERE is_active) FROM store_qr_codes GROUP BY 1,2;
```

| `type` | `landing_type` | 건수 | 활성 |
|---|---|---:|---:|
| `screen_set` | `screen_set` | 40 | 21 |
| `product` | `product` | 18 | 18 |
| `page` | `page` | 16 | 9 |
| `link` | `link` | 13 | 0 |
| `video` | `video` | 1 | 0 |
| **합계** | | **88** | **48** |

```sql
SELECT count(*) FROM store_qr_codes WHERE type IS DISTINCT FROM landing_type;  -- → 0
```

**불일치 0건.** `type` 은 `landing_type` 의 100% 중복 사본이며, 값을 읽어 분기하는 소비처가 존재하지 않는다.

### 2-3. 판정

| 필드 | 판정 | 근거 |
|---|---|---|
| `landing_type` | **`TARGET_TYPE`** (canonical 축) | 검증·렌더·게이트가 전부 이 값으로 분기 |
| `type` | **`LEGACY`** — write-only 중복 | 분기 소비처 0 · 프로덕션 불일치 0 |
| `DISPLAY_CLASSIFICATION` 용도 | **존재하지 않는다** | 목록 필터(`all\|content\|ai\|screen_set`)는 `landingType` + `aiDescriptionMode` 파생. `type` 은 화면에 나타나지 않음 |

> **이번 회차에서 migration 하지 않는다.** `type` 은 NOT NULL DEFAULT `'product'` 이라 제거에 DDL 이 필요하다. 매핑표는 §3, 폐기 순서는 설계 문서 §14 에 둔다.

### 2-4. 기존 값 → canonical 매핑표 (migration 아님, 의미 선언)

| 기존 `landing_type` | prod 건수 | canonical `targetKind` | 비고 |
|---|---:|---|---|
| `product` | 18 | **`PRODUCT`** | `landing_target_id` = UUID 18/18 |
| `page` | 16 | **`CONTENT`** | UUID 10 / NULL 6 (NULL 6건은 전부 `library_item_id` 보유 → §3 transitional) |
| `screen_set` | 40 | **`SCREEN_SET`** | UUID 40/40. 자동 생성 전용 |
| `link` | 13 | **`EXTERNAL_LINK`** | 절대 URL 13/13 |
| `video` | 1 | **`CONTENT`** (source=`STORE_VIDEO`) | 비활성 1건. 전용 kind 를 신설하지 않는다 |
| `promotion` | **0** | — | **프로덕션 row 0. 코드 상 `VALID_QR_LANDING_TYPES` 와 `StoreQrConsoleView` 라벨에만 존재** |

---

## §3. QR Target ↔ Content Source 분리 census

`landing_type` 하나가 "**무엇을 여는가(kind)**"와 "**원천이 어디인가(source)**"를 동시에 떠맡고 있다. 실제 코드에서 두 축은 이미 갈라져 있다.

### 3-1. KPA — `StoreAssetSelectorModal` 의 source 5종

| UI source | 원천 테이블 | 생성되는 `landingType` | `landingTargetId` | 사본 여부 |
|---|---|---|---|---|
| `asset` | `store_execution_assets` | `page` | asset UUID | 매장 소유 자산 |
| `content-hub` | `kpa_contents` (운영자 HUB) | `page` | content UUID | **가져오기 시 매장 사본 치환** (`ensureStoreCopyForPageTarget`) |
| `direct-content` | `kpa_store_contents` (`source_type='direct'`) | `page` | content UUID | 매장 직접 작성 |
| `blog` | `store_blog_posts` | **`link`** | 공개 절대 URL | 사본 복사 없음 |
| `mlc` | `store_multilingual_product_content_*` | **`link`** | 공개 landing URL (멱등 publicKey) | 사본 복사 없음 |
| (별도) | `organization_product_listings` / `local_products` | `product` | listing UUID | |
| (자동) | `store_tablet_screen_sets` | `screen_set` | set UUID | 멱등 생성 |

### 3-2. PH — `/store-owner/qr/sources` 의 source 3종

| UI source | 원천 테이블 | `landingType` |
|---|---|---|
| 자료함 | `store_execution_assets` | `page` |
| 매장 콘텐츠 | `kpa_store_contents` (`source_type='direct'`) | `page` |
| 매장 경영활용 제품 | `organization_product_listings` | `product` |
| 외부 URL | — | `link` |

### 3-3. 판정 — 같은 `landingType` 이 서로 다른 원천을 가리킨다

- `page` 하나에 **3개 원천**(execution asset / HUB 사본 / 매장 직접 콘텐츠)이 섞여 있다. 공개 랜딩(`store-qr.service.ts:296,341`)은 `content_hub(kpa_contents)` 만 inline 렌더하고 나머지는 redirect fallback 이다 → **원천을 저장하지 않아 렌더러가 추측한다.**
- `link` 하나에 **3개 의미**(외부 URL / 매장 블로그 / 다국어 제품 콘텐츠)가 섞여 있다. 뒤 둘은 사실 **내부 콘텐츠**인데 외부 링크로 기록된다 → analytics 에서 "콘텐츠 축" 집계가 원리적으로 불가능하다.

→ 설계 문서 §3 에서 `targetKind` × `contentSource` 2축으로 분리한다.

### 3-4. transitional — `library_item_id`

| 상태 | 건수 |
|---|---:|
| `landing_type='page'` AND `landing_target_id IS NULL` AND `library_item_id IS NOT NULL` | **6** |
| `landing_type='link'` AND `library_item_id IS NOT NULL` | 1 |

`library_item_id` 는 엔티티 주석상 "Neture FK 금지 — 논리적 참조만". 현재는 PH 컨트롤러가 `page` 생성 시 `libraryItemId` 또는 `landingTargetId` 중 하나를 채우는 **이중 경로**로 남아 있다. → 판정 **`LEGACY_INTERMEDIATE`** (row 7건, 삭제 불가 / canonical 로 흡수 대상).

---

## §4. ProductMaster 대표 QR vs Store Product QR

| 축 | A. ProductMaster 대표 QR | B. Store Product QR |
|---|---|---|
| 원장 | `product_landings` (272,040 row) | `store_qr_codes` (`landing_type='product'`, 18 row) |
| 공개 URL | `/p/{public_key}` | `/qr/{slug}` |
| 소유 | 제품 자체 (master 당 UNIQUE) | 매장 organization |
| 대상 | 제품 식별 · 공통 정보 · STORE canonical 설명 · 다국어 | 상담 대용 · 특정 매대 · 행사/캠페인 · POP |
| QR 이미지 | **비저장** (동적 인코딩, F12 불변식 ④) | **비저장** (동일) |
| scan analytics | 없음 | `store_qr_scan_events` |
| 과금 | 1-A 공공재 (무료·영구·주소 불변) | 1-B 사업용 entitlement |

**구조는 이미 분리되어 있다.** 합칠 필요도, 합칠 수단도 없다 (`product_landings` 에는 organization 축이 아예 없다). 혼동은 UI 용어 수준에서만 발생한다 → 설계 문서 §4 가 용어를 고정한다.

---

## §5~§6. Content 선택 / 일반 Content QR — 재사용 가능 자산

| 재사용 대상 | 위치 | 상태 |
|---|---|---|
| Content picker | `StoreAssetSelectorModal.tsx` (KPA, 5 source) | **CANONICAL_KEEP** — QR 전용 picker 신설 불필요 |
| PH source API | `PharmacyHubStoreQrController` `/qr/sources` (3 source) | **CANONICAL_NEEDS_ALIGNMENT** — KPA 대비 blog/mlc 누락 |
| 상품 콘텐츠 계약 | Tablet 확정 계약 (매장 명시 선택 → STORE canonical → empty) | Tablet 축에서 CLOSED. QR 적용은 설계 문서 §5 |
| 공개 렌더러 | `store-qr.service.ts` `resolvePublicQrLanding` | **CANONICAL_KEEP** — Product/Content/ScreenSet/link 4종 전부 여기 |

**신규 QR 전용 Content repository 는 필요 없다.** 5개 source 전부 기존 매장 콘텐츠 원장을 가리킨다.

---

## §7~§8. Placement — 기존 재사용 가능 구조 전수 조사

DB 전수 스캔 (`column_name ~ 'placement|usage_type|location|position|corner'`, store/kpa/product 계열):

| 테이블 | 컬럼 | 값 | prod 분포 | placement 로 쓸 수 있나 |
|---|---|---|---|---|
| `store_execution_assets` | `usage_type` varchar(20) | `pop\|qr\|signage\|banner\|notice` | pop 17 / NULL 14 / qr 1 | **아니다.** 이것은 "자산을 어떤 매체로 쓰는가"이며 **자산 쪽에 붙어 있다.** QR 은 이 중 한 값일 뿐이고, QR 자신의 배치 위치를 표현하지 못한다 |
| `kpa_contents` | `usage_type` | (콘텐츠 용도) | — | 아니다. 콘텐츠 분류축 |
| `store_tablets` | `location` varchar | (자유 문자열) | — | **부분적.** 태블릿 1대의 물리 위치. Tablet placement 의 선례이나 QR 과 연결점 없음 |

**결론: QR placement 를 표현하는 구조는 저장소 어디에도 없다.** `store_execution_assets.usage_type` 은 이름만 유사하고 축이 다르다 (자산→매체 vs QR→위치). 확장 대상이 아니다.

**결정적 제약 (재확인)**: `store_qr_scan_events` 는 `qr_code_id` 만 기록한다. 공개 `/qr/:slug` 는 slug 로만 QR 을 찾는다. → **placement 를 `store_qr_codes` 밖에 두면 위치별 scan 귀속은 원리적으로 불가능하다.**

`/qr/{slug}?p=SHELF` 로 쿼리 인코딩하는 방식도 답이 아니다:
1. 인쇄된 QR 은 파라미터가 다르면 **이미 다른 이미지**다 → 사실상 별도 instance 이므로 모델을 우회한 것에 불과하다.
2. 기존 QR 에 나중에 파라미터를 붙이면 **물리 재인쇄**가 발생한다 → `O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1 §0`("QR 주소는 절대 바꾸지 않는다") 위반.

---

## §10~§12. Tablet / ESL / 출력물 현황

| 축 | 현재 코드 | 판정 |
|---|---|---|
| Tablet QR | `store-screen-set-qr.service.ts` 멱등 생성 + `store_tablet_screen_sets.public_qr_slug` denormalize. prod: 세트 58개 중 40개에 slug 백필됨. screen_set QR 40건(세트 상태 active 15 / archived 22 / draft 3) | **CANONICAL_KEEP** — Tablet 축이 CLOSED 이므로 그대로 placement=`TABLET` 으로 승계 |
| ESL | 코드 0건 | 미구현. 설계가 막지 않도록만 한다 |
| 출력물 | `qr-print.service.ts` — `QrExportPreset = small\|medium\|large\|a4\|a4_4up` + A4 8분할 일괄 PDF + poster PDF(1up/4up) | **CANONICAL_KEEP.** preset = **출력 규격**이지 placement 가 아니다. 같은 필드로 합치지 않는다 |
| POP | `store-pop.controller.ts` — POP PDF 에 `qrId` 1개를 모든 아이템에 동일 embed | **CANONICAL_NEEDS_ALIGNMENT** — POP 은 QR 의 사용처(placement) 인데 현재 QR 쪽에 기록이 남지 않는다 |

---

## §13. Analytics 현황

`store-analytics.controller.ts` 가 제공하는 축:

```
organization KPI (총 스캔 / 오늘 / 주간)
활성 QR 수 (QR_LANDABLE_CONDITION — 공개 /qr/:slug 이중 게이트와 동일 판정식)
TOP QR (qr.id · title · slug · scanCount)
device 분포 (device_type)
일별 추이 (created_at::date)
최근 스캔 로그 (최대 20건)
```

**없는 축**: Content · Placement · Corner/location · Product.
프로덕션 실측: 총 스캔 **65건** / 스캔된 QR **25개** / 3개 조직 / 2026-08-09~2026-09-08.

→ **analytics 는 사실상 greenfield 다.** `store_qr_scan_events` 가 append-only 이므로 additive 확장이 가능하고, 회귀 위험이 거의 없다(누적 65 row).

---

## §14. Lifecycle 현황 — 3개 상태가 1개 필드에 눌려 있다

| 개념 | 현재 표현 | 문제 |
|---|---|---|
| QR 자체 | `is_active` boolean (soft-delete) | |
| Target 상태 | screen_set QR 만 `store_tablet_screen_sets.status` 로 **간접** 판정 (`QR_LANDABLE_CONDITION`) | 다른 target kind 는 대상이 삭제돼도 QR 이 `is_active=true` 로 남는다 |
| Placement 상태 | **없음** | |

`ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1` H2 가 이미 지적: "Screen Set QR teardown: QR 생성은 멱등이나 명시적 해제 없음(archived 시 resolve 게이트로만 차단). general QR(`is_active` soft-delete)과 **생명주기 비대칭**".

프로덕션 증거: screen_set QR 40건 중 **22건이 archived 세트를 가리킨다** — 목록에는 남고 공개만 차단된 상태.

---

## §15. KPA / PharmacyHub parity 재비교

| 항목 | KPA | PharmacyHub | 판정 |
|---|---|---|---|
| 저장 계약 | `services/store/store-qr.service.ts` | **동일 함수 호출** | PARITY |
| 이미지·PDF | `services/qr-print.service.ts` | **동일** | PARITY |
| 조직 결정 | `createRequireStoreOwner` | PH enrollment 기준 재해석 (사유 명시됨) | **SERVICE_ADAPTER_REAL** |
| 생성 가능 landing type | `product` / `page` / `link` (`LANDING_TYPE_OPTIONS`) | `product` / `page` / `link` (`ALLOWED_LANDING_TYPES`) | **PARITY** ✅ |
| Content source | 5종 (asset / content-hub / blog / mlc / direct-content) | 3종 (asset / direct-content / product listing) | **MISSING_ADOPTION** (blog · mlc) |
| screen_set QR | 자동 생성 · 목록 표시 · 상태 정렬 | **없음** (Tablet 축이 PH 에 생긴 뒤 연다고 헤더에 명시) | **MISSING_ADOPTION** — Tablet 축이 CLOSED 되었으므로 **이제 열 수 있다** |
| video QR | 있음 (prod 1건, 비활성) | 없음 | LEGACY 쪽이므로 adoption 대상 아님 |
| analytics | `/pharmacy/qr/:id/analytics` | `/store-owner/qr/:id/analytics` | PARITY |
| export | `/qr/:id/image` (PNG/SVG) + `/qr/print` 일괄 A4 8분할 | `/qr/:id/export?format&preset` (PNG/SVG/PDF) | **양방향 MISSING_ADOPTION** — PH 에 일괄 print 없음 / KPA 에 preset export 는 있으나 라우트 형태가 다름 |
| 상담 CTA | 있음 | 있음 (공통 service 경유) | PARITY |
| lifecycle | soft-delete | soft-delete | PARITY (둘 다 §14 결함 공유) |
| 프론트 | `StoreQRPage.tsx` 2,070L 자체 구현 | `QrPage.tsx` 617L 자체 구현 | **DUPLICATED_TO_COMMONIZE** |

> parity 차이는 **기본적으로 `MISSING_ADOPTION`** 으로 본다. 새로운 business difference 로 만들지 않는다.
> 유일한 실제 서비스 차이는 **조직 결정 방식**뿐이며, 이는 이미 사유가 코드에 문서화된 service adapter 다.

---

## §16. K-Cosmetics / GlycoPharm 판정

| 서비스 | 상태 |
|---|---|
| **GlycoPharm** | **존재하지 않는다.** `WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1`(`86bf574ae`) 로 서비스 전체 삭제. QR 파일 0건. 판정 대상에서 제외. 참조: `docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md` |

**K-Cosmetics QR 기능별 판정:**

| 기능 | 구현 | 판정 |
|---|---|---|
| 매장 QR 콘솔 `/store/marketing/qr` | `StoreQrPage.tsx` (78L) → `@o4o/store-ui-core` `StoreQrConsoleView` (598L) | **`LEGACY_KEEP`** — 1세대 모델(`landingType` 4종 중 `promotion` 포함, `screen_set`·`video` 없음, content picker 없음). **이번 회차 adoption 하지 않는다** |
| 운영자 QR 템플릿 `/operator/qr` | `OperatorQrListPage` (63L) / `OperatorQrWritePage` (58L) | **`CAN_ADOPT_LATER`** — `operator_qr_templates` prod row 0 |
| HUB QR 라이브러리 `/hub/qr` | `HubQrLibraryPage` (87L) | **`CAN_ADOPT_LATER`** |
| 백엔드 | KPA 와 **동일한** `store-qr.service.ts` 사용 | **`CANONICAL_READY`** |
| `/qr/:slug` 공개 랜딩 | KCos App.tsx 에 라우트 **없음** | **결함 후보** — KCos 매장이 QR 을 만들어도 자기 도메인에서 열 수 없다. 별도 확인 필요 |

---

## §17. 공통 Core 경계 현황

| 경계 후보 | 현재 자산 | 상태 |
|---|---|---|
| **COMMON QR OPERATION** (목록·생성·수정·lifecycle) | `packages/store-ui-core/.../StoreQrConsoleView.tsx` (598L) | **1세대**. `StoreQrLandingType = link\|product\|promotion\|page` — `screen_set` 없음, content picker 없음, analytics 없음. **소비처 = K-Cosmetics 1곳** (GP 삭제로 축소). 지금 이 View 로 KPA·PH 를 흡수하면 구세대가 굳는다 |
| **COMMON CONTENT SELECTOR** | `StoreAssetSelectorModal.tsx` (KPA 전용, 5 source) | **추출 후보 1순위**. 이미 최신 세대 |
| **SERVICE ADAPTER** | `service-catalog.ts` (domain) · `createRequireStoreOwner` vs PH 조직 재해석 · serviceKey 매핑(`SVC_TO_CATALOG`) | 계약이 이미 존재. 정리만 필요 |
| **PUBLIC RENDERER** | `store-qr.service.ts` `resolvePublicQrLanding` + 서비스별 `QrLandingPage.tsx` 4벌 (KPA 622L / PH 120L / Neture 133L / KCos 없음) | 백엔드는 **공통 완료**, 프론트만 4벌 |
| **백엔드 전반** | `store-qr.service.ts` · `qr-print.service.ts` · `store-screen-set-qr.service.ts` | **이미 공통이다.** QR 축의 중복은 **프론트 전용** |

> **신규 package 를 만들지 않는다.** `@o4o/store-ui-core` 는 이미 존재하고 Tablet 축에서 `TabletCornerBoard` 로 세대 교체에 성공한 선례가 있다. QR 축도 같은 방식으로 **기존 package 안에서 세대 교체**한다.

---

## §18. legacy / dead 정리 후보 (구현 없음 — 후보 확정만)

| # | 대상 | 실제 소비처 | prod 데이터 | 판정 |
|:-:|---|---|---:|---|
| 1 | `store_qr_codes.type` | 분기 0건 | 88건 전부 `landing_type` 과 동일 | **`DEAD`** — 폐기 대상 |
| 2 | `landing_type='promotion'` | `VALID_QR_LANDING_TYPES` + `StoreQrConsoleView` 라벨 | **0건** | **`DEAD`** |
| 3 | `landing_type='video'` | `store-qr.service.ts:267` 분기 + `PublicVideoViewer.tsx` | **1건 (비활성)** | **`LEGACY_INTERMEDIATE`** — canonical `CONTENT`+source=`STORE_VIDEO` 로 흡수 |
| 4 | `library_item_id` transitional | PH 생성 경로 이중 분기 | 7건 | **`LEGACY_INTERMEDIATE`** |
| 5 | `operator_qr_templates` 축 | KPA·KCos operator 화면 + `qr.controller.ts` import | **0건** | **`UNKNOWN`** — 코드는 완비, 데이터는 미사용. 폐기/활성화 판단 보류 |
| 6 | `foreign_visitor_partner_qr_*` | KPA·PH 각 354L 페이지 | **0건 (양 테이블)** | **`UNKNOWN`** — QR canonical 축과 **별개 제품**. 본 설계 범위 밖으로 명시 분리 |
| 7 | QR 전용 AI 잔재 (`StoreQrAiDescriptionPage` 657L, `/store/marketing/qr/ai-description`) | KPA 라우트 활성 | `aiDescriptionMode` 파생 필드 | **`CANONICAL_NEEDS_ALIGNMENT`** — 콘텐츠 저작 축으로 흡수 여부는 별도 판단. QR target 계약과는 무관 |
| 8 | 서비스별 duplicate QR console (KPA 2,070L / PH 617L / KCos 598L 공통 1세대) | 전부 활성 | — | **`DUPLICATED_TO_COMMONIZE`** |
| 9 | 서비스별 duplicate `QrLandingPage` (KPA 622L / Neture 133L / PH 120L) | 전부 활성 | — | **`DUPLICATED_TO_COMMONIZE`** |
| 10 | KCos `/qr/:slug` 공개 라우트 부재 | — | — | **결함 후보** — 확인 필요 |
| 11 | 오래된 storefront product redirect | `StorefrontProductDetailPage.tsx` `landingType` 1건 | — | `project-kpa-internal-storefront-retirement-track` 범위. **본 WO 밖** |
| 12 | admin dead QR route | 전수 grep 결과 admin 계열 QR route **없음** | — | **해당 없음** |

**집계**: `DEAD` 2 / `LEGACY_INTERMEDIATE` 2 / `DUPLICATED_TO_COMMONIZE` 2 / `CANONICAL_NEEDS_ALIGNMENT` 1 / `UNKNOWN` 2 / 범위 밖 1 / 해당 없음 1 / 결함 후보 1

---

## §19. 실측 SQL 전문 (재현용)

```sql
-- type × landing_type 교차분포
SELECT type, landing_type, count(*) AS n, count(*) FILTER (WHERE is_active) AS active
FROM store_qr_codes GROUP BY 1,2 ORDER BY 3 DESC;

-- 이중 진실 불일치 (→ 0)
SELECT count(*) FROM store_qr_codes WHERE type IS DISTINCT FROM landing_type;

-- landing_target_id 형태 (값 미출력)
SELECT landing_type,
  CASE WHEN landing_target_id IS NULL THEN 'NULL'
       WHEN landing_target_id ~ '^[0-9a-f]{8}-' THEN 'UUID'
       WHEN landing_target_id ~ '^https?://' THEN 'ABSOLUTE_URL'
       WHEN landing_target_id LIKE '/%' THEN 'PATH' ELSE 'OTHER' END, count(*)
FROM store_qr_codes GROUP BY 1,2;

-- screen_set QR vs 세트 상태
SELECT s.status, count(*) FROM store_qr_codes q
JOIN store_tablet_screen_sets s ON s.id::text = q.landing_target_id
WHERE q.landing_type='screen_set' GROUP BY 1;

-- placement 유사 컬럼 전수
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name ~ 'placement|usage_type|location|position|corner'
  AND table_name ~ '^store_|^kpa_|^product_';
```

접속: `cloud-sql-proxy` 5442 · user `o4o_api_v2` · **read-only SELECT 만** (CLAUDE.md §0). 개인 식별 데이터는 조회하지 않았다 — COUNT / 형태 분류 / 상태값만.

---

*Status: Active (READ-ONLY 조사 기록) · 2026-09-09*
