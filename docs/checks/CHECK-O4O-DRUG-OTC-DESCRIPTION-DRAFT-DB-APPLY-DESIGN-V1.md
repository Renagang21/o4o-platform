# CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1

Status: DONE — read-only 조사 + 매핑 설계 + dry-run 실행 (2026-07-07)
WO: `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1`
Scope: 오프라인 CHECK 문서(pilot/5/20/50 그룹)의 OTC 성분·함량·제형 설명서 초안을 `product_candidate_description_drafts` 로 적재하기 위한 **설계 + dry-run 검증**. **DB write 0** (SELECT/COUNT + 코드/문서만). `shared_product_descriptions` insert/update 없음. `product_candidate_description_drafts` 실제 insert 없음. canonical 승격 없음. migration 없음. AI 대량 호출 없음.

선행 문서:
- `docs/checks/CHECK-O4O-DRUG-OTC-ONE-GROUP-DESCRIPTION-PILOT-V1.md`
- `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-TEMPLATE-AND-5-GROUP-DRAFT-V1.md`
- `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-20-GROUP-DRAFT-V1.md`
- `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-50-GROUP-DRAFT-V1.md`
- `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`
- `docs/design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md` (동일 테이블 HFF 선례)

---

## 1. 조사 일시 / 채널

| 항목 | 값 |
| --- | --- |
| 조사 일시 | 2026-07-07 |
| 접속 | cloud-sql-proxy (`netureyoutube:asia-northeast3:o4o-platform-db`, 127.0.0.1:15432) → psql / tsx DataSource |
| 인증 | gcloud ADC (sohae2100@gmail.com), DB_PASSWORD 는 Cloud Run env 에서 추출(메모리/문서/커밋 미기록) |
| write | **0** (SELECT/COUNT 전용, 적재·migration·canonical 없음) |

---

## 2. 조사한 오프라인 draft 문서와 실제 구조

오프라인 draft 는 **별도 데이터 파일이 아니라 CHECK 문서 안의 마크다운**이다. 각 그룹이 `(성분 + 함량 + 제형)` 3축으로 정의되고, 요약표 + 효능·효과 + 복용/사용 안내 + 주의 대상 + 성분 기준 선택(GMP 공통문구) 본문을 가진다.

| 문서 | 그룹 수 | 비고 |
| --- | --: | --- |
| CHECK-…-ONE-GROUP-PILOT | 1 | 에르도스테인 300mg 캡슐 |
| CHECK-…-TEMPLATE-AND-5-GROUP | 5 | 세티리진/알벤다졸/알마게이트/나프록센나트륨/트리메부틴말레산염 |
| CHECK-…-20-GROUP | 20 | §13.1~13.20 본문 |
| CHECK-…-50-GROUP | 40 | 목표 50 → 품질 우선 40 (표기 변형·저카피 소진) |
| **합계** | **66** | 전역 seq 1~66 |

핵심 구조 관찰:
- draft 는 **그룹(성분·함량·제형) 단위**이며 특정 master/candidate id 에 묶여 있지 않다. 그룹 하나가 수십~수백 ProductMaster(포장단위 SKU)를 대표한다("설명 1벌 → 여러 SKU 공유").
- 그룹핑 키는 `name` 괄호 파싱(성분) + `specification` 첫 토큰(함량, 한글 단위 `밀리그램`/`마이크로그램`) + `name` 제형 키워드(연질캡슐>캡슐>정)로, 선행 문서가 사용한 것과 동일.

---

## 3. 운영 DB 현재 상태 재확인 (2026-07-07, read-only)

| 대상 | 값 |
| --- | --: |
| ProductMaster 전체 | 181,241 (DRUG 177,413 / MEDICAL_DEVICE 3,826 / GENERAL 2) |
| DRUG drug_category | otc **57,572** / rx 119,548 / drug_unspecified 293 |
| ProductDrugExtension | 177,413 (DRUG 1:1 mirror, orphan 0) |
| shared_product_descriptions | 19,431 (100% `mfds_easy_drug`, canonical 15,962 / needs_review 3,469) |
| **product_candidate_description_drafts** | **0 rows** (스키마만 배포, HFF 포함 draft 미적재) |
| csv_import candidate ↔ master 연결 | approved_new_master 중 matched_product_master_id 세팅 176,632 |

→ 드러그 OTC 설명 draft 를 적재할 대상 테이블은 현재 완전히 비어 있고, OTC master 는 candidate 로 앵커 가능하다.

---

## 4. `product_candidate_description_drafts` 스키마 요약

출처: 엔티티 `ProductCandidateDescriptionDraft.entity.ts`, migration `20261204000000-CreateProductCandidateDescriptionDrafts.ts`.

