# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-GATE-RERUN-WITH-BILLED-KEY-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-GATE-RERUN-WITH-BILLED-KEY-V1`
> 성격: env `GEMINI_API_KEY` 기준 live 게이트 재검증. measurement-only, bulk apply 금지.
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행: `e1a276abb`(ai-key fix) · `b978b651a`(quota alternative HOLD)

> ⚠️ **면책**: secret/API key 원문 미출력·미커밋.

---

## 1. 결론 — quota blocker **해소**, **GO_WITH_LIMIT (조건부)**

- 최초 프로브(무료 티어): 429 100% → HOLD.
- **사용자가 AI Studio 에서 해당 키(프로젝트 `o4o-platform`, `gen-lang-client-0322512517`)를 유료(Tier 3·후불)로 전환** → 재게이트.
- **재게이트(50건): 429 = 0 (quota blocker 완전 해소)**. parse 100%, medicineLike 0.
- **남은 2개 blocker**: (1) **timeout** — 11/50(22%) 실패 전부 timeout(429 아님), policy timeout 30s < 대형 프롬프트 latency(p95 41.7s). (2) **sourceFidelity beyondSource 7/39(18%)** — 사용자 기준(0) 초과.
- **bulk apply 미실행**, `product_candidate_description_drafts` **0** 불변.

**한 줄 결론:** 유료 전환으로 **429 quota blocker 는 완전히 해소**됐다(0/50). 파이프라인 정책 resolve·JSON 파싱·의약품 단정 가드는 정상이다. 다만 **timeout(대형 mainFunction 프롬프트가 30s policy timeout 초과, 22% 실패)** 과 **sourceFidelity beyondSource 18%** 두 execution/quality 항목이 남아, 판정은 **GO_WITH_LIMIT (조건부)** — bulk 전 timeout 상향(60s)·저 concurrency + beyondSource 원인 규명이 필요하다. 단 beyondSource row 는 파이프라인에서 `rejected` 로 격리(노출 아님)되므로 안전망은 유지된다.

---

## 2. 범위와 비범위

- 수행: preflight, 유료 전환 후 재게이트(10 프로브 + 50 본게이트), DB 불변, 판정.
- 미수행: 40k bulk apply, draft 저장, approved/노출, master 승격, timeout/policy 조정(DB write 금지), provider adapter, drift 정합화.

---

## 3. 기준 문서

PROVIDER-QUOTA-ALTERNATIVE / LIVE-QUOTA-RECOVERY / BULK-APPLY-EXECUTE / BULK-APPLY CHECK·WO 전부 checkout 존재.

---

## 4. Preflight

`e1a276abb`·`b978b651a` git history 반영. `ai-key.util.ts` `"isEnabled"` 조회 반영. HFF scope `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` ai_llm_policies row enabled. provider/model gemini/gemini-2.5-flash. env `GEMINI_API_KEY` 존재(원문 미출력). 채널 = Cloud SQL Auth Proxy(방화벽 무변경). drafts 0 / HFF candidate 44,885.

---

## 5. key/billing 상태 확인

- **key: AI Studio `...Mv8s`(Rena-gemini-api-key), 프로젝트 o4o-platform / gen-lang-client-0322512517.**
- **billing 등급: Tier 3 · 후불(신한카드) — 유료 확정**(사용자 전환).
- 무료 티어(최초 프로브 429 100%) → 유료 전환 후 429 0. → **billing 상향이 quota blocker 를 해소함이 live 로 확정.**

---

## 6. HFF scope / policy resolve

scope resolve 정상(execute 진입, provider/model 해석). 실패는 quota(해소됨) → 이제 timeout.

---

## 7. live 재게이트 실행 환경

실제 `AiPolicyExecutorService.execute(SCOPE, system, user, {responseMode:'json'})`. 최소 DataSource[`AiLlmPolicy`] + Cloud SQL Auth Proxy. key source=env. measurement-only(draft upsert 없음). 프로브 10(no-cooldown) → 본게이트 50(CONC 2, retry 유지).

---

## 8. live 재게이트 결과

| 지표 | 10 프로브(유료 후) | **50 본게이트** |
|---|---|---|
| **429** | **0** | **0** ✅ |
| provider 성공 | 7/10(70%) | **39/50 (78.0%)** |
| format parse | 100% | **100% (39/39)** ✅ |
| medicineLike hard fail | 0 | **0** ✅ |
| **beyondSource hard fail** | 0 | **7 (18% of 성공분)** ⚠️ |
| timeout 실패(429 아님) | 3/10 | **11/50 (22%)** ⚠️ |
| verdicts | PASS 4·HOLD_MISSING 2·HOLD_TERSE 1 | **PASS 24·HOLD_TERSE 6·HOLD_MISSING 2·FAIL_BEYOND_SOURCE 7** |
| latency avg/p95/max | 18.9s/44s/44s | **16.5s / 41.7s / 42.5s** |
| tokens(성공분) | 8,576/2,416 | input 52,816 / output ~ |
| full-run(40,438) 추정 | — | 유료 단가로 재산정(≈$50~60 대) |

