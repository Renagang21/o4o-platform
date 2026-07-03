# CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1

> WO: **WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1**
> 성격: **write 0 dry-run** — 약가마스터 CSV 전량을 승격 정책에 적용했을 때의 예상 건수/제외 사유 실측. ProductMaster/ProductIdentifier/Candidate/DrugExtension/Image/SharedProductDescription 생성 0, migration 0, DB 연결 0.
> 선행: `CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1`(승격 정책), `CHECK-O4O-EASY-DRUG-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1`.

---

## 0. 핵심 결론 (한눈에)

- **`barcode = 표준코드` 정책 확정 가능.** active 230,842건 중 **GTIN check-digit 실패 = 단 1건**(0.0004%). 그 1건도 원본 데이터 오타(§6)이지 정책 리스크 아님.
- 승격 예상: **ProductMaster 230,841건** = active + 표준코드 GTIN 통과 = SKU. cancelled 74,680(24.4%) 제외.
- 표준코드/mfdsProductId 파일 내부 **중복 0** — grain(1 표준코드 = 1 Master) 무결.
- drugCategory: **rx 119,548 / otc 57,572 / drug_unspecified 53,721**(전문일반구분으로 직접 확정).

→ **다음 판단 기준 §1**(케이스 1: check-digit fail 극소수) 성립. 승격 구현/apply 준비로 진행 가능.

---

## 1. 구현 파일 목록

| 유형 | 경로 |
|---|---|
| dry-run 판정기 (PURE, DB 무관) | [drug-master-promotion-dryrun.service.ts](../../apps/api-server/src/modules/neture/drug-import/drug-master-promotion-dryrun.service.ts) |
| CLI (파일 read-only) | [drug-master-promotion-dryrun.ts](../../apps/api-server/src/scripts/drug-master-promotion-dryrun.ts) |
| 단위테스트 (9 케이스, DB·파일 불필요) | [__tests__/drug-master-promotion-dryrun.test.ts](../../apps/api-server/src/modules/neture/drug-import/__tests__/drug-master-promotion-dryrun.test.ts) |
| package.json script | `drug-master:promotion:dry-run` |
| 본 CHECK 문서 | `docs/checks/CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1.md` |

재사용: `drug-master-csv.parser.ts`(CP949 파싱), `utils/gtin.ts`(`validateGtin` — check-digit). **커밋 제외(repo 밖·대용량)**: CSV / report JSON.

---

## 2. 입력 파일 / 실행 명령

| 파일 | 경로 (repo 밖) | 크기 | 행수 |
|---|---|---|---|
| 약가마스터 CSV | `C:\Users\home\coding\o4o-public-data-samples\mfds-drug-master-standard-code.csv` | 54,880,067 B | 305,522 (헤더 제외) |
| dry-run report (산출) | `C:\Users\home\coding\o4o-public-data-samples\drug-master-promotion-dryrun-report.json` | ~9 KB | — |

실행:

```powershell
pnpm --filter @o4o/api-server drug-master:promotion:dry-run -- `
  --file "C:\Users\home\coding\o4o-public-data-samples\mfds-drug-master-standard-code.csv" `
  --base-date 2025-10-31 `
  --out "C:\Users\home\coding\o4o-public-data-samples\drug-master-promotion-dryrun-report.json"
