# IR-O4O-STORE-HUB-PUBLIC-MEDICATION-OFFER-EXPOSURE-AUDIT-V1

> **성격:** read-only 조사 전용. 코드 변경 0 / DB write 0 / API write 0 / migration 0 / 배포 0.
> **작성일:** 2026-07-27
> **선행 WO:** WO-O4O-KPA-LEGACY-MANUAL-PRODUCT-APPLICATION-REMOVE-AND-LISTING-MANAGEMENT-PRESERVE-V1 (완료, HUB-P1-07)

---

## 1. Executive Summary

**최종 판정: PASS (실제 노출 후보 0건 → 즉시 구현 WO 불필요) + 잠재 구조 갭 문서화.**

- **코드 경로 수준**: PUBLIC 배포 offer 는 서비스별 승인 게이트를 무조건 통과하며(`buildServiceApprovalGateSql`), store-HUB 상품 조회/신청 경로 어디에도 **의약품(`regulatory_type`) 또는 매장 유형(`organizations.type`) 필터가 없다.** 따라서 *만약* PUBLIC 의약품 offer 가 존재한다면 비약국 서비스(예: cosmetics) 카탈로그에 노출될 수 있는 **구조적 갭이 실재**한다. 이는 컨트롤러 주석에 이미 "의약품·매장유형 게이트 = HUB-P1-06 후속 WO"로 명시된 알려진 이연 항목이다.
- **프로덕션 데이터 수준**: `supplier_product_offers` 테이블이 **전체 0행(완전 비어 있음)** 이다. PUBLIC 활성 offer = 0, PUBLIC 의약품 offer = 0. 실제 store 진열 권위 테이블 `organization_product_listings` 의 활성 20건은 **전부 약국(pharmacy) 조직 소속**이며, 그중 의약품(DRUG) 5건도 모두 약국에 위치한다. **비약국 매장에 노출되는 의약품 = 0건.**
- 결론: 지금 이 순간 노출 사고는 없다(PASS). 그러나 offer 계약을 통해 PUBLIC 의약품 offer 가 생성되기 시작하면 갭이 즉시 활성화되므로, HUB-P1-06 게이트는 offer 발행 개시 전에 선반영되어야 하는 **선제(preventive) 과제**로 남긴다.

---

## 2. 코드상 PUBLIC 노출 계약

**핵심 파일:** `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts`
3개 서비스가 동일 컨트롤러를 serviceKey 만 바꿔 마운트한다: kpa (`kpa.routes.ts:410`), glycopharm (`glycopharm.routes.ts:385`), cosmetics (`cosmetics.routes.ts:137`).

### 2.1 승인 게이트 — PUBLIC 단락(short-circuit)
`buildServiceApprovalGateSql` (lines 83–93):
```sql
( spo.distribution_type = 'PUBLIC'
  OR EXISTS (SELECT 1 FROM offer_service_approvals osa
             WHERE osa.offer_id = spo.id
               AND osa.service_key = $N
               AND osa.approval_status = 'approved') )
```
→ `distribution_type = 'PUBLIC'` 이면 **무조건 TRUE**. 즉 PUBLIC offer 는 서비스별 승인(`offer_service_approvals`) 없이 모든 서비스 카탈로그에 나타난다. SERVICE 는 승인 row 필요, PRIVATE 는 추가로 seller-scope(`buildPrivateSellerScopeSql`, lines 115–120) 필요.

### 2.2 의약품·매장유형 필터 부재
- `GET /catalog` (206–311): `distribution_type IN (...)`, `spo.is_active=true`, 공급자 `s.status='ACTIVE'`, 승인 게이트(246), PRIVATE scope(254) 필터만 적용. `product_masters pm` 를 JOIN 하지만 **`pm.name`, `pm.brand_name` 만 SELECT** — `regulatory_type`/`drug_category` 미참조. 의약품·조직유형 필터 **없음.**
- catalog count (344–358): list 와 동일 조건.
- `POST /apply` (374–466): `findApplicableOffer` (134–169) 가 UUID + 게이트로 재검증. PUBLIC → `createPublicListing` (product-approval-v2.service.ts:510–583) → 의약품·조직유형 검사 없음.
- `GET /orderable` (577–725): 권위 테이블 `organization_product_listings`. SERVICE 만 인라인 승인 게이트(649–658), PUBLIC/PRIVATE 는 통과. 의약품·조직유형 필터 **없음.**
- `requirePharmacyOwner` (185, `createRequireStoreOwner`): store-owner **역할(role)** 게이트일 뿐, **조직 유형(organizations.type) 게이트가 아님.**

