# CHECK-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1

> WO: `WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1`
> 작업일: 2026-08-01 · 브랜치: `main` · 작업 전 HEAD `614d46021`

---

## 1. 배경

직전 WO(`...-IP-BLOCK-TTL-AND-UNBLOCK-V1`)에서 IP 차단 키가 미검증 헤더에서 파생된다는
코드 결함을 확인하고 중지했다. 본 WO 는 그 선행 정비다 — **신뢰 가능한 client IP 판정**과
**보안 로그 redaction** 을 함께 닫는다.

---

## 2. 프로덕션 프록시 체인 실측

### 2-1. 측정 방법

임시 진단 엔드포인트 `GET /api/v1/admin/diagnostics/proxy-chain` 를 배포해 1회 측정했다.

- `platform:admin` / `platform:super_admin` 전용, **호출자 자신의 요청 정보만** 반환
- 쿠키 · Authorization · 전체 헤더 · 전체 요청 객체 미반환, XFF 원문 미로깅
- IP 는 마스킹 (`203.0.113.7` → `203.0.*.*`), 임의 IP 조회·입력 기능 없음
- DB read/write · migration 없음
- **실제 injection 문자열이나 차단 이벤트를 발생시키지 않았다** — 정상 GET 2회만 사용
- 측정 종료 후 **엔드포인트 제거** (§7)

### 2-2. 결과 (마스킹)

경로: `client → 글로벌 외부 HTTPS LB(o4o-global-lb, path-matcher-api) → serverless NEG → Cloud Run`

**수정 전 (`trust proxy: true`)**

| 요청 | 컨테이너가 받은 XFF (좌→우) | `req.ip` |
|------|------------------------------|----------|
| A. XFF 미주입 | `112.153.*.*`(client), `136.110.*.*`(LB) — 2개 | `112.153.*.*` |
| B. `XFF: 203.0.113.7` 주입 | **`203.0.*.*`(위조)**, `112.153.*.*`, `136.110.*.*` — 3개 | **`203.0.*.*`** |

`socket.remoteAddress` 는 두 경우 모두 `169.254.*.*` (Cloud Run 내부 link-local).

### 2-3. 확정된 사실

1. **클라이언트가 주입한 XFF 가 컨테이너까지 전달된다.**
   직전 WO 의 잔여 불확실성이 해소되며 **스푸핑 취약점이 확정**됐다.
   공격자는 `XFF: <피해자 IP>` + injection 패턴 1회로 임의 IP 를 차단시키거나(오탐 규칙은
   임계값이 없다) XFF 를 바꿔 자신의 차단을 회피할 수 있었다.
2. 인프라가 신뢰 가능하게 덧붙이는 항목은 **오른쪽 2개**(`client-ip`, `lb-ip`)이고,
   실제 클라이언트 IP 는 **오른쪽에서 두 번째**다.
   Google 외부 ALB 의 문서화된 형식 `<supplied>,<client>,<lb>` 와 정확히 일치한다.
3. 따라서 신뢰 hop 수 = **2**.

### 2-4. `trust proxy` 값 선택 근거 (로컬 실측)

동일 설정으로 Express 의미를 확정했다 (XFF `FAKE-1, FAKE-2, REAL` 기준):

| 설정 | `req.ip` | 판정 |
|------|----------|------|
| `true` | `FAKE-1` (최좌측) | ❌ 위조값 채택 — 현 상태 |
| `1` | `REAL` (최우측) | ❌ 프로덕션에선 **LB IP** 가 되어 전 사용자가 같은 IP 로 접힘 |
| `2` | `FAKE-2` (오른쪽 2번째) | ✅ 프로덕션에서 실제 client IP, 위조 항목은 `req.ips` 에서 탈락 |

> `1` 이 직관적으로 보이지만 이 토폴로지에서는 **치명적**이다. 실측 없이 정했다면
> 차단·rate-limit 이 전 사용자 공유가 되는 더 나쁜 상태가 됐다.

---

## 3. 구현 — 신뢰 가능한 client IP

`apps/api-server/src/utils/trusted-client-ip.ts` 신설

```ts
DEFAULT_TRUSTED_PROXY_HOPS = 2                  // 실측값
resolveTrustedProxyHops(env?)                   // TRUSTED_PROXY_HOPS 로 조정, 잘못된 값은 기본값 폴백
getTrustedClientIp(req): string                 // req.ip → socket → 'unknown', 정규화 포함
normalizeIp(raw): string                        // ::ffff: 해제 · IPv6 소문자 · 공백 제거
```

