# O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1

> 성격: **설계 문서 (design only).** DB write·migration·table 생성·배포 **없음**. 스키마·상태머신·연결전략 설계.
> 상위 CHECK: [`CHECK-...-BULK-APPLY-DESIGN-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-DESIGN-V1.md)
> 작성일: 2026-07-04 · 트랙: 건강기능식품 전용

---

## 1. 배경 — 왜 신규 저장소인가 (실스키마 근거)

`shared_product_descriptions` **실측 스키마**(`SharedProductDescription.entity.ts`):
- `master_id uuid` **NOT NULL** + `ProductMaster` FK(onDelete CASCADE).
- canonical = **master 당 1개** (partial unique index, master_id 기준).
- source_type union: supplier/operator/ai/store_contribution/drug_extension/mfds_easy_drug/migration/manual.
- status union: candidate/**canonical**/hidden/needs_review/deprecated.
- 원칙: "ProductMaster(barcode SSOT) 기준. StoreLocalProduct off-catalog 제외. 매장별 override 저장소 안 만듦."

건강기능식품은 **ProductMaster 부재**(Gate B HOLD, barcode/상태 원천 NO-GO). 따라서 `master_id NOT NULL` FK 를 만족할 수 없다. `shared_product_descriptions` 에 저장하려면 `master_id` 를 nullable 로 바꾸고 canonical unique(master 기준)를 재설계해야 하는데, 이는 **의약품 canonical 설명 정책·노출 경로를 훼손**한다(F5 Content Stable 계열 회귀 위험). → **별도 후보 기반 draft 저장소 신설**이 정합.

---

## 2. 테이블 설계 — `product_candidate_description_drafts` (신설안, 미구현)

> 이번 WO 는 **설계까지**. CREATE TABLE / migration 은 apply 구현 WO 에서 승인 후 수행.

```sql
CREATE TABLE product_candidate_description_drafts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id            uuid NOT NULL REFERENCES product_candidates(id) ON DELETE CASCADE,
  source_label            varchar(128) NOT NULL,          -- 예: MFDS_HEALTH_FUNCTIONAL_FOOD
  source_identifier_value varchar(255),                   -- STTEMNT_NO (추적/조인)
  draft_type              varchar(64)  NOT NULL,          -- store_description / pop / blog (초기 store_description)
  language                varchar(16)  NOT NULL DEFAULT 'ko',
  title                   text,
  summary                 text,
  content_json            jsonb NOT NULL,                 -- HealthFunctionalFoodStoreDescriptionDraft (구조화)
  content_html            text,                           -- 렌더 결과(선택, 후속)
  seed_json               jsonb NOT NULL,                 -- 생성 입력 seed(추적성)
  guard_result            jsonb NOT NULL,                 -- {preFlags, verdict, sourceFidelity, medicineLike, quality}
  review_status           varchar(32)  NOT NULL DEFAULT 'needs_review',
  review_flags            text[]       NOT NULL DEFAULT '{}',
  ai_provider             varchar(64),                    -- gemini
  ai_model                varchar(128),                   -- gemini-2.5-flash
  ai_policy_scope         varchar(128),                   -- 신규 scope (예: HFF_STORE_DESCRIPTION)
  ai_cost_estimate        numeric(12,6),
  generated_at            timestamp,
  reviewed_by             uuid,
  reviewed_at             timestamp,
  created_at              timestamp NOT NULL DEFAULT now(),
  updated_at              timestamp NOT NULL DEFAULT now(),
  deleted_at              timestamp
);
```

**index (partial, deleted_at IS NULL):**
- `(candidate_id, draft_type, language)` — 후보당 draft 조회 + 재생성 dedup 축
- `(source_label, review_status)` — 트랙별 검토 큐
- `(review_status, created_at)` — 검토 대기열 시간순
- `(source_identifier_value)` — STTEMNT_NO 역조회

**재생성 정책(멱등):** 동일 `(candidate_id, draft_type, language)` 는 UPDATE(버전 교체) 또는 이전분 `deprecated` 후 INSERT. 히스토리 필요 시 후자. apply WO 에서 확정.

**공통 Core 주의(CLAUDE.md Shared Module Rule):** 신규 테이블이므로 기존 공통 Core(product_masters/identifiers/candidates) 무변경. `product_candidates` 는 FK 참조만(구조 변경 없음). 단 이 저장소를 HFF 전용이 아니라 **후보 기반 설명 공통**으로 설계(다른 seed 트랙 재사용) → 신규 시 중앙 리뷰.

---

## 3. review_status 상태 머신

> `canonical` 은 **ProductMaster 기준 용어**(shared_product_descriptions 전용) → candidate draft 에는 **사용 안 함**(의미 혼동 방지).

```
draft ──(생성 완료)──▶ needs_review ──(약무·법무/운영 검토 승인)──▶ approved
                           │                                          │
                           ├─(반려)──▶ rejected                       ├─(노출 중단)──▶ hidden
                           │                                          │