### 2.3 명시된 이연 갭
컨트롤러 주석 (lines 77–81): *"PUBLIC → 승인 불필요 ... 의약품·매장유형 게이트는 HUB-P1-06 후속 WO"* — 갭은 코드 저자가 이미 인지·이연한 항목이다.

**코드 판정: 노출 가능(FAIL 조건 성립) — 필터가 존재하지 않음.**

---

## 3. 의약품 판정 SSOT

**Primary SSOT: `product_masters.regulatory_type = 'DRUG'`** (offer→master 는 `master_id` FK 로 조인).

| 근거 | 내용 |
|------|------|
| 컬럼 | `product_masters.regulatory_type` (varchar, NOT NULL, immutable). 값: `DRUG` / `HEALTH_FUNCTIONAL`(및 한글 `건강기능식품`) / `QUASI_DRUG` / `COSMETIC` / `GENERAL`(및 한글 `일반`) / `MEDICAL_DEVICE` |
| 실 판정 함수 | 라이브 태블릿 가드 `store-tablet-medication-guard.ts:49–93` — `analyzeScreenSetMedication()` 이 `SELECT id, regulatory_type FROM product_masters` 로 판정. `regulatory_type='DRUG'` → 의약품 |
| NULL/미분류 | **보수적으로 의약품 취급** (masterId 미존재 또는 regulatory_type NULL → `unclassified=true`, 게이트는 `hasDrug || unclassified` 동일 처리) |
| 보조 축 | `drug_category` (nullable, `otc`/`rx`/`drug_unspecified`) 은 DRUG 내 OTC/Rx **세분류용**이지 1차 판정축 아님 |
| offer 자체 | `supplier_product_offers` 에는 규제 분류 컬럼 **없음** — 반드시 master 조인으로 도출 |

판정 메커니즘 3종(태블릿 가드 / product-type util / regulated-category 게이트)은 core 규칙(`regulatory_type='DRUG'`)에서 **일치**한다. (regulated-category 게이트만 `is_regulated`=DRUG 상위집합(quasi-drug 등 포함)이라 범위가 더 넓음 — 정밀 "의약품" 판정에는 `regulatory_type='DRUG'` 사용.)

> WO 금지사항 준수: 상품명 키워드·프론트 표시문자열·불명확 category 이름으로 판정하지 않고, 오직 `regulatory_type` 컬럼값으로만 판정함.

---

## 4. 매장 유형 판정 SSOT

**SSOT: `organizations.type`** — `'pharmacy'`(약국) vs `'store'`(비약국 매장).

| 근거 | 내용 |
|------|------|
| 컬럼 | `organizations.type` (varchar). store 관점 엔티티 `OrganizationStore` 에서 plain string |
| 실 판정 헬퍼 | `store-tablet.routes.ts:1712` `resolveStoreHubType(orgId)` — `type='pharmacy'`→pharmacy, `type='store'`→non_pharmacy, else→제외 |
| 서비스별 조직유형 | KPA 매장 = `pharmacy` / GlycoPharm 매장 = `pharmacy` / **K-Cosmetics 매장 = `store`(비약국)** |
| 서비스 축(별개) | `service_audience_policies.is_pharmacy_target_service` (service_key 별 boolean). offer→service 연결 게이트가 이 축 사용 |
| 사용자 축(별개) | `kpa_pharmacist_profiles`(user-scoped 자격). 매장 유형 게이트에는 미사용 |

3축 분리: (A) 서비스=KPA(serviceKey/membership), (B) 조직유형=약국(`organizations.type`), (C) 사용자 약사자격(`kpa_pharmacist_profiles`). 의약품 매장접근 게이트는 실제로 **축 B(`organizations.type`)** 를 사용하며, 현재 store-HUB 상품 조회 경로(§2)는 축 B 를 참조하지 않는 것이 갭의 본질이다.

---

## 5. 프로덕션 read-only 결과

**수행함.** 접속 채널: `gcloud run services describe o4o-core-api` 에서 DB 자격증명(user=`o4o_api`) 확인(승인된 read-only 자격증명 추출) → cloud-sql-proxy(127.0.0.1:5470, ADC 인증) 경유 psql. 우회·권한회피 없음. 스키마는 `information_schema` introspection 으로 실제 컬럼명 확인 후 쿼리(추정 컬럼 미사용).

