# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-PROVIDER-QUOTA-ALTERNATIVE-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-PROVIDER-QUOTA-ALTERNATIVE-V1`
> 성격: provider quota 대안 조사·선택·셋업 runbook. **live 재게이트는 billed 키 부재로 미실행.** measurement-only, bulk apply 금지.
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행: AI key fix `e1a276abb`(배포·history 확인) · HOLD 근거 `CHECK-...-LIVE-QUOTA-RECOVERY-AND-RETRY-GATE-V1`

> ⚠️ **면책**: secret/API key 원문 미기재. 사용자 결정 = "billed 키 아직 없음 → HOLD + runbook".

---

## 1. 결론 — **HOLD (billed 키 미확보)**. 대안은 코드 검증 완료, 셋업 runbook 고정.

- 4개 대안(A/B/C/D)을 **실제 코드에 대해 검증**함(추정 아님).
- **핵심 제약(코드 사실)**: `ai_settings.provider` **UNIQUE**(provider당 키 1개) + 키 resolve는 **provider 단위**(scope별 키 미지원) + ai-core provider = **{gemini, openai}만(Vertex 없음)**.
- 따라서 **Option B(HFF scope 전용 키)는 현재 코드로 불가** — 전용 키는 (a) provider-level ai_settings 등록(=기존 공유 gemini 키 대체) 또는 (b) bulk-run Cloud Run Job 전용 env 주입으로만 가능.
- A/B/C 모두 **billed 키/billing 조치가 공통 전제**(GCP 콘솔·procurement, 세션 밖). 사용자 확인 = **billed 키 아직 없음**.
- **→ HOLD.** live 재게이트 미실행(적용할 대안 없음 + 무료 키는 quota 리셋돼도 40k 불가라 비대표). DB write 0.

**한 줄 결론:** provider quota 대안을 코드 기준으로 확정했다 — **A(기존 키 유료 상향)가 최속, 40k 격리는 Job 전용 env 키, Vertex는 어댑터 부재로 별도 WO, D(수일 분할)는 비현실**. 전부 **billed 키**가 있어야 진행되며 현재 미확보라 **HOLD**. billed 키 준비 후 §7 runbook대로 적용 → 재게이트만 실행하면 된다.

---

## 2. 범위와 비범위

- 수행: 대안 4개 코드 검증, 선택·근거, 옵션별 셋업 runbook, HOLD 판정, DB 불변 확인.
- 미수행(비범위): billed 키 발급/billing 상향(사용자·콘솔), live 재게이트(키 부재), 40k bulk apply, draft 저장, approved/노출, master 승격, Vertex 어댑터 구현, entity/migration drift 정합화.

---

## 3. 기준 문서

LIVE-QUOTA-RECOVERY / BULK-APPLY-EXECUTE / BULK-APPLY CHECK·WO + AI-USAGE-FLOW-BASELINE 전부 checkout 존재. 누락 없음. `e1a276abb`(ai-key fix) git history 확인.

---

## 4. 직전 HOLD 원인

rate-limited 재게이트(순차+7s+65s cooldown+재시도)로도 **429 지속: 성공 2/40**, 메시지 *"check your plan and billing details"*. concurrent 10/50 → rate-limited 2/40(시간경과로 소진). → **RPM 아니라 provider plan/billing 일일 quota 소진**. 코드/프롬프트/키 resolve 정상(env 키로 생성 성공).

---

## 5. provider 대안 비교 (코드 검증)

| 옵션 | 코드 실측 사실 | billed 키 필요 | 판정 |
|---|---|:---:|---|
| **A. 기존 gemini 키 유료 상향** | env `GEMINI_API_KEY` 경로 그대로. 코드/DB 변경 0. 상향 후 즉시 재게이트 가능 | ✅(상향) | **1순위(최속)** — 단 HFF bulk 가 live 서비스와 quota 공유 |
| **B. HFF 전용 billed 키** | `ai_settings.provider` **UNIQUE** + 키 resolve **provider 단위** → **scope별 전용 키 미지원**. 전용은 provider-level 대체(=A화) 또는 **Job 전용 env** | ✅ | **부분 가능** — scope 격리는 코드로 불가, **Job env 로만 워크로드 격리** |
| **C. Vertex 유료** | ai-core `providers = {gemini, openai}` — **Vertex 어댑터 부재** | ✅(SA/billing) | **별도 WO**(어댑터 신규) |
| **D. 일일 quota 수일 분할** | 코드 변경 최소이나 2/40 기준 40k 완료까지 과도 | ❌(무료 유지) | **비추천**(비현실) |

