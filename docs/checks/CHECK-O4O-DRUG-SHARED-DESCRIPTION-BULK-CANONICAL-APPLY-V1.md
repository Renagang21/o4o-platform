# CHECK-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1

> **작업명**: WO-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1 (Gate apply)
> **일자**: 2026-07-04 · **성격**: apply 실행 CHECK — `shared_product_descriptions` status/curated 필드만 변경. 다른 테이블 write 0.
> **선행**: `CHECK-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1`(설명 검토 화면 + bulk dry-run, eligible 15,962).
> **목적**: bulk dry-run 안전 후보 15,962건을 master별 canonical 설명으로 일괄 승격.

---

## 1. 한 줄 결론

**e약은요 SharedProductDescription needs_review 19,431 중 안전 후보 15,962건을 canonical 로 일괄 승격 완료. master별 canonical 중복 0, 잔여 needs_review 3,469(전량 다제조사). ProductMaster/Identifier/Representative/Image 전부 불변.**

---

## 2. 실행 전 dry-run 재확인 (read-only)

| 지표 | 값 |
|---|---:|
| totalNeedsReview (mfds_easy_drug) | 19,431 |
| excludedEmptyContent | 0 |
| excludedAmbiguous (master당 >1) | 0 |
| excludedExistingCanonical | 0 |
| excludedMultiManufacturer | 3,469 |
| **eligibleForBulkCanonical** | **15,962** |

> 선행 WO dry-run(15,962)과 완전 일치 → apply 진행.

---

## 3. apply 실행

| 항목 | 값 |
|---|---|
| eligibility 판정식 | `bulkCanonicalDryRunQuery`/`bulkCanonicalApplyQuery` **단일 소스**(dry-run=apply 동일 WHERE) |
| 채널 | Cloud Run Job `o4o-drug-shared-desc-bulk-canonical` (이미지 `b2197e921`) |
| 이중 가드 | `DRUG_SHARED_DESC_BULK_CANONICAL_APPLY=I_UNDERSTAND` + `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| 사전 백업 | ✅ id **1783170319466** (SUCCESSFUL, `pre-spd-bulk-canonical-20260704`) |
| apply 방식 | set-based UPDATE: `status='canonical', curated_at=NOW(), curated_by=NULL(system bulk), updated_at=NOW()` |
| dry-run (exec 2qm6l) | eligible 15,962 / applied 0 |
| **apply (exec zwz7l, 6s)** | **applied 15,962** |

---

## 4. 검증 SQL (apply 후, read-only)

| 기준 | 결과 | 판정 |
|---|---:|:---:|
| applied | **15,962** | ✅ (=eligible) |
| mfds_easy_drug canonical | **15,962** (master 15,962) | ✅ |
| mfds_easy_drug needs_review 잔여 | **3,469** (전량 다제조사) | ✅ |
| status 합 (canonical+needs_review) | 19,431 | ✅ (=총량 불변) |
| master별 canonical 중복 | **0** | ✅ (partial unique 만족) |
| excluded 3,469 → needs_review 유지 | 3,469 = multiManuf 3,469 | ✅ |
| product_masters | 230,843 | ✅ 불변 |
| product_identifiers | 703,483 | ✅ 불변 |
| representative_products | 64,672 | ✅ 불변 |
| product_images | 2,790 | ✅ 불변 |
| Offer/Listing/StoreLocalProduct 생성 | 0 | ✅ |

---

## 5. 멱등 / 롤백

- **멱등**: 승격분은 `status='canonical'` 이 되어 재실행 시 `status='needs_review'` 필터에서 제외. `NOT EXISTS(canonical)` 로 이중 방어. 재실행 applied=0 예상.
- **롤백**: 백업 `1783170319466` 복원, 또는 `UPDATE shared_product_descriptions SET status='needs_review', curated_at=NULL, curated_by=NULL WHERE source_type='mfds_easy_drug' AND status='canonical' AND curated_by IS NULL` (system bulk 한정 — curated_by NULL 이 bulk 표식). 사용자 승인 필요.

---

## 6. admin 화면 확인 (후속)

- `admin.neture.co.kr` > O4O 상품 DB > 설명 검토: status 필터 `대표(canonical)` = 15,962 / `검토 대기` = 3,469.
- 브라우저 smoke 는 admin 로그인 필요 → 별도 보고. API/SQL 검증(§4)으로 데이터 정합성 확인 완료.

---

## 7. 후속 작업

1. **다제조사 3,469 수동 큐레이션** — 대표명/제조사 확정 후 단건 `setCanonical`(설명 검토 화면).
2. canonical 설명 → 공개 상품 상세/매장 출력 연결 (CANONICAL-OUTPUT-LINK).
3. 매장용 AI 설명 생성(별도 메뉴).

---

## 8. 준수 확인

| 항목 | 결과 |
|---|---|
| 변경 테이블 | `shared_product_descriptions` (status/curated/updated) **뿐** |
| ProductMaster/Identifier/Representative/Image 변경 | **0** (count 불변 확인) |
| Offer/Listing/StoreLocalProduct/AI 설명 생성 | 0 |
| content 변경 | 0 (status 필드만) |
| 사전 백업 | 1783170319466 |
| DB 검증 | authorized-network 임시 등록 후 원복, secret 미기록 |

---

**최종: e약은요 안전 후보 15,962 canonical 승격 완료. 잔여 3,469(다제조사)만 수동 큐레이션 대상. Core 불변.** 2026-07-04 · serviceKey·비밀 미출력.
