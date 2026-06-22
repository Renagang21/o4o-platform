# CHECK — Store Entitlements /me/check endsAt 노출 V1

**WO:** `WO-O4O-STORE-ENTITLEMENTS-CHECK-ENDSAT-EXPOSURE-V1`
**일자:** 2026-06-22
**성격:** backend-only UX 정합 — `/me/check` 가 `active` 뿐 아니라 `endsAt`/`status`/`startsAt`/`featureCode` 반환. 결제 로직/DB/schema 무변경.
**상위:** `WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1` · `WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1`
**검증:** api-server `tsc --noEmit` 신규 에러 0 (전체 1건은 무관 pre-existing marketTrial)

---

## 1. git 상태 / 다른 세션 WIP

- `git status --short`: clean(작업 시작 시점). 본 WO 변경 = backend 2파일 + 본 CHECK.
- 다른 세션 WIP 미접촉. DB/migration 0.

## 2. 변경 파일 (backend 2)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/store-entitlement/store-paid-feature-entitlement.service.ts` | `getEntitlementStatus(org, serviceKey, planCode, now?)` 추가 — `{ active, status, startsAt, endsAt }` 반환 |
| `apps/api-server/src/modules/store-entitlement/store-entitlement.routes.ts` | `GET /me/check` 응답 확장 (`hasActiveEntitlement` → `getEntitlementStatus`) |

- **프론트 무변경**: `ForeignVisitorSalesSupportPanel`(store-ui-core) / `ForeignVisitorSalesSupportPage` / `storeServiceSubscription.ts` 는 **이미 endsAt 소비 구조**(선행 subscription WO 에서 구현). 백엔드가 endsAt 를 보내면 만료일이 자동 표시된다.

## 3. /me/check 응답 변경

**이전:** `{ serviceKey, planCode, active }`
**이후:**
```json
{
  "success": true,
  "data": {
    "serviceKey": "kpa",
    "planCode": "FOREIGN_VISITOR_SALES_SUPPORT",
    "featureCode": "FOREIGN_VISITOR_SALES_SUPPORT",
    "active": true,
    "status": "ACTIVE",
    "startsAt": "2026-06-22T00:00:00.000Z",
    "endsAt": "2026-07-22T00:00:00.000Z"
  }
}
```
비활성:
```json
{ "success": true, "data": { "serviceKey":"kpa", "planCode":"...", "featureCode":"...", "active": false, "status": null, "startsAt": null, "endsAt": null } }
```

- **하위호환:** `active`(boolean) + `planCode` 유지 → 기존 active-only 소비처(메뉴 게이트 Panel) 무영향. `featureCode`/`status`/`startsAt`/`endsAt` 추가.

## 4. active 판정 기준 (§5.2)

```text
active = status==='ACTIVE' && startsAt<=now && endsAt>now && endsAt!=null
```
- `status` ACTIVE 라도 `endsAt<=now` → active=false.
- `startsAt` 미래 → active=false.
- **`endsAt` null → active=false** (V1 정책 — `getEntitlementStatus` 에서 `endsAt != null` 강제).
- 비활성(행 없음/만료/미시작/취소/endsAt null) → `status/startsAt/endsAt = null`.
- 다중 행 대비 `ORDER BY endsAt DESC`(현재 UNIQUE(org,serviceKey,planCode) 로 단일 행).

> 공유 `isActive`/`hasActiveEntitlement`(다른 `/check` 라우트·메뉴 게이트 의미) **미변경** — `/me/check` 만 endsAt!=null 강화. 실제 구독은 `activateOrExtend` 가 항상 endsAt 설정하므로 정상 데이터에서 두 판정은 일치(endsAt null 이상치에서만 /me/check 가 비활성 처리).

## 5. endsAt 표시 (frontend, 기존 구현)

- `ForeignVisitorSalesSupportPanel`: active 상태 시 "이용 기간: **YYYY.MM.DD** 까지" 표시(`formatDate`, ko-KR). active=false → 잠금 + "월 이용권 결제하기".
- `ForeignVisitorSalesSupportPage`: `check` → `{ active, endsAt }` 반환(이미 구현). `checkSubscription` 가 `data.endsAt` 읽음.
- frontend 가 active 를 임의 계산하지 않고 backend active 를 우선 사용(준수).

