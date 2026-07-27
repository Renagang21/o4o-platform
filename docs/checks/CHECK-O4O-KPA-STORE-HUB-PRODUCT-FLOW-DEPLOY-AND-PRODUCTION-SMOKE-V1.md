# CHECK-O4O-KPA-STORE-HUB-PRODUCT-FLOW-DEPLOY-AND-PRODUCTION-SMOKE-V1

> WO: `WO-O4O-KPA-STORE-HUB-PRODUCT-FLOW-DEPLOY-AND-PRODUCTION-SMOKE-V1`
> 실행일: 2026-07-27
> 성격: 배포 확인 + 프로덕션 실 브라우저 smoke (read-only 원칙 + 원복 보장 write 1건)
> 결론: **배포 PASS / 읽기 경로 smoke PASS / 진열 관리 쓰기 경로 FAIL (기존 결함, 이번 3커밋이 유발한 회귀 아님)**

---

## 1. 대상 커밋과 배포 상태

| 커밋 | 제목 | 작성 시각 |
|------|------|-----------|
| `3843dca9d` | fix(store-hub): enforce product apply service approval boundary | 2026-07-26 22:13 +0900 |
| `afad94fb9` | fix(store-hub): enforce private offer seller scope | 2026-07-26 22:31 +0900 |
| `0cbc3952f` | fix(kpa): 깨진 구형 수동 판매 신청 제거 + 진열 관리 편집기 보존 | 2026-07-27 09:58 +0900 |

세 커밋 모두 `origin/main` 조상이며 로컬 `main` 은 `origin/main` 과 완전 동기(ahead 0 / behind 0).

### 1.1 배포 결과 — **신규 배포 불필요 (이미 프로덕션 반영됨)**

| 서비스 | Cloud Run 리비전 | 리비전 생성 | 전달 workflow | run ID | 배포 commit | 결과 |
|--------|------------------|-------------|----------------|--------|--------------|------|
| `o4o-core-api` | `o4o-core-api-02972-pwz` | 2026-07-27T08:18:36Z | `deploy-api.yml` | `30248989718` | `3302d79e6` (=HEAD) | success |
| `kpa-society-web` | `kpa-society-web-01720-s27` | 2026-07-27T07:18:48Z | `deploy-web-services.yml` | `30245522946` | `6a392804e` | success (`deploy-kpa-society`) |
| `glycopharm-web` / `k-cosmetics-web` | (최신) | 2026-07-27T05:21Z | `deploy-web-services.yml` | `30239416872` | `d4278b519` | success |

**포함 검증 (ancestry):**

```text
3843dca9d ⊂ 3302d79e6 (core-api 배포본)      → YES
afad94fb9 ⊂ 3302d79e6 (core-api 배포본)      → YES
3843dca9d ⊂ 6a392804e (kpa web 배포본)       → YES
afad94fb9 ⊂ 6a392804e (kpa web 배포본)       → YES
0cbc3952f ⊂ 6a392804e (kpa web 배포본)       → YES
3843dca9d ⊂ d4278b519 (GP/KCos web 배포본)   → YES
```

**잔여 격차 확인:** `6a392804e..HEAD` 의 변경 중 `services/web-kpa-society/**` · `packages/**` 는 **0건**
(차이는 전량 `apps/api-server/src/scripts/**` OTC 데이터·스크립트 — 프론트 무관, 그리고 api-server 는 HEAD 로 배포 완료).

→ WO §3 "불필요한 서비스 전체 재배포는 하지 않는다" 에 따라 **재배포를 수행하지 않았다.** 세 커밋의 프로덕션 반영은 위 표로 실증.

### 1.2 선행 게이트

