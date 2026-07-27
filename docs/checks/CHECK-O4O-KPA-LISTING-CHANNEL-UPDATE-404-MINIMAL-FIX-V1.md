# CHECK-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1

> WO: `WO-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1`
> 선행: [`CHECK-O4O-KPA-STORE-HUB-PRODUCT-FLOW-DEPLOY-AND-PRODUCTION-SMOKE-V1`](CHECK-O4O-KPA-STORE-HUB-PRODUCT-FLOW-DEPLOY-AND-PRODUCTION-SMOKE-V1.md) §6 F1
> 실행일: 2026-07-27
> 결론: **수정·배포·프로덕션 실증 완료. 진열 저장 404 해소, 운영 데이터 순증·변경 0**

---

## 1. 문제 (선행 CHECK F1)

`/store/commerce/products/b2c` 의 진열 상태 저장이 프로덕션에서 **항상 404** 로 실패하고,
실패가 `console.error` 로만 처리되어 사용자에게는 **버튼 무반응**으로 보였다.

**원인 — 읽기/쓰기 축 불일치:**

| 축 | 엔드포인트 | service_key 처리 |
|----|-----------|------------------|
| 읽기 | `GET /listings` | `service_key` 미전달 시 **필터 없음** → 전 도메인 반환 |
| 쓰기 | `PUT /listings/:id` | `resolveServiceKeyFromBody` → 미전달 시 **기본값 `kpa-society`** |
| 읽기 | `GET /listings/:id/channels` | `resolveServiceKeyFromQuery` → 미전달 시 **기본값 `kpa-society`** |
| 쓰기 | `PUT /listings/:id/channels` | `resolveServiceKeyFromBody` → 미전달 시 **기본값 `kpa-society`** |

backend 는 이 계약을 [pharmacy-products.controller.ts:32-46](../../apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L32-L46) 에 명문화하고 있다 —
"클라이언트가 그 row 의 실제 `service_key` 를 보내야 한다".
frontend `updateListing` 도 `service_key?` 파라미터를 이미 노출하고 있었으나 **호출부가 전달하지 않았다.**

프로덕션 실데이터가 이를 100% 발현시켰다:

```sql
SELECT service_key, is_active, COUNT(*) FROM organization_product_listings GROUP BY 1,2;
-- neture | t | 20      ← 테이블 전체가 20행, 전량 service_key='neture'
```

