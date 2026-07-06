# CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1

> 상태: DONE (READ-ONLY DRY-RUN)
> 실행일: 2026-07-06
> WO: `docs/work-orders/WO-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-AND-MINIMAL-FIELD-DRYRUN-V1.md`
> baseline: `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-V1.md`
> DB write / migration / apply: **없음**

식약처 의료기기 최소 필드(§6) 를 현재 운영 DB O4O 상품 데이터에 적용할 수 있는지 dry-run 한 결과.

기준: **식약처 row 가 아니라 O4O 유통 상품 데이터.**

---

## 1. dry-run 소스 정의

식약처 의료기기 원천 데이터는 이미 `product_candidates` (source_label=`MFDS_MEDICAL_DEVICE_STANDARD_CODE`) 로 적재되어 있고, 그 중 19,602건이 과거 ProductMaster 로 승격된 상태다. 따라서 dry-run 은 "새 원천 fetch" 가 아니라 **현재 DB 에 남은 원천 candidate 대비 잔존 master 상태** 를 기준으로 계산한다.

| 소스 집합 | 건수 |
|---|---:|
| MFDS 의료기기 candidate (approved_new_master, 승격됨) | 19,602 |
| MFDS 의료기기 candidate (pending, 미적용) | 394 |
| **sourceRowsChecked (합계)** | **19,996** |

---

## 2. §6 최소 필드 매핑 정의 (적용/제외)

| 식약처 필드 | O4O 후보 | 적용 |
|---|---|---|
| `UDIDI_CD` | `ProductIdentifier.identifierType='UDI_DI'` | ✅ 기본 후보 |
| `UDIDI_CD` (숫자14 + GTIN valid) | `ProductMaster.barcode` | ✅ barcode 후보 |
| `PRDT_NM_INFO` | `ProductMaster.name` | ✅ |
| `PRDLST_NM` | `ProductMaster.regulatoryName` / name fallback | ✅ |
| `FOML_INFO` | `ProductMaster.specification` | ✅ |
| `MNFT_IPRT_ENTP_NM` | `ProductMaster.manufacturerName` | ✅ |
| `PERMIT_NO` / `PRMSN_YMD` / 허가·품목상태 / `MDEQ_CLSF_NO` / `CLSF_NO_GRAD_CD` / `USE_PURPS_CONT` / `STRG_CND_INFO` / raw 원문 | — | ❌ 제외 |

---

## 3. dry-run 결과 지표 (WO §7)

| 지표 | 값 | 근거 |
|---|---:|---|
| sourceRowsChecked | 19,996 | approved 19,602 + pending 394 |
| existingMedicalDeviceMasters | 3,826 | 현재 잔존 (baseline A.2) |
| wouldMatchExistingByUDI | 3,826 | 잔존 master 는 이미 UDI_DI 100% 보유·매칭 상태 |
| wouldCreateProductMaster | **0** | 아래 §4 참조 |
| wouldCreateUDIIdentifier | **0** | 잔존 master 는 UDI_DI 이미 100% 보유 |
| wouldSetBarcode | 0 | 잔존 master barcode 이미 100% 완비·valid |
| skipNonGtinBarcode | 150 | pending unmatched — UDI-DI 자체가 없음(비숫자·빈값) |
| skipMissingName | 0 | pending 394건 모두 candidate_name 보유 |
| skipMissingManufacturer | 6 | pending unmatched 150 중 144만 제조사 보유 → 6건 결측 |
| skipDuplicateUDI | 0 | UDI-DI 중복 0 (baseline A.5) |
| skipExistingConflict | 244 | pending conflict — 식별자값 없이 이름 기반 충돌 표기 |
| reviewRequired | 144 | 현재 master review_required (분류 모호 잔존) |

### 미적용 pending 394건 상세

| match_status | count | candidate_name | manufacturer | UDI-DI 값 | identifier_type |
|---|---:|---|---|---|---|
| conflict | 244 | 244 보유 | 244 보유 | **전량 없음** | 없음(빈값) |
| unmatched | 150 | 150 보유 | 144 보유 | **전량 없음** (비숫자/빈값 150) | 없음(빈값) |

- pending 394건은 **UDI-DI 식별자 값이 전혀 없다** (normalized_identifier_value 빈값, identifier_type 미지정).
- §6 최소 필드 매핑의 1차 키는 UDI-DI 인데 그 값이 없으므로 **안전한 상품 grain 확정 불가** → 전량 apply 보류.

---

## 4. 차단 조건 판정 (WO §7)

| 차단 조건 | 판정 | 설명 |
|---|---|---|
| 같은 UDI-DI 가 여러 ProductMaster 에 연결 | 해당 없음 | UDI-DI 중복 0 |
| 비숫자/HIBCC UDI-DI 를 barcode 로 넣으려는 경우 | **차단 발동** | pending 394건은 UDI-DI 값 자체가 없음 → barcode 적용 불가 |
| 제품명/모델명/업체명 결측 과다 | 부분 (6건) | pending unmatched 6건 제조사 결측 |
| 원천 row grain 이 상품/포장 단위로 설명 안 됨 | **차단 발동** | pending 394건 식별자 부재로 grain 확정 불가 |
| wouldCreate 수가 예상 범위 크게 초과 | 해당 없음 | wouldCreate 0 |

---

## 5. 결론

1. **현재 잔존 의료기기 3,826건은 최소 필드(name/regulatoryName/manufacturer/specification/barcode) + 식별자(UDI_DI/GTIN) + barcode check-digit 이 이미 100% 완비.** → 신규 백필/생성 대상 0.
2. **미적용 pending 394건은 UDI-DI 식별자 값이 없어** §6 최소 필드 매핑으로 적용 불가 → 전량 skip/reviewRequired.
3. 따라서 **현 시점에서 실행할 minimal-field apply 는 없음** (wouldCreate 0, wouldMatch 는 이미 반영됨).
4. 남은 실제 액션 후보는 "적용" 이 아니라 **정리(cleanup)** 성격:
   - candidate 적재 흔적 정리: approved_new_master 19,602 중 master 삭제된 15,776건에 대응하는 candidate row 잔존 (soft-delete/status 정정 여부는 **별도 승인 대상**).
   - pending 394건: 식별자 없는 원천 → import 대상에서 제외 유지 또는 삭제 표기 (**별도 승인 대상**).
   - review_required 144건: 분류 모호 잔존 → 사업 판단 후 유지/삭제 (**별도 승인 대상**).

> 위 3개 정리 항목은 모두 **DB write** 이므로 WO §8 원칙에 따라 **사용자 승인 전 실행 금지.** 본 dry-run 은 read-only 로만 종료.
