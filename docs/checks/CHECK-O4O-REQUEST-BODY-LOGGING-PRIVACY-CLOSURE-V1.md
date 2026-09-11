# CHECK-O4O-REQUEST-BODY-LOGGING-PRIVACY-CLOSURE-V1

> WO: `WO-O4O-REQUEST-BODY-LOGGING-PRIVACY-CLOSURE-V1`
> 목적: API 성능·운영 로그에서 request body 원문을 저장하지 않고, 비식별 메타데이터만 기록한다.
> 상태: 코드·테스트·검증 완료 / production 부정 테스트 = §10
> 코드 커밋: (본 커밋에서 채움)

---

## 1. 배경 (왜)

`WO-O4O-COMPUTER-USE-V0` production smoke 에서, 사용자가 chat 에 입력한 원문
(`테스트`, `비밀번호 1234`)이 Computer Use safe-log 경로가 아니라 **플랫폼 공통
성능 로그**의 `body` 필드에 남는 것이 확인됐다. Computer Use 는 자체 safe-log
whitelist 를 지켜 누출이 없었지만, 그 앞단의 공통 `performanceMonitor` 가 느린
요청(>1000ms)에서 POST body 전문을 기록했다.

원문 로깅은 특정 엔드포인트 문제가 아니라 **전 API 공통 미들웨어**의 기본 정책
문제이므로, 개별 예외가 아닌 공통 정책을 안전한 방향으로 바꾸는 것으로 닫는다.

---

## 2. Census — request/error 로깅 미들웨어 전수 조사

`apps/api-server/src` 전체에서 request body / query 를 로그에 담는 경로를 조사했다.

| 경로 | 마운트 | body 원문 로깅 | 판정 |
|---|---|---|---|
| `middleware/performanceMonitor.ts` (`performanceMonitor`) | ✅ `bootstrap/setup-middlewares.ts` | **YES** — "Slow API Response" warn 의 `body: req.method==='POST' ? req.body : undefined` (line 37) | **수정 대상 (유일한 마운트된 누출)** |
| `common/middleware/global-error.middleware.ts` (`globalErrorHandler`) | ✅ `main.ts` (앱 전역 error handler) | NO — `{ path, method, message, stack }` 만 | 안전, 무변경 |
| `middleware/securityMiddleware.ts` (`sqlInjectionDetection`) | ✅ | NO — `suspiciousFieldNames()` 로 **필드 이름만** (선행 WO 에서 값 제거) | 안전, 무변경 |
| `middleware/error-handler.ts` (`@deprecated`) | ❌ 미마운트 | `redactSensitive(req.body)` (masking) | 미마운트 → 무변경 (§8 주석 참조) |
| `middleware/errorHandler.middleware.ts` | ❌ 앱 전역 미마운트 | NO — `errorContext` 에 body 없음 (`message=error.message`) | 안전, 무변경 |
| morgan / access-log | — | 없음 (body 로깅 access-log 미발견) | 해당 없음 |

**결론:** 앱에 실제로 마운트되어 request body 원문을 남기는 경로는
`performanceMonitor.ts:37` **단 하나**다. 나머지는 안전하거나 미마운트다.

`error-handler`(deprecated) 소비처 검색 결과 앱 전역/라우트 어디에도 live 참조 없음.

---

## 3. 기본 정책 (변경 후)

production 성능·운영 로그가 남기는 것:
method, route/path, statusCode, responseTime(duration), request size(bodyBytes),
response size(content-length), userAgent, ip. **request body raw content = 기록 금지.**

---

## 4. AI / Local Agent / Computer Use / pairing 엔드포인트

`/api/ai/*`, `/api/local-agent/*`, Computer Use, pairing 은 모두 이 공통
`performanceMonitor` 를 통과한다. 개별 예외를 두지 않고 **공통 기본 정책**을
바꿔 이 엔드포인트들의 body 원문도 자동으로 로그에서 빠진다 (§5 선호 방향).

---

