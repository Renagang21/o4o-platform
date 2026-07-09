# IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1

Status: 조사 완료 (read-only). 설계 결정용 IR — 코드/DB 무변경.
WO: `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
Date: 2026-07-09
관련 baseline: **F12 `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md` (Frozen)**

> 본 IR 은 "모든 ProductMaster 에 O4O 고유 QR 을 부여"하기 위한 사전 환경 설계다. **실제 QR 생성/일괄 등록은 하지 않는다.** dry-run·현황·정책·충돌·rollback 기준을 정리하고, 별도 채팅방/별도 WO 에서 안전하게 apply 할 수 있게 한다.

---

## 0. 결론 요약 (먼저)

1. **핵심 충돌**: 이번 WO 의 문자적 전제("ProductMaster 1개 = 저장된 QR row 1개, `neture.co.kr/qr/{slug}`")는 **Frozen F12 baseline 과 직접 충돌**한다.
   - **F12 Freeze #4**: "QR = `/r/{resourceId}` 인코딩, **비저장·동적생성**". QR 을 자산 row 로 저장하지 않는다.
   - **F12 Freeze #3**: 공개 permalink = `/r/{resourceId}` (**Resource 단위**, ProductMaster 단위가 아님).
   - **F12 Freeze #6**: ProductMaster 는 Resource 를 모른다(FK 신설 금지).
   - F12 §4 거버넌스: **구조 변경은 baseline 개정 WO 필수.**
2. **권장 방향 = 모델 D (F12 정합)**: 전역 상품 QR 은 저장하지 않고, ProductMaster 의 **canonical Resource** 공개 permalink `neture.co.kr/r/{resourceId}` 를 QR 로 **동적 생성**한다. 저장 QR row 0.
3. **실질 선결 과제**: F12 로드맵 **step 4 `/r/{id}` 공개 라우트가 아직 미구현**이다(조사 확인). "QR seed 환경"의 진짜 선행은 **`/r/{id}` 공개 Resource 라우트 + Resource 공개 alias 발급**이다.
4. **현황 gap**: 전체 ProductMaster **198,389** 중 canonical Resource 보유는 **17,877(9.01%)** 뿐. **177,297(약 89%)** 은 Resource 자체가 없어 **QR 이 가리킬 대상이 없다**. "모든 상품 QR"은 사실상 **설명/Resource 확보에 종속**된다.
5. store_qr_codes 재사용(모델 A)은 **부적합**(매장 스코프·계층 2). ProductIdentifier QR_CODE(모델 C)는 스키마상 가능하나 **F12 "비저장" 과 여전히 충돌** → baseline 개정 없이는 금지.

→ **이번 WO 에서 신규 QR 저장 테이블/컬럼/identifier 를 만들지 않는다.** dry-run·runbook·정책 문서만 산출하고, apply 방향 결정은 F12 정합(모델 D) 을 기본 권고로 남긴다.

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
| **canonical Resource(SPD) 보유 master** | **17,877 (9.01%)** ← 모델 D 즉시 QR 대상 |
| 임의 Resource(SPD) 보유 master | 21,092 |
| **Resource 부재 master** | **177,297 (≈89%)** ← QR 지향 대상 없음(gap) |
| store_qr_codes 총 | 27 (page16/link10/video1) · active 10 |
| store_qr_codes null org | **0** (전부 매장 소유) |
| store_qr_codes 가 ProductMaster 직접 타깃 | **0** |
| store_qr_codes slug 중복 | **0** (unique index) |
| QR 계열 ProductIdentifier(QR_CODE/O4O_QR) | **0** |

**해석**: 전역 상품 QR 을 "canonical Resource 로 향하는 QR"로 정의하면 즉시 대상은 9% 뿐이다. "모든 상품 QR"은 **Resource(설명) 확보 진척에 종속**되며, QR 자체 문제가 아니라 **상위(설명/Resource) 문제**다.

---

## 4. 기존 테이블 재사용 가능성 / 저장 방식 후보

| 안 | 내용 | 판정 |
| --- | --- | --- |
| **A. store_qr_codes 재사용** | 전역 상품 QR 을 매장 QR 테이블에 저장 | **기각**. organization_id NOT NULL(매장 소유 계약)·계층 2 Display Domain·master 타깃 landingType 없음. null org/센티넬 org 는 계약 위반(F12 #5) |
| **B. product_master_qr_codes 신설** | 전역 QR 전용 테이블 | **baseline 개정 필요**. F12 #4(비저장) 정면 위반. 별도 개정 WO 없이는 금지 |
| **C. ProductIdentifier QR_CODE 타입** | per-master 토큰을 식별자로 저장 | **부분 가능·비권장**. 스키마 fit(유니크·확장 union)은 되나 랜딩/URL/상태/이력 관리 약함 + F12 #4 '비저장' 과 여전히 충돌 |
| **D. `/r/{resourceId}` 동적 QR (F12 정합)** | Resource permalink 을 QR 로 동적 생성, 저장 0 | **권장**. F12 #3/#4/#6 정합. 선행=`/r/{id}` 공개 라우트(미구현) + Resource 공개 alias |

---

## 5. QR URL / 식별자 규칙 후보

- WO 제안: `neture.co.kr/qr/{slug}`. **그러나** 현재 store QR 도메인은 매장별 캐노니컬 도메인이고, F12 공개 permalink 은 **`neture.co.kr/r/{resourceId}`** 다. **임의 신규 URL 체계(`/qr/{slug}`) 신설은 F12 `/r/{id}` 와 이중 공개 아이덴티티를 만들어 지양.**
- **권장 URL = `https://neture.co.kr/r/{resourceId}`** (F12 #3). QR = 이 URL 의 동적 인코딩(F12 #4).
- 내부 id 비노출: Resource ID 는 UUID(내부), 공개는 `/r/{id}`(F12 #3 은 "짧은 opaque alias 는 공개 WO 에서 발급" — alias 발급 시 UUID 직접 노출 회피 가능).
- 언어: **상품 대표 QR 1개 + 랜딩 언어탭**(다국어 QR 다중 생성 금지) — WO §8.4 및 다국어 QR audit 과 정합. QR 은 Resource 1개를 가리키고 랜딩에서 언어 선택.

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

→ 결론 보강: **전역 ProductMaster QR 의 귀속처는 계층 1(`/r/{id}`)뿐이며 미구현**이다. 계층 2(`/qr/{slug}`)·org 다국어 저장소는 매장 스코프라 전역 대상이 될 수 없다. 이는 §0 결론(모델 D + step4 선행)을 강화한다.

## 6. 충돌 가능성 정리

1. **F12 Freeze #4(비저장)** — 저장 QR row(A/C) 전면 충돌. baseline 개정 WO 필수.
2. **F12 Freeze #6(ProductMaster 무FK)** — ProductMaster 에 qr_id/resource_id FK 금지. 방향은 항상 Resource→Master.
3. **org 스코프** — store_qr_codes 는 전역 소유자 표현 불가.
4. **landingType 부재** — master/resource 타깃 타입 없음(신설 시 baseline 반영 필요).
5. **도메인 이중화** — `/qr/{slug}` 신설은 `/r/{id}` 와 충돌.
6. **대상 부재(gap)** — 89% master 는 Resource 없음 → QR 대상 없음.
7. **행정처분/회수** — §19. QR 생성 자체가 노출과 연결될 수 있으므로 랜딩 노출 게이트 필요(자동 확인 파이프라인 미존재를 "문제 없음"으로 단정 금지).

---

## 7. 권장 정책 (조사 결과)

1. **저장 방식**: 신규 QR 저장 테이블/컬럼/identifier 를 이번 트랙에서 만들지 않는다. **모델 D(`/r/{id}` 동적 QR)** 를 기본 채택.
2. **선행 WO**: F12 roadmap **step 4 `PUBLIC-CONTENT-RESOURCE (/r/{id})`** 구현(공개 라우트 + Resource 공개 alias 발급)이 진짜 선결. 그 위에 **step 5 `RESOURCE-QR-INTEGRATION`**(동적 QR).
3. **대상 정의**: "ProductMaster 대표 QR" = 그 master 의 **canonical Resource** 의 `/r/{id}`. Resource 없는 master 는 QR 대상이 아니며 → 설명/Resource 확보(설명서 Queue 트랙)로 해결.
4. **URL**: `neture.co.kr/r/{resourceId}` (또는 발급된 opaque alias). `/qr/{slug}` 신설 금지.
5. **언어**: 대표 QR 1개 + 랜딩 언어탭.
6. **저장 QR 이 꼭 필요하다면**: 별도 **baseline 개정 WO**(F12 #4 예외 명문화) 를 먼저 통과시킨 뒤에만 모델 C(ProductIdentifier QR_CODE) 또는 모델 B(신설 테이블) 진행. 이번 트랙 범위 밖.

---

## 8. dry-run 산출물

- 스크립트: `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts` (**write 0**, SELECT only, JSON `--out`).
- 실행: cloud-sql-proxy(15432) + `DB_* env` + `npx tsx`. §3 표가 실측 결과.
- 산출 필드: totalProductMasters·byRegulatory·mastersWith(Canonical/Any)Resource·mastersWithoutResource·storeQr(landingType/nullOrg/targetingMaster/dupSlug)·identifierByType·existingQrIdentifier·modelC/modelD candidate·samples.

---

## 9. 후속 apply WO 제안

| WO | 성격 |
| --- | --- |
| `WO-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1` (= F12 step4) | `/r/{id}` 공개 라우트 + Resource 공개 alias 발급 (**진짜 선행**) |
| `WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-V1` | 모델 D 기준 QR 매핑(동적) 확립 / 저장이 필요하면 baseline 개정 후 |
| `WO-O4O-PRODUCTMASTER-MISSING-QR-BACKFILL-V1` | Resource 미보유 master → 설명/Resource 확보 연동 |
| `WO-O4O-PRODUCTMASTER-QR-ON-CREATE-V1` | 신규 master 생성 시 QR(=Resource alias) 동시 확립 |
| `WO-O4O-PRODUCTMASTER-QR-PUBLIC-LANDING-V1` | `/r/{id}` 랜딩(언어탭·노출 게이트) |
| `WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1` | 다국어 설명 ↔ QR 연결 |
| `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1` | 행정처분/회수 노출 게이트 |

---

## 10. 신규 제품 등록 시 QR 동시 등록 설계 메모 (미구현)

- 향후: ProductMaster 생성 → ProductIdentifier 생성 → **(모델 D) 대표 Resource 확보 시 `/r/{id}` 로 QR 성립**. 설명/콘텐츠는 별도.
- 실패 정책 권장: **ProductMaster 생성은 유지**, QR(=Resource) 성립 실패는 retry queue 또는 missing-QR 보정 작업으로 처리(§18). ProductMaster 생성을 QR 실패로 전체 rollback 하지 않는다.

---

## 11. QR 없는 제품 보정 설계 메모 (미구현)

- 주기 작업: Resource(설명) 미보유 ProductMaster 조회 → dry-run → 설명/Resource 확보 → `/r/{id}` 성립 → CHECK 기록. QR 은 Resource 의 함수이므로 **보정의 본질은 설명/Resource 백필**(`WO-...-MISSING-QR-BACKFILL-V1`).

---

## 12. 코드/DB 무변경 확인

- 본 IR 조사 및 dry-run 은 **SELECT only**. DB write 0 · migration 0 · deploy 0 · 실제 QR 생성 0 · ProductMaster/ProductIdentifier/SPD 무변경.
