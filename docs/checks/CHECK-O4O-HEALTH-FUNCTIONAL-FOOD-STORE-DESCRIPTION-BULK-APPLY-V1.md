# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1`
> 성격: **저장 인프라 구현 + bulk draft dry-run.** live AI 생성·DB row 저장·admin 노출·approved 처리 **없음**(live 게이트 실패로 apply 중단).
> 작성일: 2026-07-04 · 트랙: 건강기능식품 전용
> 산출: migration + entity(+register) + service(+test) + CLI + 본 CHECK
> 근거: [`BULK-APPLY-DESIGN CHECK`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-DESIGN-V1.md) · [`저장 설계`](../design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md) · [`BULK-DRYRUN`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1.md)

> ⚠️ **면책**: 엔지니어링. 약무/법무 유권해석 아님. approved 전 약무·법무 검토 필수(§9).

---

## 1. 결론 요약 — 저장 인프라 구현 완료 / **bulk apply 는 live 게이트 실패로 중단(§4)**

| 항목 | 결과 |
|---|---|
| live 50~100건 소량 실측 | ❌ **불가(게이트 실패)** — GEMINI_API_KEY 부재 + HFF scope 미정의 + AiPolicyExecutor 는 live DB+AIUsageLog write 필요 |
| **→ WO §4/§6.4 규칙 적용** | **저장 인프라 구현까지만 진행, bulk apply(생성·저장) 중단** |
| migration | ✅ `product_candidate_description_drafts` (additive CREATE TABLE, deploy 시 **빈 테이블** 생성) |
| entity + 등록 | ✅ `ProductCandidateDescriptionDraft.entity.ts` (ESM-safe) + 레지스트리 등록 |
| service + 순수 helper | ✅ upsert/count + `buildDescriptionDraftRow`(순수) |
| CLI | ✅ dry-run(실행 가능) + `--apply`(이중 게이트 → 중단) |
| tests | ✅ **jest 67/67 PASS** (parser/official-text/guards/draft-service) |
| dry-run 대상 산정 | ✅ scanned 44,885 / **eligible 40,438** / excludedRaw 1,861 / excludedExport 2,826 (bulk-dryrun 정합) |
| DB row 저장 / 불변 테이블 write | **0** (apply 미실행) |

**한 줄 결론:** WO §4 단계 게이트대로 진행했다. **live 소량 실측이 standalone 에서 불가(GEMINI_API_KEY 부재·HFF policy scope 미정의·AiPolicyExecutor 의 live DB+AIUsageLog write 요구)** 하여 §6.4에 따라 **bulk apply(AI 생성·draft 저장)를 중단**하고, 저장 인프라(migration·entity·service·CLI·tests)만 구현·검증했다. dry-run 은 eligible 40,438 을 정확히 산정하고 DB write 0 을 확인했다. **실제 apply 는 in-app 환경(HFF scope 정의 + 배포 + GEMINI_API_KEY)에서 이 인프라를 재사용해 수행**한다.

---

## 2. 기준 문서 및 preflight

| preflight | 결과 |
|---|---|
| 브랜치/HEAD | main |
| HFF parser/test · seed builder · prompt · guards · bulk-dryrun 문서 | ✅ 전부 존재 |
| `AiPolicyExecutorService.execute(scope, system, user, overrides?)` | ✅ 확인 — `ai_llm_policies` scope 해결 + `resolveApiKey`(ai_settings/env) + **`AIUsageLog` DB write** |
| AI policy scope 저장 | `AiPolicyScope` **닫힌 union** + `SERVICE_FOR_SCOPE` Record(exhaustive) + `ai_llm_policies` 테이블 |
| `shared_product_descriptions` master 기반 재확인 | ✅ `master_id NOT NULL` (BULK-APPLY-DESIGN 확정) |
| 방화벽/DB 접속 리스크 | 프로덕션 DB TCP 차단 + 병렬세션 authorized-networks clobber(미변경) |

기준 문서 전부 checkout 존재. secret/key 미노출.

---

## 3. live 소량 실측 결과 — **게이트 실패(불가)**

