# CHECK-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-UNMATCHED-FULL-AUDIT-AND-DISPOSITION-DRYRUN-V1

> WO: `WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-UNMATCHED-FULL-AUDIT-AND-DISPOSITION-DRYRUN-V1`
> 성격: **read-only 조사 (Dry-run)** — DB write 0 / migration 0 / code change 0 / deploy 0
> 조사일: 2026-07-10
> 대상: 운영 DB `o4o_platform` · `product_candidates` (deleted_at IS NULL, 전량 394,491건)
> 접속: cloud-sql-proxy → psql (o4o_api, read-only SELECT/COUNT only)

---

## 0. 한 줄 결론

`admin/o4o-product-db/candidates` 에 보이는 **`unmatched` 146,258건 중 실제 미처리(업무 대상)는 126,654건**뿐이며, 나머지 **19,604건은 이미 종료(등록완료 3,826 / archived 15,778)된 후보에 `match_status` 만 낡은 값으로 남은 것**이다. `unmatched` 는 실패가 아니라 "기존 ProductMaster 와 아직 연결 안 됨" 이라는 **기술 신호**이며, 실제 미처리 후보 **126,897건은 거의 전부 신규 ProductMaster 등록 대상**(기존 상품 매칭 가능 0건)이다.

---

## 1. 전체 Census (SQL 근거)

### 1.1 상태 분포 (deleted_at IS NULL, live=394,491 / soft_deleted=0)

**match_status**
| match_status | 수량 |
|---|--:|
| exact_identifier_match | 247,989 |
| **unmatched** | **146,258** |
| conflict | 244 |
| (no_match / possible_* / manually_matched) | 0 |

**candidate_status**
| candidate_status | 수량 | 성격 |
|---|--:|---|
| approved_new_master | 250,815 | 종료 (Master 승격 완료) |
| **pending** | **126,897** | **실제 미처리 (업무 큐)** |
| archived | 15,779 | 종료 (이력 보존) |
| matched | 1,000 | 종료 (기존 Master 연결) |
| (reviewing / linked / rejected / merged) | 0 | 미사용 |

### 1.2 candidate_status × match_status 매트릭스 (핵심)

| candidate_status | match_status | 수량 | 판정 |
|---|---|--:|---|
| approved_new_master | exact_identifier_match | 246,989 | 종료 |
| approved_new_master | unmatched | **3,826** | 종료(의료기기 승격) — match_status 낡음 |
| archived | unmatched | **15,778** | 종료(이력) — match_status 낡음 |
| archived | conflict | 1 | 종료(이력) |
| matched | exact_identifier_match | 1,000 | 종료 |
| **pending** | **unmatched** | **126,654** | **실제 미처리** |
| **pending** | **conflict** | **243** | **실제 미처리(의료기기 grain)** |

> **`unmatched` 146,258 = 실제 미처리 126,654 + 종료·이력 19,604 (archived 15,778 + approved 3,826).**
> 즉 화면의 `unmatched` 뱃지 중 **13.4% 는 업무 대상이 아니다.**

### 1.3 source_label 분포 + 식별자 보유율

| source_label | 원천 | 전체 | 식별자(idval/norm) | 이름 | 제조사 | identifier_type |
|---|---|--:|--:|--:|--:|---|
| mfds-drug-master-standard-code_2025-10-31 | 의약품 | 305,522 | 100% | 100% | 100% | KOREA_DRUG_CODE |
| MFDS_HEALTH_FUNCTIONAL_FOOD | 건기식 | 41,261 | 100% | 100% | 100% | MFDS_STTEMNT_NO |
| MFDS_QUASI_DRUG_PERMIT | 의약외품 | 22,953 | 100% | 100% | 100% | MFDS_CODE |
| MFDS_MEDICAL_DEVICE_STANDARD_CODE | 의료기기 | 19,996 | **0%** | 100% | 99.97% | (없음) |
| MFDS_EASY_DRUG_INFO | e약은요(의약품 정보) | 4,757 | 100% | 100% | 100% | MFDS_CODE |
| phase5-smoke / phase6-smoke | 테스트 | 2 | 0% | 100% | 0% | (없음) |

