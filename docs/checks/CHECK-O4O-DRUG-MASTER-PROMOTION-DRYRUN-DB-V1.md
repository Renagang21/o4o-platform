# CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1

> 성격: **운영 DB promotion dry-run (write 0)** — 게이트 A(candidate 적재) 이후, 게이트 B(ProductMaster 승격) **전** 단계. ProductMaster/ProductIdentifier 실제 생성 없음.
> 선행: 게이트 A(candidate 305,522 적재, `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1` §9), 승격 엔진 `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1`.
> 실행일: 2026-07-03.

---

## 0. 결론

- 운영 DB 의 ProductCandidate **305,522건** 을 승격 정책으로 판정한 결과: **wouldCreate 230,841 / link 0 / conflict 0 / skip 74,681**.
- **기존 운영 ProductMaster/Identifier 와 충돌 0** (기존 catalog = master 2건·identifier 0건, 표준코드 barcode 충돌 0).
- **DB write 0** 확인. 배치 read 경로로 305,522건 **259초(~4.3분)** 완료.
- → 게이트 B(ProductMaster 승격 apply) 는 **충돌 정리 불필요**. 단, 승격 apply 는 대량이므로 **apply 경로 배치화 + 사용자 승인** 후 진행.

---

## 1. 실행 방식 (배치 read, write 0)

- per-candidate DB 조회(barcode/identifier/mfds 확인 ≈ 후보당 3~7 SELECT → 305k 건 시 수백만 round-trip)를 제거하기 위해 **기존 catalog 선적재 + candidate 페이지 스캔** 으로 배치화.
  1. `product_masters` 전량(2건) → `mastersByBarcode` / `mfdsProductId` 인덱스 (1 SELECT).
  2. `product_identifiers`(deleted_at IS NULL, 0건) → `(type, normalized)→masterIds` 인덱스 (1 SELECT).
  3. candidate 를 `id` keyset 페이지(5,000/page)로 스캔, 각 후보를 **순수 판정기 `promoteOne`** 에 메모리 store 로 통과 (후보당 DB 조회 0).
- 배치화는 **성능 목적**이며 write 동작을 추가하지 않는다(store 의 create/mark 메서드는 호출 시 throw).
- 구현: `runCandidatePromotionDryRun` + `PreloadedPromotionMasterStore` ([drug-master-promotion-apply.db.ts](../../apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.db.ts)), CLI [drug-master-promotion-dryrun-db.ts](../../apps/api-server/src/scripts/drug-master-promotion-dryrun-db.ts) (로컬 tsx + cloud-sql-proxy, 읽기 전용).

---

## 2. 결과 (전량 305,522)

| 지표 | 값 |
|---|---:|
| totalCandidates | 305,522 |
| eligibleCandidates | 230,841 |
| **wouldCreateProductMaster** | **230,841** |
| **wouldLinkExistingMaster** | **0** |
| **conflicts (barcode / mfdsProductId / identifierBelongsToOtherMaster)** | **0 / 0 / 0** |
| wouldCreateIdentifiers | 703,483 |
| executionSec | 259 (~4.3분) |
| dbWrites | **0** |

### 2.1 skipped 사유별

| 사유 | 수 |
|---|---:|
| cancelled | 74,680 |
| invalidStandardCodeCheckDigit | 1 |
| missingStandardCode | 0 |
| invalidStandardCodeFormat | 0 |
| missingRequired | 0 |
| **skip 합계** | **74,681** |

### 2.2 drugCategory (eligible)

| | 수 |
|---|---:|
| rx (전문) | 119,548 |
| otc (일반) | 57,572 |
| drug_unspecified | 53,721 |

### 2.3 그룹

| | 수 |
|---|---:|
| multiPackageMfdsCodeCount (표준코드≥2) | 61,113 |
| multiManufacturerMfdsCodeCount (업체≥2) | 5,101 |

---

## 3. 기존 ProductMaster/Identifier 충돌 여부

- 기존 운영 catalog: **product_masters 2건, product_identifiers 0건**(활성).
- 우리 표준코드(230,841)와 기존 master.barcode 교집합 = **0** (link 0).
- KOREA_DRUG_CODE / mfdsProductId(`HIRA:DRUG_MASTER:{표준코드}`) 가 다른 master 에 존재 = **0** (conflict 0).
- **결론: 승격 apply 시 전량 신규 create. 기존 catalog 오염/충돌 없음.**

---

## 4. 오프라인 dry-run 과의 정합

| 지표 | 오프라인(PROMOTION-DRYRUN-V1) | 운영 DB(본 CHECK) |
|---|---:|---:|
| eligible / wouldCreate | 230,841 | 230,841 ✅ |
| cancelled skip | 74,680 | 74,680 ✅ |
| check-digit skip | 1 | 1 ✅ |
| rx / otc / unspecified | 119,548 / 57,572 / 53,721 | 동일 ✅ |
| conflict | (해당 없음) | 0 |

→ 오프라인 예측이 운영 DB 실측과 **완전 일치**. candidate 적재가 무손실.

---

## 5. DB write 0 확인

- CLI 는 SELECT 만 수행(store write 메서드 throw, apply 개념 없음). report `dbWrites: 0`.
- 실행 후 `product_masters`/`product_identifiers` row 수 불변(각 2 / 0). raw report JSON 은 repo 밖(`o4o-public-data-samples`) 저장·미커밋.

---

## 6. 산출물

| 유형 | 경로 |
|---|---|
| 배치 dry-run + preloaded store | `drug-master-promotion-apply.db.ts` (`runCandidatePromotionDryRun`, `PreloadedPromotionMasterStore`) |
| 로컬 CLI (read-only) | `src/scripts/drug-master-promotion-dryrun-db.ts` |
| 본 CHECK 문서 | `docs/checks/CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1.md` |
| report JSON (repo 밖·미커밋) | `o4o-public-data-samples/drug-master-promotion-dryrun-db-report.json` |

- 단위테스트 전체 drug-import 64/64 PASS, `tsc` clean.

---

## 7. 다음 판단 (게이트 B)

수치 근거:
```
conflict 0 → 충돌 정리 도구 불필요
link 0 / create 230,841 → 전량 신규 승격
```
- **게이트 B(ProductMaster 승격 apply) 진행 가능 조건 충족.** 단 선행 필요:
  1. **apply 경로 배치화** — 현재 `promoteOne` apply 경로는 per-row(create master + identifiers). 230,841 master + 703,483 identifier 를 per-row INSERT 하면 Job 1시간 timeout 초과(candidate 적재와 동일 교훈). candidate import 처럼 **청크 multi-row INSERT** 로 전환 필요.
  2. **사용자 승인(게이트 B)** — ProductMaster/Identifier 실제 생성은 별도 승인 전까지 실행 금지.
- 후속(승격 이후): SharedProductDescription 파생(e약은요 4,757) → RepresentativeProduct 그룹핑(품목기준코드 64,672) → 이미지 복사(2,789) → rollback CLI.