```

- 로드: `encoding=cp949 headerMatches=true rows=305522 parseErrors=0`.
- 대용량 전량 처리 위해 `NODE_OPTIONS=--max-old-space-size=4096` 권장(305k row 그룹핑).

---

## 3. 승격 판정 결과 (전량)

| 지표 | 값 | 비율 |
|---|---:|---:|
| totalRows | 305,522 | 100% |
| activeRows | 230,842 | 75.6% |
| cancelledRows | 74,680 | 24.4% |
| missingStandardCode | 0 | — |
| invalidStandardCodeFormat | 0 | — |
| **invalidStandardCodeCheckDigit** | **1** | **0.0004%** |
| missingRequired (name/manuf 결측) | 0 | — |
| **eligibleRows** | **230,841** | active의 99.9996% |

> 판정 우선순위: cancelled → 표준코드 결측 → 형식 → **check-digit** → 필수필드. active row 중 표준코드는 형식 100% 통과(sim 재확인), check-digit도 1건 제외 전량 통과.

---

## 4. 생성 예상 (eligible 230,841 기준)

| 대상 | 예상 수 |
|---|---:|
| wouldCreateProductMaster | **230,841** |
| ProductIdentifier `KOREA_DRUG_CODE`(primary) | 230,841 |
| ProductIdentifier `MFDS_CODE` | 230,841 |
| ProductIdentifier `KOREA_INSURANCE_CODE` | 64,745 (제품코드 개정후 보유분) |
| ProductIdentifier `ATC_CODE` | 177,056 (ATC 보유분) |
| **identifier 총계** | **703,483** |

- 모든 eligible에 `KOREA_DRUG_CODE`(=barcode mirror) + `MFDS_CODE`(품목기준코드) 부착. 보험코드/ATC는 보유분만.
- mfdsProductId preview = `HIRA:DRUG_MASTER:{표준코드}` (충돌 0, §7).

---

## 5. drugCategory 분포 / 포장 fallback

| drugCategory | 수 | 비율 |
|---|---:|---:|
| rx (전문) | 119,548 | 51.8% |
| otc (일반) | 57,572 | 24.9% |
| drug_unspecified (그외/결측) | 53,721 | 23.3% |

- 전문일반구분이 rx/otc를 **직접 확정** → `drug_unspecified` 23.3%는 구분값 자체가 비어있거나 비표준인 row. (승격은 허용, 운영자 refine 대상.)
- **Rx가 절반**임을 유의 — 승격은 SSOT 등록만이며 판매/노출은 열지 않는다(DrugExtension 미생성, 후속 WO).

| package 지표 | 수 |
|---|---:|
| packageFormMissingCount | 74,627 |
| specificationFallbackUsedCount | 74,627 |
| specificationEmptyCount | **0** |

> 포장형태 결측 74,627건 전량이 fallback(규격+수량+제형)으로 합성 성공 → **specification 전량 non-null**. 결측이 승격을 막지 않음(설계 §6 실증).

---

## 6. GTIN check-digit 실패 1건 (정체)

| 필드 | 값 |
|---|---|
| rowNumber | 114,061 |
| 표준코드 | `8806428006706` |
| gtinError | `Invalid check digit: expected 7, got 6` |
| 한글상품명 | 바이락스정(아시클로버)[수출명:이노바이락스정200mg…] |
| 업체명 | 고려제약(주) |

- **원본 데이터 오타**(마지막 자리 6, 정상은 7)로 판단. 정책 리스크 아니라 오히려 검증이 잘못된 barcode의 Master 오염을 차단한 사례.
- 처리: 승격 제외 + `reviewFlags` 성격으로 candidate 보존. apply 시 운영자 검토(표준코드 정정 또는 제외).

---

## 7. 그룹핑 / 충돌

| 그룹 지표 (eligible) | 값 |
|---|---:|
| distinctStandardCode | 230,841 (= eligible, row당 유일) |
| distinctMfdsCode (품목기준코드) | 64,672 |
| multiPackageMfdsCodeCount (표준코드≥2) | 61,113 (94.5%) |
| multiManufacturerMfdsCodeCount (업체≥2) | 5,101 (7.9%) |
| maxStandardCodesPerMfdsCode | 487 |

| 파일 내부 충돌 | 값 |
|---|---:|
| duplicateStandardCodeInFile | **0** |
| duplicateMfdsProductIdPreview | **0** |
| standardCodeToMultipleRows | **0** |

- **표준코드/mfdsProductId 중복 0** → `barcode` UNIQUE / `mfds_product_id` UNIQUE 위반 위험 없음(파일 내부). grain 무결.
- 품목기준코드의 94.5%가 다포장(표준코드≥2) → sim의 "설명 1벌 → N SKU" 재확인. **대표상품 그룹핑 후속 WO의 모수 = 64,672 품목기준코드**.
- 다제조사 5,101건(7.9%)은 표준코드 grain이라 Master 층에서 문제 없음(각 표준코드=자기 업체). 대표상품 manufacturer 자동파생만 금지(설계 §8). 예: 품목기준코드 `200805356` = 14 SKU / 업체 4곳(삼일엘러간·삼일제약·한국애브비·한국엘러간).

---

## 8. 검증 / 안전 경계

- 단위테스트 **9/9 PASS** (active/cancelled 판정, 형식·check-digit, mfdsProductId·barcode preview, primary identifier, drugCategory, specification fallback, 파일 내부 중복/그룹).
- 새 파일 `tsc --noEmit` 에러 0.
- **DB write 0** (report `dbWrites: 0`, `mode: 'dry-run'`). 순수 파일 기반 — env-loader/reflect-metadata/DB connection import 없음.
- git diff = 코드 4개(service/cli/test + package.json script). **raw CSV/report JSON 미포함**(repo 밖 sibling `o4o-public-data-samples`). serviceKey 출력 없음.

---

## 9. 다음 판단 기준 대조 (WO §다음 판단)

| 케이스 | 결과 |
|---|---|
| 1. check-digit fail 0/극소수 → barcode=표준코드 확정, 승격/apply 준비 | ✅ **성립** (1건, 0.0004%) |
| 2. check-digit fail 다수 → barcode 정책 재검토 | 해당 없음 |
| 3. cancelled 많음 → V1 active only 유지 확인 | ✅ 24.4% → active only 정책 유지 타당 |
| 4. eligible 충분 → Master seed 1차 구축 가능 | ✅ 230,841건 |

---

## 10. 다음 단계 제안

**WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1** (권장 착수)
- `product-candidate.service.ts` `approveAsNewProductMaster()` skeleton 구현(설계 §2~§9).
- `--apply` write: eligible → ProductMaster + ProductIdentifier(idempotent). 기존 Master link/conflict 처리 + report.
- 안전: dry-run 기본, **프로덕션 apply는 사용자 승인**. check-digit fail 1건 등 skip은 candidate 보존.
- 추적 앵커: `ProductMaster.tags=['import:hira-drug-master', 'src:{sourceLabel}']` + `ProductIdentifier.metadata`(§설계 §11).

**후속 순서 고정**: APPLY → SharedProductDescription 파생(e약은요 4,757 전량) → RepresentativeProduct 그룹핑(64,672 품목기준코드) → 이미지 복사(2,789 itemSeq) → rollback CLI.
