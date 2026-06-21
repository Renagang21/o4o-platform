# CHECK — 외국인 여행객 판매지원 메뉴 게이트 V1

**WO:** `WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1`
**일자:** 2026-06-21
**선행:** [`WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1`](./CHECK-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1.md) / [`IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1`](./IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md)
**성격:** 매장 측 유료 기능 게이트(잠금/이용중 분기). 결제·기능 본체 없음.
**검증:** api-server + 3서비스 `tsc --noEmit` PASS

---

## 1. 목표

매장 측 `/store` 에 "외국인 여행객 판매지원" 진입점을 추가하고, 이용권(entitlement) 보유 여부에 따라 잠금/이용중 화면을 분기한다. KPA / GlycoPharm / K-Cosmetics 3서비스 공통.

---

## 2. 조사 결론 (핵심)

| 항목 | 결론 |
|---|---|
| 매장 메뉴 SSOT | `packages/store-ui-core/src/config/storeMenuConfig.ts` (3서비스 config) + `StoreSidebar.tsx`. 공통 모듈 — 소비처 = 3 store 서비스 |
| /store 라우팅 | per-service `App.tsx` 의 `store` route group (공통 아님) |
| store-ui-core | API 비의존(순수 presentational), 빌드 없이 `./src/index.ts` 소스 직접 소비 |
| **organizationId 획득** | **프론트는 organizationId 미보유** — 백엔드가 auth 에서 해석 (`isStoreOwner(ds, userId, serviceKey)` → `{ organizationId }`) |

## 3. 스코프 조정 (기록)

WO 는 "frontend only / 기존 check API 소비" 였으나, 프론트가 organizationId 를 갖지 않아 `check?organizationId=...` 호출이 불가능했다. 지시문 예시 URL(`check?planCode=...`, org 없음)의 의도대로 **self-scoped read 엔드포인트**를 1개 추가했다 (read-only, **DB/migration 없음**):

```
GET /api/v1/store-entitlements/me/check?serviceKey=<kpa|glycopharm|cosmetics>&planCode=<plan>
→ auth 로 organizationId 해석(isStoreOwner) 후 활성 보유 여부 반환
→ { success:true, data:{ serviceKey, planCode, active } }
```

`serviceKey` 축 = store_owner role-prefix(`kpa|glycopharm|cosmetics`, `StoreOwnerServiceKey`). 향후 발급(write) WO 도 동일 축 사용.

---

## 4. 산출물

### 4.1 백엔드 (1)
- [store-entitlement.routes.ts](../../apps/api-server/src/modules/store-entitlement/store-entitlement.routes.ts): `GET /me/check` 추가 (requireAuth + `isStoreOwner` 재사용). 비-owner/org 미연결 시 `active:false`.

### 4.2 공통 UI (store-ui-core)
- [ForeignVisitorSalesSupportPanel.tsx](../../packages/store-ui-core/src/components/ForeignVisitorSalesSupportPanel.tsx): presentational 패널. `check: () => Promise<boolean>` 주입받아 loading/locked/active/error 분기.
  - locked: "유료 기능 — 이용권 필요" + 기능 소개 + `이용권 결제하기`(disabled) + "결제 기능은 준비 중입니다."
  - active: "이용 중" + 기능 준비 안내
- [index.ts](../../packages/store-ui-core/src/index.ts): export 추가
- [storeMenuConfig.ts](../../packages/store-ui-core/src/config/storeMenuConfig.ts): 3 config 에 `판매 채널 확장 > 외국인 여행객 판매지원` 섹션 (subPath `/sales-channels/foreign-visitor`)
- [StoreSidebar.tsx](../../packages/store-ui-core/src/components/StoreSidebar.tsx): `foreign-visitor-sales-support` → `Globe` 아이콘

