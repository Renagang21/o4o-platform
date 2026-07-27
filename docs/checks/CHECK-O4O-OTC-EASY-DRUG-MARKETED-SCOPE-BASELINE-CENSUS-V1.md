# CHECK — WO-O4O-OTC-EASY-DRUG-MARKETED-SCOPE-BASELINE-CENSUS-V1

- 에이전트: 라
- 성격: **read-only baseline census** — DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0
- 접속: Cloud SQL Auth Proxy 127.0.0.1:5442 → `netureyoutube:asia-northeast3:o4o-platform-db` · user `o4o_api` · db `o4o_platform` (read-only, REPEATABLE READ 단일 스냅샷)
- 스냅샷: `2026-07-27 03:46:25 UTC` (xmin 4050462) — 절대 카운트는 이 스냅샷 시점 값
- 산출물:
  - 스크립트: `apps/api-server/src/scripts/otc-easy-drug-marketed-scope-baseline-census.ts`
  - census JSON: `apps/api-server/src/scripts/data/otc-easy-drug-marketed-scope-baseline-census-v1.json`
  - proposal JSON (status=PROPOSAL): `apps/api-server/src/scripts/data/otc-easy-drug-marketed-scope-baseline-proposal-v1.json`

## 배경

기존 `WO-O4O-OTC-HOLD-ROUTE-GENCODED-LARGE-RECOVERY-CENSUS-V1`(HOLD_ROUTE 878 직접 조사)은 **중단**. 전체 허가품목 57,572를 설명서 생산 분모로 쓰던 진행률을 폐기할지 판단하기 위해, e약은요 등록 + O4O 실제 취급 근거 기준으로 생산 대상 모집단을 재확정.

## 판정 SSOT (재현 키)

| 개념 | 판정 |
|------|------|
| OTC 모집단 | `product_masters` JOIN `product_drug_extensions`(drug_category='otc', deleted_at IS NULL) |
| **e약은요 등록** | `shared_product_descriptions` STORE `source_type='mfds_easy_drug'` 의 **모든 status** (canonical=미전환 / deprecated=authored 전환 / candidate). deprecated 포함 → authored 전환으로 원천 등록 사실 소실 방지 |
| authored 완료 | STORE canonical **ko AND en**, source_type ∈ {mfds_drug_otc, mfds_drug_otc_nutrition_combo, o4o_drug_otc_topical, nutrition_combo} (raw easy·HFF·supplier·manual 제외) |
| O4O 취급 근거 | `organization_product_listings`(is_active) ∪ `supplier_product_offers`(is_active,!deleted) ∪ `store_products`(is_active), master 연결 + OTC 교집합 |
| EXCLUDE_CONFIRMED | 제품명 수출/군납/비매품 키워드 ∪ 비소매 대용량 포장 ∪ 표준코드 전량 취소(isCancelled) |

- **e약은요 판정 검증**: 단순 canonical row 존재만으로 판정하지 않음. 세 status 합집합으로 등록 사실을 원장화(deprecated=이미 authored 전환된 원래 e약은요 품목). 원천 `product_candidates(MFDS_EASY_DRUG_INFO)`=4,757 행은 승격 후 정리되어 설명서 원장(19,385)보다 적음 → 설명서 source_type 이 더 완전한 등록 원장.
- HOLD 재분류의 route/제형/식별 축은 표준코드 **일반명코드(성분명코드)** 9자리([7-9] 접미 allowlist) + e약은요 원문 효능·용법 2축 파싱. 로직은 `otc-remaining-full-corpus-census-v2.ts` VERBATIM 재사용.

## 결과 (스냅샷 2026-07-27 03:46 UTC)

### 7 필수 모집단 (합계 = 57,572, 상호배타)

| 모집단 | master |
|--------|-------:|
| p1 OTC_TOTAL_AUTHORIZED | **57,572** |
| p2 EASY_DRUG_REGISTERED | **19,385** |
| p3 EASY_DRUG_REGISTERED_COMPLETED | **14,442** |
| p4 EASY_DRUG_REGISTERED_INCOMPLETE | **4,943** |
| p5 NON_EASY_WITH_O4O_EVIDENCE | **0** |
| p6 NON_EASY_NO_MARKET_EVIDENCE | **32,385** |
| p7 EXCLUDE_CONFIRMED | **2,869** |
| aux NON_EASY_ALREADY_PRODUCED | **2,933** |