| 검증 항목 | 결과 |
|-----------|------|
| `supplier_product_offers` 전체 행 수 | **0** (완전 비어 있음) |
| `offer_service_approvals` / `offer_service_prices` | 각 **0** |
| PostgreSQL | 15.17 (프로덕션 `o4o_platform`) |
| `product_masters.regulatory_type` 분포 | DRUG 177,413 / QUASI_DRUG 17,148 / 건강기능식품 15,528 / MEDICAL_DEVICE 3,826 / 일반 15 / GENERAL 9 |
| `organizations.type` 분포 | supplier 7 / **pharmacy 6** / **store 2** / division 1 / association 1 |
| `neture_suppliers.status` | ACTIVE 2 / PENDING 1 |
| `organization_product_listings` 활성 | **20건 (전부 organizations.type='pharmacy', service_key='neture')** |
| ↳ 활성 listing 규제분류 내역 | 일반 7 / 건강기능식품 6 / **DRUG 5** / GENERAL 2 (5건 DRUG 전부 약국 소속) |
| **비약국 조직(type≠pharmacy) 활성 DRUG listing** | **0건** |

> 민감정보 보호: 개별 UUID·상품명·공급자명은 CHECK 에 나열하지 않고 집계값만 기록.

---

## 6. 서비스별 노출 후보 표

| 서비스 | 매장 조직유형 | PUBLIC 의약품 offer | 실제 비약국 의약품 노출 후보 |
|--------|:---:|:---:|:---:|
| KPA (kpa) | pharmacy | 0 (offer 테이블 0행) | 0 (약국 — 노출돼도 정책상 허용 대상) |
| GlycoPharm (glycopharm) | pharmacy | 0 | 0 (약국) |
| **K-Cosmetics (cosmetics)** | **store(비약국)** | **0** | **0** (해당 조직 활성 listing 자체 0건) |

- offer 원천이 0건이므로 어느 서비스 카탈로그도 반환할 PUBLIC 의약품이 없음.
- 실 진열(`organization_product_listings`) 20건 전부 약국 소속 → 비약국 노출면에 의약품 0.

---

## 7. 판정: PASS / FAIL / HOLD

**PASS** — 실제 노출 후보 0건.

- 데이터 근거: PUBLIC 활성 offer 0, PUBLIC 의약품 offer 0, 비약국 조직 활성 의약품 listing 0.
- 단, **코드 구조 갭은 실재**하며(§2), 이는 판정을 뒤집지 않되(현시점 사고 0) 후속 선제 과제로 명문화한다.
- HOLD 아님: 의약품 SSOT(§3)·매장유형 SSOT(§4) 모두 명확·무충돌. offer 만으로 판정 불가한 상황도 아님(master 조인 규칙 확립). 세션 간 WIP 충돌 없음(본 조사 read-only, 문서만 생성).

---

## 8. 후속 WO 필요 여부

**즉시 구현 WO: 불필요** (WO 규정 "실제 노출 후보가 존재할 때만 후속 구현 WO" 에 따라 0건이므로 미생성).

**선제 과제로 등록 권장 (선택, 명시지시 필요):** `WO-O4O-STORE-HUB-PRODUCT-MEDICATION-STORE-TYPE-GATE-V1` (= HUB-P1-06).
- 트리거 조건: `supplier_product_offers` 에 PUBLIC 배포 offer(특히 의약품 master 연결) 발행이 시작되기 전.
- 게이트 설계 방향(참고): §2 의 `/catalog`·`/apply`·`/orderable` 경로에 (a) master `regulatory_type='DRUG'`(+ NULL 보수 처리) 판정과 (b) 요청 매장 `organizations.type='pharmacy'` 여부 교차 검사를 추가. 이미 존재하는 `store-tablet-medication-guard.ts` 판정 규칙 재사용 가능.
- 본 IR 은 조사 종료물이며, 위 WO 는 별도 승인·착수 대상(본 조사에서 실행하지 않음).

---

## 9. 코드·DB 변경 0 확인

- 코드 변경: **0** (본 문서 외 편집 없음)
- DB write: **0** (SELECT / information_schema introspection 만 수행)
- API write: **0** / migration: **0** / 배포: **0**
- 보존 대상(pnpm-lock, otc-safety-subgroup-apply.ts, otc-*.run.json, AllProductsOverviewPage.tsx 등) 및 타 세션 WIP: **미변경**
- 추가 산출물: 없음 (proxy 는 조사 후 종료)

---

*판정: PASS · 잠재 구조 갭(HUB-P1-06) 문서화 · read-only 완료*
