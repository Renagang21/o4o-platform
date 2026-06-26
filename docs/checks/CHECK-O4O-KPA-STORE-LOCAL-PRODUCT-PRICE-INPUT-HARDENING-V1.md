# CHECK-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1

> WO-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1 실행 결과
> 실행일: 2026-06-26 · 대상: API `o4o-core-api`
> 선행: IR-O4O-KPA-STORE-LOCAL-PRODUCT-CREATE-VALIDATION-AUDIT-V1 (원인 확정)
> 구현 커밋: `3309cbb9b` (backend 단일 파일) — API Cloud Run 배포 success

## 1. 배경 / 원인

- `store_local_products.price_display` 는 **numeric(12,2)** 컬럼.
- 표시 가격에 `"10,000원"`·`"₩10000"` 등 비숫자 포함 문자열이 들어오면 Postgres numeric 캐스팅 실패 → **500 INTERNAL_ERROR** (`invalid input syntax for type numeric`).
- 운영 UI 는 `type="number"` 라 정상이나, 직접 API 호출/향후 텍스트 입력 시 방어가 없었음(IR §6).

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/platform/store-local-product.routes.ts` | `normalizePriceDisplay()` 헬퍼 추가 + POST/PUT `/local-products` 적용. 백엔드 단일 파일 |

- DB/엔티티/migration/프론트/온라인 판매 **무변경**.

## 3. 정제·검증 규칙 (`normalizePriceDisplay`)

| 입력 | 결과 |
|---|---|
| null / '' / 미지정 | `null` (가격 미지정) |
| number ≥ 0 | 그대로 |
| number < 0 / NaN | **400** |
| 문자열(쉼표·`₩`·`원`·공백 포함) | 정제 후 `^\d+(\.\d+)?$` 면 숫자, 아니면 **400** |
| 순수 비숫자("문의" 등) | **400 VALIDATION_ERROR** |

→ 운영 number input 정상값은 그대로, 표시용 포맷 문자열은 정제, 진짜 비숫자는 400. **500 제거.**

## 4. 브라우저 smoke (배포본 `3309cbb9b`, 2026-06-26, in-page API)

| 케이스 | 입력 | 결과 |
|---|---|---|
| 포맷 문자열 | `"10,000원"` | ✅ **201**, price="10000" (이전 500 → 정제 성공) |
| 정상 숫자 | `10000` | ✅ 201, price="10000" |
| 쉼표 문자열 | `"12,000"` | ✅ 201, price="12000" (정제) |
| 순수 비숫자 | `"문의"` | ✅ **400** VALIDATION_ERROR "표시 가격은 숫자만 입력할 수 있습니다. (예: 10000)" |

- 더 이상 500 미발생. 생성된 SMOKE 제품(a/b/c)은 검증 후 전부 삭제(200).
- tsc(api-server) error 0, API 배포 success.

## 5. 비영향

- POST/PUT 외 GET/DELETE 무변경. 운영 number input 흐름 동일(정상 숫자 그대로 통과).
- GP/KCos: 동일 백엔드 엔드포인트지만 변경은 **방어 강화(정제/400)** 뿐 — 정상값 동작 불변. 온라인 판매 무관.
- 동시 세션의 handled-products 작업과 무관(다른 파일).

## 6. 남은 후속

- 프론트 입력 UX(쉼표 자동 표기/안내)는 선택적 개선 — 현재 number input 으로 충분.
- `WO-O4O-KPA-TABLET-IDLE-ENTER-DELAY-SETTING-V1` (Idle 진입 시간 설정화) — UX 설계 필요.

## 결론

`price_display` 비숫자 입력으로 인한 500 을 **정제(쉼표·통화기호 제거) + 검증(비숫자 400)** 으로 해소. POST/PUT 두 경로 적용, 운영 정상 흐름·GP/KCos·온라인 판매 무영향. tsc·배포 통과, in-page API smoke 4케이스 PASS, 테스트 데이터 정리 완료.
