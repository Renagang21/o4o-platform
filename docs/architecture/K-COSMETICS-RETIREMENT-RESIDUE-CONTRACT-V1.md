# K-Cosmetics 퇴역 잔여 계약 V1

> **상태**: ACTIVE
> **작성일**: 2026-10-07 · **최종 갱신**: 2026-10-07
> **근거 WO/IR**: `WO-O4O-CANONICAL-INDEX-S9-REMAINING-3-FINAL-DISPOSITION-V1`
> **이 문서가 대체한 문서**: [`COSMETICS-DOMAIN-RULES`](COSMETICS-DOMAIN-RULES.md) (SUPERSEDED — 별도 cosmetics-api · 독립 DB · cosmetics-web 을 전제한 2026-01 규칙)

이 문서는 퇴역 중인 K-Cosmetics 서비스의 **남은 부분(잔여)** 을 다룰 때 지킬 규칙만 정한다. 잔여 정리가 끝나면 이 문서는 OBSOLETE 가 된다.

---

## 1. 현재 상태와 잔여 목록

> **잔여 목록의 정본은 이 절이다.** 퇴역 작업이 잔여를 정리하면 같은 변경에서 이 표를 갱신한다(상태 열 · 근거 커밋/PR). WO · CHECK 는 근거로만 링크한다.

- **퇴역 결정**: K-Cosmetics(`k-cosmetics`, `retail.neture.co.kr`)는 퇴역한다 — 사용자 결정 2026-10-05, [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §14.
- **이미 삭제된 runtime**:
  - 퇴역 1차-A(커밋 518da8b59, `WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1`) — 독립 웹 앱 `services/web-k-cosmetics` · 웹 배포 job.
  - 퇴역 1차-B(PR #339, `WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1`) — `/api/v1/cosmetics/*` 전체(`routes/cosmetics/**` · 주문 · 결제 · B2B 결제 · 전용 entity 13개) · web-store `/work/k-cosmetics/*` 기능 화면(종료 안내만 남김) · admin `/cosmetics-products`.

### 1-1. 잔여 목록 (2026-10-07 기준)

| # | 잔여 | 상태 | 비고 |
|---|---|---|---|
| R1 | 공통 cart 경로 `/api/v1/store/cart/:serviceKey/*` 가 `k-cosmetics` 를 받아 결제할 수 없는 pending 주문이 생길 수 있었다 | **정리됨 (2026-10-07)** | `store-cart.routes.ts` `RETIRED_CART_SERVICE_KEYS` — 조회 포함 전 endpoint `410 SERVICE_RETIRED`(membership 판정보다 먼저) · event-offer 장바구니 매핑의 `k-cosmetics` 삭제 · 고아 상수 `COSMETICS_B2B_SERVICE_KEYS` 삭제. PR #354 |
| R2 | service identity · catalog row(`k-cosmetics`, 진입 capability 닫힘) · `SERVICE_KEYS` | 남음 | R1 차단(`RETIRED_CART_SERVICE_KEYS`)은 이 row 를 지울 때 함께 정리한다. 정리는 소비처 전수 확인 후(§2 규칙 3) |
| R3 | `cosmetics:*` roles | 남음 | RBAC SSOT 절차 |
| R4 | DB 스키마 — `cosmetics` 스키마 · `public.cosmetics_members` · `public.cosmetics_contents` · 관련 migration | 남음 | 처리 방식(유지 · 제거 · archive · 파기)은 퇴역 작업이 정한다 · 사용자 승인 |
| R5 | `k-cosmetics` / `k-cosmetics-event-offer` serviceKey 의 Event Offer · B2B 데이터와 코드 매핑 — 남은 코드: event-offer 도메인 매핑(`event-offer-service-mapping` · `EventOfferService` · 공급자 제안) · 승인축 `APPROVAL_ELIGIBLE_SERVICE_KEYS`(공급자 offer 승인 데이터와 연동 — Supplier Domain 경계) · buyer 조회 scope 등 | 남음 (장바구니 매핑 · 결제 상수는 R1 에서 삭제) | 기존 주문 데이터는 `checkout_orders` B2B 원장(§2 규칙 4) |
| R6 | community / signage / LMS / CMS 의 `k-cosmetics` identity | 남음 | 공통 구조 serviceKey 격리 데이터 |
| R7 | **외부 설정 (사용자 작업)** — 외부 DNS(`k-cosmetics.site` · `www.` · `api.` A 레코드와 `_acme-challenge` CNAME · `retail.neture.co.kr` A 레코드) · Google OAuth 승인 origin / redirect URI 의 K-Cos host | 남음 · 사용자 작업 | 저장소 밖 콘솔 작업이라 자동 변경하지 않는다. 근거 `CHECK-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-RUNTIME-V1` §4 |
| R8 | **인프라 잔재** — 컨테이너 이미지(`k-cosmetics-web`) · API CORS 의 `retail` origin 등 1차-A CHECK §5 "API" · "이미지" 항목 중 1차-B 가 정리하지 않은 것 | 확인 필요 | 1차-B 는 CORS / cookie 의 K-Cos 도메인을 제거하면서 `retail` 은 유지했다. 이미지 삭제는 저장소 단위 개별 승인. 다음 퇴역 단계에서 전수 확인 후 이 행을 갱신한다 |

퇴역 대상은 **서비스**이지 화장품 **제품군**(Neture 공급 제품 · 카테고리)이 아니다. 제품군은 이 문서의 대상이 아니다.

## 2. 규칙

1. **제거된 runtime 을 되살리지 않는다.** 독립 웹 앱 · `/api/v1/cosmetics/*` · `routes/cosmetics` · web-store K-Cosmetics 기능 화면 · admin `/cosmetics-products` 를 다시 만들지 않는다. 다시 필요하면 사업 결정이 먼저다.
2. **잔여 구조를 지금 상태로 고정한다.**
   - 새 cosmetics 전용 테이블 · 새 Core FK · 새 개인정보 필드 · 새 cosmetics 전용 기능을 추가하지 않는다.
   - `public.cosmetics_members.user_id → public.users` FK 와 `cosmetics_stores` · `cosmetics_store_applications` 의 `owner_name` · `contact_phone` · `business_number` 는 현행 사실로 인정하고, 퇴역 전에 재설계하지 않는다.
   - 기존 테이블 · 데이터의 처리(유지 · 제거 · archive · 파기)는 퇴역 작업이 정한다.
3. **잔여 정리는 각 정본의 승인 경계를 따른다.**
   - schema · migration · 데이터 삭제: `CLAUDE.md` DB · 보안 경계(사용자 명시 승인) · [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md).
   - `cosmetics:*` role: RBAC SSOT — [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md).
   - catalog · serviceKey: 모든 소비처를 먼저 식별 — [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).
4. **주문 데이터는 B2B 원장이다.** `k-cosmetics` serviceKey 로 남은 주문은 `checkout_orders` 원장의 B2B 주문이다([`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) · `CLAUDE.md` §4). cosmetics 별도 주문 · 결제 경로를 만들지 않는다.

## 3. 이 문서가 끝나는 조건

§1-1 잔여 목록의 모든 행(현재 R1 ~ R8)이 정리됨으로 갱신되면(퇴역 작업의 마지막 단계) 이 문서 상단 상태를 OBSOLETE 로 바꾸고 `CANONICAL-INDEX` 행을 정리한다.
