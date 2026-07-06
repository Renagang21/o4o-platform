# CHECK-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1

> 상태: DONE / DRY-RUN ONLY (DB write 0건)
> 실측일: 2026-07-06
> 실행 WO: `docs/work-orders/WO-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`
> 선행:
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-V1.md`
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1.md`
> 검증 채널: Cloud SQL Auth Proxy v2 (127.0.0.1:5433) + read-only `SELECT` (프로덕션 `o4o_platform`)

---

## 0. 결론 요약 (TL;DR)

| 판단 | 값 |
|---|---:|
| 현재 의료기기 ProductMaster | **3,826** (active 3,682 / review_required 144) |
| 의료기기 candidate 전체 (live) | **19,996** (approved_new_master 19,602 + pending 394) |
| 유지 candidate (현 master 연결) | **3,826** |
| **삭제된 master 대응 candidate 흔적 (archive 후보)** | **15,776** |
| **UDI 없는 pending (archive 후보)** | **394** |
| review_required 유지 (큐레이션 대상) | **144** |
| 이번 WO에서 실행한 write / migration | **0** |

핵심:

1. 삭제된 15,776 master의 흔적은 **dangling FK가 아니라** `candidate_status='approved_new_master'` + `matched_product_master_id IS NULL` 형태로 candidate 테이블에 그대로 남아 있다. (WO가 가정한 `matched_master_missing_now` 는 **0건**)
2. pending 394건은 "UDI-DI만 없는" 것이 아니라 **identifier 자체가 전무**하다 (`identifier_type`/`identifier_value` 전량 NULL, `raw_payload` 최상위 키는 `sourceKind` 단 하나). 따라서 최소 필드 승격 불가가 재확인된다.
3. review_required 144건은 상품 DB 문제가 아니라 **약국 유통 대상 여부 큐레이션 문제**이며, 전량 `medical_device_review_ambiguous_remains_review_required` 사유로 명시 보류된 상태다.

---

## 1. Current baseline recap (검산)

`product_masters` 기준. 필터: `regulatory_type IN ('MEDICAL_DEVICE','medical_device','의료기기') OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'`

| product_data_status | count |
|---|---:|
| active | 3,682 |
| review_required | 144 |
| **합계** | **3,826** |

identifier 완비도 (동일 필터의 master에 연결된 `product_identifiers`):

| identifier_type | count | distinct normalized |
|---|---:|---:|
| GTIN | 3,826 | 3,826 |
| UDI_DI | 3,826 | 3,826 |

→ 선행 baseline (3,826 / 3,682 / 144 / GTIN 3,826 / UDI_DI 3,826) 과 완전 일치. 신규 apply 대상 0 재확인.

---

## 2. Candidate 적재 흔적 실측 (Step 2)

`product_candidates` (deleted_at IS NULL), 의료기기 원천 필터.

### 2.1 source_label × status × match

| source_type | source_label | candidate_status | match_status | count |
|---|---|---|---|---:|
| external_api | MFDS_MEDICAL_DEVICE_STANDARD_CODE | approved_new_master | unmatched | 19,602 |
| external_api | MFDS_MEDICAL_DEVICE_STANDARD_CODE | pending | conflict | 244 |
| external_api | MFDS_MEDICAL_DEVICE_STANDARD_CODE | pending | unmatched | 150 |
| external_api | MFDS_QUASI_DRUG_PERMIT | pending | unmatched | 2 |

> `MFDS_QUASI_DRUG_PERMIT` 2건은 `raw_payload ILIKE '%MDEQ%'` 필터에 우발적으로 걸린 **의약외품** row로, 의료기기 대상이 아니다. 이하 지표에서 의료기기 candidate는 `source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'` 기준 **19,996건** (19,602 + 394) 으로 확정한다.

### 2.2 master 연결 여부 (matched/unmatched)

| link | candidate_status | match_status | count |
|---|---|---|---:|
| matched | approved_new_master | unmatched | 3,826 |
| unmatched | approved_new_master | unmatched | 15,776 |
| unmatched | pending | conflict | 244 |
| unmatched | pending | unmatched | 152 |

검산: `approved_new_master` 19,602 = matched 3,826 + unmatched 15,776. → 최초 승격 19,602 = 현 잔존 3,826 + hard delete 15,776 과 정확히 일치.

---

## 3. 삭제된 master 대응 candidate 흔적 (Step 3)

`product_candidates LEFT JOIN product_masters ON pm.id = pc.matched_product_master_id`

| presence | candidate_status | match_status | count |
|---|---|---|---:|
| matched_master_exists | approved_new_master | unmatched | 3,826 |
| no_matched_master_id | approved_new_master | unmatched | 15,776 |
| no_matched_master_id | pending | conflict | 244 |
| no_matched_master_id | pending | unmatched | 152 |

### 판단 (WO 가정 대비 보정)