| 게이트 | 결과 |
|--------|------|
| `git status --short` | `M pnpm-lock.yaml` 1건 (병렬 세션 소유 추정 — 본 WO 에서 미접촉) |
| `git branch --show-current` | `main` |
| origin/main 동기 | ahead 0 / behind 0 |
| KPA web typecheck (`tsc --noEmit`) | **PASS** (exit 0, 오류 0) |
| api-server build / web-kpa-society build | 배포 workflow(위 run)에서 이미 GREEN — 재실행 생략 |
| security spec `store-hub-product-apply-gate.spec.ts` | **PASS 28/28** |

security spec 세부 (jest):

```text
POST /apply — service approval gate (HUB-P0-01)        6/6
POST /apply — serviceKey spoofing (HUB-P0-04)          7/7
PRIVATE seller scope (HUB-P0-02)                      12/12
GET /applications · /approved — read axis from mount    3/3
```

---

## 2. Smoke 실행 조건

| 항목 | 값 |
|------|-----|
| 도구 | Playwright 1.57.0 (chromium, headless, 1440×1000) |
| 대상 | `https://kpa-society.co.kr` (프로덕션) |
| 계정 | 약국 경영자 `renagang21@gmail.com` (자격증명은 env 주입, 문서·로그·커밋 미기록) |
| 조직 | `테스트 약국 매장` · organizationId `9c87f46b-57a1-4afe-80bd-60782c49ce96` |
| 범위 | KPA 화면 전용. GP/KCos 화면 미사용·미수정 |
| 아티팩트 | 스크린샷 8매 + `smoke-report.json` + `smoke-pass2.json` (scratchpad, 비커밋) |

로그인: `POST /api/v1/auth/login` **200**, 랜딩 `/store`.

---

## 3. Smoke 결과 요약

| # | 시나리오 | 결과 |
|:--:|----------|------|
| 5.1 | 매장 HUB 상품 카탈로그 `/store-hub/b2b` | **PASS** (정상 빈 상태 — DB 근거 확보) |
| 5.2 | 신규 상품 추가 CTA | **PASS** |
| 5.3 | 구형 수동 신청 폼 제거 | **PASS** |
| 5.4 | 상품 진열 관리 `/store/commerce/products/b2c` | **PARTIAL** — 화면·CTA 정상, 행 표시 결손 (F2) |
| 5.5 | 채널 설정 저장·재조회 | **대상 부재** (채널 0건) → 대체 write smoke 수행 → **FAIL (F1)**, 운영 데이터 변경 0 |
| 5.6 | PRIVATE offer 게이트 | **실증 후보 없음** (offers 0행) + 자동 spec PASS |
| 5.7 | 서비스 승인 게이트 | **실증 후보 없음** (offers·approvals 0행) + 자동 spec PASS |

---

## 4. 시나리오별 상세

### 4.1 매장 HUB 상품 카탈로그 (`/store-hub/b2b`) — PASS

```text
GET /api/v1/kpa/pharmacy/products/catalog?limit=20&offset=0  → 200
  body: { success, data: [] (0건), pagination }
GET /api/v1/kpa/groupbuy/enriched                            → 200
console error 0 / pageerror 0 / HTTP 4xx·5xx 0
```

렌더 확인: 페이지 제목 `상품 카탈로그`, 필터 탭(`전체 / B2B / 운영자 / 공급 승인 대상`), 안내 배너,
테이블 헤더(`액션 / 상품명 ▴ / 공급자 ▴ / 공급가 / 권장 소비자가`), 빈 상태 문구
`현재 공급 가능한 상품이 없습니다.` — 오류 문구·무한 로딩·깨진 레이아웃 없음.

**빈 상태가 정상인지 게이트 과차단인지 판별 (프로덕션 DB read-only 조회):**

```sql
SELECT COUNT(*) FROM supplier_product_offers;   -- 0
SELECT COUNT(*) FROM offer_service_approvals;   -- 0
```

→ 공급 오퍼 자체가 **전체 0행**. 빈 목록은 **정상 빈 상태**이며,
`3843dca9d`/`afad94fb9` 게이트에 의한 과차단이 아니다. (WO §5.1 조건 충족)

### 4.2 신규 상품 추가 CTA — PASS

