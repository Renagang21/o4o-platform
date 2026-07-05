# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-QUOTA-RECOVERY-AND-RETRY-GATE-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-QUOTA-RECOVERY-AND-RETRY-GATE-V1`
> 성격: AI key resolve 정정 + quota 복구 시도 + **live 재게이트(rate-limited)**. measurement-only, bulk apply 미실행.
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 커밋: ai-key.util 수정 + 본 CHECK (해시 하단)

> ⚠️ **면책**: 엔지니어링 게이트. secret/API key 값 미기재.

---

## 1. 결론 — 재게이트 **HOLD (provider plan/billing quota)**. rate-limiting 으로 복구 불가.

- **AI key resolve 버그 수정 완료**: `ai-key.util.ts` 조회 컬럼 `isactive`(존재X) → 운영 실측 컬럼 **`"isEnabled"`** 로 정정. unit test 6/6.
- **quota 복구 시도 = rate-limiting**(순차 + 7s 간격 + 65s cooldown + 재시도) → **여전히 429**. 40건 처리 중 **성공 2 / 429 76(재시도 포함)**.
- 429 메시지 = *"You exceeded your current quota, please check your **plan and billing details**"* → **RPM 버스트가 아니라 무료/plan 티어 일일 quota 소진**. rate-limiting 무효.
- **재게이트 판정 = HOLD** (성공률 5% ≪ 98%). 원인은 코드/프롬프트/RPM 아님 — **provider plan/billing**.
- bulk apply 미실행: `product_candidate_description_drafts` **0** 유지.

**한 줄 결론:** ai-key.util 컬럼 버그를 운영 실측 스키마(`"isEnabled"`)에 맞춰 고치고, 429 복구를 위해 **순차+간격+65s cooldown** 으로 재게이트했으나 **429가 지속(2/40 성공)**됐다. 429 메시지가 *plan/billing* 을 지목하므로 이는 **무료 티어 일일 quota 소진**이며 rate-limiting 으로 해소되지 않는다 → **HOLD**. 복구는 **유료 Gemini 티어 / HFF 전용 billed key / Vertex** (billing·GCP 콘솔 조치, 세션 범위 밖)로 넘긴다.

---

## 2. 범위와 비범위

- 수행: ai-key.util 정합 수정 + test, live 재게이트(50 계층 샘플 목표, 40건 처리 후 429 확정으로 중단), 판정, DB 불변, cleanup.
- 미수행(비범위): 40,438 bulk apply, draft 대량 저장, admin UI, approved, 노출, master 승격, 효능/질병 일괄 금지 룰셋.

---

## 3. 기준 문서

BULK-APPLY-EXECUTE / BULK-APPLY / BULK-DRYRUN CHECK/WO + AI-USAGE-FLOW-BASELINE 전부 checkout 존재. 누락 없음.

---

## 4. 직전 HOLD 원인 요약

BULK-APPLY-EXECUTE(커밋 774a72b80): live 50건 게이트 provider 성공 20%(10/50), 40건 HTTP 429. 파이프라인 품질은 양호(parse 100%/medicine 0). 원인 = provider quota.

---

## 5. AI key resolve 조사와 수정

**운영 실측(information_schema, Cloud SQL Auth Proxy)**: `ai_settings` 컬럼 = `id, provider, apiKey, isEnabled, config, createdAt, updatedAt`. enabled 컬럼은 **`isEnabled`** 만 존재(`isActive/isactive/is_active` 전부 부재). **0 rows**.

**스키마 drift(3중 불일치)**:
| 정의 | apiKey 컬럼 | enabled 컬럼 |
|---|---|---|
| **운영 DB(권위)** | `apiKey` | **`isEnabled`** |
| migration `1706000000000` | `apiKey` | `isActive` |
| `AiSettings` entity | `apikey` | `isactive` |

