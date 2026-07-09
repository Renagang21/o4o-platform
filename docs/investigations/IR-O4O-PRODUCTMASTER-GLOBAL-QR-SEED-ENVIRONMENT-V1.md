# IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1

Status: **조사(IR)로만 유지** — 최종 아키텍처는 **Product Landing 중심**으로 별도 설계. 코드/DB 무변경.
WO: `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
Date: 2026-07-09 (사업 방향 반영 개정: 2026-07-09)
관련 baseline: F12 `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md` (현행 baseline — **절대 기준 아님, 사업 방향에 따라 개정 가능**)

> 본 IR 은 "모든 ProductMaster 에 O4O 고유 QR 을 부여"하기 위한 사전 조사다. **실제 QR 생성/일괄 등록은 하지 않는다.** 기술 조사(구조·현황·dry-run·중복 검증)는 확정 유효하나, **아키텍처 결론은 확정하지 않는다** — 최종 방향은 §7(사업 방향) 을 따른다.

---

## 0. 방향 (사업자 확정 — 2026-07-09)

O4O 의 축은 **`Product → Content → QR → Product Landing`** 이다. QR 은 Resource(설명서) 를 가리키는 것이 아니라 **제품의 Landing** 으로 연결되고, Landing 이 무엇을 보여줄지는 **콘텐츠**가 결정한다.

**확정 원칙 (본 IR 의 상위 전제):**
1. **ProductMaster 당 대표 QR 1개** 유지.
2. QR → **Product Landing** 으로 연결(단일 Resource 가 아님).
3. Product Landing 은 설명서에 한정되지 않는 **확장 가능한 화면** — 제품 설명 / 제품 콘텐츠 / 공급자 콘텐츠 / 운영자·매장 콘텐츠 / 관련 콘텐츠 / 관련 제품 등을 수용.
4. **설명서는 Landing 을 구성하는 여러 콘텐츠 중 하나**일 뿐이다.
5. 공급자·관리자·운영자·매장이 제공하는 콘텐츠도 Landing 에서 함께 활용할 수 있도록 확장성을 확보.

**따라서 아래 3가지는 결론으로 채택하지 않는다(명시적 폐기):**
- ❌ "QR = Resource" — QR 은 Product Landing 으로 연결된다.
- ❌ "설명서 없으면 QR 없음" — 설명서가 없어도 공급자/매장 콘텐츠 등으로 Landing 을 구성할 수 있으므로 **모든 ProductMaster 는 QR/Landing 대상**이다.
- ❌ "`/r/{resourceId}` 가 Product QR 의 최종 구조" — Landing 의 공개 식별/URL 체계는 Product Landing 설계 WO 에서 확정.

**F12 관계**: F12 는 "QR=Resource permalink·비저장"을 규정하나 이는 **Resource 단위** 관점이다. Product Landing(제품 단위·다콘텐츠) 방향은 F12 와 **관점이 다르며**, 필요 시 **F12 개정 대상**이다(F12 는 절대 기준이 아니며 지금까지도 사업 방향에 맞춰 여러 번 구조를 수정해 왔다). 본 IR 은 저장/URL 방식을 **확정하지 않고** Product Landing 설계 WO 로 넘긴다.

**이번 WO 산출 = 조사 + dry-run + runbook(문서) 뿐.** 신규 테이블/컬럼/identifier 생성 없음. DB write 0.

---

## 1. 조사 목적

- 현재 QR 구조(테이블·서비스·라우트·slug 생성·타깃 연결) 파악
- ProductMaster 전역 QR/Landing 성립 가능성·현황 read-only 산출
- 저장/URL 후보 정리(확정은 Product Landing WO)
- 충돌·중복·rollback 기준 + dry-run + apply runbook 마련

---

## 2. 현재 QR 테이블/서비스/라우트 구조

### 2.1 `store_qr_codes` (계층 2 · 매장 Display Domain)

---

## 1. 조사 목적

- 현재 QR 구조(테이블·서비스·라우트·slug 생성·타깃 연결) 파악
- ProductMaster 전역 QR 저장 가능 여부 판단
- ProductMaster QR 보유/미보유 현황 read-only 산출
- QR URL/slug/publicKey 규칙 후보 정리
- 충돌·중복·rollback 기준 + dry-run + apply runbook 마련

---

## 2. 현재 QR 테이블/서비스/라우트 구조

### 2.1 `store_qr_codes` (계층 2 · 매장 Display Domain)

- 엔티티: `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` (`StoreQrCode`)
- 마이그레이션: `20260304120000-CreateStoreQrCodes.ts` (+ `20261125000000` CTA 컬럼)
- 컬럼: `id`, **`organization_id`(NOT NULL, FK organizations CASCADE)**, `type`, `title`, `description`, `library_item_id`(store_execution_assets 논리참조), `landing_type`, `landing_target_id`(varchar 500, polymorphic), **`slug`(NOT NULL, UNIQUE)**, `is_active`(soft delete=boolean), `consultation_cta_enabled/label`, `created_at`, `updated_at`.
- **부재 컬럼**: `publicKey`/`code` 없음(slug 가 유일 공개식별자), `deleted_at` 없음(is_active), `created_by`/`source`/`batch` 없음, `metadata`/`content_json` 없음, **global/nullable org 옵션 없음**.
- 스캔이벤트: `store_qr_scan_events`.

### 2.2 landingType (application union · DB enum 아님)

허용값(POST 검증 `store-qr-landing.controller.ts`): **`product | promotion | page | link | video`**. 각 타깃 해석:

| landingType | target | 해석 |
| --- | --- | --- |
| product | `supplier_product_offers.id` / `organization_product_listings.id` | product_masters 는 JOIN 으로만 도달(master id 저장 안 함) |
| promotion | landing_target_id | 파트너 콘텐츠 |
| page | `kpa_store_contents.id` / `store_execution_assets.id`(library_item_id) | 인라인 HTML |
| link | 원시 외부 URL | 리다이렉트 |
| video | `store_videos.id`(매장 사본) | 비디오 뷰어 |

→ **`product_master` / `product_description` / `resource` / `/r/` 계열 landingType 없음.** ProductMaster 나 SPD row 를 직접 타깃하는 경로 **전무**.

### 2.3 공개 라우트 / 도메인

- 백엔드(무인증): `GET /{service}/qr/public/:slug` (kpa/glycopharm/cosmetics 각각 mount). slug 조회 `WHERE slug=$1 AND is_active=true`.
- 프론트: `/qr/:slug` (web-neture / web-kpa-society). QR 이미지·PDF URL 도메인은 **service-catalog 캐노니컬 도메인**(kpa-society.co.kr / glycopharm / k-cosmetics), **neture.co.kr 아님**.
- **`/r/{id}` Resource permalink 공개 라우트는 미구현**(파트너 추천 `/r/{code}` 는 별개). F12 roadmap step 4 미착수.

### 2.4 slug 생성 / 유일성

- 주 경로: **클라이언트 제출 slug 필수**(랜덤/nanoid 생성기 없음). 충돌 시 409 SLUG_CONFLICT.
- 운영자 템플릿 import 경로만 서버 `generateSlug(title)` + 충돌 시 `-${Date.now().toString(36)}` retry.
- 유일성: DB unique index `IDX_store_qr_codes_slug`.

### 2.5 생성 서비스 / copy-on-import 불변식

- 전용 서비스 클래스 없음 — `POST /pharmacy/qr` 컨트롤러 인라인(`requireAuth`+`requirePharmacyOwner`, **매장 스코프**).
- **copy-on-import 불변식**: 매장 QR 은 반드시 매장 소유 사본을 참조(원본 kpa_contents 직접 참조 금지). 활성 QR 7/7 사본 확인(`IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1`).

### 2.6 ProductMaster / ProductIdentifier

- `product_masters`: `id`, `barcode`(immutable GTIN SSOT), `regulatory_type`, `drug_category`, … **`status`/`active` 플래그 없음, `deleted_at` 없음**(컬럼 소프트삭제 불가). F12 #6 대로 콘텐츠/Resource FK 없음.
- `product_identifiers`: ProductMaster 1:N. `identifier_type`(varchar union, **확장 가능**): GTIN/EAN13/UPC/JAN/INTERNAL_O4O/SUPPLIER_SKU/PHARMACY_LOCAL/STORE_LOCAL/KOREA_DRUG_CODE/KOREA_INSURANCE_CODE/ATC_CODE/MFDS_CODE/UDI_DI/UNKNOWN. 유니크 `(product_master_id, identifier_type, normalized_value, deleted_at IS NULL)`. `deleted_at` 소프트삭제 있음.
  - **`QR_CODE`/`O4O_QR` 타입은 스키마상 삽입 가능**하나 엔티티 취지는 "식별 코드"이지 "라우팅/랜딩"이 아니며, **F12 #4 '비저장' 과 충돌**.

---

## 3. ProductMaster QR 보유/미보유 현황 (prod read-only 2026-07-09)

dry-run `productmaster-global-qr-dryrun.ts` 실측(write 0):

| 항목 | 값 |
| --- | --- |
| 전체 ProductMaster | **198,389** |
| — DRUG rx | 119,548 |
| — DRUG otc | 57,572 |
| — QUASI_DRUG | 17,148 |
| — MEDICAL_DEVICE | 3,826 |
| — DRUG drug_unspecified / GENERAL | 293 / 2 |
| **설명서(canonical SPD) 보유 master** | **17,877 (9.01%)** ← Landing 에 즉시 실을 설명 콘텐츠 有 |
| 임의 설명(SPD) 보유 master | 21,092 |
| 설명 부재 master | **177,297 (≈89%)** ← Landing 에 실을 **설명은 없음**(공급자/매장 콘텐츠 등 다른 콘텐츠로 구성 가능) |
| store_qr_codes 총 | 27 (page16/link10/video1) · active 10 |
| store_qr_codes null org | **0** (전부 매장 소유) |
| store_qr_codes 가 ProductMaster 직접 타깃 | **0** |
| store_qr_codes slug 중복 | **0** (unique index) |
| QR 계열 ProductIdentifier(QR_CODE/O4O_QR) | **0** |

**해석 (Product Landing 관점)**: 위 "설명서 보유 9%"는 **Landing 에 넣을 설명 콘텐츠가 이미 있는 비율**일 뿐, "QR 대상 비율"이 **아니다**. Product Landing 은 설명 외 공급자/운영자/매장 콘텐츠·관련 제품 등으로 구성 가능하므로 **모든 ProductMaster(198,389 전부)가 QR/Landing 대상**이다. 89% 는 "QR 없음"이 아니라 **"Landing 에 아직 설명 콘텐츠가 없음"**(콘텐츠 채움의 문제)이다.

---

## 4. 저장/연결 방식 후보 (확정 아님 — Product Landing WO 로 이관)

Product Landing 방향에서 후보는 다음과 같다. **이 IR 은 확정하지 않는다.**

| 안 | 내용 | 판정(Product Landing 관점) |
| --- | --- | --- |
| **A. store_qr_codes 재사용** | 전역 상품 QR 을 매장 QR 테이블에 저장 | **기각**. organization_id NOT NULL(매장 소유)·계층 2. 전역 소유자 표현 불가 |
| **B. product_master_qr / product_landing 신설** | ProductMaster 대표 QR·Landing 전용 저장 | **후보(가능성 높음)**. Product Landing(제품 단위 안정 공개키)은 per-master 저장을 자연히 요구. **단 현행 F12 #4/#6 과 충돌 → F12 개정 병행 필요**(F12 는 개정 가능) |
| **C. ProductIdentifier QR_CODE/LANDING 타입** | per-master 토큰을 식별자로 저장 | **보조 후보**. 스키마 fit(유니크·확장 union)은 되나 Landing 상태/이력 관리엔 약함. 대표키 저장 최소안 |
| **D. `/r/{resourceId}` 동적 QR** | Resource permalink 을 QR 로 동적 생성 | **부분적·불충분**. F12 현행 정합이나 **Resource(설명) 단위**라 Product Landing(다콘텐츠·제품 단위)과 관점이 다름. 설명 없는 제품·다콘텐츠 Landing 을 담지 못함 |

→ Product Landing 방향에서는 **B 계열(제품 단위 대표 QR·Landing 저장)이 유력**하며, 이는 F12 개정을 수반한다. **결정은 Product Landing 설계 WO 로 이관.**

---

## 5. QR URL / 식별자 규칙 후보 (확정 아님)

- WO 제안: `neture.co.kr/qr/{slug}` / F12: `/r/{resourceId}` / 4축 매장 QR: `/qr/{slug}`.
- **Product Landing 방향의 URL/공개키는 제품 단위**여야 한다(대표 QR 1개 → Product Landing). Resource 단위 `/r/{id}` 는 Landing 이 담을 여러 콘텐츠 중 "설명" 하나에만 대응하므로 **제품 대표 URL 로는 부족**하다.
- 후보: `neture.co.kr/p/{productPublicKey}` (제품 Landing 공개키) 등 — **URL 체계는 Product Landing 설계 WO 에서 확정.** 내부 UUID 직접 노출 회피(opaque 공개키)는 공통 원칙.
- 언어: **상품 대표 QR 1개 + 랜딩 언어탭**(다국어 QR 다중 생성 금지) — B-1 확정과 동일. QR 은 Product Landing 1개를 가리키고 랜딩에서 언어·콘텐츠 구성.

---

## 5.1 기존 QR 트랙과의 조화 (reconciliation — 중요)

병렬 트랙 `IR-O4O-*-TO-QR-FLOW-AUDIT-V1`(4축) 및 `WO-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1` 이 이미 다음을 확정했다. **모순이 아니라 계층이 다르다:**

| 계층 | 공개 경로 | 구현 | 스코프 | 본 WO 관계 |
| --- | --- | --- | --- | --- |
| **계층 2 (매장 QR)** | **`/qr/{slug}`** (`GET /api/v1/{service}/qr/public/:slug`) | ✅ 구현됨 | 매장(organization) | 전역 상품 QR 아님 |
| **계층 1 (Product Resource)** | **`/r/{resourceId}`** | ❌ 미구현(F12 step4) | master/서비스 중립 | **전역 ProductMaster QR 의 올바른 귀속처** |

- 4축 트랙의 "공개경로=`/qr/{slug}`(/r/{resourceId} 아님)" 정정은 **매장 QR 계층에 한정**된 것이다(매장 QR 의 Resource permalink 은 미구현이라 slug 로 동작). 본 WO 의 **전역 ProductMaster QR 은 계층 1** 사안이므로 F12 `/r/{id}` 가 목표 경로다.
- **양 트랙 공통 = QR 비저장**(4축이 "F12 불변식④" 명시, 온디맨드 `qr-print.service.ts`). 저장형 per-master QR 은 두 트랙 모두와 배치된다.
- **B-1 확정(상품당 QR 1개 + 랜딩 언어탭)** 은 본 IR §5(언어 정책)와 동일 — 다국어 QR 다중 생성 금지.
- **이미 존재하는 다국어 판매콘텐츠 저장소**: `store_multilingual_product_content_groups`/`_pages`(`public_key`, **organization 소유**, 언어탭 랜딩 `/api/v1/kpa/public/multilingual-product-contents/:publicKey` 구현). 단 이는 **매장(org) 소유**라 전역 ProductMaster 자산이 아니다 → 전역 상품 QR 의 저장소로 쓸 수 없다(계층·소유 불일치). 매장 단위 상품 QR 은 이 저장소 + landingType='link' 로 이미 처리 가능(4축 안1).

→ 조화 정리: `/qr/{slug}`(계층 2 매장 QR)·org 다국어 저장소는 매장 스코프다. **전역 제품 대표 QR/Landing 은 제품 단위(계층 1) 사안**이며, 현행 F12 는 이를 Resource 단위 `/r/{id}`·비저장으로 규정하나 **Product Landing 방향은 제품 단위·다콘텐츠**라 F12 개정을 수반한다(아래 §7). 공통 = 대표 QR 1개 + 언어탭.

## 6. 고려 사항 (충돌이 아니라 설계 입력)

1. **F12 현행과의 차이** — F12 #4(QR 비저장·Resource permalink)·#6(ProductMaster 무FK)은 **Resource 단위 관점**. Product Landing(제품 단위·다콘텐츠·대표 저장키)은 이와 다르며 **F12 개정으로 정합**시킨다(F12 는 절대 기준 아님, 사업 방향 우선).
2. **org 스코프** — store_qr_codes 는 전역 소유자 표현 불가 → 전역 제품 QR 저장소로 부적합(재사용 안 함).
3. **landingType/Landing 타입** — 현재 master/Product-Landing 타깃 타입 없음. Product Landing 설계 WO 에서 신설.
4. **대상 = 전체** — 설명 유무와 무관하게 **모든 ProductMaster 가 QR/Landing 대상**. 설명 부재는 Landing 콘텐츠 채움 문제이지 QR 대상 배제 사유가 아니다.
5. **행정처분/회수** — QR/Landing 노출과 연결될 수 있으므로 Landing 노출 게이트 필요(자동 확인 파이프라인 미존재를 "문제 없음"으로 단정 금지).

---

## 7. 권장 방향 (사업 방향 정합)

1. **아키텍처 축 = `Product → Content → QR → Product Landing`**. QR 은 제품 대표 QR 1개 → **Product Landing** 으로 연결.
2. **Product Landing = 확장 가능한 제품 화면**: 제품 설명 / 제품 콘텐츠 / 공급자 콘텐츠 / 운영자·매장 콘텐츠 / 관련 콘텐츠 / 관련 제품 등을 수용. **설명서는 그중 하나**.
3. **대상 = 모든 ProductMaster**. 설명 없어도 공급자/매장 콘텐츠 등으로 Landing 구성 → QR/Landing 성립.
4. **저장/URL 결정은 Product Landing 설계 WO 로 이관.** 제품 단위 대표 QR·Landing 저장(§4 B 계열)이 유력하며, 채택 시 **F12 개정 WO 를 병행**한다(F12 #4/#6 을 제품 Landing 관점으로 개정).
5. **이번 트랙 산출은 조사·dry-run·runbook(문서)까지** — 신규 테이블/컬럼/identifier·실제 QR 생성 없음.
6. **다음 핵심 WO = `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1`**(제품 Landing 데이터·URL·구성 콘텐츠·F12 개정 판단). QR 일괄 등록은 그 위에서.

---

## 8. dry-run 산출물

- 스크립트: `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts` (**write 0**, SELECT only, JSON `--out`).
- 실행: cloud-sql-proxy(15432) + `DB_* env` + `npx tsx`. §3 표가 실측 결과.
- 산출 필드: totalProductMasters·byRegulatory·mastersWith(Canonical/Any)Resource·mastersWithoutResource·storeQr(landingType/nullOrg/targetingMaster/dupSlug)·identifierByType·existingQrIdentifier·modelC/modelD candidate·samples.

---

## 9. 후속 WO 제안 (Product Landing 중심)

| WO | 성격 |
| --- | --- |
| **`WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1`** | **핵심 선행** — 제품 Landing 데이터 모델·공개 URL/키·구성 콘텐츠(설명/공급자/매장/관련) 확장 구조·**F12 개정 판단** |
| `WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-V1` | 제품 대표 QR ↔ Product Landing 일괄 성립(Landing 아키텍처 확정 후) |
| `WO-O4O-PRODUCTMASTER-QR-ON-CREATE-V1` | 신규 master 생성 시 대표 QR/Landing 동시 확립 |
| `WO-O4O-PRODUCT-LANDING-CONTENT-COMPOSITION-V1` | Landing 이 담는 콘텐츠(공급자·운영자·매장·관련) 구성/선택 |
| `WO-O4O-PRODUCTMASTER-QR-PUBLIC-LANDING-V1` | Landing 공개 화면(언어탭·노출 게이트) |
| `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1` | 행정처분/회수 노출 게이트 |

---

## 10. 신규 제품 등록 시 QR 동시 등록 설계 메모 (미구현)

- 향후: ProductMaster 생성 → **제품 대표 QR/Landing 동시 확립**(Landing 은 초기 비어 있어도 무방 — 콘텐츠는 이후 채움). 설명/콘텐츠는 별도.
- 실패 정책 권장: **ProductMaster 생성은 유지**, 대표 QR/Landing 성립 실패는 retry queue 또는 보정 작업으로 처리. ProductMaster 생성을 QR 실패로 전체 rollback 하지 않는다.

---

## 11. Landing 콘텐츠 채움 설계 메모 (미구현)

- **설명 없어도 QR/Landing 은 성립**한다. "보정"의 본질은 **Landing 콘텐츠 채움**(설명·공급자 콘텐츠·매장 콘텐츠 등)이다.
- 주기 작업: 콘텐츠가 빈 Product Landing 조회 → 어떤 콘텐츠로 채울지(설명서 트랙·공급자 제공·매장 제작) 연동. QR 은 Landing 의 함수이지 설명의 함수가 아니다.

---

## 12. 코드/DB 무변경 확인

- 본 IR 조사 및 dry-run 은 **SELECT only**. DB write 0 · migration 0 · deploy 0 · 실제 QR 생성 0 · ProductMaster/ProductIdentifier/SPD 무변경.