```text
/store/commerce/products/b2c → "+ HUB에서 상품 추가" 링크 1개 감지
클릭 → https://kpa-society.co.kr/store-hub/b2b   (정확 이동, 404 없음)
뒤로가기 → https://kpa-society.co.kr/store/commerce/products/b2c (복귀 정상)
console error 0
```

잘못된 서비스 route 이동 없음.

### 4.3 구형 수동 신청 폼 제거 — PASS

`/store/commerce/products/b2c` 본문 전수 검사:

| 제거 대상 | 검출 |
|-----------|:----:|
| `PROD-` placeholder 입력 | 0개 |
| `외부 참조` | 없음 |
| `externalProductId` | 없음 |
| `신청 내역` 탭 | 없음 |
| `PROD-001` | 없음 |

페이지 `h1` = **`상품 진열 관리`**, 설명 문구 =
`취급 중인 상품의 매장 진열과 채널별 노출을 관리합니다. 새 상품은 매장 HUB 카탈로그에서 추가하세요.`
→ WO §5.3 기대와 일치.

### 4.4 상품 진열 관리 — PARTIAL

```text
GET /api/v1/kpa/pharmacy/products/listings  → 200, data 20건
GET /api/v1/kpa/store-hub/channels          → 200, data 0건
console error 0 / pageerror 0
```

- 진열 행 20개 렌더, 각 행 `활성화/비활성화` 토글 노출 (20개 감지)
- `채널 설정` 버튼 **0개** — `approvedChannels.length > 0` 조건이며 이 매장 채널이 0건이므로 **정상 동작**
  (DB 확인: `organization_channels` where org=테스트 약국 매장 → **0행**)
- **행 표시 결손 (F2)**: 모든 행이 `ID: · 순서: undefined` 로 표시되고 상품명이 공백

### 4.5 채널 설정 저장·재조회 — 대상 부재 → 대체 write smoke → FAIL

WO §5.5 의 1차 대상(채널 설정)은 **이 매장에 채널이 0건**이라 편집기 자체가 노출되지 않아 수행 불가.
쓰기 경로 검증을 회피하지 않기 위해, **원복 가능한 동등 write**(진열 활성 토글)로 대체 수행했다.

```text
대상 listing : 897e995d-c2dd-4e3c-837d-32fa7995cbf8
BEFORE       : is_active = true   (전체 20행 스냅샷 기록)
액션          : "비활성화" 버튼 클릭
결과          : PUT /api/v1/kpa/pharmacy/products/listings/{id} → 404
                { code: NOT_FOUND, message: "Listing not found" }
UI 피드백     : 없음 (console.error 만, toast·오류 문구 미표시)
재조회        : is_active = true  → persisted = false
원복 시도     : 동일 404
AFTER        : is_active = true
전체 스냅샷 비교: beforeSnapshot === afterSnapshot → fullyRestored = true
행 수        : 20 → 20
```

→ **운영 데이터 순증·변경 0** (쓰기가 실패했으므로 변화 자체가 없음).
→ 그러나 **보존 대상이었던 진열 관리 편집기의 저장 경로가 프로덕션에서 동작하지 않음**이 확정됐다. (F1)

### 4.6 PRIVATE offer 게이트 — 실증 후보 없음

- 프로덕션 `supplier_product_offers` **0행** → PRIVATE offer 후보 자체가 존재하지 않음
- WO §8 에 따라 테스트용 Offer 생성 금지 → 생성하지 않음
- 대체 근거: 자동 security spec `PRIVATE seller scope (HUB-P0-02)` **12/12 PASS**
  (허용 매장 통과 / 비허용 매장 404 `OFFER_NOT_AVAILABLE` / body·query 위조 무시 / 목록·count 조건 동일성 / `$N` 파라미터 정합 5종)

**정직 보고: 프로덕션 실증 후보 없음. 자동 테스트로만 검증됨.**

