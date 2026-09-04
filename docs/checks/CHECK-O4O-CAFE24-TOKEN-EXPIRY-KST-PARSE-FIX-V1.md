# CHECK-O4O-CAFE24-TOKEN-EXPIRY-KST-PARSE-FIX-V1

**작업**: WO-O4O-CAFE24-TOKEN-EXPIRY-KST-PARSE-FIX-V1
**일자**: 2026-09-04
**판정**: **CLOSED** — 코드 수정은 선행 커밋 `2a197b31a` 로 이미 반영돼 있었고, 본 WO 의 §2~§6 전 항목을
`TZ=UTC` 조건에서 **재검증**했다. 이번 회차의 코드 변경은 **0건**이다.

> 선행 기록: [CHECK-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1](CHECK-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1.md)
> (동일 결함 · 동일 수정. 본 문서는 WO 가 요구한 검증 항목 기준으로 증거를 다시 채운 최종 기록이다.)

---

## 1. 원인

Cafe24 token 응답의 `expires_at` / `refresh_token_expires_at` 은 **offset 표기가 없는 KST 벽시계
문자열**이다 (예: `2026-09-04T15:34:52.000`). `new Date(...)` 는 이런 값을 **실행 호스트의 로컬
시간대**로 해석한다.

| 실행 호스트 | `new Date('2026-09-04T15:34:52.000')` | 결과 |
|---|---|---|
| 개발 PC (KST) | `2026-09-04T06:34:52Z` | 정상 — **로컬에서는 재현되지 않는다** |
| Cloud Run (UTC) | `2026-09-04T15:34:52Z` | **+9h** 밀림 |

`getUsableAccessToken()` 은 저장된 만료시각만 보고 refresh 여부를 정하므로, UTC 호스트에서는
만료된 access token 을 "유효" 로 오판해 refresh 를 건너뛴다 → Cafe24 Admin API 가 **401** 을 반환하고
저장값이 실제로 지날 때까지(최대 9시간) 복구되지 않는다.

**최초 관측** (`WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1` Phase A):

```text
mall=sohae2100 shop=1 status=ACTIVE
  now                     = 2026-09-04T04:34:52Z
  access_token_expires_at = 2026-09-04T13:01:44Z   -> 서비스 판단 "8.45h 남음"
  last_refreshed_at       = 2026-09-04T02:01:44Z   -> 실제 수명 2h (04:01Z 만료)
  실제 호출               = CAFE24_PRODUCT_COUNT_FAILED_401
```

저장값이 `last_refreshed_at + 11h` = 정확히 **정상 2h + 9h** 였다.

---

## 2. 수정 (§2 · §3)

### 2-1. 단일 helper 로 일원화

[`apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts`](../../apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts)

```ts
export function parseCafe24Timestamp(value: string): Date {
  const raw = (value ?? '').trim();
  if (!raw) throw new Error('CAFE24_INVALID_TIMESTAMP');
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const parsed = new Date(hasOffset ? raw : `${raw}+09:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('CAFE24_INVALID_TIMESTAMP');
  return parsed;
}
```

- offset 이 없으면 **`+09:00` 을 명시적으로 붙여** Asia/Seoul 기준으로 못박는다 → 실행환경 timezone 무관.
- offset(`Z` / `±hh:mm`)이 이미 있으면 Cafe24 가 직접 밝힌 값이므로 그대로 신뢰한다.
- 빈 값 · 해석 불가 값은 `CAFE24_INVALID_TIMESTAMP` 로 **fail-closed** (조용히 `Invalid Date` 를 저장하지 않는다).

Cafe24 wire 계약을 소유한 파일에 두어 파싱 규칙이 **한 곳에만** 존재한다.

**금지사항 준수**: `process.env.TZ` 전역 변경 없음 · Cloud Run timezone 변경 없음 ·
호출부 `-9h` 산술 없음 · DB schema 변경 없음 · token 포맷 변경 없음.

### 2-2. 적용 지점 — 전수 확인

[`cafe24-connection.service.ts`](../../apps/api-server/src/modules/cafe24/services/cafe24-connection.service.ts)

| line | 경로 | 상태 |
|---|---|---|
| 106 · 107 | `upsertFromTokenResponse` — 최초 OAuth 저장 | `parseCafe24Timestamp` |
| 159 · 160 | `getUsableAccessToken` — refresh 결과 저장 | `parseCafe24Timestamp` |

전수 확인 결과 **Cafe24 wire timestamp 를 파싱하는 지점은 이 4곳이 전부**다.

```text
$ grep -rn "expires_at|expiresAt" apps/api-server/src --include=*.ts | grep -i "new Date|parseCafe24"
  cafe24-connection.service.ts:106,107,159,160   -> parseCafe24Timestamp (Cafe24 wire 값)
  그 외 (auth/kpa/signage/passwordReset 등)      -> 자체 생성 Date 또는 DB Date. Cafe24 무관
