# CHECK-O4O-STORE-PRODUCT-DESCRIPTION-QR-CODE-CENSUS-AND-GAP-AUDIT-V1

Status: **DONE (조사 전용)** — 전수 census · 원인 확정 · 백필 계획 산출 완료. **DB write 0 · migration 0 · deploy 0.**
IR: `IR-O4O-STORE-PRODUCT-DESCRIPTION-QR-CODE-CENSUS-AND-GAP-AUDIT-V1`
Date: 2026-09-04
작업공간: worktree `C:\tmp\o4o-store-description-qr-audit` / branch `work/store-description-qr-audit-v1` (origin/main `466c8ec3c` 기준)
산출물: `tmp/store-description-qr-audit/` (qr-contract · store-census · qr-census · missing-qr · broken-qr · source-analysis · backfill-plan)

상위 기준: F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` + `V2-AMENDMENT`(제품 permalink `/p/{key}` · 불변식 #7) + `V3-AMENDMENT`(설명서 본문 인증 열람 · `ADR-0002`)

---

## 0. 결론 (요약)

| 질문 | 답 |
|---|---|
| QR canonical 소유 단위 | **ProductMaster 1개 = QR 1개** (설명서 단위 아님) |
| 저장물 | QR 이미지 **비저장**. 저장하는 것은 `product_landings.public_key` 뿐 |
| STORE 설명서가 있는데 QR 없는 제품 | **73,632건** (전체 QR 미보유 master 는 73,645건) |
| 어느 제품군 | **건강기능식품 40,946 · COSMETIC 32,674 · 일반 12** (DRUG · QUASI_DRUG · MEDICAL_DEVICE 는 누락 0) |
| 왜 빠졌나 | 2026-07-09 **1회성 bulk apply** 이후 **on-create 자동 발급(Phase 4)이 미구현**. 그 뒤 생성된 master 전부 누락 |
| 안전한 생성 가능? | **가능**. 기존 정본 스크립트를 **수정 없이** 재사용. 멱등 · batchId rollback 보유 |
| 중지 조건 해당 | **없음** (IR §11 의 5개 항목 전부 미해당) |
| 이상(중복 · 깨진 타깃 · 불일치) | **0건** |

**전제 정정 1건**: IR 은 "STORE 설명서 생성 시 QR 이 함께 존재해야 한다"를 전제했으나, 현행 계약은 **설명서와 무관하게 모든 ProductMaster 가 QR 1개를 갖는다**(설명 없으면 랜딩이 "상세 설명을 준비 중입니다." 렌더). 따라서 판정 기준을 "STORE 설명서 보유 master" 가 아니라 **"모든 master"** 로 넓혀 산출했다. 두 기준 모두 보고한다.

---

## 1. QR canonical 계약 (조사 확정 — IR §2)

IR §2 의 4지선다에 대한 판정: **A. ProductMaster 당 QR 1개**.

| 항목 | 확정값 | 근거 |
|---|---|---|
| 소유 단위 | ProductMaster 1 : QR 1 | V2-AMENDMENT 불변식 #7 / DB `uniq_product_landings_master` partial unique |
| 저장 테이블 | `product_landings` | migration `20261225000000-CreateProductLandings.ts` |
| 저장 컬럼 | `public_key` (12자 opaque, 0/1/l/o 제외 alphabet) | `product-landing.service.ts` |
| QR 이미지 | **저장 안 함** — 런타임 `generateQrSvg` / `generateQrPng` | F12 #4 |
| payload / URL | `https://neture.co.kr/p/{public_key}` (`NETURE_PUBLIC_ORIGIN`) | `productLandingUrl()` |
| Master ↔ QR | Landing → Master **단방향** FK. ProductMaster 무변경 | F12 #6 |
| STORE 설명서 ↔ QR | **FK 없음.** 렌더 시 `master_id` 로 canonical STORE 설명서 동적 resolve(언어탭) | `getPublicLanding()` |
| 재발급 | 없음. 설명서가 바뀌어도 URL/QR 불변 | F12 #3 |