**수정**: `ai-key.util.ts` 조회를 `... WHERE provider=$1 AND "isEnabled" = true` 로 변경(운영 실측 컬럼). try/catch 로 실패 시 env fallback 유지 → **안전**(현재 ai_settings 0 rows 라 기능적 무변화, 그러나 정합성 확보). 주석의 stale `isactive` 근거 정정. entity/migration 정합화는 별도 WO 로 기록.

**unit test 6/6 PASS**(mock DataSource): DB key+enabled→DB key / 빈결과→env / 예외→env / no-key→'' / 미지원 provider→'' / 미초기화→env. → **DB key 있으면 env 보다 우선, 없으면 env fallback** 정상.

> **중요**: 이 버그는 **429 와 무관**. 직전 게이트도 env 키로 10건 성공했다(키 resolve 정상). 즉 key 경로 수정은 429 를 풀지 않는다.

---

## 6. quota 복구 방식 — 시도 및 결과

WO §7 옵션 중 **세션 내 가능한 것 = rate-limiting 재실행**(기존 키의 quota 성격 판별). 유료 티어/전용 키/Vertex 는 billing·콘솔 조치라 세션 밖.

| 시도 | 결과 |
|---|---|
| 순차(concurrency 1) + 7s 간격(≈8.5 RPM) + 429 시 65s cooldown + 1회 재시도 | **여전히 429 지속** — 40건 중 성공 2 / 429 76 |

→ **429 는 RPM 버스트가 아니라 plan/billing quota 소진**(메시지 명시). rate-limiting 무효. **7.1 기존 키 상향 / 7.2 HFF 전용 billed key / 7.3 Vertex** 중 하나가 필요하며 전부 **billing·GCP 콘솔 조치(세션 밖)**.

---

## 7. live 재실측 환경

- 채널: **Cloud SQL Auth Proxy**(`--token`, 127.0.0.1:5434) — 방화벽 authorized-networks 무변경(병렬세션 clobber 없음).
- key: Cloud Run `o4o-core-api` env `GEMINI_API_KEY` 추출(값 미출력·미커밋, 실행 후 삭제).
- 실행: 최소 DataSource[`AiLlmPolicy`] + 실제 `AiPolicyExecutorService.execute(HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION,...)`. measurement-only(draft upsert 코드 없음).
- gotcha: 1차 백그라운드 실행은 프록시 **OAuth 토큰 만료(>1h)**로 ECONNRESET → 프록시 새 토큰 재기동 후 재실행. `AIUsageLog` 는 최소 DataSource 미등록 → logUsage no-op(caught, generation 무영향).

---

## 8. live 재실측 결과

| 지표 | 값 |
|---|---|
| provider / model | gemini / gemini-2.5-flash |
| scope | `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` (resolve 확인) |
| 처리 샘플 | 40 (50 목표 중 429 확정으로 중단) |
| **provider 성공** | **2 (5%)** |
| **429** | **76건(재시도 포함), 실패 대부분** |
| format parse | 성공 2건 파싱 정상(품질 재판정 표본 부족) |
| latency | 429 cooldown 지배 — bulk 판단 불가 |
| full-run(40,438) | 현재 quota 로 **불가**(일일 소진) |

**판정: HOLD** — provider 성공률 5% ≪ 98%.

> 참고: 같은 날 이른 시각 concurrent 게이트 10/50, 오후 rate-limited 게이트 2/40 → 시간 경과로 **일일 quota 가 더 소진**됨을 시사(일일 quota 근거 강화).

---

## 9. guard / 품질 판정

- 이번 재게이트는 성공 표본(2)이 적어 품질 재판정 불가. **품질은 이미 직전 게이트(10 성공: parse 100% / medicineLike 0 / beyondSource 1)에서 게이트 통과 수준으로 확인**됨. 이번 HOLD 는 **quota 문제이지 품질 문제가 아님**.
- guard 코드 자체는 회귀 없음(jest 유지).

---

## 10. DB 불변 검증 (게이트 후, Cloud SQL Auth Proxy)

