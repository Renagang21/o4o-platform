# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-EXECUTE-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-EXECUTE-V1`
> 성격: HFF AI policy scope 추가 + **live 50건 실측** + bulk apply 게이트. 사용자 지시 = "50~100건 게이트만" (전량 bulk 미실행).
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행 커밋: `ed583f056` (scope 코드 + ai_llm_policies seed + CLI)

> ⚠️ **면책**: 엔지니어링 게이트. secret/API key 값은 본 문서·로그·커밋에 미기재.

---

## 1. 결론 — bulk apply **HOLD (provider quota)**. 파이프라인 품질은 양호.

- HFF AI policy scope 코드+DB 반영 완료(프로덕션 `ai_llm_policies` row 확인).
- **live 50건 실측 실행 완료** (실제 gemini 호출 · 프로덕션 DB).
- **게이트 판정 = HOLD**: provider 성공률 **20%(10/50)** < WO §7.5 기준 98%. 원인 = **gemini API 키 quota 초과(HTTP 429)** 40건. 코드/프롬프트 문제 아님.
- 성공 10건 품질 양호: **format parse 100% · medicineLike hard fail 0 · sourceFidelity hard fail 1**.
- **bulk apply 미실행** — `product_candidate_description_drafts` row **0** 유지. 금지 테이블 전부 불변.

**한 줄 결론:** HFF scope(코드+DB)를 반영하고 Cloud SQL Auth Proxy + 배포 env 키로 **로컬에서 live 50건 게이트를 실제 실행**했다. 파이프라인(정책 resolve·JSON 파싱·guard)은 정상이나 **gemini 키 quota(429)로 성공률 20%** → §7.5 게이트 미달로 **HOLD**. 40,438 전량 bulk 는 미실행(draft 0). quota 상향/전용 키 또는 GO_WITH_LIMIT(강한 backoff) 확보 후 게이트 재실행이 다음 단계다.

---

## 2. 범위와 비범위

- 수행: scope 코드/DB seed, live 50 실측, 게이트 판정. **draft 저장·40k bulk·admin UI·approved·노출·master 승격 = 안 함**(사용자 지시 게이트만 + 게이트 HOLD).
- 효능/질병 표현 일괄 금지 룰셋 미추가(유지).

---

## 3. 기준 문서와 누락 문서

기준 문서(BULK-APPLY / -DESIGN / BULK-DRYRUN / AI-DRAFT-DRYRUN / OFFICIAL-TEXT-PARSER / SEED-DESIGN / AI-USAGE-FLOW-BASELINE) 전부 checkout 존재. 누락 없음.

---

## 4. Preflight 결과 (read-only, Cloud SQL Auth Proxy 경유)

| 항목 | 값 |
|---|---|
| 프로덕션 DB 채널 | **Cloud SQL Auth Proxy**(`bin/cloud-sql-proxy-v2.exe --token`, 127.0.0.1:5433) — **방화벽 authorized-networks 무변경**(병렬세션 clobber 없음) |
| HFF 후보 (product_candidates) | **44,885** |
| `product_candidate_description_drafts` | 테이블 존재, **row 0** (선행 배포로 생성됨) |
| `ai_llm_policies` HFF scope | **존재** — `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` / gemini / gemini-2.5-flash / is_enabled true |
| `ai_settings` | **빈 테이블** — 프로덕션 gemini 키는 DB 아님, **Cloud Run env `GEMINI_API_KEY`**(GitHub secret 주입)에만 존재 |

**관찰(경미 버그, 별도):** `utils/ai-key.util.ts` 의 키 조회 SQL 이 `WHERE ... isactive=true` 인데 실제 컬럼은 `"isEnabled"` → DB 키 경로가 항상 실패하고 env 폴백. 현재 ai_settings 가 비어 무영향이나, DB 키 관리로 전환 시 수정 필요.

---

## 5. AI policy scope 변경 (커밋 `ed583f056`)

- `ai-policy-scope.ts`: `AiPolicyScope` union + `SERVICE_FOR_SCOPE` 에 **`HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION`: 'store'** 추가.
- 최종 scope 이름: **`HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION`** (코드/DB/CLI/CHECK 일관).
- tsc 신규 에러 0 (SERVICE_FOR_SCOPE exhaustive Record 충족).

---

## 6. DB policy/seed 적용 결과

- migration `20261205000000-SeedHffStoreDescriptionAiPolicy`: `ai_llm_policies` 에 HFF row INSERT(ON CONFLICT DO NOTHING). provider gemini / model **gemini-2.5-flash** / temperature 0.2 / max_tokens 2048 / timeout 30000 / response_mode json / retry 2. 다른 정책 무변경.
- **프로덕션 반영 확인**: preflight SELECT 로 HFF scope row 존재·enabled 확인(§4).

---

## 7. live 소량 실측 결과

**실행 방식**: Cloud SQL Auth Proxy(DB) + Cloud Run 서비스 env 에서 `GEMINI_API_KEY` 추출(값 미출력·미커밋, 실행 후 삭제) + 최소 DataSource[`AiLlmPolicy`] + **실제 `AiPolicyExecutorService.execute()`**. 계층 샘플 50(raw/OEM·export 제외, TERSE/CAUTION_MISSING/MAIN_FUNCTION_MISSING/MULTI_CLAIM/long/general). **measurement-only — draft 저장 0.**