| 컬럼 | 타입 | 제약 | 매핑 |
| --- | --- | --- | --- |
| `id` | uuid | PK | 자동 |
| `candidate_id` | uuid | **NOT NULL** FK→product_candidates ON DELETE CASCADE | 그룹 대표 앵커 candidate |
| `source_label` | varchar(128) | NOT NULL | `MFDS_DRUG_OTC` (신규 라벨) |
| `source_identifier_value` | varchar(255) | nullable | groupKey `성분\|함량\|제형` |
| `draft_type` | varchar(64) | NOT NULL | `store_description` |
| `language` | varchar(16) | default `ko` | `ko` |
| `title` / `summary` | text | nullable | 그룹 라벨 / (apply 시) 요약 |
| `content_json` | jsonb | NOT NULL | 그룹키 + 본문(본문은 apply ETL) |
| `content_html` | text | nullable | null(dry-run) |
| `seed_json` | jsonb | NOT NULL | 그룹 범위(master/otc/rx/mfr/spd/anchor) + 근거 |
| `guard_result` | jsonb | NOT NULL | verdict/rxPurity/grounding/spdOverlap/doseRoute |
| `review_status` | varchar(32) | default `needs_review` | `needs_review` 고정 |
| `review_flags` | text[] | default `{}` | klass + rx/spd/route flag |
| `ai_provider`/`ai_model`/`ai_policy_scope`/`ai_cost_estimate` | — | nullable | **전부 null**(외부 초안, O4O 생성 아님) |
| `generated_at`/`reviewed_by`/`reviewed_at` | — | nullable | null |
| `created_at`/`updated_at`/`deleted_at` | timestamp | — | 자동/soft delete |

**dedup 축(멱등 upsert):** partial unique index `uniq_pcdd_candidate_draft_type_language_active` = 활성 `(candidate_id, draft_type, language)` 1개. 인덱스: candidate / (source_label,review_status) / (review_status,created_at) / source_identifier.

---

## 5. 매핑 설계 (오프라인 그룹 → DB draft)

### 5.1 핵심 결정 — 그룹 draft 1건 ↔ 대표 candidate 앵커

`product_candidate_description_drafts` 는 원래 **master 부재 HFF(candidate 1:1)** 용으로 설계됐다. Drug OTC 는 (a) master 가 존재하고 (b) draft 가 그룹 단위라 구조가 다르다. 두 모델을 비교:

| 모델 | 내용 | 판정 |
| --- | --- | --- |
| A. 그룹당 draft 1건 + 대표 candidate 앵커 | candidate_id = 그룹의 대표(min) csv_import candidate. 그룹 범위는 `seed_json.groupKey`+master/candidate 집계로 보존 | **채택** — "설명 1벌 → 여러 SKU 공유" 철학과 일치, 저볼륨(66행) |
| B. master/candidate 마다 draft 복제 | 그룹당 수십~수백 행 폭증 | **기각** — shared_product_descriptions N배 복사 안티패턴 재현 |

→ 채택: **Model A**. 66 그룹 → (해상 성공) 65 draft 행. `candidate_id` 는 FK 필수 placeholder 이고, 진짜 스코프는 `seed_json`.

### 5.2 필드 매핑

| 오프라인 | DB draft | 비고 |
| --- | --- | --- |
| 그룹키(성분·함량·제형) | `source_identifier_value`, `content_json.groupKey`, `seed_json.groupKey` | |
| 라벨 | `title` | 예: "아세틸시스테인 200mg 캡슐" |
| 본문(요약표+효능+복용+주의+GMP) | `content_json` | **apply 단계 ETL**(마크다운→JSON). dry-run 은 `contentPending:true` |
| 대표 앵커 | `candidate_id` | 그룹 OTC master 의 min csv_import candidate |
| 그룹 범위 | `seed_json.groupScope` = {masterTotal, otc, rx, manufacturers, spdMasters, anchorMasters} | |
| 문서 근거 | `seed_json.sourceDoc`, `content_json.contentSource` | pilot/5g/20g/50g + seq |
| guard | `guard_result` = {verdict, rxPurity, rxCount, groundingEasyDrug, spdOverlap, doseRouteManual} | |
| 상태 | `review_status='needs_review'` | 약사 검수 전 고정 |

구현: `apps/api-server/src/modules/neture/drug-import/drug-otc-description-draft-plan.ts` (순수 함수 `classifyGroup`/`buildDrugOtcDraftRowPlan` + 66그룹 fixture).

---

## 6. 중복 방지 기준

| 계층 | 키 | 처리 |
| --- | --- | --- |
| 오프라인 그룹 | `성분\|함량\|제형\|language` | fixture 66개 groupKey 유일(테스트로 강제). 선행 문서가 `NOT IN` 으로 기존 그룹 제외 |
| DB draft (활성) | `(candidate_id, draft_type, language)` | partial unique index. 그룹은 **disjoint master 집합** → anchor candidate disjoint → 충돌 구조적 불가 |
| dry-run 검산 | distinctAnchorCandidates == insertableDrafts | 실측 65==65, anchorCollision 0 |

