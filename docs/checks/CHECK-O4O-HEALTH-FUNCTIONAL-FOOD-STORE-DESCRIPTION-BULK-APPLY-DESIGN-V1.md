# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-DESIGN-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-DESIGN-V1`
> 성격: **Bulk Apply Design (read-only).** DB write·migration·table 생성·SharedProductDescription 생성·대량 저장·배포 **없음**.
> 작성일: 2026-07-04 · 트랙: 건강기능식품 전용
> 산출: 본 CHECK + [`O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1`](../design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md)(저장 상세)
> 근거: [`BULK-DRYRUN CHECK`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1.md) · [`SEED-DESIGN §6`](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1.md) · [`IR-...-SEED-STANDARD-PROCESS`](../investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md) · `SharedProductDescription.entity.ts`(실스키마)

> ⚠️ **면책**: 엔지니어링 설계. 약무/법무 유권해석 아님. 매장 노출 전 약무·법무 검토 필수(§9).

---

## 1. 결론 요약 — **GO (조건부)**

| 결정 항목 | 결론 |
|---|---|
| **저장 구조** | **Option B — `product_candidate_description_drafts` 신규 테이블** (실스키마 근거로 확정) |
| `SharedProductDescription` 직접 사용 | **불가** — `master_id NOT NULL` + canonical=master 기준, HFF는 master 부재 |
| live 소량 실측 | **불가(사유 명시)** — AiPolicyExecutor 는 live DB + 신규 scope + `AIUsageLog` write 필요 → 이 WO 범위 밖. apply WO 첫 게이트로 이관 |
| review_status | draft / needs_review / approved / rejected / hidden / deprecated (**`canonical` 미사용**) |
| flag 처리 규칙 | 확정 (§7) — 일괄 차단 아님, 검토 우선순위·생성 정책 |
| 약무·법무 게이트 | approved 전 필수 + guard FAIL → rejected/needs_review (§9) |
| 후속 apply WO 범위 | 확정 (§11) |

**한 줄 결론:** 실스키마 확인 결과 `shared_product_descriptions` 는 `master_id NOT NULL`·canonical=master 기준이라 master 없는 HFF 후보 설명을 담을 수 없다 → **후보 기반 신규 저장소 `product_candidate_description_drafts`(Option B)** 로 확정한다. live 실측은 AiPolicyExecutor 가 live DB + 신규 policy scope + `AIUsageLog` write 를 요구해 본 설계 WO 에서 수행 불가하며, **apply 구현 WO 의 첫 게이트**로 이관한다. 설계·저장구조·상태머신·flag 규칙·검토 게이트가 모두 확정되어 **apply 구현 WO 로 GO(조건부)** 다.

---

## 2. 기준 문서 및 현재 상태

| 문서 | 상태 |
|---|---|
| BULK-DRYRUN / AI-DRAFT-DRYRUN / SEED-DESIGN / OFFICIAL-TEXT-PARSER / GATE-B-PREREQUISITE / SEED-STANDARD-PROCESS CHECK/WO | ✅ 전부 존재(checkout 확인) |
| AI-USAGE-FLOW-BASELINE | ✅ 존재 |

현재 상태(재확인): ProductCandidate 44,885 / ProductMaster 승격 HOLD·NO-GO / parser 100% / seed design 완료 / dry-run 조건부 GO / **bulk eligible 40,438(90.09%)** / 비용 예측 ≈ $63.58(가정가). guard 3종 정상 오탐 0·적대 포착. **"효능/질병 표현 일괄 금지 미적용" 유지.**

---

## 3. live 소량 실측 결과 — **불가 (사유 명시)**

WO §5.1 은 `AiPolicyExecutorService.execute()` in-app 경로 사용 + standalone key 우회 금지를 요구한다. 실측 결과 **standalone 실행 불가**:

| 차단 요인 | 근거 |
|---|---|
| live DataSource 필요 | `AiPolicyExecutorService(dataSource, quotaService?)` — 프로덕션 DB 연결 필수. 로컬 TCP 방화벽 차단 + 병렬세션 authorized-networks clobber 리스크(RUNBOOK §9.2) |
| policy scope 미정의 | `ai_llm_policies` 테이블에서 scope 해결. **HFF 매장 설명용 scope(예: HFF_STORE_DESCRIPTION) 가 아직 없음** → 정의 필요 |
| `AIUsageLog` DB write | execute() 는 호출마다 `AIUsageLog` row 를 **DB 에 write** → 본 WO 의 "DB write 없음/운영 DB 저장 없음" 범위 위반 |
| API key | key 는 `ai_settings` 테이블 또는 `GEMINI_API_KEY` env. **로컬 GEMINI_API_KEY 부재** (standalone 우회 금지 준수) |