- `matched_master_exists` = **3,826** → 현 master와 연결. **유지 후보.**
- `matched_master_missing_now` = **0** → dangling FK 없음. 과거 hard delete 시 `matched_product_master_id` 를 **NULL 처리**하고 삭제한 것으로 보인다.
- `no_matched_master_id` + `approved_new_master` = **15,776** → **이것이 곧 삭제된 master의 흔적**이다. WO는 이를 `matched_master_missing_now` 로 잡으려 했으나, 실제 표식은 "승격 완료(approved_new_master)인데 master 링크가 NULL" 이다. → **archive 후보 15,776.**
- `no_matched_master_id` + `pending` (244 + 152, 이 중 의료기기 394) → Step 4 pending 분석으로 이동.

---

## 4. Pending 394 분석 (Step 4)

`source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'` + `candidate_status='pending'`

### 4.1 status/match

| match_status | count |
|---|---:|
| conflict | 244 |
| unmatched | 150 |
| **합계** | **394** |

### 4.2 raw_payload 구조

394건 전량의 `raw_payload` 최상위 키는 **`sourceKind` 단 하나뿐**. UDI-DI / barcode / GTIN 등 어떤 식별자 키도 payload에 존재하지 않는다. → WO의 `raw_payload ILIKE '%UDIDI%'` 휴리스틱은 이 원천에 대해 **0건**이 되며, pending 검출은 payload가 아니라 `source_label + candidate_status` 로 해야 함이 확인됨.

### 4.3 identifier 결측

| identifier_value | identifier_type | match_status | count |
|---|---|---|---:|
| no_identifier_value | (null) | conflict | 244 |
| no_identifier_value | (null) | unmatched | 150 |

→ 394건 **전량 identifier_type / identifier_value NULL**. "UDI-DI만 없음"이 아니라 **식별자 자체가 없음** → 최소 필드(GTIN/UDI-DI 기반) 승격 원천적으로 불가.

### 4.4 conflict 244의 성격

conflict 244건에 대해 `product_identifiers` 와 normalized 값 대조:

| collision | count |
|---|---:|
| no_existing_identifier | 244 |

→ `normalized_identifier_value` 가 NULL이라 기존 identifier와의 **충돌은 없다.** 즉 conflict match_status는 identifier 충돌이 아니라 **동일 품목명+업체가 식별자 없이 다수 반복되어 상품 grain이 불명확한 "grain conflict"** 이다. (샘플 근거 아래)

### 4.5 pending 샘플 (성격)

| match | name | manufacturer |
|---|---|---|
| conflict | 풍선 확장식 관상동맥 성형술용 카테터 | 주식회사 엔벤트릭 (다수 반복) |
| conflict | 심미수복용 복합레진 | 신원덴탈(주) / 오스템임플란트(주) / (주)신흥 |

→ 관상동맥 카테터·치과 복합레진 등 **의료기관/치과/전문가용**. 약국 소비자 유통 대상 아님.

### Step 4 dry-run 판단

| 조건 | 대상 수 | dry-run 결과 |
|---|---:|---|
| identifier 전무 + master 링크 없음 | 394 | **wouldArchiveNoUdi** |
| source row는 있으나 상품 grain 불명확 | (244는 grain conflict) | wouldKeepReviewOnly 아님 — archive 후보에 포함 |
| 이미 master/identifier 존재 | 0 | 해당 없음 |

---

## 5. review_required 144 분석 (Step 5)

### 5.1 등급 분포

| medical_device_grade | count |
|---|---:|
| (null) | 144 |

→ 144건 모두 grade 미부여. (등급별 정리는 삭제된 15,776에 적용되었고, 이 144는 등급 판정 애매로 남은 잔여.)

### 5.2 curation_reason

| product_data_curation_reason | count |
|---|---:|
| medical_device_review_ambiguous_remains_review_required | 144 |

→ 144건 전량 **"의료기기 검토 애매 → review_required 유지"** 사유로 명시 보류. (선행 review_required 712 시장성 재판정 산출물의 최종 잔여와 정합.)

### 5.3 업체 분포 (상위)

| manufacturer | count |
|---|---:|
| 대한메디칼씨스템(주)커머스 | 60 |
| 한국존슨앤드존슨메디칼(주) | 30 |
| 주식회사 초이스테크코리아 | 7 |
| 지이헬스케어코리아(주) | 6 |
| 한국스트라이커(주) | 6 |
| 신원덴탈(주) | 5 |
| (기타 다수) | … |

### 5.4 품목명 샘플

체외형 범용 프로브(다수) · 유아 가온장치 · 청력 검사기 · 보행 분석계 · 개구 유지기 · 치과 인상 채득용 트레이 · 지각 과민 처치제 · 모세관 채혈 튜브 · 의약품 간접 주입 기구 …

→ 초음파 프로브·유아 가온장치·청력 검사기 등 **임상/병원/치과/전문가용 비중이 높다.** 명백한 약국 소비자 유통 품목은 소수. 다만 이번 WO에서는 판정을 확정하지 않고 **큐레이션 트랙으로 이관**한다.

