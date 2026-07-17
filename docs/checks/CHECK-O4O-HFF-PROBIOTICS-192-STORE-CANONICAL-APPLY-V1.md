# CHECK — HFF 유산균 192건 STORE 설명서 canonical 적재 (DB APPLY)

- 일자: 2026-07-17
- 대상: 유산균 생산 batch-001 (`prod-a-cp01..10` 작성분) **192건**. HOLD 8 · 비타민 C 범위 밖.
- 승인: 사용자 명시 실행 승인 (ko+en 동시 · `source_type=o4o_hff_generated` · 스냅샷·트랜잭션 가드·정규 서비스 경로·사후 검증).
- 스크립트: `apps/api-server/src/scripts/hff-store-description-canonical-apply.ts` (dry-run 기본 · `--apply` + `HFF_STORE_CANONICAL_APPLY_CONFIRM=YES` 이중게이트)

---

## 적재 모델 (정규 계약 준수)

| 대상 | 값 | 선례 |
|---|---|---|
| ProductMaster | barcode NULL(무바코드) · `regulatory_type='건강기능식품'` · `mfds_permit_number`=STTEMNT_NO · `is_mfds_verified=true` · status ACTIVE | drug-master-promotion-apply.buildMasterPreview |
| candidate 승격 | `matched_product_master_id`=master · `candidate_status='approved_new_master'` · reviewed_at | markCandidatePromoted |
| SPD | `description_type='STORE'` · `status='canonical'` · `source_type='o4o_hff_generated'` · `source_ref_id`=candidate.id · content=sanitizeDescriptionHtml(초안) | easy-drug-shared-description-derive |

- 본문 제작 주체 = O4O(작성·검수), grounding 원천 = MFDS HFF candidate(`source_ref_id`). `source_type`은 작성 출처를 나타내며 MFDS 원문 제공이 아님을 명확히 함.
- canonical 불변식 = DB partial-unique `(master_id, description_type, coalesce(language,'ko')) where status='canonical'` — 신규 master라 충돌 없음.

## 실행 전 가드 (트랜잭션 내)

| 가드 | 결과 |
|---|---|
| A 파일 최신 Guard 전수 | BLOCKED 0 · REVIEW 0 · draft/grounding 결손 0 |
| B candidate 192 매칭 | 1:1 · 사전승격 0 (candMatch 192) |
| C permit master 부재 | masterDup 0 |
| sanitize 무손실 | 표본 ko 1513→1513 · en 2150→2150 |

## 적재 결과 (write 768)

```text
INSERT product_masters            192
UPDATE product_candidates          192  (approved_new_master)
INSERT shared_product_descriptions 384  (ko 192 + en 192, canonical)
```

## 사후 검증 (커밋 밖 독립 연결)

| 항목 | 결과 |
|---|---|
| product_masters (tags) | 192 |
| SPD canonical STORE `o4o_hff_generated` | ko 192 · en 192 |
| candidate `approved_new_master` linked | 192 |
| canonical 중복 (master,type,lang) | 0 |
| 물 정합 스팟(데이밸런스=직접) | ko 물문구 0 · "직접 섭취" 유지 |
| SPD 물 포함 176행 | 원문 물 명시 정상 제품(근거 없는 물 = 0, 가드 BLOCKED 0 보증) |

## Rollback

- 매니페스트(비커밋, scratchpad): `hff-apply-rollback-manifest.json` — createdMasters 192 · createdSpd 384 · candIds 192 · snapshot(candidate 사전상태).
- 전량 신규 삽입 + 가역 업데이트. 롤백 = SPD 384 삭제 → candidate 192 `matched_product_master_id=NULL`·`candidate_status='pending'` 복원 → master 192 삭제.

## 범위 밖 / 후속

- 비타민 C: 중지된 별도 파일럿. 미커밋 산출물 미변경. 물 규칙 최신 Guard 소급검사 후 별도 승인·적재.
- 파일럿 152건(25·30·cp1-5): 이번 범위 밖(검증 배치).
- 이미지/대표상품/QR 연결은 별도 트랙.
