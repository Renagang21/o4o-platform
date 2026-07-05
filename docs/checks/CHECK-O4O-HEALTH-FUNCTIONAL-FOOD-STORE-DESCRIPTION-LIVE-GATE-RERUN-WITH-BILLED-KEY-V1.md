# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-GATE-RERUN-WITH-BILLED-KEY-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-GATE-RERUN-WITH-BILLED-KEY-V1`
> 성격: 기존 env `GEMINI_API_KEY` 로 live 게이트 재검증(유료 가정 확인). measurement-only, bulk apply 금지.
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행: `e1a276abb`(ai-key fix) · `b978b651a`(quota alternative HOLD)

> ⚠️ **면책**: secret/API key 원문 미출력·미커밋.

---

## 1. 결론 — **HOLD**. 기존 env 키는 여전히 **무료 티어 quota 429**(billing 미연동 확인).

- live 10건 프로브(§7.3): **성공 0 / 429 10 (100%)**, latency ~2.4s(즉시 429 = 실제 생성 아님).
- 429 메시지 = *"You exceeded your current quota, please check your **plan and billing details**"* (10/10).
- 엔드포인트 = **`ai.google.dev`(Google AI Studio Generative Language API 무료 티어)** — 기존 `GEMINI_API_KEY` 는 **여전히 무료 티어**, billing 미연동/quota 소진.
- §7.3대로 10건 429 100% → **50건 미진행**. 판정 **HOLD**.
- **사용자 가정("지금 유료키일 것")은 live 테스트로 반증됨** — 키 상태 변화 없음.
- DB write 0, `product_candidate_description_drafts` **0** 불변.

**한 줄 결론:** 기존 Cloud Run env `GEMINI_API_KEY` 로 재게이트를 시도했으나 10건 프로브에서 **429 100%(plan/billing quota, ai.google.dev 무료 티어)** 로 즉시 실패 → **HOLD**. 키는 아직 유료로 상향되지 않았다. 실제 billing 연동(Gemini API 유료 티어) 또는 전용 billed 키 확보 후 재게이트해야 한다.

---

## 2. 범위와 비범위

- 수행: preflight(커밋·util·scope), key 존재/billing 간접 확인, live 10건 프로브, DB 불변, HOLD 판정.
- 미수행: 50~100 full 게이트(10건 429 100%로 중단), 40k bulk apply, draft 저장, approved/노출, master 승격, provider adapter, drift 정합화.

---

## 3. 기준 문서

PROVIDER-QUOTA-ALTERNATIVE / LIVE-QUOTA-RECOVERY / BULK-APPLY-EXECUTE / BULK-APPLY CHECK·WO 전부 checkout 존재. 누락 없음.

---

## 4. Preflight

| 항목 | 결과 |
|---|---|
| `e1a276abb`(ai-key fix) / `b978b651a`(quota alt) | **git history 반영 확인** |
| `ai-key.util.ts` `"isEnabled"` 조회 | ✅(반영됨) |
| HFF scope `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` | ai_llm_policies row 존재·enabled(직전 확인) |
| provider/model | gemini / gemini-2.5-flash |
| env `GEMINI_API_KEY` | **존재**(Cloud Run o4o-core-api env, len 확인, 원문 미출력) |
| `product_candidate_description_drafts` | **0** |
| HFF candidate | **44,885** |
| 채널 | Cloud SQL Auth Proxy(새 토큰, 127.0.0.1:5434) — 방화벽 무변경 |

---

## 5. key/billing 상태 확인

- key source: **`env`** (Cloud Run `GEMINI_API_KEY`). ai_settings 0 rows → env 경로.
- key 존재: ✅ (원문 미출력).
- **billing 상태(live 간접 확인): 무료 티어 유지** — 프로브 10건 전부 429 *plan/billing quota*, `ai.google.dev`(Google AI Studio) 무료 API. → **billed 미연동**.

---

## 6. HFF scope / policy resolve

- scope `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` → `AiPolicyExecutorService.execute()` 정상 진입(provider/model resolve OK). policy resolve 는 문제 없음 — **실패는 provider quota(429)일 뿐**.

---

## 7. live 재게이트 실행 환경

