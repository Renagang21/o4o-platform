# CHECK — WO-O4O-STORE-HUB-ALL-SERVICES-PRODUCTION-ADOPTION-AND-E2E-V1

- **상태**: `INCOMPLETE — BLOCKED` (전체 완료 선언 불가)
- **작성일**: 2026-08-14
- **대상 서비스**: KPA-Society · K-Cosmetics · GlycoPharm · Pharmacy-Hub (4개)
- **검증 방식**: 프로덕션 실브라우저(Playwright chromium) 실로그인 · desktop(1440×900) + mobile(390×844, iPhone UA, isMobile/hasTouch)
- **검증 계정**: `docs/local/TEST-ACCOUNTS.local.md` 매장 경영자 계정 (SSOT)

> **결론 먼저**: 4개 서비스 중 **Pharmacy-Hub 만 write 포함 전 흐름 PASS**,
> KPA-Society · K-Cosmetics 는 **화면 PASS · write 미검증(공급 데이터 0)**,
> GlycoPharm 은 **Store Hub API 전면 403** 이다.
> WO 완료 기준("4개 서비스 모두 PASS")을 충족하지 못하므로 **"Store Hub 사용자 기능 완료" 를 선언하지 않는다.**

---

## §2 main 통합

`work/commonization-store-hub` 는 이미 main 에 통합돼 있었다 (`5f25f9651`). 미병합 commit·파일 0건 — 본 WO 에서 추가 merge 작업 없음.

## §3 프로덕션 배포 반영

CI 성공이 아니라 실제 배포 리비전 기준으로 확인했다.

| commit | 내용 | Deploy API | Deploy Web |
|---|---|---|---|
| `fa62c8052` | Operator 공통화 merge | success | success |
| `7492cac16` | store_owner organization serviceKey 스코프 해석 | success | — |
| `86d73c011` | 본 WO 수정 (준비 중 제거) | — | success |

`CI Pipeline` 의 `cancelled` 기록(`fa62c8052`·`2afb5925a`·`2c6f2cd8f`)은 **연속 push 로 인한 concurrency 취소**이며 실패가 아니다.
같은 기간 `7492cac16`·`b869dc64a`·`5f25f9651` 의 CI Pipeline 은 모두 `success`, CodeQL 도 `success` 다.

---

## §12 서비스별 완료 매트릭스

범례: `PASS` / `BLOCKED`(업무상 존재하나 데이터·연결 부재로 미검증) / `N/A`(계약상 미구현)

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm | Pharmacy-Hub |
|---|:---:|:---:|:---:|:---:|
| 실로그인 | PASS | PASS | PASS | PASS |
| Store Hub 진입 | PASS | PASS | PASS(화면) | PASS |
| 상품 탐색 화면 | PASS | PASS | **FAIL** | PASS |
| 상품 목록 데이터 | **BLOCKED**(0건) | **BLOCKED**(0건) | **BLOCKED** | PASS(1건) |
| 상품 상세 | **BLOCKED** | **BLOCKED** | **BLOCKED** | PASS |
| 신청/가져오기 | **BLOCKED** | **BLOCKED** | **BLOCKED** | PASS(장바구니 담기) |
| 장바구니 | PASS(빈 상태) | PASS(빈 상태) | **BLOCKED** | PASS(담기 성공) |
| 주문 진입 | **BLOCKED** | **BLOCKED** | **BLOCKED** | PASS(주문 생성) |
| 결제 화면 진입 | N/A | N/A | N/A | PASS |
| dead link | 0 | 0 | 0 | 0 |
| "준비 중" | 0 | **수정 후 0** | **수정 후 0** | 0 |
| white screen | 0 | 0 | 0 | 0 |
| JS exception | 0 | 0 | 0 | 0 |
| 핵심 API 4xx/5xx | 0 | 0 | **5 route 403** | 1 route 409 |
| Desktop | PASS(13 route) | PASS(10 route) | **FAIL** | PASS(16 route) |
| Mobile | PASS(13 route) | PASS(10 route) | **FAIL** | PASS(16 route) |

**결제 화면 진입 `N/A` 근거**: KPA/K-Cosmetics/GlycoPharm Store Hub 는 취급 신청·자료 가져오기 중심이며,
매장 경영자 직접 결제(PG) 동선은 Pharmacy-Hub 계약에만 존재한다 (`/store-owner/payment`).
세 서비스는 결제 화면이 없으므로 부재가 사용자 흐름 결함이 아니다.

