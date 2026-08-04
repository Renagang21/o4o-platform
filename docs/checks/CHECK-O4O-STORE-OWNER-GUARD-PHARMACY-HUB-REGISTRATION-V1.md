# CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1

> WO: `WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1` (W2)
> 선행: [CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1](CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1.md) §8-5 (W1 차단 결함)
> 작성일: 2026-08-04 · 기준 브랜치: `main`

---

## 0. 결과 요약

| WO 완료 기준 | 결과 |
|---|---|
| 1. Pharmacy-Hub 단일 조직 계정 `resolveStoreAccess()` 성공 | **PASS** (§3-1) |
| 2. `organizationId = c5e3a37a-…` 반환 | **PASS** (§3-1) |
| 3. Pharmacy-Hub 공통 매장 API 최소 smoke | **PASS — 5/5 endpoint 200** (§3-4) |
| 4. KPA·GlycoPharm·K-Cosmetics 권한 회귀 0 | **PASS** (§3-2) |
| 5. 비매장 사용자 접근 차단 유지 | **PASS** (§3-3) |
| 6. renagang21 계속 HOLD | **PASS — 무변경** (§3-5) |
| 7. W1 CHECK 보완 후 W1 최종 종료 | **완료** — W1 §8 갱신 |
| schema / migration / 신규 테이블 / DB write | **0 / 0 / 0 / 0** |
| typecheck·build | **EXIT 0** |

---

## 1. 변경 내용

### 1-1. 공통 registry 등록 (핵심 2건)

[`apps/api-server/src/utils/store-owner.utils.ts`](../../apps/api-server/src/utils/store-owner.utils.ts)

```ts
const STORE_OWNER_ROLES_BY_SERVICE = {
  kpa: ['kpa:store_owner'],
  glycopharm: ['glycopharm:store_owner'],
  cosmetics: ['cosmetics:store_owner'],
  'pharmacy-hub': ['pharmacy-hub:store_owner'],   // 신규
} as const;

const STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY: Record<StoreOwnerServiceKey, string> = {
  kpa: 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
  'pharmacy-hub': 'pharmacy-hub',                 // 신규
};
```

