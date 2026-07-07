# CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-DRAFT-REVIEW-AND-PROMOTION-DESIGN-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-DRAFT-REVIEW-AND-PROMOTION-DESIGN-V1
> **성격:** 적재된 복합제 6 draft(applyRunId=otc-combo-draft-v1)의 **admin 검토 노출 확인 + 약사 검수/SPD 승격 설계** (read-only). **DB write 0** (SELECT/COUNT + 문서만). canonical/SPD write 없음.
> **선행:** [`DRAFT-DB-APPLY-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1.md)(6행 적재) · SINGLE 승격 선례 [`DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1.md)
> **결과 요약:** combo 6행 admin 목록/상세 **정상 노출**(필드 결손 0). SINGLE 대비 차이 4건(verdict 신값·masterTotal 계열단위·registryGroupKeys 신필드·flags). SPD 승격은 display=(master_id+canonical) 구조상 **계열 OTC master 전체 N-copy** 필요(otc 합 984 / no_spd 532). **복합제 family draft 는 coarse → 승격 문턱을 SINGLE보다 높임**(약사 계열별 승인 + strength 재파싱 후 권장). 실제 승격은 별도 승인 WO.

---

## 1. 조사 일시 / 채널

| 항목 | 값 |
|---|---|
| 일시 | 2026-07-07 |
| 접속 | cloud-sql-proxy read-only (o4o_api) |
| write | **0** (SELECT/COUNT) |
| 코드 조사 | `product-candidate-description-draft.controller.ts` / `.service.ts`(listForAdmin·getByIdForAdmin) · SINGLE 승격 설계 |

## 2. 적재 6 draft 조회 (applyRunId=otc-combo-draft-v1)

| ATC7 | title | verdict | status | masterTotal | otc | spdMasters | regGroups | efficacy |
|---|---|---|---|-:|-:|-:|-:|:-:|
| A06AB52 | 변비약 — 자극성 완하제 복합 (정/캡슐) | INSERT_combo_review | needs_review | 371 | 371 | 178 | 14 | ✅ |
| A06AC51 | 변비약 — 팽창성 완하제 (과립) | INSERT_combo_review | needs_review | 133 | 133 | 21 | 1 | ✅ |
| M03BB53 | 근이완 진통 복합 (정) | INSERT_combo_review | needs_review | 118 | 118 | 71 | 3 | ✅ |
| M09AB52 | 소염효소 복합 (정) | INSERT_combo_review | needs_review | 134 | 134 | 57 | 2 | ✅ |
| A02BA53 | 위장약 — 파모티딘 복합 (정) | INSERT_combo_review | needs_review | 28 | 28 | 20 | 2 | ✅ |
| M01AE51 | 이부프로펜 진통 복합 (정/연질캡슐) | INSERT_combo_review | needs_review | 200 | 200 | 105 | 5 | ✅ |

## 3. admin 검토 화면 노출 확인 (read-only)

**API:** `GET /admin/product-candidate-description-drafts`(목록) · `/:id`(상세) — `ProductCandidateDescriptionDraftService.listForAdmin/getByIdForAdmin`. 탭 'OTC 설명 초안'(source_label=MFDS_DRUG_OTC).

- **노출 여부: 6행 모두 노출.** combo 는 SINGLE 과 **동일 source_label(MFDS_DRUG_OTC)** → 같은 탭. 필터 `applyRunId=otc-combo-draft-v1` 로 6행만 격리 가능(서비스가 `seed_json->>'applyRunId'` 필터 지원).
- **필드 결손 0(실측):** `null_efficacy=0 · null_masterTotal=0 · null_spdMasters=0`. listForAdmin 이 읽는 `content_json.efficacy`(preview) + `seed_json.groupScope.{masterTotal,otc,rx,manufacturers,spdMasters}` 전부 채워짐.
- **상세(getByIdForAdmin):** `content_json`(요약표/효능/복용/주의/GMP/bodyMarkdown) + `seed_json`(registryGroupKeys[27]/subVariants/exclusions) + `guard_result` 전체 노출 → 검수자가 계열 body + 27 group_key 추적성 확인 가능.

### 3.1 title / content_json / registryGroupKeys / review_status 표시

| 항목 | 목록(list) | 상세(detail) |
|---|:-:|:-:|
| title | ✅ | ✅ |
| content_json.efficacy | ✅(140자 preview) | ✅(전체) |
| content_json.{요약표,복용,주의,GMP,bodyMarkdown} | ✗(list 미표시) | ✅ |
| seed_json.registryGroupKeys[27] | ✗(list 미표시, `regGroups` 개수만 groupScope엔 없음 → **detail 전용**) | ✅ |
| review_status(needs_review) | ✅ | ✅ |

