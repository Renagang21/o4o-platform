# O4O-API-OPERATIONS-RUNBOOK-V1 — 상시 운영 점검 최소 기준

> **상태**: ACTIVE · **작성일**: 2026-10-06 · `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`
> **대체**: [`INTERNAL-BETA-RUNBOOK-V1`](INTERNAL-BETA-RUNBOOK-V1.md)(SUPERSEDED — Internal Beta 단계 종료, 2026-10-06 판정)
> **범위**: `o4o-core-api`(Cloud Run)의 상시 운영 점검 — health · 인증 · API 오류/지연 · DB · 읽기 캐시 상태. 지표를 새로 만들지 않는다. **지금 실제로 관측되는 것만** 다룬다.
> **DB 접속 · 배포 절차**: [`SETUP.md`](../../../SETUP.md) · [`PRODUCTION-MIGRATION-STANDARD`](PRODUCTION-MIGRATION-STANDARD.md) 가 정본이다. 이 문서는 그것을 복제하지 않는다.

---

## 1. 단계 판정

- **Internal Beta 단계는 종료됐다**(2026-10-06). 이유는 세 가지다: 종료 조건의 핵심이던 소비자 결제가 은퇴(410)했고, checkout · payment 카운터는 계측되지 않으며, `BETA_MODE` 는 기본 off 다.
- `GET /health` 와 `GET /api/health` 는 같지 않다 — 앞의 것은 liveness 만 답한다. `GET /api/health` 도 DB 실패를 HTTP 상태로 알리지 않는다(본문 `database.status`). **DB 이상을 HTTP 상태로 감지하려면 `/api/health/ready` · `/api/health/database` 를 본다.**
- 운영 상태는 단계(Alpha/Beta) 표시가 아니라 이 문서의 상시 점검으로 본다.
- `BETA_MODE` 플래그 · 미계측 `OPS.CHECKOUT_*` / `OPS.PAYMENT_*` 상수 · `/internal/ops/metrics` 의 노출 방식은 **후속 코드 정리 WO** 대상이다. 그 전까지 이 문서는 그것들에 기대지 않는다.

## 2. 점검 항목

| 영역 | 무엇을 보나 | 어디서 보나 | 이상 신호 |
|---|---|---|---|
| **Liveness** | 프로세스가 살아 있는가 | `GET /health` — `main.ts` 의 liveness handler(DB 를 보지 않는다, DB 장애 중에도 200) | 200 이 아님 |
| **Health · Readiness** | DB 연결 · 준비 상태 | `GET /api/health/ready` · `/api/health/database` · `/api/health/detailed` — 공개, `routes/health.ts`(`/health/*` 로도 mount) | HTTP 503 |
| **Health 요약** | 전체 상태 한눈에 | `GET /api/health` — DB 조회가 실패해도 **항상 200** 을 반환한다 | HTTP 상태로 판단하지 않는다 — 응답 본문의 `database.status` 가 `healthy` 가 아님 |
| **배포 반영** | 새 revision 이 트래픽을 받는가 | GitHub Actions deploy job · Cloud Run revision · traffic | workflow success 만으로 완료로 보지 않는다 — **job success + 새 revision + traffic 100%** 를 함께 확인 |
| **인증 실패 급증** | 로그인 · refresh 실패가 몰리는가 | Cloud Run **요청 로그**를 route · 응답 코드로 필터 — `POST /api/v1/auth/email/login` · `/api/v1/auth/google/login` · `/api/v1/auth/refresh`(legacy `/api/auth/*` 포함)의 4xx | 4xx 비율 · 건수가 평소 대비 급증. 예상된 실패(잘못된 비밀번호 · `EmailAuthError` · `GoogleAuthError` · refresh token 누락 `NO_REFRESH_TOKEN`)는 **애플리케이션 로그를 남기지 않고** 응답만 하므로 이 경로로만 보인다 |
| **인증 예외** | 인증 처리의 예상 밖 오류 | Cloud Run 애플리케이션 로그 — `[EmailAuthController.*] unexpected error` · `[GoogleAuthController.*] ID token rejected`(warn, reason 포함) 등 `[*AuthController.*]` · `[AuthSessionController.*]` 의 warn/error | 출력 자체가 이상 신호 — 같은 reason 이 몰리면 설정(allowlist · client ID) 확인 |
| **API 오류** | 5xx 비율 | Cloud Run 요청 지표(응답 코드별) · 로그의 error | 5xx 지속 발생 |
| **API 지연** | 응답 지연 | Cloud Run 요청 지연 지표(p50 / p95) | 평소 대비 지속 상승 |
| **DB** | ping · 연결 | `/api/health/database` → 장시간 쿼리는 read-only 채널로 `pg_stat_activity` 확인(SETUP.md) | 503 · ping 지연 지속 |
| **읽기 캐시(in-process)** | 프로세스 로컬 TTL 캐시 오류 | 로그 `[ReadCache] GET error, falling back to DB` · `[ReadCache] SET error`(`cache/read-cache.ts` — `memoryCacheGet()` · 캐시 값 역직렬화 실패 시에만 출력) | 반복 출력 — 기능은 DB fallback 으로 유지되지만 DB 부하 · 응답 지연이 늘어난다. **Redis 장애 신호가 아니다** — `o4o-core-api` 는 Redis 를 쓰지 않는다(Redis 제거 후 in-process 캐시, 인스턴스마다 따로 비고 TTL 로만 만료) |

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
