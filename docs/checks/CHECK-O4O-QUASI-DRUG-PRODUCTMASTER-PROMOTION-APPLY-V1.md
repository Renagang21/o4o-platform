# CHECK-O4O-QUASI-DRUG-PRODUCTMASTER-PROMOTION-APPLY-V1

Status: DONE — **apply 완료** (운영 DB write, 2026-07-07)
WO: `WO-O4O-QUASI-DRUG-PRODUCTMASTER-PROMOTION-APPLY-V1`
선행: `CHECK-...-PRODUCTMASTER-PROMOTION-DESIGN-AND-DRYRUN-V1`(c4d205deb, 판정 GO)
승인: 사용자 "지금 실행 (백업 후)" + "candidate 상태 갱신 포함" (2026-07-07)

> **결과: 의약외품 eligible 17,148 을 ProductMaster 로 승격 완료.** product_masters +17,148 / product_identifiers +34,296(INTERNAL_O4O primary 17,148 + MFDS_CODE 17,148) / candidate 17,148 approved_new_master 전환. 취소류·노이즈 5,805 는 pending(HOLD) 보존. ProductDrugExtension/SPD/Image/Offer/Listing 생성 **0**. 단일 트랜잭션 + 사전 count 가드 + in-tx verify + COMMIT.

---

## 1. 실행 채널 / 승인 / 백업

| 항목 | 값 |
| --- | --- |
| 승인 | 사용자 "지금 실행 (백업 후)" · "candidate 상태 갱신 포함" |
| 채널 | Cloud SQL Auth Proxy(`cloud-sql-proxy`, 127.0.0.1) → psql, 단일 트랜잭션 INSERT/UPDATE |
| **사전 백업** | on-demand Cloud SQL backup **id `1783397427061`** (SUCCESSFUL, `pre-quasi-drug-productmaster-promotion-apply-20260707`) |
| 사전 스냅샷 | eligible 17,148 (candidate_id·ITEM_SEQ·barcode·mfds_product_id) — 로컬 `C:/tmp/quasi_promotion_snapshot_20260707.csv` |

## 2. 승격 매핑 (실행값)

**ProductMaster** (17,148): `barcode`=`200`+ITEM_SEQ+EAN13check · `barcode_source`=`INTERNAL` · `regulatory_type`=`QUASI_DRUG` · `drug_category`=`quasi_drug` · `regulatory_name`=`name`=ITEM_NAME · `manufacturer_name`=ENTP_NAME · `mfds_permit_number`=ITEM_NO(or null) · `mfds_product_id`=`MFDS:QUASI_DRUG:{ITEM_SEQ}` · `specification`=null · `is_mfds_verified`=true · `mfds_synced_at`=실행시각 · `tags`=`["import:mfds-quasi-drug-permit","drug_category:quasi_drug"]`.

**ProductIdentifier** (34,296 = 2/master): `INTERNAL_O4O`(value=barcode, primary, `system_generated`) + `MFDS_CODE`(value=ITEM_SEQ, `imported`). metadata 에 sourceDataset/sourceRowKey/regulatoryType/drugCategory 기록.

**ProductCandidate** (17,148): `candidate_status`=`approved_new_master` · `match_status`=`exact_identifier_match` · `matched_product_master_id`=신규 master · `reviewed_at`=now · `review_note` append `quasi_drug_productmaster_promoted(apply-quasi-promotion-v1)`.

## 3. 실행 로그

```text
BEGIN
guard0: quasi masters 기존 0 (통과)
elig CREATE TEMP: 17,148
gate: elig=17148 (통과) / intra-batch barcode dup=0 (통과) / 기존 barcode 충돌=0 (통과)
INSERT product_masters      → 17148
INSERT product_identifiers  → 34296
UPDATE product_candidates   → 17148
VERIFY OK: masters=17148 identifiers=34296 internal_primary=17148 candidates=17148
COMMIT
```

## 4. post-apply 검증 (독립 read-only)

| 지표 | 기대 | 실측 | 판정 |
| --- | ---: | ---: | :--: |
| quasi ProductMaster | 17,148 | 17,148 | ✅ |
| drug_category=quasi_drug | 17,148 | 17,148 | ✅ |
| barcode 200-prefix·len13 | 17,148 | 17,148 | ✅ |
| barcode distinct | 17,148 | 17,148 | ✅ |
| ProductIdentifier(quasi) | 34,296 | 34,296 | ✅ |
| INTERNAL_O4O primary | 17,148 | 17,148 | ✅ |
| MFDS_CODE | 17,148 | 17,148 | ✅ |
| candidate approved_new_master | 17,148 | 17,148 | ✅ |
| candidate pending(HOLD) | 5,805 | 5,805 | ✅ |
| **ProductDrugExtension(quasi)** | 0 | **0** | ✅ |
| **SharedProductDescription(quasi)** | 0 | **0** | ✅ |
| **ProductImage(quasi)** | 0 | **0** | ✅ |