### 4.7 서비스 승인 게이트 — 실증 후보 없음

- `supplier_product_offers` 0행 · `offer_service_approvals` 0행 → SERVICE offer 후보 없음
- 대체 근거: 자동 spec `service approval gate (HUB-P0-01)` 6/6 + `serviceKey spoofing (HUB-P0-04)` 7/7 PASS

**정직 보고: 프로덕션 실증 후보 없음. 자동 테스트로만 검증됨.**

### 4.8 `/store/commerce/products` (주문 상품) — 회귀 확인 PASS

```text
GET /api/v1/kpa/pharmacy/products/orderable                        → 200
GET /api/v1/kpa/pharmacy/multilingual-product-contents/summary     → 200
console error 0
```

5탭(`전체 / B2B / 운영자 승인 / 이벤트·특가 / 판매자 모집`), 빈 상태 문구, `상품 카탈로그 →` 링크 정상.
`0cbc3952f` 의 서브탭 relabel(`판매 신청` → `진열 관리`) 이후에도 라우트·화면 보존 확인.

---

## 5. 콘솔 · 네트워크 종합

| 화면 | console error | pageerror | HTTP 4xx/5xx |
|------|:---:|:---:|:---|
| 로그인 → `/store` | 0 | 0 | 없음 |
| `/store-hub/b2b` | 0 | 0 | 없음 |
| `/store/commerce/products/b2c` | 0 | 0 | 없음 (읽기) |
| CTA 이동 · 뒤로가기 | 0 | 0 | 없음 |
| `/store/commerce/products` | 0 | 0 | 없음 |
| write smoke (진열 토글) | 2 | 0 | **404 ×2 (PUT /listings/:id)** — F1 |

잘못된 API base URL·중복 요청·무한 polling 없음. `notifications/unread-count` 가 화면당 2회 호출되나
레이아웃 마운트 패턴에 따른 기존 동작이며 신규 회귀 아님.

---

## 6. 발견 사항

### F1 — 진열 관리 저장 경로 404 (BLOCKER · 기존 결함)

**분류:** `FRONTEND_REGRESSION` (호출부 파라미터 누락) — **이번 3커밋이 유발한 배포 회귀 아님**

**현상:** `/store/commerce/products/b2c` 의 진열 활성/비활성 토글이 항상 404 로 실패하고, 사용자에게 아무 안내도 표시되지 않는다 (버튼이 무반응처럼 보임).

**원인 (read/write 축 불일치):**

| 축 | 코드 | service_key 처리 |
|----|------|------------------|
| 읽기 | `GET /listings` ([pharmacy-products.controller.ts:730-752](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L730-L752)) | `service_key` 미전달 시 **필터 없음** → 전 도메인 반환 |
| 쓰기 | `PUT /listings/:id` ([pharmacy-products.controller.ts:755-771](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L755-L771)) | `resolveServiceKeyFromBody(req.body)` → body 미전달 시 **기본값 `kpa-society`** 로 고정 |

