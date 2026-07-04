# WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1

> 작업 성격: **Gate A ProductCandidate import 파이프라인 구현 + offline dry-run.** ProductCandidate apply 0, DB write 0, migration 0, ProductMaster/ProductIdentifier 생성 0. 실 apply 는 사용자 명시 승인 후 별도.
> 작성일: 2026-07-04
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md`(D2/D3/D4), `docs/checks/WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1.md`, `docs/checks/WO-O4O-MEDICAL-DEVICE-UDI-DI-IDENTIFIER-TYPE-IMPLEMENTATION-V1.md`

---

## 1. 목적

의료기기 표준코드별 제품정보 raw JSONL을 `ProductCandidate` 후보 계층에 적재하는 Gate A import 파이프라인(parser + mapper + service + CLI)을 구현하고, 실 raw 20,000행에 대해 offline dry-run을 수행한다. **ProductMaster/ProductIdentifier 승격은 하지 않는다.**

---

## 2. 변경 파일 (신규 5)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-jsonl.parser.ts` | JSONL parser (`{...,item}` 래핑 언랩, invalid line 누적) |
| `apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-candidate.mapper.ts` | 단건 매퍼 (identifierType 분류 + reviewFlags + rowSignature) |
| `apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-candidate-import.service.ts` | 서비스 (교차행 충돌 계산 + dedup + dry-run/apply) |
| `apps/api-server/src/scripts/medical-device-standard-code-candidate-import.ts` | CLI (dry-run 기본, --apply env gate) |
| `apps/api-server/src/modules/neture/drug-import/__tests__/medical-device-standard-code-candidate-import.test.ts` | 유닛테스트 (12 케이스) |

> **package.json 스크립트 미등록(의도적):** 커밋 시점에 `apps/api-server/package.json` 에 **병렬 세션의 미커밋 변경**(`hff:store-desc:bulk-dry-run`)이 있어, 이를 흡수하지 않기 위해 pnpm 스크립트 등록을 보류했다. CLI는 `npx tsx` 로 직접 호출한다(아래 §7). 병렬 변경 커밋 후 `medical-device:candidate-import` 한 줄 추가는 후속 처리.

---

## 3. raw 파일

```text
G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl
```

구조: `{ sourceDataset, fetchedAt, pageNo, rowIndex, item:{ UDIDI_CD, PRDLST_NM, PERMIT_NO, ... 20 fields } }`. repo 밖·git 미추적. 절대 커밋하지 않는다.

---

## 4. parser/mapper 정책

### 4.1 parser
- line 단위 JSON 파싱. `{item}` 래핑 언랩(평면 item 도 관대 수용).
- invalid JSON line 은 throw 하지 않고 `errors[]` 누적(무음 손실 금지). 빈 줄 skip.

### 4.2 mapper (단건, 순수함수)
- `sourceType=external_api`, `sourceLabel=MFDS_MEDICAL_DEVICE_STANDARD_CODE`, `sourceKind=medical_device_standard_code`
- `identifierValue = UDIDI_CD`(원형), `normalizedIdentifierValue = normalizeIdentifier(type, UDIDI_CD)`
- `candidateName = PRDLST_NM 우선 → PRDT_NM_INFO`, varchar(255) 방어적 truncate(원문 rawPayload 보존)
- `candidateManufacturer = MNFT_IPRT_ENTP_NM`, `candidateCategory = MDEQ_CLSF_NO (+ 등급)`, `candidateSpec = FOML_INFO`
- `candidateUnit/ImageUrl = null` (포장/SKU/이미지 축 부재)
- rawPayload = 원본 item 전체 + derived(permitNo/model/grade/usePurpose 등) + reviewFlags + sourceRowSignature

---

## 5. identifierType 매핑 (D2/D3)

| UDIDI_CD | identifierType | normalize | reviewFlag |
|---|---|---|---|
| 숫자 14 + GTIN check pass | `GTIN` | 숫자 원형 | `UDI_DI_GTIN14_CHECKDIGIT_PASS` |
| 숫자 13 + GTIN check pass | `GTIN` | **원형 13 (zero-pad 안 함)** | `UDI_DI_GTIN13` |
| 숫자 13/14 + check fail | `UDI_DI` | 원형 보존 | `UDI_DI_GTIN_CHECKDIGIT_FAIL` |
| HIBCC(`+`)/비숫자 | `UDI_DI` | **`+`·문자 원형 보존** | `UDI_DI_NON_GTIN` |
| 결측 | `null` | null | `UDI_DI_MISSING` |

check-digit 검증은 기존 `utils/gtin.ts:isValidGtin` 재사용. normalize 는 `utils/product-identifier.util.ts:normalizeIdentifier` 재사용(UDI_DI 원형 보존).

---

## 6. reviewFlags 정책

단건(mapper): `UDI_DI_MISSING`, `UDI_DI_NON_GTIN`, `UDI_DI_GTIN13`, `UDI_DI_GTIN14_CHECKDIGIT_PASS`, `UDI_DI_GTIN_CHECKDIGIT_FAIL`, `PERMIT_NO_MISSING`, `PRODUCT_NAME_MISSING`, `MANUFACTURER_MISSING`, `MODEL_MISSING`, `CANDIDATE_NAME_OVERLENGTH`, `STATUS_UNCHECKED`.

