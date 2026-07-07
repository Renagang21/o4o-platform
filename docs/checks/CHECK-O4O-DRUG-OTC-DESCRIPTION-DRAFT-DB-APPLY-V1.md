# CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1

Status: DONE — 운영 DB 적재 완료 (2026-07-07). **DB write = product_candidate_description_drafts 66행 (그 외 0)**
WO: `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1`
선행: `CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1` (설계+dry-run)

Scope: 설계 WO 에서 검증된 OTC 설명 draft 를 본문 ETL 포함해 `product_candidate_description_drafts` 에 실제 적재. SharedProductDescription/canonical/ProductMaster/ProductCandidate/Identifier/Extension **무변경**.

---

## 1. 적용 전 상태 (운영 DB, 2026-07-07)

| 항목 | 값 |
| --- | --: |
| product_candidate_description_drafts 전체 | **0** |
| source_label='MFDS_DRUG_OTC' | 0 |
| product_masters | 181,241 |
| shared_product_descriptions | 19,431 |

접속: cloud-sql-proxy(127.0.0.1:15432) → tsx DataSource. 인증: gcloud ADC + Cloud Run env DB_PASSWORD(미기록).

---

## 2. 사용자 승인 + 범위 조정 (65 → 66)

설계 WO dry-run 은 **insertable 65 / excluded 1(match_fail #51)** 이었다. 이번 적용 준비 중, 제외 1건이 **데이터 문제가 아니라 fixture 인코딩 버그**임을 확인:

- 50-group §6 표가 성분명을 `엔테로코쿠스페슘…균`(`…` 축약)으로 표기 → 설계 fixture 가 이를 그대로 사용 → DB 파싱값과 불일치로 match_fail.
- 실제 DB 파싱 성분명(read-only 확인): **`엔테로코쿠스페슘스트레인세르넬레68균`** — 30밀리그램 캡슐 **27건 전량 OTC**, csv_import candidate 앵커 가능.
- 설명서 본문 §13.25 완비(효능·복용·주의·GMP 파싱 정상).

→ fixture #51 을 실제 파싱값으로 교정. **사용자 승인(2026-07-07): 66건 적재**. WO §4 "제외 1건 강제 포함 금지"는 불량 그룹 포함 금지 취지이며, 본 건은 자체 fixture 오타 교정이므로 저촉되지 않음.

교정 후 dry-run: insertable 66 / excluded 0 / contentMatched 66 / missingContent 0 / preconditionOk true / dbWrite 0.

---

## 3. 적용 대상 66건 요약

Model A(그룹당 draft 1건 + 대표 candidate 앵커). 본문 ETL: pilot/5/20/50 CHECK 문서 마크다운 → `content_json`(요약표 + 효능·효과 + 복용/사용 안내 + 주의 대상 + 성분 기준 선택 + bodyMarkdown).

| verdict | 수 |
| --- | --: |
| INSERT_auto | 41 |
| INSERT_review_flag | 11 |
| INSERT_low_ground_flag | 11 |
| INSERT_rx_minor_flag | 2 (파모티딘 10mg 정, 펙소페나딘 60mg 정) |
| INSERT_manual_flag | 1 (클로트리마졸 100mg 질정) |
| **계** | **66** |

공통 필드: `source_label=MFDS_DRUG_OTC`, `draft_type=store_description`, `language=ko`, `review_status=needs_review`, `ai_*=null`(외부 초안). 앵커 candidate 66건 distinct(dedup 충돌 0), 전부 DB 실재.

---

## 4. 적용 방식 / run 식별

- **단일 트랜잭션** INSERT 66행. `ON CONFLICT (candidate_id, draft_type, language) WHERE deleted_at IS NULL DO NOTHING`(멱등).
- 트랜잭션 내 검산: `applyRunId` 로 적재 수 == 66 확인 후 commit(불일치 시 rollback throw).
- **이중 게이트**: `--apply` + `DRUG_OTC_DRAFT_APPLY_CONFIRM=YES`.
- 사전조건 가드(위반 시 write 전 abort): existingMfdsDrugOtcRows==0, missingContent==0, distinctAnchors==insertable, anchorsExistInDb==insertable.
- **run 식별자**: `source_label='MFDS_DRUG_OTC'` + `seed_json->>'applyRunId'='otc-draft-v1'`.

실행: `npx tsx src/scripts/drug-otc-description-draft-apply.ts --apply --run-id otc-draft-v1` → `inserted: 66`.

---

## 5. 적용 후 검증 (운영 DB)

| 항목 | 기대 | 실측 |
| --- | --: | --: |
| draft total rows | 66 | **66** |
| source_label=MFDS_DRUG_OTC | 66 | 66 |
| applyRunId=otc-draft-v1 | 66 | 66 |
| review_status=needs_review | 66 | 66 |
| draft_type/language=store_description/ko | 66 | 66 |
| ai_provider IS NULL | 66 | 66 |
| dedup collision (candidate_id,draft_type,language) | 0 | **0** |
| verdict auto/review/low_ground/rx_minor/manual | 41/11/11/2/1 | 41/11/11/2/1 |
| product_masters | 181,241 | **181,241 (불변)** |
| shared_product_descriptions | 19,431 | **19,431 (불변)** |

### 유형별 샘플

- **manual:** `클로트리마졸 100mg 질정` — review_status needs_review, `content_json.usageLabel='사용 안내'`(복용 아님, 질정 처리), efficacy="칸디다성 질염에 사용합니다", flags `{manual, dose_route_manual, spd_overlap}`.
- **rx_minor:** `파모티딘 10mg 정` — rxCount 3, groupScope otc 128/rx 3, flags `{review, rx_minor, rx_present, spd_overlap}`.
- **#51 교정:** `엔테로코쿠스페슘균 30mg 캡슐` — bodyMarkdown 성분행 "엔테로코쿠스페슘 스트레인 세르넬레68균 30mg", contentPending=false.

---

## 6. 변경되지 않은 테이블 확인

| 테이블 | 상태 |
| --- | --- |
| shared_product_descriptions | insert/update **0** (19,431 불변) |
| product_masters | 변경 0 (181,241 불변) |
| product_candidates | 상태/데이터 변경 0 |
| product_identifiers / product_drug_extensions | 변경 0 |
| canonical 승격 | 0 |
| AI 호출 | 0 |

apply 스크립트는 `product_candidate_description_drafts` INSERT 문 하나만 실행(UPDATE/DELETE 경로 부재).

---

## 7. Rollback 기준 (실행은 별도 승인 필요)

이번 run 66건만 식별/제거 가능:

```sql
-- 확인
SELECT count(*) FROM product_candidate_description_drafts
WHERE source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-draft-v1' AND deleted_at IS NULL;
-- rollback(승인 후): soft delete 권장
UPDATE product_candidate_description_drafts SET deleted_at=NOW()
WHERE source_label='MFDS_DRUG_OTC' AND seed_json->>'applyRunId'='otc-draft-v1' AND deleted_at IS NULL;
```

현재 이 테이블의 유일 데이터가 본 run 이므로 소급 식별 명확.

---

## 8. 산출물 / 검증

| 파일 | 성격 |
| --- | --- |
| `apps/api-server/src/modules/neture/drug-import/drug-otc-description-draft-content.ts` | 순수: 마크다운 → content ETL 파서 |
| `apps/api-server/src/modules/neture/drug-import/drug-otc-description-draft-resolve.ts` | 공유 해상도(SELECT only) |
| `apps/api-server/src/scripts/drug-otc-description-draft-apply.ts` | apply(dry-run 기본 + --apply 이중 게이트) |
| `drug-otc-description-draft-plan.ts` | (갱신) content 병합 + #51 fixture 교정 |
| `__tests__/drug-otc-description-draft-plan.test.ts` | (갱신) 15 테스트(분류/조립/파서/#51) |

검증: `tsc --noEmit` 통과, jest **15/15**, `git diff --check` clean, 트랜잭션 내 검산 66==66, 적용 후 count 일치.

---

## 9. 후속 WO

이번 WO 는 draft 적재까지만. 다음 중 선택:

1. `WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1` — admin 에서 draft 검토 shell(read-only). 66건 needs_review 를 약사 검수.
2. `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1` — 검수 통과 draft → SharedProductDescription 승격 설계 + e약은요(spd_overlap) 정합.

미해결(설계 WO §10 유지): 테이블 적합성(candidate 앵커 placeholder), e약은요 spd_overlap 정합, 표기 변형 정규화(itemSeq/주성분코드).
