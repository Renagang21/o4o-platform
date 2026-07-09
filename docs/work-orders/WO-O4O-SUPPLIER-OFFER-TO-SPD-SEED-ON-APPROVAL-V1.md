# WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1

> 상태: **작업요청서 (Draft)** — 착수 전. 본 문서는 핸드오프용이며, 별도 착수 지시 전까지 조사·구현을 시작하지 않는다.
> 작성일: 2026-07-09 · 선행 IR: [IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1](../investigations/IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1.md) (G1)

---

## 1. 작업명

`WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1`

## 2. 목적

공급자 offer가 **승인될 때**, 공급자가 제공한 제품 설명/이미지/특징 정보를 **ProductMaster 기준 제품 콘텐츠 seed(needs_review)**로 연결한다.

이것은 "공급자 콘텐츠가 제품 콘텐츠 DB로 들어오는 관문"이다. 이 관문이 있어야 이후 흐름이 이어진다:

```text
공급자 offer → (승인) → 제품 콘텐츠 seed(needs_review) → admin 검토 → 승인 콘텐츠(canonical)
→ 운영자 큐레이션 → 매장 가져오기(사본) → 매장 콘텐츠 → QR/POP/태블릿/상담
```

핵심 흐름(이번 WO 범위):

```text
공급자 offer 승인
→ 공급자 제공 제품 정보 추출(consumer/business 설명 등)
→ ProductMaster 기준 SPD seed 또는 description draft 생성
→ needs_review 상태
→ admin 설명서/제품 콘텐츠 검토 Queue로 연결
```

## 3. 배경 (선행 조사에서 확정된 사실 — G1)

IR-...-WORKFLOW-AUDIT-V1에서 확인:

- 공급자 콘텐츠는 `supplier_product_offers` row에 존재(consumer/business × short/detail 설명, Tiptap HTML). offer는 `master_id` FK로 ProductMaster에 연결.
- offer 승인(`offer.service.ts::approveProduct`, `/operator/products/*`)은 `offer_service_approvals` + offer 상태만 바꾸고 **`shared_product_descriptions`(SPD)를 건드리지 않는다** → 승인↔콘텐츠 단절(G1).
- SPD로의 적재는 현재 **admin 수동** `POST /by-master/:masterId/seed`(`seedFromSupplierOffers`)뿐이며, **consumer 필드만·`status='candidate'`·`description_type='STORE'`**로 들어감.
- `SUPPLIER_STORE` descriptionType은 소비만 되고 생산 경로 0건(G2 — 별도 WO).

→ 이번 WO는 이 단절(G1)을 **승인 시점 자동/원클릭 seed**로 연결한다. G2(SUPPLIER_STORE 산출)·매장 노출·운영자 큐레이션·OSMU는 범위 외.

## 4. 기준 저장소

```powershell
cd c:\Users\home\coding\o4o-platform
git pull origin main
git status --short
```

Linux `/workspace` 미사용. 동시 세션 WIP 미접촉.

## 5. 이번 작업의 성격 / 착수 방식

- **1단계(이번 WO 문서 이후 착수 시): 조사 우선.** 승인 흐름·seed 대상·중복/보존 기준을 확정한 뒤 최소 구현 범위를 잡는다.
- offer 승인은 **DB write 발생 시점**이므로, seed를 어디에·어떤 status로 만들지 명확히 한 뒤에만 구현한다.
- 구현은 **dry-run → 이중게이트 승인 → apply** 순서. write는 승인 후에만.

## 6. 중요 원칙 (불변식)

```text
- 공급자 콘텐츠를 매장에 바로 노출하지 않는다.
- canonical 자동 승격 금지. 생성물은 seed/draft/needs_review 성격.
- 기존 O4O 표준 설명서(canonical) 덮어쓰기 금지. 기존 canonical 있으면 보존.
- ProductMaster 수정 최소화(가능하면 0). Freeze/F12 준수(ProductMaster는 Resource를 모른다).
- 가져오기=복사 원칙 유지.
- QR 자체 구현 논의 제외.
- 매장 콘텐츠 생성은 범위 외.
- 운영자 큐레이션 / OSMU 변환 범위 외.
- 콘텐츠 작성 불변식(grounding·과장 금지)은 상위 문서 유지 — 단 이번은 "공급자 제공 원문 이관"이지 신규 창작이 아님.
```