backend 계약은 [pharmacy-products.controller.ts:32-46](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L32-L46) 에 명문화되어 있다 —
"클라이언트가 그 row 의 실제 `service_key` 를 보내야 한다".
frontend `updateListing` 도 [pharmacyProducts.ts:204-216](services/web-kpa-society/src/api/pharmacyProducts.ts#L204-L216) 에서 `service_key?` 파라미터를 **이미 노출**하고 동일 주석을 달고 있다.

그러나 실제 호출부 [PharmacySellPage.tsx:118-125](services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx#L118-L125) 는 `service_key` 를 **전달하지 않는다**:

```ts
await updateListing(listing.id, { isActive: !listing.is_active });   // service_key 누락
```

**프로덕션 실데이터가 이 결함을 100% 발현시킨다:**

```sql
SELECT service_key, is_active, COUNT(*) FROM organization_product_listings GROUP BY 1,2;
-- neture | t | 20      ← 테이블 전체가 20행이며 전량 service_key='neture'
```

backend 주석은 이 컬럼의 값을 `kpa-society` / `kpa-groupbuy` / `kpa` 로 상정하지만,
프로덕션에 실존하는 유일한 값은 **`neture`** 이다. 기본값 `kpa-society` 로는 어떤 row 도 매칭되지 않는다.
→ 현재 프로덕션의 **모든 진열 행에서 저장이 불가능**하다.

**동일 계약 누락이 남아 있는 경로 (현재는 채널 0건이라 잠복):**

- `getListingChannels` ([pharmacyProducts.ts:236-240](services/web-kpa-society/src/api/pharmacyProducts.ts#L236-L240)) — query `service_key` 미전달
- `updateListingChannels` ([pharmacyProducts.ts:245-255](services/web-kpa-society/src/api/pharmacyProducts.ts#L245-L255)) — body `service_key` 미전달

→ 이 매장에 채널이 생기는 순간 채널 설정 조회·저장도 동일하게 404 가 된다.

**제안 최소 수정 (별도 WO):**

1. `PharmacySellPage` 의 `updateListing` 호출에 `service_key: listing.service_key` 전달
2. `getListingChannels` / `updateListingChannels` 에 `serviceKey` 인자 추가 후 호출부에서 row 값 전달
3. 저장 실패를 `console.error` 로 삼키지 않고 사용자 안내 표시 (WO 2단계 §10 결과 안내 표준과 합류 가능)

**부작용 없음 근거:** 세 경로 모두 `WHERE id AND organization_id AND service_key` 이고 `organizationId` 는
`requirePharmacyOwner` 가 서버에서 해석한다. `service_key` 는 row 판별자일 뿐 서비스 경계 축이 아니므로
Boundary Policy·HUB-P0-04 게이트와 충돌하지 않는다 (controller 주석 §41-44 와 동일 논지).

### F2 — 진열 행 표시 결손 (기존 결함)

**분류:** `KNOWN_LIMITATION` (계약 drift) — 이번 3커밋 무관

`GET /listings` 응답 row 실제 형상:

```json
{ "id","organization_id","service_key","is_active","status","start_at","end_at",
  "total_quantity","per_store_limit","per_order_limit","master_id","offer_id",
  "service_product_id","price","event_price","source_type","source_id",
  "requested_by","decided_by","decided_at","rejected_reason","created_at","updated_at" }
```

`product_name` · `external_product_id` · `display_order` · `retail_price` **부재**.
반면 `ProductListing` 타입 ([pharmacyProducts.ts:34-53](services/web-kpa-society/src/api/pharmacyProducts.ts#L34-L53)) 은 이들을 **필수 필드로 선언**하고 있고,
`PharmacySellPage` 는 이를 그대로 렌더한다 → `ID: · 순서: undefined`, 상품명 공백.

타입 주석은 "`offer_id` 로 catalog 병합해 상품명 도출" 을 해법으로 제시하지만,
**프로덕션 실데이터는 `offer_id = null` 이고 `master_id` 만 존재**한다.
→ 후속 수정은 `master_id` 기준 상품명 병합이어야 한다 (offer 축으로는 해결 불가).

`PharmacyB2BPage`(`/store/commerce/products`)는 병합 로직이 있어 정상 표시되므로,
**같은 데이터에 대해 두 화면의 표시 품질이 갈린다.**

### F3 — service_key 배지 미표시 (관측)

`SERVICE_KEY_LABELS` ([PharmacySellPage.tsx:31-36](services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx#L31-L36)) 는
`kpa` / `kpa-groupbuy` / `cosmetics` / `glycopharm` 만 정의한다.
실데이터 값 `neture` 가 없어 배지가 표시되지 않는다. 기능 영향 없음, F2 수정 시 함께 정리 권장.

---

## 7. 운영 데이터 영향

| 항목 | 결과 |
|------|------|
| 생성한 Offer / approval / listing | **0** |
| 변경된 listing | **0** (write 시도 2회 모두 404 로 실패 → 상태 불변) |
| 전체 20행 `is_active` 스냅샷 | before === after (`fullyRestored = true`) |
| 행 수 | 20 → 20 |
| DB 쓰기 쿼리 | 없음 (SELECT · information_schema 조회만) |
| 기존 PRIVATE 데이터 변경 | 없음 (데이터 자체가 0행) |
| GP/KCos 접촉 | 없음 |

---

## 8. WO 완료 기준 대조

| 기준 | 결과 |
|------|------|
| 배포 성공 | ✅ 3커밋 모두 프로덕션 반영 확인 (재배포 불필요) |
| `/store-hub/b2b` 정상 | ✅ (빈 상태 정상 — offers 0행 근거) |
| 상품 진열 관리 정상 | ⚠️ 읽기·렌더 정상, **쓰기 FAIL (F1)** · 행 표시 결손 (F2) |
| HUB 추가 CTA 정상 | ✅ |
| 구형 신청 폼 미노출 | ✅ |
| 채널 설정 저장·재조회 또는 보류 보고 | ✅ 대상 부재 보고 + 동등 write 대체 수행 (실패 보고) |
| PRIVATE / 서비스 승인 게이트 실증 또는 후보 없음 보고 | ✅ 후보 없음 (DB 근거) + 자동 spec PASS |
| 운영 데이터 원복 | ✅ 순증·변경 0 |
| CHECK 작성 | ✅ 본 문서 |
| commit / push | ✅ |

---

## 9. 2단계 착수 판단

WO 2단계 착수 조건은 "smoke 에서 기능 회귀가 발견되면 먼저 회귀를 수정하고 UX 작업은 그 후" 이다.

- **F1 은 배포 회귀가 아니라 사전 존재 결함**이다 (backend `PUT /listings/:id` 의 `resolveServiceKeyFromBody` 사용은 `3843dca9d` 이전부터 동일, 호출부 누락도 그 이전부터 존재).
- 다만 `0cbc3952f` 가 이 화면을 **단일 목적 "진열 관리" 화면으로 축소**하면서, 동작하지 않는 편집기가 화면의 **유일한 기능**이 되었다. 사용자 체감상으로는 "보존했다고 선언한 기능이 동작하지 않는" 상태다.

→ 권고: 2단계(UX 정비) 착수 전에 **F1 최소 수정 WO 를 선행**한다. F2 는 표시 계약 문제로 F1 과 함께 처리하거나 2단계 §10(결과 안내·빈 상태 표준화)에 합류시킬 수 있다.

---

## 10. 재현 절차

```bash
# 1) 보안 spec
cd apps/api-server && npx jest --testPathPattern="store-hub-product-apply-gate" --no-coverage

# 2) KPA typecheck
cd services/web-kpa-society && npx tsc --noEmit -p tsconfig.json

# 3) 프로덕션 브라우저 smoke (자격증명은 env 주입, docs/local/TEST-ACCOUNTS.local.md 참조)
KPA_EMAIL=... KPA_PASSWORD=... node <scratchpad>/kpa-store-hub-smoke.mjs

# 4) 프로덕션 DB read-only 확인
./bin/cloud-sql-proxy-v2.exe --address 127.0.0.1 --port <PORT> \
  --token "$(gcloud auth print-access-token)" netureyoutube:asia-northeast3:o4o-platform-db
psql -h 127.0.0.1 -p <PORT> -U o4o_api -d o4o_platform
  SELECT COUNT(*) FROM supplier_product_offers;                     -- 0
  SELECT COUNT(*) FROM offer_service_approvals;                     -- 0
  SELECT service_key, is_active, COUNT(*)
    FROM organization_product_listings GROUP BY 1,2;                -- neture | t | 20
```

> Cloud SQL connection name 은 `netureyoutube:asia-northeast3:o4o-platform-db` (gcloud project = `netureyoutube`).

---

*Generated: 2026-07-27*
