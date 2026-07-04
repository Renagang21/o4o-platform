# WO-O4O-QUASI-DRUG-PUBLIC-RAW-REMAINDER-FETCH-AND-FULL-DRYRUN-V1

> 작업 성격: 잔여 raw 보강(라이브 API read-only fetch) + **전량 22,953 기준 Gate A dry-run 재산출.** DB write 0, apply 0, migration 0, Cloud Run Job 0, 프로덕션 코드 변경 0.
> 작성일: 2026-07-04
> 선행: `WO-O4O-QUASI-DRUG-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1`, `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1`, `CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1`
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품 확장 금지. 병렬 세션 파일 무수정.

---

## 0. 목적

기존 20,000 표본에 잔여를 보강해 **원천 전량 기준**으로 Gate A 지표를 닫는다. mapper 구현/서비스/apply는 하지 않는다(다음 WO).

---

## 1. 라이브 fetch 결과

### 1.1 접근/키

| 항목 | 값 |
|---|---|
| endpoint | `https://apis.data.go.kr/1471000/QdrgPrdtPrmsnInfoService03/getQdrgPrdtPrmsnInfoInq03` |
| 인증키 | repo 밖 canonical env `G:\내 드라이브\자료실\public-data-api-samples\.env.public-data` 의 `PUBLIC_DATA_SERVICE_KEY`(64자 클린 키) — **셸/프로세스 env 변수로만 사용, 출력·기록·커밋 0** |
| HTTP | 200, `resultCode=00`, `NORMAL SERVICE.` |
| **totalCount (2026-07-04)** | **22,953** (2026-07-02 수집 시점 22,949 → 원천 +4 증가) |

### 1.2 수집 범위

| 항목 | 값 |
|---|---:|
| 기존 raw (2026-07-02) | 20,000 (pageNo 1..200, 100/page) |
| 이번 보강 | pageNo 201..230, numOfRows=100 |
| 보강 수집 | **2,953** (201..229 각 100 + 230쪽 53) |
| 실패 page | 0 |

응답 구조는 표준 `body.items.item[]` (건강기능식품의 `body.items[].item` 이중 래핑과 다름). wrapper 포맷은 기존과 동일하게 `{sourceDataset, fetchedAt, pageNo, rowIndex, item}` 로 저장.

### 1.3 raw 파일 (repo 밖 Google Drive, commit 금지)

| 파일 | 크기 | 레코드 | 성격 |
|---|---:|---:|---|
| `mfds-quasi-drug-permit-raw.jsonl` | 53.72 MB | 20,000 | 기존(보존, 무수정) |
| `mfds-quasi-drug-permit-raw.remainder.jsonl` | 8.12 MB | 2,953 | 이번 보강분 |
| **`mfds-quasi-drug-permit-raw-full.jsonl`** | **61.84 MB** | **22,953** | 병합 전량(dedup union) |

기존 파일은 손대지 않고, 보강분·병합 전량을 신규 파일로 생성했다(비파괴·되돌리기 가능).

---

## 2. 병합 무결성 검증

| 지표 | 값 |
|---|---:|
| 기존 parse 오류 / noItem | 0 / 0 |
| 보강 parse 오류 / noItem / blankSeq | 0 / 0 / 0 |
| 보강 내부 ITEM_SEQ 중복 | 0 |
| **보강 ↔ 기존 ITEM_SEQ 중복(경계 이동)** | **0** |
| 보강 신규 unique ITEM_SEQ | 2,953 |
| **병합 전량 lines** | **22,953** |
| **병합 distinct ITEM_SEQ** | **22,953 (= totalCount, 완전 유일)** |

원천이 +4 증가했음에도 pageNo 201 시작점에서 **경계 중복 0** — 신규 품목이 정렬 끝에 append되어 pagination이 안정적임을 확인. **ITEM_SEQ는 전량에서도 1행=1코드로 완전 유일**하다(표본 20,000 유일성이 전량에서 재확인됨).

---

## 3. 전량 Gate A dry-run (offline, 22,953)

| 지표 | 20,000 표본 | **전량 22,953** |
|---|---:|---:|
| parse OK / error | 20,000 / 0 | 22,953 / **0** |
| `.item` 결측 | 0 | **0** |
| **created (예측 적재)** | 20,000 | **22,953** |
| skipped_dup | 0 | **0** |
| skipped_no_identifier | 0 | **0** |
| errored | 0 | **0** |
| ITEM_SEQ 중복 row | 0 | **0** |
| **ProductMaster 승격 대상** | 0 | **0 (Gate A 전용 유지)** |

### 3.1 상태 분포 (전량)

| CANCEL_CODE_NAME | 20,000 | 전량 22,953 | 비율(전량) |
|---|---:|---:|---:|
| 정상 | 15,260 | **18,070** | 78.73% |
| 폐업 | 2,380 | 2,456 | 10.70% |
| 행정(취소) | 1,398 | 1,433 | 6.24% |
| 취하 | 958 | 990 | 4.31% |
| 취소 | 4 | 4 | 0.02% |
| active/cancelled | 15,260 / 4,740 | **18,070 / 4,883** | |

