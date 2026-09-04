# CHECK-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1

**작업**: WO-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1 (소규모 런타임 결함 수정)
**일자**: 2026-09-04
**판정**: **FIXED** — 프로덕션(UTC 호스트) 실조건 재현·수정·검증 완료. migration 불필요.

---

## 0. 요약

| 항목 | 내용 |
|---|---|
| 증상 | Cloud Run 배포 환경에서 Cafe24 Admin API 가 401 로 실패하고, 자동 refresh 도 동작하지 않음 |
| 원인 | Cafe24 가 주는 offset 없는 **KST 벽시계 문자열**을 `new Date()` 로 파싱 → 호스트 시간대 의존 |
| 영향 | UTC 호스트에서 만료시각이 **+9h** 로 저장 → 죽은 토큰을 "유효"로 판단, 최대 9시간 전면 401 |
| 수정 | `parseCafe24Timestamp()` 도입(4개 저장 지점) + 저장 만료값 신뢰 상한 3h |
| 검증 | 단위 7건 PASS · `TZ=UTC` 실 refresh 실측 PASS · `tsc` 0 errors |
| DB 변경 | **없음** (schema/migration/backfill 0). 기존 밀린 행은 상한 로직으로 자가복구 |

---

## 1. 발견 경위

`WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1` Phase A 에서 `products/count` 호출이
`CAFE24_PRODUCT_COUNT_FAILED_401` 로 실패했다. 연결 상태는 정상이었다.

```text
mall=sohae2100 shop=1 status=ACTIVE scopes=["mall.read_product"]
  now                    = 2026-09-04T04:34:52Z
  access_token_expires_at= 2026-09-04T13:01:44Z   → 서비스 판단 "8.45시간 남음"
  last_refreshed_at      = 2026-09-04T02:01:44Z   → 실제 수명은 2시간 (04:01Z 에 이미 만료)
  실제 호출 결과          = 401
  강제 refresh 후          = 정상 (TOTAL_PRODUCTS=70)
```

저장된 만료시각이 `last_refreshed_at + 11h` 였다. Cafe24 access token 수명은 2시간이므로
**정확히 +9h(KST↔UTC) 만큼 밀려 저장**된 값이다.

---

## 2. 원인

Cafe24 token 응답의 `expires_at` / `refresh_token_expires_at` 은 **offset 표기가 없는 KST 벽시계
문자열**이다 (예: `2026-09-04T15:34:52.000`). `new Date(...)` 는 이런 값을 **실행 호스트의 로컬
시간대**로 해석한다.

| 실행 호스트 | 파싱 결과 | 결과 |
|---|---|---|
| 개발 PC (KST) | `06:34:52Z` | 정상 — **로컬에서는 재현되지 않는다** |
| Cloud Run (UTC) | `15:34:52Z` | **+9h** — 죽은 토큰을 유효로 판단 |

`getUsableAccessToken()` 은 저장된 만료시각만 보고 refresh 여부를 정하므로,
UTC 호스트에서는 refresh 를 건너뛴 채 만료 토큰을 계속 넘겨준다. 그 결과 토큰 발급 2시간 뒤부터
**모든 Cafe24 Admin API 가 401** 이 되고, 저장값이 진짜로 지날 때까지(최대 9시간) 복구되지 않는다.

로컬 개발환경이 KST 라 지금까지 드러나지 않았다.

---

## 3. 수정

### 3-1. 파싱 정본화 — `parseCafe24Timestamp()`

[`apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts`](../../apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts)

offset(`Z` 또는 `±hh:mm`)이 없으면 **KST 로 못박아** 해석한다. offset 이 명시돼 있으면 Cafe24 가
직접 밝힌 값이므로 그대로 신뢰한다. 빈 값·해석 불가 값은 `CAFE24_INVALID_TIMESTAMP` 로 실패시킨다
(조용히 `Invalid Date` 를 저장하지 않는다).

Cafe24 wire 계약을 소유한 파일에 두어 파싱 규칙이 한 곳에만 존재하게 했다.

### 3-2. 적용 지점 4곳

[`cafe24-connection.service.ts`](../../apps/api-server/src/modules/cafe24/services/cafe24-connection.service.ts)
의 `new Date(token.expires_at)` / `new Date(token.refresh_token_expires_at)` 전부 교체.

| 위치 | 경로 |
|---|---|
| `upsertFromTokenResponse` | 최초 OAuth 승인 / 재승인 저장 |
| `getUsableAccessToken` | refresh 결과 저장 |

저장소 전체에서 Cafe24 만료시각을 파싱하는 다른 지점은 없다 (`grep expires_at` 전수 확인 — 나머지는
entity 컬럼 선언과 migration DDL).