**추가 사실**: HFF policy 에 `fallbackProvider`/`fallbackModel` 설정 가능 → gemini 실패 시 openai fallback 가능(단 OpenAI billed 키 필요). provider 단위 key 라 fallback 도 provider 기준.

---

## 6. 선택한 대안과 근거

**즉시 unblock = Option A**(기존 gemini 키 유료 상향): 코드/DB/배포 변경 0, 상향 후 같은 env 키로 재게이트. **40k bulk 격리 = Job 전용 env 키**(Option B의 실현형): bulk-apply-run WO 의 Cloud Run Job 에 dedicated billed `GEMINI_API_KEY` 주입 → live 서비스 quota 와 분리. Vertex(C)는 별도 어댑터 WO. D는 비추천.

**근거**: (1) scope별 키가 코드로 불가하므로 "HFF 전용" 은 Job 워크로드 격리로 달성. (2) A 는 가장 빠르나 live 서비스와 quota 공유 리스크 → 40k 대량은 Job 전용 키 권장. (3) ai-key.util 이 이제 `"isEnabled"` 를 읽으므로, billed 키를 ai_settings(provider='gemini')에 넣으면 DB 경로로 resolve(단 공유 대체).

---

## 7. key/policy 적용 방식 (셋업 runbook — 키 확보 후 실행)

> ⚠️ 어느 경로든 키 **원문을 로그/문서/커밋/shell history 에 남기지 않는다**.

**Option A — 기존 gemini 키 유료 상향(최속)**
1. Google AI Studio / GCP 에서 해당 gemini API 키(프로젝트)에 **billing 연동(pay-as-you-go)** 활성화.
2. 코드/DB/배포 변경 없음(Cloud Run `GEMINI_API_KEY` env 그대로).
3. 재게이트: Cloud SQL Auth Proxy(새 토큰) + env 키로 §8 50~100 rate-limited 재실행 → 429 해소·성공률 98% 확인.

**Option B(실현형) — Job 전용 billed 키(40k 격리)**
1. HFF bulk 전용 billed gemini 키 발급.
2. bulk-apply-run WO 의 Cloud Run Job spec 에 `--set-env-vars=GEMINI_API_KEY=<Secret ref>` (Secret Manager 참조 권장, 원문 미노출).
3. Job 은 prod DB(Cloud SQL) 접근 + 전용 키로 실행 → live 서비스 키/quota 무영향.

**Option B(DB) — ai_settings 등록(공유 대체 유의)**
1. `INSERT INTO ai_settings(provider, "apiKey", "isEnabled") VALUES('gemini', <billed key>, true)` — **provider UNIQUE 라 이 키가 모든 scope 의 gemini 키가 됨**(care/store 포함).
2. ai-key.util 이 `"isEnabled"` 로 DB 우선 resolve(수정 완료) → env 보다 우선.
3. live 서비스 전체가 이 키를 쓰므로 **워크로드 격리 아님** — 격리 필요하면 Option B(Job env).

**Option C — Vertex**: 별도 `WO-...-VERTEX-PROVIDER-DESIGN-V1`(ai-core provider 어댑터 신규).

---

## 8. live 재게이트 결과 — **미실행**

billed 키 미확보(사용자 확인) → 적용할 대안 없음. 무료 키 재게이트는 (1) quota 리셋 전이면 429, (2) 리셋돼도 40k 불가라 **비대표** → 실행하지 않음. sample 0 / success 0 / 429 0(호출 안 함).

> 참고 지표(직전 게이트, 권위): concurrent 10/50, rate-limited 2/40, parse 100%(성공분), medicine 0, beyond 1, latency p95 22s. **품질은 이미 게이트 통과 수준 — 유일 blocker 는 quota.**

