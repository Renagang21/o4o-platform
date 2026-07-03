# CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1

> WO: **WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1**
> 성격: **승격 엔진 구현 + dry-run 검증**. `approveAsNewProductMaster` skeleton 구현. 이번 WO 에서 **운영 DB apply 미실행**(가드 뒤에서만 가능, 별도 승인 필요).
> 선행: `CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1`(정책), `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1`(check-digit 실측).

---

## 0. 요약

- ProductCandidate → ProductMaster 승격 엔진 구현 완료. **NOT_IMPLEMENTED skeleton 제거**, `approveAsNewProductMaster()` 실동작.
- 생성 대상 = **ProductMaster + ProductIdentifier 뿐**. RepresentativeProduct/SharedProductDescription/DrugExtension/Image/Offer/Listing/StoreLocalProduct 생성 없음.
- create / link / conflict / skip 4-outcome, **idempotent**, immutable 자동 덮어쓰기 금지.
- 단위테스트 **12/12 PASS**(전체 drug-import 64/64). `tsc` 신규/변경 파일 에러 0.
- **DB apply 미실행**: dry-run 기본, apply 는 `--apply --i-understand-apply`(+ 운영은 `--confirm-production`) 가드. 로컬 DB 없음 + 운영은 사용자 승인 대상.

---

## 1. 구현 파일 목록

| 유형 | 경로 | 비고 |
|---|---|---|
| 승격 결정 엔진 (PURE, DB 무관) | [drug-master-promotion-apply.service.ts](../../apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.service.ts) | eligibility·preview·promoteOne·report·어댑터 |
| DB store + bulk orchestration | [drug-master-promotion-apply.db.ts](../../apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.db.ts) | `DbPromotionMasterStore`, `runCandidatePromotion` |
| CLI (dry-run/apply 가드) | [drug-master-promotion-apply.ts](../../apps/api-server/src/scripts/drug-master-promotion-apply.ts) | `drug-master:promotion:apply` |
| 단위테스트 (12 케이스, InMemory store) | [__tests__/drug-master-promotion-apply.test.ts](../../apps/api-server/src/modules/neture/drug-import/__tests__/drug-master-promotion-apply.test.ts) | DB 불필요 |
| skeleton 구현 | [product-candidate.service.ts](../../apps/api-server/src/modules/neture/services/product-candidate.service.ts) `approveAsNewProductMaster()` | NOT_IMPLEMENTED 제거 |

재사용: 승격 정책 helper(`mapDrugCategory`/`buildSpecification`/`MFDS_PRODUCT_ID_PREFIX`)를 dry-run 서비스에서 import(중복 로직 없음), `validateGtin`(gtin.ts), `normalizeIdentifier`.

### 1.1 구조 — port 기반 결정 계층

승격 판정/미리보기/충돌은 `PromotionMasterStore` port 위에서 동작 → **DB 없이 InMemory store 로 단위테스트**. 실 apply 는 `DbPromotionMasterStore`(TypeORM). "service core = Candidate 기반, CSV = dry-run adapter" 원칙 준수:
- `promotionFieldsFromCandidate()` — 실 apply 경로 (rawPayload.source 폴백 포함).
- `promotionFieldsFromDrugRow()` — CSV dry-run 대량 검증 adapter 전용.

---

## 2. 승격 정책 (구현 반영)

```
grain: ProductMaster 1건 = 표준코드 1건 = SKU
eligible = active + 표준코드 13자리 + validateGtin(표준코드) 통과 + name/manufacturer 존재
barcode = 표준코드
mfdsProductId = HIRA:DRUG_MASTER:{표준코드}
regulatoryType = DRUG
drugCategory = 전문→rx / 일반→otc / 그외→drug_unspecified
mfdsPermitNumber = null
specification = 약품규격 + 제품총수량 + 제형구분 + 포장형태 fallback (결측 허용)
isMfdsVerified = true / mfdsSyncedAt = sourceBaseDate
tags = [import:hira-drug-master, batch:{importBatchId}, src:{sourceLabel}]
identifier: KOREA_DRUG_CODE(primary)=표준코드, MFDS_CODE=품목기준코드,
            KOREA_INSURANCE_CODE=제품코드(개정후), ATC_CODE=국제표준코드(ATC코드)
identifier.metadata = { sourceDataset:HIRA_DRUG_MASTER, sourceBaseDate, sourceRowNumber,
                        importBatchId, promotedFromCandidateId }
```

---

## 3. outcome 판정 로직

| outcome | 조건 | write |
|---|---|---|
| **skip** | cancelled / 표준코드 결측·형식이상·**check-digit fail** / name·manufacturer 결측 | 없음 |
| **create** | eligible + barcode 미존재 + KOREA_DRUG_CODE·mfdsProductId 타 master 없음 | ProductMaster + identifiers |
| **link** | eligible + **barcode 일치 Master 존재** | 누락 identifier 만 추가. **immutable 덮어쓰기 금지**(차이는 `existingMasterDiff`) |
| **conflict** | KOREA_DRUG_CODE(표준코드) 또는 mfdsProductId 가 **다른 Master** 에 존재 | 없음(거부, report 기록) |