## 7. 먼저 조사할 것 (착수 시)

```text
1. SupplierProductOffer 승인 흐름 — approveProduct / batch-approve 경로, 트랜잭션 경계
2. offer 승인 시 실행되는 서비스/API/controller (operator-product-approval.controller.ts → offer.service.ts)
   - 승인 성공 지점(훅 삽입 위치) 정확히 특정
3. offer에 저장된 공급자 제공 설명/이미지/metadata 필드
   - consumer_short/detail_description, business_short/detail_description, 이미지(어디 저장? media_assets/URL)
4. offer ↔ ProductMaster 연결 방식 (master_id, RESTRICT/nullable 여부)
5. ProductMaster가 없을 때의 처리 (bulk candidate 경로/offer master 부재 케이스)
6. shared_product_descriptions 구조 (status/description_type/source_type/source_ref_id/language/canonical unique)
7. product_candidate_description_drafts 구조 (review_status/source_label/candidate_id)
8. 기존 설명서 Review Queue와 연결 가능한지
   - /admin/o4o-product-db/description-review-queue 가 무엇을 읽는지(drafts?), /admin/shared-product-descriptions 와의 관계
9. 중복 seed 방지 기준 (source_ref_id=offer.id 존재 여부, content 해시, (master, description_type, source_type) 유니크)
10. rollback 기준 (source_label/applyRunId soft delete 관례 — 기존 otc-draft-v1 방식 참조)
```

## 8. 승인 시 seed 생성 대상 (설계안 — 조사 후 확정)

두 후보를 조사해 택1(또는 조건 분기):

| 후보 | 대상 | 장점 | 단점 |
|---|---|---|---|
| **A. SPD 직접 seed** | `shared_product_descriptions` (source_type='supplier', status='needs_review', description_type='STORE') | 기존 seedFromSupplierOffers 재사용, master 직접 연결 | master 필수 |
| **B. draft 풀** | `product_candidate_description_drafts` (review_status='needs_review', source_label='SUPPLIER_OFFER') | master 없어도 가능 | 별도 승격 단계 필요 |

권장 기본: **master 있으면 A, 없으면 B(또는 skip+로그)**. 최종은 조사 후 확정.

- 추출 필드: consumer_short/detail(우선), business_*는 별도 description_type=B2B 후보로 둘지 조사(기본은 consumer만, 최소 범위).
- 트리거: 단건 승인 + batch-approve 모두 커버. 훅은 승인 트랜잭션 성공 후(가능하면 동일 TX, 실패 시 승인 롤백 영향 최소화 — 조사 후 결정).

## 9. seed / draft status 기준

```text
생성 status = needs_review (canonical 아님, candidate보다 명시적으로 "검토 대기")
source_type = supplier
source_ref_id = offer.id
description_type = STORE (SUPPLIER_STORE 산출은 G2 별도 WO)
language = offer 콘텐츠 언어(기본 ko)
```

## 10. 기존 canonical 보존 기준

```text
- 해당 (master_id, description_type) 에 canonical 이 이미 있으면 → 건드리지 않는다.
- seed 는 항상 needs_review 로만 추가(별도 row). canonical 승격은 admin 수동(별도).
- 기존 needs_review/candidate 가 동일 출처(offer)로 이미 있으면 → 중복 생성 금지(§11).
```

## 11. 중복 생성 방지 기준

```text
- 동일 offer(source_ref_id=offer.id) 로 이미 생성된 활성 seed 가 있으면 재생성 금지(idempotent).
- 재승인/재실행 시에도 중복 적재 없음(ON CONFLICT DO NOTHING 또는 존재검사).
- content 무변경 재승인 → skip. content 변경 시 정책(신규 needs_review row vs 기존 갱신)은 조사 후 확정.
```

## 12. dry-run 기준

```text
- write 없이: 승인 대상 offer N건 중 seed 생성 예정 건수/skip(중복·master부재·빈 content) 분류 집계.
- 샘플 5~10건: 어떤 필드가 어떤 SPD/draft row 로 갈지 미리보기(JSON).
- 기존 canonical 충돌 0 확인.
```