**판정: GO_WITH_LIMIT (조건부)** — 429 해소·품질 대부분 통과이나 timeout 22% + beyondSource 18% 로 성공률 98% 미달. 두 항목 해결 시 GO.

---

## 9. guard / parse 품질

- **parse 100%** ✅ (JSON 스키마 안정, 유료 후에도 유지).
- **medicineLike 0** ✅ (의약품 단정 미발생).
- **beyondSource 7/39(18%) ⚠️** — 사용자 기준(0) 초과. sourceFidelityGuard 가 draft mainFunction 의 원문 밖 확장을 flag. **원인 규명 필요**: (a) gemini-2.5-flash 가 멀티정제 제품에서 기능성을 실제 확장/재요약, 또는 (b) guard 과민(overlap<0.5+미매치≥2 휴리스틱이 정당한 재작성을 오탐 — 앞서 framing stopword 로 1차 완화한 것과 유사 여지). **10건 표본에선 0, 50건에선 7 → 표본 확대로 드러남.** measurement-only 라 draft 미저장 → 원인 규명은 draft capture 재실행 필요.
- **안전망**: bulk 파이프라인에서 FAIL_BEYOND_SOURCE → review_status `rejected`(격리, 노출 안 됨). 즉 18% 는 자동 격리되며 노출 리스크 아님 — **yield/품질 이슈이지 안전 이슈는 아님.**
- HOLD_TERSE(6)/HOLD_MISSING(2) = 품질 실패 아님, review flag 처리(needs_review).

---

## 10. 비용 / latency 평가

- 비용: 성공 39건 소량. full-run 유료 단가로 재산정(~$50~60 대 추정).
- **latency: p95 41.7s / max 42.5s — policy timeout 30s 초과가 22% 실패의 직접 원인.** 대형 mainFunction(종합비타민/멀티정제, 수천 자) 생성이 느림. **timeout 60s 상향 + 저 concurrency 로 timeout 실패 대부분 해소 가능.**

---

## 11. DB 불변 검증

| 항목 | 값 |
|---|---|
| 이번 WO DB write | **0** (measurement-only) |
| `product_candidate_description_drafts` | **0** |
| HFF candidate | 44,885 불변 |
| approved/exposure | 0 |
| master/identifier/shared | 이번 WO 무변경(내 scope). 절대값은 병렬 타 트랙 |
| AIUsageLog | 최소 DataSource 미등록 → write 없음 |

secret 미노출: key 원문 미출력·미커밋, 재게이트 후 키 파일/임시 스크립트 삭제, 프록시 종료.

---

## 12. 다음 WO

**GO_WITH_LIMIT** → 두 조건 해결 후 `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-RUN-V1`. 필수 반영(사용자 지정 + 실측 근거):
1. **HFF policy `timeout_ms` 30s → 60s** (ai_llm_policies 보정; p95 41.7s 근거).
2. **낮은 concurrency 1~2 시작** + rate/backoff.
3. **batch checkpoint / resume**(offset).
4. **timeout row → retry queue 또는 failed list 분리**(needs_review 와 구분).
5. **긴 mainFunction(멀티정제) 계층 별도 batch**(latency 상위 격리).
6. 모든 저장 row 기본 **`needs_review`**, guard FAIL(beyondSource 등) → **`rejected`**.
7. **raw/OEM/export 제외 유지**, approved/exposure **0**.
8. **(선행 권장) beyondSource 18% 원인 규명 mini-WO**: 10~20건 draft capture 로 실제 원문밖 확장 vs guard 과민 판별 → 프롬프트 tighten 또는 guard tune. 결과에 따라 예상 reject율 확정.

---

## 부록. 필수 기록

| 항목 | 값 |
|---|---|
| key source / 등급 | env(Cloud Run) / **Tier 3 유료** |
| provider / model | gemini / gemini-2.5-flash |
| sample / success / 429 | 50 / 39(78%) / **0** |
| parse rate / medicineLike / beyondSource | 100% / 0 / **7(18%)** |
| timeout 실패 | 11/50(22%) |
| latency avg/p95/max | 16,491 / 41,655 / 42,475 ms |
| **최종 판정** | **GO_WITH_LIMIT (조건부: timeout 60s + beyondSource 규명)** |
| bulk apply | 미실행, draft 0 |
| secret 미노출 | ✅ |
| 커밋 | 하단 |

**최종:** 유료 전환으로 **429 quota blocker 완전 해소**(0/50). 남은 것은 execution(timeout 22%, config-fixable)·quality(beyondSource 18%, 원인 규명 필요) 두 항목 → **GO_WITH_LIMIT(조건부)**. bulk 전 timeout 60s·저 concurrency·resume 반영 + beyondSource 규명. DB write 0, drafts 0.