### 3-3. 기존 밀린 행 자가복구 — 신뢰 상한

이미 UTC 호스트가 써 넣은 행은 파싱을 고쳐도 그대로 남는다. 그 행은 최대 9시간 동안 refresh 없이
401 을 계속 낸다. **migration/backfill 없이** 복구하기 위해 저장값 신뢰 상한을 뒀다.

```ts
const MAX_ACCESS_TOKEN_LIFETIME_MS = 3 * 60 * 60 * 1000; // 실제 수명 2h + 여유 1h
const expiryTrustworthy = accessExp <= now + MAX_ACCESS_TOKEN_LIFETIME_MS;
if (expiryTrustworthy && accessExp - REFRESH_SKEW_MS > now) return decrypt(...);
```

상한을 넘는 만료시각은 정의상 결함으로 밀린 값이므로 믿지 않고 즉시 refresh 한다.
정상 refresh 1회로 행이 올바른 값으로 덮이며, 이후에는 상한에 걸리지 않는다.

**DB 데이터 수정은 하지 않았다** (CLAUDE.md §0 — 데이터 변경은 사용자 승인 필요).

---

## 4. 검증

### 4-1. 단위 테스트 — 7건 PASS

[`apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts`](../../apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts)

- offset 없는 값 → KST 해석 (호스트 시간대 무관하게 고정)
- 공백 구분 형식 동일 규칙
- offset 명시(`Z` / `+09:00`) 값은 그대로 신뢰
- **회귀 방지** — 결함이 있던 `new Date()` 해석과 정확히 9시간 갈리는 것을 단언
- 빈 값 / 해석 불가 값은 throw
- 만료 8.45h 저장 행 → 상한 초과로 refresh 경로 진입
- 만료 2h 저장 행 → 저장값 신뢰, refresh 하지 않음

### 4-2. 실환경 재현 검증 — `TZ=UTC` 로 실제 refresh

Cloud Run 과 동일한 UTC 호스트 조건에서 운영 코드 경로(`getUsableAccessToken` → `refreshAccessToken`
→ 저장 → Admin API 호출)를 그대로 실행했다.

```text
hostTZ=UTC now=2026-09-04T06:04:54Z
before stored access_expires = 2026-09-04T06:34:52Z
[cafe24] token refreshed mall=sohae2100 shop=1
after  stored access_expires = 2026-09-04T08:04:54Z  (now +2.00h)   ← 수정 전이면 +11h
       refresh_expires       = 2026-09-18T06:04:54Z  (now +14.00d)
API count = 70
VERDICT: PASS
```

수정 전 동일 조건의 저장값은 `+11h` 였다 (§1). 수정 후 `+2.00h` 로 Cafe24 실제 수명과 일치한다.

### 4-3. 타입

`tsc --noEmit` (apps/api-server 전체) — **0 errors**.

---

## 5. 영향 범위

| 항목 | 영향 |
|---|---|
| 변경 파일 | 3 (client 1 · service 1 · spec 1) |
| DB schema / migration | 없음 |
| DB 데이터 변경 | 없음 (검증 중 발생한 token refresh 1회는 정상 운영 경로) |
| Cafe24 scope | 변경 없음 (`mall.read_product` 유지) |
| 공개 API 계약 | 변경 없음 |
| 다른 도메인 | 없음 — Cafe24 모듈 내부에 한정 |

배포 후 기존 연결은 첫 API 사용 시점에 상한 로직으로 자동 갱신된다. 별도 운영 조치는 불필요하다.

---

## 6. 남은 사항

- 이 결함은 **로컬(KST)에서 구조적으로 재현되지 않는다.** 이후 Cafe24 관련 시간 계산 검증은
  `TZ=UTC` 로 한 번 더 확인하는 것을 권장한다.
- `WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1` 은 이 결함과 무관하게 **실제 도매몰 `mall_id` 와
  OAuth 승인 대기** 상태다 (연결 원장에 테스트몰 1건뿐 · 상품 70건으로 WO §18 모집단 하한 미달).

---

## 7. 변경 파일

| 파일 | 변경 |
|---|---|
| [`apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts`](../../apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts) | `parseCafe24Timestamp()` 추가 |
| [`apps/api-server/src/modules/cafe24/services/cafe24-connection.service.ts`](../../apps/api-server/src/modules/cafe24/services/cafe24-connection.service.ts) | 파싱 4지점 교체 + `MAX_ACCESS_TOKEN_LIFETIME_MS` 신뢰 상한 |
| [`apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts`](../../apps/api-server/src/__tests__/cafe24-token-expiry-timezone.spec.ts) | 신규 — 7건 |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