**표기 변형 한계(미해결):** 같은 활성성분이 `트리메부틴말레산염`↔`말레인산트리메부틴`, `세티리진염산염`↔`염산세티리진`, `엘카르니틴`↔`L-카르니틴` 등으로 분산된다(50-group §5). name 파싱 groupKey 는 이를 **다른 그룹으로 취급**하므로, 완전한 중복 제거는 itemSeq/주성분코드 정규화 이후에만 가능. 현재 66개 fixture 는 선행 문서가 이미 표기 변형을 수동 배제한 clean set 이므로 이 배치에서는 중복 없음.

---

## 7. OTC/RX 및 제외 기준

분류 우선순위(순수 `classifyGroup`, 하드 제외 > flag):

1. `EXCLUDE_match_fail` — 그룹키가 DB master 0건
2. `EXCLUDE_no_otc` — master 는 있으나 OTC 0건
3. `EXCLUDE_anchor_fail` — OTC master 에 연결된 csv_import candidate 없음
4. `EXCLUDE_rx_heavy` — RX > OTC (전문의약품 우세)
5. `INSERT_manual_flag` — 투여경로 등 수동 큐레이션(예: 클로트리마졸 질정)
6. `INSERT_rx_minor_flag` — 소수 RX 혼입(0 < rx ≤ otc)
7. `INSERT_low_ground_flag` — e약은요 grounding ≤ 10
8. `INSERT_review_flag` — 약사 검토 강화(문서 klass)
9. `INSERT_auto` — 기본

**처방의약품/원료·미분류/건기식/의료기기/의약외품은 대상 아님:** 66 그룹은 전부 선행 문서가 `drug_category='otc'` 로 확정한 OTC 그룹이며, 처방의약품(RX 우세)·미분류·원료의약품은 후보 산출 SQL 단계에서 이미 배제됐다. 동일 성분 고함량 RX(나프록센 550mg, 트리메부틴 300mg 등)는 별도 그룹으로 분리되어 이 66개에 포함되지 않는다.

---

## 8. dry-run 결과 (프로덕션 DB, write 0)

실행: `npx tsx src/scripts/drug-otc-description-draft-dryrun.ts` (proxy 경유, SELECT only).

### 8.1 Summary

```txt
offlineDraftGroups   : 66
resolvedGroups       : 65      (그룹키 → master ≥1)
insertableDrafts     : 65
excluded             : 1
distinctAnchorCand   : 65      (== insertable → dedup 안전)
anchorCollision      : 0
dbWrite              : 0
```

### 8.2 verdict 분포

| verdict | 수 | 예 |
| --- | --: | --- |
| INSERT_auto | 40 | 아세틸시스테인 200mg 캡슐, 세티리진 10mg 정 … |
| INSERT_review_flag | 11 | 나프록센나트륨 275mg, 아스피린 100mg, 이부프로펜 계열 … |
| INSERT_low_ground_flag | 11 | 은행엽·포도엽·아르기닌티디아시케이트·데소게스트렐 등(e약은요≤10) |
| INSERT_rx_minor_flag | 2 | 파모티딘 10mg 정(otc128/rx3), 펙소페나딘 60mg 정(otc50/rx2) |
| INSERT_manual_flag | 1 | 클로트리마졸 100mg 질정(투여경로) |
| EXCLUDE_match_fail | 1 | 엔테로코쿠스페슘…균 30mg 캡슐 |
| **insertable 계** | **65** | |

### 8.3 제외 샘플 (유형별)

- **match_fail (1):** `#51 엔테로코쿠스페슘…균 30mg 캡슐` — 50-group 문서의 `…` 생략 표기가 실제 DB `name` 괄호값과 불일치 → master 0건. **name 파싱 그룹핑의 취약성 실증**(WO §11 itemSeq/주성분코드 정규화 필요의 재확인).
- anchor_fail / rx_heavy / no_otc: **0건** (모든 해상 그룹의 OTC master 100% 앵커 가능, RX 우세 그룹 없음).

### 8.4 insert payload 샘플

```txt
에르도스테인 300mg 캡슐          → cand=00065e32… flags=["auto","spd_overlap"]
세티리진염산염 10mg 정           → cand=01f6fa04… flags=["auto","spd_overlap"]
나프록센나트륨 275mg 정          → cand=006f1a2b… flags=["review","pharmacist_review","spd_overlap"]
```

각 payload 는 `candidate_id`(대표 앵커) + `source_label=MFDS_DRUG_OTC` + `draft_type=store_description` + `language=ko` + `review_status=needs_review` + `seed_json.groupScope` + `guard_result` 를 갖는다. 본문(content_json)은 `contentPending:true` — apply 단계에서 마크다운→JSON ETL.