**membership key 근거:** `pharmacy-hub` 는 role prefix 와 `service_memberships.service_key`
가 동일하다 —
[`PHARMACY_HUB_SCOPE_CONFIG.serviceKey = 'pharmacy-hub'`](../../apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts#L37).
프로덕션 실측도 일치 (`service_memberships → pharmacy-hub / active`).
prefix ≠ membership key 인 예외는 `kpa`(→`kpa-society`) 하나뿐이다.

`ALL_STORE_OWNER_ROLES` 는 3개 서비스를 손으로 나열하던 것을
`Object.values(STORE_OWNER_ROLES_BY_SERVICE).flat()` 으로 바꿔 registry 단일 소스로 만들었다.
서비스 추가 시 두 곳을 동기화해야 하던 누락 지점을 제거한 것이며 값은 동일하다.

### 1-2. 컴파일러가 잡아낸 exhaustive map 2건

`StoreOwnerServiceKey` 를 키로 쓰는 `Record<...>` 2개가 TS2741 로 즉시 실패했다.
둘 다 QR/POP 공개 URL origin 매핑이며 service-catalog 에 이미 `pharmacy-hub`
(`pharmacyhub.co.kr`) 항목이 있어 정합 값을 그대로 넣었다.

| 파일 | 상수 | 추가 값 |
|---|---|---|
| `routes/o4o-store/controllers/store-pop.controller.ts` | `POP_SERVICE_TO_CATALOG_KEY` | `'pharmacy-hub': 'pharmacy-hub'` |
| `routes/o4o-store/controllers/store-qr-landing.controller.ts` | `QR_SERVICE_TO_CATALOG_KEY` | `'pharmacy-hub': 'pharmacy-hub'` |

두 controller 는 서비스별 명시 `serviceKey` 로만 mount 되며 **pharmacy-hub mount 는 아직 없다**
→ 현재 도달 불가 경로다. 값을 임의 폴백(`kpa-society`)으로 두면 향후 mount 시 QR 이
kpa-society.co.kr 로 박히는 과거 장애(HOTFIX-O4O-QR-PUBLIC-URL-SERVICE-DOMAIN-FIRST-V1)를
재현하므로 정합 값을 넣었다.

### 1-3. 가드 하드닝 1건 (완료 기준 5 충족에 필요)

`createRequireStoreOwner` 의 통과 조건을 `!isOwner` → `!isOwner || !organizationId` 로 좁혔다.

**왜 필요했나:** registry 등록만 하면 **membership 이 `rejected` 인 Pharmacy-Hub 계정**이
back-compat 가드를 통과해 `req.organizationId = null` 로 핸들러에 들어간다 (아래 §2-3).
`resolveStoreAccess` 계열은 null 을 자체 처리하지만, `createRequireStoreOwner` 를 쓰는
6개 mount 는 그대로 서비스 계층에 null 을 넘겨 0건 조회 또는 NOT NULL 위반 500 을 낸다.
완료 기준 5("비매장 사용자 접근 차단 유지")에 어긋난다.

**기존 서비스 영향 0 (프로덕션 실측):**

| role | active 총원 | 조직 보유 | 조직 미보유 |
|---|:--:|:--:|:--:|
| `kpa:store_owner` | 5 | 5 | **0** |
| `glycopharm:store_owner` | 1 | 1 | **0** |
| `cosmetics:store_owner` | 2 | 2 | **0** |
| `pharmacy-hub:store_owner` | 3 | 2 | 1 (rejected E2E 계정) |

조직 미보유 통과자는 기존 3서비스에 **0명**이다. 또한
`auth-context.middleware.ts` 의 `requireStoreAuth` 는 **이미** `!isOwner || !organizationId`
정책이었고 이쪽만 어긋나 있었다 — 정책 통일이지 신규 정책이 아니다.

---

## 2. 소비처 전수 검증 (Shared Module Change Protocol)

`store-owner.utils.ts` 는 공통 권한 맵이므로 전 소비처를 분류했다.

### 2-1. 영향 없음 — 명시 `serviceKey` 경로 (17 call site)

`allowedRoles` 가 해당 서비스 배열로 한정되므로 registry 확장의 영향을 받지 않는다.

```
'kpa'        : store-content(×8) / store-asset-control / asset-snapshot / store-library-feed /
               kpa-store-owner.util / kpa-checkout / store-seller-recruitment-browse
'glycopharm' : glycopharm/mypage.controller (×2)
```

`store-hub.controller` · `store-qr-landing.controller` 는 factory 파라미터로 serviceKey 를
받으며 `kpa` / `glycopharm` / `cosmetics` 3개 서비스 라우터에서만 mount 된다.

### 2-2. 영향 없음 — 동명이인(로컬 함수)

| 파일 | 사유 |
|---|---|
| `routes/cosmetics/controllers/cosmetics-mypage.controller.ts:87` | 파일 내부 로컬 `isStoreOwner()` — 공통 util 아님 |
| `routes/platform/store-policy.routes.ts:37` | 로컬 `isStoreOwner(ds, storeId, serviceKey, userId)` — 시그니처 자체가 다름 |

### 2-3. 영향 없음 — 하드코딩 allowlist

```
modules/foreign-visitor-partner/foreign-visitor-partner.routes.ts:29
modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.routes.ts:37
modules/store-entitlement/store-entitlement.routes.ts:35
  const STORE_OWNER_SERVICE_KEYS: StoreOwnerServiceKey[] = ['kpa', 'glycopharm', 'cosmetics'];
```

union 확장 후에도 **런타임 allowlist 는 3개 그대로**다 (부분집합이므로 타입도 통과).
외국인 관광객 파트너 QR·매장 유료 이용권/구독 결제는 **pharmacy-hub 에 열리지 않는다** —
의도된 비확장이며, 필요해지면 별도 WO 로 판단한다.

### 2-4. 의도된 확장 — back-compat 경로

`serviceKey` 미지정 호출. 여기서만 `pharmacy-hub:store_owner` 가 새로 인정된다.

| 소비처 | 성격 |
|---|---|
| `routes/platform/store-local-product.routes.ts` (×5) | 공통 매장 — **목표 surface** |
| `routes/platform/store-handled-products.routes.ts` (×4) | 공통 매장 — **목표 surface** |
| `routes/platform/store-tablet.routes.ts:215` | 공통 매장 — **목표 surface** |
| `modules/store/store-library.routes.ts:32` | 공통 매장 — **목표 surface** |
| `modules/store-ai/controllers/*.ts` (×2) | 공통 매장 AI — **목표 surface** |
| `routes/o4o-store/controllers/store-product-library.controller.ts:112` | 공통 매장 — **목표 surface** |
| `routes/o4o-store/controllers/store-product-request.controller.ts:190` | 공통 매장 — **목표 surface** |
| `routes/o4o-store/controllers/store-playlist.controller.ts` (×11) | KPA mount 전용(§2-5) |
| `modules/neture/controllers/seller.controller.ts` (×2) | Neture 판매자(§2-5) |
| `routes/kpa/services/event-offer.service.ts:890` | non-blocking 보조 링크(§2-5) |

**데이터 격리는 유지된다.** 모든 소비처가 `organization_members` 에서 도출한
**본인 조직 id** 로 쿼리를 스코프한다. Pharmacy-Hub 경영자는 자신의 조직
(`c5e3a37a-…`) 행만 보며, 타 서비스 매장 데이터에 접근하지 않는다.
mount prefix 도 `/api/v1/store`, `/api/v1/store-hub/ai`, `/api/v1/products` 로
서비스 중립이다 (`bootstrap/register-routes.ts:328-330, 686-696, 904-907`).

### 2-5. 확장 부작용 — 기록 후 별도 WO 권고

back-compat 경로는 원래부터 kpa·glycopharm·cosmetics 매장주를 서로 통과시킨다.
pharmacy-hub 추가는 그 기존 자세와 **대칭**이지 새 정책이 아니다. 다만 아래 3곳은
서비스 의미상 back-compat 가 부적절하므로 service-aware 전환을 권고한다 (본 WO 범위 밖).

| 소비처 | 관측되는 확장 |
|---|---|
| `neture/seller.controller.ts` `/service-products/:id/apply` | Pharmacy-Hub 경영자가 자기 조직으로 Neture SERVICE 승인 신청 가능. `resolveServiceKey(orgId)` 가 enrollment 를 읽어 `pharmacy-hub` 를 반환하게 된다 |
| `o4o-store/store-playlist.controller.ts` | `/api/v1/kpa/store-playlists` mount 인데 가드는 back-compat — 본인 조직 플레이리스트(현재 0건)만 보이지만 서비스 경계는 흐리다 |
| `kpa/event-offer.service.ts:890` | non-blocking 보조 링크. 실패해도 흐름이 계속되므로 영향 미미 |

---

## 3. 검증 결과 (프로덕션, READ-ONLY)

검증 경로: cloud-sql-proxy → 프로덕션 DB. **DB write 0** (SELECT 및 GET 만).
빌드 산출물(`dist`)을 사용해 **실제 코드**를 실행했다.

### 3-1. 완료 기준 1·2 — `resolveStoreAccess()` 복구

대상: `5ee37566-…` (E2E 테스트 계정, W1 apply 로 매장 주체 생성 완료)

```
role_assignments      pharmacy-hub:store_owner  is_active=true
organization_members  c5e3a37a-…  role=owner  left_at=null
service_memberships   pharmacy-hub  status=active

isStoreOwner(back-compat)        {"isOwner":true,"organizationId":"c5e3a37a-…","memberRole":"owner"}
isStoreOwner('pharmacy-hub')     {"isOwner":true,"organizationId":"c5e3a37a-…","memberRole":"owner"}
resolveStoreAccess(back-compat)  c5e3a37a-4aac-4b89-ab51-1a88b960ed50
resolveStoreAccess('pharmacy-hub') c5e3a37a-4aac-4b89-ab51-1a88b960ed50
```

W1 §8-5 의 `null` → **기대 organizationId 반환**. 완료 기준 1·2 PASS.

### 3-2. 완료 기준 4 — 기존 3서비스 회귀 0

```
cosmetics:store_owner   scoped 31e926a0-…  /  back-compat 31e926a0-…   OK
glycopharm:store_owner  scoped 9c87f46b-…  /  back-compat 9c87f46b-…   OK
kpa:store_owner         scoped 8712bff0-…  /  back-compat 8712bff0-…   OK
```

cross-service leakage 도 차단 유지:

```
Pharmacy-Hub 사용자 → resolveStoreAccess('kpa')        = null
                    → resolveStoreAccess('glycopharm') = null
                    → resolveStoreAccess('cosmetics')  = null
KPA 매장주        → createRequireStoreOwner('pharmacy-hub') = 403 MEMBERSHIP_NOT_FOUND
Pharmacy-Hub 매장주 → createRequireStoreOwner('kpa')          = 403 MEMBERSHIP_NOT_FOUND
```

### 3-3. 완료 기준 5 — 비매장 사용자 차단

미들웨어 실행 결과 (`createRequireStoreOwner`):

| 사용자 | back-compat | `'pharmacy-hub'` | `'kpa'` |
|---|---|---|---|
| PH active owner | **200** org=c5e3a37a-… | **200** org=c5e3a37a-… | 403 MEMBERSHIP_NOT_FOUND |
| PH rejected (membership rejected) | **403** STORE_OWNER_REQUIRED | 403 MEMBERSHIP_NOT_ACTIVE | 403 MEMBERSHIP_NOT_FOUND |
| KPA store owner | 200 org=c9beb4a2-… | 403 MEMBERSHIP_NOT_FOUND | **200** org=c9beb4a2-… |
| 비매장 사용자 | **403** STORE_OWNER_REQUIRED | 403 MEMBERSHIP_NOT_FOUND | 403 MEMBERSHIP_NOT_FOUND |

`PH rejected` 의 back-compat 403 은 §1-3 하드닝의 직접 효과다 (하드닝 전에는 200 + org=null).

### 3-4. 완료 기준 3 — 공통 매장 API smoke

실제 `AppDataSource`(entity 274) + 실제 `requireAuth`(JWT 검증·DB 사용자 조회) +
실제 라우터·서비스로 in-process HTTP 호출. **GET 만 호출 — DB write 0.**

| endpoint | PH active owner | PH rejected |
|---|---|---|
| `GET /api/v1/store/local-products` | **200** success | 200 빈 목록 (핸들러 graceful) |
| `GET /api/v1/store/handled-products` | **200** success | 200 빈 목록 (핸들러 graceful) |
| `GET /api/v1/store/tablets` | **200** `array(0)` | **403** STORE_OWNER_REQUIRED |
| `GET /api/v1/store/product-pool` | **200** success | **403** STORE_OWNER_REQUIRED |
| `GET /api/v1/store/library` | **200** `array(0)` | **403** STORE_OWNER_REQUIRED |

변경 전에는 5개 전부 접근 불가(403 또는 빈 응답)였다. `array(0)` 은 신규 매장이라
자료가 없는 정상 상태이며, 조직 스코프가 실제로 적용됐다는 증거다.
`local-products` / `handled-products` 의 rejected 200 은 `organizationId === null` 일 때
**명시적으로 빈 payload 를 반환**하는 기존 설계이며 데이터 노출 0이다
(`store-local-product.routes.ts:126-129`, `store-handled-products.routes.ts:87-90`).

### 3-5. 완료 기준 6 — renagang21 HOLD 유지

```
후보 조직 3건 (무변경): KCOSA3DDC841B946 / kpa-pharm-1088602873 / neture-supplier-6967ebe0
ph-pharm-* 조직: 없음
resolveStoreAccess('pharmacy-hub') = null
프로덕션 전체 ph-pharm-* 조직 수 = 1 (E2E 계정 것 하나)
```

`AMBIGUOUS_ORGANIZATION` HOLD 그대로다. **이번 작업에서 renagang21 관련 write 0.**

### 3-6. 타입·빌드

```
npx tsc --noEmit -p tsconfig.build.json    EXIT 0
npx tsc        -p tsconfig.build.json      EXIT 0
```

---

## 4. 범위 밖 (의도적 미포함)

| 항목 | 사유 |
|---|---|
| `resolveStoreAccess()` 의 `ORDER BY` 없는 `LIMIT 1` 비결정성 | 다중 조직 사용자(renagang21) 선택 정책 문제. 본 WO 는 단일 조직 사용자 접근 복구에 한정 — **별도 WO** |
| 신규 승인 프로비저닝 E2E | 안전한 픽스처/롤백 설계 필요 (W1 §8-6). **W2 완료 후 별도 검증** |
| foreign-visitor-partner · store-entitlement 에 pharmacy-hub 확장 | §2-3 — 하드코딩 allowlist 유지가 안전한 기본값 |
| neture seller · store-playlist service-aware 전환 | §2-5 — 기존 back-compat 부채이며 본 WO 원인 아님 |
| `src/scripts/audit-roles.ts` ServiceKey 미정합 | 운영 경로 아닌 감사 스크립트 (W1 §8-1) |

---

## 5. 변경 파일

```
apps/api-server/src/utils/store-owner.utils.ts                              (registry 2 + 가드 하드닝)
apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts    (exhaustive map +1)
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts (exhaustive map +1)
docs/checks/CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1.md     (본 문서)
docs/checks/CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1.md             (W1 §8 종료 갱신)
```

schema 0 · migration 0 · 신규 테이블 0 · DB write 0

---

*W1(프로비저닝) + W2(가드 등록) 로 Pharmacy-Hub 매장 주체가 실제 사용 가능 상태가 되었다.*
