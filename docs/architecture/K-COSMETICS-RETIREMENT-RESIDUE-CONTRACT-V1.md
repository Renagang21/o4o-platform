# K-Cosmetics 퇴역 잔여 계약 V1

> **상태**: ACTIVE
> **작성일**: 2026-10-07 · **최종 갱신**: 2026-10-07
> **근거 WO/IR**: `WO-O4O-CANONICAL-INDEX-S9-REMAINING-3-FINAL-DISPOSITION-V1`
> **이 문서가 대체한 문서**: [`COSMETICS-DOMAIN-RULES`](COSMETICS-DOMAIN-RULES.md) (SUPERSEDED — 별도 cosmetics-api · 독립 DB · cosmetics-web 을 전제한 2026-01 규칙)

이 문서는 퇴역 중인 K-Cosmetics 서비스의 **남은 부분(잔여)** 을 다룰 때 지킬 규칙만 정한다. 잔여 정리가 끝나면 이 문서는 OBSOLETE 가 된다.

---

## 1. 현재 상태 (2026-10-07)

- **퇴역 결정**: K-Cosmetics(`k-cosmetics`, `retail.neture.co.kr`)는 퇴역한다 — 사용자 결정 2026-10-05, [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §14.
- **이미 삭제된 runtime**:
  - 퇴역 1차-A(`WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1`) — 독립 웹 앱 `services/web-k-cosmetics` · 웹 배포 job.
  - 퇴역 1차-B(`WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1`, PR #339) — `/api/v1/cosmetics/*` 전체(`routes/cosmetics/**` · 주문 · 결제 · B2B 결제 · 전용 entity 13개) · web-store `/work/k-cosmetics/*` 기능 화면(종료 안내만 남김) · admin `/cosmetics-products`.
- **남은 잔여** (1차-B 가 DEFER 로 남긴 것): service identity · catalog row(`k-cosmetics`, 진입 capability 닫힘) · `SERVICE_KEYS` · `cosmetics:*` roles · DB 스키마(`cosmetics` 스키마 · `public.cosmetics_members` · `public.cosmetics_contents`) · migration · `k-cosmetics` / `k-cosmetics-event-offer` serviceKey 의 Event Offer · B2B 데이터와 매핑 · community / signage / LMS / CMS 의 `k-cosmetics` identity.

잔여의 최신 목록은 **가장 최근 퇴역 WO 의 DEFER 항목**이 정본이다. 이 절은 작성 시점 기록이다.

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

§1 의 잔여가 모두 정리되면(퇴역 작업의 마지막 단계) 이 문서 상단 상태를 OBSOLETE 로 바꾸고 `CANONICAL-INDEX` 행을 정리한다.