### 8.5 파싱 키 검증 (문서 재현)

dry-run 해상 수치가 선행 문서·메모리와 정확히 일치(샘플): 아세틸시스테인 200mg 캡슐 master 287 / mfr 73 / e약은요 228, 에르도스테인 캡슐 440 / 121 / 373, 은행엽 80mg 정 213 / 53 / 10, 데소게스트렐 6 / 3 / 6. → 그룹핑 파싱 키가 원 문서와 동치임을 확인.

---

## 9. 산출물 (코드/문서)

| 파일 | 성격 |
| --- | --- |
| `apps/api-server/src/modules/neture/drug-import/drug-otc-description-draft-plan.ts` | 순수: 66 그룹 fixture + `classifyGroup` + `buildDrugOtcDraftRowPlan` (DB 무관) |
| `apps/api-server/src/scripts/drug-otc-description-draft-dryrun.ts` | **dry-run 전용** CLI (SELECT only, apply 경로 부재) |
| `apps/api-server/src/modules/neture/services/__tests__/drug-otc-description-draft-plan.test.ts` | 순수 로직 단위 테스트 12개 |
| 본 CHECK | 설계 + dry-run 결과 |

검증: `tsc --noEmit` 통과, jest 12/12 통과, `git diff --check` clean, 실행 후 draft 테이블 row **0 유지**.

---

## 10. 위험 / 미결정 사항

1. **테이블 적합성(구조 미결정).** `product_candidate_description_drafts` 는 master 부재 HFF(candidate 1:1)용이다. Drug OTC 는 master 존재 + 그룹 단위라 candidate 앵커가 **의미상 placeholder**(1개 candidate 가 그룹 전체 설명을 대표). Model A 로 즉시 적재는 가능하나, 장기적으로 (a) 그룹 스코프 staging 테이블 또는 (b) 검수 통과 즉시 `shared_product_descriptions`(master 기준)로 승격하는 경로를 **후보 C WO 에서 결정**해야 한다.
2. **e약은요 중복(spd_overlap).** 대부분 그룹의 OTC master 는 이미 `shared_product_descriptions` 에 e약은요 설명을 보유(예: 에르도스테인 440 중 373). Drug OTC 매장 설명서는 **성분 중심 요약형**으로 e약은요 원문과 아티팩트 유형이 다르지만, canonical 승격 단계에서 "e약은요 vs 매장 설명서" 정합을 반드시 정의해야 한다. 본 설계는 draft-staging 계층에서 spd 존재를 **제외가 아닌 flag(spd_overlap)** 로만 기록한다.
3. **본문 ETL 미포함.** dry-run 은 키/매핑/수량/제외를 확정했고, 마크다운 본문 → `content_json` 구조화(요약표·효능·복용·주의·GMP 필드 분해)는 apply WO 의 결정적 단계로 남긴다.
4. **표기 변형 정규화.** name 파싱 그룹핑은 염 표기 변형·생략 표기(match_fail 1건)에 취약. 100그룹 이상 확장 전 itemSeq/주성분코드 정규화가 선행돼야 함(50-group §5 실증과 동일 결론).
5. **약사 최종 검수.** review_flag(11)·rx_minor(2)·manual(1) 그룹은 적재 후에도 매장 노출 전 약사 검수 필수. review_status 는 needs_review 고정.

---

## 11. 다음 WO 제안

| 후보 | WO | 범위 |
| --- | --- | --- |
| A (권장) | `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1` | dry-run 결과(65 draft) 기준 `product_candidate_description_drafts` 실제 insert. **본문 마크다운→content_json ETL 포함**, 사용자 승인 + chunk + 전/후 count 검증 + snapshot. 이중 게이트(env). match_fail 1건 제외 유지 |
| B | `WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1` | 적재 draft 를 admin read-only/review shell 로 확인(canonical 승격 없음) |
| C | `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-ACTION-DESIGN-V1` | 검수 통과 draft → `shared_product_descriptions` 승격 action 설계 + e약은요 정합(§10-1·§10-2 결정) |
| 선행 | (정규화) | itemSeq/주성분코드 기반 그룹핑 정규화 — 100그룹+ 확장 및 표기 변형 병합의 전제 |

---

## 12. write 준수 (DB write 0 확인)

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** |
| product_candidate_description_drafts insert | 0 (실행 후 row 0 유지) |
| shared_product_descriptions insert/update | 0 |
| product_masters / product_candidates 변경 | 0 |
| candidate status 변경 | 0 |
| canonical 승격 | 0 |
| AI 대량 호출 | 0 |
| 산출물 | 순수 plan 모듈 + dry-run CLI + 단위 테스트 12 + 본 CHECK (전부 read-only/dry-run) |
