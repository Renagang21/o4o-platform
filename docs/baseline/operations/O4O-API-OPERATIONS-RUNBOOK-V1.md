# O4O-API-OPERATIONS-RUNBOOK-V1 — 상시 운영 점검 최소 기준

> **상태**: ACTIVE · **작성일**: 2026-10-06 · `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`
> **대체**: [`INTERNAL-BETA-RUNBOOK-V1`](INTERNAL-BETA-RUNBOOK-V1.md)(SUPERSEDED — Internal Beta 단계 종료, 2026-10-06 판정)
> **범위**: `o4o-core-api`(Cloud Run)의 상시 운영 점검 — health · 인증 · API 오류/지연 · 데이터 계층 상태. 지표를 새로 만들지 않는다. **지금 실제로 관측되는 것만** 다룬다.
> **DB 접속 · 배포 절차**: [`SETUP.md`](../../../SETUP.md) · [`PRODUCTION-MIGRATION-STANDARD`](PRODUCTION-MIGRATION-STANDARD.md) 가 정본이다. 이 문서는 그것을 복제하지 않는다.

---

## 1. 단계 판정

- **Internal Beta 단계는 종료됐다**(2026-10-06). 이유는 세 가지다: 종료 조건의 핵심이던 소비자 결제가 은퇴(410)했고, checkout · payment 카운터는 계측되지 않으며, `BETA_MODE` 는 기본 off 다.
- `GET /health` 와 `GET /api/health` 는 같지 않다 — 앞의 것은 liveness 만 답한다. DB 상태는 `/api/health` 계열로 본다.
- 운영 상태는 단계(Alpha/Beta) 표시가 아니라 이 문서의 상시 점검으로 본다.
- `BETA_MODE` 플래그 · 미계측 `OPS.CHECKOUT_*` / `OPS.PAYMENT_*` 상수 · `/internal/ops/metrics` 의 노출 방식은 **후속 코드 정리 WO** 대상이다. 그 전까지 이 문서는 그것들에 기대지 않는다.

## 2. 점검 항목

| 영역 | 무엇을 보나 | 어디서 보나 | 이상 신호 |
|---|---|---|---|
| **Liveness** | 프로세스가 살아 있는가 | `GET /health` — `main.ts` 의 liveness handler(DB 를 보지 않는다, DB 장애 중에도 200) | 200 이 아님 |
| **Health · Readiness** | DB 연결 · 준비 상태 | `GET /api/health` · `/api/health/ready` · `/api/health/database` · `/api/health/detailed` — 공개, `routes/health.ts`(하위 경로는 `/health/*` 로도 mount) | 200 이 아님 · `ready` / `database` / `detailed` 가 503 |
| **배포 반영** | 새 revision 이 트래픽을 받는가 | GitHub Actions deploy job · Cloud Run revision · traffic | workflow success 만으로 완료로 보지 않는다 — **job success + 새 revision + traffic 100%** 를 함께 확인 |
| **인증** | 로그인 · refresh 실패 급증 | Cloud Run 로그 — `[GoogleAuthController.*]` · `[EmailAuthController.*]` · `[AuthSessionController.*]` 의 warn/error | 같은 reason 의 실패가 몰림 · unexpected error |
| **API 오류** | 5xx 비율 | Cloud Run 요청 지표(응답 코드별) · 로그의 error | 5xx 지속 발생 |
| **API 지연** | 응답 지연 | Cloud Run 요청 지연 지표(p50 / p95) | 평소 대비 지속 상승 |
| **DB** | ping · 연결 | `/api/health/database` → 장시간 쿼리는 read-only 채널로 `pg_stat_activity` 확인(SETUP.md) | 503 · ping 지연 지속 |
| **캐시(Redis)** | 장애 시 동작 | 로그 `[ReadCache] GET error, falling back to DB` | 반복 출력 — 기능은 DB fallback 으로 유지되지만 응답 지연이 늘어난다 |

## 3. 대응 원칙

1. **확인은 read-only 로만 한다.** health · 로그 · Cloud Run 지표 · DB SELECT(승인 채널)까지만 한다. 데이터 write · migration 수동 적용 · 장시간 쿼리 kill 은 사용자 명시 승인이 필요하다(`CLAUDE.md` DB · 보안 경계).
2. **원인 확정 전에 고치지 않는다.** 원인이 드러나면 최소 수정 WO 로 처리한다.
3. **진단 HTTP route 를 새로 만들지 않는다**(`CLAUDE.md` §8 — CLI 우선). 필요한 진단은 CLI 또는 read-only DB 채널로 한다.
4. 운영 데이터를 보고할 때는 민감정보를 마스킹한다.

## 4. 이 문서가 다루지 않는 것

- 소비자 결제 · checkout 지표 — 소비자 결제는 은퇴했다([COMMERCE-BOUNDARY](../O4O-STORE-COMMERCE-BOUNDARY-V1.md)).
- B2B 결제 계측 — 필요해지면 별도 WO 로 정하고 그때 이 표에 행을 추가한다. B2B · PaymentCore 의 Stable 계약은 [`CHECKOUT-STABLE-DECLARATION-V2`](../CHECKOUT-STABLE-DECLARATION-V2.md) 가 정본이다.
- 외부 모니터링 · 알림 도구 도입 — 별도 결정 사항이다.

---

*Created: 2026-10-06 · Version 1.0 · Status: ACTIVE*