### Step 5 판단

| 조건 | 처리 (후속 큐레이션) |
|---|---|
| 명백히 약국/소비자 유통 가능 | active 후보 (소수) |
| 명백히 의료기관/치과/전문가용 | delete/archive 후보 (다수 추정) |
| 애매함 | review_required 유지 |

이번 WO에서 144건은 **변경하지 않는다.**

---

## 6. Cleanup dry-run 결과표 (Step 6)

| 지표 | 값 | 설명 |
|---|---:|---|
| currentMedicalDeviceMasters | 3,826 | 현재 의료기기 ProductMaster |
| activeMasters | 3,682 | active |
| reviewRequiredMasters | 144 | review_required |
| candidateMedicalDeviceTotal | 19,996 | 의료기기 candidate 흔적 전체 (approved 19,602 + pending 394) |
| candidatesMatchedExistingMaster | 3,826 | 현 master와 연결된 candidate |
| candidatesMatchedMissingMaster | 0 | dangling FK (없음) |
| candidatesUnmatched (deleted trace) | 15,776 | approved_new_master 인데 master 링크 NULL = 삭제된 master 흔적 |
| pendingNoUdi | 394 | identifier 전무로 승격 불가 (conflict 244 + unmatched 150) |
| **wouldArchiveCandidateTrace** | **15,776** | 삭제된 master 대응 candidate archive 후보 |
| **wouldArchivePendingNoUdi** | **394** | identifier 없는 pending archive 후보 |
| wouldKeepCandidate | 3,826 | 현 master 연결 유지 후보 |
| wouldKeepReviewRequired | 144 | review_required 유지 (큐레이션 이관) |
| requiresUserDecision | 15,776 + 394 + 144 | 아래 §7 게이트 참조 |

archive 후보 합계 = **16,170** (candidate 흔적 15,776 + pending 394). 유지 candidate = 3,826. 큐레이션 이관 master = 144.

---

## 7. Apply gate (사용자 승인 필요)

이번 WO는 dry-run만 수행했다. 아래 write는 **전부 미실행**:
`UPDATE/DELETE product_candidates`, `UPDATE/DELETE product_masters`, migration 생성/실행, `product_data_status` 변경, representative link 변경.

실제 cleanup을 하려면 아래 후속 WO 승인이 필요하다.

| 후속 WO 후보 | 대상 | 규모 |
|---|---|---:|
| `WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1` | 삭제된 master 대응 candidate 흔적 archive | 15,776 |
| `WO-O4O-MEDICAL-DEVICE-PENDING-NO-UDI-ARCHIVE-APPLY-V1` | identifier 없는 pending archive | 394 |
| `WO-O4O-MEDICAL-DEVICE-REVIEW-REQUIRED-144-CURATION-V1` | 144건 약국 유통 가능성 큐레이션 | 144 |

> ⚠️ 대량 archive/delete 실행 시 주의: 1만건+ 삭제/갱신을 단일 트랜잭션 마이그레이션으로 하면 GRACEFUL_STARTUP + startup probe 4m 초과로 인스턴스 재기동/락 경합 위험. candidate 흔적 15,776 archive는 **청크(2~3천/txn count-driven) + snapshot 선커밋** 방식 필수. (drug_unspecified 53,428 삭제 인시던트 교훈)

---

## 8. 완료 기준 대조

| WO 완료 기준 | 결과 |
|---|---|
| 1. 의료기기 candidate 흔적 전체 수 확인 | ✅ 19,996 (19,602 + 394) |
| 2. 현 master 연결 / 삭제된 master 흔적 / unmatched 분리 | ✅ 3,826 / 15,776 / 394 |
| 3. pending 394 UDI-DI 결측·승격 불가 재확인 | ✅ identifier 전량 NULL, payload에 식별자 키 없음 |
| 4. review_required 144 큐레이션 문제로 분리 | ✅ 전량 ambiguous 사유, 큐레이션 이관 |
| 5. cleanup apply 판단용 dry-run count·샘플 문서화 | ✅ §6 결과표 + 샘플 |
| 6. DB write/apply/migration 0건 | ✅ read-only SELECT만 수행 |

---

## 부록 A. 실행 쿼리 및 검증 채널

- 채널: `bin/cloud-sql-proxy-v2.exe netureyoutube:asia-northeast3:o4o-platform-db --port 5433 --token <access-token>` → `psql 127.0.0.1:5433 o4o_api@o4o_platform` (read-only).
- 쿼리 원본: WO §5~§8. pending/candidate 집계는 `raw_payload::text ILIKE` 전량 스캔 대신 `source_label` + `candidate_status` 타깃 필터로 실측 (동일 결과, 저부하).
- WO 가정과 다른 실측 보정 3건은 §3(matched_master_missing_now=0), §4.2(payload에 UDIDI 신호 없음), §4.4(conflict=grain conflict, 식별자 충돌 아님) 에 기록.