기본값 `kpa-society` 로는 어떤 row 도 매칭되지 않는다. `neture` 는 `SERVICE_KEYS.NETURE` 로
[service-keys.ts:26](../../apps/api-server/src/constants/service-keys.ts#L26) 에 정의된 **유효 키**이므로, 전달만 하면 정확히 매칭된다.

---

## 2. 수정 범위 (최소)

**변경 파일 2개 — KPA 전용, backend·DB·API 계약 무변경**

| 파일 | 변경 |
|------|------|
| [services/web-kpa-society/src/api/pharmacyProducts.ts](../../services/web-kpa-society/src/api/pharmacyProducts.ts) | `getListingChannels(listingId, serviceKey?)` — query 에 `service_key` 전달<br>`updateListingChannels(listingId, channels, serviceKey?)` — body 에 `service_key` 전달 |
| [services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx) | `updateListing` 호출에 `service_key: listing.service_key` 전달<br>`ChannelSettingsPanel` 에 `serviceKey` prop 추가 → 조회·저장 양쪽 전달<br>저장 실패·성공 결과 안내 표시 (토글 오류 배너 / 채널 저장 결과 문구 / 조회 실패 문구) |

`serviceKey` 는 **선택 인자**이며 미전달 시 기존 동작(백엔드 기본값)과 동일하므로 하위 호환이다.

### 2.1 하지 않은 것 (범위 고정)

```text
F2 상품명 병합 로직 (master_id 축)      — 미착수, 별건 유지
master_id 기준 UI 재설계                — 미착수
진열 관리 목록 구조 변경                — 미착수
UX 정비 WO(2단계)와 병합                — 분리 유지
GP/KCos 수정                            — 무변경
backend / DB / migration                — 무변경
```

**GP/KCos 영향 없음 근거:** `services/web-glycopharm` · `services/web-k-cosmetics` 에
`updateListing` / `getListingChannels` / `updateListingChannels` **소비처 0건** (grep 확인).
`pharmacyProducts.ts` 는 서비스별 독립 사본이며 공통 패키지가 아니다.

### 2.2 보안 경계 무영향 근거

세 경로 모두 `WHERE id AND organization_id AND service_key` 이고 `organizationId` 는
`requirePharmacyOwner` 가 **서버에서** 해석한다. `service_key` 는 서비스 경계 축이 아니라
**row 판별자 축**이므로 (controller 주석 §41-44 와 동일 논지) Boundary Policy·HUB-P0-04 게이트와 충돌하지 않는다.
`service_key` 를 위조해도 타 매장 row 에 도달할 수 없고 자기 조직 row 를 못 찾아 404 가 될 뿐이다.

---

## 3. 검증 게이트

| 게이트 | 결과 |
|--------|------|
| KPA `tsc --noEmit` | **PASS** (exit 0) |
| `npm run build` (web-kpa-society) | **PASS** (4162 modules, exit 0)<br>※ 1회차 esbuild 서비스 crash(Go panic) 발생 — 코드 무관 환경 이슈, 재실행 정상 |
| security spec `store-hub-product-apply-gate.spec.ts` | **PASS 28/28** (선행 CHECK 기준, 본 수정은 backend 무변경) |

---

## 4. 배포

| 항목 | 값 |
|------|-----|
| commit | `5cbd66f73` |
| workflow | `deploy-web-services.yml` |
| run ID | `30269621937` |
| detect-changes 결과 | `deploy-kpa-society` **선택** / glycopharm·k-cosmetics·neture **skipped** |
| 결과 | **success** |
| 리비전 | `kpa-society-web-01724-svq` (이전 `kpa-society-web-01720-s27`) |

→ WO §8 "GP/KCos 무접촉" 이 배포 단계에서도 관철됨.

---

## 5. 프로덕션 실증

계정: 약국 경영자 `renagang21@gmail.com` · 조직 `테스트 약국 매장` (`9c87f46b-…`)
(자격증명은 env 주입, 문서·로그·커밋 미기록)

### 5.1 진열 저장 write smoke — **PASS** (수정 전 FAIL → 수정 후 PASS)

```text
대상 listing : 897e995d-c2dd-4e3c-837d-32fa7995cbf8  (service_key = neture)
BEFORE       : is_active = true       (전체 20행 스냅샷 기록)

[1] "비활성화" 클릭
    → 오류 배너 0건 (수정 전: PUT 404 + 무피드백)
[2] 페이지 새로고침 재조회
    → is_active = false               ✅ persisted = true
[3] "활성화" 클릭 (원복)
[4] 페이지 새로고침 재조회
    → is_active = true                ✅ restored = true

전체 20행 스냅샷 비교 : beforeSnapshot === afterSnapshot  → fullyRestored = true
행 수                : 20 → 20
```

**수정 전 동일 시나리오**(선행 CHECK §4.5)는 `PUT … → 404 NOT_FOUND`, `persisted = false` 였다.

### 5.2 채널 엔드포인트 계약 A/B 실증 — **PASS**

이 매장은 채널 보유가 0건이라 UI 편집기가 노출되지 않으므로,
동일 세션 토큰으로 엔드포인트를 직접 A/B 호출해 계약을 실증했다.

| 호출 | `service_key` 미전달 | `service_key=neture` 전달 |
|------|:---:|:---:|
| `GET /listings/:id/channels` | **404** `NOT_FOUND` | **200** (`data` 0건) |
| `PUT /listings/:id/channels` | **404** `NOT_FOUND` | **200** |

→ 수정이 겨냥한 원인이 정확히 그것이었음이 대조로 확정된다.

**무해성:** `PUT` 은 `channels: []` 로 호출했다. backend 는 `for (const setting of channelSettings)`
루프에 **진입하지 않으므로** `organization_product_channels` 에 대한 DB 쓰기가 0건이다
([pharmacy-products.controller.ts:871-903](../../apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L871-L903)). 감사 로그 1행만 남는다.

### 5.3 UI 회귀 확인 — **PASS**

| 항목 | 값 |
|------|-----|
| `h1` | `상품 진열 관리` |
| `+ HUB에서 상품 추가` CTA | 존재 |
| 구형 폼 흔적 (`외부 참조`/`externalProductId`/`신청 내역`/`PROD-001`) | **0건** |
| 진열 행 수 | 20 |
| console error | 토글·원복 정상 경로 **0건** (401 은 계약 프로브 초기 토큰키 오류로 발생, 수정 후 재실행 시 해소) |

### 5.4 기존 채널 설정 회귀 없음

`organization_product_channels` **0행** (수정 전후 동일) — B2C/KIOSK/TABLET/SIGNAGE 매핑이
플랫폼 전체에 아직 존재하지 않으므로 회귀 대상 데이터가 없다.
`organization_channels` 2행(타 조직 `ec596c46-…` 의 B2C·KIOSK APPROVED) 도 **무변경**.

---

## 6. 운영 데이터 영향

| 항목 | 결과 |
|------|------|
| `organization_product_listings` | 20행 / 전량 `is_active = true` — **수정 전 상태와 동일** |
| `organization_product_channels` | 0행 (무변경) |
| `organization_channels` | 2행 (무변경) |
| 생성한 Offer / approval / listing / channel | **0** |
| 순증·변경 | **0** (토글은 변경 후 원복 완료, 채널 PUT 은 빈 배열로 쓰기 미발생) |
| GP/KCos 접촉 | 없음 (코드·배포 모두) |

---

## 7. WO 최소 범위 대조

| 최소 범위 항목 | 결과 |
|----------------|------|
| 1. `service_key` 전달 누락 보정 | ✅ `updateListing` 호출부 |
| 2. 채널 설정 저장 API 경로·파라미터 정합 | ✅ `getListingChannels`(query) · `updateListingChannels`(body) |
| 3. 기존 listing row 식별 계약 유지 | ✅ backend 무변경, `serviceKey` 선택 인자로 하위 호환 |
| 4. `updateListingChannels` 정상 저장·재조회 | ✅ 404 → 200 A/B 실증 (채널 보유 매장 부재로 UI 편집기 실증은 불가 — 아래 §8) |
| 5. 기존 B2C/KIOSK/TABLET/SIGNAGE 설정 회귀 없음 | ✅ 매핑 데이터 0행, 무변경 |

**하지 않을 것** 5개 항목 모두 준수 (§2.1).

---

## 8. 미실증 항목 (정직 보고)

**채널 설정 편집기의 UI 저장·재조회 왕복**은 프로덕션에서 실증하지 못했다.

- 사유: `organization_channels` 를 보유한 조직은 플랫폼 전체에서 `ec596c46-…` **1곳뿐**이며,
  smoke 계정(`테스트 약국 매장`)의 조직이 아니다. 편집기는 `approvedChannels.length > 0` 일 때만 노출된다.
- WO 금지 사항에 따라 **테스트용 채널을 생성하지 않았다.**
- 대체 근거: ① 엔드포인트 A/B 실증(§5.2)으로 404→200 전환 확정,
  ② 저장 축(`resolveServiceKeyFromBody`)은 진열 토글(§5.1)이 실제 저장·영속·원복까지 실증한 **동일 함수**다.

→ 채널을 보유한 매장이 생기면 UI 왕복 smoke 를 1건 추가할 것을 권고한다.

---

## 9. 잔여 사항 (본 WO 범위 외)

| ID | 내용 | 상태 |
|----|------|------|
| F2 | `GET /listings` 응답에 `product_name`/`display_order`/`retail_price` 부재 → 행이 `ID: · 순서: undefined` + 상품명 공백. 실데이터 `offer_id = null`·`master_id` 존재 → **master 축 병합 필요** | 미착수 (별건) |
| F3 | `SERVICE_KEY_LABELS` 에 `neture` 미정의 → 배지 미표시 | 미착수 (F2 와 함께 정리 권장) |

두 건 모두 **표시 계층** 문제이며 저장 동작에는 영향이 없다.

---

## 10. 재현 절차

```bash
# 게이트
cd services/web-kpa-society && npx tsc --noEmit -p tsconfig.json && npm run build

# 프로덕션 실증 (자격증명은 env 주입, docs/local/TEST-ACCOUNTS.local.md 참조)
KPA_EMAIL=... KPA_PASSWORD=... node <scratchpad>/kpa-smoke-pass3.mjs   # 진열 토글 write + 원복
KPA_EMAIL=... KPA_PASSWORD=... node <scratchpad>/kpa-smoke-pass4.mjs   # 채널 엔드포인트 A/B

# 데이터 상태 확인
./bin/cloud-sql-proxy-v2.exe --address 127.0.0.1 --port <PORT> \
  --token "$(gcloud auth print-access-token)" netureyoutube:asia-northeast3:o4o-platform-db
psql -h 127.0.0.1 -p <PORT> -U o4o_api -d o4o_platform
  SELECT service_key, is_active, COUNT(*) FROM organization_product_listings GROUP BY 1,2;
  SELECT COUNT(*) FROM organization_product_channels;
```

---

## 11. 결론

**1단계 smoke 의 마지막 미완 항목(진열·채널 설정 저장 경로)이 해소됐다.**
`CHECK-…-DEPLOY-AND-PRODUCTION-SMOKE-V1` §8 의 "상품 진열 관리 정상" 은 이제 **읽기·쓰기 모두 PASS** 다.

→ **2단계 `WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1` 착수 조건 충족.**

---

*Generated: 2026-07-27*