## 13. apply 승인 게이트

```text
- dry-run 결과 사용자 승인 후에만 apply.
- 단일 트랜잭션 + applyRunId 태깅(예: supplier-offer-seed-v1).
- 이중게이트: (1) dry-run 리뷰 (2) apply 명시 승인.
- 승인 훅 실배선(런타임 자동 트리거)은 별도 단계로 분리 가능 — 우선 수동 apply/백필로 검증 후 훅 배선.
```

## 14. 검증 SQL (예시 — 착수 시 확정)

```sql
-- 승인된 offer 중 supplier seed 미생성 건수
SELECT count(*) FROM supplier_product_offers o
WHERE o.approval_status='APPROVED' AND o.master_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                  WHERE s.source_ref_id=o.id AND s.source_type='supplier' AND s.deleted_at IS NULL);

-- apply 후 생성된 seed 상태 분포
SELECT status, count(*) FROM shared_product_descriptions
WHERE source_type='supplier' AND deleted_at IS NULL GROUP BY status;

-- canonical 충돌 0 확인(같은 master,type 에 canonical + 신규 needs_review 공존은 정상)
SELECT master_id, description_type, count(*) FILTER (WHERE status='canonical')
FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY 1,2 HAVING count(*) FILTER (WHERE status='canonical') > 1;
```

## 15. rollback 기준

```text
- applyRunId 로 태깅 → rollback 은 해당 run 의 seed row soft delete(deleted_at) — 기존 otc-draft-v1 관례 준수.
- ProductMaster/offer 원본 무변경이므로 rollback 은 seed row 한정.
```

## 16. 이번 WO에서 하지 않을 것

```text
canonical 자동 승격 / 기존 canonical 수정·삭제
SUPPLIER_STORE descriptionType 산출 (G2 별도)
매장 콘텐츠 생성 / 매장 노출
운영자 큐레이션 / OSMU 변환
QR/POP/태블릿 생성
ProductMaster 신규 생성·수정(최소화, 가능하면 0)
migration(가능하면 회피; 불가 시 후속 분리)
공급자 콘텐츠 신규 창작(제공 원문 이관만)
```

## 17. CHECK 작성 기준

완료 시 `docs/checks/CHECK-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1.md`:

```text
- 조사한 승인 흐름/서비스/테이블
- seed 생성 대상(A/B) 결정 및 근거
- status/보존/중복방지 기준 적용 결과
- dry-run 집계 + apply 결과(생성 건수/skip)
- canonical 충돌 0 확인
- 검증 SQL 결과
- rollback 방식
- 하지 않은 것 / 후속 WO
- DB write 내역(승인 후에만), migration 여부
```

## 18. 완료 기준

```text
1. 승인 흐름·seed 대상·보존·중복·rollback 기준 확정
2. dry-run 통과(집계·샘플)
3. 이중게이트 승인 후 apply
4. needs_review seed 생성, canonical 보존·충돌 0
5. admin 검토 Queue에서 신규 seed 확인 가능
6. 검증 SQL 통과, CHECK 작성, commit/push
```

## 19. 후속 WO 후보

```text
WO-O4O-PRODUCT-CONTENT-SUPPLIER-STORE-PRODUCER-V1 (G2 — SUPPLIER_STORE 산출)
WO-O4O-PRODUCT-CONTENT-STATUS-AND-HISTORY-MODEL-V1 (G3 — 제출/반려/이력)
WO-O4O-SUPPLIER-OFFER-SEED-APPROVAL-HOOK-WIRING-V1 (수동 apply→런타임 훅 배선 분리 시)
WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1 (G4)
```

## 20. Git 규칙

```text
git pull origin main; git status --short
git add . 금지 → 변경 파일만 path-specific
문서만: docs(o4o): add supplier-offer to spd seed on approval WO
구현 시: feat(o4o): seed supplier offer content to spd on approval
```

---

> 본 문서는 작업요청서(핸드오프)다. **바로 코드 구현하지 않는다.** 착수 지시 시 §7 조사 → §12 dry-run → §13 apply 순으로 진행한다.
