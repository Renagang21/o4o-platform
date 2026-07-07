# WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1

> **성격:** 실제 DB write 포함. **적재 = `product_candidate_description_drafts` 신규 6행까지만.** apply 는 **사용자 최종 승인 후에만 COMMIT**.
> **모델:** A-family(계열당 draft 1건, 6행) — 사용자 확정.
> **선행:** [`GROUNDING-DRAFT-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md)(drafted 27) · [`DRAFT-DB-APPLY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1.md)(설계+dry-run)
> **결과 CHECK:** [`CHECK-...-DRAFT-DB-APPLY-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1.md)

## 1. 목적

GROUNDING-DRAFT-V1 의 drafted 27 registry group_key 를 포괄하는 **6 ATC 계열 draft** 를 `product_candidate_description_drafts` 에 적재한다. body(GROUNDING §5.1~5.6 마크다운)→`content_json` ETL 포함. **draft 적재까지만** — canonical/imported 승격 없음.

## 2. 대상 (A-family 6행)

| # | ATC7 | title | registry groups | 앵커 master |
|--|---|---|-:|---|
| 1 | A06AB52 | 변비약 — 자극성 완하제 복합 | 14 | 툴코맥스장용연질캡슐 |
| 2 | A06AC51 | 변비약 — 팽창성 완하제 | 1 | 센스과립240포 |
| 3 | M03BB53 | 근이완 진통 복합 | 3 | 젠펜정 |
| 4 | M09AB52 | 소염효소 복합 | 2 | 에더마정 |
| 5 | A02BA53 | 위장약 — 파모티딘 복합 | 2 | 파모콤푸츄정 |
| 6 | M01AE51 | 이부프로펜 진통 복합 | 5 | 이프펜더블유정 |
| | | **계** | **27** | |

**제외:** needs_review 2(프라본정·캐롤에프정) · 감기약 · 영양제/비타민/미네랄 · 멀미약 A04AD51.

## 3. 적재 규격

- `source_label=MFDS_DRUG_OTC` · `draft_type=store_description` · `language=ko` · `review_status=needs_review`
- `applyRunId='otc-combo-draft-v1'` (SINGLE `otc-draft-v1` 66행과 **독립** — 별도 rollback)
- `candidate_id` = 계열 대표 앵커 candidate(min), 실제 스코프는 `seed_json`
- `content_json` = 요약표+효능·효과+복용 안내+주의 대상+성분 기준 선택(§6 GMP 전문 치환)+bodyMarkdown
- `seed_json` = familyKey/atc7/registryGroupKeys[27]/groupScope/grounding/subVariants/exclusions/applyRunId
- `ai_*` = null (외부 e약은요 근거, O4O 생성 아님)

## 4. 이중 게이트 (apply 실행 조건)

1. CLI `--apply` 플래그
2. env `DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM=YES`
3. 사전조건 전부 통과: `existingThisRunId=0` · `missingContent=0` · `distinctAnchors==insertable(6)` · `anchorsExistInDb==6` · `anchorActiveDraftConflicts=0`
4. 단일 트랜잭션 INSERT + 트랜잭션 내 검산 `applied==6` (불일치 시 rollback throw)
5. `ON CONFLICT (candidate_id, draft_type, language) WHERE deleted_at IS NULL DO NOTHING` (멱등)

## 5. 실행 명령

```bash
# dry-run (기본, write 0) — 이미 검증됨
DB_HOST=127.0.0.1 DB_PORT=6543 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
  npx tsx src/scripts/drug-otc-combo-description-draft-apply.ts

# apply (사용자 승인 후에만)
DB_HOST=127.0.0.1 DB_PORT=6543 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
  DRUG_OTC_COMBO_DRAFT_APPLY_CONFIRM=YES \
  npx tsx src/scripts/drug-otc-combo-description-draft-apply.ts --apply --run-id otc-combo-draft-v1
```

## 6. rollback

```sql
UPDATE product_candidate_description_drafts SET deleted_at=NOW()
WHERE source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-combo-draft-v1' AND deleted_at IS NULL;
-- 기대 6행. SINGLE otc-draft-v1 66행 불변.
```

## 7. 금지사항

- SharedProductDescription 변경 금지
- ProductDrugExtension 변경 금지
- ProductMaster/ProductCandidate 상태 변경 금지
- canonical/imported 승격 금지
- registry 직접 변경 금지
- 매장 콘텐츠 연결 금지
- 감기약/영양제/멀미약 포함 금지
- **사용자 최종 승인 전 `--apply` 실행 금지**

## 8. 완료 기준

- 6 family draft 적재(inserted=6)
- 트랜잭션 내 검산 6==6
- masters/SPD/candidate/extension 불변 확인
- 완료 CHECK 업데이트(DONE)

## 9. 산출물

- 본 WO
- `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1.md`
- 코드: `drug-otc-combo-description-draft-{content,plan}.ts` + `scripts/drug-otc-combo-description-draft-apply.ts`

---

*V1 · 2026-07-07 · A-family 6행 적재 · apply 사용자 승인 대기 · dry-run 검증 완료*