합계 14,442 + 2,933 + 4,943 + 0 + 32,385 + 2,869 = 57,572 ✓

e약은요 등록 status 분해(distinct master): canonical 4,943(미전환) + deprecated 14,188(authored 전환) + candidate 254 = 19,385.
완료 authored ko 소스: mfds_drug_otc 11,298 + nutrition_combo 3,545 + o4o_drug_otc_topical 2,532 = 17,375 (ko/en 1:1).

### O4O 실제 취급 근거 (핵심 발견)

- `store_products` **0행**, `supplier_product_offers` **0행**.
- `organization_product_listings` 20행(전부 is_active·status=pending) 중 OTC 교집합 **5 master, 5건 전부 e약은요 등록** → **비-easy O4O 취급 근거 = 0**.
- `store_local_products` 43행(활성 10, barcode 2건)은 master_id 없음(barcode only) → OTC master 귀속 불가, per-master 근거 미인정.

### 완료율 3종

| 기준 | 완료/분모 | 완료율 |
|------|----------|-------:|
| (a) 전체 허가 | 17,375 / 57,572 | **30.18%** (폐기 권고) |
| (b) e약은요 등록 | 14,442 / 19,385 | **74.50%** |
| (c) e약은요 + O4O 예외 + non-easy 기생산 | 17,375 / 22,318 | **77.85%** |

### 실제 생산 대상 & 잔여 HOLD

- 현실적 생산 대상 분모 = e약은요 등록 19,385 (+ 비-easy O4O 근거 0)
- 남은 열린 생산 대상 = **4,943** (전부 EASY_DRUG_REGISTERED_INCOMPLETE, 아직 raw easy_drug canonical)
- EXCLUDED_FROM_BULK_PRODUCTION = 32,385(no evidence) + 2,869(exclude) = **35,254** (영구 제외 아님, 근거 확인 시 개별 복원)

잔여 4,943 HOLD 분포: READY **1,134** / HOLD_IDENTITY 3,246(일반명코드 부재/다의) / HOLD_ROUTE 536(외용 부위 미확정·미등재 접미) / HOLD_SOURCE 27(원문 축 결손).
다음 대형 생산 후보(READY, route순): oral 540 · topical 327 · ophthalmic 253 · oromucosal 14.

EXCLUDE_CONFIRMED 사유: 수출/비매품 키워드 2,839 · 대용량 포장 30 · 전량취소 0.

## 게이트 (전 항목 PASS)

g1 OTC 재현 57,572 · g2 population 합=universe(true) · g3 easyReg subtotal(true) · g4 master 중복 0 · g5 완료 ko∧en(true) · g6 canonicalDup 0 · g7 needs_review 0 · g8 비의약품 소스 제외 · g9 evidence 예외는 real evidence만(true) · g10 EXCLUDE_CONFIRMED 미완료(true) · g11 완료 needs_review 없음(true) · g12 dbWrite 0 · HOLD 합=생산대상(true) · **2회 실행 byte-identical**.

## 동시 생산 스냅샷 특성

기존 `otc-remaining-full-corpus-census-v2.json`(08:49 스냅샷)은 authoredComplete 7,636·easyOnly 10,969. 본 census(이후 스냅샷)는 completed 17,375·easyIncomplete 4,943. **동시 세션이 easy→authored 를 활발히 생산 중**(combo-leaflet run.json 대량 추가가 증거). EASY_DRUG_REGISTERED(deprecated 포함)는 canonical→deprecated 보존으로 안정, COMPLETED/INCOMPLETE 는 실시간 이동. 판정 키/구조는 동일, 절대값만 스냅샷 차이. 기존 LIVE 완료 master 는 authored canonical 로 전량 포착(누락 0).

## 결론

- 전체 허가 57,572 기준 진행률(30.18%)은 **폐기 권고**. 실제 목표 분모 = **e약은요 등록 19,385** (완료율 74.50%).
- 열린 생산 대상은 **4,943**뿐이며 그중 READY 1,134. 나머지 35,254는 EXCLUDED_FROM_BULK_PRODUCTION.
- HOLD_ROUTE 재개는 생산 대상(easyIncomplete) 내 HOLD_ROUTE **536** 으로 한정해야 함(전체 878이 아님).
- 재실행: `cd apps/api-server && ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-marketed-scope-baseline-census.ts --port 5442`