---

## 9. 비용 / latency / quota 평가

- 비용: 직전 성공분 per-item ~$0.0013, full-run(40,438) 추정 ~$53(가정가). billed 티어 실단가는 상향 후 실측.
- latency: 직전 p95 22s(free-tier throttle 영향 가능). billed 후 재측정 필요 → GO_WITH_LIMIT 가능성.
- quota: **free/plan 일일 quota 소진이 근본 원인.** billed 상향/전용 키가 유일 해법.

---

## 10. DB 불변 검증

| 항목 | 값 |
|---|---|
| 이번 WO DB write | **0** (순수 조사·문서, live 실행 없음, 프록시 미기동) |
| `product_candidate_description_drafts` | **0** (직전 확인값 유지 — 이번 WO write 없음) |
| HFF candidate | 44,885 (직전 확인) |
| approved/exposure row | 0 |
| master/identifier/shared | 이번 WO 무변경(내 scope). 절대값은 병렬 타 트랙 영향 |

이번 WO 는 코드 변경도 DB write 도 없음(문서만).

---

## 11. 리스크와 보류 항목

| # | 항목 | 조치 |
|---|---|---|
| 1 | **billed 키 미확보** | HOLD 직접 원인. Option A(유료 상향) 또는 B(전용 키) 준비 필요 — 사용자/billing |
| 2 | scope별 키 미지원(코드) | HFF 워크로드 격리는 Job 전용 env 로만. 코드 scope-key 기능은 별도 설계 필요 시 WO |
| 3 | ai_settings provider UNIQUE | DB 키 등록은 공유 gemini 키 대체 = 전 서비스 영향. 격리엔 Job env 권장 |
| 4 | Vertex 어댑터 부재 | Option C 는 신규 어댑터 WO |
| 5 | ai_settings 스키마 drift(entity/migration/운영) | `WO-O4O-AI-SETTINGS-SCHEMA-DRIFT-ALIGNMENT-V1` 로 분리(본 WO 범위 아님) |
| 6 | 반복 무료 재게이트 | quota 추가 소진만 유발 → billed 확보 전 금지 |

---

## 12. 다음 WO

- **billed 키 확보 시** → 본 게이트 재실행(§7 runbook) → GO → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-RUN-V1`(batch/cooldown/resume/40,438 needs_review, Job 전용 키 권장).
- **Vertex 선택 시** → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-VERTEX-PROVIDER-DESIGN-V1`.
- **무료 유지 시(비추천)** → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-DAILY-QUOTA-SPLIT-RUNBOOK-V1`.
- (병행 가능) `WO-O4O-AI-SETTINGS-SCHEMA-DRIFT-ALIGNMENT-V1`(entity/migration/운영 컬럼 정합).

---

## 부록. 필수 기록 · 준수

| 항목 | 값 |
|---|---|
| 선택 option | A(최속) + B-Job-env(40k 격리) 권장. 전부 billed 키 전제 |
| provider / model | gemini / gemini-2.5-flash (Vertex 어댑터 부재) |
| key source | 현재 env(Cloud Run). DB ai_settings 0 rows. util 은 `"isEnabled"` resolve |
| HFF scope resolve | `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` ai_llm_policies row 존재·enabled(직전 확인) |
| sample/success/429 | 0 / 0 / 0 (재게이트 미실행) |
| **최종 판정** | **HOLD (billed 키 미확보)** |
| bulk apply | 미실행, draft 0 |
| secret 미노출 | ✅(원문 미기재, 이번 WO 키 추출·프록시 없음) |
| 검증 | 코드 변경 없음. `git diff --check` clean / 문서만 |
| 커밋 | 하단(본 CHECK) |

**최종:** provider quota 대안을 코드 기준으로 확정(A 최속·B는 Job env 격리·C는 별도 WO·D 비추천), 전부 billed 키 전제. 현재 billed 키 미확보로 **HOLD**, live 재게이트 미실행, DB write 0. billed 키 확보 시 §7 runbook 적용 후 재게이트 → GO → bulk-apply-run.
