# CHECK-O4O-DRUG-MASTER-PROMOTION-APPLY-BATCHING-V1

> 성격: **승격 apply 경로 배치화** (성능 개선). 게이트 B(ProductMaster 승격) **승인 전** 단계. 이번 작업에서 **운영 ProductMaster/Identifier 실제 생성 안 함**.
> 선행: `CHECK-O4O-DRUG-MASTER-PROMOTION-DRYRUN-DB-V1`(운영 dry-run: create 230,841 / conflict 0). 엔진 `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1`.

---

## 0. 결론

- 승격 apply 의 `ProductMaster` / `ProductIdentifier` write 를 **per-row → 청크 multi-row INSERT** 로 전환. candidate 적재와 동일한 Job 1시간 timeout 문제(≈934,324 write 의 per-row round-trip) 예방.
- 순수 판정기 `promoteOne` (create/link/conflict/skip) **의미 불변**. write/read 분리로 dry-run write 0 유지, idempotent 유지, 생성 대상 = Master + Identifier 뿐.
- 단위테스트(fixture 기반 apply 6 + 엔진 12) 통과, 전체 drug-import **70/70**. 운영 dry-run 재확인 동일(create 230,841, conflict 0, **write 0**).
- **운영 승격 apply 미실행**(게이트 B 승인 전 금지).

---

## 1. 무엇을 바꿨나

| 항목 | before | after |
|---|---|---|
| ProductMaster write | 후보별 `createMaster` 1 INSERT (per-row) | **청크 multi-row INSERT**(500行/문) |
| ProductIdentifier write | 후보별 identifier 1개씩 INSERT | **청크 multi-row INSERT**(1000行/문) |
| candidate 마킹 | (per-row) | **청크 UPDATE ... FROM VALUES**(1000行/문) |
| master id | DB `gen_random_uuid()` | **앱측 `randomUUID()`**(identifier FK 선참조 위해) |
| catalog 조회 | 후보별 barcode/identifier/mfds SELECT(≈3~7/후보) | **선적재 2 SELECT + 메모리 인덱스** |
| 후보 로드 | `getMany()` 전량 | **keyset 페이지 스캔**(5,000/page) |

핵심: master id 를 앱에서 생성 → identifier 가 master 를 참조 가능 → **버퍼링 후 flush 시 masters→identifiers→candidate 순서**로 청크 write(FK 만족).

## 2. 구현 (파일)

| 유형 | 경로 |
|---|---|
| 배치 apply store + 러너 | [drug-master-promotion-apply.db.ts](../../apps/api-server/src/modules/neture/drug-import/drug-master-promotion-apply.db.ts) — `BufferingPromotionApplyStore`, `preloadCatalog`, `scanCandidatesPaged`, `runCandidatePromotion`(apply=배치, dry-run=위임) |
| 배치 dry-run(선행) | 동 파일 `runCandidatePromotionDryRun`, `PreloadedPromotionMasterStore` |
| fixture apply 테스트 | [__tests__/drug-master-promotion-apply-batch.test.ts](../../apps/api-server/src/modules/neture/drug-import/__tests__/drug-master-promotion-apply-batch.test.ts) |

## 3. 안전성 유지 (write/read 분리)

- **dry-run**: `runCandidatePromotion(apply=false)` → `runCandidatePromotionDryRun`(PreloadedStore, write 메서드 throw) → **write 0**.
- **apply**: `BufferingPromotionApplyStore` — read 는 preloaded(기존 DB) + in-run buffered, write 는 버퍼→flush. `--apply` 없이 write 없음(CLI/러너 분기).
- **판정 의미 불변**: `promoteOne`(순수) 그대로. create/link/conflict/skip 로직 미변경.
- **생성 대상 제한**: flush 는 `product_masters` / `product_identifiers` INSERT + `product_candidates` 마킹 UPDATE 만. RepresentativeProduct / SharedProductDescription / ProductDrugExtension / ProductImage / Offer / Listing **미생성**.
- **idempotent**: 시작 시 기존 master/identifier 선적재 → 기존 barcode 는 link(create 아님), 기존 identifier 는 skip. 부분 적용 후 재실행 시 기존분 link/skip → 안전. (candidate 마킹 `approved_new_master` 로 재스캔 대상에서도 제외.)

## 4. 테스트

**fixture 기반 apply (Fake DataSource, 실 DB 불필요) — 6/6 PASS**:
1. 빈 catalog + eligible 3 → master INSERT **청크 1회**(per-row 아님), master 3 / identifier 6 / candidate 마킹 3.
2. cancelled skip(INSERT 없음).
3. invalid GTIN(check-digit) skip.
4. **idempotency** — 기존 barcode master → link, master INSERT 0, identifier 는 누락분만.
5. **dry-run write 0**.
6. 표준코드 유일 → conflict 0, multiPackage 그룹 집계.

**엔진 단위(promoteOne) 12/12**, **전체 drug-import 70/70 PASS**, `tsc` clean.

## 5. 운영 dry-run 재확인 (배치화 후, write 0)

`drug-master-promotion-dryrun-db.ts`(로컬 tsx + cloud-sql-proxy, read-only) 재실행:

| 지표 | 값 |
|---|---:|
| scannedCandidates | 305,522 |
| eligible / wouldCreateProductMaster | 230,841 |
| wouldLinkExistingMaster | 0 |
| conflicts | 0 |
| wouldCreateIdentifiers | 703,483 |
| skipped (cancelled/checkDigit) | 74,680 / 1 |
| executionSec | 286 |
| **dbWrites** | **0** |

- `CHECK-...-DRYRUN-DB-V1` 과 **완전 동일** → 배치 리팩터가 판정 의미를 바꾸지 않음.
- 기존 catalog(product_masters 2 / identifiers 0) 불변.

## 6. 게이트 B (미승인) — apply 실행 시 예상

- 대상 = eligible 230,841 → ProductMaster **230,841** + ProductIdentifier **703,483** create, link 0, conflict 0.
- write ≈ 934,324 건을 청크(master 500 / identifier 1000)로 → INSERT 문 ≈ 462+703 ≈ **1,165문** + candidate 마킹 ≈231문. per-row(≈934k round-trip) 대비 수백 배 감소 → Job timeout 내 완료 예상.
- 실행 채널: candidate 적재와 동일하게 **Cloud Run one-off**(src 루트 Job entry 필요) 또는 로컬 proxy. **게이트 B 사용자 승인 + 사전 백업** 후 진행.

## 7. 완료 기준 준수

- 배치화 구현 ✅(Master/Identifier 청크 INSERT) · 판정 로직 유지 ✅ · dry-run 기본/write 0 ✅ · idempotent ✅ · create/link/conflict 의미 유지 ✅ · Master/Identifier 외 생성 금지 ✅
- 단위테스트(fixture apply 6 + 엔진 12) ✅ · 전체 dry-run 재확인 ✅ · **운영 apply 미실행** ✅ · CHECK 문서 ✅