guard FAIL / 원료·수출 ────┘                            (신규 원문/재생성)─▶ deprecated
```

| status | 의미 | 진입 |
|---|---|---|
| `draft` | 생성 직후(검토 전) | AI 생성 |
| `needs_review` | 검토 대기 (기본) | 생성 완료 / TERSE·MISSING flag |
| `approved` | 검토 승인(노출 가능 후보) | 검토자 승인 |
| `rejected` | 반려 | guard FAIL / 검토 반려 |
| `hidden` | 승인됐으나 비노출 | 운영 판단 |
| `deprecated` | 구버전(재생성으로 대체) | 재생성 |

- **approved ≠ 자동 매장 노출.** approved 는 "매장/QR/POP/블로그 생성에서 **선택 가능한 후보**" 상태이며, 실제 노출은 별도 export/실행(매장 능동 행위, CLAUDE.md §11 자동생성 금지)로 분리.

---

## 4. 미래 ProductMaster 연결 전략 (Gate B 해제 시)

건강기능식품이 향후 barcode/상태 원천 확보로 ProductMaster 승격되면:
1. `product_candidate_description_drafts.approved` 중 대상 후보를 식별(candidate_id → matched master).
2. **draft → `shared_product_descriptions` 승격(promotion/link)**: source_type=`ai`(또는 신규 `hff_ai`), master_id=승격된 master, status=candidate(검토 후 canonical 1개).
3. 승격은 **별도 WO + apply 승인**. draft 저장소는 그대로 두고(이력), shared 로 복제·링크.
- 즉 candidate draft 저장소는 **shared canonical 의 전 단계 버퍼**이며, master 생성 시 자연 승격 경로가 있다(구조 충돌 없음).

---

## 5. guard_result 저장 스키마 (jsonb)

```jsonc
guard_result = {
  preFlags: ["MULTI_CLAIM", ...],              // computePreFilterFlags
  preVerdict: "ELIGIBLE_FOR_GENERATION",       // classifyPreGeneration
  draftVerdict: "PASS_READY_FOR_REVIEW",       // classifyDraft (live 생성 후)
  sourceFidelity: { beyondSource: false, reasons: [] },
  medicineLike:   { medicineLike: false, hits: [] },
  quality:        { issues: [] }
}
```
- 검토자가 왜 이 상태인지 추적 가능. guard FAIL row 는 review_status=`rejected` + review_flags 에 사유.

---

## 6. 비범위 / 다음

- 본 문서는 설계. CREATE TABLE·entity·migration·admin API/UI 는 apply 구현 WO(승인 후).
- live 실측(비용/latency/실패율)은 apply WO 의 **첫 게이트**(in-app AiPolicyExecutor + 신규 scope + AIUsageLog write 수용).
- 약무·법무 검토 게이트는 approved 전 필수(상위 CHECK §9).