---

## §6 dead surface 조치

### 수정 완료 — "준비 중" 표면 2건 (`86d73c011`)

GlycoPharm `/store-hub` · K-Cosmetics `/store-hub` 에 "AI 맞춤 추천 — 준비 중" 블록이 desktop·mobile 양쪽에서 노출됐다.

원인은 공통 `@o4o/shared-space-ui` `StoreHubTemplate` 의 `showAiBlock` 기본값 `true` + `DefaultAiPlaceholder` fallback 이다.
KPA-Society(`StoreHubPage.tsx:46`)와 Pharmacy-Hub(`StoreHubPage.tsx:56`)는 이미 `showAiBlock: false` 로 숨기고 있었고,
두 서비스만 기본값을 그대로 사용했다.

**조치**: 공통 패키지는 건드리지 않고 두 서비스 config 를 기존 2개 서비스와 같은 값으로 정렬 (§5 "같은 결과", §10 "기능 우선").
- `showAiBlock: false` 추가
- 실기능 없는 `aiBlock` config + 미사용 `Sparkles` import 제거
- 검증: `glycopharm-web` / `web-k-cosmetics` `tsc -b` 통과 → 배포(`86d73c011`, Deploy Web Services success)

### 결함 아님으로 판정한 표면

- **KPA `/store-hub/b2b` "현재 공급 가능한 상품이 없습니다"** — 데이터 0건에 대한 정직한 빈 상태. placeholder 아님.
- **KPA `/store-hub/cart` "장바구니가 비어 있습니다"** — 동일.

---

## 미해결 blocker (본 WO 범위에서 해소 불가 — 사용자 판단 필요)

### B1. GlycoPharm — 매장 organization 이 glycopharm 서비스에 연결돼 있지 않다

검증 계정은 `glycopharm:store_owner` role 을 보유하지만, 소속 organization 중 어느 것도 glycopharm 에 등록돼 있지 않다.

`7492cac16` (WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1) 이후 organization 해석은
**serviceKey 스코프**로 결정된다 — `organization_service_enrollments(service_code, status='active')`
∪ `platform_store_slugs(service_key, is_active=true)` 에 등록된 조직만 후보가 된다.
GlycoPharm 후보가 0개 → `status='none'` → 기존 정책대로 403.

실측 (fresh token, API 직접 호출):

| 서비스 | store-hub/overview | capabilities | slug |
|---|---|---|---|
| kpa-society | 200 (org: 테스트 약국) | 200 | 200 |
| k-cosmetics | 200 (org: 테스트 뷰티샵) | 200 | 200 |
| **glycopharm** | 200 `data:null` "User not associated with an organization" | **403** | **403** |

**이는 코드 결함이 아니라 계정·조직 연결 데이터 부재다.** `7492cac16` 은 의도대로 동작하고 있다.
이전에 GlycoPharm 이 동작한 것은 구 `LIMIT 1` 해석이 **KPA 약국 조직을 우연히 집어** 서비스 경계를 넘었기 때문이며, 그 동작이 오히려 결함이었다.

영향 route (desktop·mobile 동일): `/store-hub/b2b` · `/store-hub/blog` · `/store-hub/pop` · `/store-hub/qr` · `/store` — **5개 route 403**.
`/store-hub` 진입 화면 자체는 정상 렌더된다.

**해소 방법**: GlycoPharm 매장 신청·승인 경로(`/glycopharm/store-applications`)를 통해 검증용 조직에 glycopharm enrollment 를 생성해야 한다. 프로덕션 조직 데이터 write 이므로 **승인 없이 수행하지 않았다.**

### B2. 공급 카탈로그가 구조적으로 비어 있다 (KPA · K-Cosmetics · GlycoPharm)

`offer_service_approvals` 테이블이 **전역 0건**이다 (운영자 콘솔 `GET /neture/operator/service-approvals/stats` → `pending 0 / approved 0 / rejected 0 / total 0`).