## 5. 제거 우선 (masking 아님)

`body: req.body` 를 삭제하고, key 기반 masking(`redactSensitive(body)`)으로
대체하지 **않았다**. body 를 로그 payload 에 넣지 않는 것을 원칙으로 한다
(새 민감 필드가 추가돼도 누락 위험 없음).

query 는 성능 진단에 쓰이므로 유지하되, URL 에 실릴 수 있는 민감 값 방어로
기존 `redactSensitive(req.query)` 를 적용했다 (query 는 키가 제한적이고
body 대비 저위험 — masking 은 보조 방어).

## 6. body 메타데이터

body 원문 대신 `bodyPresent` / `bodyBytes`(content-length 기반) / `contentType`
만 기록한다 (`performanceMonitor.ts` 의 `bodyMeta()`).

## 7. 에러 로깅

마운트된 `globalErrorHandler` 는 원래부터 `{ path, method, message, stack }` 만
기록하고 request body / AI prompt / 입력 텍스트 / credential 을 붙이지 않는다.
변경 불필요. (unmounted deprecated handler 는 §2·§8 참조.)

## 8. 대시보드/로그 분석의 `body` 필드 의존

"Slow API Response" 로그의 `body` 필드를 소비하는 운영 대시보드/분석 쿼리는
발견되지 않았다 (winston → Cloud Logging, 구조화 필드 소비처 없음). 따라서
`body` 필드를 **제거**했고, 분석에 필요한 크기 지표는 `bodyBytes` 로 대체 제공한다.
deprecated `error-handler.ts` 는 미마운트라 분석 대상이 아니며 이번 범위에서 손대지 않는다.

---

## 9. 테스트

`src/middleware/__tests__/performanceMonitor.privacy.test.ts` (신규) — logger mock 으로
로그 payload 를 캡처해 검증. `security-log-redaction.test.ts` 와 함께 26건 PASS.

| # | 검증 | 결과 |
|---|---|---|
| 1 | AI 채팅 메시지 원문 로그 0 | PASS |
| 2 | Computer Use type_text 입력 텍스트 로그 0 | PASS |
| 3 | 비밀번호류 입력 로그 0 | PASS |
| 4 | 토큰류 입력 로그 0 | PASS |
| 4-b | query 민감 값 redact | PASS |
| 5 | Slow API Response 정상 생성 + body 필드 없음 + 메타데이터 | PASS |
| 6 | API Performance 매 요청 정상 생성 (fast 포함) | PASS |
| 7 | route/status/duration 유지 | PASS |
| 8 | request size(bodyBytes) 메타데이터 유지 | PASS |

type-check: `tsc --noEmit` exit 0 / lint: eslint exit 0 / CI: (커밋 후 확인).

---

## 10. Production 부정 테스트

(배포 후 채움)

- 배포 revision:
- 방법: 비식별 고유 문구 `O4O privacy smoke unique phrase 2026` 를 slow 응답이
  나는 엔드포인트로 POST → Cloud Run 로그에서 해당 문구 검색.
- 기대: 문구 hit 0, "API Performance"/"Slow API Response" 로그는 정상 생성.
- 결과:

---

## 완료 기준 대조 (§14)

| 항목 | 상태 |
|---|---|
| RAW REQUEST BODY LOGGING = 0 | ✅ (performanceMonitor body 제거) |
| AI MESSAGE LOGGING = 0 | ✅ (테스트 1) |
| COMPUTER INPUT LOGGING = 0 | ✅ (테스트 2) |
| CREDENTIAL-LIKE TEXT LOG = 0 | ✅ (테스트 3·4) |
| PERFORMANCE METRICS 유지 | ✅ (테스트 5·6·7·8) |
| ERROR CODE LOGGING 유지 | ✅ (globalErrorHandler 무변경) |
| DB MIGRATION = 0 / DB WRITE = 0 | ✅ (코드/로그만 변경) |
| PRODUCTION NEGATIVE TEST | §10 |
