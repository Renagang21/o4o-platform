# CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1

> **live smoke 검증 (Playwright MCP 실제 브라우저).** 코드/UI/API/DB 변경 없음.
> K-Cosmetics Store HUB 주요 화면이 production 에서 실제로 접근·렌더되는지 확인.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | CHECK (live smoke) |
| 환경 | production — https://k-cosmetics.site / API https://api.neture.co.kr |
| 계정 | `sohae2100@gmail.com` (cosmetics:admin/operator + platform:super_admin) |
| 도구 | Playwright MCP (direct-node 런처 수정 후 정상 작동) |
| **판정(최초)** | **NEEDS-FOLLOWUP** — 화면 대부분 정상 렌더, 단 실제 결함 2건 |
| **판정(재검증 후)** | **CONDITIONAL PASS** — P0-1·P0-2 배포·라이브 해소 확인. 잔여: orders 500(P1) + store_owner 데이터 경험 미관측(계정 부재). §9 참조 |

> 선행: `IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1` (Playwright MCP / 계정 차단요인 해소).
> 후속 수정: `WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1`(P0-1, `cc01cca2c`) · `WO-O4O-SIGNAGE-FORCED-CONTENT-KCOSMETICS-SERVICEKEY-FIX-V1`(P0-2, `5728ec160`).

---

## 1. 판정 요약

positive-path(라우트 렌더 · redirect · empty/error state)는 대부분 PASS 수준이나, **실제 결함 2건**으로 NEEDS-FOLLOWUP:

1. **P0-1 `/store/*` 하드 로드/새로고침 무한 로딩** — `StoreOwnerRoute` 가 cold load 시 `checkSession()` 미트리거 → `isLoading` 영구 true → "권한을 확인하는 중..." 무한.
2. **P0-2 operator forced-content 미작동** — 프론트 `serviceKey='k-cosmetics'` 를 backend signage 가 `INVALID_SERVICE_KEY` 로 거부 (400).

추가: orders API no-store 500 (P1), store API `pharmacy` 세그먼트 네이밍(관찰).

> ⚠️ **CONDITIONAL 한계**: `sohae2100` 은 매장 레코드/`cosmetics:store_owner` 미보유 → 모든 store 페이지가 empty/gate/403 상태. **채워진 store_owner 데이터 경험은 미관측** (전용 계정 부재 — 별도). 본 smoke 는 "화면이 살아 있는가"(positive-path) 검증.

---

## 2. 검증 방법

- 실제 로그인(`sohae2100`) 후 Playwright 로 화면 이동·스냅샷·console/network 관측.
- `/store/*` 는 cold-load 가 P0-1 로 멈추므로 **인앱(SPA) 이동**(헤더 "내 매장" + 사이드바 클릭, flat redirect 는 router history)으로 검증.
- `/operator/*` 는 RoleGuard(checkSession 호출)라 cold-load 정상.

---

## 3. 범위별 결과 (18 항목)

