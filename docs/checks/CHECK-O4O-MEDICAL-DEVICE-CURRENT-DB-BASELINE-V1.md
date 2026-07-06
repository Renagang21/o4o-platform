# CHECK-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-V1

> 상태: DONE (READ-ONLY)
> 실행일: 2026-07-06
> WO: `docs/work-orders/WO-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-AND-MINIMAL-FIELD-DRYRUN-V1.md`
> 실행 방식: 운영 DB(`o4o_platform`) read-only SELECT (cloud-sql-proxy)
> DB write / migration / apply: **없음**

이 문서는 두 부분으로 구성된다.

- **Part A — Current DB Baseline** (WO Step 1~2): 운영 DB read-only 실측
- **Part B — Minimal-Field Dry-run** (WO Step 3, §7): 식약처 최소 필드 적용 dry-run 결과
  - Part B 는 자매 문서 `CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1.md` 에 상세 기록. 본 문서는 요약 참조.

---

## Part A — Current DB Baseline (Read-only)

### A.0 스키마 주의 (WO 4.1 대비 실제 스키마 차이)

| 항목 | WO 가정 | 실제 스키마 | 조치 |
|---|---|---|---|
| `product_masters.deleted_at` | soft-delete 컬럼 존재 가정 | **컬럼 없음** | `product_masters` 는 `product_data_status` 로 상태 관리. WO 의 `deleted_at IS NULL` predicate 는 `product_masters` 에서 제거하고 실행 |
| `product_masters.medical_device_grade` | 존재 | 존재하나 의료기기 3,826건 **전량 NULL** (과거 등급 정리 후 잔존분엔 미기록) | baseline 참고만 |
| `product_masters.product_data_status` | 존재 확인 필요 | 존재 (`active` / `review_required`) | 상태 분리에 사용 |
| `product_masters.product_data_curation_reason` | 존재 확인 필요 | 존재 | review 사유 확인에 사용 |
| `product_master_cleanup_audits` | 삭제 이력 테이블 | **존재** (hard_delete 이력 보유) | 삭제 이력 근거로 사용 |
| `product_identifiers.deleted_at` / `product_candidates.deleted_at` | 존재 | **존재** | 정상 적용 |

의료기기 필터는 아래로 고정한다(한글 리터럴 `의료기기` 는 Windows psql client 인코딩 문제 + 실제 데이터에 없음 → 제외):

```
regulatory_type IN ('MEDICAL_DEVICE','medical_device')
OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
```

교차 확인 결과 의료기기 3,826건은 **전량** `regulatory_type='MEDICAL_DEVICE'` **이며 동시에** `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'` (두 조건 완전 일치).

### A.1 ProductMaster 전체 regulatory_type 분포

| regulatory_type | count |
|---|---:|
| DRUG | 177,413 |
| **MEDICAL_DEVICE** | **3,826** |
| GENERAL | 2 |

### A.2 현재 잔존 의료기기 ProductMaster

- **의료기기 ProductMaster 총계: 3,826건**

product_data_status 분포:

| product_data_status | count |
|---|---:|
| active | 3,682 |
| review_required | 144 |

- review_required 144건 사유: 전량 `medical_device_review_ambiguous_remains_review_required` (소비자/전문가 분류 모호 잔존분).
- `medical_device_grade`: 3,826건 전량 NULL.

### A.3 의료기기 최소 필드 완전성 (현재 잔존 3,826건)

| 필드 | 채워진 건수 | 비율 |
|---|---:|---:|
| name | 3,826 | 100% |
| regulatory_name | 3,826 | 100% |
| manufacturer_name | 3,826 | 100% |
| specification | 3,826 | 100% |
| barcode | 3,826 | 100% |

→ 현재 잔존 의료기기는 **최소 상품 필드가 이미 100% 채워져 있음.** 결측 백필 대상 0건.

sample (5건, 공개 MFDS 정보):

| name | manufacturer | barcode | spec |
|---|---|---|---|
| 멸균 주사침 | 주식회사 동우엠테크노 | 08800198227485 | SMB29 |
| 멸균침 | (주)동방메디컬 | 38800018936260 | B4ES20-4020 |
| 일회용 채혈침 | 벡톤디킨슨코리아(주) | 16949236215370 | 360222 |
| 기도형 보청기 | 더블유에스오디올로지코리아 유한 | 05714880268522 | ALLURE ABRD1 3 |
| 의약품 직접 주입 기구 | (주)세이프락메디칼글로벌 | 08800245053043 | S403 150CM |

### A.4 ProductIdentifier 분포 (현재 잔존 의료기기)

| identifier_type | count | distinct_masters |
|---|---:|---:|
| GTIN | 3,826 | 3,826 |
| UDI_DI | 3,826 | 3,826 |

- 의료기기 master 중 identifier 0건인 것: **0건** (전량 GTIN + UDI_DI 보유).

### A.5 UDI-DI 중복 (dry-run 차단 조건)

- `identifier_type='UDI_DI'` 중 **여러 ProductMaster 에 연결된 normalized_value: 0건.**
- → UDI-DI 중복 차단 조건 **해당 없음 (clean).**

### A.6 barcode 유효성