`main.ts`: `app.set('trust proxy', true)` → `app.set('trust proxy', resolveTrustedProxyHops())`

**원칙**: XFF 를 직접 파싱해 첫 값을 고르는 방식은 전면 금지하고, trust proxy 판정을 거친
`req.ip` 접근을 이 헬퍼 하나로 통일했다.

### 3-1. 적용 사용처 분류 (30건)

| 축 | 파일 | 처리 |
|----|------|------|
| **차단 판정** | `securityMiddleware.ts` (차단 · auth 실패 · injection 탐지 3곳) | ✅ 헬퍼 |
| **rate-limit** | `rate-limiters.config.ts` · `rateLimiter.ts`(3곳) · `rateLimit.middleware.ts` · `store-public-utils.ts` | ✅ 헬퍼 |
| **감사 로그** | `auth-login.controller.ts` · `SurveyResponseController.ts` · `channels.routes.ts` · `foreign-visitor-partner-qr-code.routes.ts` · `store-qr-landing.controller.ts` | ✅ 헬퍼 |
| **XFF 직접 파싱 제거** | 위 중 6곳 (`rate-limiters.config` · `store-public-utils` · `SurveyResponseController` · `foreign-visitor-partner-qr-code` · `channels.routes` · `store-qr-landing`) | ✅ 전부 제거 |
| 일반 로깅 | `error-handler` · `errorHandler.middleware` · `performanceMonitor` · `deprecation.middleware` · `server.ts` | 유지 (`req.ip` 그대로 — trust proxy 교정으로 자동 개선, 보안 키 아님) |
| 해시 처리 | `public-contact-inquiry.controller` · `contact.controller` (`ipHash`) | 유지 (동일 사유) |
| 기타 기록 | `platformInquiryController` · `join-inquiry.controller` · `dropshipping-admin.controller` · `guest-auth.routes`(2) · `service-auth.routes` | 유지 (동일 사유) |

> `trust proxy` 자체를 고쳤으므로 **유지 항목도 `req.ip` 값이 자동으로 신뢰 가능해진다.**
> 헬퍼로 바꾼 것은 보안 판정축과 XFF 직접 파싱이 있던 곳으로 한정했다(불필요한 diff 회피).

---

## 4. 구현 — 보안 로그 redaction

`apps/api-server/src/utils/security-log-redaction.ts` 신설

`sqlInjectionDetection` 은 탐지 시 `details: { query, body, params }` 로 **요청 전문**을 남겼다.
탐지 패턴에 `--` · `;` · `|` 가 있어 **비밀번호에 그런 문자가 있으면 로그인 요청이 걸리고
비밀번호가 그대로 적재**됐다. 이 경로의 로거(`utils/logger.ts`)는 winston 이며 redaction 이 없다
(`common/logger/index.ts` 의 pino `redact` 는 이 경로에 적용되지 않는다).

| 함수 | 역할 |
|------|------|
| `isSensitiveKey` | password/token/secret/credential/authorization/cookie/session_id/api_key/private_key/otp/pin/card_number/cvv/ssn/resident_number 계열 판정 |
| `redactSensitive` | 민감 키를 `[REDACTED]` 로 치환한 **새 객체** 반환(입력 미변형). 깊이 3 · 키 30 · 배열 10 · 문자열 200자 상한 |
| `suspiciousFieldNames` | **값 없이 걸린 필드 이름만** 수집 |

적용:

- `securityMiddleware`: `details` → `{ method, matchedFields: { query, body, params } }` — **값 0**
- `error-handler`: 오류 로그의 `body` · `query` 를 `redactSensitive` 로 감쌈

탐지 로직과 차단 동작 자체는 변경하지 않았다.

---

## 5. 검증

### 5-1. 단위 테스트 (30건 전부 통과)

| 파일 | 건수 | 내용 |
|------|-----:|------|
| `trusted-client-ip.test.ts` | 13 | hop 기본값·유효성·폴백 · IPv4-mapped/대소문자/공백 정규화 · 표기 차이 동일 키 · req.ip 우선 · socket 폴백 · `unknown` 고정 · **XFF 헤더 직접 미참조** |
| `security-log-redaction.test.ts` | 17 | 비밀번호·토큰·개인식별 키 인식 · 일반 필드 오판 없음 · 중첩/배열 치환 · 민감 키가 객체면 통째 치환 · 입력 미변형 · 깊이·길이·개수 상한 · 반환값에 원본 값 미포함 |

