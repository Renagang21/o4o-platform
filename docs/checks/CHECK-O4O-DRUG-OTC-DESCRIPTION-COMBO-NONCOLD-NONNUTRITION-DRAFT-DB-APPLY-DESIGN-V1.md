# CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1
> **성격:** drafted 27그룹의 `product_candidate_description_drafts` 적재 **설계 + dry-run**. **DB write 0** (SELECT/COUNT read-only + 문서만). 실제 insert 0 · SPD 변경 0 · canonical 0 · registry 직접 변경 0.
> **선행:** [`GROUNDING-DRAFT-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md)(drafted 27) · SINGLE 선례 [`DRAFT-DB-APPLY-DESIGN-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1.md)(Model A) · [`DRAFT-DB-APPLY-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1.md)(66행 적재)
> **결과 요약:** drafted 27 registry group_key → **Model A-family 채택 시 6 draft 행**(계열당 1건, body 공유) / 대안 A-per-group 27행. 기존 SINGLE 66행과 중복 0·앵커 충돌 0. 전 계열 100% OTC(rx 0)·앵커 candidate·SPD grounding 확보. **insertable(family)=6, dbWrite=0.** apply 는 별도 승인 WO.

---

## 1. 조사 일시 / 채널

| 항목 | 값 |
|---|---|
| 조사 일시 | 2026-07-07 |
| 접속 | cloud-sql-proxy (`netureyoutube:asia-northeast3:o4o-platform-db`, 127.0.0.1:6543) → psql read-only |
| 인증 | gcloud ADC + Cloud Run `o4o-core-api` env DB_PASSWORD(추출 후 로컬 임시파일 삭제, 커밋 미기록) |
| write | **0** (SELECT/COUNT 전용) |
| 한글 | UTF-8 `.sql` + `psql -f`, 출력 `\o` 파일 저장 후 Read |

## 2. 적재 대상 (drafted 27 registry group_key)

GROUNDING-DRAFT-V1 §7 drafted 27 = 6 ATC 계열:

| ATC7 | 계열 | registry group_key(요약) | 행 |
|---|---|---|-:|
| A06AB52 | 변비(자극성 완하) | `drug_otc::combo::oral::a06ab52_combo::{5·6·10·12·15·16.75·20·21·50·55·100·3·3·6}::{tablet/soft_capsule/liquid}` | 14 |
| A06AC51 | 변비(팽창성, 아락실) | `...a06ac51_combo::4g::granule` (262 na=dup, CLEANUP blocked) | 1 |
| M03BB53 | 근이완 | `...m03bb53_combo::{150·25·300}mg::tablet` (담엔쿨·스카풀라·리렉사) | 3 |
| M09AB52 | 소염효소 | `...m09ab52_combo::{40·1}mg::tablet` (인플라·트로멜) | 2 |
| A02BA53 | 파모티딘+제산 | `...a02ba53_combo::{10·800}mg::tablet` (파모컴·파모콤푸츄) | 2 |
| M01AE51 | 이부프로펜 진통 | `...m01ae51_combo::{200s·400s·200t·75·250s}::{tablet/soft_capsule}` (캐롤에프 222 제외) | 5 |
| **계** | | | **27** |

**제외:** 프라본정(C05CA53)·캐롤에프정(M01AE51 222) = needs_review · 감기약 · 영양제 · 멀미 A04AD51.

## 3. 기존 draft 테이블 현황 (read-only)

| 대상 | 값 |
|---|--:|
| `product_candidate_description_drafts` 활성 | **66** (전량 `MFDS_DRUG_OTC` / `needs_review` = SINGLE apply, applyRunId=otc-draft-v1) |
| combo 관련 기존 적재 | **0** (source_identifier/content_json 에 combo/ATC 없음) |
| → combo 신규 적재 시 기존과 exact 중복 | **0** (구조상 disjoint) |

## 4. `product_candidate_description_drafts` 스키마 (SINGLE 선례와 동일)

핵심(선례 §4 재확인): `candidate_id`(NOT NULL, FK→product_candidates) · `source_label` · `source_identifier_value` · `draft_type`(store_description) · `language`(ko) · `title/summary` · `content_json`(NOT NULL) · `content_html` · `seed_json`(NOT NULL) · `guard_result`(NOT NULL) · `review_status`(default needs_review) · `review_flags`(text[]) · ai_* null · timestamps/soft delete.

**dedup 축:** partial unique index `(candidate_id, draft_type, language)` active 1개.

## 5. 매핑 설계 — 적재 단위 결정 (핵심)

복합제는 SINGLE 과 다르게 **동일 ATC 계열의 여러 함량/제형 registry group_key 가 e약은요상 같은 효능·용법·주의(= 같은 설명 body)** 를 공유한다(GROUNDING §5 는 계열당 body 1벌만 작성). 두 모델:

| 모델 | 내용 | draft 행 수 | 판정 |
|---|---|:-:|---|
| **A-family** | ATC 계열당 draft 1건. body = GROUNDING §5.x 계열 초안. 앵커=계열 대표 candidate. 27 registry group_key 는 `seed_json.registryGroupKeys[]` 에 보존 | **6** | **채택(권장)** — "설명 1벌→여러 SKU 공유" 철학 일치, 검수 부담 최소, 실제 작성된 body 수(6)와 정합 |
| A-per-group | registry group_key 당 draft 1건. body 는 계열 template 복제 | 27 | 대안 — 14개 변비 draft 가 동일 body(검수 중복). SINGLE 은 group 마다 body 가 달랐으나 combo 는 body 공유 → 과분할 |

> **결정 필요(apply WO 시 사용자 선택):** 기본 권장 **A-family(6행)**. registry group_key 추적성은 seed_json 으로 완전 보존되므로 손실 없음. 만약 매장/검수 UI 가 함량별 개별 draft 를 요구하면 A-per-group(27행)으로 전환 가능(같은 설계·같은 guard, 앵커만 group별로 세분).

### 5.1 필드 매핑 (A-family, 계열당 1행)

| 필드 | 값 |
|---|---|
| `candidate_id` | 계열 대표 앵커 candidate(§6 실측) |
| `source_label` | `MFDS_DRUG_OTC` (SINGLE 과 동일) |
| `source_identifier_value` | `drug_otc::combo::oral::{ATC7}` (예: `...::A06AB52`) |
| `draft_type` / `language` | `store_description` / `ko` |
| `title` | 계열 라벨 (예: "변비약 — 자극성 완하제 복합") |
| `summary` | 1줄 요약 |
| `content_json` | 계열 body(요약표+효능+복용+주의+GMP). **apply 단계 마크다운(GROUNDING §5.x)→JSON ETL**. dry-run 은 `contentPending:true` |
| `content_html` | null |
| `seed_json` | §5.2 |
| `guard_result` | §5.3 |
| `review_status` | `needs_review` (복합제 약사 검수 전 고정) |
| `review_flags` | `['combo','pharmacist_review','spd_grounded', 계열 flag]` |
| `ai_*` / `generated_at` / `reviewed_*` | null (외부 e약은요 근거, O4O 생성 아님) |

### 5.2 `seed_json` 구조

```jsonc
{
  "familyKey": "drug_otc::combo::oral::A06AB52",
  "atc7": "A06AB52",
  "comboCode": "a06ab52_combo",
  "registryGroupKeys": [ /* 계열 소속 registry group_key 전체 (예: 변비 14개) */ ],
  "registryGroupCount": 14,
  "groupScope": { "masterTotal": 371, "otc": 371, "rx": 0, "manufacturers": 65, "spdMasters": 178,
                  "anchorCandidate": "03f729e3…", "anchorMaster": "툴코맥스장용연질캡슐" },
  "grounding": { "source": "mfds_easy_drug", "spdMasters": 178, "spdSampleIds": [ /* 대표 canonical SPD id */ ] },
  "subVariants": [ /* 계열 내 검수 주의 변형. 예 M03BB53: "리렉사정=클로르족사존+아세트아미노펜(중복복용 주의)"; A02BA53: "파모콤푸츄정=제산 복합(800mg)" */ ],
  "exclusions": { "coldExcluded": true, "nutritionExcluded": true, "heldNeedsReview": ["프라본정","캐롤에프정"] },
  "applyRunId": "otc-combo-draft-v1"
}
```

### 5.3 `guard_result` 구조

```jsonc
{
  "verdict": "INSERT_combo_review",
  "comboClass": "ATC_combination",
  "rxPurity": 1.0, "rxCount": 0,          // 전 계열 rx=0 (§6)
  "groundingEasyDrug": 178,                // 계열 SPD master 수
  "spdOverlap": true,
  "doseRouteManual": false,
  "coldExcluded": true, "nutritionExcluded": true
}
```

## 6. dry-run 실측 (프로덕션 DB, write 0)

계열별 스코프 + 앵커 (atc_code 기준, drug_category='otc'):

| ATC7 | master | otc | rx | mfr | spdMasters | anchorCand | anchorMaster | 기존 active draft |
|---|-:|-:|-:|-:|-:|---|---|-:|
| A06AB52 | 371 | 371 | 0 | 65 | 178 | 03f729e3… | 툴코맥스장용연질캡슐 | 0 |
| A06AC51 | 133 | 133 | 0 | 20 | 21 | 03472f2e… | 센스과립240포 | 0 |
| M03BB53 | 118 | 118 | 0 | 42 | 71 | 03943bd3… | 젠펜정 | 0 |
| M09AB52 | 134 | 134 | 0 | 41 | 57 | 01ee4eaf… | 에더마정 | 0 |
| A02BA53 | 28 | 28 | 0 | 11 | 20 | 0a97df59… | 파모콤푸츄정 | 0 |
| M01AE51 | 200 | 200 | 0 | 55 | 105 | 01b65563… | 이프펜더블유정 | 0 |

> 앵커 candidate = 계열 OTC master 에 연결된 candidate 중 min(id). 앵커 master 는 대표 제품(씨락정 등)이 아니라 lexical-min placeholder 이며, **실제 스코프는 seed_json**(SINGLE 선례와 동일 철학). 앵커 master 자신에 canonical SPD 가 없을 수 있으나(예 A06AB52 anchor grounpSpdId=-), **계열 전체 SPD grounding 은 확보**(spdMasters>0) → seed_json.grounding 은 계열 SPD 샘플 사용.

### 6.1 Summary

```txt
draftedRegistryGroupKeys : 27
atcFamilies              : 6
model                    : A-family (권장)
insertableDrafts(family) : 6
insertableDrafts(perGroup 대안) : 27
distinctAnchorCandidates : 6   (== family drafts)
anchorCollision(vs SINGLE 66) : 0
existingComboDrafts      : 0
rxHeavyFamilies          : 0   (전 계열 rx=0)
anchorFailFamilies       : 0
dbWrite                  : 0
```

### 6.2 검증

- **중복/충돌 0:** 6 계열 앵커 candidate 모두 `existingActiveDraft=0`, SINGLE 66행과 `collision=0`. combo master 집합은 single 그룹과 disjoint(ATC 상이) → 구조적 충돌 불가.
- **OTC 순도:** 전 계열 rx=0 → RX 혼입 flag 불필요. (SINGLE 은 파모티딘 등에서 rx_minor 있었으나 본 combo 계열은 rx 0)
- **grounding:** 전 계열 spdMasters>0 (최소 A06AC51 21, 최대 A06AB52 178). GROUNDING-DRAFT-V1 에서 원문 효능/용법/주의 확정 완료 → body 근거 충분.

## 7. content body ETL (apply 단계)

- body 소스 = GROUNDING-DRAFT-V1 §5.1~5.6 마크다운 (계열 6벌).
- apply 시 마크다운 → `content_json`(요약표/효능·효과/복용 안내/주의 대상/성분 기준 선택 구조) ETL. SINGLE apply(DRAFT-DB-APPLY-V1)의 본문 ETL 방식 준용.
- GMP "성분 기준 선택" §6 공통 문구는 apply 시 전문 삽입(현재 초안은 `(§6 공통 문구)` 축약).

## 8. apply 전 검증 SQL (작성만, 실행 금지)

```sql
-- (1) 적재 전 combo draft 부재 확인 (기대 0)
SELECT count(*) FROM product_candidate_description_drafts
 WHERE deleted_at IS NULL AND seed_json->>'applyRunId' = 'otc-combo-draft-v1';

-- (2) 앵커 candidate 유효성 (6개 모두 존재·FK OK)
SELECT c.id FROM product_candidates c
 WHERE c.id = ANY($anchorCandidateIds);   -- 6개

-- (3) 앵커 active draft 충돌 (기대 0)
SELECT candidate_id, count(*) FROM product_candidate_description_drafts
 WHERE deleted_at IS NULL AND draft_type='store_description' AND language='ko'
   AND candidate_id = ANY($anchorCandidateIds)
 GROUP BY 1 HAVING count(*) > 0;

-- (4) 적재 후 검산 (기대 6, family model)
SELECT count(*) FROM product_candidate_description_drafts
 WHERE deleted_at IS NULL AND seed_json->>'applyRunId'='otc-combo-draft-v1';
```

## 9. rollback / backup

- **rollback 키:** `source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-combo-draft-v1'` → soft delete(`deleted_at`) (SINGLE 과 동일 패턴, **단 applyRunId 를 combo 전용 `otc-combo-draft-v1` 로 분리**해 SINGLE 66행과 독립 롤백).
- **backup:** 대상 테이블이 append-only(신규 6행)이고 기존 66행 불변 → 별도 백업 스냅샷 불필요. masters·SPD·candidate 불변.
- 단일 TX + 이중 게이트(dry-run count == 실제 insert count) apply WO 에서 강제.

## 10. 금지사항 준수 확인

| 금지 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT/COUNT만) |
| product_candidate_description_drafts insert/update | ✅ 0 |
| shared_product_descriptions 변경 | ✅ 0 (read만) |
| product_drug_extensions 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| ProductMaster/Candidate 상태 변경 | ✅ 0 |
| registry 직접 변경 | ✅ 0 |
| 매장 콘텐츠 연결 | ✅ 0 |
| apply script 실행 | ✅ 0 (SQL 작성만 §8) |
| 감기약·영양제·멀미 포함 | ✅ 0 (제외) |

## 11. 완료 기준 대비

| 기준 | 결과 |
|---|:-:|
| drafted 27그룹 적재 대상 확정 | ✅ 6 계열 매핑(§2·§5) |
| 기존 draft 중복/충돌 확인 | ✅ 0 (§3·§6.2) |
| dry-run insert/update 예상 count | ✅ family 6 / perGroup 27, dbWrite 0 (§6.1) |
| seed_json/body/status 구조 확정 | ✅ §5.1~5.3·§7 |
| 실제 apply 별도 승인 WO 분리 | ✅ §12 |

## 12. 다음 WO (apply — 사용자 승인 필수)

**WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1** (별도):
- 모델 선택 확정(A-family 6 권장 / A-per-group 27)
- 마크다운(GROUNDING §5.x)→content_json ETL
- 단일 TX + 이중 게이트 + applyRunId=`otc-combo-draft-v1`
- 적재 후 검산(§8-4) + 완료 CHECK
- **사용자 승인 후에만 실행.**

---

*V1 · 2026-07-07 · drafted 27→6계열 적재 설계+dry-run · DB write 0 · 중복/충돌 0 · apply 별도 승인 WO*