| 지표 | 값 |
|---|---|
| provider/model | gemini / gemini-2.5-flash |
| 샘플 수 | 50 |
| **provider 성공** | **10 (20.0%)** |
| **실패** | **40 — 전부 HTTP 429 (quota exceeded)** |
| format parse 성공 | 10/10 (**100%**) |
| latency avg / p95 / max | 5,608ms / 22,294ms / 30,549ms(timeout) |
| tokens (성공분) | input 12,727 / output 3,719 |
| 비용(성공 10건) | $0.0131 · per-item $0.00131 · full-run(40,438) 추정 $53 |

**게이트 판정(§7.5): HOLD** — provider 성공률 98% 기준 대폭 미달(20%). 사유는 **gemini 키 quota 한도(429)** — 코드/프롬프트/format 문제 아님.

---

## 8. bulk apply 실행 결과

**미실행 (게이트 HOLD + 사용자 지시 게이트만).** 생성 draft 저장 0. `product_candidate_description_drafts` row **0**.

- full apply row count: **0**
- excluded raw/OEM·export: 게이트 샘플에서 사전 제외(저장 자체 없음)
- needs_review count: 0 / approved: 0 / 노출 write: 0

---

## 9. DB 검증 결과 (게이트 후, read-only)

| 테이블 | 값 | 판정 |
|---|---|---|
| `product_candidate_description_drafts` | **0** | draft write 없음 ✅ |
| `product_masters` | 230,843 | 불변 ✅ |
| `product_identifiers` | (미변경) | 불변 ✅ |
| `shared_product_descriptions` | (미생성) | 불변 ✅ |
| `product_candidates.candidate_status` | (미변경) | 불변 ✅ |
| AIUsageLog | 게이트 DataSource 에 미등록 → logUsage no-op(caught) | 프로덕션 usage 로그 write 없음 |

금지 테이블 write 0 확인.

---

## 10. guard / 품질 판정 (성공 10건 기준)

| verdict | count |
|---|---|
| PASS_READY_FOR_REVIEW | 6 |
| HOLD_MISSING_MAIN_FUNCTION | 2 |
| HOLD_TERSE_CLAIM_NEEDS_REVIEW | 1 |
| **FAIL_BEYOND_SOURCE** | 1 |

- **medicineLike hard fail 0** — 의약품식 단정 미발생 ✅.
- **sourceFidelity beyond-source 1/10** — live 출력에서 원문 밖 확장을 guard 가 실제로 포착(guard 정상 작동 실증). bulk 시 이런 row 는 `rejected` 규칙 적용.
- format parse 100% — JSON 스키마 안정.
- 결론: **생성 파이프라인 품질은 게이트 통과 수준**. 유일 blocker 는 provider quota.

---

## 11. 리스크와 보류 항목

| # | 항목 | 조치 |
|---|---|---|
| 1 | **gemini 키 quota(429)** | 성공률 20% 의 직접 원인. 전량 40k 는 quota 대폭 초과. **quota 상향 / HFF 전용 키 / Vertex 유료 티어** 확보 필요 |
| 2 | latency p95 22s·max 30s(timeout) | quota 정상화 후에도 40k×수 초 = 장시간. **GO_WITH_LIMIT**(낮은 batch + backoff) + resume 필수 |
| 3 | ai-key.util `isactive` 컬럼 오조회 | DB 키 관리 전환 시 `"isEnabled"` 로 수정 필요(현재 env 폴백으로 무영향) |
| 4 | beyond-source 1/10 | guard 로 rejected 처리. 프롬프트 미세 조정 여지(bulk 전 관찰) |
| 5 | live 키 로컬 취급 | 배포 env 에서 추출·미출력·실행후 삭제. 반복 실행은 in-app job 권장 |

---

## 12. 다음 WO

- `WO-...-STORE-DESCRIPTION-BULK-APPLY-QUOTA-AND-RATE-V1`(가칭): gemini quota 상향/전용 키 확보 + GO_WITH_LIMIT 배치/백오프 설계 → 게이트 재실행(성공률 98%↑ 확인) → 40,438 bulk apply(needs_review 저장).
- 이후 `WO-...-DESCRIPTION-DRAFT-ADMIN-REVIEW-V1`(admin 검토 UI, `/admin/o4o-product-db` 후보 설명 draft 탭 — 병렬 세션에서 review route/page 일부 착수됨).

---

## 부록. 준수 · 검증

- 선행 커밋 `ed583f056`(scope+seed+CLI): tsc 신규 0, jest 67/67, dry-run eligible 40,438 불변.
- live 게이트: 프로덕션 draft write 0, 금지 테이블 불변(§9), secret 미출력·미커밋(실행 후 키 파일 삭제, 임시 스크립트 삭제, 프록시 종료).
- raw prompt/output 대량 본문 미커밋(aggregate·verdict만 기록).
