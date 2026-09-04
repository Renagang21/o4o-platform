# CHECK-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1

Status: **DONE** — 누락 73,645건 전량 backfill + ProductMaster 생성 시점 Landing 계약 마감. 독립 검증 PASS.
WO: `WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1`
선행 IR: `IR-O4O-STORE-PRODUCT-DESCRIPTION-QR-CODE-CENSUS-AND-GAP-AUDIT-V1` (commit `9aa2a48f8`)
Date: 2026-09-04
작업공간: worktree `C:\tmp\o4o-product-landing-coverage-closure` / branch `work/product-landing-coverage-closure-v1` (origin/main `5756d5ab6` 기준)
산출물: `tmp/product-landing-coverage-closure/` (census · dry-run · apply-canary · apply-result · preexisting-landing-baseline · post-verify · create-path-audit · qr-smoke · rollback)

상위 기준: F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` + `V2-AMENDMENT`(불변식 #7 — master 당 Landing 1개·대표 QR 1개) + `V3-AMENDMENT`(본문 인증 열람 · `ADR-0002`)

---

## 0. 결론

| 항목 | 값 |
|---|---|
| apply 직전 ProductMaster | **272,039** |
| apply 직전 QR_MISSING | **73,645** |
| backfill 생성 | **73,645** (canary 1,000 + 본 실행 72,645) |
| 기존 landing 변경 | **0** (fingerprint 불변) |
| **apply 후 landing coverage** | **272,039 / 272,039 = 100%** |
| **QR_MISSING** | **0** |
| duplicate / orphan | **0 / 0** |
| ProductMaster write | **0** |
| 설명서(STORE·B2B) write | **0** |
| schema / migration | **불필요 · 없음** |
| rollback batchId | `product-landing-full-backfill-v1` |
| on-create 미적용 런타임 경로 | **0** |

계약은 신설하지 않았다 — 발급기는 기존 `mintForMaster` 를, 대량 백필은 기존 `productmaster-landing-bulk-apply.ts` 를 **수정 없이** 재사용했다.

---

## 1. apply 직전 census (§3)

프로덕션 read-only 재측정. 선행 IR 수치와 동일.

| regulatory_type | masters | landing 보유 | **누락** |
|---|---:|---:|---:|
| DRUG | 177,413 | 177,413 | 0 |
| 건강기능식품 | 40,948 | 2 | **40,946** |
| COSMETIC | 32,675 | 0 | **32,675** |
| QUASI_DRUG | 17,148 | 17,148 | 0 |
| MEDICAL_DEVICE | 3,826 | 3,826 | 0 |
| 일반 | 15 | 3 | 12 |
| GENERAL | 14 | 2 | 12 |
| **합계** | **272,039** | **198,394** | **73,645** |

무결성(사전): soft-deleted 0 · master당 중복 0 · public_key 중복 0 · orphan 0.

### 기존 landing 불변 기준선 (§17)

apply 전에 기존 198,394행의 지문을 고정했다.

```
md5(string_agg(id||'|'||public_key||'|'||product_master_id||'|'||created_at, ',' ORDER BY id))
= 43751c78f065f0b332a5fbe6e2f79cc2
```

---

## 2. dry-run (§5)

`productmaster-landing-bulk-apply.ts` (write 0):

| 분류 | 값 |
|---|---:|
| **CREATE** | **73,645** |
| EXISTING | 198,394 |
| CHECK | 0 |
| BLOCKER | 0 |

`CREATE(73,645) == QR_MISSING(73,645)` **일치 → PASS**. 기존 landing 변경 예정 0 · 중복 public_key 위험 0(unique index) · master당 충돌 0(partial unique) · orphan 위험 0.

---

## 3. apply (§6)

`--apply --batch-id product-landing-full-backfill-v1 --batch-size 1000`

| 단계 | 결과 |
|---|---|
| canary `--limit 1000` | created 1,000 · 중복 0 · orphan 0 · **기존 지문 불변** |
| 전량 | createdThisRun **72,645** · landingsInThisBatch **73,645** · totalLandingsNow **272,039** |

허용된 write 만 발생: `product_landings` INSERT. **ProductMaster / STORE·B2B 설명서 / 기존 landing UPDATE / public_key 재발급 = 0.**

---

## 4. postVerify — 독립 검증 (§7 · §17)

apply 스크립트가 아닌 **별도 SQL** 로 재측정했다.

| 항목 | 값 |
|---|---:|
| ProductMaster | 272,039 |
| active landing 보유 master | **272,039** |
| **QR_MISSING** | **0** |
| coverage | **100.0000%** |
| master당 active landing 2개 이상 | **0** |
| public_key 중복(전체 행) | **0** |
| orphan landing | **0** |
| status/exposure 비정상 | **0** |
| public_key NULL/빈값 | **0** |
| public_key 길이 분포 | 12자 × 272,039 (단일) |
| batchId 행 | 73,645 |
| **기존 landing 지문(apply 후)** | **43751c78f065f0b332a5fbe6e2f79cc2 — 불변** |
| 기존 landing 행 수(apply 후) | 198,394 — 불변 |

제품군별 before → after: **7개 군 전부 누락 0** (건강기능식품 40,946→0 · COSMETIC 32,675→0 · 일반 12→0 · GENERAL 12→0, DRUG·QUASI_DRUG·MEDICAL_DEVICE 는 0 유지).

설명서·master 불변 확인: `shared_product_descriptions` STORE canonical 232,860 / B2B canonical 32,730 · `product_masters` 272,039 — 선행 IR 측정치와 동일.

코드 변경·smoke 이후 **최종 재확인**에서도 masters 272,039 / landings 272,039 / missing 0 / 지문 불변.

---

## 5. ProductMaster 생성 경로 전수 감사 (§8)

`insert into product_masters` 전수 grep(대소문자 무시) + ProductMaster repository `.save()/.create()` 호출부 전수 확인.

| 경로 | 분류 | 조치 |
|---|---|---|
| `catalog.service.ts :: resolveOrCreateMaster` (+ `createMasterWithoutBarcode`) | RUNTIME_CREATE | **on-create 훅** (3개 create 분기 전부) |
| `store-product-request-admin.service.ts :: approveAsNewMaster` | RUNTIME_CREATE | **on-create 훅** (TX 커밋 후) |
| `csv-import.service.ts :: applyBatch` / `retryFailedRows` | RUNTIME_CREATE | **on-create 훅** (커밋 후 일괄) |
| `product-candidate.service.ts` 단건 promotion → `DbPromotionMasterStore.createMaster` | RUNTIME_CREATE | **on-create 훅** (TX 커밋 후) |
| `drug-seed-promotion-apply-job.ts` · `scripts/drug-master-promotion-apply.ts` | BULK_CREATE | **종료 후 공통 reconcile 호출** |
| `scripts/cosmetics-productmaster-apply-pilot/*` · `scripts/hff-*` · `medical-device-gate-b-promotion.ts` · `rg-canonical-apply.ts` | BULK_CREATE (개발용 seed, raw SQL) | **§11 방식 B** — 작업 종료 후 `productmaster-landing-bulk-apply.ts` 재실행 (스크립트 헤더에 계약 명시) |
| `20270209000000-DeleteHffCorruptedProductMasters.ts` | LEGACY/RESTORE | 대상 아님(삭제·스냅샷 복원 전용, landing 도 스냅샷 복원) |
| `catalog-import.service.ts` · `catalog-import-validator.ts` | READ_ONLY | 대상 아님(생성은 resolver → `resolveOrCreateMaster` 로 수렴) |
| `product-candidate.service.ts :: refineDrugCategory` · `catalog.service.ts :: updateProductMaster` | NOT_A_CREATE(UPDATE) | 대상 아님 |

**런타임 생성 경로 4/4 적용 · 미적용 런타임 경로 0.**
공급자 신규 제품 등록은 `offer.service.ts` → `resolveOrCreateMaster` 로 수렴하므로 1번 항목에서 함께 닫힌다(masterId 외부 주입 금지 계약).

---

## 6. on-create 계약 (§9 · §10 · §11 · §12)

### 공통 helper (신규 QR generator 없음)

`modules/neture/services/product-landing.service.ts` 에 추가:

| 함수 | 용도 |
|---|---|
| `ensureProductLandingForMaster(ds, masterId, source)` | 단건 보장. 내부는 **기존 `mintForMaster`** 호출 |
| `ensureProductLandingsForMasters(ds, ids, source)` | 커밋 후 다건 보장(중복 id 1회 처리) |
| `reconcileMissingProductLandings(ds, {limit, source})` | 대량 작업 종료 후 누락분 회수. `NOT EXISTS` → 같은 mint |

계약:

- **TX 커밋 후 호출** — master 생성이 롤백되면 호출 자체가 없다 → **orphan landing 0**.
- **멱등** — 이미 있으면 아무것도 하지 않는다(`uniq_product_landings_master`). 재호출해도 landing 1개.
- **best-effort** — 발급 실패가 상품 등록·승인·import 를 막지 않는다. 실패분은 reconcile 로 회수(로그에 `reconcile 대상` 표시).
- **도메인별 복사 금지** — 모든 경로가 위 helper 만 호출한다.

### bulk 계약 (§11 — 방식 B 채택)

대량 생성은 작업 종료 후 reconcile 로 coverage 를 100% 로 되돌린다. drug 계열 2개 진입점은 `createdMaster > 0` 일 때 `reconcileMissingProductLandings` 를 호출하도록 코드에 넣었고, raw SQL seed 스크립트(.mjs/.ts)는 `productmaster-landing-bulk-apply.ts` 재실행이 계약이다.

### reconcile 안전판 (§12)

`productmaster-landing-bulk-apply.ts` 헤더에 **재실행 가능한 reconcile 도구**임을 명문화했다(일회성 seed 도구 아님). 누락 0 이면 dry-run `toCreate=0`, apply 해도 write 0. **스케줄러·cron 은 만들지 않았다**(§12 범위 외 — on-create 로 닫힘).

---

## 7. 테스트 (§13 · §14)

`src/modules/neture/services/__tests__/product-landing.on-create.test.ts` (신규, DB 비의존 목):

| 케이스 | 결과 |
|---|---|
| 신규 runtime master → Landing 1개 + public_key 12자 | PASS |
| 공급자 신규 제품(barcode 없는 master) → 자동 생성 | PASS |
| 기존 master(Landing 보유) → 재호출 신규 row 0 · 기존 유지 | PASS |
| 재시도 3회 → Landing 1개 유지 | PASS |
| **master 생성 실패(row 없음) → orphan Landing 0 · throw 없음** | PASS |
| 발급 실패 → 호출자 흐름 유지(best-effort) | PASS |
| 다건 보장 · 중복 id 1회 처리 | PASS |
| 한 건 실패가 나머지를 막지 않음 | PASS |
| reconcile: 누락만 발급 · 기존 미접촉 | PASS |
| reconcile: 누락 0 → write 0 | PASS |
| reconcile: limit 도달 → `remainingLikely=true` | PASS |

**11/11 PASS.** 기존 `product-landing.auth-gate.test.ts` **14/14 PASS**(회귀 0).
`tsc --noEmit` (api-server 전체) **에러 0**.

§14 회귀: landing 계약에 제품군 분기가 없다(발급 조건은 master 존재뿐). 제품군별 coverage 는 §4 표에서 7개 군 전부 100% 로 확인했고, **STORE/B2B 설명서 유무는 발급 조건이 아니다**(설명 없는 master 175,967건도 landing 보유 · placeholder 렌더).

---

## 8. QR smoke (§15) — 프로덕션 실검증

제품군 × (기존 landing / backfill 신규 landing) 표본 9건.

| 확인 | 결과 |
|---|---|
| `GET /api/v1/public/product-landings/{key}` 비로그인 | 9/9 **200 · authRequired=true** (본문 미포함) |
| 로그인 | 9/9 **200 · 올바른 ProductMaster resolve**(productMasterId 일치) |
| `https://neture.co.kr/p/{key}` | 9/9 **200** |
| QR SVG 동적 생성 | 9/9 **200 · 1,540~1,637자 SVG** |
| **QR 조회 시 신규 발급 여부** | 9/9 **created=false** |

`created=false` 가 전 표본에서 관측된 것은 **QR 조회 경로가 더 이상 신규 발급하지 않는다 = 이미 100% 커버**라는 뜻이다(백필 전에는 이 엔드포인트가 그 자리에서 mint 했다).

콘텐츠 해석도 계약대로: canonical STORE 보유 표본은 본문, 미보유 표본(DRUG·QUASI_DRUG·MEDICAL_DEVICE·GENERAL)은 placeholder.
인증 정책은 **변경하지 않았다** — 비로그인 `authRequired=true` 는 `V3-AMENDMENT`/`ADR-0002` 계약이며 결함이 아니다.

---

## 9. rollback (§16)

```sql
UPDATE product_landings SET deleted_at = now()
 WHERE metadata->>'batchId' = 'product-landing-full-backfill-v1' AND deleted_at IS NULL;   -- 73,645행
```

- 대상은 **이번 backfill 로 생성된 landing 만**. 기존 198,394건은 대상이 아니며 지문으로 불변을 확인했다.
- soft delete 만 사용 — public_key 는 tombstone 으로 보존하고 재사용하지 않는다(F12 #3).
- ProductMaster·설명서는 이번 apply 에서 변경되지 않았으므로 rollback 대상이 아니다.
- **on-create 코드는 SQL rollback 대상이 아니다** — 되돌리려면 코드 revert.

---

## 10. 중지 조건 판정 (§18)

| 조건 | 판정 |
|---|---|
| master당 landing 1개 계약이 코드와 충돌 | **미해당** (DB partial unique + mint 멱등) |
| on-create 로 transaction/orphan 문제 발생 | **미해당** — 커밋 후 호출로 설계, 실패 케이스 테스트 PASS |
| 여러 생성 경로를 안전하게 수렴 불가 | **미해당** — 런타임 4경로 전부 공통 helper 로 수렴 |
| 기존 landing 을 수정해야만 구현 가능 | **미해당** — 기존 landing write 0 |
| dry-run 과 실제 누락 수 불일치 | **미해당** — 73,645 완전 일치 |
| 다른 세션 WIP 충돌 | **미해당** — 별도 worktree, 기준 repo 미접촉 |

---

## 11. 배포 (§20)

- **schema 변경 없음 · migration 없음.**
- **deploy: 이번 WO 에서 수행하지 않았다.** 코드는 `work/product-landing-coverage-closure-v1` 브랜치에만 있고 **main 병합을 하지 않았다**(WO §20 "main 직접 작업은 하지 않는다"). 따라서 **on-create 훅은 아직 프로덕션에서 동작하지 않는다.**
- 즉 현재 프로덕션 상태는 **backfill 로 coverage 100% 달성 + on-create 는 병합·배포 대기**다. 병합·배포 전까지 신규 master 가 생기면 landing 이 다시 빠질 수 있으며, 그 구간은 reconcile 재실행으로 회수한다.
- 병합·배포는 사용자 판단 사항으로 남긴다.

---

## 12. 안전 / 범위

- DB write = `product_landings` INSERT 73,645건 **뿐**. ProductMaster·설명서·기존 landing 변경 0.
- 인증·노출 정책 변경 0. QR 이미지 저장 0(F12 #4 유지).
- 기준 repo(`C:\Users\sohae\o4o-platform`)의 다른 세션 WIP 미접촉 — 전 작업 별도 worktree.
- 보고·산출물에 자격증명 literal 없음.

---

## 13. 문서 정합

발견 2건 / 최소 정정 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

1. **최소 정정(WO §19 승인 범위)**: `docs/checks/CHECK-O4O-PRODUCT-LANDING-PHASE2-V1.md` 말미에 **Phase 4 완료 + 본 CHECK 링크** 후속 상태 한 블록을 덧붙였다. 본문 기록(§6 "Landing 없는 master 0" 등 2026-07-09 시점 사실)은 수정하지 않았다.
2. `docs/work-orders/WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-RUNBOOK-V1.md` §0 의 선행조건 "미완" 표기는 여전히 낡았다(선행 IR 에서 보고). `docs/work-orders/**` 는 CLAUDE.md §16-1 상 기록물이라 **이번에도 손대지 않았다**.