| 테이블 | 값 | 판정 |
|---|---|---|
| `product_candidate_description_drafts` | **0** | 내 게이트 write 0 ✅ |
| `product_candidates` (HFF) | 44,885 | 불변 ✅ |
| `shared_product_descriptions` | 19,431 | 내 게이트 무관 |
| `product_masters` | 250,445 | **증가는 병렬 세션 다른 트랙(의료기기/약가 Gate B 등) 작업** — 내 게이트는 master write 없음 |
| `product_identifiers` | 742,687 | 동상(병렬 세션) |
| `candidate_status` | 무변경 | ✅ |

- 내 작업 scope 의 금지 테이블 write **0**(draft/master/identifier/shared/status). masters/identifiers 절대값 증가는 **동시 진행 중인 타 트랙**의 결과이며 본 게이트와 무관(게이트 스크립트에 그 write 경로 없음).
- AIUsageLog: 최소 DataSource 미등록으로 write 없음(성공 2건의 usage 도 DB 미기록).

---

## 11. 리스크와 보류 항목

| # | 항목 | 조치 |
|---|---|---|
| 1 | **Gemini plan/billing quota 소진** | HOLD 직접 원인. **유료 티어 / HFF 전용 billed key / Vertex / quota 상향** 필요(billing·콘솔) |
| 2 | 반복 게이트가 quota 를 추가 소진 | 재게이트는 quota 복구 확인 후에만. 무의미한 반복 금지 |
| 3 | ai_settings 스키마 drift(entity `isactive`/migration `isActive`/운영 `isEnabled`) | entity/migration 정합화 별도 WO. 본 util 은 운영 실측에 맞춤(안전) |
| 4 | proxy 토큰 1h 만료 | 재실측은 프록시 새 토큰 직후 실행(14분 < 1h). 장시간은 ADC/서비스계정 필요 |
| 5 | latency(직전 p95 22s) | quota 정상화 후 GO_WITH_LIMIT(낮은 batch+backoff+resume) 필요 |

---

## 12. 다음 WO

재게이트 HOLD → §14 HOLD 분기: **`WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-PROVIDER-QUOTA-ALTERNATIVE-V1`**
- HFF 전용 유료 Gemini key(ai_settings 에 등록 → 이제 util 이 `"isEnabled"`로 정상 resolve) 또는
- Vertex provider 경로(provider adapter 검토, 대규모면 별도 WO), 또는
- fallback provider 비교 실측, 또는
- 일일 quota 내 batch 를 수일 분할하는 운영 runbook.
- quota 확보 후 본 게이트 재실행(성공률 98%↑) → GO → BULK-APPLY-RUN.

---

## 부록. 필수 기록 · 준수

| 항목 | 값 |
|---|---|
| scope | `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` |
| provider / model | gemini / gemini-2.5-flash |
| key 관리 | env `GEMINI_API_KEY`(Cloud Run); DB `ai_settings` 0 rows(util 은 `"isEnabled"` 로 정정) |
| secret 미노출 | 값 미출력·미커밋, 키 파일/임시 스크립트 삭제, 프록시 종료 |
| sample / success / 429 | 40 / 2 / 76(재시도 포함) |
| parse rate / hard guard fail | 성공분 정상 / 표본 부족(직전 게이트 medicine 0) |
| 비용 | 성공 2건 극소(무의미), full-run 현 quota 불가 |
| **최종 판정** | **HOLD (provider plan/billing quota)** |
| bulk apply | **미실행**, draft row **0** |
| 금지 테이블 write | **0**(내 scope) |
| 검증 | ai-key.util test 6/6, tsc 신규 0, git diff --check clean |

**최종:** ai-key.util 컬럼 정합 수정 + test 완료. rate-limiting 재게이트로 **429 가 plan/billing quota(일일 소진)임을 확정** → HOLD. bulk apply 미실행(draft 0), 금지 테이블 write 0. 복구는 유료 키/Vertex 등 billing 조치(별도 WO).