**B / C / D 는 정본이 아니다:**

- **B(설명서당 QR)** — 설명서는 랜딩이 싣는 블록 중 하나. 설명 없어도 QR 성립.
- **C(매장 · 서비스별 QR)** — `store_qr_codes`(계층 2, `organization_id` 경계)는 별도 축. **87건 전량 매장 스코프이며 ProductMaster 를 가리키는 행 0 / SPD 를 가리키는 행 0**(`landing_type='product'` 18건은 전부 `organization_product_listings` 를 가리킴). 제품 축과 충돌하지 않는다.
- **D(별도 공개 Resource QR `/r/{id}`)** — **코드 · 라우트 구현 0건**(`apps/` · `packages/` · `services/` 전수 grep). 문서(F12 V1 #3)에만 존재. 판정 기준으로 쓰지 않는다.
- `product_identifiers` 의 `QR_CODE` 계열(저장형 경로 S) — **0건**, 미채택 확인.

> **경쟁하는 QR 시스템 없음** → IR §11 중지 조건 "기존 QR 시스템이 여러 개 경쟁" **미해당**.

---

## 2. QR 소비 경로 (IR §3) — 프로덕션 실검증

| 케이스 | 결과 |
|---|---|
| 프론트 `https://neture.co.kr/p/dkwxdbv7besn` | **200** (`services/web-neture/src/App.tsx:727` `/p/:publicKey`) |
| 비로그인 `GET /api/v1/public/product-landings/{key}` | **200 · `authRequired=true` · 본문 미포함**(제품명만) |
| 로그인 동일 요청 | **200 · `authRequired=false` · canonical STORE 본문 839자 · languages `[ko,en,zh]`** |
| 없는 key | **404 `LANDING_NOT_FOUND`** (대상없음 ≠ 인증필요 구분됨) |

**로그인 요구 여부 — IR 기대와 다름(결함 아님).** IR §3 은 "로그인 요구 없음"을 정상 조건으로 적었으나, 현행 계약은 **고정 URL · QR 은 유지하되 설명서 본문은 O4O 로그인 세션에만 응답**한다(`V3-AMENDMENT` §2.1 / `ADR-0002`). 서버 read model 에서 강제되며 프론트 숨김이 아니다. **정책이지 결함이 아니므로 결함 집계에 넣지 않았다.**

> QR 타깃 route **활성** → IR §11 "QR target route 가 현재 dead" **미해당**.

---

## 3. 전수 census (IR §4)

프로덕션 read-only SELECT (Cloud SQL Auth Proxy), 2026-09-04.

### 3-1. 제품군별

| regulatory_type | ProductMaster | QR 보유 | **QR 없음** | KO STORE canonical | **STORE 보유 & QR 없음** |
|---|---:|---:|---:|---:|---:|
| DRUG | 177,413 | 177,413 | 0 | 22,423 | 0 |
| **건강기능식품** | 40,948 | 2 | **40,946** | 40,948 | **40,946** |
| **COSMETIC** | 32,675 | 0 | **32,675** | 32,674 | **32,674** |
| QUASI_DRUG | 17,148 | 17,148 | 0 | 0 | 0 |
| MEDICAL_DEVICE | 3,826 | 3,826 | 0 | 0 | 0 |
| 일반 | 15 | 3 | 12 | 14 | 12 |
| GENERAL | 14 | 2 | 12 | 0 | 0 |
| **합계** | **272,039** | **198,394** | **73,645** | **96,059** | **73,632** |

- **화장품 기대값 대조**: IR 이 제시한 `COSMETIC ProductMaster 32,674 / KO STORE canonical 32,674` 중 **설명서 32,674 는 일치**, master 는 **32,675**(STORE canonical 미보유 1건 포함). 화장품 QR 누락 = **32,674**(설명 보유 기준) / **32,675**(전 master 기준).
- QUASI_DRUG · MEDICAL_DEVICE 는 STORE 설명서가 0건이지만 QR 100% 보유 — 계약상 정상.
- 다국어(en 63,207 · zh 41,324 · ja 32,270)는 QR 수를 늘리지 않는다(제품당 QR 1 + 랜딩 언어탭). 누락군 중 다국어 보유 master 40,958건도 QR 1개로 커버된다.

### 3-2. QR(Landing) 무결성

| 항목 | 값 |
|---|---:|
| active landing | 198,394 |
| distinct master / distinct public_key | 198,394 / 198,394 (완전 1:1) |
| soft-deleted landing | 0 |
| master 당 중복 | **0** |
| public_key 중복 | **0** |
| 존재하지 않는 master 를 가리키는 landing | **0** |
| status/exposure 비정상(active/ok 아님) | **0** |
| 발급 출처 | `landing-seed-20260709` 198,387 / `admin-qr-view` 5 / `admin` 2 |

---

## 4. 누락 · 이상 전수 분류 (IR §5)

| issueType | 건수 | 비고 |
|---|---:|---|
| `QR_OK` | 198,394 | |
| **`QR_MISSING`** | **73,645** | STORE canonical 보유 73,632 / 설명 무 13 |
| `QR_DUPLICATE` | 0 | DB unique index 로 구조적 차단 |
| `QR_BROKEN_TARGET` | 0 | orphan landing 0 · 랜딩 route 200 |
| `QR_TARGET_MISMATCH` | 0 | 전량 active/ok |
| `CHECK` | 0 | |

**참고(결함 아님)**: QR 은 있으나 STORE canonical 설명서가 없는 master **175,967건** — 계약상 정상(placeholder 렌더). 대부분 DRUG + QUASI_DRUG + MEDICAL_DEVICE.

**목록 산출 범위(명시)**: `missing-qr.json` 에는 **표본 200건만** 담았고 **73,445건은 파일에 담지 않았다.** 이유 — 백필 대상은 고정 목록이 아니라 `NOT EXISTS(active landing)` 술어로 산정되며(감사~적용 사이 신규 master 추가 가능), 전량 목록은 백필에 불필요하다. 재생성 SQL 을 같은 파일에 기록했다.

---

## 5. 누락 원인 (IR §6) — 확정

### 5-1. 시간 절단면

| 항목 | 값 |
|---|---|
| bulk apply 마지막 landing 생성 | **2026-07-09 07:29:52Z** |
| QR 없는 master 중 최초 생성 시각 | **2026-07-09 13:51:58** (약 6시간 뒤) |

월별: 2026-06 master 2 / QR 2 · 2026-07 master 239,359 / QR 198,392 · **2026-08 master 32,678 / QR 0**.
→ **부분 실패가 아니라 완전한 절단면.** bulk apply 이후 생성된 master 중 QR 보유는 관리자 화면 조회로 우연히 발급된 5건뿐이다.

### 5-2. 원인

**`product_masters` 를 INSERT 하는 어떤 경로도 `product_landings` 를 발급하지 않는다.** `product_landings` 를 참조하는 파일 12개 중 master 생성 코드는 0개다.

| 누락을 만든 생성 경로 | 산출 |
|---|---|
| `scripts/cosmetics-productmaster-apply-pilot/05-apply.mjs` · `08-full-apply.mjs` | COSMETIC 32,675 |
| `scripts/hff-*-store-canonical-apply.ts` · `hff-ko-agent-01-individual.mjs` 계열 | 건강기능식품 40,946 |
| `services/store-product-request-admin.service.ts` (런타임 신규상품 승인) | 소량 |

IR §6 이 제시한 후보 중 **해당하는 것은 "대량 INSERT pipeline 에서 QR 생성 안 함" 하나**이며, 나머지(legacy 만 보유 / 특정 descriptionType 만 / QR row 는 있으나 URL 누락 / 중복 방지 skip)는 전부 **미해당**이다. 설명서 생성 API 자체도 QR 을 만들지 않는다 — 발급은 설명서와 무관한 master 단위 작업이기 때문이다.

### 5-3. 문서에는 있었으나 만들어지지 않은 단계

`CHECK-O4O-PRODUCT-LANDING-PHASE2-V1` §8 과 `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1` §5 가 **Phase 4 = on-create 자동 발급**(`WO-O4O-PRODUCTMASTER-LANDING-ON-CREATE-V1`)을 다음 항목으로 명시했으나 착수되지 않았다. Phase 3 의 "100% 커버리지"는 2026-07-09 시점의 사실이며, 이후 모집단이 198,389 → 272,039(+73,650)로 늘어나는 동안 이를 유지하는 장치가 없었다.

### 5-4. 사용자 영향 (실측)

- **자가 치유되는 경로**: 매장/관리자에서 QR 을 *요청*하는 경로(`GET /store/handled-products/qr`, `POST /store-owner/manuals/:listingId/qr`, `GET /admin/o4o-product-db/product-landings/by-master/:masterId/qr`)는 `getLandingQr → mintForMaster` 로 **그 자리에서 멱등 발급**한다.
- **표시되지 않는 경로**: `PharmacyHubStoreManualController.detail`(GET `/store-owner/manuals/:listingId`)은 `getByMaster` 만 호출(조회 화면 write 금지 원칙) → Landing 미보유 master 는 `landing: null` 로 응답하여 **매장 설명서 화면에 QR · 공개 URL 이 표시되지 않는다.**
- **노출 규모**: master 가 연결된 `organization_product_listings` 47건 중 **32건(68%)** 이 Landing 미보유 master 를 가리킨다.

---

## 6. 기존 생성 기능 재사용 (IR §7) — 신규 시스템 불필요

| 재사용 대상 | 상태 |
|---|---|
| 발급 로직 `ProductLandingService.mintForMaster` | 멱등(기존 조회 → 없으면 INSERT, master unique 충돌 재조회, key 충돌 6회 재시도) |
| 일괄 스크립트 `scripts/productmaster-landing-bulk-apply.ts` | **수정 불필요**. dry-run 기본 · `--apply --batch-id` 이중 게이트 · `NOT EXISTS` 대상 산정 · `ON CONFLICT DO NOTHING` · batch/재개 · `metadata.batchId` rollback |
| public identifier | `public_key` (동일 생성기 · 동일 alphabet · 동일 길이) |
| URL / 랜딩 | `productLandingUrl()` + `/p/:publicKey` (변경 없음) |
| QR 이미지 | `generateQrSvg` / `generateQrPng` 런타임 생성 (저장 없음) |

**동일 계약 산출 보증**: 백필은 기존 198,394건과 **같은 테이블 · 같은 키 생성기 · 같은 URL 형식**을 쓴다. 실적 — 같은 스크립트로 2026-07-09 에 197,387건(+canary 1,000) 발급, 사후 중복 0.

**누락군에서도 기존 경로가 동작함이 이미 실증되어 있다**(코드 추론 아님): landing 중 `metadata.source='admin-qr-view'` 5건은 bulk apply **이후** 생성된 master(건강기능식품 2 · 일반 3)에 대해 관리자 QR 조회가 멱등 발급한 결과다(2026-07-10). 본 감사가 만든 행이 아니다.

---

## 7. 중복 · 안정성 (IR §8)

| 확인 항목 | 결과 |
|---|---|
| 동일 상품 QR 중복 생성 위험 | **없음** — `uniq_product_landings_master` partial unique + `NOT EXISTS` 대상 산정 |
| payload unique 계약 | `uniq_product_landings_public_key` UNIQUE. 현 중복 0 |
| 재실행 idempotency | **보장** — 이미 발급된 master 는 대상에서 제외 |
| URL 충돌 | key 공간 32^12 + unique index + 재시도 |
| 삭제 / 재발급 정책 | 재발급 없음. 삭제는 soft delete(tombstone), key 재사용 금지 |
| **설명서 변경 시 QR 유지** | **유지된다** — QR 은 master 기준 고정. 설명서 수정 · 언어 추가 · 재작성 · 교체가 QR 을 바꾸지 않는다(설명서 ↔ QR 직접 FK 없음) |

→ IR §8 이 우려한 "설명서 수정 때마다 QR 재생성" 구조가 **아니다**. IR §11 "상품/설명서와 QR 연결 키가 불안정" **미해당**.

---

## 8. 백필 계획 (IR §10) — 실행은 후속 WO

| 항목 | 값 |
|---|---:|
| `QR_MISSING` 총수 | 73,645 |
| 자동 생성 가능 | **73,645** |
| CHECK | 0 |
| 기존 QR 수정 필요 | 0 |
| 생성 불가 / blocker | **0** |

예상 write:

| 대상 | 건수 |
|---|---:|
| `product_landings` INSERT | 73,645 |
| mapping row | 0 |
| **ProductMaster 변경** | **0** |
| **STORE 설명서 변경** | **0** |
| QR 이미지 row | 0 |
| schema / migration | **불필요** |

> 실행 시점 수치는 감사 이후 신규 master 만큼 증가할 수 있다. 대상은 고정 목록이 아니라 `NOT EXISTS` 술어로 산정한다.

권장 순서: dry-run → canary `--limit 1000` 무결성 확인 → 전량 `--apply --batch-id landing-seed-YYYYMMDD` → 사후 검증(landing 수 = master 수 / 중복 0 / 표본 `/p/{key}` 200) → rollback 계약(`batchId` soft delete).

**후속 필수**: 백필만 하면 다음 대량 등록에서 같은 결함이 재발한다(bulk apply 이후 73,645건이 쌓인 것이 실증). **Phase 4(on-create 자동 발급 또는 주기 reconcile)를 별도 WO 로** 함께 잡아야 한다.

---

## 9. 중지 조건 판정 (IR §11)

| 조건 | 판정 |
|---|---|
| QR canonical 소유 단위 확정 불가 | **미해당** — ProductMaster 1:1 확정 |
| 기존 QR 시스템 여러 개 경쟁 | **미해당** — 계층 2 매장 QR 은 타깃이 겹치지 않음(master 0 / SPD 0), `/r/{id}` · identifier QR 은 미구현 · 미채택 |
| QR target route dead | **미해당** — `/p/{key}` 200, API 200/404 정상 |
| 대량 생성 시 기존 QR 충돌 위험 | **미해당** — unique + `NOT EXISTS` + 실적 |
| 상품/설명서 ↔ QR 연결 키 불안정 | **미해당** — master 기준 고정 |

→ **중지 조건 없음. 조사 PASS.**

---

## 10. 안전 / 범위

- **DB write 0.** 전 과정 SELECT + HTTP GET / 로그인 POST 만 수행. `QR_MISSING` 표본에 대한 mint 는 write 이므로 **하지 않았다**.
- 코드 변경 0 · migration 0 · deploy 0 · 문서 이동/삭제 0.
- 기준 repo 의 다른 세션 dirty · 미추적 파일 미접촉(별도 worktree 작업).
- 보고 · 산출물에 자격증명 literal 없음.

---

## 11. 문서 정합

발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건

1. `docs/checks/CHECK-O4O-PRODUCT-LANDING-PHASE2-V1.md` §6 "Landing 없는 master 0 (전 제품 커버)" 는 **2026-07-09 시점의 사실 기록**이며 현재(누락 73,645)와 다르다. `docs/checks/**` 는 CLAUDE.md §16-1 상 기록물이므로 **손대지 않았다**(보고만).
2. `docs/work-orders/WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-RUNBOOK-V1.md` §0 은 선행조건 `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1` 을 "미완"으로 적고 있으나 해당 WO 는 이후 완료(Phase 2 · 2b · 3 DONE)됐다. `docs/work-orders/**` 도 기록물이므로 **손대지 않았다**(보고만).
3. `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts` 헤더 주석의 "저장 방식은 Product Landing 설계 WO 에서 확정(본 dry-run 은 결론을 확정하지 않음)" 은 이미 확정된 현행(`product_landings.public_key`)보다 오래된 서술이다. **소스 주석이며 본 WO 범위 밖**이라 수정하지 않았다.

별도 WO 제안: (a) **누락 QR 백필 apply WO**, (b) **Phase 4 on-create 자동 발급 WO**.