| barcode_shape | count |
|---|---:|
| numeric_14 | 3,332 |
| numeric_13 | 494 |
| missing / non-numeric | 0 |

- `barcode_source`: 3,826건 전량 `GTIN`.
- **GTIN-14 check-digit**: numeric_14 3,332건 **전량 valid (100%)**.
- **EAN-13 check-digit**: numeric_13 494건 **전량 valid (100%)**.
- → 의료기기 barcode 3,826건 **전량 check-digit valid.** (13자리 494건은 GTIN-14 로 zero-pad 되지 않은 EAN-13 형태 — 유효하나 자리수만 13.)

### A.7 ProductCandidate 의료기기 흔적

전체 비삭제 candidate source_type 분포:

| source_type | count |
|---|---:|
| csv_import | 305,522 |
| external_api | 88,967 |
| operator_import | 2 |

의료기기 관련 candidate (`source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'`):

| candidate_status | match_status | count |
|---|---|---:|
| approved_new_master | unmatched | 19,602 |
| pending | conflict | 244 |
| pending | unmatched | 150 |

- **approved_new_master 19,602** = 과거 최초 승격 전량 흔적. 이후 15,776건 master 가 hard_delete 되었으나 **candidate row 는 삭제되지 않고 잔존** (적재 흔적). 후속 정리 필요 여부 판단 대상.
- **pending 394건** (conflict 244 + unmatched 150) = 미적용 잔여. → Part B 에서 적용 가능성 분석.

### A.8 RepresentativeProduct 연결

| representative_link | count |
|---|---:|
| unlinked | 3,826 |
| linked | 0 |

- 의료기기 master 중 대표상품 연결 건: **0건.** → WO 원칙(의료기기는 대표상품 미사용) 과 현재 상태 일치. 정정 대상 없음.

---

## Part A / Step 2 — 삭제·정리 이력 vs 현재 잔존 분리

`product_master_cleanup_audits` 기준 hard_delete 이력:

| cleanup_key | action | count |
|---|---|---:|
| medical_device_grade2_category_based_hard_delete_20260705 | hard_delete | 12,125 |
| medical_device_grade3_name_based_hard_delete_20260705 | hard_delete | 1,664 |
| medical_device_grade1_category_based_hard_delete_20260705 | hard_delete | 1,221 |
| medical_device_grade4_hard_delete_20261204 | hard_delete | 755 |
| medical_device_review_required_resolved_hard_delete_20260705 | hard_delete | 11 |
| **의료기기 hard_delete 합계** | | **15,776** |

(참고: DRUG hard_delete 53,428건은 별도 트랙.)

### 정합성 확인 (핵심)

```
과거 최초 승격 (candidate approved_new_master) : 19,602
현재 잔존 의료기기 ProductMaster              :  3,826
hard_delete 이력 합계                          : 15,776
검산: 3,826 + 15,776 = 19,602  ✅ 완전 일치
```

- WO 가 언급한 과거 문서 수치(19,602 / 3,837 / 712)와 대조:
  - **19,602** = 최초 승격 전량 = candidate approved_new_master. **일치.**
  - **3,837** ≈ 현재 잔존 3,826 (11건 차 — `medical_device_review_required_resolved_hard_delete` 11건 삭제로 설명됨). **정합.**
  - **712** = 과거 review-required market-evidence 트랙 수치. 현재 review_required 는 144건으로 축소됨(대부분 resolved/삭제 반영).
- **삭제된 15,776건은 약국 비유통 대상(의료기관/치과/전문가용 등 등급 기반 정리)** — WO 원칙대로 **되살리지 않음.**

| 구분 | 값 |
|---|---:|
| 과거 삭제 완료 (audit 근거) | 15,776 |
| 현재 잔존 의료기기 ProductMaster | 3,826 |
| 현재 active | 3,682 |
| 현재 review_required | 144 |
| candidate 적재 흔적 (approved, master 삭제됨 포함) | 19,602 |
| candidate 미적용 pending | 394 |
| UDI-DI 중복 | 0 |
| RepresentativeProduct 연결 | 0 |

---

## Part B 요약 (상세: MINIMAL-FIELD-DRYRUN-V1)

- 현재 잔존 3,826건은 최소 필드·식별자·barcode 가 **이미 100% 완비** → 신규 백필 대상 0.
- 미적용 pending 394건은 **UDI-DI 식별자 값이 전혀 없음** → 최소 필드(UDI 기반) 매핑으로 적용 불가 → 전량 skip/reviewRequired.
- 결론: **현 시점 신규 minimal-field apply 는 불필요/불가.** wouldCreate 실질 0.

---

## 완료 기준 대비 (WO §10)

| 완료 기준 | 상태 |
|---|---|
| 1. 현재 운영 DB 의료기기 baseline read-only 문서화 | ✅ |
| 2. 과거 삭제/정리 이력과 현재 잔존 분리 | ✅ (검산 일치) |
| 3. 식약처 최소 필드 dry-run 생성/매칭/skip/review 정리 | ✅ (Part B) |
| 4. 사용자 승인 전 DB write 없음 | ✅ (write 0) |
| 5. 다음 apply 판단 수치·차단 조건 명확화 | ✅ |