WO §6.4 중단 조건 중 3개 해당:
| 중단 조건(§6.4) | 실측 |
|---|---|
| HFF policy scope 미정의 | ✅ `AiPolicyScope` union 에 `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` 없음 + `ai_llm_policies` seed 없음 |
| AI provider 설정 부재 | ✅ 로컬 `GEMINI_API_KEY` 부재 (standalone key 우회 금지 준수) |
| DB write 없는 실측 경로 확보 실패 | ✅ `execute()` 는 `AIUsageLog` write 발생 → 본 WO no-DB-write 범위와 충돌 |

| 측정 항목 | 값 |
|---|---|
| provider / model | gemini / gemini-2.5-flash (기본) |
| policy scope | **미정의** |
| 요청/성공/실패/retry/timeout | **0 / — / — / — / —** |
| latency avg/p95 · 건당 비용 | 미측정 |
| full-run(40,438) 예상 | 파라메트릭 ≈ **$62.31** (CLI dry-run) / worst(44,885) ≈ $70 (가정가, 실측 아님) |

→ **bulk apply 중단.** 저장 인프라는 §4 허용대로 구현. live 실측은 apply 실행 WO 의 첫 단계(in-app)로 유지.

---

## 4. migration / entity / service 구현 요약

| 산출 | 파일 | 요지 |
|---|---|---|
| migration | `database/migrations/20261204000000-CreateProductCandidateDescriptionDrafts.ts` | additive CREATE TABLE(IF NOT EXISTS) + index 4 + partial unique `(candidate_id, draft_type, language) WHERE deleted_at IS NULL`. down=DROP. **기존 테이블 무변경** |
| entity | `modules/neture/entities/ProductCandidateDescriptionDraft.entity.ts` | ESM-safe(`@ManyToOne('ProductCandidate')` + `import type`). status union(draft/needs_review/approved/rejected/hidden/deprecated, **canonical 미사용**), draft_type union |
| 등록 | `neture/entities/index.ts` + `database/entities.ts`(import+array) | SharedProductDescription 패턴 미러 |
| service | `modules/neture/services/product-candidate-description-draft.service.ts` | raw parameterized SQL upsert(ON CONFLICT partial unique) + count. **순수** `buildDescriptionDraftRow`/`resolveReviewStatus` |
| CLI | `scripts/health-functional-food-store-description-bulk-apply.ts` | dry-run 기본 + `--apply` 이중 게이트 |
| test | `services/__tests__/product-candidate-description-draft.service.test.ts` | buildDescriptionDraftRow/resolveReviewStatus(9 케이스) |

> ⚠️ **deploy 영향**: 이 커밋은 migration 을 포함 → main 배포 시 CI/CD 가 `product_candidate_description_drafts` **빈 테이블**을 생성(additive)하고 entity 를 매핑한다. **row 저장 0**(apply 미실행). 기존 공통 Core(masters/identifiers/candidates)·shared_product_descriptions 무변경.

---

## 5. bulk apply 실행 조건

- dry-run 기본: AI/DB write 없음, 대상 산정만.
- `--apply` **이중 게이트**: (1) env `HFF_DESCRIPTION_BULK_APPLY_CONFIRM=YES`, (2) 생성 능력(`resolveGenerationCapability`) — standalone 미가용 시 DB write 전 **APPLY_HALTED** 중단.
- CLI 옵션: `--limit/--offset/--batch-size/--source-label/--only-eligible/--exclude-raw-material/--exclude-export/--max-live/--out`.
- 검증 실측:
  - `--apply`(confirm 없음) → `APPLY_BLOCKED`.
  - `--apply`(confirm=YES) → `APPLY_HALTED (§6.4)` + 사유, **DB write 0**.

---

## 6. apply 결과

**apply 미실행(중단).** 생성 0 / 저장 0 / DB write 0.

dry-run 대상 산정(전량 44,885, exclude raw+export):
| 지표 | 값 |
|---|---:|
| candidatesScanned | 44,885 |
| **eligible** | **40,438** |
| excludedRawMaterial | 1,861 |
| excludedExport | 2,826 |
| generated/updated/skipped/failed/guardFail | 0/0/0/0/0 |
| dbWrite | **0** |