---

## 2. source별 상태 분포

| source_label | approved_new_master | matched | archived | **pending** |
|---|--:|--:|--:|--:|
| 의약품 (drug) | 229,841 | 1,000 | 0 | **74,681** |
| 의약외품 (quasi) | 17,148 | 0 | 0 | **5,805** |
| 의료기기 (medical device) | 3,826 | 0 | 15,777 | **393** |
| 건기식 (HFF) | 0 | 0 | 0 | **41,261** |
| e약은요 (easy drug info) | 0 | 0 | 0 | **4,757** |
| smoke | 0 | 0 | 2 | 0 |
| **합계** | **250,815** | **1,000** | **15,779** | **126,897** |

---

## 3. 종료·이력 후보 분리 (§5.2) + 비정상 조합

### 3.1 종료 상태 수량 (업무 큐에서 분리 대상)
- **종료·처리완료 총 267,594건** = approved_new_master 250,815 + archived 15,779 + matched 1,000
- rejected / merged / linked: **0건** (해당 상태 미사용)

### 3.2 비정상/주의 조합
| 조합 | 수량 | 해석 |
|---|--:|---|
| approved_new_master AND matched_product_master_id IS NULL | **53,209** | 승격은 완료(Master 생성)됐으나 후보→Master **back-link 미기록**. 배치 승격 스크립트가 candidate 를 역참조하지 않은 데이터 품질 흔적. **업무 대상 아님(이미 종료)** |
| matched AND matched_product_master_id IS NULL | 219 | matched 표기이나 링크 없음 (1,000 중 219). 소규모 이상치 |
| archived/rejected/merged AND match_status∈(unmatched,conflict) | **15,779** | 종료 후보에 match_status 만 낡게 보존됨 (§1.2). **재매칭 금지** |

### 3.3 과거 삭제 ProductMaster 흔적 (§Q4)
- **dangling matched_product_master_id (존재하지 않는 Master 참조) = 0건.**
- FK `onDelete: SET NULL` 구조상 Master 삭제 시 링크가 NULL 로 끊기므로 별도 "삭제 흔적" 후보는 검출되지 않음.
- 의료기기 archived 15,777건은 삭제 흔적이 아니라 **의도적 trace-archive**(WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE) 결과 → `HISTORICAL_ARCHIVE`.

---

## 4. 기존 ProductMaster 매칭 가능성 Dry-run (§5.3)

대상: `candidate_status='pending'` (실제 미처리). 기준: `product_identifiers(type+normalized_value)` 정확일치 + `product_masters.barcode` 일치.

| source_label | pending | product_identifiers 매칭 | barcode 매칭 | 결론 |
|---|--:|---|---|---|
| 의약품 | 74,681 | no_existing_master 74,681 | 0 | 기존 Master 없음 → 신규 |
| 의약외품 | 5,805 | no_existing_master 5,805 | 0 | 기존 Master 없음 → 신규 |
| 건기식 | 41,261 | no_existing_master 41,261 | 0 | 기존 Master 없음 → 신규 |
| e약은요 | 4,757 | **multi_master (ambiguous)** | 0 | 복수 Master 매칭 → 제품 아님(정보) |
| 의료기기 | 393 | (식별자 없음) | (식별자 없음) | 이름 기반 grain conflict |

> **기존 ProductMaster 에 정확히 1:1 로 연결 가능한 pending 후보 = 0건.**
> pending 후보의 식별자(KOREA_DRUG_CODE / STTEMNT_NO / MFDS_CODE)는 아직 어떤 Master 의 identifier 로도 등재되지 않았다(= 미승격 잔여분). → `MATCH_EXISTING_MASTER` 대상 없음, `CREATE_NEW_MASTER` 대상.