| 측정 항목 | 값 |
|---|---|
| provider / model | gemini / gemini-2.5-flash (기본 fallback) |
| policy scope | **미정의(신규 필요)** |
| 요청/성공/실패/retry/timeout | **0 / — / — / — / —** (미수행) |
| latency avg / p95 | 미측정 |
| 건당 비용 / full-run(40,438) / worst-case(44,885) | 파라메트릭 추정만: ~$0.00157 / **≈ $63.58** / **≈ $70.5** (가정가, 실측 아님) |

→ **live 실측은 apply 구현 WO 의 첫 게이트**로 이관: (a) HFF policy scope 정의, (b) 배포 환경/in-app 에서 50~100건 실측(AIUsageLog write 수용), (c) 비용·실패율·JSON 준수율·latency 확정. WO §10 "불가 사유 명시" 경로 준수.

---

## 4. 저장 구조 옵션 비교 (실스키마 기준)

`SharedProductDescription.entity.ts` 실측: `master_id uuid` **NOT NULL**, ManyToOne ProductMaster(CASCADE), canonical=master 당 1개(partial unique), source_type union 에 `ai` 존재, "매장별 override 저장소 안 만듦".

| 옵션 | 요지 | 판정 |
|---|---|:---:|
| **A. shared_product_descriptions 확장** | master_id nullable + candidate_id 추가 | ❌ **비추천** — canonical(master 기준) 정책·의약품 노출 경로 훼손, unique 재설계 회귀 위험 |
| **B. `product_candidate_description_drafts` 신설** | 후보 기반 draft 저장소 | ✅ **추천(1순위)** — master 정책 보존, candidate/canonical 분리, 타 seed 재사용, 미래 master 승격 경로 |
| C. `ProductCandidate.raw_payload` 저장 | candidate raw 에 병합 | ❌ 비추천 — 원문 보존 훼손, 검토/이력 불가, AI·source 혼재, 대량 update 위험 |
| D. 파일 산출물만 | JSONL/CSV | ❌ apply 부족 — admin/운영 연결·버전관리 불가(dry-run 한정) |

---

## 5. 추천 저장 구조 — **Option B**

`product_candidate_description_drafts` (스키마·index·재생성 정책·미래 master 링크 상세는 [저장 설계 문서](../design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md)).

핵심 컬럼: `candidate_id`(FK), `source_label`, `source_identifier_value`(STTEMNT_NO), `draft_type`, `content_json`(구조화 draft), `seed_json`(추적), `guard_result`(jsonb), `review_status`, `review_flags[]`, `ai_provider/model/policy_scope/cost_estimate`, 검토/타임스탬프.

원칙:
- 기존 공통 Core(masters/identifiers/candidates) **무변경**. `product_candidates` 는 FK 참조만.
- **HFF 전용 아닌 후보 기반 설명 공통**으로 설계(타 seed 재사용) → 신규 테이블은 중앙 리뷰(CLAUDE.md Shared Module Rule).
- 미래 ProductMaster 승격 시 draft → shared_product_descriptions 승격 경로 존재(구조 충돌 없음).

---

## 6. review status 설계

`draft → needs_review → approved`(+ rejected/hidden/deprecated). **`canonical` 미사용**(master 기준 용어, 혼동 방지). 상태머신 상세는 설계 문서 §3.

- **approved ≠ 자동 매장 노출.** approved = 매장/QR/POP/블로그 생성에서 **선택 가능한 후보**. 실제 노출은 별도 export/실행(매장 능동 행위, CLAUDE.md §11 자동생성 금지)로 분리.
- 기본 진입 status = `needs_review`(검토 전 노출 금지).

---

## 7. flag별 처리 규칙 (확정)

> 일괄 차단 아님. 검토 우선순위·생성 정책 기준. "효능/질병 일괄 금지 미적용" 유지.

| flag | 처리 규칙 |
|---|---|
| `RAW_MATERIAL_OR_OEM` (1,861) | **생성 제외**(기본). 필요 시 별도 draft_type='raw_material_note' 로 분리(소비자 설명 아님) |
| `EXPORT_ONLY` (2,826) | **생성 제외**(기본) 또는 별도 review queue(수출 표기 검토). 국내 매장 노출 대상 아님 |
| `TERSE_CLAIM` (699) | 생성 가능하되 **`needs_review` 고정** + review_flags 에 TERSE. AI 인정 어미 창작 금지 |
| `CAUTION_MISSING` (1,663) | 생성 가능. caution 블록 "표기 없음" 명시(일반 주의문구 창작 금지). needs_review |
| `MAIN_FUNCTION_MISSING` (31) | 기능성 블록 생략 + **needs_review** (창작 0) |
| `MULTI_CLAIM` (39.5%) | 생성 가능. split 결과(멀티정제 라벨 제거됨) 검수. LONG_TEXT 동반 시 토큰·비용 상방 |

eligible(원료·수출 제외) = **40,438(90.09%)**. 이 중 TERSE/MISSING/CAUTION_MISSING 은 생성하되 needs_review 강제.

---

## 8. guard 결과 저장 방식