> 작성 중 테스트가 구현을 한 번 잡아냈는데, 확인 결과 **구현이 옳고**(민감 키가 객체를 담으면
> 통째 치환하는 편이 안전) 기대값이 틀렸던 것이라 테스트를 의도대로 수정했다.

### 5-2. 빌드

`tsc --noEmit -p tsconfig.build.json` ✅ 0 errors (변경 각 단계마다 실행)

### 5-3. 프로덕션 검증 — 수정 후 재측정

| 요청 | XFF 항목 수 | `req.ip` | `req.ips` |
|------|:-----------:|----------|-----------|
| A. XFF 미주입 | 2 | `112.153.*.*` (실제 client) | `[112.153.*.*, 136.110.*.*]` |
| B. `XFF: 203.0.113.7` 주입 | 3 | **`112.153.*.*`** (실제 client) | `[112.153.*.*, 136.110.*.*]` — **위조 항목 탈락** |

수정 전 B 는 `203.0.*.*` 였다. **스푸핑 경로가 닫혔다.**

### 5-4. 회귀 스모크

| 항목 | 결과 |
|------|------|
| `/admin/users?limit=3` · `?search=...` | ✅ 200 |
| `/platform-services` · `/pharmacy-hub/service-info` | ✅ 200 |
| 연속 8회 요청 (rate-limit) | ✅ 전부 200 — 429/403 없음 |
| 차단 상태 아님 | ✅ 200 |

hop 수를 잘못 잡았다면 전 사용자가 LB IP 로 접혀 rate-limit·차단이 공유됐을 텐데,
`req.ip` 가 실제 client IP 로 확인되어 그 위험이 없음을 실측으로 확인했다.

---

## 6. 데이터 변경

```
migration 0 · 신규 테이블 0 · 신규 컬럼 0 · DB read/write 0 · 신규 role 0
```

환경변수 `TRUSTED_PROXY_HOPS`(선택, 기본 2)만 추가 가능하다 — 미설정 시 기본값으로 동작한다.

---

## 7. 임시 진단 엔드포인트 제거

`GET /api/v1/admin/diagnostics/proxy-chain` 는 측정 종료 후 **라우트 파일·마운트 모두 제거**했다
(커밋 `5b8a24fff`). 실제 프록시 체인을 반환하는 기능은 공격 표면이므로 상시 기능으로 남기지 않는다.

---

## 8. 남은 위험 · 후속 권고

### 8-1. Cloud Run 직접 URL 우회 (⚠️ 인프라 조치 필요)

`api.neture.co.kr` 은 LB 를 경유하지만, Cloud Run 서비스 URL(`o4o-core-api-*.run.app`)은
`--allow-unauthenticated` 로 **직접 접근이 가능**하다. 그 경로는 XFF 항목 수가 달라
`trust proxy: 2` 가정이 성립하지 않는다.

권고: Cloud Run ingress 를 **`internal-and-cloud-load-balancing`** 으로 제한한다.
애플리케이션 코드로는 닫을 수 없는 항목이라 본 WO 범위 밖으로 둔다.

### 8-2. `rule_sql_injection` 임계값 부재

오탐 1회로 즉시 차단된다. 탐지 패턴도 `(or|and).*=` 처럼 매우 넓어 정상 요청이 걸릴 여지가 크다.
후속 `...-IP-BLOCK-TTL-AND-UNBLOCK-V1` 에서 TTL 과 함께 임계값·경고 단계를 검토할 것.

### 8-3. 후속 WO 재개 조건 충족

직전 WO 의 중지 조건 ①②(신뢰 가능한 IP 판정 불가 / XFF 조작 가능)가 해소되었다.
`WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1` 을 재개할 수 있다.

---

## 9. 미실행 항목과 사유

| 항목 | 사유 |
|------|------|
| admin frontend build | 프론트 변경 0 |
| 실제 차단·TTL E2E | 본 WO 범위 밖 (후속 WO). 프로덕션에 공격성 문자열을 보내지 않았다 |
| Cloud Run ingress 제한 | 인프라 변경 — §8-1 권고로 분리 |
| 일반 로깅·해시 사용처의 헬퍼 전환 | `trust proxy` 교정으로 값이 이미 신뢰 가능해져 불필요한 diff 회피 (§3-1) |
