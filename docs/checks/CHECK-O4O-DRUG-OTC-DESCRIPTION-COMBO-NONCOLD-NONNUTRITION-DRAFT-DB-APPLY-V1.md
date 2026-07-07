# CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1

> **Status: DONE — 운영 DB 적재 완료 (2026-07-07, 사용자 승인 후 --apply)**
> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1
> **DB write: `product_candidate_description_drafts` 6행** (그 외 0). inserted=6, 트랜잭션 내 검산 6==6. draft 테이블 66→**72**.
> **선행:** [`GROUNDING-DRAFT-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md) · [`DRAFT-DB-APPLY-DESIGN-V1`](CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1.md)

---

## 1. 진행 절차 (사용자 지정 순서)

| 단계 | 상태 |
|---|:-:|
| 1. apply WO 작성 | ✅ |
| 2. 마크다운 body → content_json ETL 결과 확인 | ✅ (6/6 파싱) |
| 3. insert 예정 6행 최종 preview | ✅ (§4) |
| 4. 단일 TX apply SQL/script 준비 | ✅ (§5) |
| 5. 실행 직전 이중 게이트 | ✅ (§3, dry-run 통과) |
| 6. 사용자 최종 승인 후 실제 COMMIT | ✅ **완료 (inserted=6)** |

## 2. content_json ETL 결과 (오프라인 파싱, 6/6)

GROUNDING-DRAFT-V1 §5.1~5.6 마크다운 → `extractComboDraftsFromDoc`(inline `**효능·효과** 본문` 형식 파서).

| ATC7 | contentLabel | 요약표 키 | 효능·효과 | 복용 안내 | 주의 대상 | §6 GMP |
|---|---|:-:|:-:|:-:|:-:|:-:|
| A06AB52 | 변비약 — 자극성 완하제 복합 정/캡슐 | 6 | ✅ | ✅ | ✅ | 전문 치환 |
| A06AC51 | 변비약 — 팽창성 완하제 과립 | 6 | ✅ | ✅ | ✅ | 전문 치환 |
| M03BB53 | 근이완 진통 복합 정 | 6 | ✅ | ✅ | ✅ | 전문 치환 |
| M09AB52 | 소염효소 복합 정 | 6 | ✅ | ✅ | ✅ | 전문 치환 |
| A02BA53 | 위장약 — 파모티딘 복합 정 | 6 | ✅ | ✅ | ✅ | 전문 치환 |
| M01AE51 | 이부프로펜 진통 복합 정/연질캡슐 | 6 | ✅ | ✅ | ✅ | 전문 치환 |

- `(§6 공통 문구)` placeholder → 가이드 §6 GMP "성분 기준 선택" 전문 자동 치환(`GMP_INGREDIENT_SELECTION_TEXT`).
- `bodyMarkdown` 원문 무손실 보존.

## 3. 이중 게이트 / 사전조건 (dry-run 실측, write 0)

```txt
mode               : dry-run
runId              : otc-combo-draft-v1
insertable(family) : 6
registryGroupCover : 27
preconditions      : { existingThisRunId:0, draftTableTotalRows:66, insertable:6,
                       distinctAnchors:6, anchorsExistInDb:6, anchorActiveDraftConflicts:0,
                       contentMatched:6, missingContent:0, excluded:0 }
preconditionOk     : true
inserted / dbWrite : 0 / 0
```

- **기존 draft 66행(SINGLE otc-draft-v1) 불변**, combo runId 기존 0.
- 앵커 6개 전부 DB 실재, 활성 draft 충돌 0, exact 중복 0.
- apply 실행 조건: `--apply` + `DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM=YES` + 사전조건 통과 + 단일 TX 검산 6==6.

## 4. insert 예정 6행 preview

| # | title | anchor(앵커master) | registry groups | grounding(spd) | flags |
|--|---|---|-:|-:|---|
| 1 | 변비약 — 자극성 완하제 복합 (정/캡슐) | 03f729e3…(툴코맥스장용연질캡슐) | 14 | 178 | combo·pharmacist_review·spd_grounded·laxative_stimulant·chronic_use_caution |
| 2 | 변비약 — 팽창성 완하제 (과립) | 03472f2e…(센스과립240포) | 1 | 21 | …·laxative_bulk |
| 3 | 근이완 진통 복합 (정) | 03943bd3…(젠펜정) | 3 | 71 | …·apap_overlap·drowsiness |
| 4 | 소염효소 복합 (정) | 01ee4eaf…(에더마정) | 2 | 57 | …·anticoagulant_caution |
| 5 | 위장약 — 파모티딘 복합 (정) | 0a97df59…(파모콤푸츄정) | 2 | 20 | …·renal_caution |
| 6 | 이부프로펜 진통 복합 (정/연질캡슐) | 01b65563…(이프펜더블유정) | 5 | 105 | …·nsaid·cardiovascular_caution |

각 행: `review_status=needs_review`, `source_label=MFDS_DRUG_OTC`, `applyRunId=otc-combo-draft-v1`, `content_json`(효능/복용/주의/GMP 전문/bodyMarkdown), `seed_json.registryGroupKeys`(계열 소속 group_key 전체), `guard_result`(verdict=INSERT_combo_review, rxPurity=1.0, groundingEasyDrug=spd).

## 5. 산출 코드 (검증됨)

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/drug-otc-combo-description-draft-content.ts` | 순수: GROUNDING §5 inline 마크다운 → content ETL 파서 |
| `apps/api-server/src/modules/neture/drug-import/drug-otc-combo-description-draft-plan.ts` | 순수: 6 family fixture + classify + buildRow + §6 GMP 전문 |
| `apps/api-server/src/scripts/drug-otc-combo-description-draft-apply.ts` | apply(dry-run 기본 + --apply 이중 게이트) + resolve(SELECT only) |

검증: `tsc --noEmit` 통과 · ETL 오프라인 6/6 파싱 · 프로덕션 dry-run preconditionOk=true, dbWrite=0.

## 6. rollback / 불변식

- rollback: `source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-combo-draft-v1'` soft delete(기대 6행). SINGLE 66행 독립·불변.
- apply 는 INSERT 문 하나만(UPDATE/DELETE 경로 부재). masters/SPD/candidate/extension **무변경**.

## 7. 금지사항 준수 (현재 시점 — dry-run)

| 금지 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (dry-run) |
| SharedProductDescription 변경 | ✅ 0 |
| ProductDrugExtension 변경 | ✅ 0 |
| ProductMaster/Candidate 상태 변경 | ✅ 0 |
| canonical/imported 승격 | ✅ 0 |
| registry 직접 변경 | ✅ 0 |
| 매장 콘텐츠 연결 | ✅ 0 |
| 감기약/영양제/멀미 포함 | ✅ 0 (제외) |
| **승인 전 --apply 실행** | ✅ 0 (대기) |

## 8. apply 실행 결과 (사용자 승인 후, 2026-07-07)

```txt
mode: apply   runId: otc-combo-draft-v1
preconditionOk: true (existingThisRunId 0 · distinctAnchors 6 · anchorsExistInDb 6 · anchorActiveDraftConflicts 0 · missingContent 0)
inserted: 6   dbWrite: 6   트랜잭션 내 검산: 6 == 6 (commit)
```

**적재 후 불변식 검증(read-only):**

| 항목 | 기대 | 실측 |
|---|--:|--:|
| product_candidate_description_drafts 총계 | 72 | **72** (66+6) |
| combo runId(otc-combo-draft-v1) | 6 | **6** |
| SINGLE runId(otc-draft-v1) 불변 | 66 | **66** |
| combo 6행 review_status | needs_review | **needs_review** (전부) |
| registryGroups 합 | 27 | **27** (14+1+3+2+2+5) |
| distinct 앵커 candidate | 6 | **6** (anchorOk=true) |
| product_masters | 불변 | **198,389** |
| shared_product_descriptions | 불변 | **19,431** |
| product_drug_extensions | 불변 | **177,413** |

- **rollback 가능:** `source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-combo-draft-v1'` soft delete(6행). SINGLE 66행 독립·불변.
- masters/SPD/candidate/extension **무변경** 확인. canonical/imported 승격 없음(전 행 needs_review).

---

*V1 · 2026-07-07 · DONE · A-family 6행 적재 완료 · inserted=6 · 검산 6==6 · draft 66→72 · SINGLE 66/masters/SPD/ext 불변*