**전역 델타(불변 검증):**

| 테이블 | apply 전 | apply 후 | 델타 |
| --- | ---: | ---: | ---: |
| product_masters | 181,241 | **198,389** | +17,148 |
| product_identifiers(active) | 604,132 | **638,428** | +34,296 |

샘플: `2001971002473 대일밴드 / QUASI_DRUG / quasi_drug / INTERNAL / MFDS:QUASI_DRUG:197100247 / INTERNAL_O4O:…(primary)+MFDS_CODE:197100247`.

## 5. HOLD 5,805 (승격 제외, Candidate 보존)

취소류(폐업 2,456 · 행정취소 1,433 · 취하 990 · 취소 4 = 4,883) + 정상이나 수출/군납/비매 노이즈 922 = **5,805**. 삭제하지 않고 `pending`/`unmatched` 로 Candidate 보존(Core 오염 방지). 향후 정책 변경 시 재검토.

## 6. Caveat — MFDS_CODE 공유 네임스페이스

MFDS_CODE identifier 는 의약품/e약은요와 값 공유 가능(overlap 1건). ProductIdentifier 유니크가 per-master 이므로 DB 충돌 없이 생성됨. **candidate→master 자동 매칭 시 MFDS_CODE 단독 매칭 금지** — `regulatory_type='QUASI_DRUG'` / `sourceKind='quasi_drug_permit'` 로 스코프 필수.

## 7. rollback 기준 (문서만, 미실행)

배치 격리 키 = `mfds_product_id LIKE 'MFDS:QUASI_DRUG:%'` (+ tags `import:mfds-quasi-drug-permit`). 문제 시:

```sql
BEGIN;
-- 1. identifiers 삭제
DELETE FROM product_identifiers pi USING product_masters m
 WHERE pi.product_master_id=m.id AND m.mfds_product_id LIKE 'MFDS:QUASI_DRUG:%';
-- 2. candidate 상태 원복
UPDATE product_candidates
 SET candidate_status='pending', match_status='unmatched', matched_product_master_id=NULL, reviewed_at=NULL,
     review_note = regexp_replace(review_note, ' \| quasi_drug_productmaster_promoted\(apply-quasi-promotion-v1\)$','')
 WHERE source_label='MFDS_QUASI_DRUG_PERMIT' AND candidate_status='approved_new_master';
-- 3. masters 삭제 (product_masters 는 hard delete, deleted_at 없음)
DELETE FROM product_masters WHERE mfds_product_id LIKE 'MFDS:QUASI_DRUG:%';
COMMIT;
```
> 최후 수단: 백업 `1783397427061` 복원. 실행 전 반드시 동일 WHERE count 재확인.

## 8. 준수 확인

| 항목 | 결과 |
| --- | --- |
| write 대상 | product_masters(17,148) + product_identifiers(34,296) + product_candidates 상태(17,148) **only** |
| ProductDrugExtension/SPD/Image/RepresentativeProduct/Offer/Listing/StoreLocalProduct 생성 | **0** |
| 설명서 생성 / 배포 / migration | 0 |
| 사전 백업 | ✅ 1783397427061 |
| 트랜잭션 + in-tx verify | ✅ |
| DB secret 원문 기록 | 0 |

## 9. 다음 단계 (별도 WO)

- (선택) 의약외품 공식원문 스테이징: `raw_payload.derivedOfficialText`(파서 보강 완료 e982ca606) 또는 master 기반 설명 — 승인 필요.
- 매장 상품 등록 UX 에서 의약외품 17,148 기본상품 노출/검색 연결(별도).
- candidate→master 매칭 정책은 §6 스코프 준수.

---

**최종: 의약외품 eligible 17,148 을 ProductMaster(+17,148) / ProductIdentifier(+34,296, INTERNAL_O4O primary + MFDS_CODE) 로 승격 완료했다. deterministic 내부 바코드(200+ITEM_SEQ+check)로 barcode/mfds_product_id 충돌 0, 단일 트랜잭션 + in-tx verify + COMMIT. candidate 17,148 은 approved_new_master 전환, 취소류·노이즈 5,805 는 pending(HOLD) 보존. ProductDrugExtension/SPD/Image/Offer/Listing 생성 0. 전역 델타(masters +17,148 / identifiers +34,296) 정확 일치. 사전 백업 1783397427061.**