교차행(service): `UDI_DI_DUP_CONFLICT`(같은 정규화 UDIDI 가 다른 rowSignature 다수), `MULTI_UDI_PER_PERMIT`(같은 PERMIT 다수 UDIDI).

**허가 상태 미조인:** 이 오프라인 importer 는 permit status map 을 연결하지 않는다 → 전건 `STATUS_UNCHECKED`, `rawPayload.statusJoined=false`. `PERMIT_NOT_FOUND`/`PERMIT_INACTIVE`/`STATUS_ACTIVE` 는 Gate B 승격 단계에서 status map 입력이 있을 때 계산한다.

### dedup/충돌 처리 (핵심)
- **idempotency 키 = rowSignature**(`PRDLST_NM|FOML_INFO|PERMIT_NO|MNFT|MDEQ_CLSF_NO|UDIDI_CD`), UDIDI 단독 아님.
- 이유: 같은 UDIDI 다른 제품(충돌행)을 UDIDI 로 dedup 하면 서로 다른 제품이 병합된다. rowSignature 로 하면 **완전 동일행만 dedup, 충돌행은 별도 후보로 보존**된다.
- 충돌행: `matchStatus='conflict'` + `UDI_DI_DUP_CONFLICT` flag 부착(Gate A 적재하되 승격 보류 근거).

---

## 7. dry-run 결과 (실 raw 20,000, offline)

CLI 호출:
```bash
cd apps/api-server
npx tsx src/scripts/medical-device-standard-code-candidate-import.ts \
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl" --dry-run
```

| 지표 | 값 | 선행 분석 대조 |
|---|---:|---|
| totalRows / processedRows | 20,000 / 20,000 | — |
| invalidJsonLines | 0 | — |
| identifierType: GTIN / UDI_DI / null | 19,845 / 155 / 0 | ✓ (14:19,055 + 13:790) |
| format: gtin14 / gtin13 / checkFail / hibcc / missing | 19,055 / 790 / 0 / 155 / 0 | ✓ 완전 일치 |
| createdExpected / skipped / errored | **19,996 / 4 / 0** | skipped 4 = 완전동일행(rowSignature dedup) |
| candidateNameMissing / manufacturerMissing | 0 / 6 | ✓ |
| dupConflict keyCount / rowCount | **122 / 244** | ✓ 완전 일치 |
| multiUdiPermitCount | 450 | ✓ (Gate B dry-run 과 동일) |
| STATUS_UNCHECKED | 20,000 | 상태 미조인(설계) |
| DB writes | **0** | dedupChecked=false(offline) |

createdExpected 19,996 = 20,000 − 4(완전동일 dedup). 충돌 244행은 **skip 되지 않고 별도 후보로 보존**(matchStatus=conflict).

---

## 8. DB dry-run

이번 실행에서는 `--use-db` 미수행. `--use-db --dry-run` 은 read-only SELECT(기존 후보 존재 → updatedExpected 예측)로 구현돼 있으나, 프로덕션 read 채널 확보 후 별도 실행한다. write 는 전 경로에서 0.

> 구현: `findExisting` = `SELECT ... WHERE source_type/source_label/sourceKind/sourceRowSignature 매칭 AND deleted_at IS NULL LIMIT 1`. INSERT/UPDATE 는 `--apply` + env gate(`MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND`) 에서만.

---

## 9. read-only / apply 금지 준수

| 항목 | 결과 |
|---|---|
| ProductCandidate apply | 0 (offline dry-run 만) |
| ProductMaster / ProductIdentifier 생성 | 0 |
| DB write / migration / Cloud Run Job | 0 |
| SupplierProductOffer / OrgProductListing / StoreLocalProduct | 0 |
| 대량 API 호출 | 0 (로컬 raw만) |
| raw 대용량 파일 커밋 | 0 |
| serviceKey / DB secret 기록 | 0 |
| 병렬 세션 파일(package.json 등) 흡수 | 0 (스코프 커밋, 스크립트 미등록) |

검증: 유닛테스트 12/12 PASS. tsc 이번 변경 관련 에러 0(전체 1건 = marketTrialController, 기존/무관).

---

## 10. 다음 단계

1. **Gate A Candidate apply runbook** — 본 파이프라인 apply 절차·검증 SQL·rollback·트랙 격리(`sourceKind='medical_device_standard_code'`)·승인 게이트 고정.
2. **사용자 명시 승인 후 Gate A apply** — `product_candidates` 전건 적재. ProductMaster 승격 0.
3. **Gate B apply runbook** — status map 조인(active 판정) + PROMOTABLE 19,606 기준 승격. HIBCC 155는 UDI_DI만(barcode 없음). 사용자 승인 게이트.
4. **전량 2.65M 재수집/재계산 WO** — 표본 수치 확정됐으므로 별도 진행.

**최종: 의료기기 Gate A import 파이프라인(parser/mapper/service/CLI)을 구현하고 실 raw 20,000행 offline dry-run 이 선행 분석과 완전 교차검증됐다(createdExpected 19,996, 충돌 244 보존, DB write 0). apply 는 사용자 승인 후 별도.**