## 4. 기존 SINGLE 66행 대비 차이

| 축 | SINGLE(66) | COMBO(6) | admin 영향 |
|---|---|---|---|
| **verdict** | INSERT_auto / review_flag / low_ground_flag / rx_minor_flag / manual_flag | **INSERT_combo_review**(신값) | 목록 필터 자체는 free param 이라 동작. **frontend verdict 드롭다운에 신값 옵션 추가 필요**(없으면 수동 입력/미표시) |
| **masterTotal** | 그룹(성분·함량·제형) master 수 | **ATC 계열 전체 master 수**(변비 371 등, 큼) | 표시 정상. 단 의미 상이(계열 vs 그룹) — 검수자 인지 필요 |
| **registryGroupKeys** | 없음(그룹 1:1) | **27개 배열(계열당 1~14)** | list 미표시 → detail 로만. "1 draft = N group_key" 표시 UX 보강 여지 |
| **review_flags** | auto/review/pharmacist_review/spd_overlap 등 | combo·pharmacist_review·spd_grounded + **계열 flag**(nsaid·apap_overlap·anticoagulant_caution·renal_caution·laxative_*) | 표시 정상, 필터/색인 무영향 |
| seed_json.{subVariants,exclusions} | 없음 | combo 전용 | detail 표시(검수 힌트) |
| review_status | needs_review(rejected 1 등) | needs_review(전 6) | 동일 |

**결론:** combo 6행은 admin 검토 shell 을 **그대로 재사용**해 노출·필터·상세가 동작한다. 개선 여지 2건(비차단): ① frontend verdict 드롭다운에 `INSERT_combo_review` 추가, ② "1 draft ↔ N registry group_key" 를 목록/상세에 명시(현재 detail seed_json 로만 확인).

## 5. 약사 검수 기준 (복합제 특화)

복합제 draft 는 **계열(ATC) 단위 generic body** 라 SINGLE(성분·함량·제형 1:1)보다 검수 강도를 높인다.

| 검수 축 | 확인 사항 |
|---|---|
| **과일반화 리스크(핵심)** | 계열 body 가 seed_json.registryGroupKeys **27개 각각(함량·제형·조합 상이)** 에 타당한가. 예 A06AB52 14개(비사코딜 조합 함량 5~100mg)·M01AE51 5개(200~400mg) |
| **subVariants** | M03BB53 리렉사=클로르족사존+**아세트아미노펜**(중복복용) · A02BA53 파모콤푸츄=**제산 복합 800mg**(파모컴 10mg 단일 파모티딘과 조합 상이) · M01AE51 캐롤에프 제외 확인 |
| **중복복용·상호작용 경고** | 이부프로펜(NSAID 위장출혈·심혈관), APAP 중복(근이완), 항응고제(소염효소), 신장(파모티딘) — caution 문구 충분성 |
| **grounding 정합** | content 효능·용법이 계열 e약은요(spdMasters: 20~178) 원문과 일치. GROUNDING-DRAFT-V1 §4 근거표 대조 |
| **single/combo 경계** | A02BA53 파모컴정 원문은 단일 파모티딘 → combo 분류 재확인(승격 전 정합) |
| **제외 정합** | 감기약·영양제·멀미·프라본·캐롤에프 미포함 확인 |

검수 결과 상태 전이(운영): `needs_review` → (승인) `approved`(신규, 승격 대상) / (반려) `rejected` / (수정) content 재작성. **본 WO 는 상태 전이 안 함**(read-only).

## 6. canonical / SPD 승격 설계 (승인·감사·rollback)

### 6.1 승격 구조 제약 (SINGLE 선례 재확인)

- **display 는 (master_id + canonical) 로만 조회** — representative 폴백 없음 → 그룹 대표만 넣으면 형제 SKU 못 봄 → **계열 OTC master 전체 전개(N-copy) 필요**.
- **canonical 은 master 당 1개**(partial unique) — e약은요 canonical 보유 master 에 새 canonical 불가 → 승격은 **status=`needs_review`** 로(canonical 아님), 기존 e약은요 canonical 보존.
- **source_type union 에 `mfds_drug_otc` 없음**(현재 `mfds_easy_drug`뿐) → 승격 시 additive 필요.

### 6.2 승격 규모 실측 (계열 OTC master 전개)

| ATC7 | otc master | e약canonical | anySpd | **no_spd** |
|---|-:|-:|-:|-:|
| A06AB52 | 371 | 152 | 178 | 193 |
| A06AC51 | 133 | 21 | 21 | 112 |
| M03BB53 | 118 | 59 | 71 | 47 |
| M09AB52 | 134 | 47 | 57 | 77 |
| A02BA53 | 28 | 20 | 20 | 8 |
| M01AE51 | 200 | 105 | 105 | 95 |
| **계** | **984** | 384 | 452 | **532** |