보강분 2,953건은 정상 +2,810 / 비정상 +143 (합 2,953, 정합). 후반 페이지에 정상 비율이 높아 전량 정상 비율이 76.30%→78.73%로 상승.

### 3.2 필수 필드 결측 (전량)

| 필드 | 결측 |
|---|---:|
| ITEM_SEQ / ITEM_NAME / ENTP_NAME / CLASS_NO_NAME | **0 / 0 / 0 / 0** |

전량 22,953건 필수 4필드 결측 0 → Gate A 격리(skip) 대상 0.

### 3.3 reviewFlag (전량)

| flag | 건수 |
|---|---:|
| `SKU_IDENTIFIER_MISSING` | 22,953 (전건) |
| `XML_PARSE_REQUIRED` | 22,952 |
| `CDATA_PRESENT` | 22,928 |
| `NOTIFICATION_ITEM` (신고) | 8,666 |
| `NOT_ACTIVE_PERMIT` | 4,883 |
| `CANDIDATE_NAME_OVERLENGTH` | **283** (§4) |
| `OFFICIAL_TEXT_MISSING` | 1 |
| ITEM_SEQ/ITEM_NAME/MANUFACTURER/CATEGORY_MISSING | 0 |

---

## 4. candidate_name 길이 (전량 재산출)

| 필드 → 컬럼 | 컬럼 한도 | 실측 max | 초과 건수 |
|---|---:|---:|---:|
| ITEM_SEQ → identifier_value | 128 | 9 | 0 |
| **ITEM_NAME → candidate_name** | **255** | **1,840** | **283** (20k: 260 → 전량: 283) |
| ENTP_NAME → candidate_manufacturer | 255 | 25 | 0 |
| CLASS_NO_NAME → candidate_category | 255 | 65 | 0 |

**apply 선결 규칙 유지·확정:** `candidate_name` 255자 truncate + `CANDIDATE_NAME_OVERLENGTH` flag. 전체 원문은 `raw_payload.source.ITEM_NAME` 보존(손실 0). 전량 기준 **283건** 처리 필요. 이 규칙 없이 apply 시 283건 insert 에러.

---

## 5. Gate A 예상 적재 요약 (전량 확정)

| 항목 | 값 |
|---|---:|
| 신규 Candidate created (truncate 규칙 적용) | **22,953** |
| skipped (중복/식별자 결측) | 0 |
| errored | 0 |
| candidate_name truncate 대상 | 283 |
| ProductMaster / ProductIdentifier 생성 | **0** |

dedup key(전량 유지): `external_api :: MFDS_CODE :: normalized(ITEM_SEQ) :: quasi_drug_permit`. apply는 `product_candidates` INSERT only, 재실행 안전(idempotent).

---

## 6. read-only / 보안 준수 확인

| 항목 | 결과 |
|---|---|
| serviceKey 원문 출력/기록/커밋 | **0** (env 변수로만, 사용 후 해제) |
| URL(키 포함) 로그 | **0** |
| DB write / apply | 0 |
| ProductMaster/ProductIdentifier 생성 | 0 |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (raw는 repo 밖 G: 드라이브) |
| 기존 raw 파일 파괴적 수정 | 0 (보강분·병합본은 신규 파일) |
| 프로덕션 코드 변경 | 0 (분석/fetch 스크립트는 scratchpad) |
| 범위 확장(의료기기/건기식) | 0 |
| 병렬 세션 파일 수정 | 0 |

라이브 API fetch는 read-only 공공데이터 GET(2,953건, 정중한 지연 포함)뿐이다. 이번 변경은 문서 1건(본 WO) 추가.

---

## 7. 다음 단계 (의약외품 트랙, 순서)

전량 dry-run 지표가 닫혔다. 이제 구현 단계로 넘어갈 수 있다.

1. **mapper/서비스 구현 WO** — 본 설계(선행 WO §1~2)를 프로덕션 코드로. `candidate_name` truncate(255) + `CANDIDATE_NAME_OVERLENGTH` flag + `.item` 언랩 + offline dry-run 테스트. 선례=`drug-candidate-import.service.ts`.
2. **Gate A Candidate apply** — 사용자 승인 + 백업 확인 후 `product_candidates` only INSERT(청크 500). 대상 22,953. ProductMaster/Identifier/DrugExtension/Image 금지.
3. **XML 공식 설명 파서 WO** — EE/UD/NB `<DOC>`+CDATA(99.9%)+HTML엔티티 파싱.
4. **SKU/barcode 원천 audit WO** → Gate B(ProductMaster 승격) 재판정.

**최종: 의약외품 원천 전량 22,953건 보강 완료. ITEM_SEQ 완전 유일(경계 중복 0), 필수 필드 결측 0, Gate A 예상 created 22,953 / skipped 0 / errored 0(truncate 규칙 적용). 유일 apply 선결 조건은 candidate_name 255자 truncation(283건, 원문 보존). ProductMaster 승격은 SKU/barcode 부재로 Gate A 범위 밖(0건) 유지.**