| # | 범위 | 결과 | 비고 |
|---|------|:---:|------|
| 1 | `/store` 진입 | ✅ / ⚠️ | SPA 이동 시 레이아웃+사이드바 정상(empty "등록된 매장이 없습니다"). **하드로드 무한로딩 = P0-1** |
| 2 | `/store/info` | ✅ | 라우트 OK, 페이지 레벨 "매장 경영자만 이용 가능합니다" 게이트(매장 없음) |
| 3 | library/contents · resources · production-materials | ✅ | contents/resources empty state, production-materials 403 graceful "다시 시도". `/new` 정적 확인 |
| 4 | content/blog · marketing/pop · marketing/qr · library/product-descriptions | ✅ | blog "연결된 매장 없음" 안내, POP 빌더 3단계 풀렌더+403 retry, QR 403 retry, product-descriptions empty. **canonical=library/* 라이브 재확인** |
| 5 | signage playlist/videos/schedules/player | ✅ | playlist·player empty state, videos/schedules 라우트 resolve. play/:id 데이터없어 skip |
| 6 | commerce my-products/local-products/orders/tablet/channels | ✅ | 전부 empty state 렌더. **orders mock 없음**, orders API **500**→graceful (P1) |
| 7 | Product Marketing/POP Builder row action | — | 상품 데이터 없어 미검증. 코드 기준 라우트 존재 |
| 8 | analytics/marketing | ✅ | "데이터를 불러올 수 없습니다" error state(403, graceful) |
| 9 | flat alias redirect | ✅ | **7/7 전부 정상**(pop/qr/signage/signage·player/orders/billing/tablet-displays) |
| 10 | operator/signage/forced-content | ❌ | 페이지 풀렌더 + serviceKey=k-cosmetics 정확, **backend 400 INVALID_SERVICE_KEY → 기능 미작동 = P0-2** |
| 11 | console/network | ✅* | chunk/crash/무한로딩 없음(P0-1 제외). 403×6(매장스코프 부재, graceful), 500×3(orders), 400×1(forced-content) |

---

## 4. flat alias redirect 상세 (7/7 ✅)

`/store/pop→marketing/pop` · `/store/qr→marketing/qr` · `/store/signage→marketing/signage/playlist` · `/store/signage/player→marketing/signage/player` · `/store/orders→commerce/orders` · `/store/billing→commerce/billing` · `/store/tablet-displays→commerce/tablet-displays` — 전부 router 에서 canonical 로 이동 확인.

---

## 5. console / network 오류 분류

| 유형 | 엔드포인트 | 판정 |
|------|-----------|------|
| 403 ×6 | store-hub/capabilities, pharmacy/pop/source/supplier-items, pharmacy/qr, pharmacy/analytics/marketing, store/assets | **예상됨** — sohae2100 매장스코프 부재. 화면은 empty/retry 로 graceful |
| 500 ×3 | `/api/v1/cosmetics/orders` | **P1** — no-store 사용자에 500(403/200-empty 가 적절). 프론트 graceful |
| 400 ×1 | `/api/signage/k-cosmetics/hq/forced-content` | **P0-2** — `INVALID_SERVICE_KEY: k-cosmetics` |

관찰: store API 경로에 `pharmacy` 세그먼트(`/cosmetics/pharmacy/pop`·`/qr`·`/analytics`) — 동작하나 legacy 네이밍.

---

## 6. 결함 근본 원인 (정적 분석으로 확정)

### P0-1 — `/store/*` cold-load 무한 로딩
- K-Cosmetics `AuthContext` 의 `isLoading` 은 `!!getAccessToken()` 로 init 되고, `checkSession()` 은 **lazy**(호출자가 트리거). 호출자는 `RoleGuard` 뿐 ([RoleGuard.tsx:34](../../services/web-k-cosmetics/src/components/auth/RoleGuard.tsx#L34)).
- `/store/*` 는 `StoreOwnerRoute`→`StoreOwnerGuard`(공통 패키지)로, **checkSession 을 호출하지 않음** ([App.tsx StoreOwnerRoute](../../services/web-k-cosmetics/src/App.tsx#L288)). K-cos `AuthContext` 에는 **mount-time checkSession useEffect 도 없음**(useEffect 는 token-cleared 리스너 뿐, [AuthContext.tsx:150](../../services/web-k-cosmetics/src/contexts/AuthContext.tsx#L150)).
- ⇒ cold load 시 `isLoading` 영구 true → `StoreOwnerGuard` loadingNode("권한을 확인하는 중...") 무한.
- **cross-service**: **GlycoPharm 은 영향 없음** — AuthContext 가 mount useEffect 에서 `checkSession()` 호출([web-glycopharm AuthContext.tsx:100-133](../../services/web-glycopharm/src/contexts/AuthContext.tsx#L100)). **K-Cosmetics 고유 divergence** (GlycoPharm canonical 미반영).

### P0-2 — forced-content serviceKey 거부
- 프론트 `ForcedContentPage` 가 `SERVICE_KEY='k-cosmetics'` 로 `/api/signage/k-cosmetics/hq/forced-content` 호출 ([ForcedContentPage.tsx:17-18](../../services/web-k-cosmetics/src/pages/operator/signage/ForcedContentPage.tsx#L17)).
- backend `signage-role.middleware.ts` 의 `validServiceKeys = ['pharmacy','cosmetics','tourism','common','kpa-society','neture','glycopharm']` 에 **`k-cosmetics` 없음 / `cosmetics` 있음** ([signage-role.middleware.ts:641](../../apps/api-server/src/middleware/signage-role.middleware.ts#L641)) → 400.
- ⇒ 프론트(k-cosmetics) ↔ signage backend(cosmetics) **serviceKey 표준 불일치**.

---

## 7. 후속 WO 후보 (코드 미수정)

1. **WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1** (P0-1) — K-cos AuthContext mount-time checkSession 부트스트랩 추가(GlycoPharm canonical 정합) 또는 StoreOwnerRoute 에서 checkSession 트리거. cross-service(KPA 등) 점검.
2. **WO-O4O-SIGNAGE-FORCED-CONTENT-KCOSMETICS-SERVICEKEY-FIX-V1** (P0-2) — 프론트 SERVICE_KEY 를 `cosmetics` 로 정합(signage 표준) 또는 backend validServiceKeys 에 `k-cosmetics` 추가. signage serviceKey 표준 결정 필요.
3. (P1) orders API no-store 500 → 403/200-empty 정상화.
4. (CONDITIONAL 해소) cosmetics:store_owner 테스트 계정 확보 후 채워진 데이터 경험 재검증.

---

## 8. 비고 (최초 smoke)
- 최초 smoke 는 코드/UI/API/DB 변경 없음. 운영 데이터 변경 없음(조회·화면이동만).
- Playwright 환경 차단요인 해소(선행 IR) 이후 첫 실제 브라우저 검증.

---

## 9. 배포 후 재검증 (2026-06-03, P0-1/P0-2 수정 배포 후)

수정 커밋 `cc01cca2c`(P0-1) + `5728ec160`(P0-2) → origin/main → **Deploy Web Services (Cloud Run) `deploy-k-cosmetics` success**(run 26871980199, 08:06-08:08) 후 재검증.

### P0-1 — `/store` cold-load 무한 로딩 → ✅ 해소
- `https://k-cosmetics.site/store` **하드 로드(goto)** → StoreCockpitPage 정상 렌더. **"권한을 확인하는 중..." 무한 로딩 소멸.**
- 확인: staff 세션 → 매장 cockpit(KPI/상품현황/사이니지/AI) 풀 렌더 / 클린 sohae2100 세션 → "등록된 매장이 없습니다" empty state. 양쪽 모두 **즉시 렌더(무한 로딩 없음)**.
- 무세션 경로: logout 후 `/login` 폼 정상 노출 → 기존 로그인 유도 흐름 유지.

### P0-2 — forced-content serviceKey → ✅ 해소
- `/operator/signage/forced-content` 정상 렌더(400 에러 배너 소멸, console 0 errors).
- 네트워크: `GET /api/signage/cosmetics/hq/forced-content` → **200** (이전 `/api/signage/k-cosmetics/...` → 400 INVALID_SERVICE_KEY).

### 재검증 판정 = **CONDITIONAL PASS**
- 두 P0 결함 모두 라이브 해소 확인.
- 잔여: (P1) orders API no-store **500** 미해결(프론트 graceful) · (CONDITIONAL) `cosmetics:store_owner` 전용 계정 부재로 **채워진 store_owner 데이터 경험은 여전히 미관측**(sohae2100 은 매장 없음/super_admin).
- 후속: §7-3(orders 500), §7-4(store_owner 계정 확보 후 데이터 경험 재검증).