`guard_result jsonb` 에 `{preFlags, preVerdict, draftVerdict, sourceFidelity, medicineLike, quality}` 보존(설계 문서 §5). 목적:
- 검토자가 상태 근거 추적.
- guard FAIL(`FAIL_MEDICINE_LIKE`/`FAIL_BEYOND_SOURCE`/`FAIL_CAUTION_LOSS`) row → review_status=`rejected` + review_flags 사유.
- `review_flags text[]` 는 빠른 필터용(검토 큐 정렬).

---

## 9. 약무·법무 검토 게이트

| 결정 | 값 |
|---|---|
| 위치 | **`approved` 승격 전 필수 게이트** (needs_review → approved 전이에만 존재) |
| 범위 | **전체 검토 비현실적(40,438) → 계층 샘플 검토 + guard 기반 우선순위.** guard FAIL·TERSE·MULTI_CLAIM·혈압/특정질환 언급 row 는 **필수 개별 검토** |
| guard FAIL row | 자동 `rejected`(또는 needs_review 유지) — approved 진입 차단 |
| review evidence | `reviewed_by`/`reviewed_at` + review_flags + guard_result. 검토 코멘트 컬럼은 apply WO 에서 결정 |
| 실제 수행 | **이번 WO 아님.** apply 전 게이트로 정의만 |

- 게이트는 **표현 금지 룰셋을 만드는 것이 아니라 승인 책임·흐름**을 정의(WO §5.5). guard 는 원문 이탈 검출 보조.

---

## 10. admin 검토/노출 연계 방향 (후속 범위, UI 미구현)

| 질문 | 방향 |
|---|---|
| admin O4O 상품 DB 에 "후보 설명 draft" 탭 | **예** — `/admin/o4o-product-db` 하위(후보/기본상품/설명검토/데이터정비와 동축). read → 검토 액션 |
| ProductCandidate 상세에 draft 섹션 | 예 — 후보 상세에서 해당 draft + guard_result 표시 |
| source_label + description status 필터 | 예 — 이미 후보 목록에 source_label/검색 존재(4e4c76876). draft 목록엔 review_status 필터 추가 |
| 승인 draft 의 매장/QR/POP/블로그 사용 | approved 를 **선택 가능한 후보 소스**로 노출(자동 아님). 매장 실행 시 복사/링크 |
| 미래 master 생성 시 shared 승격 | draft.approved → shared_product_descriptions(source_type=ai, status=candidate) 승격 WO(별도) |

---

## 11. 후속 bulk apply WO 범위

**GO** → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1`. 범위(순서):
1. **HFF policy scope 정의** (`ai_llm_policies` 에 HFF_STORE_DESCRIPTION scope) + **live 소량 실측(50~100건)** — 비용·실패율·JSON 준수율·latency 확정(이 WO 미수행분).
2. `product_candidate_description_drafts` **migration + entity** (승인 후).
3. bulk apply 실행(eligible 40,438, 원료·수출 제외): AI 생성 → guard 분류 → draft INSERT(review_status=needs_review). 배치·재개·idempotent.
4. **약무·법무 검토 게이트**(§9) — approved 승격은 검토 후.
5. admin 검토 UI/API(§10) — 별도 WO 가능.
- 이중 가드(apply 승인 env) + 백업 + 검증 SQL(런북 계열).

### PARTIAL/HOLD 조건 대비
- 본 설계는 §8.1 GO 대부분 충족(저장구조·flag·게이트·범위 확정). **live 실측만 미완**이라 apply WO 의 첫 단계로 이관 → 실측 결과 나쁘면(비용/실패율 과다) 그때 PARTIAL(scope/prompt 보완)로 회귀.

---

## 12. 비범위 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / migration / table 생성 | 0 |
| SharedProductDescription / ProductMaster / ProductIdentifier 생성 | 0 |
| ProductCandidate status 변경 | 0 |
| 대량 생성 apply / 전체 live 호출 | 0 |
| admin UI / 매장·QR·POP 노출 / 배포 | 0 |
| 효능/질병 표현 금지 룰셋 | 0 (guards=원문충실도/의약품/품질 성격) |
| live 호출 수/비용/실패율 | 0회 기록 + 불가 사유 명시(§3) |
| shared_product_descriptions 판단 | **실스키마(entity) 기준**(master_id NOT NULL 확인) |
| secret/API key 문서화 | 0 (env·scope명만) |

**검증(문서 변경만):**
```
git diff --check   → clean
git status --short → docs/checks/CHECK-...-BULK-APPLY-DESIGN-V1.md + docs/design/...-DRAFT-STORAGE-V1.md
```

**최종:** 실스키마 확인으로 `shared_product_descriptions` 직접 사용 불가를 확정하고 **`product_candidate_description_drafts`(Option B)** 저장 구조·상태머신·flag 규칙·검토 게이트·admin 연계·apply WO 범위를 확정했다. live 실측은 in-app DB+scope+AIUsageLog write 를 요구해 apply WO 첫 게이트로 이관(불가 사유 명시). 판정 **GO(조건부)** → BULK-APPLY-V1.