expected count(bulk-dryrun 90.09% = 40,438) **정합**.

---

## 7. review status / flags 분포 (설계값, 저장 미실행)

apply 시 적용될 규칙:
- 기본 `review_status = needs_review`. **guard FAIL → `rejected`** (`resolveReviewStatus`, WO §12 설계 기준).
- `review_flags = preFlags + draftVerdict`.

dry-run flag 분포(생성 대상 판단용): RAW 1,861·EXPORT 2,826·TERSE 699·MAIN_FUNCTION_MISSING 31·INTAKE_MISSING 405·CAUTION_MISSING 1,663·LONG_TEXT 1,063·MULTI_CLAIM 17,729.

---

## 8. guard 결과 저장 방식

`guard_result jsonb` = `{preFlags, draftVerdict, sourceFidelity, medicineLike, quality, promptVersion}`. `review_flags text[]` 는 빠른 필터. guard FAIL(medicine/beyond-source/caution-loss/json-parse/provider-error) → review_status `rejected`(approved 진입 차단).

---

## 9. 약무·법무 검토 게이트

- 모든 draft 기본 `needs_review`. guard FAIL → `rejected`(CHECK 명시).
- **`approved` 전 약무·법무/운영 검토 필수.** approved 도 자동 노출 아님(매장 실행은 별도 능동 행위).
- 실제 검토·approved UI 는 후속 UI WO. 본 WO 는 저장 인프라까지.

---

## 10. 비용 / 실패율

- live 미실행 → 실패율 미측정. 파라메트릭 비용 ≈ $62~70(가정가, 실측 아님).
- CLI 는 batch 단위 continue(부분 실패 job 중단 방지) + `--resume`/`--offset` 재개 지원(apply 실행 시).

---

## 11. 후속 admin review UI WO 범위

- `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-EXECUTE-V1`(또는 동): HFF policy scope 정의(ai_llm_policies seed) + live 50~100 실측 → `--apply` 실행(needs_review 저장).
- `WO-...-CANDIDATE-DESCRIPTION-REVIEW-UI-V1`: admin `/admin/o4o-product-db` 하위 "후보 설명 draft" 탭(list + review_status 필터 + approve/reject) + ProductCandidate 상세 draft 섹션.
- 미래 ProductMaster 승격 시 draft → shared_product_descriptions 승격(별도).

---

## 12. 배포/운영 주의사항

| 항목 | 결과 |
|---|---|
| **deploy 시 생성** | `product_candidate_description_drafts` **빈 테이블**(additive) + entity 매핑. row 0 |
| SharedProductDescription / ProductMaster / ProductIdentifier 생성 | **0** |
| ProductCandidate.candidate_status 변경 | **0** |
| admin 노출 / 매장·QR·POP | **0** |
| entity boot 안전성 | ESM 규칙 준수(문자열 관계 + import type), SharedProductDescription 패턴 미러, tsc clean |
| 효능/질병 표현 금지 룰셋 | **0** (guards=품질 성격) |

**검증 실측:**
```
npx jest health-functional-food product-candidate-description-draft  → 67/67 PASS
npx tsc --noEmit -p tsconfig.json                                    → 신규 파일 에러 0 (전체 1건 marketTrialController, 무관·기존)
hff:store-desc:bulk-apply (dry-run, full)                            → eligible 40,438, dbWrite 0
--apply(confirm=YES)                                                 → APPLY_HALTED(§6.4), DB write 0
git diff --check                                                     → clean
```

**최종:** WO §4 단계 게이트 준수 — live 실측 불가로 **bulk apply(생성·저장) 중단**, 저장 인프라(migration·entity·service·CLI·tests)만 구현·검증. dry-run eligible 40,438 정합, DB row 저장 0, 불변 테이블 무변경. 실제 apply 는 in-app(HFF scope + 배포 + 키) 환경에서 이 인프라를 재사용해 수행한다.