- **idempotent**: 2회차 실행 시 barcode 일치 → link, identifier 존재 → skip. Master/Identifier 중복 0 (테스트 11 실증).
- **link ≠ overwrite**: barcode 일치는 동일 물리제품 → identifier 보강만. name/manufacturer/spec 자동 변경 없음(테스트 9 실증).
- `conflictBarcode` 지표는 예약(정상 흐름 0) — barcode 일치는 link 로 처리하며 conflict 아님.

---

## 4. dry-run / apply 안전 가드

| 모드 | 트리거 | 동작 |
|---|---|---|
| dry-run (기본) | flag 없음 | DB **read 만**(link/conflict 예측), write 0 |
| apply | `--apply --i-understand-apply` | 후보별 **트랜잭션** write |
| apply(운영) | + `NODE_ENV=production` | `--confirm-production` 없으면 **거부** |

- `--apply` 단독 → 거부(`--i-understand-apply` 필수).
- 실 apply 대상 = `product_candidates` (source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE' AND status∈{pending,reviewing,matched} AND deleted_at IS NULL, source_label LIKE batch). CSV 는 실 apply 대상 아님.
- **이번 WO 는 DB apply 미실행**: 로컬 DB 없음 + 운영 apply 는 사용자 승인 후속. 엔진·가드·테스트까지 완료.

---

## 5. report 지표 (dry-run/apply 공통)

`PromotionApplyReport`:
```
totalCandidates, eligibleCandidates
skippedCancelled / skippedMissingStandardCode / skippedInvalidStandardCodeFormat
  / skippedInvalidStandardCodeCheckDigit / skippedMissingRequired
wouldCreateMaster | createdMaster
wouldLinkExistingMaster | linkedExistingMaster
wouldCreateIdentifiers | createdIdentifiers, wouldSkipExistingIdentifiers
conflictBarcode, conflictMfdsProductId, conflictIdentifierBelongsToOtherMaster
rxCount, otcCount, drugUnspecifiedCount
multiPackageMfdsCodeCount, multiManufacturerMfdsCodeCount
sampleCreated / sampleLinked / sampleConflicts / sampleSkipped (+ sampleTruncated)
```
- 기대치(빈 DB 기준, PROMOTION-DRYRUN-V1 실측과 정합): eligible 230,841 전량 create, conflict 0, checkDigit skip 1. (candidate 적재 후 CLI dry-run 으로 재확인 예정.)

---

## 6. 테스트 결과

InMemory `PromotionMasterStore` 로 DB 없이 12 케이스:

1. eligible → create preview · 2. cancelled skip · 3. invalid GTIN skip · 4. mfdsProductId=HIRA:… · 5. KOREA_DRUG_CODE primary 생성 · 6. MFDS/보험/ATC identifier 생성 · 7. 기존 barcode link(새 master 0) · 8. KOREA_DRUG_CODE 타 master → conflict(write 0) · 9. link 시 name/manufacturer overwrite 금지 · 10. dry-run write 0 · 11. **apply idempotent**(2회차 link, 중복 0) · 12. candidate 어댑터(rawPayload.source 추출).

- `drug-master-promotion-apply.test.ts` **12/12 PASS**. 전체 drug-import **64/64 PASS**.
- `tsc --noEmit` 신규/변경 파일 에러 0.

---

## 7. 생성 대상 제한 확인

| 생성 | 여부 |
|---|:---:|
| ProductMaster | ✅ (create) |
| ProductIdentifier | ✅ |
| RepresentativeProduct / SharedProductDescription / ProductDrugExtension / ProductImage / SupplierProductOffer / OrganizationProductListing / StoreLocalProduct | ❌ 없음 |
| migration | ❌ 없음 |

- DB write 경로는 `DbPromotionMasterStore.createMaster`/`createIdentifier` + `markCandidatePromoted`(candidate 상태 갱신) 뿐. 그 외 테이블 미접근.
- raw CSV/report/serviceKey 커밋 없음.

---

## 8. 충돌 처리 정책

- **barcode 일치** → link(동일 제품). conflict 아님.
- **KOREA_DRUG_CODE(표준코드)가 다른 master 에** → conflict `identifier_belongs_to_other_master`, write 금지.
- **mfdsProductId(HIRA:…) 가 다른 master 에**(barcode 불일치인데) → conflict `mfds_product_id`, write 금지.
- 모든 conflict 는 report `sampleConflicts` + 카운트에 기록. 자동 병합/강제 링크 없음(운영자 판단 후속).

---

## 9. 다음 단계

1. **candidate 적재**(선행): 약가마스터 CSV → ProductCandidate apply(`drug:candidate-import --apply`, 프로덕션 승인) 또는 스테이징. 그 후 `drug-master:promotion:apply`(dry-run) 로 §5 수치 실측.
2. **PROMOTION apply(운영)**: 스테이징 검증 → 운영 `--apply --i-understand-apply --confirm-production` (사용자 승인).
3. 후속 순서 고정: **SharedProductDescription 파생**(e약은요 4,757) → **RepresentativeProduct 그룹핑**(품목기준코드 64,672) → **이미지 복사**(2,789 itemSeq) → **rollback CLI**(tags/identifier.metadata batch 추적 기반).

---

## 10. 완료 기준 준수

- dry-run 기본 동작 ✅ · apply env/flag/승인 가드 ✅ · 단위테스트 12/12 PASS ✅ · tsc 신규파일 0 ✅ · CHECK 문서 ✅ · raw/report/key 미커밋 ✅ · **운영 DB apply 미실행**(가드 뒤, 별도 승인) ✅.