### 6.3 승격 대상 옵션 (SINGLE 과 동일 축)

| 안 | 대상 | status | master 수 | 특징 |
|---|---|---|-:|---|
| **A. no_spd 만** | 설명 전무 SKU | needs_review | **532** | canonical 충돌 0, 무설명 SKU 한계효용 최대, 큐레이션 최소 |
| B. 전체 OTC | canonical 보존 | needs_review | 984 | 전 SKU store 설명, 중복·검수 부담 큼 |

**전개 매핑(공통):** `status='needs_review'` · `source_type='mfds_drug_otc'`(additive) · `language='ko'` · `source_ref_id=<combo draft id>`(계열 draft 역참조) · `content`=draft content_json→HTML.

### 6.4 ⚠ 복합제 특유 리스크 & 권고

- **과일반화:** 계열 generic body 를 계열 전체 SKU(예 변비 371)에 전개하면, 함량·조합이 다른 제품에 동일 설명이 붙는다. SINGLE(성분·함량·제형 일치)보다 정밀도가 낮다.
- **권고(승격 문턱 상향):**
  1. **약사 계열별 승인 선행**(§5) — draft 6건 `needs_review`→`approved` 후에만 승격 착수.
  2. **A안(no_spd 532) 우선** — e약은요 보유 SKU 는 건드리지 않음(canonical 보존 + 과일반화 노출 최소).
  3. **strength 재파싱(CLEANUP-V1) 반영 후 재검토** — 계열 내 함량축이 실제로 동일 설명 공유 가능한지 확인 후 전개 범위 확정.
  4. canonical 직접 승격 금지 — 전부 `needs_review` SPD 로만(운영 검수 후 별도 canonical 승격).

### 6.5 승인 · 감사 · rollback

- **승인 게이트:** 승격 apply WO 는 draft `approved` 상태 + `--apply` + env CONFIRM + 사용자 최종 승인(SINGLE apply 패턴).
- **감사:** 각 SPD 행 `source_ref_id=draft id`(verdict/flags 역추적) + `promotionRunId='otc-combo-spd-v1'`(seed 또는 별도 컬럼 없으므로 source_ref_id + source_type 조합으로 식별).
- **rollback:** `source_type='mfds_drug_otc' AND source_ref_id IN (<combo draft ids>)` soft delete(`deleted_at`). e약은요 canonical(mfds_easy_drug) 불변.
- **불변식:** masters/candidate/extension 무변경. 기존 SPD 19,431 불변(신규는 mfds_drug_otc, 별 source_type).

## 7. 완료 기준 대비

| 기준 | 결과 |
|---|:-:|
| 복합제 6 draft admin 노출 확인 | ✅ 6행 노출, 필드 결손 0 (§3) |
| 표시/필터/상태 문제 확인 | ✅ 차단 문제 0, 개선 2건(verdict 옵션·N group_key 표시) (§4) |
| 약사 검수 기준 정리 | ✅ 과일반화·subVariants·상호작용 등 (§5) |
| SPD 승격 전 승인·감사·rollback 설계 | ✅ N-copy 규모·A/B안·보수 권고·rollback (§6) |
| 실제 승격 별도 승인 WO 분리 | ✅ §8 |

## 8. 금지사항 준수 / 다음 WO

**금지사항:** DB write 0 · SharedProductDescription 변경 0 · ProductDrugExtension 0 · ProductMaster/Candidate 0 · canonical 승격 0 · registry 직접 변경 0 · 매장 연결 0. (전부 read-only)

**다음 WO (별도 사용자 승인):**
1. **(권장 선행) 약사 검수 상태 전이 WO** — draft `needs_review`→`approved`/`rejected` (admin 액션). 현재 shell 은 read-only 조회만 → 상태 전이 API 설계 필요.
2. **WO-...-COMBO-DRAFT-TO-SHARED-PROMOTION-DESIGN-V1** — A안(no_spd 532) 전개 dry-run(source_type additive, source_ref_id, promotionRunId). strength 재파싱 반영.
3. **WO-...-COMBO-DRAFT-TO-SHARED-PROMOTION-APPLY-V1** — 사용자 승인 후 실제 SPD 적재.

---

*V1 · 2026-07-07 · combo 6 draft admin 노출 정상 · 승격 N-copy 984/no_spd 532 · 과일반화 보수 권고 · DB write 0 · 승격 별도 WO*