매장 카탈로그 게이트(`pharmacy-products.controller.ts` `buildServiceApprovalGateSql`)는
`distribution_type='PUBLIC' OR offer_service_approvals(승인)` 이므로,
승인 0건 + 활성 PUBLIC offer 부재 → 세 서비스 카탈로그가 모두 `total=0` 이다.

Pharmacy-Hub 만 상품이 보이는 이유는 노출 축이 다르기 때문이다 —
`PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL` 은 `'pharmacy-hub' = ANY(spo.service_keys)` (공급자 직접 opt-in)를 쓴다.

따라서 KPA·K-Cosmetics 는 **화면은 정상이나 상품 상세·신청·주문 동선을 실행할 데이터가 없다.**
**해소 방법**: 운영자가 offer 를 각 서비스에 승인하거나 PUBLIC offer 를 활성화해야 한다. 공급 카탈로그 실데이터 write 이므로 **승인 없이 수행하지 않았다.**

### B3. Pharmacy-Hub `/store-owner/tablets` — 409 STORE_NOT_CONNECTED

`GET /pharmacy-hub/store-owner/{tablets,screen-sets}` 가 409 `STORE_NOT_CONNECTED`
("매장이 연결되어 있지 않아 태블릿을 관리할 수 없습니다") 를 반환한다. B1 과 같은 계열의 조직 연결 부재다.
화면은 안내 상태로 정상 렌더되며 white screen·React 오류는 없다. 브라우저가 4xx 응답을 console 에 자동 기록하는 것이 §9 의 유일한 잔여 항목이다.

---

## §7 write 검증 — Pharmacy-Hub 실행 기록

프로덕션에서 실제 수행했다. 대상은 이미 존재하던 **`[E2E_TEST]` 표식 검증 상품**이며 실 판매 상품이 아니다.

1. `/store-owner/products` — 목록 1건 노출 PASS
2. `/store-owner/products/3bb54519-…` — 상세 PASS (공급가 9,900원 / 기본 12,000원)
3. **장바구니 담기** → "장바구니에 담았습니다" PASS
4. `/store-owner/cart` — 1건 · 결제 예정 9,900원 PASS
5. **주문하고 결제하기** → 주문 생성 PASS
6. `/store-owner/payment?paymentGroupId=7d773eea-…` — 결제 화면 진입 PASS ("9,900원 결제하기")
7. `/store-owner/orders` — `ORD-20260814-1817` · **결제 대기** PASS

전 단계 console error 0 · uncaught exception 0 · 4xx/5xx 0.
**결제는 완료하지 않았다** (WO 허용). 생성된 주문은 결제 전 상태이며 공급자에게 전달되지 않는다.

> 잔여 정리 대상: `ORD-20260814-1817` (결제 대기). 취소 여부는 사용자 판단.

---

## §9 Console / Network 요약

| 서비스 | route 수 | console error | uncaught | React render error | 4xx/5xx |
|---|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | 13 ×2 viewport | 0 | 0 | 0 | 0 |
| K-Cosmetics | 10 ×2 viewport | 0 | 0 | 0 | 0 |
| GlycoPharm | 10 ×2 viewport | 5 (403 자동기록) | 0 | 0 | 5 (B1) |
| Pharmacy-Hub | 16 ×2 viewport | 1 (409 자동기록) | 0 | 0 | 1 (B3) |

GlycoPharm·Pharmacy-Hub 의 console error 는 모두 fetch 4xx 에 대한 브라우저 자동 기록이며, JS 예외나 React 렌더 오류가 아니다.

---

## 부수 확인 (결함 아님)

- **K-Cosmetics 로그인 serviceKey 는 `k-cosmetics`** 다. `cosmetics` 로 호출하면 정상 계정도
  401 `SERVICE_NOT_MEMBER` 를 받는다. 백엔드 route prefix(`/api/v1/cosmetics/*`)와 다르므로 검증 시 혼동 주의.
- 로그인 응답은 토큰을 **body 가 아니라 cookie(`accessToken`)** 로 내려준다.

---

## 완료 판정

WO 완료 기준은 "4개 서비스 모두 PASS · blocker 0" 이다. B1·B2 가 미해소이므로 **완료 선언하지 않는다.**
두 blocker 모두 코드 결함이 아니라 **프로덕션 조직 연결·공급 승인 데이터 부재**이며, 해소에는 프로덕션 데이터 write 승인이 필요하다.