## 6. 보존/미접촉 확인 (§8)

| 항목 | 상태 |
|---|---|
| `POST /subscriptions/prepare` · `/confirm` | **미변경** (diff 0) |
| `GET /subscriptions/plans` | 미변경 |
| `PaymentCoreService` / Toss adapter / `o4o_payments` / `store_paid_feature_entitlements` schema | **무변경** |
| `activateOrExtend` / `isActive` / `hasActiveEntitlement` | **무변경** |
| Neture B2B | 미접촉 |
| STORE_SALE_PAYMENT 410 차단 | 유지(미접촉) |
| DB migration | **0** |

## 7. 검증

- `apps/api-server` `npx tsc --noEmit` → **신규 에러 0**. 전체 1건 = `marketTrialController.ts(105,9)` 무관·pre-existing.
- `git diff` = service.ts + routes.ts 2파일(+42/−4). `subscriptions/prepare|confirm`·`paymentService.prepare|confirm`·`activateOrExtend` **diff 0**.
- 배포 후 운영 smoke: §8.

## 8. 배포 후 운영 smoke — **PASS**

- api 배포: run `27950142174` **success** · 리비전 `o4o-core-api-02283-tc4`.
- `GET /api/v1/store-entitlements/me/check?serviceKey=kpa&planCode=FOREIGN_VISITOR_SALES_SUPPORT` (renagang21 = kpa store_owner, 인증):

```json
HTTP 200
{ "success": true, "data": {
  "serviceKey": "kpa", "planCode": "FOREIGN_VISITOR_SALES_SUPPORT",
  "featureCode": "FOREIGN_VISITOR_SALES_SUPPORT",
  "active": false, "status": null, "startsAt": null, "endsAt": null } }
```

- **새 키 `featureCode`/`status`/`startsAt`/`endsAt` 모두 포함** ✅. 하위호환 키 `serviceKey`/`planCode`/`active` 유지 ✅.
- 운영에 활성 이용권 없음 → `active:false` + null (WO §5.1 비활성 예시와 일치) ✅.
- `active=true`(endsAt 표시) 경로는 운영에 paid 구독이 없어 미검증 — 응답 shape·frontend Panel endsAt 표시 로직은 코드상 확인됨(후속 결제 smoke 에서 실데이터 검증).

## 9. 완료 기준 대비 (§11)

| 기준 | 결과 |
|---|---|
| /me/check 가 active + endsAt 안정 반환 | ✅ |
| active 판정에 endsAt 만료 반영 | ✅ (endsAt>now && endsAt!=null) |
| frontend 가 endsAt 기준 만료일 표시 | ✅ (기존 Panel 구현) |
| active=false 결제 버튼 유지 | ✅ (frontend 무변경) |
| active=true "사용 중"+만료일 | ✅ (Panel "이용 기간 ~까지") |
| active-only 소비처 무파손 | ✅ (active/planCode 유지) |
| prepare/confirm 미변경 | ✅ |
| DB/schema/migration 미변경 | ✅ |
| STORE_SALE_PAYMENT 차단 유지 | ✅ |
| CHECK 작성 | ✅ |

## 10. 후속 WO

```text
WO-O4O-STORE-SERVICE-SUBSCRIPTION-SMOKE-V1            ← Chrome profile lock 해소 후 결제 진입 비파괴 smoke
WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-DB-V2  ← plan/price DB화 + 운영자 가격 관리
WO-O4O-STORE-SERVICE-SUBSCRIPTION-BILLING-KEY-V2      ← Toss billing key 자동 정기결제
```

---

*Date: 2026-06-22 · CHECK · backend-only · /me/check 에 featureCode/status/startsAt/endsAt 추가(active 하위호환) · active=ACTIVE&&start<=now&&end>now&&end!=null · 프론트 무변경(기존 endsAt 소비) · prepare/confirm/PaymentCore/schema/migration/Neture B2B/STORE_SALE_PAYMENT 미접촉 · api tsc 신규 에러 0.*