### 4.3 서비스별 (3) — thin page + route
| 서비스 | page | serviceKey | api client | App.tsx route |
|---|---|---|---|---|
| K-Cosmetics | `pages/store/ForeignVisitorSalesSupportPage.tsx` | `cosmetics` | `@/lib/apiClient` `api` | `sales-channels/foreign-visitor` |
| GlycoPharm | `pages/store/ForeignVisitorSalesSupportPage.tsx` | `glycopharm` | `@/lib/apiClient` `api` | `sales-channels/foreign-visitor` |
| KPA-Society | `pages/pharmacy/ForeignVisitorSalesSupportPage.tsx` | `kpa` | `coreApiClient`(`/api/v1`, kpa 네임스페이스 밖) | `sales-channels/foreign-visitor` |

전체 경로: `/store/sales-channels/foreign-visitor` (각 서비스 store route group 내, StoreOwnerGuard 하위).

---

## 5. V1 미포함 (의도적)

- 운영자 이용권 관리 / 발급(write) API / Toss 결제 / prepare·confirm
- 외국인 판매지원 기능 본체 / B2B 주문 연결 / 네이버·쿠팡·외부몰
- DB/migration 추가 (없음)

---

## 6. 검증

- api-server `type-check` PASS
- web-k-cosmetics / web-glycopharm / web-kpa-society `tsc --noEmit` PASS
- 현재 운영 데이터 기준 이용권 0건 → 모든 매장 `active:false` → **잠금 안내 표시**가 정상.
- 운영 smoke 기준: 3서비스 매장 메뉴에 진입점 노출 + `/store/sales-channels/foreign-visitor` 로드 + `me/check` 200 + 잠금 안내 표시 + 결제 버튼 disabled.

---

## 6-A. 배포 후 운영 smoke (2026-06-21, PASS)

push `b03f2c136` → Deploy API Server / Deploy Web Services / Deploy Admin Dashboard 전부 success.

**Backend `/me/check` (API, Bearer)** — 3 serviceKey + 검증 경로:

| 호출 | 결과 |
|---|---|
| `?serviceKey=kpa&planCode=FOREIGN_VISITOR_SALES_SUPPORT` | 200 `active:false` |
| `?serviceKey=glycopharm&...` | 200 `active:false` |
| `?serviceKey=cosmetics&...` | 200 `active:false` |
| `?serviceKey=neture&...` | 400 `UNKNOWN_SERVICE_KEY` |
| `?serviceKey=kpa&planCode=NOPE` | 400 `UNKNOWN_PLAN_CODE` |
| `?serviceKey=kpa` (plan 누락) | 400 `MISSING_PARAMS` |

**Frontend UI (브라우저)** — 3서비스 매장 진입:

| 서비스 | 계정 | 메뉴 진입점 | 라우트 로드 | me/check | 잠금 안내 | 결제 버튼 | console |
|---|---|---|---|---|---|---|---|
| KPA-Society | renagang21 (kpa:store_owner) | ✅ 판매 채널 확장 > 외국인 여행객 판매지원 | ✅ | 200 | ✅ | disabled + "결제 기능은 준비 중입니다." | 로그인 전 auth 부트스트랩 401(무관) |
| K-Cosmetics | sohae2100 (operator-or-above) | ✅ | ✅ | 200 | ✅ | disabled | 기존 `/cosmetics/store-hub/capabilities` 403(무관) |
| GlycoPharm | renagang21 (glycopharm:store_owner) | ✅ | ✅ | 200 | ✅ | disabled | **0 errors** |

운영에 `FOREIGN_VISITOR_SALES_SUPPORT` 활성 이용권이 없으므로 전 서비스 `active:false` → 잠금 안내 기준으로 수행했다. `active=true` 분기는 코드상 구현되어 있으나 운영 데이터 생성 없이 검증하지 않았다(후속 발급 WO 에서 실데이터 검증).

**종료 고정.**

---

## 7. 다음 작업

IR §9.1: `WO-O4O-TOSS-PAYMENT-CORE-V1` → `WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1`(이용권 발급 write + active=true 경로 실데이터 검증).