```

`cafe24-connection.service.ts:133,140` 의 `new Date(connection.accessTokenExpiresAt)` 은
**DB `timestamptz` 값**(이미 절대시각)이라 timezone 의존이 없다.

### 2-3. 기존 밀린 행 자가복구 — 저장값 신뢰 상한

파싱을 고쳐도 **이미 UTC 호스트가 써 넣은 행**은 그대로 남는다. migration/backfill 없이 복구시키기 위해
저장값 신뢰 상한을 뒀다.

```ts
const MAX_ACCESS_TOKEN_LIFETIME_MS = 3 * 60 * 60 * 1000; // 실제 수명 2h + 여유 1h
const expiryTrustworthy = accessExp <= now + MAX_ACCESS_TOKEN_LIFETIME_MS;
if (expiryTrustworthy && accessExp - REFRESH_SKEW_MS > now) return decrypt(...);
```

상한을 넘는 만료시각은 정의상 결함으로 밀린 값이므로 믿지 않고 즉시 refresh 한다.
정상 refresh 1회로 행이 올바른 값으로 덮인다. **임의 timestamp 수기 보정은 하지 않았다**(§6 지시).

---

## 3. 수정 전 / 후 timestamp 예

동일 입력 `"2026-09-04T15:34:52.000"` (Cafe24 원문 형식), 호스트 `TZ=UTC`:

| | 해석 결과 | 발급시각 대비 |
|---|---|---|
| 수정 전 `new Date()` | `2026-09-04T15:34:52Z` | **+11h** (오차 +9h) |
| 수정 후 `parseCafe24Timestamp()` | `2026-09-04T06:34:52Z` | **+2h** (Cafe24 실제 수명) |

실측 저장값 (§5 production 재검증, `TZ=UTC`):

```text
BEFORE access_exp= 2026-09-04T08:04:54.000Z  refresh_exp= 2026-09-18T06:04:54.000Z
AFTER  access_exp= 2026-09-04T08:37:47.000Z  (+2.00h)
AFTER  refresh_exp= 2026-09-18T06:37:47.000Z (+14.00d)
```

---

## 4. Timezone-independent 테스트 (§4)

[`apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts`](../../apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts)

| § | 요구 | 테스트 | 결과 |
|---|---|---|---|
| 4-1 | offset 없는 KST 문자열 | `'2026-09-04T15:34:52.000'` → `06:34:52Z` | PASS |
| 4-2 | 실행환경 무관 동일 UTC instant | `TZ=UTC` 실행에서 KST 기대값 단언 (+ 공백 구분 형식) | PASS |
| 4-3 | 최초 OAuth token 저장 | `upsertFromTokenResponse` 파싱 경로 | PASS |
| 4-4 | refresh token 저장 | `getUsableAccessToken` 파싱 경로 | PASS |
| 4-5 | access 만료 ≈ +2h | 정상 수명 행은 신뢰, refresh 하지 않음 | PASS |
| 4-6 | refresh 만료 ≈ +14d | production 실측으로 확인 (§5) | PASS |
| 4-7 | offset/Z 포함 입력 안전 처리 | `'…Z'` · `'…+09:00'` 그대로 신뢰 | PASS |
| 4-8 | malformed fail-closed | `''` · `'not-a-date'` → `CAFE24_INVALID_TIMESTAMP` throw | PASS |
| — | 회귀 방지 | 결함이 있던 `new Date()` 해석과 **정확히 9시간** 갈리는 것을 단언 | PASS |

**회귀 확인** — 기존 Cafe24 OAuth/state/token crypto 스위트 포함 `TZ=UTC` 전량 실행:

```text
$ TZ=UTC npx jest src/__tests__/cafe24
PASS src/__tests__/cafe24-oauth-state-and-token-crypto.spec.ts
PASS src/__tests__/cafe24-token-expiry-timezone.spec.ts
Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