- 실제 `AiPolicyExecutorService.execute(SCOPE, system, user, {responseMode:'json'})` 경로.
- 최소 DataSource[`AiLlmPolicy`] + Cloud SQL Auth Proxy. key source=env. measurement-only(draft upsert 코드 없음).
- 프로브: 10건 계층 샘플(raw/OEM·export 제외), CONC 2, no-cooldown(429율 신속 측정). 정식 게이트는 429 해소 시에만 진행하도록 설계.

---

## 8. live 재게이트 결과

| 지표 | 값 |
|---|---|
| sample | 10 (프로브) |
| **provider 성공** | **0 (0.0%)** |
| **429** | **10 (100%)** — 메시지 *plan/billing quota* |
| parse rate | N/A(성공 0) |
| latency avg/p95/max | 2,383 / 2,787 / 2,787 ms (즉시 429) |
| tokens / cost | 0 / $0 (생성 없음) |
| full-run 추정 | 현재 quota 로 불가 |

**판정: HOLD** — 성공률 0% ≪ 98%, 429 지속. §7.3(10건 429 없어야 50건 진행) 미충족 → 50건 미실행.

---

## 9. guard / parse 품질

- 성공 0 → 이번 재게이트로 품질 재판정 불가. **품질은 직전 게이트(성공분 parse 100% / medicineLike 0 / beyondSource 1)에서 이미 통과 수준 확인**. 이번 HOLD 는 순수 **provider quota** 문제.

---

## 10. 비용 / latency 평가

- 비용: 생성 0 → $0. billed 후 재측정 필요.
- latency: 2.4s 는 실제 생성이 아니라 즉시 429 응답 시간. billed 후 실 생성 latency 재측정(직전 p95 22s 참고).

---

## 11. DB 불변 검증 (프로브 후, proxy 경유)

| 항목 | 값 |
|---|---|
| 이번 WO DB write | **0** (measurement-only, 429로 생성 자체 없음) |
| `product_candidate_description_drafts` | **0** |
| HFF candidate | 44,885 불변 |
| approved/exposure row | 0 |
| master/identifier/shared | 이번 WO 무변경(내 scope). 절대값 변동은 병렬 타 트랙 |
| AIUsageLog | 최소 DataSource 미등록 → write 없음(생성도 0) |

secret 미노출: key 원문 미출력·미파일저장·미커밋, 프로브 후 키 파일/임시 스크립트 삭제, 프록시 종료.

---

## 12. 다음 WO

재게이트 HOLD → §12 HOLD 분기:
1. **billing/key 상태 실제 조치**: Google AI Studio/GCP 에서 해당 Gemini API 키(프로젝트)를 **유료 티어(pay-as-you-go)로 연동** — 무료 티어에서 벗어나야 429 해소. (주의: GCP 프로젝트 billing ≠ Gemini API 유료 티어; **Generative Language API 키의 유료 tier** 를 명시 확인.)
2. 상향 후 본 게이트 재실행(`hff:store-desc` 계열 measurement, 50~100 rate-limited) → GO → `BULK-APPLY-RUN`.
3. 대안: `WO-...-PROVIDER-QUOTA-ALTERNATIVE-V2`(전용 billed 키/Job env) 또는 `WO-...-VERTEX-PROVIDER-DESIGN-V1`(어댑터 신규).

---

## 부록. 필수 기록

| 항목 | 값 |
|---|---|
| key source | **env** (Cloud Run GEMINI_API_KEY) |
| provider / model | gemini / gemini-2.5-flash (Google AI Studio, ai.google.dev) |
| sample / success / 429 | 10 / 0 / 10(100%) |
| parse rate / hard guard fail | N/A(성공 0) / N/A |
| latency avg/p95/max | 2383 / 2787 / 2787 ms(즉시 429) |
| cost / full-run | $0 / 현 quota 불가 |
| **최종 판정** | **HOLD (기존 키 무료 티어 quota, billing 미연동)** |
| bulk apply | 미실행, draft 0 |
| secret 미노출 | ✅ |
| 검증 | 코드 변경 없음. `git diff --check` clean / 문서만 |
| 커밋 | 하단 |

**최종:** 기존 env `GEMINI_API_KEY` 로 재게이트 프로브(10건) 결과 **429 100%(plan/billing quota, 무료 티어)** → HOLD. 키가 아직 유료로 상향되지 않았음이 live 로 확정. billed 티어 연동 또는 전용 billed 키 확보 후 재게이트 → GO → bulk-apply-run. DB write 0, drafts 0.