**grain/중복 검사 (신규 등록 적합성):**
| source | pending rows | distinct 식별자/키 | 판정 |
|---|--:|--:|---|
| 의약품 | 74,681 | 74,681 (KOREA_DRUG_CODE) | 1:1 clean |
| 의약외품 | 5,805 | 5,805 (MFDS_CODE) | 1:1 clean |
| 건기식 | 41,261 | 41,261 (STTEMNT_NO) | 1:1 clean |
| 의료기기 | 393 | **21 (name+mfr)** | **약 18.7:1 중복 → 정규화 필요** |

---

## 5. `conflict` 실제 원인 (§5.5)

- conflict 244건 = **전량 의료기기**(pending 243 + archived 1), **식별자 값 0%**.
- 원인: 의료기기 import 의 `annotateCrossRow()` 가 **같은 UDI-DI 를 다른 제품 시그니처가 공유(`UDI_DI_DUP_CONFLICT`)** 할 때 `match_status='conflict'` 로 표기 ([medical-device-standard-code-candidate-import.service.ts:214-217](../../apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-candidate-import.service.ts#L214-L217)).
- 실제로는 "동일 ProductMaster 2개 충돌" 이 아니라 **원천 데이터가 제품 1건을 여러 행(모델/규격)으로 적재해 생긴 grain conflict**.
- 샘플 10건: 전부 동일 `심미수복용 복합레진 / 신원덴탈(주)` (치과 복합레진) — 393행이 21개 실제 제품에 대응.

> `conflict` 라는 상태값은 "식별자 없는 반복 행 grain 충돌" 이며, 매칭 로직상의 복수-Master 충돌(`outcomeFromIdentifierHits` distinctMasters>1)과는 다른 종류다.

---

## 6. 최종 처리 분류 (실제 미처리 126,897건 → 6분류 Dry-run 귀속)

| 분류 | 수량 | 원천 | 근거 |
|---|--:|---|---|
| **1. MATCH_EXISTING_MASTER** | **0** | — | pending 중 기존 Master 1:1 매칭 0건 (§4) |
| **2. CREATE_NEW_MASTER** | **121,747** | 의약품 74,681 + 의약외품 5,805 + 건기식 41,261 | 기존 Master 없음·식별자 100%·1:1 grain |
| **3. NORMALIZE_THEN_CREATE** | **393** | 의료기기 393 (→21 제품) | 식별자 없음·grain 중복(18.7:1)·UDI 정규화/dedup 선행 |
| **4. MANUAL_REVIEW** | **0** | (의료기기 conflict 243은 3에 포함) | 자동 판단 불가 후보 없음 — grain 규칙으로 처리 가능 |
| **5. EXCLUDE_FROM_O4O** | **4,757** | e약은요 | 제품 아님 = 의약품 복약정보 원문(description grounding). 복수 Master ambiguous 매칭이 이를 뒷받침. 코드상 용도=easy-drug-shared-description-derive |
| **6. HISTORICAL_ARCHIVE** | **0** (pending 내) | — | 이력 후보(archived 15,779)는 이미 종료 상태이므로 pending 밖 |
| **합계** | **126,897** | | |

**pending 밖 종료·이력 후보의 분류(참고):**
- `HISTORICAL_ARCHIVE`: archived 15,779 (의료기기 trace 15,777 + smoke 2) → 재매칭·재등록 금지, 이력 조회만.
- 종료(승격완료): approved_new_master 250,815 + matched 1,000 → 업무 큐에서 제외.

### 6.1 CREATE_NEW_MASTER 세부 — 파이프라인 준비도
| 원천 | 수량 | 현재 승격 게이트 | 필요 후속 |
|---|--:|---|---|
| 의약품 | 74,681 | **통과**(`evaluatePromotable` = `mfds-drug-master-standard-code` 만 허용) | 기존 drug 승격 파이프라인으로 신규 Master 생성 가능 |
| 의약외품 | 5,805 | **차단**(NOT_DRUG_SOURCE) | 공통 승격 설계(바코드 없어도 O4O 내부코드) 후속 필요 |
| 건기식 | 41,261 | **차단**(NOT_DRUG_SOURCE) | 상동 |

> ⚠️ 코드 근거([product-candidate.service.ts:557-572](../../apps/api-server/src/modules/neture/services/product-candidate.service.ts#L557-L572)): 현재 `promoteMasterFromCandidate` / `approveAsNewProductMaster` 는 **regulatoryType='DRUG' 하드코딩·KOREA_DRUG_CODE 전용**. 의약외품/건기식을 이 경로로 승격하면 잘못된 DRUG master 를 만든다 → 원천별 승격 로직(또는 공통 승격 설계) 분리 필수. **의료기기/의약외품/건기식을 의약품 승격 경로로 처리 금지**(§9 WO 준수).

---

## 7. 핵심 질문 12개 답변 (§7)

1. **현재 unmatched 총계** = **146,258건**.
2. **실제 미처리 unmatched** = **126,654건** (pending+unmatched). +conflict 243 포함 시 미처리 pending 총 **126,897**.
3. **종료(archived/rejected/merged) 후보** = archived 15,779 (rejected·merged 0). 승격완료 포함 종료 총 **267,594**.
4. **과거 삭제 ProductMaster 흔적** = **0건** (dangling ref 0; SET NULL 구조). 의료기기 archived 15,777은 의도적 trace-archive.
5. **기존 ProductMaster 정확 연결 가능** = **0건**.
6. **신규 ProductMaster 등록 대상** = **121,747건** (+정규화 후 의료기기 393).
7. **외부 식별자 없지만 신규 등록 가능** = **393건** (의료기기, 정규화 후 21제품 수준).
8. **O4O 기본상품 비대상** = **4,757건** (e약은요, 정보/원문 소스).
9. **수동 판단 필수** = **0건** (의료기기 grain은 규칙 정규화로 처리 가능).
10. **원천별 후속** = §8 참조.
11. **`unmatched` 표시가 실제 업무 상태로 유효한가?** = **부분적으로 무효.** 종료·이력 19,604건에 낡은 `unmatched` 가 남아 실제 업무량을 과대 표시. candidate_status(등록흐름 3그룹)가 진짜 업무 상태이고 match_status 는 보조 신호.
12. **처리완료 후보에 match_status 표시 이유?** = **없음.** 등록완료/이력 행의 `unmatched` 뱃지는 오해만 유발 → 화면에서 등록완료·이력 그룹에는 match_status 뱃지 숨김 권장(후속 5).

---

## 8. 원천별 처리 가능성 요약 (§5.6)

| source_label | 전체 | 미처리 | 기존매칭 | 신규등록 | 정규화 | 제외/이력 | 권장 후속 |
|---|--:|--:|--:|--:|--:|--:|---|
| 의약품 | 305,522 | 74,681 | 0 | 74,681 | 0 | 승격완료 229,841+matched 1,000 | drug 승격 파이프라인 계속(잔여분) |
| 의약외품 | 22,953 | 5,805 | 0 | 5,805 | 0 | 승격완료 17,148 | 공통 승격 설계 → quasi apply |
| 건기식 | 41,261 | 41,261 | 0 | 41,261 | 0 | 0 | 공통 승격 설계 → HFF apply |
| 의료기기 | 19,996 | 393 | 0 | 0 | 393 | archived 15,777+승격완료 3,826 | UDI/name grain 정규화 → 소규모 apply |
| e약은요 | 4,757 | 4,757 | 0 | 0 | 0 | (전량 EXCLUDE) | 제품 승격 금지·description 파이프라인 소속으로 이관 |
| smoke | 2 | 0 | 0 | 0 | 0 | archived 2 | 이력 |

- 후보 1건 = ProductMaster 1건 성립: 의약품/의약외품/건기식 = **성립(1:1, 식별자 유)**. 의료기기 = **미성립(18.7:1, 식별자 무)**. e약은요 = **미성립(정보 원문)**.
- 대표 외부 식별자: 의약품 KOREA_DRUG_CODE(표준코드), 건기식 STTEMNT_NO(신고번호), 의약외품 MFDS_CODE(허가번호), 의료기기 (없음, UDI-DI 는 raw 만).
- 식별자 없이 상품 단위 성립: 의료기기만 해당하며 name+mfr+UDI 정규화 선행 필요.
- 공통 승격 파이프라인: 현재 없음(DRUG 전용). 바코드 없어도 O4O 내부코드로 생성하는 **공통 승격 설계**가 의약외품·건기식·의료기기 공통 선결 조건.

---

## 9. 현재 로직의 구조적 문제 (§8 코드 조사)

| 구분 | 문제 | 근거 |
|---|---|---|
| **상태 모델** | `match_status` 가 candidate_status 와 독립적으로 갱신되어, 종료(archived/approved) 후 낡은 `unmatched` 로 잔존. `bulkAction`/`archiveCandidate` 는 의도적으로 match_status 를 보존(주석 "매칭 신호 보존") → 화면 과대표시의 근본 원인 | service.ts:526-546, 431-438 |
| **UI 노출** | 화면은 이미 candidate_status 를 3그룹(before_registration/registered/rejected)으로 묶어 업무/종료를 구분([controller GROUPED_STATUS_MAP](../../apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts#L33-L42)). 그러나 match_status 를 **모든 그룹에 동일 뱃지**로 노출 → 등록완료/이력 행에도 `unmatched` 표시 | ProductCandidateReviewPage.tsx:393,549 |
| **승격 기능 부족** | 신규 Master 승격이 **DRUG 소스 전용**. 의약외품/건기식/의료기기(126,747 중 47,459)는 승격 경로 없음 → pending 에 영구 적체 | service.ts:557-572 |
| **데이터 품질** | approved_new_master 53,209건이 back-link(matched_product_master_id) 미기록. 승격 완료 판정은 candidate_status 로만 가능, Master 역참조 불가 | census I·O |
| **매칭 로직(설계상 정상)** | computeMatch 4단계(identifier→normalized→barcode→name ILIKE)는 pending 후보를 정확히 no_existing_master 로 판정. 오탐 없음. 다만 name ILIKE 단계(possible_text_match)는 현 데이터에 미발생(pending 전량 식별자 유 or 의료기기 conflict 선점) | service.ts:328-379 |

- **데이터 문제**: 없음(원천 식별자/이름 품질 양호). 의료기기만 grain 중복.
- **상태 모델 문제**: match_status 낡음 잔존 (19,604건).
- **과거 정리 흔적**: 의료기기 archived 15,777 (의도적), 삭제 Master 흔적 0.
- **UI 노출 문제**: 종료·이력 행에 match_status 뱃지 노출.
- **신규 승격 기능 부족**: 비-DRUG 승격 경로 부재.
- **실제 매칭 로직 결함**: 없음.

---

## 10. 후속 WO 권장 순서

1. **[신규 승격 설계]** `WO-O4O-PUBLIC-DATA-CANDIDATE-COMMON-PRODUCTMASTER-PROMOTION-DESIGN-V1` — 바코드 없어도 O4O 내부 식별코드로 신규 Master 생성하는 **공통 승격 설계**. (의약외품·건기식·의료기기 공통 선결) — **최우선**.
2. **[의약품 잔여 승격]** 의약품 pending 74,681 → 기존 drug 파이프라인으로 신규 Master 생성 (이미 게이트 통과, 즉시 가능). `WO-O4O-DRUG-CANDIDATE-REMAINDER-TO-PRODUCTMASTER-APPLY-V1`.
3. **[원천별 신규 등록 apply]** 1번 설계 후: `WO-O4O-HFF-CANDIDATE-TO-PRODUCTMASTER-APPLY-V1`(41,261) → `WO-O4O-QUASI-DRUG-CANDIDATE-TO-PRODUCTMASTER-APPLY-V1`(5,805) → `WO-O4O-MEDICAL-DEVICE-CANDIDATE-NORMALIZE-AND-APPLY-V1`(393→21, 정규화 포함).
4. **[제외 이관]** e약은요 4,757 → 제품 후보에서 EXCLUDE, description 파이프라인 소속으로 정리. `WO-O4O-EASY-DRUG-INFO-CANDIDATE-EXCLUDE-FROM-PRODUCT-QUEUE-V1`.
5. **[화면 정리]** `WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-VISIBILITY-CLEANUP-V1` (종료·이력 숨김) + `WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-MATCH-STATUS-UX-SIMPLIFY-V1` (등록완료/이력 행 match_status 뱃지 제거).

> **주의: 위는 조사 결과에 따른 권장 순서일 뿐, 본 CHECK 는 어떤 후속 WO 도 생성·실행하지 않는다.** 후속 착수는 별도 명시 지시 필요.

---

## 11. 최종 보고 (§13 형식)

```
1. 전체 unmatched
- 총: 146,258
- 실제 미처리: 126,654 (pending+conflict 포함 시 pending 126,897)
- 종료·이력: 19,604 (archived 15,778 + approved 3,826)
- 과거 삭제 흔적: 0

2. 실제 미처리 후보 분류 (126,897)
- MATCH_EXISTING_MASTER: 0
- CREATE_NEW_MASTER: 121,747 (의약품 74,681 + 의약외품 5,805 + 건기식 41,261)
- NORMALIZE_THEN_CREATE: 393 (의료기기)
- MANUAL_REVIEW: 0
- EXCLUDE_FROM_O4O: 4,757 (e약은요)
- HISTORICAL_ARCHIVE: 0 (이력은 pending 밖 archived 15,779)

3. 원천별 결과
- 의약품: 미처리 74,681 전부 신규 등록(게이트 통과)
- 의료기기: 미처리 393(=21제품) 정규화 후 등록, archived 15,777 이력
- 의약외품: 미처리 5,805 신규 등록(비-DRUG 게이트 차단→공통 승격 필요)
- 건강기능식품: 미처리 41,261 신규 등록(상동)
- 기타(e약은요): 4,757 제외(정보 원문), smoke 2 이력

4. 핵심 결론
- unmatched가 남은 주요 이유: (a)비-DRUG 승격 경로 부재로 신규 등록 미진행 (b)종료 후보의 match_status 낡음 잔존
- 실제 매칭 가능한 수량: 0 (기존 Master 1:1 매칭 없음)
- 신규 등록해야 하는 수량: 121,747 (+정규화 393)
- 재매칭하면 안 되는 수량: 267,594 종료 + 4,757 제외
- 화면에서 숨겨야 하는 수량: 종료·이력 라인의 match_status 뱃지 (약 267,594행)

5. 후속 작업 순서
1) 공통 승격 설계(바코드 無 O4O 내부코드)
2) 의약품 잔여 74,681 승격 → 건기식/의약외품/의료기기 apply
3) e약은요 제외 이관 + 화면 종료/match_status 정리

6. 안전 확인
- DB write: 0
- migration: 0
- code change: 0
- deploy: 0
```

---

## 12. 안전 증명 (write 0 / migration 0 / code 0 / deploy 0)

- 실행 쿼리: 전량 `SELECT` / `COUNT` / `\d` (census1~4). **INSERT/UPDATE/DELETE/DDL 0건.**
- ProductMaster / ProductIdentifier / product_candidates 상태 **변경 없음** (조사 전후 live 394,491 불변).
- 소스 코드 수정 0 · migration 파일 생성 0 · 배포 0.
- 접속: cloud-sql-proxy read-only(o4o_api), 개인정보 컬럼 조회 없음(상태/식별자코드/제품명/제조사만).
- 산출물: 본 CHECK 문서 1건.

---

*조사 SQL 원문: 세션 scratchpad `census1~4.sql` (재현 가능). 문서 커밋 외 저장소 변경 없음.*
