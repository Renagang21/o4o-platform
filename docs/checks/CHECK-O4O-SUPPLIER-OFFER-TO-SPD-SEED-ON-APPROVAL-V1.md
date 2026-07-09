# CHECK-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1

> 대응 WO: `WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1`
> 단계: **조사 완료 / live dry-run·apply 미실행 (재개 대기)** · 2026-07-09
> **DB write 0 / apply 0 / migration 0 / deploy 0 / approval hook wiring 0 / canonical 승격 0 / ProductMaster 수정 0.**

---

## 1. 이번 단계 성격

WO 착수 중 **코드 조사 + 설계 검증**까지 수행하고 정지한다. 프로덕션 DB 접속 환경(cloud-sql-proxy) 문제로 **live dry-run 카운트는 미실행**. dry-run 카운트가 없으므로 **apply는 진행하지 않는다**(범위 잠금 §5.1 준수).

## 2. 조사 결론 (확정)

1. **offer 승인 흐름은 SPD를 건드리지 않는다.** `offer.service.ts::approveProduct`(`/operator/products/*`, batch-approve 포함)는 `offer_service_approvals` + offer 상태(`approval_status`)만 변경. `shared_product_descriptions`(SPD) 미접촉 → 승인↔콘텐츠 단절(G1) 재확인.
2. **`supplier_product_offers` 필드**: `consumer_short_description`, `consumer_detail_description`(Tiptap HTML), `master_id`(FK→ProductMaster), `approval_status`('PENDING'|'APPROVED'|'REJECTED'), `business_short/detail_description`(이번 범위 아님).
3. **기존 `seedFromSupplierOffers`(shared-product-description.service.ts) 재사용 가능** — consumer_detail 우선, `sanitizeDescriptionHtml`, 빈 내용 skip, `existsBySourceRef(master,'supplier',offer.id)`로 중복 skip. **단, 현재 생성 `status='candidate'`** → 검토 Queue에 노출되지 않음.
4. **admin 설명서 검토 Queue의 SPD 브랜치는 `status='needs_review'`만 노출**한다(`product-description-review-queue.service.ts` UNIFIED_CTE: `FROM shared_product_descriptions s JOIN product_masters pm ... WHERE s.deleted_at IS NULL AND s.status='needs_review'`). Queue는 `source_label = s.source_type`, `descriptionType` 필터 지원.
5. **따라서 이번 WO의 supplier seed는 `createCandidate` 호출 시 `status='needs_review'`로 생성해야 한다.** (createCandidate에 status 파라미터 존재 — `candidate`가 기본이므로 명시적으로 `needs_review` 전달 필요.) → 이 교정이 이번 조사의 핵심 산출(실제 카운트보다 중요).
6. **중복 방지 기준**: `source_type='supplier'`, `source_ref_id=offer.id`, `description_type='STORE'` 기준. 동일 offer 기존 활성 seed 있으면 재생성 금지(idempotent, `existsBySourceRef` 재사용).
7. **canonical은 건드리지 않는다.** 대상 (master_id, description_type='STORE')에 canonical 있어도 별도 needs_review row로만 추가. canonical 승격은 admin 수동(별도).
8. **live dry-run 미실행** — cloud-sql-proxy 미기동(의도 포트 5432 비어있음, `bin/cloud-sql-proxy.exe` 부재로 기동 실패), 포트 5433은 로컬 postgres.exe(prod 아님)라 접속 hang. 인증 API 경로는 auto-mode 분류기 차단(직전 확인).
9. **dry-run/apply는 DB 접속 가능해진 뒤 별도 승인 하에 재개**한다.

## 3. 확정 설계 (apply 시 적용)

```text
대상: approval_status='APPROVED' AND master_id IS NOT NULL AND consumer 콘텐츠 non-empty
      (master_id 없으면 skip+로그, 후속 WO)
생성: createCandidate({ masterId, content=consumer_detail||short, summary=consumer_short,
       sourceType='supplier', sourceRefId=offer.id, status='needs_review', descriptionType='STORE' })
중복: existsBySourceRef(master,'supplier',offer.id) → skip
보존: 기존 canonical 무접촉
방식: 수동 apply(백필) · applyRunId 태깅 · rollback=해당 run soft delete
```

## 4. 준비된 dry-run 쿼리 (DB 접속 후 실행)

read-only 집계 6종(작성 완료, 코드 기준 검증):
```text
1) approved offer 총계 / master 유무
2) master 있는 approved 중 consumer 콘텐츠 non-empty / empty(skip)
3) eligible offer 중 already-seeded(skip) vs net_to_create
4) net 대상 master 중 기존 STORE canonical 보유(보존)
5) 생성 예정 샘플 5건 미리보기
6) 현재 Queue SPD needs_review 총계(apply 후 증가 예상)
```
(집계 기준: consumer_detail||short 태그 제거 후 trim <> '', source_ref_id=offer.id·source_type='supplier'·deleted_at IS NULL 로 중복 판정.)

## 5. 재개 조건

```text
1. cloud-sql-proxy 정상 기동 (start-cloud-sql-proxy.cmd, 포트 5432, 창 유지)
2. prod DB read-only dry-run 실행
3. approved offer 대상 수 / content 보유 수 / 중복 skip 수 / 생성 예정 수 확인
4. 사용자 승인
5. apply 실행 (status='needs_review')
6. Queue 노출 확인 (sourceStore='spd', source_label='supplier')
```

## 6. 금지사항 준수 (이번 단계)

```text
apply 0 / DB write 0 / approval hook wiring 0 / canonical 승격 0
ProductMaster 수정 0 / migration 0 / deploy 0
```

## 7. 조사한 파일

```
apps/api-server/src/modules/neture/services/shared-product-description.service.ts (seedFromSupplierOffers/createCandidate/existsBySourceRef)
apps/api-server/src/modules/neture/services/product-description-review-queue.service.ts (UNIFIED_CTE: SPD needs_review 노출)
apps/api-server/src/modules/neture/controllers/product-description-review-queue.controller.ts
apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts (approval_status/master_id/consumer_*)
offer.service.ts::approveProduct (승인이 SPD 미접촉)
```
