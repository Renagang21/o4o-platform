# CHECK-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1

> **작업명:** WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
> **유형:** 기존 조회 API의 3서비스 매장 앱 노출 (frontend only, 공통 view 컴포넌트). backend/DB/migration **무변경**.
> **결과: PASS — 기존 `GET /neture/partner/applications/mine` 재사용. KPA/GP/KCos 매장 "상품·거래" 그룹에 "신청·승인 현황" 추가(공통 `StoreRecruitmentApplicationsView` + 앱별 thin page + route). KPA=coreApiClient, GP/KCos=authClient.api(base /api/v1)로 cross-service 호출. 3서비스 build ✓.**
> 선행: `WO-...-MY-STORE-...-STATUS-VIEW-V1`(13302ac5f, Neture partner) — 2026-06-16

---

## 1. 조사 결과 (feasibility 확정)

- **API**: `GET /neture/partner/applications/mine`(requireAuth, partnerId=req.user.id) 기존 존재 → 재사용. backend 변경 0.
- **cross-service 호출 가능성**(핵심 게이트): 3앱 모두 `/neture/` 호출 선례 없음이나 —
  - **KPA**: `coreApiClient`(base `/api/v1`, cross-domain O4O 전용, `api/client.ts:158`) 보유 → 도달 가능. (KPA 기본 `apiClient`는 `/api/v1/kpa` service-locked.)
  - **GP/KCos**: `authClient.api`(base `/api/v1`, `lib/apiClient.ts:22`) → 직접 도달. GP 는 `MyApplicationsPage` 동일 패턴 선례.
- **메뉴**: shared `storeMenuConfig.ts` 서비스별 블록(약국/매장 상품·거래). **capability**: `menuCapabilityMap.ts:52` `if(!cap) return true` — 매핑 없는 신규 key 는 **기본 노출**(products/orders 도 의도적 de-map) → 신규 key `recruitment-applications` capability 변경 불요.
- **route**: 각 앱 `/store/commerce/recruitment-applications`(commerce/orders 다음).

## 2. 변경 내용 (frontend only, 9)

**공통 (store-ui-core, source-consumed)**
| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/src/components/StoreRecruitmentApplicationsView.tsx` | **신규** presentational(상태 파생 + 안내, semantic 색만 — accent 불요). props=applications+loading |
| `packages/store-ui-core/src/index.ts` | export(additive) |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | KPA/GP/KCos 상품·거래 블록에 `신청·승인 현황`(subPath `/commerce/recruitment-applications`) 추가 |

**서비스별 (×3)**
| 앱 | page | route(App.tsx) |
|----|------|------|
| KPA | `pages/pharmacy/StoreRecruitmentApplicationsPage.tsx`(coreApiClient) | lazy + `commerce/recruitment-applications` |
| GP | `pages/store-management/StoreRecruitmentApplicationsPage.tsx`(authClient.api) | 동 |
| KCos | `pages/store/StoreRecruitmentApplicationsPage.tsx`(authClient.api) | 동 |

## 3. 공통화 판단

- Neture partner 페이지(`PartnerRecruitmentApplicationsPage`)와 동일 UI → **shared presentational `StoreRecruitmentApplicationsView`(store-ui-core)** 추출로 3서비스 DRY. 각 앱은 fetch(자체 client) + 렌더만(thin wrapper). 대규모 공통화 아님(단일 read 컴포넌트). Neture partner 페이지는 PartnerSpaceLayout 전용이라 본 WO 미변경(별도 영역).

## 4. 상태 표시 / 위치

- 상태: 심사 대기 / 승인됨 / 반려됨 / 참여 해지됨(approved+contract TERMINATED 파생) — Neture 측과 동일. 금지 표현 미사용.
- 위치: My Page 아닌 **매장(상품·거래) 그룹** — 조달 참여 신청 업무 상태.

## 5. 알림 targetUrl 정책 (WO §12 준수)

- **이번 WO 미변경.** Neture 알림 targetUrl(`/partner/recruitment-applications`)은 그대로(neture partner 영역). 서비스별 매장 route 로의 targetUrl 분기는 **조사만** — 알림 센터가 serviceKey별 도메인 route 를 분기 처리하는 구조 정리는 후속 WO. (현재 알림은 neture 알림센터에서 소비 가정.)

## 6. 제외 범위 (WO 준수)

새 backend API / 신청 취소·참여 재개 / 이메일·새 알림 / 모집 생성·심사·해지 로직 / C bridge·allowedSellerIds·OPL·계약·RBAC·가격 / 모집 entity 확장 / migration / 알림 targetUrl 변경 / 대규모 공통화. **모두 미수행.** (다른 세션 WIP `connection.ts`/`entities/index.ts` 미접촉.)

## 7. 검증

- **builds:** `@o4o/web-kpa-society` ✅ · `glycopharm-web` ✅ · `@o4o/web-k-cosmetics` ✅ (각 tsc+vite, store-ui-core 공통 변경 포함).
- **api-server:** 무변경(backend 미수정) — typecheck 생략.
- **정적:** 공통 view export additive(기존 store-ui-core 소비처 무영향). 메뉴 신규 key 기본 노출(capability 무변경). route commerce/recruitment-applications 마운트(데드링크 0). cross-service 호출은 base `/api/v1` client(KPA coreApiClient / GP·KCos authClient.api). 본인(req.user.id) 필터 → 타 판매자 미노출.
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** KPA/GP/KCos 매장 사용자 로그인 → "신청·승인 현황" → 본인 신청 목록·상태(pending/approved/rejected/참여해지) → 타 판매자 미노출.

## 8. Shared Module Protocol

- 변경 공통 모듈: `@o4o/store-ui-core`(신규 컴포넌트+export, storeMenuConfig 3블록). 소비처: KPA/GP/KCos(본 WO 노출), Neture(storeMenuConfig 미사용 — 영향 없음). capability/visibility 필터 변경 없음(신규 key 기본 노출). route 동시 마운트(은폐/데드링크 0). 회귀: 3앱 build PASS.

## 9. 완료 판정 / 후속

**PASS.** KPA/GP/KCos 매장 앱에 판매자 모집 신청 현황 노출(기존 API 재사용, 공통 view). My Page 미생성, 정책·backend·migration 무변경.

**커밋:** path-specific 10파일 · `<commit>`.
**후속(선택):** 알림 targetUrl 서비스별 분기(알림센터 도메인 route 정책) / 신청 취소(판매자) / 이메일 알림.

---

*Date: 2026-06-16 · cross-service PASS · 기존 /neture/partner/applications/mine 를 KPA(coreApiClient)/GP·KCos(authClient.api) 매장 앱에 노출. 공통 StoreRecruitmentApplicationsView(store-ui-core) + storeMenuConfig 3블록 + 앱별 page/route. backend/migration 무변경, 알림 targetUrl 미변경(조사만). 3앱 build PASS.*