`tsc --noEmit` (apps/api-server 전체) — **0 errors**.

---

## 5. Production 검증 (§5)

실제 `sohae2100` 연결에서 **Cloud Run 과 동일한 `TZ=UTC` 조건**으로 운영 코드 경로
(`getUsableAccessToken` → `refreshAccessToken` → 저장 → Admin API)를 그대로 실행했다.

```text
hostTZ= UTC  now= 2026-09-04T06:37:47Z
BEFORE access_exp= 2026-09-04T08:04:54.000Z  last_refreshed= 2026-09-04T06:04:55Z
[cafe24] token refreshed mall=sohae2100 shop=1
AFTER  access_exp = 2026-09-04T08:37:47.000Z  (+2.00h)     <- 수정 전이면 +11h
AFTER  refresh_exp= 2026-09-18T06:37:47.000Z  (+14.00d)
status= ACTIVE   lastError= null
products/count = 70
VERDICT: PASS
```

| 요구 | 결과 |
|---|---|
| `accessTokenExpiresAt` ≈ 발급 +2h | **+2.00h** |
| `refreshTokenExpiresAt` ≈ 발급 +14d | **+14.00d** |
| +9h 오차 없음 | 없음 |
| 갱신 token 으로 `products/count` | **200 · count=70** |
| `status` | `ACTIVE` |
| `lastError` | `null` |

token/secret 실제 값은 출력하지 않았다 (스크립트가 길이만 로깅).

---

## 6. 기존 잘못 저장된 만료시각 — 영향 범위 (§6)

프로덕션 `cafe24_connections` 전수 read-only 조회 (Cloud SQL Auth Proxy 경유):

```text
TOTAL_CONNECTIONS = 1
  mall_id=sohae2100 shop_no=1 status=ACTIVE
  access_life  = last_refreshed_at 대비 +2.00h
  refresh_life = last_refreshed_at 대비 +14.00d
  last_error   = null
SKEWED_ROWS (access_life > 3h) = 0
```

| 항목 | 수 |
|---|---|
| 전체 연결 | **1** |
| +9h 오차가 남아 있는 행 | **0** |
| 수기 보정한 행 | **0** |

유일한 오차 행이었던 `sohae2100/shop1` 은 §5 의 **정상 refresh 경로로 갱신**되어 해소됐다.
현재 시점 기준 잔여 영향 행은 없다. 신규 연결은 수정된 파서를 타므로 재발하지 않는다.

---

## 7. 영향 범위

| 항목 | 결과 |
|---|---|
| 이번 회차 코드 변경 | **0건** (수정은 선행 커밋 `2a197b31a`) |
| DB schema / migration | **0건** |
| DB 데이터 수기 변경 | **0건** (검증 중 token refresh 1회는 정상 운영 경로) |
| Cafe24 scope | **변경 없음** (`mall.read_product` 유지) |
| 공개 API 계약 | 변경 없음 |
| 다른 도메인 | 없음 — Cafe24 모듈 내부에 한정 |

---

## 8. 남은 사항

- 이 결함은 **로컬(KST)에서 구조적으로 재현되지 않는다.** 이후 Cafe24 시간 계산 검증은
  `TZ=UTC` 로 한 번 더 확인한다.
- 회원 인증(Customer Access Token) 흐름의 token 응답도 **동일한 offset 없는 형식**이므로,
  `WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1` 구현 시 `parseCafe24Timestamp()` 를
  그대로 재사용한다 (**새 파서 작성 금지**).
  근거: [CHECK-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1 §1-3](../investigations/CHECK-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1.md)

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
